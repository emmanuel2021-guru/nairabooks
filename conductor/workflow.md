# Development Workflow (`conductor/workflow.md`)

## 1. Context-Driven & Stage-Gated Flow
1. Always restore context from `docs/STATE.md`, `docs/SESSION_HANDOFF.md`, `conductor/tracks.md`, and the active track's `spec.md` + `plan.md` before coding.
2. Follow the **Dynamic Wizard Pipeline** (`docs/WORKFLOW_PLAN.md`) strictly one phase/slice at a time.

## 2. Coding Discipline: Strict TDD (`Red -> Green -> Refactor`)
Per Wizard choice `Q6`:
- **RED:** Write failing automated tests covering invariants (e.g., `Debits == Credits`, statutory tax rounding, pack composition) before implementing production code.
- **GREEN:** Write the minimal, clean code needed to pass the tests.
- **REFACTOR:** Eliminate duplication, preserve edge-case guards, run `ruff` / typechecks / test suite to confirm green.

## 3. Financial & Accounting Invariants (Non-Negotiable)
- **Never use binary `float` for money, tax rates, or quantities.** Always use fixed-precision `Decimal` (`NGN` to 2 decimal places; intermediate rates/unit costs with explicit rounding rules).
- **Double-Entry Law:** Every posted ledger voucher must satisfy `sum(debits) == sum(credits)` in functional currency (`NGN`) and transaction currency.
- **Immutability:** Posted vouchers are append-only; corrections occur via reversing/adjustment entries.

## 4. Commit & Review Policy
- **Commit Convention:** Conventional Commits (`feat:`, `fix:`, `docs:`, `test:`, `refactor:`, `chore:`).
- **Verification Checkpoint:** Every Phase/Track completion must pass automated tests + `python scripts/verify_workflow.py --project .` + 5-file closeout (`stage-doc-sync` & `kit-context-checkpoint`).
