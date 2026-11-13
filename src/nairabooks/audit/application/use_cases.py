"""Application use cases for immutable hash-chained audit logs and CAMA Sec 405 sign-off."""

from __future__ import annotations

import base64
from collections.abc import Mapping
from dataclasses import dataclass
from datetime import UTC, datetime
from uuid import UUID, uuid4

from nairabooks.audit.application.ports import AuditStore
from nairabooks.audit.domain import (
    AuditChainVerificationResult,
    AuditEvent,
    CamaSec405Certification,
    ProfessionalBody,
    compute_payload_hash,
    verify_audit_chain,
)
from nairabooks.auth.domain import (
    ActorRole,
    AuthenticatedContext,
    Permission,
    enforce_segregation_of_duties,
    require_permission,
)
from nairabooks.ledger.application import GenerateFrcnPackageUseCase, LedgerStore
from nairabooks.ledger.application.use_cases import PageInfo
from nairabooks.ledger.domain import FiscalPeriod, ValidationError


@dataclass(frozen=True, slots=True)
class RecordAuditEventCommand:
    """Command to append an immutable hash-chained audit entry."""

    workspace_id: UUID
    actor_user_id: UUID
    actor_role: ActorRole
    action: str
    entity_type: str
    entity_id: UUID
    payload: Mapping[str, object]
    ip_address: str | None = None
    user_agent: str | None = None


@dataclass(frozen=True, slots=True)
class AuditEventEdge:
    """Relay GraphQL connection edge carrying an opaque keyset cursor."""

    cursor: str
    node: AuditEvent


@dataclass(frozen=True, slots=True)
class AuditEventConnection:
    """Relay GraphQL paginated connection matching schema.graphql AuditEventConnection."""

    edges: tuple[AuditEventEdge, ...]
    page_info: PageInfo
    total_count: int


@dataclass(frozen=True, slots=True)
class CertifyCamaSec405Command:
    """Command for CAMA 2020 Section 405 period sign-off and immutable lock."""

    workspace_id: UUID
    fiscal_period_id: UUID
    certified_by_user_id: UUID
    certified_by_role: ActorRole
    certified_by_name: str
    professional_body: ProfessionalBody
    frc_reg_number: str
    prepared_by_user_id: UUID | None = None
    ip_address: str | None = None
    user_agent: str | None = None


def _encode_audit_cursor(event_id: UUID) -> str:
    return base64.urlsafe_b64encode(str(event_id).encode("utf-8")).decode("ascii")


def _decode_audit_cursor(cursor: str) -> UUID:
    try:
        raw = base64.urlsafe_b64decode(cursor.encode("ascii")).decode("utf-8")
        return UUID(raw)
    except (ValueError, UnicodeDecodeError) as exc:
        raise ValidationError("Invalid audit pagination cursor.", field="after") from exc


class RecordAuditEventUseCase:
    """Append an immutable SHA-256 hash-chained audit event."""

    def __init__(self, store: AuditStore) -> None:
        self._store = store

    def execute(self, command: RecordAuditEventCommand) -> AuditEvent:
        payload_hash = compute_payload_hash(command.payload)
        return self._store.append_event(
            workspace_id=command.workspace_id,
            actor_user_id=command.actor_user_id,
            actor_role=command.actor_role,
            action=command.action,
            entity_type=command.entity_type,
            entity_id=command.entity_id,
            payload_hash=payload_hash,
            ip_address=command.ip_address,
            user_agent=command.user_agent,
        )


class ListAuditEventsUseCase:
    """Relay cursor-paginated query for workspace audit events (bounded 1..100)."""

    def __init__(self, store: AuditStore) -> None:
        self._store = store

    def execute(
        self,
        *,
        workspace_id: UUID,
        first: int = 50,
        after: str | None = None,
    ) -> AuditEventConnection:
        if first < 1 or first > 100:
            raise ValidationError("Pagination parameter 'first' must be 1..100.", field="first")

        all_events = self._store.list_events(workspace_id)
        total_count = len(all_events)
        start_idx = 0
        if after is not None:
            cursor_id = _decode_audit_cursor(after)
            idx_match = next(
                (idx for idx, ev in enumerate(all_events) if ev.id == cursor_id),
                None,
            )
            if idx_match is None:
                raise ValidationError("Audit pagination cursor not found.", field="after")
            start_idx = idx_match + 1

        page_items = all_events[start_idx : start_idx + first]
        edges = tuple(
            AuditEventEdge(cursor=_encode_audit_cursor(ev.id), node=ev) for ev in page_items
        )
        return AuditEventConnection(
            edges=edges,
            page_info=PageInfo(
                has_next_page=(start_idx + first) < total_count,
                has_previous_page=start_idx > 0,
                start_cursor=edges[0].cursor if edges else None,
                end_cursor=edges[-1].cursor if edges else None,
            ),
            total_count=total_count,
        )


class VerifyAuditChainUseCase:
    """Verify cryptographic hash chain continuity for a workspace's audit trail."""

    def __init__(self, store: AuditStore) -> None:
        self._store = store

    def execute(self, *, workspace_id: UUID) -> AuditChainVerificationResult:
        ordered = self._store.list_events_ascending(workspace_id)
        return verify_audit_chain(ordered)


class CertifyCamaSec405UseCase:
    """Sign off and close a fiscal period under CAMA 2020 Section 405 with SoD + Audit Log."""

    def __init__(self, *, ledger_store: LedgerStore, audit_store: AuditStore) -> None:
        self._ledger = ledger_store
        self._audit = audit_store
        self._frcn_uc = GenerateFrcnPackageUseCase(ledger_store)

    def execute(
        self, command: CertifyCamaSec405Command
    ) -> tuple[FiscalPeriod, CamaSec405Certification]:
        ctx = AuthenticatedContext(
            workspace_id=command.workspace_id,
            user_id=command.certified_by_user_id,
            email="certifier@workspace.local",
            full_name=command.certified_by_name,
            role=command.certified_by_role,
            session_id=uuid4(),
        )
        require_permission(ctx, Permission.CAMA_CERTIFY_PERIOD)
        enforce_segregation_of_duties(
            actor_user_id=command.certified_by_user_id,
            creator_user_id=command.prepared_by_user_id,
            action="certifyCamaSec405",
        )

        with self._ledger.transaction():
            pkg = self._frcn_uc.execute(
                workspace_id=command.workspace_id,
                fiscal_period_id=command.fiscal_period_id,
            )
            if not pkg.is_balanced:
                raise ValidationError(
                    "Cannot certify CAMA Sec 405 while Trial Balance is out of balance.",
                    field="fiscalPeriodId",
                )
            closed_period = self._ledger.close_period_cama(
                command.workspace_id,
                command.fiscal_period_id,
                command.frc_reg_number,
            )
            cert = CamaSec405Certification(
                id=uuid4(),
                workspace_id=command.workspace_id,
                fiscal_period_id=command.fiscal_period_id,
                certified_by_user_id=command.certified_by_user_id,
                certified_by_name=command.certified_by_name.strip(),
                professional_body=command.professional_body,
                frc_reg_number=command.frc_reg_number.strip(),
                statement_snapshot_hash=pkg.snapshot_hash,
                certified_at=datetime.now(UTC),
            )
            self._audit.save_cama_certification(cert)
            payload_hash = compute_payload_hash(
                {
                    "fiscalPeriodId": str(closed_period.id),
                    "fiscalPeriodLabel": closed_period.label,
                    "certifiedByName": cert.certified_by_name,
                    "professionalBody": cert.professional_body.value,
                    "frcRegNumber": cert.frc_reg_number,
                    "statementSnapshotHash": cert.statement_snapshot_hash,
                }
            )
            self._audit.append_event(
                workspace_id=command.workspace_id,
                actor_user_id=command.certified_by_user_id,
                actor_role=command.certified_by_role,
                action="CAMA_SEC405_CERTIFIED",
                entity_type="CamaSec405Certification",
                entity_id=cert.id,
                payload_hash=payload_hash,
                ip_address=command.ip_address,
                user_agent=command.user_agent,
            )
            return closed_period, cert
