# ⚡ Antigravity Dynamic Vibecode Kit

Build real, production-grade products in **Google Antigravity**—designed equally for **non-developers** (plain-English prompts, guided questions, zero terminal required after setup) and **developers** (CLI compilation, `100%` skill audits, ADRs, TDD loops, and automated verification).

Unlike static kits that hardcode one fixed stack, this kit connects directly to the **307-Skill Decision Wizard**, compiles the optimal workflow from **only the skills you chose**, guarantees **100% of those skills are actually executed and verified**, and enforces **context management + living documentation at every stage**.

---

## How It Works in 3 Simple Steps

### Step 1: Answer the Simple Questions in the Wizard
Open `wizard/skills_decision_wizard.html` in your browser (or pick one of the 3 built-in Quick Examples).
- Answer the 18 jargon-free questions (e.g., *Does your app save data?*, *Do users log in or pay?*, *Easy hosting or enterprise AWS?*).
- Click **"Download `wizard-selection.json`"** *(recommended for CLI)* **OR** click **"Copy Chat Prompt (No Terminal Needed)"**.

### Step 2: Generate Your Dynamic Project Workflow
Pick whichever path matches how you like to work:

- **Option A — 1 Command (Developers / PowerShell / Terminal):**
  ```powershell
  .\scripts\init-project.ps1 -WizardJson .\wizard-selection.json -TargetDir ..\my-real-app
  ```
  *(Copies **only** your chosen skills from the bundled `skills/` library of `307` skills directly into `<target>/.agents/skills/` for a portable repo. Pass `-Mode link` if you prefer `.agents/skills.json` linking back to `skills/` instead.)*

- **Option B — Zero-Terminal Chat Setup (Non-Developers):**
  Bootstrap any empty folder once with `.\scripts\init-project.ps1 -TargetDir ..\my-real-app` (without `-WizardJson`), open that folder in Google Antigravity, and **paste the "Copy Chat Prompt" output** from the wizard directly into chat.

This generates a self-contained workspace wired with:
- `.agents/skills/` populated cleanly with **100% of your chosen wizard skills** + the 4 kit orchestrator skills (keeping unrelated skills out of context!)
- `.agents/rules/` enforcing the **Live HUD**, **Plain-English Prompt Enhancer**, **100% Skill Coverage Gate**, and **5-File Stage Documentation + Context Handoff Gate**
- `AGENTS.md` (strictly `< 24 KB` per Antigravity rule limits)
- `docs/WORKFLOW_PLAN.md` (your optimal dynamic Phase 0 -> Phase 12 Mermaid & execution plan)
- `docs/SKILL_COVERAGE.md` (100% skill execution tracker: every single chosen skill mapped with proof)
- Living docs initialized cleanly: `docs/PRD.md`, `docs/ARCHITECTURE.md`, `docs/DECISIONS.md`, `docs/STAGE_LOG.md`, `docs/STATE.md`, `docs/SESSION_HANDOFF.md`, `docs/USER_GUIDE.md`
- `scripts/verify_workflow.py` (objective check confirming `0` dropped skills and valid docs)

### Step 3: Build Your App Stage-by-Stage
1. Open your newly created project folder in **Google Antigravity**.
2. Describe your product idea in plain English (for example: *"I want a web app that splits restaurant bills from a photo of the receipt"*).
3. Antigravity reads `docs/STATE.md`, runs **one Phase or Vertical Slice at a time**, updates all living documentation at the end of each stage, checks off executed skills in `docs/SKILL_COVERAGE.md`, and stops with a simple `[1 | 2 | 3 | 4]` menu.
4. Reply **`1`** to advance, **`2`** (`@SaveContext`) whenever you want a clean fresh-chat handoff, or explain changes in everyday English!

---

## Updating Your Workflow Mid-Project
Changed your mind later (for example, deciding to add Stripe billing or Kubernetes)?
Re-run the wizard, download the new `wizard-selection.json`, and run with `-PreserveDocs` so your existing `PRD.md`, `STAGE_LOG.md`, and `[x]` checkmarks stay intact:
```powershell
.\scripts\init-project.ps1 -WizardJson .\wizard-selection.json -TargetDir ..\my-real-app -PreserveDocs
```
