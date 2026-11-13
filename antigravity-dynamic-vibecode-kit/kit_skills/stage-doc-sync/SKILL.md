---
name: stage-doc-sync
description: >-
  Use this skill at the close of every Phase or Vertical Slice (or when the user types @Docs) to synchronize PRD, Architecture, Decision Records, Stage Log, User Guide, and Skill Coverage before advancing.
---
# Stage Documentation Synchronizer (`stage-doc-sync`)

Ensure documentation stays accurate and readable for both **non-developers** and **developers** at every single stage of building the product.

## Checklist Before Closing Any Stage

1. **Product Spec (`docs/PRD.md`)**:
   - Update feature statuses (`[ ] Pending` -> `[~] In Progress` -> `[x] Done`) and adjust acceptance criteria if scope was refined with user approval.
2. **Architecture & Decision Log (`docs/ARCHITECTURE.md` & `docs/DECISIONS.md`)**:
   - Update folder tree, data entities, endpoints, and dependencies to match the actual files on disk.
   - Add an ADR (`ADR-00X`) in `docs/DECISIONS.md` explaining **what** major library/schema/pattern choice was made, **why**, and any tradeoffs.
3. **Plain-English User Guide (`docs/USER_GUIDE.md`)**:
   - Explain in everyday terms what a user can now do and how to start/preview the app cleanly.
4. **Permanent Stage Log (`docs/STAGE_LOG.md`)**:
   - Append a section containing:
     - **Plain-English Summary** (1–2 sentences understandable by a non-coder)
     - **Files Created / Modified**
     - **Exact Verification Commands & Observed Results** (never claim tests passed unless actually run after the last edit)
5. **100% Skill Coverage Audit (`docs/SKILL_COVERAGE.md`)**:
   - Mark `[x] Executed` beside every skill from the current stage/slice **only** if it was actively applied, along with the concrete artifact or test path proving it.
   - Run `python scripts/verify_workflow.py` if present to confirm doc integrity.
