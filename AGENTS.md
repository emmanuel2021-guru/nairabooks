# Dynamic Vibecode Workspace (`AGENTS.md`)

Welcome to **`ac`**, configured by **Antigravity Dynamic Vibecode Kit** using your exact **Skills Decision Wizard** answers (`128` selected skills across `12` tailored stages).

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

## 3. Your Tailored Stage Pipeline (`128` Wizard Skills Active)
> Detailed per-skill instructions, exact triggers, and `If / Else` failure branches live in **`docs/WORKFLOW_PLAN.md`** and **`docs/SKILL_COVERAGE.md`**.

- **Phase 0: Skill Catalog & Agent Setup** (4 skills): Prepare your toolset and agent prompts before starting. — e.g. `antigravity-skills-manager`, `dx-optimizer`, `agent-orchestration-improve-agent`, `agent-orchestration-multi-agent-optimize`
- **Phase 1: Idea, Market & Business Validation** (6 skills): Check user demand, competitors, and business viability before writing specs. — e.g. `search-specialist`, `competitive-landscape`, `market-sizing-analysis`, `startup-analyst` *(+2 more in `docs/WORKFLOW_PLAN.md`)*
- **Phase 2: Project Spec, Context Memory & Starter Files** (8 skills): Lock what the product does, set up Conductor tracking, and create the starter folder. — e.g. `conductor-setup`, `context-driven-development`, `conductor-validator`, `conductor-new-track` *(+4 more in `docs/WORKFLOW_PLAN.md`)*
- **Phase 3: System Architecture, APIs & Safety Design** (13 skills): Plan how screens, server endpoints, and safety checks fit together. — e.g. `architect-review`, `architecture-patterns`, `backend-architect`, `microservices-patterns` *(+9 more in `docs/WORKFLOW_PLAN.md`)*
- **Phase 4: Database & Data Persistence** (9 skills): Design how data is saved cleanly and updated without losing user records. — e.g. `database-architect`, `postgresql`, `sql-pro`, `sql-optimization-patterns` *(+5 more in `docs/WORKFLOW_PLAN.md`)*
- **Phase 5: Visual Design System & Accessibility** (7 skills): Choose layout, colors, fonts, and keyboard/screen-reader accessibility first. — e.g. `ui-ux-designer`, `tailwind-design-system`, `kpi-dashboard-design`, `article-illustrations` *(+3 more in `docs/WORKFLOW_PLAN.md`)*
- **Phase 6: Core Build Loop (Tests + Language Stack)** (20 skills): Build your core app features slice-by-slice with test safety nets. — e.g. `conductor-implement`, `workflow-patterns`, `full-stack-orchestration-full-stack-feature`, `backend-development-feature-development` *(+16 more in `docs/WORKFLOW_PLAN.md`)*
- **Phase 7: Product Features (Auth, Billing, AI, Specialty)** (1 skills): Wire login, payments, AI/OCR, or specialized engines into working slices. — e.g. `auth-implementation-patterns`
- **Phase 8: Testing, Bug Fixing & Code Quality Gate** (22 skills): Verify features end-to-end, squash failures (if red), and clean code (when green). — e.g. `javascript-testing-patterns`, `unit-testing-test-generate`, `test-automator`, `api-testing-observability-api-mock` *(+18 more in `docs/WORKFLOW_PLAN.md`)*
- **Phase 9: Security Audit, Package Safety & Privacy Rules** (13 skills): Scan code/dependencies for vulnerabilities and check legal/GDPR rules. — e.g. `security-auditor`, `backend-security-coder`, `frontend-security-coder`, `frontend-mobile-security-xss-scan` *(+9 more in `docs/WORKFLOW_PLAN.md`)*
- **Phase 10: Git Workflow, CI/CD & Cloud Deployment** (6 skills): Set up version control, automated checks, and deploy your app online. — e.g. `git-pr-workflows-git-workflow`, `git-advanced-workflows`, `git-pr-workflows-pr-enhance`, `changelog-automation` *(+2 more in `docs/WORKFLOW_PLAN.md`)*
- **Phase 12: User Docs, Launch Copy & SEO Growth** (19 skills): Write clear guides, landing page messaging, and search-friendly content. — e.g. `docs-architect`, `code-documentation-doc-generate`, `code-documentation-code-explain`, `tutorial-engineer` *(+15 more in `docs/WORKFLOW_PLAN.md`)*

---

## 4. Context & Verification Files
- **Master Workflow Plan (When each skill runs):** `docs/WORKFLOW_PLAN.md`
- **100% Skill Coverage Matrix:** `docs/SKILL_COVERAGE.md`
- **Living State & Handoff:** `docs/STATE.md`, `docs/SESSION_HANDOFF.md`
- **Living Documentation:** `docs/PRD.md`, `docs/ARCHITECTURE.md`, `docs/DECISIONS.md`, `docs/STAGE_LOG.md`, `docs/USER_GUIDE.md`
- **Automated Coverage Audit:** `python scripts/verify_workflow.py`
