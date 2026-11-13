# Phase 0 Deliverable: Skill Catalog, DX & Agent Orchestration Setup (`docs/PHASE_0_SETUP.md`)

Completed during **Phase 0: Skill Catalog & Agent Setup** covering all 4 Phase 0 wizard skills.

---

## 1. Skill Catalog Audit (`antigravity-skills-manager`)
- **Workspace Skill Mount (`.agents/skills.json`):** `128 / 128` wizard skills linked from `~/Documents/emmanuel/ac/antigravity-dynamic-vibecode-kit/skills` with `0` missing `SKILL.md` files.
- **Built-In Kit Skills (`.agents/skills/`):** `4 / 4` active (`dynamic-workflow-architect`, `kit-context-checkpoint`, `plain-english-copilot`, `stage-doc-sync`).
- **Global Skills Directory (`~/.gemini/antigravity/skills`):** `0` global skills installed — all project skills remain cleanly project-scoped per `antigravity-skills-manager` safety rules (no unrequested global installs).

---

## 2. Developer Experience Baseline (`dx-optimizer`)
- **Verified Local Toolchain:**
  - `python`: Python 3.11.0
  - `uv`: `uv 0.12.9`
  - `node`: `v24.14.1`
  - `npm` / `npx`: `11.11.0`
  - `git`: `2.53.0.windows.3`
  - `psql`: `PostgreSQL 18.3`
  - `docker`: Docker Compose `v5.6.0`
- **Workspace Ergonomics Configured:**
  - [`.editorconfig`](../.editorconfig) — standardized UTF-8, LF line endings, and Python (4-space) vs TypeScript/SQL/JSON (2-space) indentation.
  - [`.vscode/settings.json`](../.vscode/settings.json) — consistent editor formatting and search exclusions so bundled kit catalogs do not clutter file search.
  - [`scripts/dx_check.py`](../scripts/dx_check.py) — single-command preflight verifying CLI availability, `.agents/skills.json` `SKILL.md` resolution, and `scripts/verify_workflow.py`.

---

## 3. Agent Performance & Prompt Engineering Baseline (`agent-orchestration-improve-agent`)
- **Core Agent Mission:** Design and build a Nigerian-first, IFRS-aligned, dynamically multi-industry adaptive accounting platform without dropping double-entry integrity, statutory tax precision, or plain-English usability.
- **Constitutional Principles & Self-Verification Checkpoints:**
  1. **Double-Entry Invariant:** Every ledger posting specification, schema, and transaction test must guarantee `Total Debits == Total Credits` and balanced trial balances (`Assets = Liabilities + Equity + (Revenue - Expenses)`).
  2. **Nigerian Statutory Accuracy Gate:** Never guess Nigerian tax rates, thresholds, filing rules, or reporting mandates (FIRS VAT, WHT, CIT, Stamp Duty, PAYE, CAMA 2020, FRCN IFRS / IFRS for SMEs). Verify current statutory figures in Phase 1/3 or externalize them into versioned, effective-dated rule tables.
  3. **Composable Industry Tailoring:** Separate the immutable Nigerian IFRS accounting core from pluggable industry packs (e.g., Hospitality/Hotel, Restaurant/Diner, Retail/POS, Logistics, Manufacturing, Services) so adding new business verticals never forks core ledger math.
  4. **Evidence-Only Verification:** Never report files, tests, or compliance checks as passing unless executed and observed after the latest edit.
  5. **Safe Rollback Triggers:** If a schema migration, posting engine change, or prompt workflow causes test regressions or coverage drops, isolate with Phase 8 debugging skills or `conductor-revert` before proceeding.
- **Prompt & Output Rubric:** Maintain the 4-line Live Status HUD, plain-English `✨ Build Brief` translation for informal requests, and concise `[1 | 2 | 3 | 4]` stage gates.

---

## 4. Multi-Agent Orchestration & Context Optimization (`agent-orchestration-multi-agent-optimize`)
- **Workload Partitioning:**
  - **Main Agent:** Owns stage execution, user alignment, code edits, verification runs, and 5-file closeout.
  - **`research` Subagent:** Used in discovery/architecture phases (Phase 1 market/IFRS research, Phase 3 schema/threat modeling) for broad surveys so raw search chatter stays out of the primary context window.
- **Context Budget & Token Controls:**
  - Keep `AGENTS.md` strictly `< 24 KB` (`6,583` bytes currently).
  - Read only stage-relevant `SKILL.md` guides and target line ranges (`efficient_code_reading`).
  - Run `kit-context-checkpoint` at every stage closeout and at `Turn 8+/10`, compressing verified state into `docs/STATE.md` and `docs/SESSION_HANDOFF.md`.
- **Execution Order Guardrail:** Proceed strictly one stage at a time (`Phase 0` -> `Phase 1` -> ... -> `Phase 12`), updating `docs/SKILL_COVERAGE.md` only with verified artifacts.
