# NairaBooks

**NairaBooks** is a Nigerian-first, IFRS-compliant double-entry accounting and composable business operations platform engineered around a Two-Layer Architecture:

- **Layer A — Immutable Nigerian IFRS & Tax Core (`nairabooks`)**: `Decimal`-strict double-entry ledger, `NGN` + multi-currency FX reporting, FRCN *Other National Disclosures* (Statement of Value Added & Five-Year Financial Summary), CAMA 2020 Section 405 certification, and effective-dated Nigeria Tax Act 2025 / 2024 WHT / VAT/NRS / State Consumption Tax rules.
- **Layer B — Composable Industry Pack Engine**:
  - **6 Flagship Reference Packs**: Retail & E-commerce, Wholesale & Distribution, Manufacturing (Light / Small Scale), Construction & Trades, Professional Services, and Non-Profit Organizations.
  - **Universal Custom / Composable Pack Builder**: Mix and configure modules dynamically for Hospitality/Hotels (USALI), Diners/Restaurants, Healthcare, Logistics, and hybrid multi-unit entities.

> **Architecture (2026-11-23):** the running product is the Next.js app in `web/`. Its server code
> (`web/src/lib/*-bff.ts`) is the only ledger/auth/tax/packs implementation, and it stores data in
> Postgres via `DATABASE_URL` (Neon in production). The Python package `src/nairabooks` is a
> **retired reference specification**: it is not deployed and nothing calls it.

> **What works today and what doesn't:** see [`docs/CAPABILITIES.md`](docs/CAPABILITIES.md).

## Python reference package (`uv` + Python 3.11+)

```bash
uv sync
uv run pytest -v
uv run ruff check .
uv run mypy src tests
python scripts/validate_conductor.py --list
python scripts/verify_workflow.py --project .
```

## Project Documentation & Workflow Navigation

- [Product Requirements Document](./docs/PRD.md)
- [System Architecture](./docs/ARCHITECTURE.md)
- [Master Workflow Plan](./docs/WORKFLOW_PLAN.md)
- [Conductor Context Hub](./conductor/index.md)
- [Living State](./docs/STATE.md)
