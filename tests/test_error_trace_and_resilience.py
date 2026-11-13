"""Tests for diagnostics, structured trace correlation, and root-cause analysis."""

from __future__ import annotations

from decimal import Decimal

from nairabooks.diagnostics import (
    DiagnosticErrorDetective,
    sanitize_trace_message,
)
from nairabooks.ledger.domain.errors import UnbalancedJournalError


def test_sanitize_trace_message_removes_secrets() -> None:
    raw = "User login failed with password='superSecret123' and Bearer eyJhbGciOiJIUzI1NiJ9"
    sanitized = sanitize_trace_message(raw)
    assert "superSecret123" not in sanitized
    assert "REDACTED" in sanitized


def test_error_detective_classifies_unbalanced_journal() -> None:
    try:
        raise UnbalancedJournalError(Decimal("1000.00"), Decimal("900.00"))
    except Exception as exc:
        trace = DiagnosticErrorDetective.analyze_exception(
            exc,
            operation="post_journal_voucher",
            tenant_id="tenant-abuja",
            user_id="usr-bookkeeper-01",
        )

    assert trace.root_cause_category == "ACCOUNTING_UNBALANCED_JOURNAL"
    assert "Verify debit and credit lines match" in (trace.recommended_action or "")
    assert trace.tenant_id == "tenant-abuja"
    assert trace.operation == "post_journal_voucher"
    assert trace.correlation_id.startswith("corr-")
    assert len(trace.stack_frames) > 0


def test_error_detective_classifies_cross_tenant_violation() -> None:
    try:
        raise PermissionError("Forbidden tenant workspace cross-access attempt detected")
    except Exception as exc:
        trace = DiagnosticErrorDetective.analyze_exception(
            exc,
            operation="fetch_tenant_ledger",
            tenant_id="tenant-malicious",
        )

    assert trace.root_cause_category == "SECURITY_CROSS_TENANT_VIOLATION"
    assert "X-Workspace-Id" in (trace.recommended_action or "")


def test_error_detective_classifies_locked_period() -> None:
    try:
        raise ValueError("Cannot post to fiscal period 2026-09: period is closed and certified")
    except Exception as exc:
        trace = DiagnosticErrorDetective.analyze_exception(
            exc,
            operation="post_standard_transaction",
            tenant_id="tenant-kano",
        )

    assert trace.root_cause_category == "STATUTORY_FISCAL_PERIOD_LOCKED"
    assert "CAMA 2020" in (trace.recommended_action or "")
