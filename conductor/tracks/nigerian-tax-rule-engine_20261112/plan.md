# Implementation Plan: Effective-Dated Nigerian Tax Rule Engine

**Track ID:** `nigerian-tax-rule-engine_20261112`
**Spec:** [spec.md](./spec.md)
**Created:** 2026-11-12
**Status:** [x] Completed

## Overview
Build `nairabooks.tax` using effective-dated statutory rule tables and strict TDD covering edge cases.

## Phase 1: Statutory Rule Model & Small-Company Classifier
### Tasks
- [x] Task 1.1: Write failing tests for Tax Act 2025 small-company eligibility (`₦100M` turnover / `₦250M` fixed assets + professional services & NGO rules).
- [x] Task 1.2: Implement `TaxRuleSet` effective-date lookup and entity tax profile evaluator.
### Verification
- [x] Threshold radar accurately triggers alerts near `₦100M` turnover and excludes professional service firms.

## Phase 2: VAT, 2024 WHT, State Levies & NRS Payload
### Tasks
- [x] Task 2.1: Write failing tests for 2024 WHT rates (`2%`/`5%`/`10%`), TIN penalty rules, and `₦2M` monthly threshold.
- [x] Task 2.2: Implement multi-layer indirect tax calculator (`VAT 7.5%` + State Consumption + Fiduciary Service Charge) and NRS `TaxSubtotal` payload builder.
### Verification
- [x] All VAT, WHT, and multi-state tax posting tests pass and balance to the kobo (`Decimal("0.01")`).
