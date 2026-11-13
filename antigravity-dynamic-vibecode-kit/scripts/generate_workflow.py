#!/usr/bin/env python3
"""Compile a Skills Decision Wizard selection into a dynamic Antigravity Vibecode workspace."""

from __future__ import annotations

import argparse
import json
import os
import shutil
import sys
from collections import defaultdict
from datetime import date
from pathlib import Path
from typing import Any


KIT_ROOT = Path(__file__).resolve().parent.parent
MAX_AGENTS_BYTES = 24000
PRESERVABLE_DOCS = (
    "PRD.md",
    "ARCHITECTURE.md",
    "DECISIONS.md",
    "STAGE_LOG.md",
    "USER_GUIDE.md",
    "STATE.md",
    "SESSION_HANDOFF.md",
)


def load_catalog(catalog_path: Path) -> dict[str, Any]:
    """Load the canonical stage, block, and skill workflow catalog."""
    return json.loads(catalog_path.read_text(encoding="utf-8"))


def parse_wizard_input(wizard_path: Path) -> dict[str, Any]:
    """Read either wizard-selection.json or a newline-separated list of skill names."""
    raw = wizard_path.read_text(encoding="utf-8-sig").strip()
    if not raw:
        raise ValueError(f"Wizard input file is empty: {wizard_path}")

    if raw.startswith("{"):
        payload = json.loads(raw)
        skills = [str(s).strip() for s in payload.get("selectedSkills", []) if str(s).strip()]
        if not skills and payload.get("blocks"):
            skills = [
                str(sk).strip()
                for blk in payload["blocks"]
                for sk in blk.get("skills", [])
                if str(sk).strip()
            ]
        return {
            "mode": str(payload.get("mode", "wizard_path")),
            "dedupApplied": bool(payload.get("dedupApplied", True)),
            "selectedSkills": dedup_ordered(skills),
            "blocks": payload.get("blocks", []),
            "answers": payload.get("answers", []),
        }

    skills = dedup_ordered(
        line.strip().lstrip("-*` ").rstrip("`")
        for line in raw.splitlines()
        if line.strip() and not line.strip().startswith("#")
    )
    return {
        "mode": "skill_list",
        "dedupApplied": False,
        "selectedSkills": skills,
        "blocks": [],
        "answers": [],
    }


def dedup_ordered(items: Any) -> list[str]:
    """Return unique non-empty strings while preserving original order."""
    seen: set[str] = set()
    result: list[str] = []
    for item in items:
        if item and item not in seen:
            seen.add(item)
            result.append(item)
    return result


def resolve_skills_path(skills_dir: str, output_dir: Path) -> str:
    """Format the skills path safely for Antigravity JSON path resolution rules."""
    expanded = Path(skills_dir).expanduser().resolve()
    home = Path.home().resolve()
    try:
        rel_home = expanded.relative_to(home)
        return f"~/{rel_home.as_posix()}"
    except ValueError:
        pass

    try:
        rel_out = os.path.relpath(expanded, output_dir.resolve())
        return Path(rel_out).as_posix()
    except ValueError:
        return expanded.as_posix()


def build_skill_lookup(catalog: dict[str, Any], wizard_blocks: list[dict[str, Any]]) -> dict[str, dict[str, Any]]:
    """Map every known catalog skill (favoring blocks actually chosen by the user) to its metadata."""
    preferred_block_ids = {b["blockId"] for b in wizard_blocks if "blockId" in b}
    lookup: dict[str, dict[str, Any]] = {}

    sorted_blocks = sorted(
        catalog["blocks"].values(),
        key=lambda b: (0 if b["blockId"] in preferred_block_ids else 1, b["stageOrder"], b["blockId"]),
    )
    for blk in sorted_blocks:
        for skill in blk["skills"]:
            if skill not in lookup:
                lookup[skill] = {
                    "skill": skill,
                    "blockId": blk["blockId"],
                    "blockLabel": blk["label"],
                    "stageOrder": blk["stageOrder"],
                    "stageId": blk["stageId"],
                    "conditionalOnFailure": bool(blk.get("conditionalOnFailure", False)),
                }
    return lookup


def map_skills_to_phases(
    selected_skills: list[str],
    catalog: dict[str, Any],
    wizard_blocks: list[dict[str, Any]],
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    """Assign 100% of selected wizard skills into ordered workflow phases."""
    if not selected_skills:
        raise ValueError("No skills found in wizard selection. Select at least one skill first.")

    lookup = build_skill_lookup(catalog, wizard_blocks)
    stages_by_order = {s["stageOrder"]: dict(s) for s in catalog["stages"]}
    phase_groups: dict[int, dict[str, list[dict[str, Any]]]] = defaultdict(lambda: defaultdict(list))
    flat_assignments: list[dict[str, Any]] = []

    for skill in selected_skills:
        info = lookup.get(
            skill,
            {
                "skill": skill,
                "blockId": "CUSTOM",
                "blockLabel": "Custom / Additional Skills",
                "stageOrder": 6,
                "stageId": "phase-6-core-build",
                "conditionalOnFailure": False,
            },
        )
        phase_groups[info["stageOrder"]][info["blockLabel"]].append(info)
        flat_assignments.append(info)

    active_phases: list[dict[str, Any]] = []
    for order in sorted(phase_groups):
        stage_meta = stages_by_order[order]
        blocks_list = [
            {"label": label, "items": items}
            for label, items in phase_groups[order].items()
        ]
        all_phase_skills = [item for grp in blocks_list for item in grp["items"]]
        active_phases.append(
            {
                "stageOrder": order,
                "stageId": stage_meta["stageId"],
                "title": stage_meta["title"],
                "plainGoal": stage_meta["plainGoal"],
                "mode": stage_meta["mode"],
                "docs": stage_meta["docs"],
                "blocks": blocks_list,
                "skills": all_phase_skills,
            }
        )
    return active_phases, flat_assignments


def render_template(template_text: str, replacements: dict[str, str]) -> str:
    """Substitute {{KEY}} placeholders deterministically."""
    rendered = template_text
    for key, val in replacements.items():
        rendered = rendered.replace(f"{{{{{key}}}}}", val)
    return rendered


def build_workflow_plan_md(
    project_name: str,
    selected_skills: list[str],
    active_phases: list[dict[str, Any]],
    wizard_data: dict[str, Any],
) -> str:
    """Generate the complete dynamic execution workflow covering all selected skills."""
    lines: list[str] = [
        f"# Dynamic Workflow Plan — `{project_name}`",
        "",
        f"Generated dynamically from your Skills Decision Wizard choices (**{len(selected_skills)} / {len(selected_skills)} selected skills mapped** across **{len(active_phases)} active phases**).",
        "",
        "---",
        "",
        "## 1. Your Wizard Choices Summary",
    ]

    if wizard_data.get("answers"):
        lines.extend(["", "| Question | Your Decision |", "| :--- | :--- |"])
        for ans in wizard_data["answers"]:
            lines.append(f"| `{ans.get('qId', '')}` ({ans.get('stage', '')}) | **{ans.get('chosenLabel', '')}** |")
    else:
        lines.append(f"- Loaded **{len(selected_skills)}** explicit skills via `{wizard_data.get('mode', 'custom')}`.")

    skill_set = set(selected_skills)
    has_conductor = any(s.startswith("conductor-") for s in skill_set)
    has_tdd = any(s.startswith("tdd-") for s in skill_set)

    lines.extend([
        "",
        "---",
        "",
        "## 2. How This Workflow Runs (Dynamic Orchestration)",
        f"- **Spec & Track Engine:** {'**Conductor Active** (`conductor/product.md`, `conductor/tracks.md` slice loop)' if has_conductor else '**Phase-Gate Tracker** (`docs/PRD.md` + `docs/STATE.md`)'}",
        f"- **Coding Discipline:** {'**Strict TDD Red -> Green -> Refactor** per task' if has_tdd else '**Test-Verified Feature Slices**'}",
        "- **Every Stage / Slice Always Ends With:** `stage-doc-sync` (updates `docs/`) + `kit-context-checkpoint` (saves `docs/STATE.md` & `docs/SESSION_HANDOFF.md`) + `docs/SKILL_COVERAGE.md` check-offs.",
        "",
        "```mermaid",
        "flowchart TD",
    ])

    prev_node = "START([\"Start Product Creation\"])"
    for phase in active_phases:
        node = f"P{phase['stageOrder']}[\"{phase['title']} ({len(phase['skills'])} skills)\"]"
        lines.append(f"    {prev_node} --> {node}")
        prev_node = f"P{phase['stageOrder']}"
    lines.extend([
        f"    {prev_node} --> VERIFY{{\"All {len(selected_skills)} skills verified [x]?\"}}",
        "    VERIFY -->|\"No: Run remaining\"| BUILD_NEXT[\"Execute remaining skills in docs/SKILL_COVERAGE.md\"]",
        "    BUILD_NEXT --> VERIFY",
        "    VERIFY -->|\"Yes: 100% Complete\"| DONE([\"Shipped Product + Complete Docs\"])",
        "```",
        "",
        "---",
        "",
        "## 3. Phase-by-Phase Execution Plan (100% of Selected Skills)",
    ])

    for phase in active_phases:
        mode_badge = {
            "once": "Run Once (Foundation)",
            "per_slice": "Repeat Per Vertical Feature Slice",
            "pre_launch": "Run Before Public Launch",
        }.get(phase["mode"], phase["mode"])
        lines.extend([
            "",
            f"### {phase['title']}",
            f"- **Plain-English Goal:** {phase['plainGoal']}",
            f"- **Cadence:** `{mode_badge}`",
            f"- **Required Docs Updated on Closeout:** {', '.join(f'`{d}`' for d in phase['docs'])} + `docs/SKILL_COVERAGE.md`",
            "",
        ])
        for grp in phase["blocks"]:
            names = ", ".join(f"`{item['skill']}`" for item in grp["items"])
            note = " *(Conditional on failure — also verify with 1 resilience/dry-run check before launch)*" if any(
                i["conditionalOnFailure"] for i in grp["items"]
            ) else ""
            lines.append(f"- **{grp['label']}{note}:** {names}")

    lines.extend([
        "",
        "---",
        "",
        "## 4. Built-In Kit Guardrail Skills (Always Active Alongside Your Selection)",
        "- `dynamic-workflow-architect`: Recompiles workflow if wizard choices change.",
        "- `plain-english-copilot`: Translates non-developer requests into crisp action steps.",
        "- `stage-doc-sync`: Updates `PRD.md`, `ARCHITECTURE.md`, `DECISIONS.md`, `STAGE_LOG.md`, `USER_GUIDE.md`, and `SKILL_COVERAGE.md` after every phase.",
        "- `kit-context-checkpoint`: Writes zero-loss handoffs to `docs/STATE.md` and `docs/SESSION_HANDOFF.md` every phase or `Turn 8+/10`.",
    ])

    return "\n".join(lines) + "\n"


def load_existing_coverage_statuses(coverage_path: Path) -> dict[str, tuple[str, str]]:
    """Preserve prior [x] / [~] skill statuses and evidence when regenerating mid-project."""
    if not coverage_path.exists():
        return {}
    statuses: dict[str, tuple[str, str]] = {}
    for line in coverage_path.read_text(encoding="utf-8").splitlines():
        if not line.startswith("|"):
            continue
        parts = [p.strip() for p in line.split("|")[1:-1]]
        if len(parts) >= 6 and parts[1].startswith("`") and parts[1].endswith("`"):
            skill_name = parts[1].strip("`")
            statuses[skill_name] = (parts[4], parts[5])
    return statuses


def build_skill_coverage_md(
    selected_skills: list[str],
    assignments: list[dict[str, Any]],
    prior_statuses: dict[str, tuple[str, str]],
) -> str:
    """Create the 100% Zero-Skill-Left-Behind tracking checklist."""
    done_count = sum(1 for item in assignments if prior_statuses.get(item["skill"], ("", ""))[0].startswith("[x]"))
    total = len(selected_skills)
    pct = round((done_count / total) * 100) if total else 0

    lines = [
        "# 100% Wizard Skill Coverage Tracker (`docs/SKILL_COVERAGE.md`)",
        "",
        "> Every skill chosen in your **Skills Decision Wizard** appears below. A project cannot finish while any row remains `[ ] Pending`.",
        "",
        f"- **Coverage Progress:** `{done_count} / {total}` skills executed (`{pct}%`)",
        "- **Audit Command:** `python scripts/verify_workflow.py`",
        "",
        "| # | Skill Name | Assigned Phase | Sub-Block | Status | Proof / Artifact or Command |",
        "| :--- | :--- | :--- | :--- | :--- | :--- |",
    ]

    for idx, item in enumerate(assignments, start=1):
        status, proof = prior_statuses.get(
            item["skill"],
            (
                "[ ] Pending (Conditional / Resilience Check)" if item["conditionalOnFailure"] else "[ ] Pending",
                "_Pending execution_",
            ),
        )
        lines.append(
            f"| {idx} | `{item['skill']}` | {item['stageId']} | {item['blockLabel']} | {status} | {proof} |"
        )

    return "\n".join(lines) + "\n"


def sync_kit_support_files(
    kit_root: Path,
    output_dir: Path,
    skills_dir: str,
    mode: str,
    selected_skills: list[str],
) -> None:
    """Install rules, orchestrator skills, skills.json (or copied folders), and verify script."""
    rules_src = kit_root / "templates" / ".agents" / "rules"
    rules_dst = output_dir / ".agents" / "rules"
    rules_dst.mkdir(parents=True, exist_ok=True)
    for rule_file in rules_src.glob("*.md"):
        shutil.copy2(rule_file, rules_dst / rule_file.name)

    skills_dst = output_dir / ".agents" / "skills"
    skills_dst.mkdir(parents=True, exist_ok=True)
    for skill_folder in (kit_root / "kit_skills").iterdir():
        if skill_folder.is_dir():
            shutil.copytree(skill_folder, skills_dst / skill_folder.name, dirs_exist_ok=True)

    skills_json_path = output_dir / ".agents" / "skills.json"
    if mode == "copy":
        source_root = Path(skills_dir).expanduser().resolve()
        missing_on_disk = []
        for sk in selected_skills:
            src_sk = source_root / sk
            if src_sk.is_dir():
                shutil.copytree(src_sk, skills_dst / sk, dirs_exist_ok=True)
            elif (skills_dst / sk).is_dir():
                continue
            else:
                missing_on_disk.append(sk)
        if missing_on_disk:
            raise FileNotFoundError(
                f"Cannot copy missing skill folders from {source_root}: {', '.join(missing_on_disk[:10])}"
            )
        if skills_json_path.exists():
            skills_json_path.unlink()
    else:
        resolved = resolve_skills_path(skills_dir, output_dir)
        skills_json = {
            "entries": [
                {
                    "path": resolved,
                    "include_only": selected_skills,
                }
            ]
        }
        skills_json_path.write_text(json.dumps(skills_json, indent=2) + "\n", encoding="utf-8")

    scripts_dst = output_dir / "scripts"
    scripts_dst.mkdir(parents=True, exist_ok=True)
    shutil.copy2(kit_root / "scripts" / "verify_workflow.py", scripts_dst / "verify_workflow.py")


def build_agents_md(
    kit_root: Path,
    replacements: dict[str, str],
    active_phases: list[dict[str, Any]],
) -> str:
    """Render concise workspace AGENTS.md strictly within Antigravity's 24 KB limit."""
    template = (kit_root / "templates" / "AGENTS.template.md").read_text(encoding="utf-8")
    summary_lines = []
    for phase in active_phases:
        preview_skills = ", ".join(f"`{i['skill']}`" for i in phase["skills"][:4])
        extra = f" *(+{len(phase['skills']) - 4} more in `docs/WORKFLOW_PLAN.md`)*" if len(phase["skills"]) > 4 else ""
        summary_lines.append(
            f"- **{phase['title']}** ({len(phase['skills'])} skills): {phase['plainGoal']} — e.g. {preview_skills}{extra}"
        )
    all_vars = {**replacements, "STAGE_PIPELINE_SUMMARY": "\n".join(summary_lines)}
    rendered = render_template(template, all_vars)
    byte_len = len(rendered.encode("utf-8"))
    if byte_len > MAX_AGENTS_BYTES:
        raise ValueError(f"Generated AGENTS.md exceeds {MAX_AGENTS_BYTES} bytes ({byte_len} bytes)")
    return rendered


def generate_project_workflow(
    wizard_path: Path,
    output_dir: Path,
    project_name: str | None = None,
    mode: str = "copy",
    skills_dir: str | None = None,
    catalog_path: Path | None = None,
    preserve_docs: bool = False,
) -> dict[str, Any]:
    """Generate all workflow, skill config, context checkpoint, and living doc files."""
    cat_path = catalog_path or (KIT_ROOT / "catalog" / "workflow_catalog.json")
    catalog = load_catalog(cat_path)
    wizard_data = parse_wizard_input(wizard_path)
    selected_skills = wizard_data["selectedSkills"]

    output_dir = output_dir.resolve()
    output_dir.mkdir(parents=True, exist_ok=True)
    docs_dir = output_dir / "docs"
    docs_dir.mkdir(parents=True, exist_ok=True)

    proj_name = project_name or output_dir.name
    if skills_dir:
        resolved_skills_dir = str(Path(skills_dir).expanduser())
    else:
        default_src = Path(catalog["defaultSkillsSource"])
        resolved_skills_dir = str(default_src if default_src.is_absolute() else (KIT_ROOT / default_src))
    active_phases, assignments = map_skills_to_phases(selected_skills, catalog, wizard_data.get("blocks", []))

    stage_checklist = "\n".join(
        f"- [ ] **{p['title']}** (`0 / {len(p['skills'])}` skills done)"
        for p in active_phases
    )
    stack_blocks = [
        grp["label"]
        for p in active_phases
        if p["stageOrder"] in (3, 4, 5, 6, 7, 10)
        for grp in p["blocks"]
    ]
    stack_summary = "\n".join(f"- {lbl}" for lbl in stack_blocks) or "- Minimal / Custom Setup"

    replacements = {
        "PROJECT_NAME": proj_name,
        "GENERATED_DATE": date.today().isoformat(),
        "TOTAL_SKILLS": str(len(selected_skills)),
        "ACTIVE_STAGE_COUNT": str(len(active_phases)),
        "WIZARD_MODE": wizard_data["mode"],
        "FIRST_STAGE_TITLE": active_phases[0]["title"],
        "STAGE_STATUS_CHECKLIST": stage_checklist,
        "STACK_SUMMARY": stack_summary,
    }

    sync_kit_support_files(KIT_ROOT, output_dir, resolved_skills_dir, mode, selected_skills)

    agents_md = build_agents_md(KIT_ROOT, replacements, active_phases)
    (output_dir / "AGENTS.md").write_text(agents_md, encoding="utf-8")

    workflow_plan_md = build_workflow_plan_md(proj_name, selected_skills, active_phases, wizard_data)
    (docs_dir / "WORKFLOW_PLAN.md").write_text(workflow_plan_md, encoding="utf-8")

    prior_statuses = load_existing_coverage_statuses(docs_dir / "SKILL_COVERAGE.md") if preserve_docs else {}
    coverage_md = build_skill_coverage_md(selected_skills, assignments, prior_statuses)
    (docs_dir / "SKILL_COVERAGE.md").write_text(coverage_md, encoding="utf-8")

    templates_docs = KIT_ROOT / "templates" / "docs"
    for doc_name in PRESERVABLE_DOCS:
        dst_file = docs_dir / doc_name
        if preserve_docs and dst_file.exists():
            continue
        tpl_name = doc_name.replace(".md", ".template.md")
        tpl_text = (templates_docs / tpl_name).read_text(encoding="utf-8")
        dst_file.write_text(render_template(tpl_text, replacements), encoding="utf-8")

    normalized_wizard = {
        "version": "1.0",
        "projectName": proj_name,
        "mode": wizard_data["mode"],
        "dedupApplied": wizard_data["dedupApplied"],
        "totalSkills": len(selected_skills),
        "selectedSkills": selected_skills,
        "blocks": wizard_data.get("blocks", []),
        "answers": wizard_data.get("answers", []),
    }
    (output_dir / "wizard-selection.json").write_text(
        json.dumps(normalized_wizard, indent=2) + "\n",
        encoding="utf-8",
    )

    return {
        "projectName": proj_name,
        "outputDir": str(output_dir),
        "totalSkills": len(selected_skills),
        "activePhases": len(active_phases),
        "agentsBytes": len(agents_md.encode("utf-8")),
        "mode": mode,
    }


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Compile Skills Decision Wizard choices into an Antigravity Vibecode workspace.")
    parser.add_argument("--wizard", required=True, help="Path to wizard-selection.json or newline skill list .txt")
    parser.add_argument("--output", required=True, help="Target project directory")
    parser.add_argument("--project-name", default=None, help="Optional human-friendly project name")
    parser.add_argument("--mode", choices=("link", "copy"), default="copy", help="Copy selected skill folders into .agents/skills/ (default) or link via .agents/skills.json")
    parser.add_argument("--skills-dir", default=None, help="Path to master skill catalog directory")
    parser.add_argument("--catalog", default=None, help="Override path to workflow_catalog.json")
    parser.add_argument("--preserve-docs", action="store_true", help="Keep existing PRD/STATE/STAGE_LOG content and checkmarks when regenerating")

    args = parser.parse_args(argv)
    summary = generate_project_workflow(
        wizard_path=Path(args.wizard),
        output_dir=Path(args.output),
        project_name=args.project_name,
        mode=args.mode,
        skills_dir=args.skills_dir,
        catalog_path=Path(args.catalog) if args.catalog else None,
        preserve_docs=args.preserve_docs,
    )
    print(json.dumps(summary, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
