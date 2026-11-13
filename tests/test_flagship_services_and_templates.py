"""Tests for Track 4 Phases 2 & 3: Construction, Prof Services, Non-Profit & Hotel/Diner."""

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
    ConfigureIndustryPackCommand,
    ConfigureIndustryPackUseCase,
    PostPackOperationCommand,
    PostPackOperationUseCase,
)
from nairabooks.packs.domain import (
    ConstructionJobProgressInput,
    DinerServiceShiftInput,
    FlagshipPackCode,
    HospitalityFolioInput,
    NonProfitGrantActivityInput,
    OperationalPrimitive,
    PackOperationType,
    ProfessionalTimeBillingInput,
    build_construction_job_progress_plan,
    build_diner_service_shift_plan,
    build_hospitality_folio_plan,
    build_nonprofit_grant_activity_plan,
    build_professional_time_billing_plan,
)


def _as_dict(value: object) -> dict[str, object]:
    assert isinstance(value, dict)
    return cast(dict[str, object], value)


def test_construction_job_costing_retention_and_wht_doubling() -> None:
    """Task 2.1: Construction job valuation, retention (1140/2150), and 2%/5% WHT + No-TIN 2x."""
    workspace_id = UUID("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0001")
    actor_id = UUID("bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbb0001")
    ledger_store = create_seeded_demo_store(workspace_id=workspace_id, actor_user_id=actor_id)
    pack_store = InMemoryPackStore()

    ApplyFlagshipPackUseCase(pack_store=pack_store, ledger_store=ledger_store).execute(
        ApplyFlagshipPackCommand(
            workspace_id=workspace_id,
            pack_code=FlagshipPackCode.CONSTRUCTION_TRADES,
        )
    )

    plan = build_construction_job_progress_plan(
        ConstructionJobProgressInput(
            reference="VAL-LEKKI-01",
            project_site="Lekki Phase 1 Duplex",
            certified_valuation_ngn="2000000.00",
            client_retention_pct="5.00",
            materials_issued_ngn="300000.00",
            subcontractor_claim_ngn="1000000.00",
            subcontractor_retention_pct="5.00",
            subcontractor_wht_rate_pct="2.00",
            subcontractor_has_tin=True,
        )
    )
    assert plan.metrics["clientRetentionNgn"] == "100000.00"
    assert plan.metrics["subcontractorRetentionNgn"] == "50000.00"
    assert plan.metrics["subcontractorWhtNgn"] == "20000.00"
    assert plan.metrics["effectiveWhtRatePct"] == "2.00"
    assert plan.metrics["noTinDoublingApplied"] == "false"
    assert plan.metrics["totalSiteCostNgn"] == "1300000.00"
    assert plan.metrics["jobMarginNgn"] == "700000.00"
    assert plan.metrics["jobMarginPct"] == "35.00"
    assert sum(line.debit_ngn for line in plan.lines) == sum(
        line.credit_ngn for line in plan.lines
    )

    # No-TIN subcontractor triggers 2x WHT penalty (5% -> 10%)
    no_tin_plan = build_construction_job_progress_plan(
        ConstructionJobProgressInput(
            reference="VAL-LEKKI-02",
            project_site="Lekki Phase 1 Duplex",
            certified_valuation_ngn="0.00",
            client_retention_pct="0.00",
            materials_issued_ngn="0.00",
            subcontractor_claim_ngn="500000.00",
            subcontractor_retention_pct="10.00",
            subcontractor_wht_rate_pct="5.00",
            subcontractor_has_tin=False,
        )
    )
    assert no_tin_plan.metrics["effectiveWhtRatePct"] == "10.00"
    assert no_tin_plan.metrics["subcontractorWhtNgn"] == "50000.00"
    assert no_tin_plan.metrics["noTinDoublingApplied"] == "true"

    with pytest.raises(ValidationError, match="WHT"):
        build_construction_job_progress_plan(
            ConstructionJobProgressInput(
                reference="VAL-BAD-WHT",
                project_site="Ikoyi Annex",
                certified_valuation_ngn="100000.00",
                subcontractor_claim_ngn="50000.00",
                subcontractor_wht_rate_pct="3.00",
            )
        )

    PostPackOperationUseCase(ledger_store).execute(
        PostPackOperationCommand(
            workspace_id=workspace_id,
            actor_user_id=actor_id,
            idempotency_key=uuid4(),
            posting_date=date(2026, 6, 10),
            operation_type=PackOperationType.CONSTRUCTION_JOB_PROGRESS,
            reference="VAL-LEKKI-01",
            payload={
                "projectSite": "Lekki Phase 1 Duplex",
                "certifiedValuationNgn": "2000000.00",
                "clientRetentionPct": "5.00",
                "materialsIssuedNgn": "300000.00",
                "subcontractorClaimNgn": "1000000.00",
                "subcontractorRetentionPct": "5.00",
                "subcontractorWhtRatePct": "2.00",
                "subcontractorHasTin": True,
            },
        )
    )

    fy2026 = next(p for p in ledger_store.list_periods(workspace_id) if p.label == "FY2026")
    pkg = GenerateFrcnPackageUseCase(ledger_store).execute(
        workspace_id=workspace_id,
        fiscal_period_id=fy2026.id,
    )
    assert pkg.trial_balance.is_balanced is True
    assert pkg.profit_and_loss.total_revenue_ngn == Decimal("2000000.00")
    assert pkg.profit_and_loss.operating_expenses_ngn == Decimal("1300000.00")
    assert pkg.profit_and_loss.net_profit_ngn == Decimal("700000.00")
    tb_by_code = {row.account_code: row for row in pkg.trial_balance.rows}
    assert tb_by_code["1140"].debit_balance_ngn == Decimal("100000.00")
    assert tb_by_code["2120"].credit_balance_ngn == Decimal("20000.00")
    assert tb_by_code["2150"].credit_balance_ngn == Decimal("50000.00")


def test_professional_services_time_retainer_wht_and_cit_notice() -> None:
    """Task 2.2: Professional time realization, retainer drawdown, WHT credit & NTA 2025 CIT."""
    workspace_id = UUID("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0001")
    actor_id = UUID("bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbb0001")
    ledger_store = create_seeded_demo_store(workspace_id=workspace_id, actor_user_id=actor_id)
    pack_store = InMemoryPackStore()

    profile = ApplyFlagshipPackUseCase(pack_store=pack_store, ledger_store=ledger_store).execute(
        ApplyFlagshipPackCommand(
            workspace_id=workspace_id,
            pack_code=FlagshipPackCode.PROFESSIONAL_SERVICES,
        )
    )
    assert profile.tax_defaults.is_professional_services is True

    plan = build_professional_time_billing_plan(
        ProfessionalTimeBillingInput(
            reference="INV-ADV-2026-09",
            engagement_code="ENG-ZENITH-AUDIT",
            billable_hours="40.00",
            hourly_rate_ngn="25000.00",
            billed_fee_ngn="950000.00",
            retainer_applied_ngn="200000.00",
            reimbursable_expense_ngn="50000.00",
            wht_rate_pct="5.00",
            vat_applicable=True,
        )
    )
    assert plan.metrics["standardTimeValueNgn"] == "1000000.00"
    assert plan.metrics["realizationRatePct"] == "95.00"
    assert plan.metrics["vatAmountNgn"] == "71250.00"
    assert plan.metrics["whtCreditNgn"] == "47500.00"
    assert plan.metrics["netCashCollectedNgn"] == "823750.00"
    assert plan.metrics["citStatusNotice"] == "NON_EXEMPT_NTA_2025_CIT_APPLIES"
    assert sum(line.debit_ngn for line in plan.lines) == sum(
        line.credit_ngn for line in plan.lines
    )

    PostPackOperationUseCase(ledger_store).execute(
        PostPackOperationCommand(
            workspace_id=workspace_id,
            actor_user_id=actor_id,
            idempotency_key=uuid4(),
            posting_date=date(2026, 6, 11),
            operation_type=PackOperationType.PROFESSIONAL_TIME_BILLING,
            reference="INV-ADV-2026-09",
            payload={
                "engagementCode": "ENG-ZENITH-AUDIT",
                "billableHours": "40.00",
                "hourlyRateNgn": "25000.00",
                "billedFeeNgn": "950000.00",
                "retainerAppliedNgn": "200000.00",
                "reimbursableExpenseNgn": "50000.00",
                "whtRatePct": "5.00",
                "vatApplicable": True,
            },
        )
    )

    fy2026 = next(p for p in ledger_store.list_periods(workspace_id) if p.label == "FY2026")
    pkg = GenerateFrcnPackageUseCase(ledger_store).execute(
        workspace_id=workspace_id,
        fiscal_period_id=fy2026.id,
    )
    assert pkg.trial_balance.is_balanced is True
    assert pkg.profit_and_loss.total_revenue_ngn == Decimal("950000.00")
    tb_by_code = {row.account_code: row for row in pkg.trial_balance.rows}
    assert tb_by_code["1150"].debit_balance_ngn == Decimal("47500.00")
    assert tb_by_code["2160"].debit_balance_ngn == Decimal("200000.00")
    assert (
        tb_by_code.get("1130") is None
        or tb_by_code["1130"].debit_balance_ngn == Decimal("0.00")
    )


def test_nonprofit_restricted_grant_and_budget_vs_actual_reporting() -> None:
    """Task 2.3: Non-Profit restricted fund release, unrestricted income & budget-vs-actual."""
    workspace_id = UUID("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0001")
    actor_id = UUID("bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbb0001")
    ledger_store = create_seeded_demo_store(workspace_id=workspace_id, actor_user_id=actor_id)
    pack_store = InMemoryPackStore()

    profile = ApplyFlagshipPackUseCase(pack_store=pack_store, ledger_store=ledger_store).execute(
        ApplyFlagshipPackCommand(
            workspace_id=workspace_id,
            pack_code=FlagshipPackCode.NON_PROFIT,
        )
    )
    assert profile.tax_defaults.vat_registered is False

    restricted_plan = build_nonprofit_grant_activity_plan(
        NonProfitGrantActivityInput(
            reference="GRANT-MALARIA-Q2",
            donor_fund_name="Sahel Malaria Relief Fund",
            fund_restriction="RESTRICTED",
            approved_budget_ngn="5000000.00",
            tranche_received_ngn="3000000.00",
            program_spend_ngn="1800000.00",
            prior_spend_ngn="2500000.00",
        )
    )
    assert restricted_plan.metrics["totalActualSpendNgn"] == "4300000.00"
    assert restricted_plan.metrics["remainingBudgetNgn"] == "700000.00"
    assert restricted_plan.metrics["burnRatePct"] == "86.00"
    assert restricted_plan.metrics["budgetStatus"] == "APPROACHING_CAP"
    assert restricted_plan.metrics["restrictedNetBalanceDeltaNgn"] == "1200000.00"
    assert restricted_plan.metrics["vatStatus"] == "VAT_EXEMPT_CHARITABLE_DEFAULT"
    assert sum(line.debit_ngn for line in restricted_plan.lines) == sum(
        line.credit_ngn for line in restricted_plan.lines
    )

    post_uc = PostPackOperationUseCase(ledger_store)
    post_uc.execute(
        PostPackOperationCommand(
            workspace_id=workspace_id,
            actor_user_id=actor_id,
            idempotency_key=uuid4(),
            posting_date=date(2026, 6, 12),
            operation_type=PackOperationType.NONPROFIT_GRANT_ACTIVITY,
            reference="GRANT-MALARIA-Q2",
            payload={
                "donorFundName": "Sahel Malaria Relief Fund",
                "fundRestriction": "RESTRICTED",
                "approvedBudgetNgn": "5000000.00",
                "trancheReceivedNgn": "3000000.00",
                "programSpendNgn": "1800000.00",
                "priorSpendNgn": "2500000.00",
            },
        )
    )
    post_uc.execute(
        PostPackOperationCommand(
            workspace_id=workspace_id,
            actor_user_id=actor_id,
            idempotency_key=uuid4(),
            posting_date=date(2026, 6, 13),
            operation_type=PackOperationType.NONPROFIT_GRANT_ACTIVITY,
            reference="UNRES-GALA-01",
            payload={
                "donorFundName": "Annual Community Appeal",
                "fundRestriction": "UNRESTRICTED",
                "approvedBudgetNgn": "1000000.00",
                "trancheReceivedNgn": "400000.00",
                "programSpendNgn": "100000.00",
                "priorSpendNgn": "0.00",
            },
        )
    )

    fy2026 = next(p for p in ledger_store.list_periods(workspace_id) if p.label == "FY2026")
    pkg = GenerateFrcnPackageUseCase(ledger_store).execute(
        workspace_id=workspace_id,
        fiscal_period_id=fy2026.id,
    )
    assert pkg.trial_balance.is_balanced is True
    assert pkg.financial_position.is_balanced is True
    # Statement of Activities: 1,800,000 released restricted + 400,000 unrestricted = 2,200,000
    assert pkg.profit_and_loss.total_revenue_ngn == Decimal("2200000.00")
    assert pkg.profit_and_loss.operating_expenses_ngn == Decimal("1900000.00")
    # Unspent restricted net assets = 1,200,000 on Balance Sheet
    eq_by_code = {line.account_code: line for line in pkg.financial_position.equity_lines}
    assert eq_by_code["3200"].amount_ngn == Decimal("1200000.00")


def test_hotel_usali_diner_templates_and_hybrid_api_posting() -> None:
    """Tasks 3.1 & 3.2: Hotel USALI, Diner Recipe & Hybrid Hotel+Diner compose and post via API."""
    workspace_id = UUID("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0001")
    actor_id = UUID("bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbb0001")
    ledger_store = create_seeded_demo_store(workspace_id=workspace_id, actor_user_id=actor_id)
    pack_store = InMemoryPackStore()

    hotel_plan = build_hospitality_folio_plan(
        HospitalityFolioInput(
            reference="FOLIO-IKOYI-304",
            property_wing="Victoria Island Main Wing",
            rooms_sold=12,
            available_rooms=20,
            room_rate_base_ngn="600000.00",
            apply_lagos_consumption_tax=True,
            service_charge_rate_pct="10.00",
        )
    )
    assert hotel_plan.metrics["occupancyPct"] == "60.00"
    assert hotel_plan.metrics["adrNgn"] == "50000.00"
    assert hotel_plan.metrics["revparNgn"] == "30000.00"
    assert hotel_plan.metrics["vatAmountNgn"] == "45000.00"
    assert hotel_plan.metrics["stateConsumptionTaxNgn"] == "30000.00"
    assert hotel_plan.metrics["serviceChargeFiduciaryNgn"] == "60000.00"
    assert hotel_plan.metrics["totalGuestFolioNgn"] == "735000.00"

    diner_plan = build_diner_service_shift_plan(
        DinerServiceShiftInput(
            reference="SHIFT-BISTRO-08",
            dining_outlet="Main Grill & Lounge",
            covers_served=85,
            food_beverage_sales_ngn="450000.00",
            ingredient_cogs_ngn="157500.00",
            kitchen_spoilage_ngn="11250.00",
            apply_state_consumption_tax=True,
        )
    )
    assert diner_plan.metrics["averageCheckNgn"] == "5294.12"
    assert diner_plan.metrics["foodCostPct"] == "37.50"
    assert diner_plan.metrics["plateMarginNgn"] == "281250.00"
    assert diner_plan.metrics["vatAmountNgn"] == "33750.00"
    assert diner_plan.metrics["stateConsumptionTaxNgn"] == "22500.00"
    assert diner_plan.metrics["grossTableChecksNgn"] == "506250.00"

    # Compose Hybrid Hotel + Diner through ConfigureIndustryPackUseCase & post via REST API
    ConfigureIndustryPackUseCase(pack_store=pack_store, ledger_store=ledger_store).execute(
        ConfigureIndustryPackCommand(
            workspace_id=workspace_id,
            primary_pack=FlagshipPackCode.CUSTOM_COMPOSABLE,
            is_hybrid_multi_unit=True,
            primitives=(
                OperationalPrimitive.HOSPITALITY_FOLIO_USALI,
                OperationalPrimitive.DINER_RECIPE_TABLE,
            ),
            terminology_overrides={"customer": "Guest", "invoice": "Guest Folio / Check"},
        )
    )

    app = LedgerApiApplication(ledger_store, pack_store=pack_store)
    headers = {"X-Workspace-Id": str(workspace_id), "X-Actor-User-Id": str(actor_id)}

    st_htl, body_htl = app.handle_request(
        method="POST",
        path="/api/v1/packs/operations/post",
        headers=headers,
        body=json.dumps(
            {
                "operationType": "HOSPITALITY_FOLIO_SETTLEMENT",
                "postingDate": "2026-06-15",
                "reference": "FOLIO-IKOYI-304",
                "payload": {
                    "propertyWing": "Victoria Island Main Wing",
                    "roomsSold": 12,
                    "availableRooms": 20,
                    "roomRateBaseNgn": "600000.00",
                    "applyLagosConsumptionTax": True,
                    "serviceChargeRatePct": "10.00",
                },
            }
        ).encode("utf-8"),
    )
    assert st_htl == 201
    assert _as_dict(body_htl["metrics"])["revparNgn"] == "30000.00"

    st_din, body_din = app.handle_request(
        method="POST",
        path="/api/v1/packs/operations/post",
        headers=headers,
        body=json.dumps(
            {
                "operationType": "DINER_SERVICE_SHIFT",
                "postingDate": "2026-06-15",
                "reference": "SHIFT-BISTRO-08",
                "payload": {
                    "diningOutlet": "Main Grill & Lounge",
                    "coversServed": 85,
                    "foodBeverageSalesNgn": "450000.00",
                    "ingredientCogsNgn": "157500.00",
                    "kitchenSpoilageNgn": "11250.00",
                    "applyStateConsumptionTax": True,
                },
            }
        ).encode("utf-8"),
    )
    assert st_din == 201
    assert _as_dict(body_din["metrics"])["foodCostPct"] == "37.50"

    fy2026 = next(p for p in ledger_store.list_periods(workspace_id) if p.label == "FY2026")
    pkg = GenerateFrcnPackageUseCase(ledger_store).execute(
        workspace_id=workspace_id,
        fiscal_period_id=fy2026.id,
    )
    assert pkg.trial_balance.is_balanced is True
    assert pkg.profit_and_loss.total_revenue_ngn == Decimal("1050000.00")
    tb_by_code = {row.account_code: row for row in pkg.trial_balance.rows}
    assert tb_by_code["2130"].credit_balance_ngn == Decimal("52500.00")
    assert tb_by_code["2140"].credit_balance_ngn == Decimal("60000.00")
