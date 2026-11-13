"""API & GraphQL integration tests for the Nigerian Tax Rule Engine (SEC-REQ-04 + NRS)."""

from __future__ import annotations

import json
from typing import cast
from uuid import UUID

from nairabooks.api.app import LedgerApiApplication
from nairabooks.ledger.adapters.in_memory import create_seeded_demo_store


def _as_dict(value: object) -> dict[str, object]:
    assert isinstance(value, dict)
    return cast(dict[str, object], value)


def _headers(workspace_id: UUID, actor_id: UUID) -> dict[str, str]:
    return {
        "X-Workspace-Id": str(workspace_id),
        "X-Actor-User-Id": str(actor_id),
    }


def _app_and_headers() -> tuple[LedgerApiApplication, dict[str, str]]:
    workspace_id = UUID("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0001")
    actor_id = UUID("bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbb0001")
    store = create_seeded_demo_store(workspace_id=workspace_id, actor_user_id=actor_id)
    return LedgerApiApplication(store), _headers(workspace_id, actor_id)


def test_tax_profile_get_update_and_graphql_preview_flow() -> None:
    app, headers = _app_and_headers()

    status_get, profile_resp = app.handle_request(
        method="GET",
        path="/api/v1/tax/profile",
        headers=headers,
    )
    assert status_get == 200
    profile = _as_dict(profile_resp["profile"])
    evaluation = _as_dict(profile_resp["evaluation"])
    assert profile["legalForm"] == "PRIVATE_LIMITED"
    assert profile["isSmallBusinessCitExempt"] is True
    assert evaluation["applicableCitRate"] == "0.000000"

    # Update via GraphQL mutation to a Professional Services firm (excluded from 0% CIT)
    gql_update = {
        "query": (
            "mutation UpdateTaxProfile($input: UpdateTaxProfileInput!) { "
            "updateTaxProfile(input: $input) { id isSmallBusinessCitExempt } }"
        ),
        "variables": {
            "input": {
                "legalForm": "PRIVATE_LIMITED",
                "tinNumber": "20251234-0001",
                "vatRegistered": True,
                "annualTurnoverNgn": "88000000.00",
                "fixedAssetsNgn": "50000000.00",
                "stateOfOperation": "LAGOS",
                "isProfessionalServices": True,
            }
        },
    }
    status_gql_u, body_gql_u = app.handle_request(
        method="POST",
        path="/graphql",
        headers=headers,
        body=json.dumps(gql_update).encode("utf-8"),
    )
    assert status_gql_u == 200
    updated_gql = _as_dict(_as_dict(body_gql_u["data"])["updateTaxProfile"])
    assert updated_gql["isProfessionalServicesExcludedFromSmallExempt"] is True
    assert updated_gql["isSmallBusinessCitExempt"] is False

    # Preview WHT via GraphQL query with missing TIN -> doubled rate 10% for consulting
    gql_preview = {
        "query": (
            "query PreviewNigerianTax($input: PreviewNigerianTaxInput!) { "
            "previewNigerianTax(input: $input) { "
            "appliedRate computedTaxNgn whtHigherNoTinApplied } }"
        ),
        "variables": {
            "input": {
                "transactionDate": "2026-04-01",
                "regime": "WHT_CORPORATE_AND_UNINCORPORATED",
                "grossAmountNgn": "1000000.00",
                "counterpartyHasValidTin": False,
                "supplyCategoryCode": "WHT_PROFESSIONAL_CONSULTING",
            }
        },
    }
    status_gql_p, body_gql_p = app.handle_request(
        method="POST",
        path="/graphql",
        headers=headers,
        body=json.dumps(gql_preview).encode("utf-8"),
    )
    assert status_gql_p == 200
    preview = _as_dict(_as_dict(body_gql_p["data"])["previewNigerianTax"])
    assert preview["appliedRate"] == "0.100000"
    assert preview["computedTaxNgn"] == "100000.00"
    assert preview["whtHigherNoTinApplied"] is True


def test_tax_preview_rejects_caller_rate_override_and_floats_sec_req_04() -> None:
    app, headers = _app_and_headers()

    spoofed_rate = {
        "transactionDate": "2026-04-01",
        "regime": "VAT_STANDARD_7_5",
        "grossAmountNgn": "100000.00",
        "counterpartyHasValidTin": True,
        "supplyCategoryCode": "STANDARD_TAXABLE_SUPPLY",
        "appliedRate": "0.010000",
    }
    status_bad, body_bad = app.handle_request(
        method="POST",
        path="/api/v1/tax/preview",
        headers=headers,
        body=json.dumps(spoofed_rate).encode("utf-8"),
    )
    assert status_bad == 400
    assert body_bad["__typename"] == "ValidationError"

    # Also test REST multi-layer indirect + NRS TaxSubtotal endpoint
    indirect_req = {
        "transactionDate": "2026-05-01",
        "baseAmountNgn": "100000.00",
        "vatSupplyCategoryCode": "STANDARD_TAXABLE_SUPPLY",
        "vatRegime": "VAT_STANDARD_7_5",
        "includeStateConsumptionTax": True,
        "serviceChargeRate": "0.100000",
        "whtSupplyCategoryCode": "WHT_GOODS_SUPPLY",
        "counterpartyHasValidTin": True,
        "transactionDirection": "SALES",
    }
    status_ok, body_ok = app.handle_request(
        method="POST",
        path="/api/v1/tax/nrs-indirect-preview",
        headers=headers,
        body=json.dumps(indirect_req).encode("utf-8"),
    )
    assert status_ok == 200
    assert body_ok["vatAmountNgn"] == "7500.00"
    assert body_ok["stateConsumptionTaxNgn"] == "5000.00"
    assert body_ok["serviceChargeNgn"] == "10000.00"
    assert body_ok["whtDeductionNgn"] == "2000.00"
    assert body_ok["grossCustomerInvoiceNgn"] == "122500.00"
    assert body_ok["netCashPayableNgn"] == "120500.00"
