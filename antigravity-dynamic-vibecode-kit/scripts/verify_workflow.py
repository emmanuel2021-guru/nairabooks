#!/usr/bin/env python3
"""Verify 100% wizard skill inclusion, AGENTS.md size limits, and living docs presence."""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path


MAX_AGENTS_BYTES = 24000
REQUIRED_DOCS = (
    "docs/WORKFLOW_PLAN.md",
    "docs/SKILL_COVERAGE.md",
    "docs/PRD.md",
    "docs/ARCHITECTURE.md",
    "docs/DECISIONS.md",
    "docs/STATE.md",
    "docs/STAGE_LOG.md",
    "docs/SESSION_HANDOFF.md",
    "docs/USER_GUIDE.md",
)
REQUIRED_KIT_SKILLS = (
    "dynamic-workflow-architect",
    "stage-doc-sync",
    "kit-context-checkpoint",
    "plain-english-copilot",
)


def parse_coverage_rows(coverage_text: str) -> dict[str, str]:
    """Extract {skill_name: status} from docs/SKILL_COVERAGE.md table rows."""
    rows: dict[str, str] = {}
    for line in coverage_text.splitlines():
        if not line.startswith("|"):
            continue
        cols = [c.strip() for c in line.split("|")[1:-1]]
        if len(cols) >= 5 and cols[1].startswith("`") and cols[1].endswith("`"):
            rows[cols[1].strip("`")] = cols[4]
    return rows


def verify_project(project_dir: Path, require_complete: bool = False) -> tuple[bool, list[str]]:
    """Return (passed, messages) for the generated or active Vibecode workspace."""
    errors: list[str] = []
    wizard_file = project_dir / "wizard-selection.json"
    if not wizard_file.exists():
        return False, [f"Missing wizard-selection.json at {wizard_file}"]

    wizard_data = json.loads(wizard_file.read_text(encoding="utf-8-sig"))
    selected_skills = [str(s).strip() for s in wizard_data.get("selectedSkills", []) if str(s).strip()]
    if not selected_skills:
        errors.append("wizard-selection.json has 0 selectedSkills")

    agents_file = project_dir / "AGENTS.md"
    if not agents_file.exists():
        errors.append("Missing AGENTS.md")
    else:
        agents_bytes = len(agents_file.read_text(encoding="utf-8").encode("utf-8"))
        if agents_bytes > MAX_AGENTS_BYTES:
            errors.append(f"AGENTS.md exceeds {MAX_AGENTS_BYTES} bytes ({agents_bytes} bytes)")

    for rel_doc in REQUIRED_DOCS:
        if not (project_dir / rel_doc).exists():
            errors.append(f"Missing required doc: {rel_doc}")

    rules_dir = project_dir / ".agents" / "rules"
    if not rules_dir.is_dir() or not list(rules_dir.glob("*.md")):
        errors.append("Missing .agents/rules/*.md guardrails")

    for kit_skill in REQUIRED_KIT_SKILLS:
        if not (project_dir / ".agents" / "skills" / kit_skill / "SKILL.md").exists():
            errors.append(f"Missing built-in kit skill: .agents/skills/{kit_skill}/SKILL.md")

    skills_json_file = project_dir / ".agents" / "skills.json"
    mounted_skills: set[str] = set()
    if skills_json_file.exists():
        cfg = json.loads(skills_json_file.read_text(encoding="utf-8"))
        for entry in cfg.get("entries", []):
            mounted_skills.update(entry.get("include_only", []))
    skills_folder = project_dir / ".agents" / "skills"
    if skills_folder.is_dir():
        for d in skills_folder.iterdir():
            if d.is_dir():
                mounted_skills.add(d.name)

    plan_text = (project_dir / "docs" / "WORKFLOW_PLAN.md").read_text(encoding="utf-8") if (project_dir / "docs" / "WORKFLOW_PLAN.md").exists() else ""
    cov_text = (project_dir / "docs" / "SKILL_COVERAGE.md").read_text(encoding="utf-8") if (project_dir / "docs" / "SKILL_COVERAGE.md").exists() else ""
    cov_rows = parse_coverage_rows(cov_text)

    missing_mount = [s for s in selected_skills if s not in mounted_skills]
    missing_plan = [s for s in selected_skills if not re.search(rf"`{re.escape(s)}`", plan_text)]
    missing_cov = [s for s in selected_skills if s not in cov_rows]

    if missing_mount:
        errors.append(f"Skills missing from .agents/skills.json or .agents/skills/: {', '.join(missing_mount[:10])}")
    if missing_plan:
        errors.append(f"Skills missing from docs/WORKFLOW_PLAN.md: {', '.join(missing_plan[:10])}")
    if missing_cov:
        errors.append(f"Skills missing from docs/SKILL_COVERAGE.md: {', '.join(missing_cov[:10])}")

    pending = [s for s in selected_skills if s in cov_rows and not cov_rows[s].startswith("[x]")]
    if require_complete and pending:
        errors.append(f"{len(pending)} wizard skills still not marked [x] Executed: {', '.join(pending[:10])}")

    summary = (
        f"Verified {len(selected_skills)} wizard skills "
        f"(mounted={len(selected_skills) - len(missing_mount)}, "
        f"planned={len(selected_skills) - len(missing_plan)}, "
        f"tracked={len(selected_skills) - len(missing_cov)}, "
        f"executed={len(selected_skills) - len(missing_cov) - len(pending)})"
    )
    return len(errors) == 0, [summary, *errors]


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Verify Antigravity Dynamic Vibecode Kit setup & 100% skill coverage.")
    parser.add_argument("--project", default=".", help="Project directory to verify (default: current directory)")
    parser.add_argument("--require-complete", action="store_true", help="Fail unless all wizard skills are marked [x] Executed")
    args = parser.parse_args(argv)

    ok, messages = verify_project(Path(args.project).resolve(), require_complete=args.require_complete)
    for msg in messages:
        print(("[OK] " if ok and msg == messages[0] else "[ERR] " if msg != messages[0] else "") + msg)
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
