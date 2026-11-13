"""Architecture, GraphQL schema-contract, and threat-model invariant tests (Phase 3)."""

from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SCHEMA_PATH = ROOT / "api" / "graphql" / "schema.graphql"
THREAT_MODEL_PATH = ROOT / "docs" / "THREAT_MODEL.md"


def test_graphql_schema_enforces_decimal_money_and_no_float() -> None:
    """GraphQL contract must use DecimalMoney/DecimalRate and ban binary Float types."""
    schema_text = SCHEMA_PATH.read_text(encoding="utf-8")

    assert "scalar DecimalMoney" in schema_text
    assert "scalar DecimalRate" in schema_text
    assert re.search(r":\s*Float\b", schema_text) is None


def test_graphql_schema_covers_flagship_packs_and_security_controls() -> None:
    """Ensure Flagship Packs, Custom Builder, RBAC, Pagination, and Error Unions exist."""
    schema_text = SCHEMA_PATH.read_text(encoding="utf-8")

    for pack_enum in (
        "RETAIL_ECOMMERCE",
        "WHOLESALE_DISTRIBUTION",
        "MANUFACTURING_LIGHT",
        "CONSTRUCTION_TRADES",
        "PROFESSIONAL_SERVICES",
        "NON_PROFIT",
        "CUSTOM_COMPOSABLE",
    ):
        assert pack_enum in schema_text

    for required_symbol in (
        "directive @requireRole",
        "directive @cost",
        "type JournalVoucherConnection",
        "type AuditEventConnection",
        "type UnbalancedJournalError implements MutationError",
        "type ClosedPeriodError implements MutationError",
        "type SegregationOfDutiesError implements MutationError",
        "type CrossTenantAccessError implements MutationError",
        "idempotencyKey: UUID!",
    ):
        assert required_symbol in schema_text


def test_graphql_tax_preview_input_disallows_caller_rate_override() -> None:
    """SEC-REQ-04: Callers select supplyCategoryCode/date, never statutory tax percentage."""
    schema_text = SCHEMA_PATH.read_text(encoding="utf-8")
    match = re.search(
        r"input PreviewNigerianTaxInput\s*\{(?P<body>[^}]*)\}",
        schema_text,
        re.MULTILINE,
    )
    assert match is not None
    body = match.group("body")
    assert "supplyCategoryCode: String!" in body
    assert "appliedRate" not in body
    assert "taxRate" not in body


def test_threat_model_contains_stride_and_security_requirements() -> None:
    """All STRIDE categories and SEC-REQ-01..12 must be documented in docs/THREAT_MODEL.md."""
    text = THREAT_MODEL_PATH.read_text(encoding="utf-8")

    for req_num in range(1, 13):
        assert f"SEC-REQ-{req_num:02d}" in text

    for category in (
        "**Spoofing**",
        "**Tampering**",
        "**Repudiation**",
        "**Info Disclosure**",
        "**Denial of Service**",
        "**Elevation of Privilege**",
    ):
        assert category in text
