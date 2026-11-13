# NairaBooks Git Workflow & Advanced Branching Strategy (`docs/GIT_AND_BRANCHING_STRATEGY.md`)

**Date:** 2026-11-13  
**Applicable Scope:** Engineering, DevOps, and Open-Source Contributors  
**Activated Wizard Skills:** `git-pr-workflows-git-workflow` (#104), `git-advanced-workflows` (#105), `git-pr-workflows-pr-enhance` (#106)

---

## 1. Core Branching Strategy: Trunk-Based Development with Short-Lived Feature Branches

NairaBooks follows **Trunk-Based Development** to ensure high engineering velocity, avoid merge hell, and enforce continuous verification:
- **Trunk Branch (`main`):** Production-ready, always-releasable baseline protected by branch protection rules (requires PR, 1+ approval, passing CI quality gate, and up-to-date branch).
- **Short-Lived Feature Branches (`feat/*`, `fix/*`, `perf/*`, `docs/*`):** Branches branch directly off `main`, stay focused on a single vertical slice (typically `< 48 hours` lifespan), and merge via GitHub PRs.

### Branch Naming Convention
```text
feat/NB-101-sales-invoice-wht-split
fix/NB-102-access-bank-fee-matching
perf/NB-103-ledger-posting-throughput
docs/NB-104-cama-retention-spec
```

---

## 2. Conventional Commits Standard

All commits must follow the **Conventional Commits v1.0.0** specification:

```text
<type>(<scope>): <short plain-English description>

[optional body explaining WHY the change was made, accounting invariants, or regulatory context]

[optional footer(s) referencing issue IDs, BREAKING CHANGES, or ADRs]
```

### Supported Types
- **`feat`**: New user-facing feature or domain capability (e.g., `feat(ledger): add 27-type standard transaction posting planner`)
- **`fix`**: Bug fix or calculation defect (e.g., `fix(tax): correct professional services CIT exemption exclusion`)
- **`refactor`**: Code restructuring with zero behavioral changes (e.g., `refactor(diagnostics): unify secret masking regex`)
- **`perf`**: Performance improvement (e.g., `perf(posting): benchmark 1,000 vouchers in sub-second throughput`)
- **`test`**: New or updated test suites (e.g., `test(vitest): add security header assertions`)
- **`docs`**: Documentation, ADRs, or user guides (e.g., `docs(decisions): log ADR-023 security hardening`)
- **`chore`**: Dependency updates, toolchain maintenance, or CI changes (e.g., `chore(ci): add automated quality gate workflow`)

---

## 3. Advanced Git Workflows (`git-advanced-workflows`)

### 3.1 Interactive Rebase (`git rebase -i`)
Before opening a PR or merging into `main`, clean up messy "work-in-progress" commits into logical, atomic units:
```bash
# Rebase the last N commits interactively
git fetch origin main
git rebase -i origin/main
```
- Use `pick` for key milestones.
- Use `squash` (or `fixup`) to merge small typos or formatting commits.
- Use `reword` to align commit messages with Conventional Commits.

### 3.2 Git Worktrees for Parallel Track Development
When working across multiple tracks simultaneously (e.g., working on `/reconcile` while debugging an accounting API):
```bash
# Create an isolated worktree for tax engine development
git worktree add ../nairabooks-tax-worktree feat/tax-engine-v2

# Switch directory without stashing or switching branches in your main checkout
cd ../nairabooks-tax-worktree

# Remove worktree after PR merge
cd ../ac
git worktree remove ../nairabooks-tax-worktree
```

### 3.3 Git Bisect for Root-Cause Regression Hunting
To locate the exact commit that introduced an accounting invariant defect or performance drop:
```bash
# Start bisect session
git bisect start
git bisect bad                 # Current commit has the defect
git bisect good v1.0.0-beta     # Known good baseline

# Run automated test on each bisect step
git bisect run uv run pytest tests/test_standard_transaction_posting.py

# Finish and reset back to original HEAD
git bisect reset
```

### 3.4 Git Reflog Disaster Recovery Runbook
If an accidental `git reset --hard` or rebase dropped valuable commits:
```bash
# Inspect reference log of all HEAD movements
git reflog

# Locate the commit SHA before the destructive command (e.g., HEAD@{2})
# Restore lost work into a recovery branch
git checkout -b recovery/accidental-reset HEAD@{2}
```

---

## 4. Pull Request Standards & Quality Gate Checklist
Before marking any PR ready for review:
1. Run the local automated quality gate: `uv run python scripts/run_quality_gate.py`.
2. Confirm `0` axe-core accessibility violations.
3. Confirm zero floating-point math (`Decimal` and `BigInt` only).
4. Fill out `.github/pull_request_template.md` thoroughly.
