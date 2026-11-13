"""Thread-safe append-only in-memory AuditStore & CAMA Sec 405 certification adapter."""

from __future__ import annotations

from datetime import UTC, datetime
from threading import RLock
from uuid import UUID, uuid4

from nairabooks.audit.domain import (
    GENESIS_HASH,
    AuditEvent,
    CamaSec405Certification,
    ImmutableAuditLogError,
    compute_event_hash,
)
from nairabooks.auth.domain import ActorRole
from nairabooks.ledger.domain import ClosedPeriodError


class InMemoryAuditStore:
    """Thread-safe append-only audit store enforcing SHA-256 hash chaining (SEC-REQ-05)."""

    def __init__(self) -> None:
        self._lock = RLock()
        self._events_by_workspace: dict[UUID, list[AuditEvent]] = {}
        self._cama_certs: dict[tuple[UUID, UUID], CamaSec405Certification] = {}

    def append_event(
        self,
        *,
        workspace_id: UUID,
        actor_user_id: UUID,
        actor_role: ActorRole,
        action: str,
        entity_type: str,
        entity_id: UUID,
        payload_hash: str,
        ip_address: str | None = None,
        user_agent: str | None = None,
        occurred_at: datetime | None = None,
    ) -> AuditEvent:
        with self._lock:
            chain = self._events_by_workspace.setdefault(workspace_id, [])
            seq = len(chain) + 1
            prev_hash = chain[-1].event_hash if chain else GENESIS_HASH
            ts = occurred_at or datetime.now(UTC)
            event_id = uuid4()
            event_hash = compute_event_hash(
                id=event_id,
                workspace_id=workspace_id,
                sequence_number=seq,
                actor_user_id=actor_user_id,
                actor_role=actor_role,
                action=action,
                entity_type=entity_type,
                entity_id=entity_id,
                payload_hash=payload_hash,
                previous_event_hash=prev_hash,
                occurred_at=ts,
            )
            ev = AuditEvent(
                id=event_id,
                workspace_id=workspace_id,
                sequence_number=seq,
                actor_user_id=actor_user_id,
                actor_role=actor_role,
                action=action,
                entity_type=entity_type,
                entity_id=entity_id,
                payload_hash=payload_hash,
                previous_event_hash=prev_hash,
                event_hash=event_hash,
                occurred_at=ts,
                ip_address=ip_address,
                user_agent=user_agent,
            )
            chain.append(ev)
            return ev

    def list_events(self, workspace_id: UUID) -> list[AuditEvent]:
        with self._lock:
            return list(reversed(self._events_by_workspace.get(workspace_id, [])))

    def list_events_ascending(self, workspace_id: UUID) -> list[AuditEvent]:
        with self._lock:
            return list(self._events_by_workspace.get(workspace_id, []))

    def update_event(self, workspace_id: UUID, event_id: UUID) -> None:
        raise ImmutableAuditLogError(event_id)

    def delete_event(self, workspace_id: UUID, event_id: UUID) -> None:
        raise ImmutableAuditLogError(event_id)

    def save_cama_certification(self, certification: CamaSec405Certification) -> None:
        with self._lock:
            key = (certification.workspace_id, certification.fiscal_period_id)
            if key in self._cama_certs:
                raise ClosedPeriodError(
                    str(certification.fiscal_period_id),
                    "CLOSED_CAMA_CERTIFIED",
                )
            self._cama_certs[key] = certification

    def find_cama_certification(
        self, workspace_id: UUID, fiscal_period_id: UUID
    ) -> CamaSec405Certification | None:
        with self._lock:
            return self._cama_certs.get((workspace_id, fiscal_period_id))

    def list_cama_certifications(self, workspace_id: UUID) -> list[CamaSec405Certification]:
        with self._lock:
            items = [
                cert
                for (ws_id, _), cert in self._cama_certs.items()
                if ws_id == workspace_id
            ]
            return sorted(items, key=lambda c: c.certified_at, reverse=True)
