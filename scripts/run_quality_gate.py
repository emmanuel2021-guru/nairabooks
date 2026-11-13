#!/usr/bin/env python3
"""Unified Quality Gate & Test Automation Orchestrator (`test-automator`).

Runs all quality gates: Python test suite, Ruff linter, Mypy type checker,
TypeScript compiler, Vitest frontend tests, and workflow coverage verifier.
"""

from __future__ import annotations

import argparse
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def run_gate(name: str, cmd: list[str], cwd: Path = ROOT) -> tuple[bool, str, float]:
    """Execute a single gate step and return (success, output, duration)."""
    start = time.perf_counter()
    try:
        proc = subprocess.run(
            cmd,
            cwd=str(cwd),
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            check=False,
            shell=True,
        )
        duration = time.perf_counter() - start
        output = proc.stdout if proc.returncode == 0 else f"{proc.stdout}\n{proc.stderr}"
        return proc.returncode == 0, output.strip(), duration
    except Exception as exc:
        duration = time.perf_counter() - start
        return False, str(exc), duration


def main() -> int:
    parser = argparse.ArgumentParser(description="Run complete NairaBooks test & quality gates.")
    parser.add_argument("--skip-next-build", action="store_true", help="Skip production Next.js build")
    args = parser.parse_args()

    gates = [
        ("Python Pytest Suite", ["uv", "run", "pytest", "-q"]),
        ("Python Ruff Linter", ["uv", "run", "ruff", "check", "src", "tests"]),
        ("Python Mypy Typecheck", ["uv", "run", "mypy", "src", "tests"]),
        ("Frontend TypeScript (tsc)", ["npm", "--prefix", "web", "run", "typecheck"]),
        ("Frontend Vitest Suite", ["npm", "--prefix", "web", "test"]),
        ("Workflow Skills Coverage", ["uv", "run", "python", "scripts/verify_workflow.py", "--project", "."]),
    ]

    if not args.skip_next_build:
        gates.append(("Next.js Production Build", ["npm", "--prefix", "web", "run", "build"]))

    print("================================================================================")
    print("               NAIRABOOKS AUTOMATED QUALITY GATE ORCHESTRATOR                   ")
    print("================================================================================")

    all_passed = True
    results: list[tuple[str, bool, float, str]] = []

    for name, cmd in gates:
        print(f"--> Running: {name} ...", flush=True)
        ok, out, duration = run_gate(name, cmd)
        status_label = "[PASSED]" if ok else "[FAILED]"
        print(f"    {status_label} in {duration:.2f}s")
        results.append((name, ok, duration, out))
        if not ok:
            all_passed = False
            print(f"    Output:\n{out[:500]}...\n")

    print("\n--------------------------------------------------------------------------------")
    print("SUMMARY")
    print("--------------------------------------------------------------------------------")
    for name, ok, duration, _ in results:
        mark = "[PASS]" if ok else "[FAIL]"
        print(f" {mark} {name:<35} : {'PASS' if ok else 'FAIL'} ({duration:.2f}s)")
    print("--------------------------------------------------------------------------------")

    if all_passed:
        print("[SUCCESS] All automated test and quality gates passed flawlessly!\n")
        return 0
    else:
        print("[ERROR] One or more quality gates failed. Review logs above.\n")
        return 1


if __name__ == "__main__":
    sys.exit(main())
