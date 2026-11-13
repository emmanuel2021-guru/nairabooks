# Engineering & Product Decision Log (`docs/DECISIONS.md`)

> Every important choice ("Why did we pick X instead of Y?") is logged here so future chats never reverse or forget prior reasoning.

## ADR-001: Dynamic Wizard Skill Workflow Initialization
- **Date:** {{GENERATED_DATE}}
- **Status:** Accepted
- **Context:** Selected `{{TOTAL_SKILLS}}` curated skills via the Skills Decision Wizard (`{{WIZARD_MODE}}`) to avoid context bloat while ensuring full coverage.
- **Decision:** Generated a tailored stage pipeline (`docs/WORKFLOW_PLAN.md`), strict coverage matrix (`docs/SKILL_COVERAGE.md`), and always-on context/docs closeout rules (`.agents/rules/`).
- **Consequences:** All `{{TOTAL_SKILLS}}` selected skills are mapped to concrete stages and must be verified before completion.
