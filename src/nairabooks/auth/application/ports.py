"""Hexagonal output ports for NairaBooks multi-tenant auth & session storage."""

from __future__ import annotations

from datetime import datetime
from typing import Protocol
from uuid import UUID

from nairabooks.auth.domain import (
    RefreshTokenRecord,
    UserAccount,
    Workspace,
    WorkspaceMember,
)


class AuthStore(Protocol):
    """Persistence port for workspaces, users, RBAC memberships, and rotating refresh tokens."""

    def save_workspace(self, workspace: Workspace) -> None:
        """Insert or update a tenant workspace."""

    def find_workspace(self, workspace_id: UUID) -> Workspace | None:
        """Fetch workspace by ID."""

    def list_workspaces_for_user(self, user_id: UUID) -> list[tuple[Workspace, WorkspaceMember]]:
        """List all active workspaces and roles assigned to user_id."""

    def save_user(self, user: UserAccount) -> None:
        """Insert or update a user account."""

    def find_user_by_id(self, user_id: UUID) -> UserAccount | None:
        """Fetch user account by UUID."""

    def find_user_by_email(self, email: str) -> UserAccount | None:
        """Fetch user account by normalized email address."""

    def save_member(self, member: WorkspaceMember) -> None:
        """Create or update a workspace membership role."""

    def find_member(self, workspace_id: UUID, user_id: UUID) -> WorkspaceMember | None:
        """Fetch membership record for (workspace_id, user_id)."""

    def list_members(self, workspace_id: UUID) -> list[tuple[WorkspaceMember, UserAccount]]:
        """Return all members and user profiles scoped strictly to workspace_id."""

    def user_has_any_membership(self, user_id: UUID) -> bool:
        """Return True if user belongs to at least one workspace."""

    def workspace_has_members(self, workspace_id: UUID) -> bool:
        """Return True if workspace already has configured members."""

    def save_refresh_token(self, record: RefreshTokenRecord) -> None:
        """Persist a hashed refresh token record."""

    def find_refresh_token(self, token_hash: str) -> RefreshTokenRecord | None:
        """Look up a refresh token record by SHA-256 token hash."""

    def mark_refresh_token_rotated(
        self,
        token_hash: str,
        *,
        replaced_by_hash: str,
        revoked_at: datetime,
    ) -> None:
        """Mark an existing refresh token as rotated to replaced_by_hash."""

    def revoke_refresh_token(self, token_hash: str, *, revoked_at: datetime) -> None:
        """Revoke a single refresh token on logout."""

    def revoke_token_family(self, family_id: UUID, *, revoked_at: datetime) -> None:
        """Revoke every refresh token in a compromised token family."""

    def record_failed_login(self, key: str, *, occurred_at: datetime) -> int:
        """Record a failed login attempt within the sliding window and return recent count."""

    def clear_failed_logins(self, key: str) -> None:
        """Reset failed login counter after successful authentication."""

    def count_recent_failed_logins(
        self,
        key: str,
        *,
        since: datetime,
    ) -> int:
        """Count failed login attempts for key since timestamp."""
