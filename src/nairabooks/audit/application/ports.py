"""Hexagonal output ports for append-only audit events and CAMA Sec 405 certifications."""

from __future__ import annotations

from datetime import datetime
from typing import Protocol
from uuid import UUID

from nairabooks.audit.domain import AuditEvent, CamaSec405Certification
from nairabooks.auth.domain import ActorRole


class AuditStore(Protocol):
    """Append-only audit trail and statutory certification persistence port."""

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
        """Atomically assign sequence_number + previous_event_hash and append event."""

    def list_events(self, workspace_id: UUID) -> list[AuditEvent]:
        """Return workspace audit events ordered newest-first."""

    def list_events_ascending(self, workspace_id: UUID) -> list[AuditEvent]:
        """Return workspace audit events ordered chronologically for chain verification."""

    def update_event(self, workspace_id: UUID, event_id: UUID) -> None:
        """Always raise ImmutableAuditLogError (SEC-REQ-05)."""

    def delete_event(self, workspace_id: UUID, event_id: UUID) -> None:
        """Always raise ImmutableAuditLogError (SEC-REQ-05)."""

    def save_cama_certification(self, certification: CamaSec405Certification) -> None:
        """Persist immutable CAMA 2020 Section 405 certification record."""

    def find_cama_certification(
        self, workspace_id: UUID, fiscal_period_id: UUID
    ) -> CamaSec405Certification | None:
        """Look up certification for a workspace fiscal period."""

    def list_cama_certifications(self, workspace_id: UUID) -> list[CamaSec405Certification]:
        """Return all CAMA Sec 405 certifications for workspace newest-first."""
