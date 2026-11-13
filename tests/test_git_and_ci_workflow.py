"""Tests for Phase 10 Git workflows, CI/CD automation, and team collaboration tooling."""

from __future__ import annotations

from pathlib import Path

from scripts.generate_changelog import build_changelog_content
from scripts.generate_pr import generate_pr_markdown
from scripts.generate_standup_notes import generate_standup_notes
from scripts.issue_triage import triage_issue

ROOT = Path(__file__).resolve().parent.parent


def test_ci_workflow_manifest_exists_and_contains_quality_gates() -> None:
    ci_file = ROOT / ".github" / "workflows" / "ci.yml"
    assert ci_file.is_file(), "Missing .github/workflows/ci.yml"
    content = ci_file.read_text(encoding="utf-8")

    assert "run_quality_gate.py" in content or "pytest" in content
    assert "run_sast_scan.py" in content
    assert "compliance_check.py" in content
    assert "audit_dependencies.py" in content
    assert "verify_workflow.py" in content


def test_pull_request_generator_includes_statutory_and_quality_invariants() -> None:
    pr_md = generate_pr_markdown(
        pr_type="feat",
        title="feat(reconcile): Auto-match Access Bank *901# PDF statement",
        summary="Automated statement parser and side-by-side matching grid.",
        branch="feat/reconcile-pdf-match",
        commits=["feat: add PDF parser", "test: add reconciliation a11y tests"],
    )

    assert "Zero Float Invariant" in pr_md
    assert "Double-Entry Balance" in pr_md
    assert "Nigeria Tax Act 2025" in pr_md
    assert "CAMA 2020 Section 405" in pr_md
    assert "feat/reconcile-pdf-match" in pr_md


def test_changelog_generator_follows_keep_a_changelog_spec() -> None:
    changelog = build_changelog_content("1.0.0-rc1")

    assert "# Changelog" in changelog
    assert "## [1.0.0-rc1]" in changelog
    assert "### Added" in changelog
    assert "### Security" in changelog
    assert "Nigerian IFRS Double-Entry Ledger Core" in changelog


def test_issue_triage_classifies_tax_discrepancy_with_statutory_tags() -> None:
    result = triage_issue(
        title="Discrepancy in 7.5% Output VAT on multi-item invoice",
        description="Incorrect kobo rounding when computing VAT and 5% WHT",
    )

    assert result.severity in ("MEDIUM (P2)", "HIGH (P1)")
    assert "Tax" in result.affected_module
    assert any("Nigeria Tax Act 2025" in s for s in result.regulatory_impact)
    assert len(result.investigation_steps) >= 5


def test_standup_notes_generator_formats_actionable_daily_summary() -> None:
    notes = generate_standup_notes(engineer="Test Contributor")

    assert "Daily Async Standup Notes" in notes
    assert "What was accomplished since the last standup?" in notes
    assert "What are we working on next?" in notes
    assert "Blockers & Risks" in notes
