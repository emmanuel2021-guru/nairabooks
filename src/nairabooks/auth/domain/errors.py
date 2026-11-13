"""Authentication, authorization, and rate-limiting domain errors."""

from __future__ import annotations

from collections.abc import Sequence

from nairabooks.ledger.domain.errors import LedgerDomainError


class AuthenticationError(LedgerDomainError):
    """Raised when credentials, session, or bearer token verification fails (HTTP 401)."""

    code = "UNAUTHENTICATED"

    def __init__(self, message: str = "Authentication required.") -> None:
        super().__init__(message, code="UNAUTHENTICATED")


class AuthorizationError(LedgerDomainError):
    """Raised when an authenticated actor lacks the required RBAC role/permission (HTTP 403)."""

    code = "FORBIDDEN"

    def __init__(
        self,
        message: str = "Insufficient role permissions for this operation.",
        *,
        required_roles: Sequence[str] = (),
        actor_role: str | None = None,
    ) -> None:
        super().__init__(message, code="FORBIDDEN")
        self.required_roles = tuple(required_roles)
        self.actor_role = actor_role


class RateLimitExceededError(LedgerDomainError):
    """Raised when authentication attempts exceed the configured window ceiling (HTTP 429)."""

    code = "RATE_LIMITED"

    def __init__(
        self,
        message: str = "Too many authentication attempts. Please try again later.",
        *,
        retry_after_seconds: int = 900,
    ) -> None:
        super().__init__(message, code="RATE_LIMITED")
        self.retry_after_seconds = retry_after_seconds
