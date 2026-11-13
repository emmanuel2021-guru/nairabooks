"""Parameterized PostgreSQL 18 SQL builders for audit_events & cama_sec405_certifications."""

from __future__ import annotations

from uuid import UUID

from nairabooks.audit.domain import AuditEvent, CamaSec405Certification


class PostgresAuditSqlBuilder:
    """Build parameterized SQL aligned with migrations 0001 and 0002 (zero interpolation)."""

    @staticmethod
    def insert_audit_event(event: AuditEvent) -> tuple[str, tuple[object, ...]]:
        """Insert an append-only audit event row."""
        sql = (
            "INSERT INTO audit_events ("
            "id, workspace_id, actor_user_id, actor_role, action, entity_type, entity_id, "
            "payload_hash, previous_event_hash, occurred_at"
            ") VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s);"
        )
        return sql, (
            str(event.id),
            str(event.workspace_id),
            str(event.actor_user_id),
            event.actor_role.value,
            event.action,
            event.entity_type,
            str(event.entity_id),
            event.payload_hash,
            event.previous_event_hash,
            event.occurred_at.isoformat(),
        )

    @staticmethod
    def select_audit_events_keyset(
        workspace_id: UUID,
        *,
        first: int = 50,
    ) -> tuple[str, tuple[object, ...]]:
        """Select newest-first RLS-scoped audit events bounded by LIMIT."""
        sql = (
            "SELECT id, sequence_number, actor_user_id, actor_role, action, "
            "entity_type, entity_id, payload_hash, previous_event_hash, occurred_at "
            "FROM audit_events "
            "WHERE workspace_id = %s "
            "ORDER BY sequence_number DESC "
            "LIMIT %s;"
        )
        return sql, (str(workspace_id), first)

    @staticmethod
    def insert_cama_certification(cert: CamaSec405Certification) -> tuple[str, tuple[object, ...]]:
        """Insert an immutable CAMA 2020 Section 405 certification record."""
        sql = (
            "INSERT INTO cama_sec405_certifications ("
            "id, workspace_id, fiscal_period_id, certified_by_user_id, certified_by_name, "
            "professional_body, frc_reg_number, statement_snapshot_hash, certified_at"
            ") VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s);"
        )
        return sql, (
            str(cert.id),
            str(cert.workspace_id),
            str(cert.fiscal_period_id),
            str(cert.certified_by_user_id),
            cert.certified_by_name,
            cert.professional_body.value,
            cert.frc_reg_number,
            cert.statement_snapshot_hash,
            cert.certified_at.isoformat(),
        )
