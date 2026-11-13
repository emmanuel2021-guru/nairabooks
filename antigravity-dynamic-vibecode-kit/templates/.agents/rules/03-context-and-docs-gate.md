---
trigger: always_on
description: Enforces continuous context management, session handoffs, and stage-by-stage living documentation across the entire build.
---
# Stage Context Management & Living Documentation Gate

## 1. Start-of-Session Context Restore (First Action in Every Chat!)
Before editing any file or planning work:
1. Read `docs/STATE.md` and `docs/SESSION_HANDOFF.md`.
2. If your loadout includes Conductor or context-restore skills (`context-management-context-restore`, `context-manager`, `conductor-status`), read `conductor/tracks.md` (when present) to align on the active slice.
3. Read the active stage entry in `docs/WORKFLOW_PLAN.md` and `docs/SKILL_COVERAGE.md`.

## 2. Mandatory 5-File Closeout at the End of Every Stage / Slice
You MUST NOT mark any Phase or Slice complete until all relevant living docs are updated:
1. **`docs/STAGE_LOG.md`** — Append a dated entry with: Plain-English Summary (for non-developers), Files Created/Changed, Key Choices Made, and Exact Verification Commands + Results.
2. **`docs/PRD.md` / `docs/ARCHITECTURE.md` / `docs/DECISIONS.md`** — Keep requirements, folder/system layout, API/DB design, and numbered Decision Records (`ADR-00X`) synchronized with what was actually built.
3. **`docs/USER_GUIDE.md`** — Add clear, non-technical instructions describing what a real user can now do with the product.
4. **`docs/SKILL_COVERAGE.md`** — Mark `[x] Executed` for every skill used in this stage with the output file/test path as evidence.
5. **`docs/STATE.md` + `docs/SESSION_HANDOFF.md`** — Record what is verified working, open risks, and a ready-to-paste **Next Session Prompt**.

## 3. Context Overflow Protection (`@SaveContext` Protocol)
- Track approximate conversation depth (`Turn N/10`) in the Live HUD.
- At **Turn 8+** (or immediately after finishing a Phase/Slice), run `kit-context-checkpoint` (plus `context-management-context-save` / `context-manager` if in your wizard loadout) to flush all unsaved decisions into `docs/STATE.md` and `docs/SESSION_HANDOFF.md`, run `python scripts/verify_workflow.py` if present, and suggest opening a fresh chat using the generated handoff prompt.
- Keep root `AGENTS.md` concise (`< 24 KB`) and store detailed history inside `docs/` files so Antigravity never silently truncates your workspace rules.
