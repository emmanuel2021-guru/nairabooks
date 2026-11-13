---
trigger: always_on
description: Guarantees that 100% of skills selected from the Skills Decision Wizard are scheduled in docs/WORKFLOW_PLAN.md, applied during build stages, and checked off with proof in docs/SKILL_COVERAGE.md.
---
# 100% Dynamic Wizard Skill Coverage Mandate

## 1. Zero-Skill-Left-Behind Rule
Every skill chosen by the user in the **Skills Decision Wizard** (`wizard-selection.json`) is listed in two living files:
- **`docs/WORKFLOW_PLAN.md`** — defines *when* each skill runs (Phase 0 -> Phase 12 + Conditional Branches).
- **`docs/SKILL_COVERAGE.md`** — tracks the status of **every single skill** (`[ ] Pending`, `[~] Active`, `[x] Executed`) alongside concrete proof.

## 2. How to Apply Each Selected Skill
1. Before coding or writing specs in any active stage, read `docs/WORKFLOW_PLAN.md` for that stage's assigned skills.
2. Read the corresponding `SKILL.md` instructions (via Antigravity skill discovery from `.agents/skills.json` or `.agents/skills/`) and follow its concrete patterns/checklists.
3. Only mark a skill `[x] Executed` in `docs/SKILL_COVERAGE.md` once you have produced and verified a real deliverable (spec, ADR, code module, test run, audit report, CI config, or documentation file).

## 3. Conditional Safety / Recovery Skills
Skills triggered only when something goes wrong (for example: `debugger`, `debugging-strategies`, `conductor-revert`, `incident-responder`, `postmortem-writing`):
- If a failure happens organically, use these skills to diagnose, fix, or recover—and log `[x] Executed (Triggered on issue ...)`.
- If the stage stays green with zero bugs, still perform a short **dry-run / resilience verification** (for example: test an invalid-input failure path, verify rollback steps or runbook commands) before launch so **100% of selected skills** are actively validated and checked `[x]` in `docs/SKILL_COVERAGE.md`.

## 4. Completion Gate
You MUST NOT declare the workflow finished while any row in `docs/SKILL_COVERAGE.md` still shows `[ ] Pending`. Run `python scripts/verify_workflow.py` (when available) to verify 100% coverage objectively.
