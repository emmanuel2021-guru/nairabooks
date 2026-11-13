# Tech Stack (`conductor/tech-stack.md`)

Compiled from **Skills Decision Wizard** choices (`wizard-selection.json`) and verified **Phase 0** local toolchain (`scripts/dx_check.py`).

## Backend & Core Accounting / IFRS / Composable Engine
- **Language & Runtime:** Python `>= 3.11` (verified local `Python 3.11.0`)
- **Package & Environment Manager:** `uv` (verified local `uv 0.12.9`)
- **Validation & Settings:** `pydantic` & `pydantic-settings` (strict decimal/money validation, zero floating-point money math — `Decimal` everywhere!)
- **API Layer:** GraphQL API + Node/TypeScript or Python service boundary *(exact GraphQL server & BFF architecture locked in Phase 3)*

## Frontend & Design System
- **Framework:** Next.js (App Router) + React + TypeScript (verified local `Node v24.14.1`, `npm 11.11.0`)
- **Styling & Accessibility:** Tailwind Design System + WCAG AA & Screen-Reader verified components *(Phase 5)*

## Database & Migrations
- **Database:** PostgreSQL (verified local `PostgreSQL 18.3`)
- **Migrations:** Zero-downtime SQL migrations & migration observability *(Phase 4)*

## Testing, Quality & Security Tooling
- **Python Testing & Lint (Phase 2+):** `pytest`, `ruff`, `mypy`
- **JS/TS & E2E Testing (Phase 8):** Jest/Vitest, API Mocks, Playwright E2E, Visual QA
- **Security & Compliance (Phase 3 & 9):** STRIDE Threat Modeling, SAST, Secrets Management, Dependency Audit, GDPR/NDPA Compliance Check
- **Infrastructure / Git (Phase 10):** Local Git + GitHub PR workflow, `git` `2.53.0`, Docker Compose `v5.6.0` (optional local Postgres dev container)
