"""Diagnostic and Trace Analysis Engine for NairaBooks.

Provides structured trace correlation, secret sanitization, and automated
root-cause analysis for financial and accounting system errors.
Activated by: `debugger`, `debugging-strategies`, `error-detective`,
`debugging-toolkit-smart-debug`, `error-debugging-error-analysis`,
and `distributed-debugging-debug-trace`.
"""

from __future__ import annotations

import re
import traceback
import uuid
from collections.abc import Mapping
from dataclasses import dataclass, field
from datetime import UTC, datetime
from typing import Any

SECRET_PATTERNS = [
    re.compile(
        r"(password|secret|token|api_key|authorization)\s*[:=]\s*['\"]?([^'\",\s]+)",
        re.IGNORECASE,
    ),
    re.compile(r"(Bearer\s+)[A-Za-z0-9\-._~+/]+=*", re.IGNORECASE),
]


def sanitize_trace_message(message: str) -> str:
    """Mask credentials, bearer tokens, and sensitive secrets from trace logs."""
    sanitized = message
    for pattern in SECRET_PATTERNS:
        sanitized = pattern.sub(r"\1: [REDACTED]", sanitized)
    return sanitized


@dataclass(frozen=True)
class DiagnosticFrame:
    filename: str
    line_number: int
    function_name: str
    code_context: str


@dataclass
class DiagnosticTrace:
    correlation_id: str = field(default_factory=lambda: f"corr-{uuid.uuid4().hex[:12]}")
    tenant_id: str = "default-tenant"
    user_id: str | None = None
    operation: str = "unknown_operation"
    timestamp: str = field(default_factory=lambda: datetime.now(UTC).isoformat())
    error_type: str | None = None
    error_message: str | None = None
    root_cause_category: str | None = None
    recommended_action: str | None = None
    stack_frames: list[DiagnosticFrame] = field(default_factory=list)
    metadata: dict[str, Any] = field(default_factory=dict)


class DiagnosticErrorDetective:
    """Root-cause analyzer and remediation counselor."""

    @classmethod
    def analyze_exception(
        cls,
        exc: Exception,
        *,
        operation: str,
        tenant_id: str = "default-tenant",
        user_id: str | None = None,
        context: Mapping[str, Any] | None = None,
    ) -> DiagnosticTrace:
        msg = sanitize_trace_message(str(exc))
        exc_type = type(exc).__name__

        # Extract frames safely
        raw_tb = traceback.extract_tb(exc.__traceback__) if exc.__traceback__ else []
        frames = [
            DiagnosticFrame(
                filename=f.filename,
                line_number=f.lineno or 0,
                function_name=f.name,
                code_context=f.line.strip() if f.line else "",
            )
            for f in raw_tb[-5:]  # Keep the 5 most relevant inner frames
        ]

        # Categorize root cause
        category = "UNKNOWN_ERROR"
        recommendation = "Inspect application logs with correlation ID."

        lower_msg = msg.lower()
        if any(k in lower_msg for k in ("unbalanced", "out of balance", "sum of debits")):
            category = "ACCOUNTING_UNBALANCED_JOURNAL"
            recommendation = (
                "Verify debit and credit lines match exactly in kobo. "
                "Ensure VAT (7.5%) and WHT deductions are correctly offset."
            )
        elif any(k in lower_msg for k in ("crosstenant", "forbidden tenant", "workspace")):
            category = "SECURITY_CROSS_TENANT_VIOLATION"
            recommendation = (
                "Check tenant header 'X-Workspace-Id' matches the authenticated session claims."
            )
        elif "period" in lower_msg and ("closed" in lower_msg or "locked" in lower_msg):
            category = "STATUTORY_FISCAL_PERIOD_LOCKED"
            recommendation = (
                "Transaction date falls in a certified/locked fiscal period. "
                "CAMA 2020 requires posting an adjusting entry in the current open period."
            )
        elif "tax" in lower_msg or "wht" in lower_msg or "vat" in lower_msg:
            category = "TAX_REGULATORY_MISMATCH"
            recommendation = (
                "Ensure tax rate matches Nigeria Tax Act 2025 statutory thresholds "
                "(VAT=7.5%, WHT=2%/5%/10%)."
            )

        meta = dict(context or {})
        return DiagnosticTrace(
            tenant_id=tenant_id,
            user_id=user_id,
            operation=operation,
            error_type=exc_type,
            error_message=msg,
            root_cause_category=category,
            recommended_action=recommendation,
            stack_frames=frames,
            metadata=meta,
        )
