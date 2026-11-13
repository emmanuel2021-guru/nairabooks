---
name: kit-context-checkpoint
description: >-
  Use this skill whenever the context meter reaches Turn 8+/10, at the end of any Stage or Vertical Slice, or when the user types @SaveContext or @Compact to persist memory cleanly for a fresh chat.
---
# Kit Context Checkpoint (`kit-context-checkpoint`)

Preserve full project memory cleanly across chats so neither architectural context nor skill progress is lost as conversations grow long.

## Steps

1. **Bridge Wizard Context Skills (If Present in Loadout)**:
   - Check `docs/SKILL_COVERAGE.md`. If your project selected `context-manager`, `context-management-context-save`, `context-driven-development`, or `conductor-status`, read/apply their conventions alongside this checkpoint and mark them `[x] Executed` with updated evidence.
2. **Update `docs/STATE.md`**:
   - Record exact `Current Stage`, `Active Feature Slice`, `Wizard Skills Progress (X / N)`, verified working run/test commands, and any open blockers.
3. **Write Zero-Loss Handoff (`docs/SESSION_HANDOFF.md`)**:
   - Refresh `Key Memory Snapshot` with only directly verified facts (exact file paths, functions, test results, pending tasks).
   - Provide an updated, copy-ready **New Chat Recovery Prompt** naming the exact Stage/Slice and skills to load next.
4. **Optional Git Safety Snapshot**:
   - If inside a `.git` repository and the user wants a local checkpoint, run `git status` and suggest (or create if requested) a clean checkpoint commit (`chore: checkpoint stage <N>`). Never rewrite history or push without explicit confirmation.
5. **Advise Clean Reset**:
   - Tell the user in plain English: *"Context safely saved! You can safely open a new Antigravity chat and paste the prompt from `docs/SESSION_HANDOFF.md` whenever you're ready."*
