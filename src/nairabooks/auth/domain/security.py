"""Password strength, memory-hard scrypt KDF hashing, and HMAC token lifecycle."""

from __future__ import annotations

import base64
import hashlib
import hmac
import json
import os
import re
import secrets
from collections.abc import Callable
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from uuid import UUID, uuid4

from nairabooks.auth.domain.errors import AuthenticationError
from nairabooks.auth.domain.models import (
    ActorRole,
    IssuedTokenPair,
    RefreshTokenRecord,
)
from nairabooks.ledger.domain.errors import ValidationError

_UPPER_RE = re.compile(r"[A-Z]")
_LOWER_RE = re.compile(r"[a-z]")
_DIGIT_RE = re.compile(r"[0-9]")
_SPECIAL_RE = re.compile(r"[^A-Za-z0-9]")

# Memory-hard scrypt parameters (N=16384, r=8, p=1 => ~16 MiB per derivation)
_SCRYPT_N = 16384
_SCRYPT_R = 8
_SCRYPT_P = 1
_SCRYPT_DKLEN = 32

_EPHEMERAL_DEV_SECRET = secrets.token_urlsafe(48)


def validate_password_strength(password: str) -> None:
    """Enforce OWASP ASVS password length & complexity rules."""
    if len(password) < 12:
        raise ValidationError(
            "Password must be at least 12 characters long.",
            field="password",
        )
    if not _UPPER_RE.search(password):
        raise ValidationError(
            "Password must contain at least one uppercase letter.",
            field="password",
        )
    if not _LOWER_RE.search(password):
        raise ValidationError(
            "Password must contain at least one lowercase letter.",
            field="password",
        )
    if not _DIGIT_RE.search(password):
        raise ValidationError(
            "Password must contain at least one digit.",
            field="password",
        )
    if not _SPECIAL_RE.search(password):
        raise ValidationError(
            "Password must contain at least one special character.",
            field="password",
        )


def _b64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def _b64url_decode(encoded: str) -> bytes:
    padding = "=" * (-len(encoded) % 4)
    return base64.urlsafe_b64decode((encoded + padding).encode("ascii"))


class PasswordHasher:
    """Memory-hard scrypt password hasher using PHC-formatted salted digests."""

    def __init__(self, *, n: int = _SCRYPT_N, r: int = _SCRYPT_R, p: int = _SCRYPT_P) -> None:
        self._n = n
        self._r = r
        self._p = p

    def hash_password(self, password: str) -> str:
        """Validate password strength and return PHC-formatted salted scrypt hash."""
        validate_password_strength(password)
        salt = secrets.token_bytes(16)
        derived = hashlib.scrypt(
            password.encode("utf-8"),
            salt=salt,
            n=self._n,
            r=self._r,
            p=self._p,
            dklen=_SCRYPT_DKLEN,
        )
        return (
            f"$scrypt$n={self._n},r={self._r},p={self._p}$"
            f"{_b64url_encode(salt)}${_b64url_encode(derived)}"
        )

    def verify_password(self, password: str, stored_hash: str) -> bool:
        """Constant-time verification against a stored PHC scrypt hash."""
        parts = stored_hash.split("$")
        if len(parts) != 5 or parts[1] != "scrypt":
            return False
        try:
            param_map = dict(item.split("=", 1) for item in parts[2].split(","))
            n = int(param_map["n"])
            r = int(param_map["r"])
            p = int(param_map["p"])
            salt = _b64url_decode(parts[3])
            expected = _b64url_decode(parts[4])
        except (ValueError, KeyError):
            return False
        derived = hashlib.scrypt(
            password.encode("utf-8"),
            salt=salt,
            n=n,
            r=r,
            p=p,
            dklen=len(expected),
        )
        return hmac.compare_digest(derived, expected)


@dataclass(frozen=True, slots=True)
class AccessTokenClaims:
    """Verified claims extracted from an access token."""

    jti: UUID
    user_id: UUID
    workspace_id: UUID
    role: ActorRole
    session_id: UUID
    issued_at: datetime
    expires_at: datetime


def hash_refresh_token(refresh_token: str) -> str:
    """Return 64-char SHA-256 hex digest of an opaque refresh token."""
    return hashlib.sha256(refresh_token.encode("utf-8")).hexdigest()


def resolve_auth_secret(explicit_secret: str | None = None) -> str:
    """Resolve signing key strictly from explicit/env config; fail closed in production."""
    if explicit_secret is not None:
        if len(explicit_secret.strip()) < 24:
            raise ValueError("Auth signing secret must be at least 24 characters.")
        return explicit_secret

    env_secret = os.environ.get("NAIRABOOKS_AUTH_SECRET", "").strip()
    if env_secret:
        if len(env_secret) < 24:
            raise ValueError("NAIRABOOKS_AUTH_SECRET must be at least 24 characters.")
        return env_secret

    env_name = os.environ.get("NAIRABOOKS_ENV", "development").strip().lower()
    if env_name == "production":
        raise RuntimeError(
            "SEC-REQ-12: NAIRABOOKS_AUTH_SECRET must be set in production environments."
        )
    return _EPHEMERAL_DEV_SECRET


class TokenService:
    """Issues and verifies short-lived HMAC-SHA256 JWT-style tokens and rotating refresh tokens."""

    def __init__(
        self,
        *,
        secret: str | None = None,
        access_ttl: timedelta = timedelta(minutes=15),
        refresh_ttl: timedelta = timedelta(days=7),
        now_fn: Callable[[], datetime] | None = None,
    ) -> None:
        self._secret = resolve_auth_secret(secret).encode("utf-8")
        self._access_ttl = access_ttl
        self._refresh_ttl = refresh_ttl
        self._now_fn = now_fn or (lambda: datetime.now(UTC))

    @property
    def now(self) -> datetime:
        """Current UTC timestamp from configured clock."""
        return self._now_fn()

    def issue_token_pair(
        self,
        *,
        user_id: UUID,
        workspace_id: UUID,
        role: ActorRole,
        session_id: UUID,
        family_id: UUID | None = None,
    ) -> IssuedTokenPair:
        """Mint a 15-minute signed access token and an opaque rotating refresh token."""
        issued_at = self._now_fn()
        access_exp = issued_at + self._access_ttl
        refresh_exp = issued_at + self._refresh_ttl

        header_b64 = _b64url_encode(
            json.dumps({"alg": "HS256", "typ": "JWT"}, separators=(",", ":")).encode("utf-8")
        )
        payload = {
            "jti": str(uuid4()),
            "sub": str(user_id),
            "wid": str(workspace_id),
            "role": role.value,
            "sid": str(session_id),
            "typ": "access",
            "iat": int(issued_at.timestamp()),
            "exp": int(access_exp.timestamp()),
        }
        payload_b64 = _b64url_encode(
            json.dumps(payload, separators=(",", ":"), sort_keys=True).encode("utf-8")
        )
        signing_input = f"{header_b64}.{payload_b64}".encode("ascii")
        sig = hmac.new(self._secret, signing_input, hashlib.sha256).digest()
        access_token = f"{header_b64}.{payload_b64}.{_b64url_encode(sig)}"

        raw_refresh = secrets.token_urlsafe(48)
        refresh_record = RefreshTokenRecord(
            token_hash=hash_refresh_token(raw_refresh),
            family_id=family_id or uuid4(),
            session_id=session_id,
            user_id=user_id,
            workspace_id=workspace_id,
            expires_at=refresh_exp,
            created_at=issued_at,
        )
        return IssuedTokenPair(
            access_token=access_token,
            refresh_token=raw_refresh,
            access_expires_at=access_exp,
            refresh_expires_at=refresh_exp,
            refresh_record=refresh_record,
        )

    def verify_access_token(self, token: str) -> AccessTokenClaims:
        """Verify HMAC signature, token type, and expiry; raise AuthenticationError if invalid."""
        parts = token.strip().split(".")
        if len(parts) != 3:
            raise AuthenticationError("Malformed authentication token.")

        header_b64, payload_b64, sig_b64 = parts
        signing_input = f"{header_b64}.{payload_b64}".encode("ascii")
        expected_sig = hmac.new(self._secret, signing_input, hashlib.sha256).digest()
        try:
            actual_sig = _b64url_decode(sig_b64)
        except ValueError as exc:
            raise AuthenticationError("Invalid token signature encoding.") from exc

        if not hmac.compare_digest(actual_sig, expected_sig):
            raise AuthenticationError("Invalid authentication token signature.")

        try:
            payload = json.loads(_b64url_decode(payload_b64).decode("utf-8"))
        except (ValueError, UnicodeDecodeError) as exc:
            raise AuthenticationError("Malformed token payload.") from exc

        if not isinstance(payload, dict) or payload.get("typ") != "access":
            raise AuthenticationError("Invalid token type.")

        try:
            exp_ts = int(payload["exp"])
            iat_ts = int(payload["iat"])
            now_ts = int(self._now_fn().timestamp())
            if now_ts >= exp_ts:
                raise AuthenticationError("Authentication token has expired.")

            return AccessTokenClaims(
                jti=UUID(str(payload["jti"])),
                user_id=UUID(str(payload["sub"])),
                workspace_id=UUID(str(payload["wid"])),
                role=ActorRole(str(payload["role"])),
                session_id=UUID(str(payload["sid"])),
                issued_at=datetime.fromtimestamp(iat_ts, tz=UTC),
                expires_at=datetime.fromtimestamp(exp_ts, tz=UTC),
            )
        except AuthenticationError:
            raise
        except (KeyError, TypeError, ValueError) as exc:
            raise AuthenticationError("Incomplete or invalid token claims.") from exc
