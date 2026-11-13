# Dynamic Vibecode Workspace (`AGENTS.md`)

Welcome to **`{{PROJECT_NAME}}`**, configured by **Antigravity Dynamic Vibecode Kit** using your exact **Skills Decision Wizard** answers (`{{TOTAL_SKILLS}}` selected skills across `{{ACTIVE_STAGE_COUNT}}` tailored stages).

Both **developers** and **non-developers** stay 100% in control here: you explain what you want in plain English, and the agent routes cleanly through your selected skills one stage at a time—updating documentation and saving context at every boundary.

---

## 1. Always-On Workflow Pillars (Never Skip)
1. **Start Every Session / Turn Right:** Read `docs/STATE.md` and `docs/SESSION_HANDOFF.md` first, show the **Live Status HUD** (`.agents/rules/01-hud-and-plain-english.md`), and expand rough non-technical requests into a concise **Build Brief** before changing files.
2. **Use 100% of Selected Wizard Skills:** Read the current stage's skill names in `docs/WORKFLOW_PLAN.md`, follow their `SKILL.md` guides, and check off every skill with concrete proof in `docs/SKILL_COVERAGE.md` (`.agents/rules/02-workflow-skill-coverage.md`).
3. **One Stage / Slice Per Pass + Full Documentation Closeout:** Before advancing to the next stage, update `docs/STAGE_LOG.md`, `docs/PRD.md`, `docs/ARCHITECTURE.md`, `docs/DECISIONS.md`, `docs/USER_GUIDE.md`, `docs/STATE.md`, and `docs/SESSION_HANDOFF.md`, then stop with the simple `[1 | 2 | 3 | 4]` menu.
4. **Context Protection (`@SaveContext`):** Whenever finishing a stage or reaching `Turn 8+/10`, invoke `kit-context-checkpoint` (plus your loadout's `context-manager` / `context-management-context-save` / `conductor-status` if present) and give a clean copyable prompt for opening a fresh chat safely.

---

## 2. Easy Plain-English Commands (For Non-Developers & Developers)
You never need to remember complex commands—just type natural English or use any shortcut below:
- **`1`** — Run the next recommended stage or feature slice from `docs/WORKFLOW_PLAN.md`
- **`@SaveContext`** *(or **`2`**)* — Save context checkpoint (`docs/STATE.md` + `docs/SESSION_HANDOFF.md`) for a fresh chat
- **`@Status`** *(or **`3`**)* — Show stage progress, updated docs, and remaining wizard skills in `docs/SKILL_COVERAGE.md`
- **`@Docs`** — Sync `docs/PRD.md`, `docs/ARCHITECTURE.md`, `docs/USER_GUIDE.md`, and `docs/STAGE_LOG.md` now
- **`@Verify`** — Run `python scripts/verify_workflow.py` plus project tests to verify 100% skill coverage & working code
- **`@Fix [describe bug]`** — Activate your debugging & traceback skills (or rollback if needed) to isolate and fix the root cause

---

## 3. Your Tailored Stage Pipeline (`{{TOTAL_SKILLS}}` Wizard Skills Active)
> Detailed per-skill instructions, exact triggers, and `If / Else` failure branches live in **`docs/WORKFLOW_PLAN.md`** and **`docs/SKILL_COVERAGE.md`**.

{{STAGE_PIPELINE_SUMMARY}}

---

## 4. Context & Verification Files
- **Master Workflow Plan (When each skill runs):** `docs/WORKFLOW_PLAN.md`
- **100% Skill Coverage Matrix:** `docs/SKILL_COVERAGE.md`
- **Living State & Handoff:** `docs/STATE.md`, `docs/SESSION_HANDOFF.md`
- **Living Documentation:** `docs/PRD.md`, `docs/ARCHITECTURE.md`, `docs/DECISIONS.md`, `docs/STAGE_LOG.md`, `docs/USER_GUIDE.md`
- **Automated Coverage Audit:** `python scripts/verify_workflow.py`
