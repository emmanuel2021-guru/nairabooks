# Specification: Nigerian IFRS Double-Entry Ledger & FRCN Statements

**Track ID:** `nigerian-ifrs-core-ledger_20261112`
**Type:** Feature
**Created:** 2026-11-12
**Status:** Draft

## Summary
Build `NairaBooks`'s immutable double-entry General Ledger core with `NGN` + multi-currency FX support, fiscal period controls, and native FRCN IFRS / IFRS for SMEs financial statements including mandatory Nigerian Other National Disclosures.

## Context
Addresses `F-01` and `F-02` in `docs/PRD.md`. Serves as Layer A in `ADR-003` so every industry workflow posts verified, balanced accounting entries.

## User Story
As a Nigerian business owner or ICAN/ANAN accountant, I want every operational sale, bill, payment, and adjustment to automatically produce balanced IFRS journal entries and audit-ready Nigerian financial statements so I never have to manually rebuild reports in Excel.

## Acceptance Criteria
- [ ] Every posted journal voucher enforces `sum(debits) == sum(credits)` in both transaction and functional (`NGN`) currencies using fixed-precision `Decimal`.
- [ ] Posted entries are immutable; corrections happen strictly through reversing or adjusting vouchers with full user/timestamp audit links.
- [ ] Supports Full IFRS and IFRS for SMEs statement groupings (`Assets`, `Liabilities`, `Equity`, `Revenue`, `Expenses`, `OCI`) plus Trial Balance, Statement of Profit or Loss, Statement of Financial Position, Statement of Cash Flows, and Nigerian **Other National Disclosures** (*Statement of Value Added* and *Five-Year Financial Summary*).
- [ ] Supports closed fiscal periods, FX spot/revaluation rates, and bank/POS reconciliation batches.

## Dependencies
None (foundational accounting core; executed after Phase 3 Architecture and Phase 4 Database design).

## Out of Scope
- Tax rate computation logic (handled in `nigerian-tax-rule-engine_20261112`).
- Industry-specific operational modules (handled in `composable-pack-engine_20261112` and `flagship-industry-packs_20261112`).

## Technical Notes
Enforce double-entry invariants both in domain service code and PostgreSQL constraints/triggers (`Phase 4`).
