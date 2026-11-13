"""Tests for Track 3 Phase 2: Hybrid Multi-Unit Composition, Ledger Apply & Pack API."""

from __future__ import annotations

import json
from datetime import date
from decimal import Decimal
from typing import cast
from uuid import UUID, uuid4

from nairabooks.api.app import LedgerApiApplication
from nairabooks.ledger.adapters.in_memory import create_seeded_demo_store
from nairabooks.ledger.application import (
    GenerateFrcnPackageUseCase,
    PostJournalVoucherCommand,
    PostJournalVoucherUseCase,
)
from nairabooks.ledger.domain import JournalLineInput
from nairabooks.packs.adapters.in_memory import InMemoryPackStore
from nairabooks.packs.application import (
    ComposeCustomPackCommand,
    ComposeCustomPackPreviewUseCase,
    ConfigureIndustryPackCommand,
    ConfigureIndustryPackUseCase,
)
from nairabooks.packs.domain import (
    FlagshipPackCode,
    OperationalPrimitive,
    build_manifest_from_primitives,
    compose_hybrid_pack,
)


def _as_dict(value: object) -> dict[str, object]:
    assert isinstance(value, dict)
    return cast(dict[str, object], value)


def test_hybrid_retail_manufacturing_and_hotel_diner_composition() -> None:
    """Multiple business units merge cleanly into one unified WorkspaceIndustryProfile."""
    workspace_id = uuid4()
    retail_mfg = compose_hybrid_pack(
        workspace_id=workspace_id,
        primary_pack=FlagshipPackCode.RETAIL_ECOMMERCE,
        manifests=[
            build_manifest_from_primitives(
                pack_code=FlagshipPackCode.RETAIL_ECOMMERCE,
                display_name="Retail Front",
                primitives=(
                    OperationalPrimitive.POS_DAILY_CASHUP,
                    OperationalPrimitive.SKU_INVENTORY_COGS,
                ),
            ),
            build_manifest_from_primitives(
                pack_code=FlagshipPackCode.MANUFACTURING_LIGHT,
                display_name="Bakery Workshop",
                primitives=(OperationalPrimitive.BILL_OF_MATERIALS_WIP,),
            ),
        ],
    )
    assert retail_mfg.is_hybrid_multi_unit is True
    merged_codes = {acct.code for acct in retail_mfg.coa_accounts}
    assert {"1210", "1310", "1330", "1340", "4020", "5020", "5040"}.issubset(merged_codes)
    assert any(dim.key == "business_unit" for dim in retail_mfg.dimensions)

    hotel_diner = compose_hybrid_pack(
        workspace_id=workspace_id,
        primary_pack=FlagshipPackCode.CUSTOM_COMPOSABLE,
        manifests=[
            build_manifest_from_primitives(
                pack_code=FlagshipPackCode.CUSTOM_COMPOSABLE,
                display_name="Boutique Hotel & Bistro",
                primitives=(
                    OperationalPrimitive.HOSPITALITY_FOLIO_USALI,
                    OperationalPrimitive.DINER_RECIPE_TABLE,
                ),
                terminology_overrides={"customer": "Guest", "invoice": "Guest Folio / Check"},
            )
        ],
        is_hybrid_multi_unit=True,
    )
    assert hotel_diner.tax_defaults.include_state_consumption_tax is True
    assert hotel_diner.tax_defaults.default_service_charge_rate == "0.100000"
    assert hotel_diner.terminology_map["customer"] == "Guest"
    assert "revpar" in hotel_diner.kpi_widgets
    assert "food_cost_pct" in hotel_diner.kpi_widgets


def test_configured_hybrid_pack_provisions_accounts_and_posts_balanced_ifrs_reports() -> None:
    """Composed pack creates ChartOfAccount rows enabling balanced IFRS journals & FRCN reports."""
    workspace_id = UUID("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0001")
    actor_id = UUID("bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbb0001")
    ledger_store = create_seeded_demo_store(workspace_id=workspace_id, actor_user_id=actor_id)
    pack_store = InMemoryPackStore()

    use_case = ConfigureIndustryPackUseCase(pack_store=pack_store, ledger_store=ledger_store)
    profile = use_case.execute(
        ConfigureIndustryPackCommand(
            workspace_id=workspace_id,
            primary_pack=FlagshipPackCode.CUSTOM_COMPOSABLE,
            is_hybrid_multi_unit=True,
            primitives=(
                OperationalPrimitive.HOSPITALITY_FOLIO_USALI,
                OperationalPrimitive.DINER_RECIPE_TABLE,
            ),
            terminology_overrides={"customer": "Hospitality Guest"},
        )
    )
    assert profile.terminology_map["customer"] == "Hospitality Guest"

    accounts_by_code = {a.code: a for a in ledger_store.list_accounts(workspace_id=workspace_id)}
    assert "4050" in accounts_by_code
    assert "4060" in accounts_by_code
    assert "1010" in accounts_by_code

    post_uc = PostJournalVoucherUseCase(ledger_store)
    post_uc.execute(
        PostJournalVoucherCommand(
            workspace_id=workspace_id,
            actor_user_id=actor_id,
            idempotency_key=uuid4(),
            posting_date=date(2026, 6, 1),
            reference="HTL-001",
            source_module="HOSPITALITY_FOLIO_USALI",
            lines=(
                JournalLineInput(
                    account_id=accounts_by_code["1010"].id,
                    debit_amount="150000.00",
                    credit_amount="0.00",
                ),
                JournalLineInput(
                    account_id=accounts_by_code["4050"].id,
                    debit_amount="0.00",
                    credit_amount="100000.00",
                ),
                JournalLineInput(
                    account_id=accounts_by_code["4060"].id,
                    debit_amount="0.00",
                    credit_amount="50000.00",
                ),
            ),
        )
    )

    periods = ledger_store.list_periods(workspace_id=workspace_id)
    fy2026 = next(p for p in periods if p.label == "FY2026")
    pkg = GenerateFrcnPackageUseCase(ledger_store).execute(
        workspace_id=workspace_id,
        fiscal_period_id=fy2026.id,
    )
    assert pkg.trial_balance.is_balanced is True
    assert pkg.profit_and_loss.total_revenue_ngn == Decimal("150000.00")


def test_pack_graphql_and_rest_api_endpoints() -> None:
    """GraphQL configureIndustryPack and REST /api/v1/packs/* endpoints behave cleanly."""
    workspace_id = UUID("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0001")
    actor_id = UUID("bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbb0001")
    ledger_store = create_seeded_demo_store(workspace_id=workspace_id, actor_user_id=actor_id)
    app = LedgerApiApplication(ledger_store)
    headers = {"X-Workspace-Id": str(workspace_id), "X-Actor-User-Id": str(actor_id)}

    st_prim, body_prim = app.handle_request(
        method="GET",
        path="/api/v1/packs/primitives",
        headers=headers,
    )
    assert st_prim == 200
    items = body_prim["items"]
    assert isinstance(items, list) and len(items) == 10

    gql = {
        "query": (
            "mutation ConfigureIndustryPack($input: ConfigureIndustryPackInput!) { "
            "configureIndustryPack(input: $input) { ... on WorkspaceIndustryProfile "
            "{ id primaryPack isHybridMultiUnit kpiWidgets } } }"
        ),
        "variables": {
            "input": {
                "primaryPack": "CUSTOM_COMPOSABLE",
                "isHybridMultiUnit": True,
                "primitives": ["POS_DAILY_CASHUP", "LOGISTICS_FLEET_TRIP"],
                "terminologyOverrides": {"project": "Delivery Waybill"},
            }
        },
    }
    st_gql, body_gql = app.handle_request(
        method="POST",
        path="/graphql",
        headers=headers,
        body=json.dumps(gql).encode("utf-8"),
    )
    assert st_gql == 200
    profile = _as_dict(_as_dict(body_gql["data"])["configureIndustryPack"])
    assert profile["primaryPack"] == "CUSTOM_COMPOSABLE"
    assert profile["isHybridMultiUnit"] is True
    assert _as_dict(profile["terminologyMap"])["project"] == "Delivery Waybill"

    # Empty primitives rejected cleanly via ComposeCustomPackPreviewUseCase / REST endpoint
    st_bad, body_bad = app.handle_request(
        method="POST",
        path="/api/v1/packs/compose-preview",
        headers=headers,
        body=json.dumps({"primaryPack": "CUSTOM_COMPOSABLE", "primitives": []}).encode("utf-8"),
    )
    assert st_bad == 400
    assert body_bad["__typename"] == "ValidationError"
    assert isinstance(ComposeCustomPackPreviewUseCase, type)
    assert isinstance(ComposeCustomPackCommand, type)
