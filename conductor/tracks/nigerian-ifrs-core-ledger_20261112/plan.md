# Implementation Plan: Nigerian IFRS Double-Entry Ledger & FRCN Statements

**Track ID:** `nigerian-ifrs-core-ledger_20261112`
**Spec:** [spec.md](./spec.md)
**Created:** 2026-11-12
**Status:** [x] Completed

## Overview
Implement Layer A (`nairabooks.ledger`) test-first using strict `Red -> Green -> Refactor` TDD.

## Phase 1: Domain Models & Double-Entry Invariants
### Tasks
- [x] Task 1.1: Write failing tests for `Money` (`Decimal`, `NGN`/FX quantization) and balanced voucher validation.
- [x] Task 1.2: Implement `Account`, `FiscalPeriod`, `JournalVoucher`, and `JournalLine` domain invariants.
- [x] Task 1.3: Write tests and implementation for immutable reversals and closed-period posting guards.
### Verification
- [x] All ledger invariant unit tests pass via `uv run pytest`.

## Phase 2: FRCN IFRS Statements & Other National Disclosures
### Tasks
- [x] Task 2.1: Write failing tests for Trial Balance, Statement of Profit or Loss, and Statement of Financial Position aggregation.
- [x] Task 2.2: Write tests and implementation for Statement of Value Added and Five-Year Financial Summary generators.
- [x] Task 2.3: Add bank/POS reconciliation matching and FX revaluation calculation tests and code.
### Verification
- [x] End-to-end sample company closes fiscal year and exports balanced FRCN IFRS schedules.
