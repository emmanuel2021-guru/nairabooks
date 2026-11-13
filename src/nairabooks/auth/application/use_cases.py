"""Application use cases for authentication, session rotation, RBAC & workspace switching."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta
from uuid import UUID, uuid4

from nairabooks.auth.application.ports import AuthStore
from nairabooks.auth.domain import (
    ActorRole,
    AuthenticatedContext,
    AuthenticationError,
    PasswordHasher,
    Permission,
    RateLimitExceededError,
    TokenService,
    UserAccount,
    Workspace,
    WorkspaceMember,
    hash_refresh_token,
    require_permission,
)
from nairabooks.ledger.domain.errors import CrossTenantAccessError, ValidationError

MAX_LOGIN_FAILURES_PER_WINDOW = 5
LOGIN_RATE_LIMIT_WINDOW = timedelta(minutes=15)


@dataclass(frozen=True, slots=True)
class LoginCommand:
    """Credentials & metadata for workspace-scoped authentication."""

    email: str
    password: str
    workspace_id: UUID | None = None
    ip_address: str = "127.0.0.1"


@dataclass(frozen=True, slots=True)
class SessionResult:
    """Authenticated session response carrying context, tokens, and workspace roster."""

    context: AuthenticatedContext
    access_token: str
    refresh_token: str
    access_expires_at: datetime
    refresh_expires_at: datetime
    workspace: Workspace
    available_workspaces: tuple[tuple[Workspace, ActorRole], ...]


@dataclass(frozen=True, slots=True)
class AssignMemberRoleCommand:
    """Owner command to add or update a member's RBAC role inside a workspace."""

    actor: AuthenticatedContext
    email: str
    full_name: str
    role: ActorRole
    password: str | None = None


class LoginUseCase:
    """Authenticate email + password with rate limiting and mint short-lived tokens."""

    def __init__(
        self,
        *,
        store: AuthStore,
        token_service: TokenService,
        hasher: PasswordHasher | None = None,
    ) -> None:
        self._store = store
        self._tokens = token_service
        self._hasher = hasher or PasswordHasher()

    def execute(self, command: LoginCommand) -> SessionResult:
        normalized_email = command.email.strip().lower()
        rate_key = f"{normalized_email}|{command.ip_address}"
        now = self._tokens.now
        since = now - LOGIN_RATE_LIMIT_WINDOW
        recent_failures = self._store.count_recent_failed_logins(rate_key, since=since)
        if recent_failures >= MAX_LOGIN_FAILURES_PER_WINDOW:
            raise RateLimitExceededError(
                "Too many failed login attempts. Please wait 15 minutes before retrying."
            )

        user = self._store.find_user_by_email(normalized_email)
        if (
            user is None
            or not user.is_active
            or not self._hasher.verify_password(command.password, user.password_hash)
        ):
            self._store.record_failed_login(rate_key, occurred_at=now)
            raise AuthenticationError("Invalid email or password.")

        memberships = self._store.list_workspaces_for_user(user.id)
        if not memberships:
            raise AuthenticationError("User does not belong to any active workspace.")

        if command.workspace_id is not None:
            selected = next(
                (pair for pair in memberships if pair[0].id == command.workspace_id),
                None,
            )
            if selected is None:
                raise CrossTenantAccessError(
                    "User does not have access to the requested workspace."
                )
        else:
            selected = memberships[0]

        workspace, member = selected
        self._store.clear_failed_logins(rate_key)
        session_id = uuid4()
        pair = self._tokens.issue_token_pair(
            user_id=user.id,
            workspace_id=workspace.id,
            role=member.role,
            session_id=session_id,
        )
        self._store.save_refresh_token(pair.refresh_record)

        ctx = AuthenticatedContext(
            workspace_id=workspace.id,
            user_id=user.id,
            email=user.email,
            full_name=user.full_name,
            role=member.role,
            session_id=session_id,
            auth_method="bearer_token",
        )
        return SessionResult(
            context=ctx,
            access_token=pair.access_token,
            refresh_token=pair.refresh_token,
            access_expires_at=pair.access_expires_at,
            refresh_expires_at=pair.refresh_expires_at,
            workspace=workspace,
            available_workspaces=tuple((ws, m.role) for ws, m in memberships),
        )


class RefreshSessionUseCase:
    """Rotate refresh token atomically with compromised-family reuse detection."""

    def __init__(self, *, store: AuthStore, token_service: TokenService) -> None:
        self._store = store
        self._tokens = token_service

    def execute(self, refresh_token: str) -> SessionResult:
        if not refresh_token.strip():
            raise AuthenticationError("Refresh token is required.")

        token_hash = hash_refresh_token(refresh_token)
        record = self._store.find_refresh_token(token_hash)
        if record is None:
            raise AuthenticationError("Invalid refresh token.")

        now = self._tokens.now
        if record.revoked_at is not None or record.replaced_by_hash is not None:
            # Compromised token replay detected -> revoke entire token family
            self._store.revoke_token_family(record.family_id, revoked_at=now)
            raise AuthenticationError(
                "Refresh token has already been rotated or revoked; session family invalidated."
            )

        if now >= record.expires_at:
            self._store.revoke_refresh_token(token_hash, revoked_at=now)
            raise AuthenticationError("Refresh token has expired.")

        user = self._store.find_user_by_id(record.user_id)
        member = self._store.find_member(record.workspace_id, record.user_id)
        workspace = self._store.find_workspace(record.workspace_id)
        if (
            user is None
            or not user.is_active
            or member is None
            or not member.is_active
            or workspace is None
        ):
            raise AuthenticationError("Account or workspace membership is no longer active.")

        next_pair = self._tokens.issue_token_pair(
            user_id=user.id,
            workspace_id=workspace.id,
            role=member.role,
            session_id=record.session_id,
            family_id=record.family_id,
        )
        self._store.mark_refresh_token_rotated(
            token_hash,
            replaced_by_hash=next_pair.refresh_record.token_hash,
            revoked_at=now,
        )
        self._store.save_refresh_token(next_pair.refresh_record)

        memberships = self._store.list_workspaces_for_user(user.id)
        ctx = AuthenticatedContext(
            workspace_id=workspace.id,
            user_id=user.id,
            email=user.email,
            full_name=user.full_name,
            role=member.role,
            session_id=record.session_id,
            auth_method="refresh_token",
        )
        return SessionResult(
            context=ctx,
            access_token=next_pair.access_token,
            refresh_token=next_pair.refresh_token,
            access_expires_at=next_pair.access_expires_at,
            refresh_expires_at=next_pair.refresh_expires_at,
            workspace=workspace,
            available_workspaces=tuple((ws, m.role) for ws, m in memberships),
        )


class LogoutUseCase:
    """Revoke refresh token on explicit sign-out."""

    def __init__(self, *, store: AuthStore, token_service: TokenService | None = None) -> None:
        self._store = store
        self._tokens = token_service

    def execute(self, refresh_token: str) -> None:
        if not refresh_token.strip():
            return
        now = self._tokens.now if self._tokens else datetime.now(tz=None).astimezone()
        self._store.revoke_refresh_token(hash_refresh_token(refresh_token), revoked_at=now)


class ResolveAuthContextUseCase:
    """Verify an access token and re-validate active tenant membership from AuthStore."""

    def __init__(self, *, store: AuthStore, token_service: TokenService) -> None:
        self._store = store
        self._tokens = token_service

    def execute(self, access_token: str) -> AuthenticatedContext:
        claims = self._tokens.verify_access_token(access_token)
        user = self._store.find_user_by_id(claims.user_id)
        if user is None or not user.is_active:
            raise AuthenticationError("User account is inactive or does not exist.")
        member = self._store.find_member(claims.workspace_id, claims.user_id)
        if member is None or not member.is_active:
            raise CrossTenantAccessError(
                "Authenticated user is not an active member of this workspace."
            )
        return AuthenticatedContext(
            workspace_id=claims.workspace_id,
            user_id=user.id,
            email=user.email,
            full_name=user.full_name,
            role=member.role,
            session_id=claims.session_id,
            auth_method="bearer_token",
        )


class SwitchWorkspaceUseCase:
    """Switch active tenant context only when user holds active membership in target workspace."""

    def __init__(self, *, store: AuthStore, token_service: TokenService) -> None:
        self._store = store
        self._tokens = token_service

    def execute(
        self,
        *,
        ctx: AuthenticatedContext,
        target_workspace_id: UUID,
    ) -> SessionResult:
        user = self._store.find_user_by_id(ctx.user_id)
        if user is None or not user.is_active:
            raise AuthenticationError("User account is inactive.")
        workspace = self._store.find_workspace(target_workspace_id)
        member = self._store.find_member(target_workspace_id, ctx.user_id)
        if workspace is None or member is None or not member.is_active:
            raise CrossTenantAccessError(
                "Cross-tenant switch denied: you are not an active member of target workspace."
            )

        session_id = uuid4()
        pair = self._tokens.issue_token_pair(
            user_id=user.id,
            workspace_id=workspace.id,
            role=member.role,
            session_id=session_id,
        )
        self._store.save_refresh_token(pair.refresh_record)
        memberships = self._store.list_workspaces_for_user(user.id)
        next_ctx = AuthenticatedContext(
            workspace_id=workspace.id,
            user_id=user.id,
            email=user.email,
            full_name=user.full_name,
            role=member.role,
            session_id=session_id,
            auth_method="workspace_switch",
        )
        return SessionResult(
            context=next_ctx,
            access_token=pair.access_token,
            refresh_token=pair.refresh_token,
            access_expires_at=pair.access_expires_at,
            refresh_expires_at=pair.refresh_expires_at,
            workspace=workspace,
            available_workspaces=tuple((ws, m.role) for ws, m in memberships),
        )


class ManageWorkspaceMemberUseCase:
    """List or assign RBAC roles within the active workspace (Owner only)."""

    def __init__(self, *, store: AuthStore, hasher: PasswordHasher | None = None) -> None:
        self._store = store
        self._hasher = hasher or PasswordHasher()

    def list_members(
        self, *, actor: AuthenticatedContext
    ) -> list[tuple[WorkspaceMember, UserAccount]]:
        require_permission(actor, Permission.MEMBERS_MANAGE)
        return self._store.list_members(actor.workspace_id)

    def assign_member(
        self, command: AssignMemberRoleCommand
    ) -> tuple[WorkspaceMember, UserAccount]:
        require_permission(command.actor, Permission.MEMBERS_MANAGE)
        normalized_email = command.email.strip().lower()
        if "@" not in normalized_email:
            raise ValidationError("Valid member email is required.", field="email")

        user = self._store.find_user_by_email(normalized_email)
        if user is None:
            raw_pw = command.password or "NairaBooks#2026"
            user = UserAccount(
                id=uuid4(),
                email=normalized_email,
                full_name=command.full_name.strip() or normalized_email,
                password_hash=self._hasher.hash_password(raw_pw),
            )
            self._store.save_user(user)

        existing = self._store.find_member(command.actor.workspace_id, user.id)
        member = WorkspaceMember(
            id=existing.id if existing else uuid4(),
            workspace_id=command.actor.workspace_id,
            user_id=user.id,
            role=command.role,
            is_active=True,
        )
        self._store.save_member(member)
        return member, user
