# feat(core): Enterprise Quality, Security Hardening & Regulatory Engine

## 📌 Pull Request Overview
- **Branch:** `main` -> `main`
- **Generated:** 2026-11-12 23:07:39 UTC
- **Type:** `feat`

### Plain-English Summary
Comprehensive quality gate, SAST security scanner, HTTP hardening, and NDPA 2023 / CAMA 2020 compliance suite.

### Recent Commits in this Slice
- *(Working tree snapshot)*

---

## 🏛️ Statutory, IFRS & Accounting Invariants
- [x] **Zero Float Invariant:** Python `Decimal` (`MONEY_QUANTUM`) and TypeScript `BigInt` kobo exclusively.
- [x] **Double-Entry Balance:** All posted journal vouchers strictly balance (`sum(debits) == sum(credits)`).
- [x] **Nigeria Tax Act 2025:** Effective-dated CIT thresholds and professional services exclusions upheld.
- [x] **Tax Segregation:** 7.5% VAT, 2%/5%/10% WHT, and State Consumption Levies isolated to statutory accounts.
- [x] **CAMA 2020 Section 405:** Segregation of Duties preserved (`preparedByUserId != certifiedByUserId`).
- [x] **Tenant Privacy (RLS):** All queries scoped by `X-Workspace-Id` with zero cross-tenant leakage.

---

## 🧪 Verification & Quality Gate Evidence
- [x] **Python Pytest:** All tests passing (`uv run pytest -q`)
- [x] **Python Code Linter:** Clean (`uv run ruff check src tests`)
- [x] **Python Typecheck:** 0 issues (`uv run mypy src tests`)
- [x] **Frontend TypeScript:** 0 errors (`npm --prefix web run typecheck`)
- [x] **Frontend Vitest & A11y:** All tests passing with **0 axe-core accessibility violations**
- [x] **Static Security Testing (SAST):** 0 vulnerabilities detected (`uv run python scripts/run_sast_scan.py`)
- [x] **Regulatory Compliance Audit:** 100% of NDPA, CAMA 2020, and Tax Act 2025 checks passed
- [x] **Antigravity Skill Coverage:** 100% wizard skill coverage audited (`python scripts/verify_workflow.py`)

---

## ♿ WCAG 2.2 Level AA Accessibility Checklist
- [x] Touch targets exceed 44x44px.
- [x] Color contrast ratios exceed WCAG AA thresholds (`>= 4.5:1`).
- [x] Screen-reader announcements (`aria-live="polite"`) configured for balance calculations.
