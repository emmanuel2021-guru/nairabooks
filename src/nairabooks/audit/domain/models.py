"""Pure domain models for tamper-evident SHA-256 hash-chained audit logs & CAMA Sec 405."""

from __future__ import annotations

import hashlib
import json
from collections.abc import Mapping, Sequence
from dataclasses import dataclass
from datetime import date, datetime
from decimal import Decimal
from enum import StrEnum
from uuid import UUID

from nairabooks.auth.domain import ActorRole
from nairabooks.ledger.domain.errors import ValidationError

GENESIS_HASH = "0" * 64

_SENSITIVE_KEY_TOKENS = (
    "password",
    "secret",
    "token",
    "refresh_token",
    "access_token",
    "authorization",
    "cookie",
)


class ProfessionalBody(StrEnum):
    """Nigerian statutory certification bodies matching SQL CHECK constraint."""

    ICAN = "ICAN"
    ANAN = "ANAN"
    DIRECTOR_CAMA = "DIRECTOR_CAMA"


def _sanitize_for_audit(value: object) -> object:
    """Recursively redact credentials/tokens and normalize Decimal/UUID/date types."""
    if isinstance(value, Mapping):
        sanitized: dict[str, object] = {}
        for k in sorted(value.keys(), key=lambda x: str(x)):
            key_str = str(k)
            lowered = key_str.lower()
            if any(tok in lowered for tok in _SENSITIVE_KEY_TOKENS):
                sanitized[key_str] = "[REDACTED]"
            else:
                sanitized[key_str] = _sanitize_for_audit(value[k])
        return sanitized
    if isinstance(value, list | tuple):
        return [_sanitize_for_audit(item) for item in value]
    if isinstance(value, Decimal):
        return str(value)
    if isinstance(value, UUID):
        return str(value)
    if isinstance(value, datetime | date):
        return value.isoformat()
    if isinstance(value, StrEnum):
        return value.value
    return value


def compute_payload_hash(payload: Mapping[str, object]) -> str:
    """Compute canonical 64-char SHA-256 digest of an audit payload with secret redaction."""
    normalized = _sanitize_for_audit(payload)
    encoded = json.dumps(normalized, sort_keys=True, separators=(",", ":")).encode("utf-8")
    return hashlib.sha256(encoded).hexdigest()


def compute_event_hash(
    *,
    id: UUID,
    workspace_id: UUID,
    sequence_number: int,
    actor_user_id: UUID,
    actor_role: ActorRole,
    action: str,
    entity_type: str,
    entity_id: UUID,
    payload_hash: str,
    previous_event_hash: str,
    occurred_at: datetime,
) -> str:
    """Compute deterministic SHA-256 chain hash linking this event to previous_event_hash."""
    canonical = json.dumps(
        {
            "id": str(id),
            "workspaceId": str(workspace_id),
            "sequenceNumber": sequence_number,
            "actorUserId": str(actor_user_id),
            "actorRole": actor_role.value,
            "action": action,
            "entityType": entity_type,
            "entityId": str(entity_id),
            "payloadHash": payload_hash,
            "previousEventHash": previous_event_hash,
            "occurredAt": occurred_at.isoformat(),
        },
        sort_keys=True,
        separators=(",", ":"),
    ).encode("utf-8")
    return hashlib.sha256(canonical).hexdigest()


@dataclass(frozen=True, slots=True)
class AuditEvent:
    """Immutable append-only hash-chained audit event (SEC-REQ-05)."""

    id: UUID
    workspace_id: UUID
    sequence_number: int
    actor_user_id: UUID
    actor_role: ActorRole
    action: str
    entity_type: str
    entity_id: UUID
    payload_hash: str
    previous_event_hash: str
    event_hash: str
    occurred_at: datetime
    ip_address: str | None = None
    user_agent: str | None = None

    def __post_init__(self) -> None:
        if self.sequence_number < 1:
            raise ValidationError("Audit sequence_number must be >= 1.", field="sequenceNumber")
        if len(self.payload_hash) != 64 or len(self.previous_event_hash) != 64:
            raise ValidationError("Audit SHA-256 hashes must be 64 hex chars.", field="payloadHash")
        if len(self.action.strip()) < 3:
            raise ValidationError("Audit action must be at least 3 chars.", field="action")


@dataclass(frozen=True, slots=True)
class AuditChainVerificationResult:
    """Result of verifying per-workspace hash chain integrity."""

    is_valid: bool
    event_count: int
    latest_event_hash: str
    broken_at_sequence: int | None = None
    reason: str | None = None


def verify_audit_chain(events: Sequence[AuditEvent]) -> AuditChainVerificationResult:
    """Verify sequence contiguity, previous_event_hash links, and SHA-256 digests."""
    if not events:
        return AuditChainVerificationResult(
            is_valid=True,
            event_count=0,
            latest_event_hash=GENESIS_HASH,
        )

    ordered = sorted(events, key=lambda e: e.sequence_number)
    expected_prev = GENESIS_HASH
    for expected_seq, ev in enumerate(ordered, start=1):
        if ev.sequence_number != expected_seq:
            return AuditChainVerificationResult(
                is_valid=False,
                event_count=len(ordered),
                latest_event_hash=ordered[-1].event_hash,
                broken_at_sequence=expected_seq,
                reason=(
                    f"Sequence gap or out-of-order entry: "
                    f"expected {expected_seq}, got {ev.sequence_number}."
                ),
            )
        if ev.previous_event_hash != expected_prev:
            return AuditChainVerificationResult(
                is_valid=False,
                event_count=len(ordered),
                latest_event_hash=ordered[-1].event_hash,
                broken_at_sequence=ev.sequence_number,
                reason="Previous event hash mismatch (chain link broken).",
            )
        recomputed = compute_event_hash(
            id=ev.id,
            workspace_id=ev.workspace_id,
            sequence_number=ev.sequence_number,
            actor_user_id=ev.actor_user_id,
            actor_role=ev.actor_role,
            action=ev.action,
            entity_type=ev.entity_type,
            entity_id=ev.entity_id,
            payload_hash=ev.payload_hash,
            previous_event_hash=ev.previous_event_hash,
            occurred_at=ev.occurred_at,
        )
        if ev.event_hash != recomputed:
            return AuditChainVerificationResult(
                is_valid=False,
                event_count=len(ordered),
                latest_event_hash=ordered[-1].event_hash,
                broken_at_sequence=ev.sequence_number,
                reason="Event SHA-256 digest mismatch (tampered audit record).",
            )
        expected_prev = ev.event_hash

    return AuditChainVerificationResult(
        is_valid=True,
        event_count=len(ordered),
        latest_event_hash=expected_prev,
    )


@dataclass(frozen=True, slots=True)
class CamaSec405Certification:
    """Statutory CAMA 2020 Section 405 period financial statement sign-off record."""

    id: UUID
    workspace_id: UUID
    fiscal_period_id: UUID
    certified_by_user_id: UUID
    certified_by_name: str
    professional_body: ProfessionalBody
    frc_reg_number: str
    statement_snapshot_hash: str
    certified_at: datetime

    def __post_init__(self) -> None:
        if len(self.certified_by_name.strip()) < 2:
            raise ValidationError(
                "Certifier full name must be at least 2 characters.",
                field="certifiedByName",
            )
        clean_reg = self.frc_reg_number.strip()
        if len(clean_reg) < 3 or len(clean_reg) > 40:
            raise ValidationError(
                "FRC/ICAN/ANAN registration number must be 3 to 40 characters.",
                field="frcRegNumber",
            )
        if len(self.statement_snapshot_hash) != 64:
            raise ValidationError(
                "Statement snapshot hash must be a 64-char SHA-256 hex digest.",
                field="statementSnapshotHash",
            )
