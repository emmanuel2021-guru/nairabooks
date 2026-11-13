"""Tests for Track 2 Phase 1: Nigeria Tax Act 2025 classifier and effective-dated rule lookup."""

from __future__ import annotations

import ast
from datetime import date
from decimal import Decimal
from pathlib import Path
from uuid import uuid4

import pytest

from nairabooks.ledger.domain.errors import ValidationError
from nairabooks.tax.domain.models import (
    NigerianLegalForm,
    NigerianTaxProfile,
    TaxRegimeType,
    TaxRuleVersion,
    ThresholdAlertLevel,
)
from nairabooks.tax.domain.rules import (
    DEFAULT_NIGERIAN_TAX_RULES,
    TaxRuleSet,
    evaluate_small_company_eligibility,
)


def _profile(
    *,
    legal_form: NigerianLegalForm = NigerianLegalForm.PRIVATE_LIMITED,
    turnover: str = "40000000.00",
    assets: str = "80000000.00",
    is_professional_services: bool = False,
    vat_registered: bool = True,
    state: str = "LAGOS",
    effective_from: date = date(2026, 1, 1),
) -> NigerianTaxProfile:
    return NigerianTaxProfile.create(
        id=uuid4(),
        workspace_id=uuid4(),
        legal_form=legal_form,
        tin_number="12345678-0001",
        vat_registered=vat_registered,
        annual_turnover_ngn=turnover,
        fixed_assets_ngn=assets,
        state_of_operation=state,
        is_professional_services=is_professional_services,
        effective_from=effective_from,
    )


def test_tax_act_2025_small_company_thresholds_and_radar() -> None:
    """Companies <= N100M turnover and <= N250M assets get 0% CIT; >=80% raises alert."""
    profile_95m = _profile(turnover="95000000.00", assets="200000000.00")
    eval_95m = evaluate_small_company_eligibility(profile_95m, as_of_date=date(2026, 3, 1))

    assert eval_95m.eligible_for_zero_cit is True
    assert eval_95m.applicable_cit_rate == Decimal("0.000000")
    assert eval_95m.turnover_utilization_pct == Decimal("95.00")
    assert eval_95m.threshold_alert_level is ThresholdAlertLevel.APPROACHING_80_PCT

    # Exact boundary still qualifies
    boundary_profile = _profile(turnover="100000000.00", assets="250000000.00")
    eval_boundary = evaluate_small_company_eligibility(
        boundary_profile, as_of_date=date(2026, 3, 1)
    )
    assert eval_boundary.eligible_for_zero_cit is True
    assert eval_boundary.applicable_cit_rate == Decimal("0.000000")

    # Crossing either turnover (>100M) or fixed assets (>250M) disables small-company exemption
    over_turnover = _profile(turnover="100000000.01", assets="100000000.00")
    eval_over_t = evaluate_small_company_eligibility(over_turnover, as_of_date=date(2026, 3, 1))
    assert eval_over_t.eligible_for_zero_cit is False
    assert eval_over_t.applicable_cit_rate == Decimal("0.300000")
    assert eval_over_t.threshold_alert_level is ThresholdAlertLevel.EXCEEDED

    over_assets = _profile(turnover="50000000.00", assets="250000000.01")
    eval_over_a = evaluate_small_company_eligibility(over_assets, as_of_date=date(2026, 3, 1))
    assert eval_over_a.eligible_for_zero_cit is False
    assert eval_over_a.applicable_cit_rate == Decimal("0.300000")
    assert eval_over_a.threshold_alert_level is ThresholdAlertLevel.EXCEEDED


def test_professional_services_excluded_and_ngo_exempt_handling() -> None:
    """Professional services firms cannot claim 0% CIT even below N100M; NGOs use exempt status."""
    pro_firm = _profile(
        legal_form=NigerianLegalForm.PRIVATE_LIMITED,
        turnover="30000000.00",
        assets="15000000.00",
        is_professional_services=True,
    )
    eval_pro = evaluate_small_company_eligibility(pro_firm, as_of_date=date(2026, 4, 10))
    assert pro_firm.is_professional_services_excluded_from_small_exempt is True
    assert eval_pro.eligible_for_zero_cit is False
    assert eval_pro.applicable_cit_rate == Decimal("0.300000")

    ngo = _profile(
        legal_form=NigerianLegalForm.INCORPORATED_TRUSTEE_NGO,
        turnover="150000000.00",
        assets="300000000.00",
    )
    eval_ngo = evaluate_small_company_eligibility(ngo, as_of_date=date(2026, 4, 10))
    assert eval_ngo.eligible_for_zero_cit is True
    assert eval_ngo.applicable_cit_rate == Decimal("0.000000")
    assert "NGO" in eval_ngo.reason.upper()

    sole_prop = _profile(legal_form=NigerianLegalForm.BUSINESS_NAME, turnover="12000000.00")
    eval_sole = evaluate_small_company_eligibility(sole_prop, as_of_date=date(2026, 4, 10))
    assert eval_sole.eligible_for_zero_cit is False
    assert eval_sole.applicable_cit_rate == Decimal("0.000000")


def test_effective_dated_rule_lookup_and_overlap_guard() -> None:
    """TaxRuleSet resolves historical vs Tax Act 2025 rules by date and blocks overlaps."""
    ruleset = TaxRuleSet(DEFAULT_NIGERIAN_TAX_RULES)

    pre_2026 = ruleset.resolve_rule(
        regime=TaxRegimeType.CIT_NIGERIA_TAX_ACT_2025,
        jurisdiction="FEDERAL",
        supply_category_code="CIT_STANDARD_COMPANY",
        transaction_date=date(2025, 6, 15),
    )
    assert pre_2026.rule_version_code == "NG-CIT-FA2020-30"

    post_2026 = ruleset.resolve_rule(
        regime=TaxRegimeType.CIT_NIGERIA_TAX_ACT_2025,
        jurisdiction="FEDERAL",
        supply_category_code="CIT_SMALL_COMPANY",
        transaction_date=date(2026, 2, 1),
    )
    assert post_2026.rule_version_code == "NG-CIT-NTA2025-SMALL"
    assert post_2026.standard_rate == Decimal("0.000000")

    overlapping = (
        TaxRuleVersion(
            rule_version_code="RULE-A",
            regime=TaxRegimeType.VAT_STANDARD_7_5,
            jurisdiction="FEDERAL",
            supply_category_code="STANDARD_GOODS",
            standard_rate=Decimal("0.075000"),
            no_tin_penalty_rate=None,
            effective_from=date(2025, 1, 1),
            effective_to=date(2026, 12, 31),
            statutory_citation="VAT Act",
        ),
        TaxRuleVersion(
            rule_version_code="RULE-B",
            regime=TaxRegimeType.VAT_STANDARD_7_5,
            jurisdiction="FEDERAL",
            supply_category_code="STANDARD_GOODS",
            standard_rate=Decimal("0.075000"),
            no_tin_penalty_rate=None,
            effective_from=date(2026, 6, 1),
            effective_to=None,
            statutory_citation="Overlap Test",
        ),
    )
    with pytest.raises(ValidationError):
        TaxRuleSet(overlapping)


def test_tax_profile_rejects_float_inputs_and_domain_stays_pure() -> None:
    """Float values must fail validation and tax.domain must have zero I/O/framework imports."""
    with pytest.raises(ValidationError):
        NigerianTaxProfile.create(
            id=uuid4(),
            workspace_id=uuid4(),
            legal_form=NigerianLegalForm.PRIVATE_LIMITED,
            tin_number="12345678-0001",
            vat_registered=True,
            annual_turnover_ngn=50000000.0,  # type: ignore[arg-type]
            fixed_assets_ngn="10000000.00",
            state_of_operation="LAGOS",
            is_professional_services=False,
            effective_from=date(2026, 1, 1),
        )

    domain_dir = Path(__file__).resolve().parent.parent / "src" / "nairabooks" / "tax" / "domain"
    forbidden = {"json", "http", "urllib", "psycopg", "sqlalchemy", "fastapi", "asyncio"}
    for py_file in domain_dir.glob("*.py"):
        tree = ast.parse(py_file.read_text(encoding="utf-8"))
        for node in ast.walk(tree):
            if isinstance(node, ast.Import):
                for alias in node.names:
                    assert alias.name.split(".")[0] not in forbidden
            elif isinstance(node, ast.ImportFrom) and node.module:
                assert node.module.split(".")[0] not in forbidden
