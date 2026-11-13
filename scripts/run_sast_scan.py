#!/usr/bin/env python3
"""Static Application Security Testing (SAST) & Secret Scanner Engine.

Scans Python backend and Next.js frontend codebases for security vulnerabilities,
XSS injection risks, SQL injection patterns, and hardcoded secrets.
Activated by: `security-scanning-security-sast` (#97), `sast-configuration` (#98),
`frontend-mobile-security-xss-scan` (#94), and `secrets-management` (#99).
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any, cast

ROOT = Path(__file__).resolve().parent.parent


@dataclass(frozen=True)
class SecurityFinding:
    rule_id: str
    rule_name: str
    severity: str
    file_path: str
    line_number: int
    matched_snippet: str


def load_config() -> dict[str, Any]:
    config_path = ROOT / ".sast-config.json"
    if not config_path.is_file():
        raise FileNotFoundError(f"Missing SAST configuration file at {config_path}")
    return cast(dict[str, Any], json.loads(config_path.read_text(encoding="utf-8")))


def scan_file(file_path: Path, rules: list[dict[str, Any]], findings: list[SecurityFinding]) -> None:
    try:
        content = file_path.read_text(encoding="utf-8", errors="replace")
    except Exception:
        return

    lines = content.splitlines()
    for rule in rules:
        regex = re.compile(rule["pattern"])
        for idx, line in enumerate(lines, start=1):
            # Skip comments or explicitly audited safe snippets
            trimmed = line.strip()
            if trimmed.startswith(("#", "//", "/*", "*")) or "safe-json-ld" in line or "safe-sast-ignore" in line:
                continue
            match = regex.search(line)
            if match:
                findings.append(
                    SecurityFinding(
                        rule_id=rule["id"],
                        rule_name=rule["name"],
                        severity=rule["severity"],
                        file_path=str(file_path.relative_to(ROOT)),
                        line_number=idx,
                        matched_snippet=line.strip()[:100],
                    )
                )


def run_sast_scan(project_root: Path = ROOT) -> tuple[int, list[SecurityFinding]]:
    config = load_config()
    findings: list[SecurityFinding] = []

    exclusions = set(config.get("exclusions", []))
    py_rules = config["rules"].get("python", [])
    ts_rules = config["rules"].get("typescript", [])

    # 1. Scan Python source
    src_dir = project_root / "src" / "nairabooks"
    if src_dir.is_dir():
        for py_file in src_dir.rglob("*.py"):
            if any(part in exclusions for part in py_file.parts):
                continue
            scan_file(py_file, py_rules, findings)

    # 2. Scan Web TypeScript/TSX source
    web_dir = project_root / "web" / "src"
    if web_dir.is_dir():
        for ts_file in web_dir.rglob("*"):
            if ts_file.suffix in (".ts", ".tsx", ".js") and not any(part in exclusions for part in ts_file.parts):
                scan_file(ts_file, ts_rules, findings)

    # 3. Scan .env and example files for real secrets
    for env_file in project_root.glob(".env*"):
        try:
            env_content = env_file.read_text(encoding="utf-8")
            for idx, line in enumerate(env_content.splitlines(), start=1):
                if re.search(r"-----BEGIN (RSA|EC|OPENSSH|PRIVATE) KEY-----", line):
                    findings.append(
                        SecurityFinding(
                            rule_id="SEC-ENV-001",
                            rule_name="Committed Private Cryptographic Key in Environment File",
                            severity="CRITICAL",
                            file_path=str(env_file.relative_to(ROOT)),
                            line_number=idx,
                            matched_snippet="[REDACTED PRIVATE KEY]",
                        )
                    )
        except Exception:
            pass

    critical_and_high = [f for f in findings if f.severity in ("CRITICAL", "HIGH")]
    return len(critical_and_high), findings


def main() -> int:
    parser = argparse.ArgumentParser(description="Run NairaBooks SAST static security scan.")
    parser.parse_args()

    print("================================================================================")
    print("                NAIRABOOKS SAST STATIC APPLICATION SECURITY SCANNER             ")
    print("================================================================================")

    critical_high_count, findings = run_sast_scan()

    if not findings:
        print("[SUCCESS] Zero vulnerabilities or security risks detected! Codebase is clean.\n")
        return 0

    print(f"Total Findings: {len(findings)} (Critical/High: {critical_high_count})\n")
    print(f"{'Severity':<10} | {'Rule ID':<12} | {'Location':<40} | {'Rule Name'}")
    print("-" * 80)
    for f in findings:
        loc = f"{f.file_path}:{f.line_number}"
        print(f"{f.severity:<10} | {f.rule_id:<12} | {loc:<40} | {f.rule_name}")
        print(f"  Snippet: {f.matched_snippet}\n")

    if critical_high_count > 0:
        print(f"[FAIL] Scan detected {critical_high_count} CRITICAL/HIGH security vulnerabilities.")
        return 1
    else:
        print("[PASS] Only low/medium advisories found. Build gate passes.")
        return 0


if __name__ == "__main__":
    sys.exit(main())
