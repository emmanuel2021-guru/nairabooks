#!/usr/bin/env python3
"""GitHub Issue Triage & Investigation Helper (`team-collaboration-issue`).

Classifies reported bugs and feature requests by module, severity, regulatory impact,
and provides step-by-step TDD investigation plans.
"""

from __future__ import annotations

import argparse
import sys
from dataclasses import dataclass
from typing import Any


@dataclass
class IssueTriageResult:
    title: str
    severity: str
    affected_module: str
    regulatory_impact: list[str]
    investigation_steps: list[str]
    suggested_test_file: str


def triage_issue(title: str, description: str) -> IssueTriageResult:
    text = f"{title} {description}".lower()

    # Determine severity
    if any(k in text for k in ("unbalanced", "crash", "data loss", "security", "exploit", "crosstenant")):
        severity = "CRITICAL (P0)"
    elif any(k in text for k in ("tax mismatch", "vat wrong", "wht", "retention", "cama")):
        severity = "HIGH (P1)"
    elif any(k in text for k in ("ui", "layout", "typo", "color", "styling")):
        severity = "LOW (P3)"
    else:
        severity = "MEDIUM (P2)"

    # Determine module
    if any(k in text for k in ("vat", "tax", "cit", "wht", "withholding")):
        module = "Tax & Statutory Rules (`src/nairabooks/tax/`)"
        test_file = "tests/test_tax_engine.py"
    elif any(k in text for k in ("reconcile", "statement", "access bank", "matching")):
        module = "Account Reconciliation Studio (`web/src/components/BankReconciliationWorkspace.tsx`)"
        test_file = "web/src/__tests__/reports-and-reconcile.test.tsx"
    elif any(k in text for k in ("report", "frcn", "balance sheet", "p&l")):
        module = "FRCN Reports Studio (`src/nairabooks/ledger/domain/statements.py`)"
        test_file = "tests/test_ledger_statements.py"
    elif any(k in text for k in ("auth", "login", "role", "permission", "rbac", "cama")):
        module = "Auth, RBAC & Audit (`src/nairabooks/auth/` & `audit/`)"
        test_file = "tests/test_auth_rbac_and_sessions.py"
    else:
        module = "General Ledger Core (`src/nairabooks/ledger/`)"
        test_file = "tests/test_standard_transaction_posting.py"

    # Regulatory tags
    statutes: list[str] = []
    if "tax" in text or "vat" in text or "wht" in text or "cit" in text:
        statutes.append("Nigeria Tax Act 2025 (VAT 7.5%, WHT 2%/5%/10%, CIT small-company thresholds)")
    if "cama" in text or "audit" in text or "period" in text or "retention" in text:
        statutes.append("CAMA 2020 Sections 374 (6-year retention), 377 (double-entry), 405 (SoD certification)")
    if "privacy" in text or "user" in text or "anonymize" in text or "dsar" in text:
        statutes.append("Nigeria Data Protection Act (NDPA) 2023 & GDPR Data Subject Rights")

    steps = [
        "1. Write a failing reproduction test in the designated test suite (Red phase).",
        "2. Inspect domain invariants and decimal quantization (ensure zero binary float math).",
        "3. Implement the minimal targeted fix in the domain or application use case (Green phase).",
        "4. Run `uv run python scripts/run_quality_gate.py` to confirm zero regression across all test suites.",
        "5. Submit PR using `.github/pull_request_template.md` with test evidence attached.",
    ]

    return IssueTriageResult(
        title=title,
        severity=severity,
        affected_module=module,
        regulatory_impact=statutes or ["Standard Operational Accounting"],
        investigation_steps=steps,
        suggested_test_file=test_file,
    )


def main() -> int:
    parser = argparse.ArgumentParser(description="Triage and plan GitHub issue resolution.")
    parser.add_argument("title", nargs="?", default="Discrepancy in 7.5% Output VAT on multi-line sales invoices", help="Issue title")
    parser.add_argument("--desc", default="Tax calculation rounding discrepancy when splitting across multiple kobo items", help="Issue description")
    args = parser.parse_args()

    result = triage_issue(args.title, args.desc)

    print("================================================================================")
    print("                  NAIRABOOKS ISSUE TRIAGE & RESOLUTION PLAN                    ")
    print("================================================================================")
    print(f"Title             : {result.title}")
    print(f"Severity Level    : {result.severity}")
    print(f"Target Module     : {result.affected_module}")
    print(f"Suggested Test    : {result.suggested_test_file}")
    print("\nStatutory Impact:")
    for s in result.regulatory_impact:
        print(f" - {s}")
    print("\nRecommended TDD Resolution Steps:")
    for step in result.investigation_steps:
        print(f" {step}")
    print("================================================================================\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
