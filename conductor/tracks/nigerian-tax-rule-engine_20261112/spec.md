# Specification: Effective-Dated Nigerian Tax Rule Engine

**Track ID:** `nigerian-tax-rule-engine_20261112`
**Type:** Feature
**Created:** 2026-11-12
**Status:** Draft

## Summary
Implement an effective-dated, jurisdiction-aware Nigerian tax calculation and reporting engine covering the Nigeria Tax Act 2025, 2024 WHT Regulations, `7.5%` Federal VAT / NRS e-invoice structure, and state-level consumption levies.

## Context
Addresses `F-02`, `F-06`, `F-07`, and `F-08` in `docs/PRD.md` plus `ADR-003`.

## User Story
As a Nigerian business owner or finance manager, I want `NairaBooks` to automatically apply the exact VAT, WHT, small-company CIT exemption, and state levy rules for my entity type, turnover size, and transaction category so I remain compliant without manual spreadsheets.

## Acceptance Criteria
- [ ] Evaluates **Nigeria Tax Act 2025** small-company eligibility (`turnover <= ₦100M` and `fixed_assets <= ₦250M`), automatically disabling exemption for **Professional Services** and handling Non-Profit tax exemptions cleanly.
- [ ] Calculates **2024 WHT Regulations** rates (`2%`/`5%`/`10%`) by transaction type, resident/non-resident corporate/individual status, supplier **TIN** check (flagging/applying punitive rule when TIN missing), and `₦25M`/`₦2M` small-entity deduction check without reducing the VAT base.
- [ ] Supports concurrent multi-layer indirect taxes (Federal `7.5%` VAT + State Consumption Taxes like Lagos `5%` LIRS + fiduciary Service Charge clearing) routed to separate liability accounts.
- [ ] Outputs NRS e-invoice ready `TaxSubtotal` breakdowns separating VAT, WHT, and non-federal state levies.

## Dependencies
Depends on `nigerian-ifrs-core-ledger_20261112`.

## Out of Scope
- Direct live network submission credentials for third-party NRS aggregators (structured payload + adapter interface included; live credentials configured in deployment).

## Technical Notes
Rules must be data-driven and effective-dated (`effective_from`, `effective_to`, `jurisdiction`) so statutory updates never require core ledger changes.
