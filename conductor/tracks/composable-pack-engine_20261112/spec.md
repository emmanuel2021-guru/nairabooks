# Specification: Two-Layer Declarative Industry Profile & Hybrid Pack Composer

**Track ID:** `composable-pack-engine_20261112`
**Type:** Feature
**Created:** 2026-11-12
**Status:** Draft

## Summary
Build Layer B of `NairaBooks`: a declarative, data-driven Industry Profile & Capability Engine that tailors Chart of Accounts, tax defaults, operational primitives, UI terminology, and KPIs to any business type—including hybrid multi-unit entities.

## Context
Addresses `F-09` and `ADR-003` / `ADR-004` in `docs/PRD.md` and `docs/DECISIONS.md`.

## User Story
As a business owner running any kind of enterprise (or combining multiple business units like retail + light manufacturing, or hotel + restaurant), I want `NairaBooks` to dynamically assemble the exact modules, accounts, terms, and dashboards my business needs without overwhelming me with irrelevant tools.

## Acceptance Criteria
- [ ] Declarative `IndustryPack` schema composes 6 sections: `coa_accounts`, `tax_profile`, `operational_primitives`, `vocabulary_overrides`, `dimensions`, and `kpi_definitions`.
- [ ] Supports reusable operational primitives (`pos_cashflow`, `multi_tier_inventory`, `bom_production`, `job_costing`, `time_expense_billing`, `fund_grant_accounting`, `folio_room_usali`, `table_recipe_pos`, `fleet_trip_costing`).
- [ ] Supports **Hybrid Multi-Unit Composition** (combining 2+ packs per branch/department without account-code collisions or broken IFRS mapping).
- [ ] Powers the **Universal Custom / Composable Pack Builder** so non-flagship industries (Hotels/Hospitality, Diners/Restaurants, Healthcare, Logistics, Agro, Education, etc.) can be generated declaratively.

## Dependencies
Depends on `nigerian-ifrs-core-ledger_20261112` and `nigerian-tax-rule-engine_20261112`.

## Out of Scope
- Specific domain data templates for the 6 Flagship Packs (built in `flagship-industry-packs_20261112`).

## Technical Notes
Validate composed packs deterministically with `pydantic` schemas and conflict checks (e.g., duplicate account codes or missing IFRS statement mappings).
