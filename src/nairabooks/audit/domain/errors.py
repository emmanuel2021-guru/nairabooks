"""Domain errors for the NairaBooks immutable audit log and CAMA Sec 405 context."""

from __future__ import annotations

from uuid import UUID

from nairabooks.ledger.domain.errors import LedgerDomainError


class ImmutableAuditLogError(LedgerDomainError):
    """Raised when any caller attempts to update or delete an append-only audit event."""

    code = "IMMUTABLE_AUDIT_LOG"

    def __init__(self, event_id: UUID | None = None) -> None:
        detail = f"Audit event {event_id}" if event_id else "Audit log"
        super().__init__(
            f"{detail} is strictly append-only and cannot be modified or deleted (SEC-REQ-05).",
            code="IMMUTABLE_AUDIT_LOG",
        )
