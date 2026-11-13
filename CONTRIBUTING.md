# Contributor Guidelines & Code of Conduct (`CONTRIBUTING.md`)

Welcome to the **NairaBooks** engineering community! We build high-integrity, zero-jargon accounting and business software for the Nigerian enterprise ecosystem.

---

## 1. Fast-Track Developer Onboarding (15 Minutes)

### Prerequisites
- Python 3.12+ and `uv` (Ultra-fast Python package installer)
- Node.js 20+ and `npm`
- Git

### Quickstart Commands
```bash
# 1. Clone repository
git clone https://github.com/nairabooks/nairabooks.git
cd nairabooks

# 2. Install Python dependencies and pre-flight tools
uv sync

# 3. Install Next.js frontend dependencies
npm --prefix web install

# 4. Run automated pre-flight health check
uv run python scripts/dx_check.py

# 5. Run the complete test & quality gate
uv run python scripts/run_quality_gate.py --skip-next-build
```

---

## 2. Invariant Rules (Non-Negotiable)

1. **Zero Binary Floats:** Never use native Python `float` or GraphQL `Float` for financial or tax math. Use `decimal.Decimal` with `0.01` kobo quantization.
2. **Double-Entry Balance:** Every transaction must verify $\sum \text{Debits} == \sum \text{Credits}$.
3. **WCAG 2.2 Level AA Accessibility:** All UI components must achieve 0 `axe-core` accessibility violations and minimum 44px tap targets.
4. **Tenant Isolation:** Every database mutation and query must enforce the authenticated tenant boundary via `current_workspace_uuid()`.
5. **CAMA 2020 Compliance:** Historical accounting vouchers in `POSTED` status cannot be updated or deleted out-of-band.

---

## 3. Git & Pull Request Workflow

- **Branch Naming:** `feat/feature-name`, `fix/issue-description`, `compliance/regulation-update`.
- **Commit Messages:** Follow Conventional Commits (`feat:`, `fix:`, `test:`, `docs:`, `refactor:`).
- **PR Generation:** Use the automated generator:
  ```bash
  uv run python scripts/generate_pr.py --type feat --title "feat(tax): support Tax Act 2025 CIT radar" --branch feat/tax-act-2025
  ```
- **PR Review Gate:** CI must pass with 100% green tests, 0 SAST vulnerabilities, and all statutory invariant checkboxes verified.
