"""Tests for Track 4 Phase 1: Retail, Wholesale & Manufacturing Light Flagship Packs."""

from __future__ import annotations

import json
from datetime import date
from decimal import Decimal
from typing import cast
from uuid import UUID, uuid4

import pytest

from nairabooks.api.app import LedgerApiApplication
from nairabooks.ledger.adapters.in_memory import create_seeded_demo_store
from nairabooks.ledger.application import GenerateFrcnPackageUseCase
from nairabooks.ledger.domain import ValidationError
from nairabooks.packs.adapters.in_memory import InMemoryPackStore
from nairabooks.packs.application import (
    ApplyFlagshipPackCommand,
    ApplyFlagshipPackUseCase,
    ListFlagshipPacksUseCase,
    PostPackOperationCommand,
    PostPackOperationUseCase,
)
from nairabooks.packs.domain import (
    FLAGSHIP_PACK_CATALOG,
    FlagshipPackCode,
    ManufacturingBomRunInput,
    PackOperationType,
    RetailPosCashupInput,
    WholesaleLandedPurchaseInput,
    build_manufacturing_bom_plan,
    build_retail_pos_cashup_plan,
    build_wholesale_landed_purchase_plan,
)


def _as_dict(value: object) -> dict[str, object]:
    assert isinstance(value, dict)
    return cast(dict[str, object], value)


def test_flagship_catalog_covers_all_six_reference_packs() -> None:
    """All 6 flagship Nigerian industry packs ship with non-empty presets and KPIs."""
    specs = ListFlagshipPacksUseCase().execute()
    codes = {spec.pack_code for spec in specs}
    assert codes == {
        FlagshipPackCode.RETAIL_ECOMMERCE,
        FlagshipPackCode.WHOLESALE_DISTRIBUTION,
        FlagshipPackCode.MANUFACTURING_LIGHT,
        FlagshipPackCode.CONSTRUCTION_TRADES,
        FlagshipPackCode.PROFESSIONAL_SERVICES,
        FlagshipPackCode.NON_PROFIT,
    }
    assert len(FLAGSHIP_PACK_CATALOG) == 6
    retail = FLAGSHIP_PACK_CATALOG[FlagshipPackCode.RETAIL_ECOMMERCE]
    assert "POS_DAILY_CASHUP" in {p.value for p in retail.recommended_primitives}
    assert "SKU_INVENTORY_COGS" in {p.value for p in retail.recommended_primitives}


def test_retail_pos_cashup_plan_and_ifrs_posting() -> None:
    """Task 1.1: Retail POS daily cash-up computes VAT 7.5%, MDR clearing, and SKU COGS."""
    workspace_id = UUID("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0001")
    actor_id = UUID("bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbb0001")
    ledger_store = create_seeded_demo_store(workspace_id=workspace_id, actor_user_id=actor_id)
    pack_store = InMemoryPackStore()

    ApplyFlagshipPackUseCase(pack_store=pack_store, ledger_store=ledger_store).execute(
        ApplyFlagshipPackCommand(
            workspace_id=workspace_id,
            pack_code=FlagshipPackCode.RETAIL_ECOMMERCE,
        )
    )

    plan = build_retail_pos_cashup_plan(
        RetailPosCashupInput(
            reference="POS-Z-20260602",
            gross_sales_ngn="107500.00",
            cash_tender_ngn="30000.00",
            pos_card_tender_ngn="77500.00",
            pos_mdr_fee_ngn="1162.50",
            cogs_ngn="60000.00",
            vat_inclusive=True,
        )
    )
    assert plan.metrics["netRevenueNgn"] == "100000.00"
    assert plan.metrics["vatAmountNgn"] == "7500.00"
    assert plan.metrics["grossMarginNgn"] == "40000.00"
    total_dr = sum(line.debit_ngn for line in plan.lines)
    total_cr = sum(line.credit_ngn for line in plan.lines)
    assert total_dr == total_cr

    voucher = PostPackOperationUseCase(ledger_store).execute(
        PostPackOperationCommand(
            workspace_id=workspace_id,
            actor_user_id=actor_id,
            idempotency_key=uuid4(),
            posting_date=date(2026, 6, 2),
            operation_type=PackOperationType.RETAIL_POS_CASHUP,
            reference="POS-Z-20260602",
            payload={
                "grossSalesNgn": "107500.00",
                "cashTenderNgn": "30000.00",
                "posCardTenderNgn": "77500.00",
                "posMdrFeeNgn": "1162.50",
                "cogsNgn": "60000.00",
                "vatInclusive": True,
            },
        )
    )
    assert voucher.total_debit_ngn == Decimal("167500.00")

    fy2026 = next(p for p in ledger_store.list_periods(workspace_id) if p.label == "FY2026")
    pkg = GenerateFrcnPackageUseCase(ledger_store).execute(
        workspace_id=workspace_id,
        fiscal_period_id=fy2026.id,
    )
    assert pkg.trial_balance.is_balanced is True
    assert pkg.profit_and_loss.total_revenue_ngn == Decimal("100000.00")

    with pytest.raises(ValidationError):
        build_retail_pos_cashup_plan(
            RetailPosCashupInput(
                reference="POS-BAD",
                gross_sales_ngn="50000.00",
                cash_tender_ngn="20000.00",
                pos_card_tender_ngn="20000.00",
                pos_mdr_fee_ngn="0.00",
                cogs_ngn="10000.00",
            )
        )


def test_wholesale_landed_cost_and_manufacturing_bom_balance_to_the_kobo() -> None:
    """Tasks 1.2 & 1.3: Wholesale landed cost & BOM production post kobo-balanced IFRS journals."""
    workspace_id = UUID("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0001")
    actor_id = UUID("bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbb0001")
    ledger_store = create_seeded_demo_store(workspace_id=workspace_id, actor_user_id=actor_id)
    pack_store = InMemoryPackStore()

    apply_uc = ApplyFlagshipPackUseCase(pack_store=pack_store, ledger_store=ledger_store)
    apply_uc.execute(
        ApplyFlagshipPackCommand(
            workspace_id=workspace_id,
            pack_code=FlagshipPackCode.WHOLESALE_DISTRIBUTION,
        )
    )
    apply_uc.execute(
        ApplyFlagshipPackCommand(
            workspace_id=workspace_id,
            pack_code=FlagshipPackCode.MANUFACTURING_LIGHT,
        )
    )

    wholesale_plan = build_wholesale_landed_purchase_plan(
        WholesaleLandedPurchaseInput(
            reference="PO-APAPA-019",
            units_received=100,
            supplier_invoice_ngn="500000.00",
            freight_and_clearing_ngn="150000.00",
            selling_price_per_unit_ngn="8500.00",
        )
    )
    assert wholesale_plan.metrics["totalLandedCostNgn"] == "650000.00"
    assert wholesale_plan.metrics["unitLandedCostNgn"] == "6500.00"
    assert wholesale_plan.metrics["projectedGrossMarginPct"] == "23.53"

    post_uc = PostPackOperationUseCase(ledger_store)
    post_uc.execute(
        PostPackOperationCommand(
            workspace_id=workspace_id,
            actor_user_id=actor_id,
            idempotency_key=uuid4(),
            posting_date=date(2026, 6, 3),
            operation_type=PackOperationType.WHOLESALE_LANDED_RECEIPT,
            reference="PO-APAPA-019",
            payload={
                "unitsReceived": 100,
                "supplierInvoiceNgn": "500000.00",
                "freightAndClearingNgn": "150000.00",
                "sellingPricePerUnitNgn": "8500.00",
            },
        )
    )

    bom_plan = build_manufacturing_bom_plan(
        ManufacturingBomRunInput(
            reference="BOM-BAKE-042",
            raw_materials_issued_ngn="400000.00",
            direct_conversion_cost_ngn="100000.00",
            scrap_spoilage_ngn="25000.00",
            units_produced=50,
        )
    )
    assert bom_plan.metrics["finishedGoodsCostNgn"] == "475000.00"
    assert bom_plan.metrics["unitCostNgn"] == "9500.00"
    assert bom_plan.metrics["yieldPct"] == "95.00"

    post_uc.execute(
        PostPackOperationCommand(
            workspace_id=workspace_id,
            actor_user_id=actor_id,
            idempotency_key=uuid4(),
            posting_date=date(2026, 6, 4),
            operation_type=PackOperationType.MANUFACTURING_BOM_RUN,
            reference="BOM-BAKE-042",
            payload={
                "rawMaterialsIssuedNgn": "400000.00",
                "directConversionCostNgn": "100000.00",
                "scrapSpoilageNgn": "25000.00",
                "unitsProduced": 50,
            },
        )
    )

    fy2026 = next(p for p in ledger_store.list_periods(workspace_id) if p.label == "FY2026")
    pkg = GenerateFrcnPackageUseCase(ledger_store).execute(
        workspace_id=workspace_id,
        fiscal_period_id=fy2026.id,
    )
    assert pkg.trial_balance.is_balanced is True
    tb_by_code = {row.account_code: row for row in pkg.trial_balance.rows}
    assert tb_by_code["1310"].debit_balance_ngn == Decimal("1125000.00")
    assert (
        tb_by_code.get("1340") is None
        or tb_by_code["1340"].debit_balance_ngn == Decimal("0.00")
    )
    assert tb_by_code["5040"].debit_balance_ngn == Decimal("25000.00")


def test_flagship_packs_and_operations_api_routes() -> None:
    """REST endpoints list 6 flagships, apply a flagship pack, and post operational vouchers."""
    workspace_id = UUID("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0001")
    actor_id = UUID("bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbb0001")
    ledger_store = create_seeded_demo_store(workspace_id=workspace_id, actor_user_id=actor_id)
    app = LedgerApiApplication(ledger_store)
    headers = {"X-Workspace-Id": str(workspace_id), "X-Actor-User-Id": str(actor_id)}

    st_list, body_list = app.handle_request(
        method="GET",
        path="/api/v1/packs/flagships",
        headers=headers,
    )
    assert st_list == 200
    assert len(cast(list[object], body_list["items"])) == 6

    st_apply, body_apply = app.handle_request(
        method="POST",
        path="/api/v1/packs/flagships/apply",
        headers=headers,
        body=json.dumps({"packCode": "RETAIL_ECOMMERCE"}).encode("utf-8"),
    )
    assert st_apply == 200
    assert body_apply["primaryPack"] == "RETAIL_ECOMMERCE"

    st_op, body_op = app.handle_request(
        method="POST",
        path="/api/v1/packs/operations/post",
        headers=headers,
        body=json.dumps(
            {
                "operationType": "RETAIL_POS_CASHUP",
                "postingDate": "2026-06-05",
                "reference": "POS-API-001",
                "payload": {
                    "grossSalesNgn": "53750.00",
                    "cashTenderNgn": "20000.00",
                    "posCardTenderNgn": "33750.00",
                    "posMdrFeeNgn": "500.00",
                    "cogsNgn": "30000.00",
                    "vatInclusive": True,
                },
            }
        ).encode("utf-8"),
    )
    assert st_op == 201
    voucher = _as_dict(body_op["voucher"])
    assert voucher["sourceModule"] == "RETAIL_POS_CASHUP"
    metrics = _as_dict(body_op["metrics"])
    assert metrics["netRevenueNgn"] == "50000.00"
