#!/usr/bin/env python3
"""Developer Experience (DX) environment and skill-catalog preflight check."""

from __future__ import annotations

import json
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def check_toolchain() -> tuple[list[str], list[str]]:
    """Inspect core local developer CLIs without mutating environment state."""
    required = ("python", "uv", "node", "npm", "git")
    optional = ("psql", "docker")
    found: list[str] = []
    missing_required: list[str] = []

    for cmd in (*required, *optional):
        path = shutil.which(cmd)
        if path:
            found.append(f"{cmd}: {path}")
        elif cmd in required:
            missing_required.append(cmd)
        else:
            found.append(f"{cmd}: not found (optional until container/DB stage)")
    return found, missing_required


def check_skill_catalog() -> tuple[int, list[str]]:
    """Verify every skill referenced in .agents/skills.json resolves to SKILL.md."""
    skills_json = ROOT / ".agents" / "skills.json"
    if not skills_json.is_file():
        return 0, ["Missing .agents/skills.json"]

    cfg = json.loads(skills_json.read_text(encoding="utf-8"))
    missing: list[str] = []
    checked = 0
    for entry in cfg.get("entries", []):
        base = Path(entry["path"]).expanduser()
        for skill_name in entry.get("include_only", []):
            checked += 1
            if not (base / skill_name / "SKILL.md").is_file():
                missing.append(f"{skill_name} (expected under {base})")
    return checked, missing


def main() -> int:
    found, missing_required = check_toolchain()
    checked_skills, missing_skills = check_skill_catalog()

    verify_proc = subprocess.run(
        [sys.executable, str(ROOT / "scripts" / "verify_workflow.py"), "--project", str(ROOT)],
        capture_output=True,
        text=True,
    )

    print("=== DX Toolchain Audit ===")
    for line in found:
        print(f"  - {line}")
    if missing_required:
        print(f"[ERR] Missing required CLIs: {', '.join(missing_required)}")

    print("\n=== Skill Catalog Resolution ===")
    print(f"  - Checked linked skills: {checked_skills}")
    if missing_skills:
        print(f"[ERR] Missing SKILL.md files: {', '.join(missing_skills[:10])}")

    print("\n=== Workflow Coverage Audit ===")
    if verify_proc.stdout.strip():
        print(f"  {verify_proc.stdout.strip()}")
    if verify_proc.stderr.strip():
        print(verify_proc.stderr.strip(), file=sys.stderr)

    ok = not missing_required and not missing_skills and verify_proc.returncode == 0
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
