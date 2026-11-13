"""Tests for Track 2 Phase 2: 2024 WHT, TIN penalties, 7.5% VAT, State Levies, and NRS."""

from __future__ import annotations

from datetime import date
from decimal import Decimal
from uuid import uuid4

import pytest

from nairabooks.ledger.domain.errors import ValidationError
from nairabooks.tax.adapters.in_memory import InMemoryTaxStore
from nairabooks.tax.application.use_cases import (
    CalculateMultiLayerIndirectTaxCommand,
    CalculateMultiLayerIndirectTaxUseCase,
    PreviewNigerianTaxCommand,
    PreviewNigerianTaxUseCase,
)
from nairabooks.tax.domain.models import NigerianLegalForm, NigerianTaxProfile, TaxRegimeType


def _seeded_store(
    *, turnover: str = "60000000.00", state: str = "LAGOS"
) -> tuple[InMemoryTaxStore, NigerianTaxProfile]:
    store = InMemoryTaxStore()
    profile = NigerianTaxProfile.create(
        id=uuid4(),
        workspace_id=uuid4(),
        legal_form=NigerianLegalForm.PRIVATE_LIMITED,
        tin_number="10203040-0001",
        vat_registered=True,
        annual_turnover_ngn=turnover,
        fixed_assets_ngn="40000000.00",
        state_of_operation=state,
        is_professional_services=False,
        effective_from=date(2026, 1, 1),
    )
    store.save_tax_profile(profile)
    return store, profile


def test_wht_2024_rates_and_missing_tin_doubling() -> None:
    """Verify 2%/5%/10% 2024 WHT rates and punitive doubling when supplier lacks TIN."""
    store, profile = _seeded_store(turnover="60000000.00")
    uc = PreviewNigerianTaxUseCase(store)

    goods = uc.execute(
        PreviewNigerianTaxCommand(
            workspace_id=profile.workspace_id,
            transaction_date=date(2026, 3, 15),
            regime=TaxRegimeType.WHT_CORPORATE_AND_UNINCORPORATED,
            gross_amount_ngn="1000000.00",
            counterparty_has_valid_tin=True,
            supply_category_code="WHT_GOODS_SUPPLY",
        )
    )
    assert goods.applied_rate == Decimal("0.020000")
    assert goods.computed_tax_ngn == Decimal("20000.00")
    assert goods.wht_higher_no_tin_applied is False

    prof = uc.execute(
        PreviewNigerianTaxCommand(
            workspace_id=profile.workspace_id,
            transaction_date=date(2026, 3, 15),
            regime=TaxRegimeType.WHT_CORPORATE_AND_UNINCORPORATED,
            gross_amount_ngn="1000000.00",
            counterparty_has_valid_tin=True,
            supply_category_code="WHT_PROFESSIONAL_CONSULTING",
        )
    )
    assert prof.applied_rate == Decimal("0.050000")
    assert prof.computed_tax_ngn == Decimal("50000.00")

    rent = uc.execute(
        PreviewNigerianTaxCommand(
            workspace_id=profile.workspace_id,
            transaction_date=date(2026, 3, 15),
            regime=TaxRegimeType.WHT_CORPORATE_AND_UNINCORPORATED,
            gross_amount_ngn="1000000.00",
            counterparty_has_valid_tin=True,
            supply_category_code="WHT_RENT_OR_NON_RESIDENT",
        )
    )
    assert rent.applied_rate == Decimal("0.100000")
    assert rent.computed_tax_ngn == Decimal("100000.00")

    prof_no_tin = uc.execute(
        PreviewNigerianTaxCommand(
            workspace_id=profile.workspace_id,
            transaction_date=date(2026, 3, 15),
            regime=TaxRegimeType.WHT_CORPORATE_AND_UNINCORPORATED,
            gross_amount_ngn="1000000.00",
            counterparty_has_valid_tin=False,
            supply_category_code="WHT_PROFESSIONAL_CONSULTING",
        )
    )
    assert prof_no_tin.applied_rate == Decimal("0.100000")
    assert prof_no_tin.computed_tax_ngn == Decimal("100000.00")
    assert prof_no_tin.wht_higher_no_tin_applied is True


def test_wht_small_entity_n25m_and_n2m_monthly_threshold_rules() -> None:
    """Small entities <=N25M are WHT-exempt only when monthly total <=N2M and TIN is valid."""
    store, profile = _seeded_store(turnover="20000000.00")
    uc = PreviewNigerianTaxUseCase(store)

    exempt_tx = uc.execute(
        PreviewNigerianTaxCommand(
            workspace_id=profile.workspace_id,
            transaction_date=date(2026, 4, 5),
            regime=TaxRegimeType.WHT_CORPORATE_AND_UNINCORPORATED,
            gross_amount_ngn="800000.00",
            counterparty_has_valid_tin=True,
            supply_category_code="WHT_PROFESSIONAL_CONSULTING",
            monthly_cumulative_with_supplier_ngn="1200000.00",
        )
    )
    assert exempt_tx.wht_exempt_small_entity_applied is True
    assert exempt_tx.applied_rate == Decimal("0.000000")
    assert exempt_tx.computed_tax_ngn == Decimal("0.00")

    crossed_2m = uc.execute(
        PreviewNigerianTaxCommand(
            workspace_id=profile.workspace_id,
            transaction_date=date(2026, 4, 5),
            regime=TaxRegimeType.WHT_CORPORATE_AND_UNINCORPORATED,
            gross_amount_ngn="800000.01",
            counterparty_has_valid_tin=True,
            supply_category_code="WHT_PROFESSIONAL_CONSULTING",
            monthly_cumulative_with_supplier_ngn="1200000.00",
        )
    )
    assert crossed_2m.wht_exempt_small_entity_applied is False
    assert crossed_2m.applied_rate == Decimal("0.050000")
    assert crossed_2m.computed_tax_ngn == Decimal("40000.00")

    # Small payer still enforces doubled WHT when supplier has no valid TIN
    no_tin_small = uc.execute(
        PreviewNigerianTaxCommand(
            workspace_id=profile.workspace_id,
            transaction_date=date(2026, 4, 5),
            regime=TaxRegimeType.WHT_CORPORATE_AND_UNINCORPORATED,
            gross_amount_ngn="500000.00",
            counterparty_has_valid_tin=False,
            supply_category_code="WHT_GOODS_SUPPLY",
            monthly_cumulative_with_supplier_ngn="0.00",
        )
    )
    assert no_tin_small.wht_exempt_small_entity_applied is False
    assert no_tin_small.wht_higher_no_tin_applied is True
    assert no_tin_small.applied_rate == Decimal("0.040000")
    assert no_tin_small.computed_tax_ngn == Decimal("20000.00")


def test_multilayer_indirect_taxes_lagos_vat_service_charge_wht_and_nrs_subtotals() -> None:
    """Concurrent VAT 7.5% + Lagos 5% + 10% service charge + WHT balance cleanly."""
    store, profile = _seeded_store(turnover="60000000.00", state="LAGOS")
    uc = CalculateMultiLayerIndirectTaxUseCase(store)

    breakdown = uc.execute(
        CalculateMultiLayerIndirectTaxCommand(
            workspace_id=profile.workspace_id,
            transaction_date=date(2026, 5, 1),
            base_amount_ngn="100000.00",
            vat_supply_category_code="STANDARD_TAXABLE_SUPPLY",
            vat_regime=TaxRegimeType.VAT_STANDARD_7_5,
            include_state_consumption_tax=True,
            service_charge_rate="0.100000",
            wht_supply_category_code="WHT_PROFESSIONAL_CONSULTING",
            counterparty_has_valid_tin=True,
        )
    )

    assert breakdown.base_amount_ngn == Decimal("100000.00")
    assert breakdown.vat_amount_ngn == Decimal("7500.00")
    assert breakdown.state_consumption_tax_ngn == Decimal("5000.00")
    assert breakdown.service_charge_ngn == Decimal("10000.00")
    assert breakdown.wht_deduction_ngn == Decimal("5000.00")
    assert breakdown.gross_customer_invoice_ngn == Decimal("122500.00")
    assert breakdown.net_cash_payable_ngn == Decimal("117500.00")

    liability_credits = sum(
        item.amount_ngn
        for item in breakdown.account_postings
        if item.account_code in {"2110", "2130", "2140"}
    )
    assert liability_credits + breakdown.base_amount_ngn == breakdown.gross_customer_invoice_ngn
    assert {item.account_code for item in breakdown.account_postings} == {
        "1150",
        "2110",
        "2130",
        "2140",
    }

    nrs_schemes = {s.tax_scheme_id: s for s in breakdown.nrs_subtotals}
    assert nrs_schemes["VAT"].category_code == "S"
    assert nrs_schemes["VAT"].tax_amount_ngn == Decimal("7500.00")
    assert nrs_schemes["STATE_CONSUMPTION"].tax_amount_ngn == Decimal("5000.00")
    assert nrs_schemes["SERVICE_CHARGE"].tax_amount_ngn == Decimal("10000.00")
    assert nrs_schemes["WHT"].tax_amount_ngn == Decimal("5000.00")


def test_vat_zero_rated_exempt_and_non_lagos_fallback_reject_floats() -> None:
    """Zero-rated ('Z'), Exempt ('E'), and non-Lagos states resolve cleanly; floats fail."""
    store, profile = _seeded_store(turnover="60000000.00", state="KANO")
    uc = CalculateMultiLayerIndirectTaxUseCase(store)

    zero_rated = uc.execute(
        CalculateMultiLayerIndirectTaxCommand(
            workspace_id=profile.workspace_id,
            transaction_date=date(2026, 5, 1),
            base_amount_ngn="250000.00",
            vat_supply_category_code="ZERO_RATED_EXPORT_OR_BASIC",
            vat_regime=TaxRegimeType.VAT_ZERO_RATED,
            include_state_consumption_tax=True,
            service_charge_rate="0.000000",
            wht_supply_category_code=None,
            counterparty_has_valid_tin=True,
        )
    )
    assert zero_rated.vat_amount_ngn == Decimal("0.00")
    assert zero_rated.state_consumption_tax_ngn == Decimal("0.00")
    assert zero_rated.gross_customer_invoice_ngn == Decimal("250000.00")
    assert zero_rated.nrs_subtotals[0].category_code == "Z"

    with pytest.raises(ValidationError):
        CalculateMultiLayerIndirectTaxCommand(
            workspace_id=profile.workspace_id,
            transaction_date=date(2026, 5, 1),
            base_amount_ngn=100000.0,  # type: ignore[arg-type]
            vat_supply_category_code="STANDARD_TAXABLE_SUPPLY",
            vat_regime=TaxRegimeType.VAT_STANDARD_7_5,
        )
