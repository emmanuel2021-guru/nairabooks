# Non-Developer Guide: How to Build Your App with Zero Coding Jargon

You do **not** need to know programming terms, terminal commands, or complex prompt engineering to use this kit. Everything happens through simple multiple-choice questions and short replies in plain English.

---

## 1. Pick What Your App Needs (2 Minutes)
1. Double-click `wizard/skills_decision_wizard.html` to open it in Chrome/Edge.
2. Answer each question in plain English (hover/read the short line under each button—there are no trick questions!).
   - *Tip:* Try clicking one of the **Quick examples** at the top first (`Bill-Splitter Web App`, `Paid SaaS App`, or `Quick Python Script`) to see how it works.
3. Click the green/primary **"Copy Chat Prompt (No Terminal Needed)"** button on the right (or **"Download `wizard-selection.json`"**).

---

## 2. Build Step-by-Step Without Getting Overwhelmed
Once your project folder is open in **Google Antigravity**:
1. **Paste what you copied** from the wizard (if your folder isn't set up yet) -> Antigravity sets up your custom workflow automatically and shows you how many skills it loaded.
2. **Describe your idea naturally**, like you're telling a friend:
   > *"Build an app where friends upload a dinner receipt photo, tap what they ate, and see who owes what with one shareable link."*
3. Notice how **every message from Antigravity** starts with a compact 4-line box showing:
   - What stage it's currently working on
   - How many of your wizard skills have been used (`X / N`)
   - Which documentation files were updated
   - How healthy the chat memory is (`Turn X/10`)
4. At the end of each step, Antigravity **stops and asks what you want to do next**:
   - Type **`1`** -> move to the next step automatically.
   - Type **`2`** -> save everything safely to `docs/SESSION_HANDOFF.md` so you can open a clean **New Chat** without the AI forgetting anything.
   - Type **`3`** -> see plain-English progress notes and remaining skills.
   - Or just **type what you want changed** in everyday words (*"make the buttons bigger"*, *"add dark mode"*, *"this page crashes when I upload a PNG"*).

---

## 3. Where Your Project Memory & Docs Live
If you ever wonder what the AI built or why, open any of these plain-English files inside `docs/`:
- **`docs/PRD.md`** — What your app does and the checklist of requested features.
- **`docs/USER_GUIDE.md`** — How someone uses your finished app, written cleanly.
- **`docs/STAGE_LOG.md`** — A diary of everything built and tested in every stage.
- **`docs/SESSION_HANDOFF.md`** — Copy-paste prompt to resume smoothly in a brand-new chat anytime.
- **`docs/SKILL_COVERAGE.md`** — Proof that 100% of the skills selected in the wizard were actually applied.
