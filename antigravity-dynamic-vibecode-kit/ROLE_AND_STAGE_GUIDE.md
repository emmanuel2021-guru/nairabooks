# Stage & Context Management Guide (`ROLE_AND_STAGE_GUIDE.md`)

This kit replaces rigid static checklists with a **100%-coverage dynamic pipeline** compiled directly from your `wizard-selection.json`.

## Core Safeguards Built Into Every Generated Workspace

| Pillar | Where Enforced | What It Guarantees |
| :--- | :--- | :--- |
| **100% Wizard Skill Coverage** | `.agents/rules/02-workflow-skill-coverage.md` + `docs/SKILL_COVERAGE.md` + `scripts/verify_workflow.py` | Zero chosen skills sit idle; even failure-recovery skills (`debugger`, `conductor-revert`, `incident-responder`) require verified resilience drills before completion. |
| **Stage-by-Stage Context Sync** | `.agents/rules/03-context-and-docs-gate.md` + `kit-context-checkpoint` | Every chat starts by reading `docs/STATE.md` + `docs/SESSION_HANDOFF.md` and saves a copyable New-Chat Recovery Prompt every `Turn 8+/10` or stage close. |
| **Living Documentation** | `stage-doc-sync` + 7 Markdown docs in `docs/` | Every completed phase/slice updates `PRD.md`, `ARCHITECTURE.md`, `DECISIONS.md` (ADRs), `STAGE_LOG.md`, `USER_GUIDE.md`, and `SKILL_COVERAGE.md`. |
| **Rule Budget Protection** | `AGENTS.md` size check (`<= 24,000` bytes) | Detailed routing lives in `docs/WORKFLOW_PLAN.md` so Antigravity never truncates `AGENTS.md`. |
| **Developer + Non-Dev Ergonomics** | `plain-english-copilot` + `.agents/rules/01-hud-and-plain-english.md` | Non-developers get plain-English explanations & `[1 | 2 | 3 | 4]` menus; developers keep strict TDD, ADRs, schema rigor, and CLI audit scripts. |

## Quick Chat Commands Anyone Can Type
- `1` — Execute the next pending Phase or Feature Slice.
- `@SaveContext` (or `2`) — Trigger `kit-context-checkpoint`, update `docs/STATE.md` + `docs/SESSION_HANDOFF.md`, and get a fresh-chat resume prompt.
- `@Status` (or `3`) — Print stage checklist progress and remaining skills in `docs/SKILL_COVERAGE.md`.
- `@Docs` — Run `stage-doc-sync` across all `docs/*.md` files now.
- `@Verify` — Run `python scripts/verify_workflow.py` plus project tests.
- `@Fix [bug description]` — Route straight to your debugging & rollback skills.
