from __future__ import annotations

import json
from typing import cast
from uuid import UUID, uuid4

from nairabooks.api.app import LedgerApiApplication
from nairabooks.api.graphql_guards import validate_graphql_query
from nairabooks.ledger.adapters.in_memory import create_seeded_demo_store


def _as_dict(value: object) -> dict[str, object]:
    assert isinstance(value, dict)
    return cast(dict[str, object], value)


def _as_list(value: object) -> list[dict[str, object]]:
    assert isinstance(value, list)
    return [cast(dict[str, object], item) for item in value]


def _context() -> tuple[LedgerApiApplication, UUID, UUID]:
    workspace_id = UUID("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0001")
    actor_id = UUID("bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbb0001")
    store = create_seeded_demo_store(workspace_id=workspace_id, actor_user_id=actor_id)
    return LedgerApiApplication(store), workspace_id, actor_id


def test_graphql_depth_and_cost_guards() -> None:
    shallow = "query { chartOfAccounts { id code name } }"
    validate_graphql_query(shallow)

    deep = (
        "query { a { b { c { d { e { f { g { h { i { id } } } } } } } } } }"
    )
    res_depth = validate_graphql_query(deep, raise_on_error=False)
    assert res_depth is not None
    assert res_depth["code"] == "VALIDATION_ERROR"


def test_api_rejects_raw_json_floats_and_returns_typed_union_errors() -> None:
    app, workspace_id, actor_id = _context()
    bad_float_body = (
        '{"idempotencyKey":"' + str(uuid4()) + '",'
        '"postingDate":"2026-04-01",'
        '"reference":"FLT-001",'
        '"sourceModule":"GENERAL_LEDGER",'
        '"lines":['
        '{"accountId":"11111111-1111-4111-8111-111111110101",'
        '"debitAmount":100.5,"creditAmount":"0.00","currency":"NGN","exchangeRateToNgn":"1.000000"},'
        '{"accountId":"11111111-1111-4111-8111-111111110401",'
        '"debitAmount":"0.00","creditAmount":"100.50","currency":"NGN","exchangeRateToNgn":"1.000000"}'
        "]}"
    ).encode("utf-8")

    status, payload = app.handle_request(
        method="POST",
        path="/api/v1/ledger/vouchers",
        headers={"X-Workspace-Id": str(workspace_id), "X-Actor-User-Id": str(actor_id)},
        body=bad_float_body,
    )
    assert status == 400
    assert payload["__typename"] == "ValidationError"
    assert payload["code"] == "VALIDATION_ERROR"


def test_api_post_list_cursor_and_reverse_roundtrip_via_graphql_and_rest() -> None:
    app, workspace_id, actor_id = _context()
    headers = {"X-Workspace-Id": str(workspace_id), "X-Actor-User-Id": str(actor_id)}

    # Unbalanced returns UnbalancedJournalError union shape cleanly
    unbalanced_req = json.dumps(
        {
            "idempotencyKey": str(uuid4()),
            "postingDate": "2026-04-02",
            "reference": "UNBAL-001",
            "sourceModule": "GENERAL_LEDGER",
            "lines": [
                {
                    "accountId": "11111111-1111-4111-8111-111111110101",
                    "debitAmount": "50000.00",
                    "creditAmount": "0.00",
                    "currency": "NGN",
                    "exchangeRateToNgn": "1.000000",
                },
                {
                    "accountId": "11111111-1111-4111-8111-111111110401",
                    "debitAmount": "0.00",
                    "creditAmount": "45000.00",
                    "currency": "NGN",
                    "exchangeRateToNgn": "1.000000",
                },
            ],
        }
    ).encode("utf-8")
    status_err, body_err = app.handle_request(
        method="POST",
        path="/api/v1/ledger/vouchers",
        headers=headers,
        body=unbalanced_req,
    )
    assert status_err == 422
    assert body_err["__typename"] == "UnbalancedJournalError"
    assert body_err["totalDebitNgn"] == "50000.00"
    assert body_err["totalCreditNgn"] == "45000.00"

    # Valid GraphQL mutation postJournalVoucher
    gql_post = json.dumps(
        {
            "operationName": "PostJournalVoucher",
            "query": "mutation PostJournalVoucher($input: PostJournalVoucherInput!) { "
            "postJournalVoucher(input: $input) { __typename } }",
            "variables": {
                "input": {
                    "idempotencyKey": str(uuid4()),
                    "postingDate": "2026-04-03",
                    "reference": "GQL-SALE-01",
                    "sourceModule": "GENERAL_LEDGER",
                    "lines": [
                        {
                            "accountId": "11111111-1111-4111-8111-111111110101",
                            "debitAmount": "80000.00",
                            "creditAmount": "0.00",
                            "currency": "NGN",
                            "exchangeRateToNgn": "1.000000",
                            "memo": "Cash sale",
                        },
                        {
                            "accountId": "11111111-1111-4111-8111-111111110401",
                            "debitAmount": "0.00",
                            "creditAmount": "80000.00",
                            "currency": "NGN",
                            "exchangeRateToNgn": "1.000000",
                            "memo": "Revenue",
                        },
                    ],
                }
            },
        }
    ).encode("utf-8")
    status_gql, body_gql = app.handle_request(
        method="POST",
        path="/graphql",
        headers=headers,
        body=gql_post,
    )
    assert status_gql == 200
    gql_data = _as_dict(body_gql["data"])
    voucher_node = _as_dict(gql_data["postJournalVoucher"])
    assert voucher_node["__typename"] == "JournalVoucher"
    assert voucher_node["totalDebitNgn"] == "80000.00"
    assert isinstance(voucher_node["totalDebitNgn"], str)

    # Relay cursor pagination page size 1
    status_list1, page1 = app.handle_request(
        method="GET",
        path="/api/v1/ledger/vouchers?first=1",
        headers=headers,
        body=b"",
    )
    assert status_list1 == 200
    edges1 = _as_list(page1["edges"])
    page_info1 = _as_dict(page1["pageInfo"])
    assert len(edges1) == 1
    assert page_info1["hasNextPage"] is True
    cursor = str(page_info1["endCursor"])

    status_list2, page2 = app.handle_request(
        method="GET",
        path=f"/api/v1/ledger/vouchers?first=1&after={cursor}",
        headers=headers,
        body=b"",
    )
    assert status_list2 == 200
    edges2 = _as_list(page2["edges"])
    assert len(edges2) == 1
    assert _as_dict(edges2[0]["node"])["id"] != _as_dict(edges1[0]["node"])["id"]

    # Closed period test
    closed_req = json.dumps(
        {
            "idempotencyKey": str(uuid4()),
            "postingDate": "2025-11-01",
            "reference": "CLOSED-01",
            "sourceModule": "GENERAL_LEDGER",
            "lines": [
                {
                    "accountId": "11111111-1111-4111-8111-111111110101",
                    "debitAmount": "1000.00",
                    "creditAmount": "0.00",
                    "currency": "NGN",
                    "exchangeRateToNgn": "1.000000",
                },
                {
                    "accountId": "11111111-1111-4111-8111-111111110401",
                    "debitAmount": "0.00",
                    "creditAmount": "1000.00",
                    "currency": "NGN",
                    "exchangeRateToNgn": "1.000000",
                },
            ],
        }
    ).encode("utf-8")
    status_closed, body_closed = app.handle_request(
        method="POST",
        path="/api/v1/ledger/vouchers",
        headers=headers,
        body=closed_req,
    )
    assert status_closed == 422
    assert body_closed["__typename"] == "ClosedPeriodError"
    assert body_closed["periodLabel"] == "FY2025"
    assert body_closed["periodStatus"] == "CLOSED_CAMA_CERTIFIED"


def test_api_frcn_reports_reconciliation_and_fx_revaluation() -> None:
    app, workspace_id, actor_id = _context()
    headers = {"X-Workspace-Id": str(workspace_id), "X-Actor-User-Id": str(actor_id)}
    fy2026_id = "22222222-2222-4222-8222-222222220002"

    # GraphQL frcnFinancialPackage
    gql_req = json.dumps(
        {
            "query": (
                "query ($fiscalPeriodId: UUID!) { "
                "frcnFinancialPackage(fiscalPeriodId: $fiscalPeriodId) { isBalanced } }"
            ),
            "variables": {"fiscalPeriodId": fy2026_id},
        }
    ).encode("utf-8")
    gql_status, gql_body = app.handle_request(
        method="POST",
        path="/graphql",
        headers=headers,
        body=gql_req,
    )
    assert gql_status == 200
    pkg = _as_dict(_as_dict(gql_body["data"])["frcnFinancialPackage"])
    assert pkg["isBalanced"] is True

    # REST FRCN report endpoint
    rep_status, rep_body = app.handle_request(
        method="GET",
        path=f"/api/v1/ledger/reports/frcn?fiscalPeriodId={fy2026_id}",
        headers=headers,
        body=b"",
    )
    assert rep_status == 200
    assert rep_body["isBalanced"] is True
    assert len(_as_list(rep_body["trialBalance"])) == 2

    # Bank reconciliation matching opening capital deposit 2,500,000.00
    rec_req = json.dumps(
        {
            "accountId": "11111111-1111-4111-8111-111111110101",
            "throughDate": "2026-01-31",
            "statementLines": [
                {
                    "lineId": "BNK-OPEN-01",
                    "valueDate": "2026-01-05",
                    "amountNgn": "2500000.00",
                    "direction": "CREDIT",
                    "channel": "NIP_INFLOW",
                    "reference": "CAP-OPEN-2026",
                    "feeNgn": "0.00",
                }
            ],
        }
    ).encode("utf-8")
    rec_status, rec_body = app.handle_request(
        method="POST",
        path="/api/v1/ledger/reconcile/bank",
        headers=headers,
        body=rec_req,
    )
    assert rec_status == 200
    assert rec_body["matchedCount"] == 1

    # FX revaluation endpoint on USD domiciliary account
    fx_req = json.dumps(
        {
            "accountId": "11111111-1111-4111-8111-111111110102",
            "currency": "USD",
            "closingRateToNgn": "1610.000000",
            "asOfDate": "2026-03-31",
        }
    ).encode("utf-8")
    fx_status, fx_body = app.handle_request(
        method="POST",
        path="/api/v1/ledger/reconcile/fx-revaluation",
        headers=headers,
        body=fx_req,
    )
    assert fx_status == 200
    assert fx_body["currency"] == "USD"
    assert fx_body["unrealizedGainLossNgn"] == "0.00"
