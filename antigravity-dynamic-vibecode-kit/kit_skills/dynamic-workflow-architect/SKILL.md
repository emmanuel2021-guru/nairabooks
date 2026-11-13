---
name: dynamic-workflow-architect
description: >-
  Use this skill when the user provides a wizard-selection.json file, pastes output from the Skills Decision Wizard, or asks to generate or update the dynamic project workflow ensuring 100% of selected skills are scheduled and tracked.
---
# Dynamic Workflow Architect

Compile the user's **Skills Decision Wizard** answers into an optimized, end-to-end build workflow where **100% of selected skills** are assigned to concrete stages, documented, and tracked to completion.

## Steps

1. **Locate or Save the Wizard Selection**:
   - Look for `wizard-selection.json` at the workspace root.
   - If the user pasted JSON directly in chat, write it to `wizard-selection.json` cleanly.
   - If the user pasted raw skill names (one per line), wrap them into `{"mode": "custom_list", "selectedSkills": [...]}` and save to `wizard-selection.json`.

2. **Compile the Dynamic Workflow Deterministically**:
   - Locate the generator script: check `scripts/generate_workflow.py` first, then `.agents/kit/scripts/generate_workflow.py`.
   - Run (copies 100% of selected wizard skills from the bundled `skills/` library into `.agents/skills/`):
     ```bash
     python "<path-to-generate_workflow.py>" --wizard wizard-selection.json --output .
     ```
   - This dynamically produces:
     - `.agents/skills/` containing 100% of selected wizard skills plus the 4 kit skills (or `.agents/skills.json` if run with `--mode link`)
     - `AGENTS.md` (kept concise under 24,000 bytes)
     - `docs/WORKFLOW_PLAN.md` (optimal phase ordering omitting unneeded stages)
     - `docs/SKILL_COVERAGE.md` (100% skill execution checklist)
     - `docs/PRD.md`, `docs/ARCHITECTURE.md`, `docs/DECISIONS.md`, `docs/STATE.md`, `docs/STAGE_LOG.md`, `docs/SESSION_HANDOFF.md`, `docs/USER_GUIDE.md`
     - `scripts/verify_workflow.py`

3. **Verify 100% Skill Inclusion**:
   - Run `python scripts/verify_workflow.py` and confirm exit code `0` (`Missing skills: 0`).
   - If the user selected `antigravity-skills-manager` or Conductor skills (`conductor-setup`), note their assigned Phase in `docs/WORKFLOW_PLAN.md` rather than skipping ahead.

4. **Present the Plain-English Kickoff Summary**:
   - Show the user (whether developer or non-developer) how many skills were wired (`N / N`), which Phases are active for their project, and ask them to describe their app idea in 1–3 sentences (or reply `1`) to begin the very first Phase.
