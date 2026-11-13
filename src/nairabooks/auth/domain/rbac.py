"""RBAC role-permission matrix, tenant boundary guard, and Segregation of Duties."""

from __future__ import annotations

from collections.abc import Sequence
from uuid import UUID

from nairabooks.auth.domain.errors import AuthorizationError
from nairabooks.auth.domain.models import ActorRole, AuthenticatedContext, Permission
from nairabooks.ledger.domain.errors import (
    CrossTenantAccessError,
    SegregationOfDutiesError,
)

ALL_PERMISSIONS: frozenset[Permission] = frozenset(Permission)

ROLE_PERMISSIONS: dict[ActorRole, frozenset[Permission]] = {
    ActorRole.OWNER_MANAGING_DIRECTOR: ALL_PERMISSIONS,
    ActorRole.CHARTERED_ACCOUNTANT_CFO: frozenset(
        {
            Permission.LEDGER_READ,
            Permission.LEDGER_POST_VOUCHER,
            Permission.LEDGER_APPROVE_VOUCHER,
            Permission.LEDGER_REVERSE_VOUCHER,
            Permission.LEDGER_RECONCILE,
            Permission.FRCN_REPORTS_READ,
            Permission.TAX_READ,
            Permission.TAX_MANAGE,
            Permission.PACKS_READ,
            Permission.PACKS_CONFIGURE,
            Permission.CAMA_CERTIFY_PERIOD,
            Permission.AUDIT_READ,
        }
    ),
    ActorRole.BOOKKEEPER: frozenset(
        {
            Permission.LEDGER_READ,
            Permission.LEDGER_POST_VOUCHER,
            Permission.LEDGER_RECONCILE,
            Permission.FRCN_REPORTS_READ,
            Permission.TAX_READ,
            Permission.PACKS_READ,
        }
    ),
    ActorRole.BRANCH_OUTLET_CASHIER: frozenset(
        {
            Permission.LEDGER_READ,
            Permission.LEDGER_POST_VOUCHER,
            Permission.TAX_READ,
            Permission.PACKS_READ,
        }
    ),
    ActorRole.EXTERNAL_AUDITOR_READONLY: frozenset(
        {
            Permission.LEDGER_READ,
            Permission.FRCN_REPORTS_READ,
            Permission.TAX_READ,
            Permission.PACKS_READ,
            Permission.AUDIT_READ,
        }
    ),
}


def permissions_for_role(role: ActorRole) -> frozenset[Permission]:
    """Return immutable set of permissions granted to a Nigerian accounting role."""
    return ROLE_PERMISSIONS[role]


def has_permission(role: ActorRole, permission: Permission) -> bool:
    """Return True if role grants permission."""
    return permission in ROLE_PERMISSIONS[role]


def require_permission(ctx: AuthenticatedContext, permission: Permission) -> None:
    """Enforce fine-grained RBAC permission; raise AuthorizationError if denied."""
    if not has_permission(ctx.role, permission):
        allowed_roles = [
            r.value for r, perms in ROLE_PERMISSIONS.items() if permission in perms
        ]
        raise AuthorizationError(
            f"Role '{ctx.role.value}' is not permitted to perform '{permission.value}'.",
            required_roles=allowed_roles,
            actor_role=ctx.role.value,
        )


def require_roles(ctx: AuthenticatedContext, allowed: Sequence[ActorRole]) -> None:
    """Enforce explicit GraphQL @requireRole role list."""
    if ctx.role not in allowed:
        allowed_str = ", ".join(r.value for r in allowed)
        raise AuthorizationError(
            f"Role '{ctx.role.value}' lacks required privilege ({allowed_str}).",
            required_roles=[r.value for r in allowed],
            actor_role=ctx.role.value,
        )


def enforce_tenant_isolation(
    ctx: AuthenticatedContext,
    requested_workspace_id: UUID | None,
) -> UUID:
    """Guarantee tenant boundary: reject spoofed or cross-tenant workspace references."""
    if requested_workspace_id is not None and requested_workspace_id != ctx.workspace_id:
        raise CrossTenantAccessError(
            "Cross-tenant access denied: requested workspace does not match authenticated session."
        )
    return ctx.workspace_id


def enforce_segregation_of_duties(
    *,
    actor_user_id: UUID,
    creator_user_id: UUID | None,
    action: str,
) -> None:
    """Block unilateral self-approval/certification when dual-control applies (SEC-REQ-06)."""
    if creator_user_id is not None and actor_user_id == creator_user_id:
        raise SegregationOfDutiesError(
            f"Segregation of duties violation on '{action}': "
            "approver/certifier must differ from preparer."
        )
