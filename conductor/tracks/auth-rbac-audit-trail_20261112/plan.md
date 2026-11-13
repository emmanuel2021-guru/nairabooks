# Implementation Plan: Multi-Tenant Auth, RBAC, CAMA Sec 405 Certification & Audit Log

**Track ID:** `auth-rbac-audit-trail_20261112`
**Spec:** [spec.md](./spec.md)
**Created:** 2026-11-12
**Status:** [ ] Not Started

## Overview
Implement `nairabooks.auth` and `nairabooks.audit` test-first using strict `Red -> Green -> Refactor` TDD, aligned with Phase 3 Threat Modeling (`N3_E`) and Phase 7 Auth/RBAC (`N7_A1`).

## Phase 1: Tenant Context, RBAC Policies & Password/Session Core
### Tasks
- [x] Task 1.1: Write failing tests for tenant isolation guards, RBAC role permissions matrix, and segregation-of-duties checks.
- [x] Task 1.2: Implement password hashing (`argon2`/`scrypt` policy), short-lived token issuance/rotation, and tenant-scoped RBAC policy evaluator.
### Verification
- [ ] Authorization, segregation-of-duties, and cross-tenant isolation tests pass via `uv run pytest`.

## Phase 2: CAMA 2020 Sec 405 Sign-Off & Immutable Audit Log
### Tasks
- [x] Task 2.1: Write failing tests for append-only hash-chained audit events and unauthorized mutation rejection.
- [x] Task 2.2: Implement CAMA Sec 405 statutory period certification records and audit trail verification helpers.
### Verification
- [ ] End-to-end audit chain integrity and auditor read-only role checks pass.
