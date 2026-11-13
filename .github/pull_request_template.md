## 📌 Pull Request Overview

### 1. Type of Change
- [ ] `feat`: New feature or business capability
- [ ] `fix`: Bug fix or calculation correction
- [ ] `refactor`: Code cleanup with zero behavioral change
- [ ] `perf`: Performance optimization or throughput enhancement
- [ ] `docs`: Documentation, legal terms, or specification updates
- [ ] `test`: Unit, integration, or E2E test suites

### 2. Plain-English Summary (For Business Owners & Non-Developers)
*Describe what changed and what users or accountants will experience in everyday words.*

---

## 🏛️ Nigerian Statutory, IFRS & Accounting Invariants
- [ ] **Zero Float Invariant:** All financial math uses Python `Decimal` (`MONEY_QUANTUM = Decimal("0.01")`) or TypeScript `BigInt` kobo. Zero binary floating-point math.
- [ ] **Double-Entry Balance:** Every posted journal entry satisfies `sum(debits) == sum(credits)`.
- [ ] **Nigerian Tax Act 2025:** Effective-dated CIT thresholds and professional-services exclusions respected.
- [ ] **Statutory Taxes:** 7.5% VAT (2010), WHT (1150/2130), and State Consumption Levies cleanly isolated.
- [ ] **CAMA 2020 Section 405:** Segregation of Duties preserved (`preparedByUserId != certifiedByUserId`).
- [ ] **Tenant Privacy (RLS):** All database operations scoped by `X-Workspace-Id` with zero cross-tenant leak.

---

## 🧪 Verification & Automated Test Evidence
Please attach command outcomes from the local quality gate:
- [ ] `uv run pytest -q` passed (attach count: `___ passed`)
- [ ] `uv run ruff check src tests` passed cleanly
- [ ] `uv run mypy src tests` passed with 0 issues
- [ ] `npm --prefix web run typecheck` passed (0 errors)
- [ ] `npm --prefix web test` passed (0 axe-core accessibility violations)
- [ ] `uv run python scripts/run_sast_scan.py` passed (0 vulnerabilities)
- [ ] `uv run python scripts/compliance_check.py` passed (100% compliant)
- [ ] `uv run python scripts/verify_workflow.py --project .` passed (100% skill coverage)

---

## ♿ WCAG 2.2 Level AA Accessibility
- [ ] All interactive buttons and links meet the minimum 44x44px touch target size.
- [ ] Color contrast meets `>= 4.5:1` normal text / `>= 3.0:1` bold and UI components.
- [ ] Screen-reader announcements (`aria-live="polite"`) configured for dynamic ledger totals.
