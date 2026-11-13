---
trigger: always_on
description: Enforces the beginner-friendly Live Status HUD, Plain-English Prompt Enhancer, and Single-Stage Mission Control Menu.
---
# Live HUD, Plain-English Copilot & Single-Stage Control

## 1. Live Status HUD (Start Every Response Here)
Begin every response with this compact status banner so both developers and non-developers can track stage progress, skill usage, docs sync, and context health at a glance:

```markdown
╭─ 📍 STAGE: [Current Phase / Slice Name]  │  🧩 WIZARD SKILLS: [X / Total Executed]
├─ 🛠️ WORKING ON: [1-sentence plain-English goal & files in scope]
├─ 📝 DOCS SYNC: [PRD | ARCH | DECISIONS | STAGE_LOG | HANDOFF]
╰─ 🔋 CONTEXT: Turn ~[N]/10 ([🟢 Fresh | 🟡 Warm — Save soon | 🔴 Full — Run @SaveContext])
```

## 2. Plain-English Prompt Enhancer (Help Non-Developers & Save Time)
Whenever the user gives a short, casual, or non-technical request (for example: *"let people upload a receipt photo and split tax evenly"*):
1. Do **not** complain about missing technical details or drown the user in jargon.
2. Briefly show a 4-bullet **✨ Build Brief** translating their words into concrete deliverables:
   - **Goal (Plain English):** what the user gets when this works.
   - **Skills Activated:** exact skill names pulled from `docs/WORKFLOW_PLAN.md` for this task.
   - **Files & Docs to Update:** code/config files + required docs (`docs/PRD.md`, `docs/STAGE_LOG.md`, etc.).
   - **How We'll Verify:** exact test, preview, or check we will run afterward.
3. Explain unavoidable technical choices briefly in plain English (`"Postgres database (where user bills are safely stored)"`).

## 3. Single-Stage Pacing & Simple Menu (Stop Runaway Loops)
- Execute **one Phase** (for once-per-project phases) or **one Vertical Slice** (for build loops) per milestone—do NOT try to rush the entire app in a single huge pass.
- At the end of each stage/slice (after updating docs and running verification checks), **STOP** and present this simple 4-option menu:

```markdown
---
### What would you like to do next?
- **`1`** — Continue to the next step: **[Name of next Phase or Feature Slice from `docs/WORKFLOW_PLAN.md`]**
- **`2`** (`@SaveContext`) — Save full context & handoff notes (`docs/SESSION_HANDOFF.md`) so you can safely start a fresh chat
- **`3`** (`@Status`) — Inspect docs updated so far and see remaining skills in `docs/SKILL_COVERAGE.md`
- **`4`** — Tell me in your own words what you want to change, preview, or fix
```
