"""Pure domain models for NairaBooks multi-tenant identity, sessions, and RBAC."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import UTC, datetime
from enum import StrEnum
from uuid import UUID

from nairabooks.ledger.domain.errors import ValidationError


class ActorRole(StrEnum):
    """Built-in Nigerian accounting & operational roles matching schema.graphql & SQL."""

    OWNER_MANAGING_DIRECTOR = "OWNER_MANAGING_DIRECTOR"
    CHARTERED_ACCOUNTANT_CFO = "CHARTERED_ACCOUNTANT_CFO"
    BOOKKEEPER = "BOOKKEEPER"
    BRANCH_OUTLET_CASHIER = "BRANCH_OUTLET_CASHIER"
    EXTERNAL_AUDITOR_READONLY = "EXTERNAL_AUDITOR_READONLY"


class Permission(StrEnum):
    """Fine-grained RBAC capability permissions."""

    LEDGER_READ = "ledger:read"
    LEDGER_POST_VOUCHER = "ledger:post_voucher"
    LEDGER_APPROVE_VOUCHER = "ledger:approve_voucher"
    LEDGER_REVERSE_VOUCHER = "ledger:reverse_voucher"
    LEDGER_RECONCILE = "ledger:reconcile"
    FRCN_REPORTS_READ = "reports:frcn_read"
    TAX_READ = "tax:read"
    TAX_MANAGE = "tax:manage"
    PACKS_READ = "packs:read"
    PACKS_CONFIGURE = "packs:configure"
    CAMA_CERTIFY_PERIOD = "audit:cama_certify"
    AUDIT_READ = "audit:read"
    MEMBERS_MANAGE = "members:manage"


@dataclass(frozen=True, slots=True)
class Workspace:
    """Tenant organization workspace."""

    id: UUID
    name: str
    slug: str
    base_currency: str = "NGN"
    created_at: datetime = field(default_factory=lambda: datetime.now(UTC))

    def __post_init__(self) -> None:
        if len(self.name.strip()) < 2:
            raise ValidationError("Workspace name must be at least 2 characters.", field="name")
        if len(self.slug.strip()) < 2:
            raise ValidationError("Workspace slug must be at least 2 characters.", field="slug")


@dataclass(frozen=True, slots=True)
class UserAccount:
    """Registered user identity with scrypt/Argon2 password hash (never plaintext)."""

    id: UUID
    email: str
    full_name: str
    password_hash: str
    is_active: bool = True
    created_at: datetime = field(default_factory=lambda: datetime.now(UTC))

    def __post_init__(self) -> None:
        if "@" not in self.email:
            raise ValidationError("Valid email address is required.", field="email")
        if len(self.password_hash) < 32:
            raise ValidationError(
                "Password hash must satisfy cryptographic KDF length requirements.",
                field="password_hash",
            )


@dataclass(frozen=True, slots=True)
class WorkspaceMember:
    """Tenant-scoped role assignment binding a user to a workspace."""

    id: UUID
    workspace_id: UUID
    user_id: UUID
    role: ActorRole
    is_active: bool = True
    created_at: datetime = field(default_factory=lambda: datetime.now(UTC))


@dataclass(frozen=True, slots=True)
class RefreshTokenRecord:
    """Hashed refresh token record supporting rotation & reuse family revocation."""

    token_hash: str
    family_id: UUID
    session_id: UUID
    user_id: UUID
    workspace_id: UUID
    expires_at: datetime
    created_at: datetime = field(default_factory=lambda: datetime.now(UTC))
    revoked_at: datetime | None = None
    replaced_by_hash: str | None = None


@dataclass(frozen=True, slots=True)
class AuthenticatedContext:
    """Verified server-side actor + tenant execution context (SEC-REQ-01)."""

    workspace_id: UUID
    user_id: UUID
    email: str
    full_name: str
    role: ActorRole
    session_id: UUID
    auth_method: str = "bearer_token"


@dataclass(frozen=True, slots=True)
class IssuedTokenPair:
    """Short-lived access token + opaque rotating refresh token."""

    access_token: str
    refresh_token: str
    access_expires_at: datetime
    refresh_expires_at: datetime
    refresh_record: RefreshTokenRecord
