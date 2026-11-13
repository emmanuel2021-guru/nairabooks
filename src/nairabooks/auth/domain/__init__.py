"""Domain exports for NairaBooks auth & RBAC bounded context."""

from nairabooks.auth.domain.errors import (
    AuthenticationError,
    AuthorizationError,
    RateLimitExceededError,
)
from nairabooks.auth.domain.models import (
    ActorRole,
    AuthenticatedContext,
    IssuedTokenPair,
    Permission,
    RefreshTokenRecord,
    UserAccount,
    Workspace,
    WorkspaceMember,
)
from nairabooks.auth.domain.rbac import (
    ROLE_PERMISSIONS,
    enforce_segregation_of_duties,
    enforce_tenant_isolation,
    has_permission,
    permissions_for_role,
    require_permission,
    require_roles,
)
from nairabooks.auth.domain.security import (
    AccessTokenClaims,
    PasswordHasher,
    TokenService,
    hash_refresh_token,
    resolve_auth_secret,
    validate_password_strength,
)

__all__ = [
    "AccessTokenClaims",
    "ActorRole",
    "AuthenticatedContext",
    "AuthenticationError",
    "AuthorizationError",
    "IssuedTokenPair",
    "PasswordHasher",
    "Permission",
    "ROLE_PERMISSIONS",
    "RateLimitExceededError",
    "RefreshTokenRecord",
    "TokenService",
    "UserAccount",
    "Workspace",
    "WorkspaceMember",
    "enforce_segregation_of_duties",
    "enforce_tenant_isolation",
    "hash_refresh_token",
    "has_permission",
    "permissions_for_role",
    "require_permission",
    "require_roles",
    "resolve_auth_secret",
    "validate_password_strength",
]
