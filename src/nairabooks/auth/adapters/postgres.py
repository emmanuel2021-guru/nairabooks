"""Parameterized PostgreSQL 18 SQL builders for workspaces, users, and RLS memberships."""

from __future__ import annotations

from uuid import UUID

from nairabooks.auth.domain import WorkspaceMember


class PostgresAuthSqlBuilder:
    """Build parameterized SQL aligned with migrations 0001 and 0002 (zero interpolation)."""

    @staticmethod
    def select_user_by_email(email: str) -> tuple[str, tuple[str]]:
        """Fetch user row by normalized email."""
        return (
            "SELECT id, email, full_name, password_hash, is_active, created_at "
            "FROM users WHERE lower(email) = lower(%s);",
            (email.strip(),),
        )

    @staticmethod
    def select_member(workspace_id: UUID, user_id: UUID) -> tuple[str, tuple[str, str]]:
        """Fetch active RBAC membership within RLS-scoped workspace."""
        return (
            "SELECT id, workspace_id, user_id, role, is_active, created_at "
            "FROM workspace_members "
            "WHERE workspace_id = %s AND user_id = %s AND is_active = TRUE;",
            (str(workspace_id), str(user_id)),
        )

    @staticmethod
    def upsert_member(member: WorkspaceMember) -> tuple[str, tuple[object, ...]]:
        """Insert or update RBAC role assignment inside workspace_members."""
        sql = (
            "INSERT INTO workspace_members (id, workspace_id, user_id, role, is_active) "
            "VALUES (%s, %s, %s, %s, %s) "
            "ON CONFLICT (workspace_id, user_id) "
            "DO UPDATE SET role = EXCLUDED.role, is_active = EXCLUDED.is_active;"
        )
        return sql, (
            str(member.id),
            str(member.workspace_id),
            str(member.user_id),
            member.role.value,
            member.is_active,
        )
