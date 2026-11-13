# Developer Onboarding & Architecture Orientation Guide (`docs/DEVELOPER_ONBOARDING.md`)

> **15-Minute Technical Onboarding Manual for Engineers and System Architects**  
> *Everything you need to set up your environment, understand code patterns, and make your first verified PR.*

---

## 1. Welcome to NairaBooks Engineering

NairaBooks is structured as a **Modular Monolith** pairing a Python hexagonal domain core (`src/nairabooks/`) with a Next.js App Router frontend (`web/`).

### System Topology at a Glance
- **`src/nairabooks/ledger/`**: Double-entry journal voucher engine, balance sheet, trial balance.
- **`src/nairabooks/tax/`**: Nigeria Tax Act 2025 calculation, 7.5% VAT, and WHT deduction schedules.
- **`src/nairabooks/packs/`**: Composable industry profile engine (Retail, Wholesale, Manufacturing, Construction, Services, Non-Profit).
- **`src/nairabooks/identity/`**: RBAC permissions, Segregation of Duties (CAMA Sec 405), session auth.
- **`src/nairabooks/compliance/`**: NDPA 2023 DSAR JSON exports, user anonymization, 6-year CAMA retention.
- **`web/`**: Next.js 15 App Router, Tailwind CSS, Radix UI, Framer Motion, and WCAG AA tokens.
- **`scripts/`**: DevSecOps automation, SAST scanning, compliance checks, and quality gates.

---

## 2. Setting Up Your Development Environment

```bash
# Verify Python version >= 3.12 and uv
uv --version

# Verify Node.js >= 20 and npm
node --version
npm --version

# Install dependencies
uv sync
npm --prefix web install

# Run the 1-command health check
uv run python scripts/dx_check.py
```

---

## 3. The 3 Golden Commandments for Developers

1. **Rule of Fixed Precision:**
   - Always import `Decimal` and `MONEY_QUANTUM = Decimal("0.01")`.
   - Never use `float` or divide with native `/` without decimal quantization.
2. **Rule of Test-Driven Development (TDD):**
   - Write failing reproduction tests in `tests/` (Python) or `web/src/__tests__/` (Vitest) first.
   - Run tests: `uv run pytest` and `npm --prefix web test`.
3. **Rule of Accessibility & Invariant Defense:**
   - Run `uv run python scripts/run_quality_gate.py` before submitting a PR.
   - Ensure `0` axe violations, `0` ruff errors, and `0` mypy type issues.

---

## 4. Your First Contribution Walkthrough

1. Create a feature branch: `git checkout -b feat/my-new-feature`.
2. Implement your domain logic and tests.
3. Verify test coverage: `uv run pytest tests/test_my_feature.py`.
4. Generate your PR with statutory checklists:
   ```bash
   uv run python scripts/generate_pr.py --type feat --title "feat(reports): add monthly cash flow variance" --branch feat/my-new-feature
   ```
5. Submit your PR and watch the GitHub Actions CI pass with green checks!
