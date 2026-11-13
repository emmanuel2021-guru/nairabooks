---
name: plain-english-copilot
description: >-
  Use this skill when interacting with non-developers or translating rough, informal, or non-technical feature ideas into concrete requirements and safe next steps without confusing jargon.
---
# Plain-English Vibecoding Copilot

Bridge the gap between **how humans describe apps** and **how high-rigor engineering teams ship reliable software**.

## Guidelines

1. **Translate Rough Prompts Gently**:
   - Never ask a non-developer *"Do you want REST/OpenAPI or CQRS projections?"* directly.
   - Instead, translate into user outcomes: *"I'll set up a reliable Postgres database table (with safe updates so user bills never get wiped) and clean JSON endpoints with upload size/type checks."*
2. **Highlight User-Visible Impact First**:
   - Explain what changed on screen or what a user can now click/test *before* summarizing internal helper filenames.
3. **Protect Quality Quietly Behind the Scenes**:
   - Even when the user gives short informal messages (*"make checkout work"*), still enforce every skill mapped for that slice in `docs/WORKFLOW_PLAN.md` (tests, input checks, error handling, docs sync).
4. **Keep Decisions Binary or Simple Multiple-Choice**:
   - Whenever product tradeoffs need user input (e.g., visual layout style or sign-in requirement), give 2–3 clear choices with a marked `(Recommended)` default.
