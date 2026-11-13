# Specification: Six Flagship Reference Packs + Universal Custom Pack Builder Templates

**Track ID:** `flagship-industry-packs_20261112`
**Type:** Feature
**Created:** 2026-11-12
**Status:** Implemented (Phases 1–3 Complete)

## Summary
Deliver the 6 Flagship Reference Packs (*Retail & E-commerce*, *Wholesale & Distribution*, *Manufacturing Light/Small Scale*, *Construction & Trades*, *Professional Services*, *Non-Profit Organizations*) plus reusable templates for the **Universal Custom/Composable Pack Builder** (including *Hotel/Hospitality (USALI)* and *Diner/Restaurant* packs) and their UI workflows.

## Context
Addresses `F-03` through `F-09` in `docs/PRD.md` and `ADR-004`.

## User Story
As a Nigerian founder or finance operator in retail, wholesale, light manufacturing, construction, professional services, non-profit, hospitality, or food service, I want my accounting workspace to feel purpose-built for my exact daily operations while generating compliant Nigerian IFRS statements.

## Acceptance Criteria
- [x] **Retail & E-commerce:** POS transactions, daily cash flows, VAT compliance, SKU stock/COGS levels.
- [x] **Wholesale & Distribution:** Multi-tier inventory, vendor POs, shipping/landed cost allocation, margin tracking.
- [x] **Manufacturing (Light / Small Scale):** BOM definitions, assembly work orders, raw material -> WIP -> finished goods production accounting.
- [x] **Construction & Trades:** Job costing per project/site, material issues, subcontractor progress payments with `2%`/`5%` WHT & retention.
- [x] **Professional Services:** Time tracking, client milestone/retainer billing, expense reimbursements, WHT receivable tracking, non-exempt CIT notice.
- [x] **Non-Profit Organizations:** Restricted vs. unrestricted fund accounting, donor/grant tracking, budget-vs-actual reporting.
- [x] **Universal Custom/Composable Pack Builder:** Interactive pack builder UI + declarative templates covering Hotels/Hospitality (USALI, rooms, service charge, state consumption tax), Diners/Restaurants (tables, recipe COGS, spoilage), and custom business compositions.

## Dependencies
Depends on `composable-pack-engine_20261112`.

## Out of Scope
- External third-party marketplace POS hardware drivers (v1 supports web POS/CSV/manual & API ingestion).

## Technical Notes
Every pack must ship with deterministic accounting posting rules and end-to-end sample transaction fixtures tested against Nigerian IFRS reports.
