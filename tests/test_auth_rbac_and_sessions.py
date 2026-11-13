"""TDD tests for multi-tenant auth, password/token lifecycle, RBAC, and SoD (Track 5 Phase 1)."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from uuid import UUID, uuid4

import pytest

from nairabooks.auth.adapters.in_memory import (
    InMemoryAuthStore,
    create_seeded_demo_auth_store,
)
from nairabooks.auth.application import (
    LoginCommand,
    LoginUseCase,
    LogoutUseCase,
    RefreshSessionUseCase,
    ResolveAuthContextUseCase,
    SwitchWorkspaceUseCase,
)
from nairabooks.auth.domain import (
    ActorRole,
    AuthenticationError,
    AuthorizationError,
    PasswordHasher,
    Permission,
    RateLimitExceededError,
    TokenService,
    enforce_segregation_of_duties,
    enforce_tenant_isolation,
    has_permission,
    require_permission,
    validate_password_strength,
)
from nairabooks.ledger.domain import (
    CrossTenantAccessError,
    SegregationOfDutiesError,
    ValidationError,
)


def test_password_strength_and_scrypt_hashing() -> None:
    with pytest.raises(ValidationError, match="12"):
        validate_password_strength("Short1!")
    with pytest.raises(ValidationError, match="uppercase"):
        validate_password_strength("alllowercase123!")
    with pytest.raises(ValidationError, match="special"):
        validate_password_strength("NoSpecialChar123")

    hasher = PasswordHasher()
    hashed = hasher.hash_password("NairaBooks#2026")
    assert hashed.startswith("$scrypt$")
    assert len(hashed) >= 32
    assert hasher.verify_password("NairaBooks#2026", hashed) is True
    assert hasher.verify_password("WrongPass#2026", hashed) is False


def test_token_issuance_expiry_tamper_and_refresh_rotation_reuse_detection() -> None:
    store = InMemoryAuthStore()
    now = datetime(2026, 11, 12, 10, 0, tzinfo=UTC)
    clock = [now]
    tokens = TokenService(secret="test-secret-key-min-32-bytes-long-001", now_fn=lambda: clock[0])

    user_id = uuid4()
    workspace_id = uuid4()
    session_id = uuid4()

    pair1 = tokens.issue_token_pair(
        user_id=user_id,
        workspace_id=workspace_id,
        role=ActorRole.CHARTERED_ACCOUNTANT_CFO,
        session_id=session_id,
    )
    claims = tokens.verify_access_token(pair1.access_token)
    assert claims.user_id == user_id
    assert claims.workspace_id == workspace_id
    assert claims.role is ActorRole.CHARTERED_ACCOUNTANT_CFO

    # Tampered signature rejected
    tampered = pair1.access_token[:-4] + "ABCD"
    with pytest.raises(AuthenticationError):
        tokens.verify_access_token(tampered)

    # Expired token rejected after 16 minutes
    clock[0] = now + timedelta(minutes=16)
    with pytest.raises(AuthenticationError, match="expired"):
        tokens.verify_access_token(pair1.access_token)

    # Refresh rotation works before refresh expiry
    clock[0] = now + timedelta(minutes=10)
    store.save_refresh_token(pair1.refresh_record)
    refresh_uc = RefreshSessionUseCase(store=store, token_service=tokens)
    # Seed user + membership so refresh confirms active account & role
    from nairabooks.auth.domain import UserAccount, Workspace, WorkspaceMember

    store.save_workspace(Workspace(id=workspace_id, name="Test Co", slug="test-co"))
    store.save_user(
        UserAccount(
            id=user_id,
            email="cfo@test.ng",
            full_name="Adaeze CFO",
            password_hash=PasswordHasher().hash_password("StrongPass#2026"),
        )
    )
    store.save_member(
        WorkspaceMember(
            id=uuid4(),
            workspace_id=workspace_id,
            user_id=user_id,
            role=ActorRole.CHARTERED_ACCOUNTANT_CFO,
        )
    )

    pair2 = refresh_uc.execute(pair1.refresh_token)
    assert pair2.refresh_token != pair1.refresh_token
    assert tokens.verify_access_token(pair2.access_token).user_id == user_id

    # Reusing already-rotated refresh_token triggers family revocation!
    with pytest.raises(AuthenticationError, match="revoked|reused|Invalid"):
        refresh_uc.execute(pair1.refresh_token)

    # Even the newer pair2 from the compromised family is now revoked
    with pytest.raises(AuthenticationError):
        refresh_uc.execute(pair2.refresh_token)


def test_rbac_matrix_for_owner_accountant_clerk_cashier_and_auditor() -> None:
    # Owner & Accountant/CFO
    assert has_permission(ActorRole.OWNER_MANAGING_DIRECTOR, Permission.MEMBERS_MANAGE)
    assert has_permission(ActorRole.OWNER_MANAGING_DIRECTOR, Permission.CAMA_CERTIFY_PERIOD)
    assert has_permission(ActorRole.CHARTERED_ACCOUNTANT_CFO, Permission.LEDGER_REVERSE_VOUCHER)
    assert has_permission(ActorRole.CHARTERED_ACCOUNTANT_CFO, Permission.CAMA_CERTIFY_PERIOD)
    assert has_permission(ActorRole.CHARTERED_ACCOUNTANT_CFO, Permission.AUDIT_READ)

    # Clerk / Bookkeeper
    assert has_permission(ActorRole.BOOKKEEPER, Permission.LEDGER_POST_VOUCHER)
    assert has_permission(ActorRole.BOOKKEEPER, Permission.LEDGER_RECONCILE)
    assert has_permission(ActorRole.BOOKKEEPER, Permission.FRCN_REPORTS_READ)
    assert not has_permission(ActorRole.BOOKKEEPER, Permission.LEDGER_REVERSE_VOUCHER)
    assert not has_permission(ActorRole.BOOKKEEPER, Permission.PACKS_CONFIGURE)
    assert not has_permission(ActorRole.BOOKKEEPER, Permission.TAX_MANAGE)
    assert not has_permission(ActorRole.BOOKKEEPER, Permission.CAMA_CERTIFY_PERIOD)
    assert not has_permission(ActorRole.BOOKKEEPER, Permission.AUDIT_READ)

    # Cashier
    assert has_permission(ActorRole.BRANCH_OUTLET_CASHIER, Permission.LEDGER_POST_VOUCHER)
    assert not has_permission(ActorRole.BRANCH_OUTLET_CASHIER, Permission.FRCN_REPORTS_READ)
    assert not has_permission(ActorRole.BRANCH_OUTLET_CASHIER, Permission.LEDGER_RECONCILE)
    assert not has_permission(ActorRole.BRANCH_OUTLET_CASHIER, Permission.AUDIT_READ)

    # External Auditor (strictly read-only)
    assert has_permission(ActorRole.EXTERNAL_AUDITOR_READONLY, Permission.LEDGER_READ)
    assert has_permission(ActorRole.EXTERNAL_AUDITOR_READONLY, Permission.FRCN_REPORTS_READ)
    assert has_permission(ActorRole.EXTERNAL_AUDITOR_READONLY, Permission.AUDIT_READ)
    for write_perm in (
        Permission.LEDGER_POST_VOUCHER,
        Permission.LEDGER_REVERSE_VOUCHER,
        Permission.LEDGER_RECONCILE,
        Permission.TAX_MANAGE,
        Permission.PACKS_CONFIGURE,
        Permission.CAMA_CERTIFY_PERIOD,
        Permission.MEMBERS_MANAGE,
    ):
        assert not has_permission(ActorRole.EXTERNAL_AUDITOR_READONLY, write_perm)


def test_tenant_isolation_workspace_switch_login_rate_limit_and_sod() -> None:
    store, seeded = create_seeded_demo_auth_store()
    tokens = TokenService(secret="test-secret-key-min-32-bytes-long-002")
    login_uc = LoginUseCase(store=store, token_service=tokens)
    resolve_uc = ResolveAuthContextUseCase(store=store, token_service=tokens)
    switch_uc = SwitchWorkspaceUseCase(store=store, token_service=tokens)
    logout_uc = LogoutUseCase(store=store)

    # Login as Bookkeeper / Clerk
    clerk_session = login_uc.execute(
        LoginCommand(
            email="clerk@lagostrading.ng",
            password="NairaBooks#2026",
            ip_address="127.0.0.1",
        )
    )
    assert clerk_session.context.role is ActorRole.BOOKKEEPER
    assert clerk_session.context.workspace_id == seeded.primary_workspace_id

    # Resolving token with matching or omitted workspace succeeds
    ctx = resolve_uc.execute(clerk_session.access_token)
    assert enforce_tenant_isolation(ctx, seeded.primary_workspace_id) == seeded.primary_workspace_id

    # Cross-tenant spoof attempt rejected
    with pytest.raises(CrossTenantAccessError):
        enforce_tenant_isolation(ctx, seeded.secondary_workspace_id)

    # Clerk is NOT a member of secondary workspace -> switch denied
    with pytest.raises(CrossTenantAccessError):
        switch_uc.execute(ctx=ctx, target_workspace_id=seeded.secondary_workspace_id)

    # RBAC check throws AuthorizationError for Clerk trying to certify CAMA Sec 405
    with pytest.raises(AuthorizationError):
        require_permission(ctx, Permission.CAMA_CERTIFY_PERIOD)

    # Segregation of Duties blocks self-approval
    with pytest.raises(SegregationOfDutiesError):
        enforce_segregation_of_duties(
            actor_user_id=ctx.user_id,
            creator_user_id=ctx.user_id,
            action="certifyCamaSec405",
        )

    # Logout revokes refresh token
    logout_uc.execute(clerk_session.refresh_token)
    refresh_uc = RefreshSessionUseCase(store=store, token_service=tokens)
    with pytest.raises(AuthenticationError):
        refresh_uc.execute(clerk_session.refresh_token)

    # Rate limit after repeated failed login attempts
    for _ in range(5):
        with pytest.raises(AuthenticationError):
            login_uc.execute(
                LoginCommand(
                    email="owner@lagostrading.ng",
                    password="WrongPassword#1",
                    ip_address="10.0.0.5",
                )
            )
    with pytest.raises(RateLimitExceededError):
        login_uc.execute(
            LoginCommand(
                email="owner@lagostrading.ng",
                password="WrongPassword#1",
                ip_address="10.0.0.5",
            )
        )
    # Different workspace switch works for Owner who belongs to both
    owner_session = login_uc.execute(
        LoginCommand(
            email="owner@lagostrading.ng",
            password="NairaBooks#2026",
            ip_address="127.0.0.2",
        )
    )
    switched = switch_uc.execute(
        ctx=owner_session.context,
        target_workspace_id=seeded.secondary_workspace_id,
    )
    assert switched.context.workspace_id == seeded.secondary_workspace_id
    assert UUID(str(switched.context.workspace_id)) == seeded.secondary_workspace_id
