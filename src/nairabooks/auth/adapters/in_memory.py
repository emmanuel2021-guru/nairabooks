"""Thread-safe in-memory AuthStore and seeded multi-tenant Nigerian persona fixture."""

from __future__ import annotations

from dataclasses import dataclass, replace
from datetime import datetime
from threading import RLock
from uuid import UUID, uuid4

from nairabooks.auth.domain import (
    ActorRole,
    PasswordHasher,
    RefreshTokenRecord,
    UserAccount,
    Workspace,
    WorkspaceMember,
)


class InMemoryAuthStore:
    """Thread-safe in-memory AuthStore implementing tenant-scoped membership lookups."""

    def __init__(self) -> None:
        self._lock = RLock()
        self._workspaces: dict[UUID, Workspace] = {}
        self._users: dict[UUID, UserAccount] = {}
        self._emails: dict[str, UUID] = {}
        self._members: dict[tuple[UUID, UUID], WorkspaceMember] = {}
        self._refresh_tokens: dict[str, RefreshTokenRecord] = {}
        self._failed_logins: dict[str, list[datetime]] = {}

    def save_workspace(self, workspace: Workspace) -> None:
        with self._lock:
            self._workspaces[workspace.id] = workspace

    def find_workspace(self, workspace_id: UUID) -> Workspace | None:
        with self._lock:
            return self._workspaces.get(workspace_id)

    def list_workspaces_for_user(self, user_id: UUID) -> list[tuple[Workspace, WorkspaceMember]]:
        with self._lock:
            results: list[tuple[Workspace, WorkspaceMember]] = []
            for (ws_id, uid), member in self._members.items():
                if uid == user_id and member.is_active:
                    ws = self._workspaces.get(ws_id)
                    if ws is not None:
                        results.append((ws, member))
            return sorted(results, key=lambda pair: str(pair[0].id))

    def save_user(self, user: UserAccount) -> None:
        with self._lock:
            self._users[user.id] = user
            self._emails[user.email.strip().lower()] = user.id

    def find_user_by_id(self, user_id: UUID) -> UserAccount | None:
        with self._lock:
            return self._users.get(user_id)

    def find_user_by_email(self, email: str) -> UserAccount | None:
        with self._lock:
            user_id = self._emails.get(email.strip().lower())
            if user_id is None:
                return None
            return self._users.get(user_id)

    def save_member(self, member: WorkspaceMember) -> None:
        with self._lock:
            self._members[(member.workspace_id, member.user_id)] = member

    def find_member(self, workspace_id: UUID, user_id: UUID) -> WorkspaceMember | None:
        with self._lock:
            return self._members.get((workspace_id, user_id))

    def list_members(self, workspace_id: UUID) -> list[tuple[WorkspaceMember, UserAccount]]:
        with self._lock:
            items: list[tuple[WorkspaceMember, UserAccount]] = []
            for (ws_id, uid), member in self._members.items():
                if ws_id == workspace_id:
                    user = self._users.get(uid)
                    if user is not None:
                        items.append((member, user))
            return sorted(items, key=lambda pair: pair[1].email)

    def user_has_any_membership(self, user_id: UUID) -> bool:
        with self._lock:
            return any(uid == user_id and m.is_active for (_, uid), m in self._members.items())

    def workspace_has_members(self, workspace_id: UUID) -> bool:
        with self._lock:
            return any(ws_id == workspace_id for ws_id, _ in self._members)

    def save_refresh_token(self, record: RefreshTokenRecord) -> None:
        with self._lock:
            self._refresh_tokens[record.token_hash] = record

    def find_refresh_token(self, token_hash: str) -> RefreshTokenRecord | None:
        with self._lock:
            return self._refresh_tokens.get(token_hash)

    def mark_refresh_token_rotated(
        self,
        token_hash: str,
        *,
        replaced_by_hash: str,
        revoked_at: datetime,
    ) -> None:
        with self._lock:
            rec = self._refresh_tokens.get(token_hash)
            if rec is not None:
                self._refresh_tokens[token_hash] = replace(
                    rec,
                    replaced_by_hash=replaced_by_hash,
                    revoked_at=revoked_at,
                )

    def revoke_refresh_token(self, token_hash: str, *, revoked_at: datetime) -> None:
        with self._lock:
            rec = self._refresh_tokens.get(token_hash)
            if rec is not None and rec.revoked_at is None:
                self._refresh_tokens[token_hash] = replace(rec, revoked_at=revoked_at)

    def revoke_token_family(self, family_id: UUID, *, revoked_at: datetime) -> None:
        with self._lock:
            for key, rec in list(self._refresh_tokens.items()):
                if rec.family_id == family_id and rec.revoked_at is None:
                    self._refresh_tokens[key] = replace(rec, revoked_at=revoked_at)

    def record_failed_login(self, key: str, *, occurred_at: datetime) -> int:
        with self._lock:
            entries = self._failed_logins.setdefault(key, [])
            entries.append(occurred_at)
            return len(entries)

    def clear_failed_logins(self, key: str) -> None:
        with self._lock:
            self._failed_logins.pop(key, None)

    def count_recent_failed_logins(self, key: str, *, since: datetime) -> int:
        with self._lock:
            entries = self._failed_logins.get(key, [])
            recent = [ts for ts in entries if ts >= since]
            self._failed_logins[key] = recent
            return len(recent)


@dataclass(frozen=True, slots=True)
class SeededAuthIds:
    """Deterministic UUIDs for NairaBooks seeded Nigerian multi-tenant workspace personas."""

    primary_workspace_id: UUID
    secondary_workspace_id: UUID
    owner_user_id: UUID
    cfo_user_id: UUID
    clerk_user_id: UUID
    cashier_user_id: UUID
    auditor_user_id: UUID


_DEFAULT_PRIMARY_WS_ID = UUID("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0001")
_DEFAULT_OWNER_ID = UUID("bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbb0001")


def create_seeded_demo_auth_store(
    *,
    primary_workspace_id: UUID = _DEFAULT_PRIMARY_WS_ID,
    owner_user_id: UUID = _DEFAULT_OWNER_ID,
    demo_password: str = "NairaBooks#2026",
) -> tuple[InMemoryAuthStore, SeededAuthIds]:
    """Seed two workspaces and five Nigerian RBAC roles (Owner, CFO, Clerk, Cashier, Auditor)."""
    store = InMemoryAuthStore()
    hasher = PasswordHasher()
    pw_hash = hasher.hash_password(demo_password)

    secondary_ws_id = UUID("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0002")
    cfo_id = UUID("bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbb0002")
    clerk_id = UUID("bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbb0003")
    cashier_id = UUID("bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbb0004")
    auditor_id = UUID("bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbb0005")

    store.save_workspace(
        Workspace(
            id=primary_workspace_id,
            name="Lagos Trading & Hospitality Ltd",
            slug="lagos-trading-ltd",
        )
    )
    store.save_workspace(
        Workspace(
            id=secondary_ws_id,
            name="Abuja Clinic & Pharmacy Ltd",
            slug="abuja-clinic-ltd",
        )
    )

    users = [
        (
            owner_user_id,
            "owner@lagostrading.ng",
            "Chief Adewale Okonkwo",
            ActorRole.OWNER_MANAGING_DIRECTOR,
        ),
        (
            cfo_id,
            "cfo@lagostrading.ng",
            "Adaeze Nwosu, FCA",
            ActorRole.CHARTERED_ACCOUNTANT_CFO,
        ),
        (clerk_id, "clerk@lagostrading.ng", "Tunde Bakare", ActorRole.BOOKKEEPER),
        (
            cashier_id,
            "cashier@lagostrading.ng",
            "Chidinma Okafor",
            ActorRole.BRANCH_OUTLET_CASHIER,
        ),
        (
            auditor_id,
            "auditor@icanaudit.ng",
            "Mallam Ibrahim Musa, FCA",
            ActorRole.EXTERNAL_AUDITOR_READONLY,
        ),
    ]
    for uid, email, full_name, role in users:
        store.save_user(
            UserAccount(
                id=uid,
                email=email,
                full_name=full_name,
                password_hash=pw_hash,
            )
        )
        store.save_member(
            WorkspaceMember(
                id=uuid4(),
                workspace_id=primary_workspace_id,
                user_id=uid,
                role=role,
            )
        )

    # Owner also holds membership in secondary tenant workspace for multi-workspace switching tests
    store.save_member(
        WorkspaceMember(
            id=uuid4(),
            workspace_id=secondary_ws_id,
            user_id=owner_user_id,
            role=ActorRole.OWNER_MANAGING_DIRECTOR,
        )
    )

    return store, SeededAuthIds(
        primary_workspace_id=primary_workspace_id,
        secondary_workspace_id=secondary_ws_id,
        owner_user_id=owner_user_id,
        cfo_user_id=cfo_id,
        clerk_user_id=clerk_id,
        cashier_user_id=cashier_id,
        auditor_user_id=auditor_id,
    )
