# Implementation Plan: Six Flagship Reference Packs + Universal Custom Pack Builder Templates

**Track ID:** `flagship-industry-packs_20261112`
**Spec:** [spec.md](./spec.md)
**Created:** 2026-11-12
**Status:** [x] Completed (Phases 1–3 Complete)

## Overview
Implement operational workflows, posting rules, and UI templates across the 6 Flagship Packs and Universal Composable Builder slice-by-slice.

## Phase 1: Retail, Wholesale & Manufacturing Packs
### Tasks
- [x] Task 1.1: Implement & test **Retail & E-commerce** pack (POS, cash flow, VAT, SKU stock/COGS).
- [x] Task 1.2: Implement & test **Wholesale & Distribution** pack (multi-tier stock, vendor POs, landed shipping costs, margins).
- [x] Task 1.3: Implement & test **Manufacturing (Light / Small Scale)** pack (BOM, assembly orders, raw-material/WIP/finished-goods posting).
### Verification
- [x] E2E transaction tests verify inventory valuation, landed cost, and BOM production journals balance to the kobo.

## Phase 2: Construction, Professional Services & Non-Profit Packs
### Tasks
- [x] Task 2.1: Implement & test **Construction & Trades** pack (job costing per site, subcontractor WHT & retention).
- [x] Task 2.2: Implement & test **Professional Services** pack (time tracking, client billing, reimbursements, CIT status flag).
- [x] Task 2.3: Implement & test **Non-Profit Organizations** pack (restricted/unrestricted funds, donor grants, budget-vs-actual reports).
### Verification
- [x] All 6 Flagship Packs pass IFRS Trial Balance, P&L/Statement of Activities, and Nigerian tax checks.

## Phase 3: Universal Custom / Composable Pack Builder (+ Hospitality & Diner Packs)
### Tasks
- [x] Task 3.1: Build declarative **Universal Pack Builder** UI & API enabling arbitrary module/account/terminology combinations.
- [x] Task 3.2: Verify **Hotel / Hospitality (USALI)** and **Diner / Restaurant** packs (plus a Hybrid Hotel+Diner org) compose cleanly through the builder.
### Verification
- [x] Vitest + React Testing Library E2E & `axe-core` WCAG audits confirm dynamic UI adaptation across all packs and custom builds (full live-browser Playwright suite scheduled in Phase 8).
