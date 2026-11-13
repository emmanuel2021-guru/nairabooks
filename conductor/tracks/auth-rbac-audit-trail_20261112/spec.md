# Specification: Multi-Tenant Auth, RBAC, CAMA Sec 405 Certification & Audit Log

**Track ID:** `auth-rbac-audit-trail_20261112`
**Type:** feature
**Status:** Pending

## 1. Summary
Implement tenant-isolated authentication, role-based access control (RBAC) across accounting and operational roles, CAMA 2020 Section 405 director certification sign-off workflows, and an append-only tamper-evident audit log for every ledger and tax mutation.

## 2. Requirements
1. Multi-tenant isolation: every organization (including multi-branch / multi-entity groups) is scoped by tenant ID at query and permission boundaries.
2. Role-Based Access Control (RBAC): built-in Nigerian accounting roles (`Owner / Managing Director`, `Chartered Accountant / CFO`, `Bookkeeper`, `Branch / Outlet Cashier`, `External Auditor (Read-Only)`).
3. Segregation of Duties: prevent the preparer of a manual journal voucher or payment requisition from unilaterally approving/certifying it when dual-control is enabled.
4. CAMA 2020 Section 405 Certification Workflow: record period lock approvals and statutory financial statement sign-offs with signer name, FRC/ICAN/ANAN registration number, timestamp, and frozen statement snapshot hash.
5. Immutable Audit Log: capture actor, role, tenant, action, before/after `Decimal` payload hash, IP/user-agent metadata, and timestamp without `UPDATE`/`DELETE` privilege on audit entries.

## 3. Acceptance Criteria
- Cross-tenant data access attempts fail deterministically in authorization and GraphQL resolver tests.
- External Auditor role has read-only access to ledger, FRCN schedules, and audit log while being denied posting or pack mutation privileges.
- CAMA Sec 405 sign-off captures immutable certification metadata linked to closed fiscal periods.
- All audit trail invariants follow strict `Red -> Green -> Refactor` TDD tests.

## 4. Linked PRD Items
- `F-01` (Immutable Double-Entry Ledger), `F-03` (FRCN & CAMA 2020 Sign-Off), `F-10` (Multi-User RBAC & Tamper-Evident Audit Log)
