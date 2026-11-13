"""Effective-dated Nigerian tax rule tables and small-company eligibility engine."""

from __future__ import annotations

from collections.abc import Iterable
from datetime import date
from decimal import Decimal

from nairabooks.ledger.domain.errors import ValidationError
from nairabooks.tax.domain.models import (
    NigerianLegalForm,
    NigerianTaxProfile,
    SmallCompanyEvaluation,
    TaxRegimeType,
    TaxRuleVersion,
    ThresholdAlertLevel,
    pct_utilization,
)

SMALL_COMPANY_TURNOVER_CAP_NGN = Decimal("100000000.00")
SMALL_COMPANY_ASSETS_CAP_NGN = Decimal("250000000.00")
LEGACY_FA2020_SMALL_TURNOVER_CAP_NGN = Decimal("25000000.00")
WHT_SMALL_ENTITY_TURNOVER_CAP_NGN = Decimal("25000000.00")
WHT_SMALL_ENTITY_MONTHLY_TX_CAP_NGN = Decimal("2000000.00")
APPROACHING_ALERT_PCT = Decimal("80.00")

DEFAULT_NIGERIAN_TAX_RULES: tuple[TaxRuleVersion, ...] = (
    # Corporate Income Tax — Historical Finance Act 2019/2020 vs Nigeria Tax Act 2025
    TaxRuleVersion(
        rule_version_code="NG-CIT-FA2020-SMALL",
        regime=TaxRegimeType.CIT_NIGERIA_TAX_ACT_2025,
        jurisdiction="FEDERAL",
        supply_category_code="CIT_SMALL_COMPANY",
        standard_rate=Decimal("0.000000"),
        no_tin_penalty_rate=None,
        effective_from=date(2020, 1, 1),
        effective_to=date(2025, 12, 31),
        statutory_citation="Companies Income Tax Act / Finance Act 2019 (Turnover <= N25M)",
        description="Pre-2026 small company 0% CIT threshold (up to N25M turnover).",
    ),
    TaxRuleVersion(
        rule_version_code="NG-CIT-FA2020-30",
        regime=TaxRegimeType.CIT_NIGERIA_TAX_ACT_2025,
        jurisdiction="FEDERAL",
        supply_category_code="CIT_STANDARD_COMPANY",
        standard_rate=Decimal("0.300000"),
        no_tin_penalty_rate=None,
        effective_from=date(2020, 1, 1),
        effective_to=date(2025, 12, 31),
        statutory_citation="Companies Income Tax Act Sec 40 (Pre-2026 standard 30%)",
        description="Pre-2026 standard corporate CIT rate.",
    ),
    TaxRuleVersion(
        rule_version_code="NG-CIT-NTA2025-SMALL",
        regime=TaxRegimeType.CIT_NIGERIA_TAX_ACT_2025,
        jurisdiction="FEDERAL",
        supply_category_code="CIT_SMALL_COMPANY",
        standard_rate=Decimal("0.000000"),
        no_tin_penalty_rate=None,
        effective_from=date(2026, 1, 1),
        effective_to=None,
        statutory_citation=(
            "Nigeria Tax Act 2025 Sec 56 (Turnover <= N100M & Fixed Assets <= N250M, "
            "excluding Professional Services)"
        ),
        description="Small business 0% CIT exemption effective Jan 1, 2026.",
    ),
    TaxRuleVersion(
        rule_version_code="NG-CIT-NTA2025-STD",
        regime=TaxRegimeType.CIT_NIGERIA_TAX_ACT_2025,
        jurisdiction="FEDERAL",
        supply_category_code="CIT_STANDARD_COMPANY",
        standard_rate=Decimal("0.300000"),
        no_tin_penalty_rate=None,
        effective_from=date(2026, 1, 1),
        effective_to=None,
        statutory_citation="Nigeria Tax Act 2025 Sec 56 (Standard / Non-Exempt Company 30% CIT)",
        description=(
            "Standard corporate CIT (or small professional-services firm excluded from 0%)."
        ),
    ),
    TaxRuleVersion(
        rule_version_code="NG-CIT-NTA2025-NGO",
        regime=TaxRegimeType.CIT_NIGERIA_TAX_ACT_2025,
        jurisdiction="FEDERAL",
        supply_category_code="CIT_NGO_EXEMPT",
        standard_rate=Decimal("0.000000"),
        no_tin_penalty_rate=None,
        effective_from=date(2026, 1, 1),
        effective_to=None,
        statutory_citation="Nigeria Tax Act 2025 Sec 163 (Charitable / Non-Profit Activities)",
        description="Public benefit / Incorporated Trustee non-commercial surplus exemption.",
    ),
    # Federal VAT (7.5%, Zero-Rated, Exempt) + NRS e-invoice category codes
    TaxRuleVersion(
        rule_version_code="NG-VAT-75-2020",
        regime=TaxRegimeType.VAT_STANDARD_7_5,
        jurisdiction="FEDERAL",
        supply_category_code="STANDARD_TAXABLE_SUPPLY",
        standard_rate=Decimal("0.075000"),
        no_tin_penalty_rate=None,
        effective_from=date(2020, 2, 1),
        effective_to=None,
        statutory_citation="Value Added Tax Act Sec 4 (Standard 7.5% Rate)",
        vat_nrs_category_code="S",
        description="Standard 7.5% Federal VAT with NRS e-invoice category 'S'.",
    ),
    TaxRuleVersion(
        rule_version_code="NG-VAT-ZERO-2020",
        regime=TaxRegimeType.VAT_ZERO_RATED,
        jurisdiction="FEDERAL",
        supply_category_code="ZERO_RATED_EXPORT_OR_BASIC",
        standard_rate=Decimal("0.000000"),
        no_tin_penalty_rate=None,
        effective_from=date(2020, 2, 1),
        effective_to=None,
        statutory_citation="VAT Act First Schedule / Nigeria Tax Act 2025 Zero-Rated Supplies",
        vat_nrs_category_code="Z",
        description="0% zero-rated export or basic essential goods with input VAT recovery.",
    ),
    TaxRuleVersion(
        rule_version_code="NG-VAT-EXEMPT-2020",
        regime=TaxRegimeType.VAT_EXEMPT,
        jurisdiction="FEDERAL",
        supply_category_code="VAT_EXEMPT_SUPPLY",
        standard_rate=Decimal("0.000000"),
        no_tin_penalty_rate=None,
        effective_from=date(2020, 2, 1),
        effective_to=None,
        statutory_citation="VAT Act First Schedule Exempt Goods and Services",
        vat_nrs_category_code="E",
        description="VAT-exempt supply with NRS category code 'E'.",
    ),
    # 2024 Withholding Tax Regulations (effective Jan 1, 2025; doubled when counterparty lacks TIN)
    TaxRuleVersion(
        rule_version_code="NG-WHT-2024-GOODS",
        regime=TaxRegimeType.WHT_CORPORATE_AND_UNINCORPORATED,
        jurisdiction="FEDERAL",
        supply_category_code="WHT_GOODS_SUPPLY",
        standard_rate=Decimal("0.020000"),
        no_tin_penalty_rate=Decimal("0.040000"),
        effective_from=date(2025, 1, 1),
        effective_to=None,
        statutory_citation=(
            "Deduction of Tax at Source (Withholding) Regulations 2024 First Schedule (2%)"
        ),
        description="Supply of goods / manufacturing materials (2% standard, 4% no-TIN penalty).",
    ),
    TaxRuleVersion(
        rule_version_code="NG-WHT-2024-CONST-RES",
        regime=TaxRegimeType.WHT_CORPORATE_AND_UNINCORPORATED,
        jurisdiction="FEDERAL",
        supply_category_code="WHT_CONSTRUCTION_CIVIL",
        standard_rate=Decimal("0.020000"),
        no_tin_penalty_rate=Decimal("0.040000"),
        effective_from=date(2025, 1, 1),
        effective_to=None,
        statutory_citation=(
            "WHT Regulations 2024 First Schedule — Roads, Bridges & Buildings (2% Resident)"
        ),
        description="Resident construction contract works (2%, 4% if TIN missing).",
    ),
    TaxRuleVersion(
        rule_version_code="NG-WHT-2024-PROF",
        regime=TaxRegimeType.WHT_CORPORATE_AND_UNINCORPORATED,
        jurisdiction="FEDERAL",
        supply_category_code="WHT_PROFESSIONAL_CONSULTING",
        standard_rate=Decimal("0.050000"),
        no_tin_penalty_rate=Decimal("0.100000"),
        effective_from=date(2025, 1, 1),
        effective_to=None,
        statutory_citation=(
            "WHT Regulations 2024 First Schedule — Consultancy & Professional Fees (5% Resident)"
        ),
        description="Resident consultancy/technical/professional fees (5%, 10% if TIN missing).",
    ),
    TaxRuleVersion(
        rule_version_code="NG-WHT-2024-RENT-NR",
        regime=TaxRegimeType.WHT_CORPORATE_AND_UNINCORPORATED,
        jurisdiction="FEDERAL",
        supply_category_code="WHT_RENT_OR_NON_RESIDENT",
        standard_rate=Decimal("0.100000"),
        no_tin_penalty_rate=Decimal("0.200000"),
        effective_from=date(2025, 1, 1),
        effective_to=None,
        statutory_citation=(
            "WHT Regulations 2024 First Schedule — Rent, Dividends & Non-Resident Services (10%)"
        ),
        description=(
            "Commercial rent, royalties, or non-resident professional services (10%, 20% no TIN)."
        ),
    ),
    # State Consumption Taxes
    TaxRuleVersion(
        rule_version_code="NG-STATE-LAGOS-5",
        regime=TaxRegimeType.STATE_HOSPITALITY_CONSUMPTION,
        jurisdiction="LAGOS",
        supply_category_code="HOSPITALITY_CONSUMPTION_TAX",
        standard_rate=Decimal("0.050000"),
        no_tin_penalty_rate=None,
        effective_from=date(2019, 1, 1),
        effective_to=None,
        statutory_citation="Hotel Occupancy and Restaurant Consumption Law of Lagos State (5%)",
        description="Lagos State 5% hospitality and restaurant consumption levy.",
    ),
    TaxRuleVersion(
        rule_version_code="NG-STATE-NONE-0",
        regime=TaxRegimeType.STATE_HOSPITALITY_CONSUMPTION,
        jurisdiction="FEDERAL",
        supply_category_code="HOSPITALITY_CONSUMPTION_TAX",
        standard_rate=Decimal("0.000000"),
        no_tin_penalty_rate=None,
        effective_from=date(2019, 1, 1),
        effective_to=None,
        statutory_citation="No state hospitality consumption levy applicable",
        description="Default 0% state consumption tax fallback where state levy does not apply.",
    ),
)


class TaxRuleSet:
    """In-memory effective-dated Nigerian statutory rule catalog with non-overlap validation."""

    def __init__(self, rules: Iterable[TaxRuleVersion] = DEFAULT_NIGERIAN_TAX_RULES) -> None:
        ordered = tuple(rules)
        self._validate_non_overlapping(ordered)
        self._rules = ordered

    @property
    def rules(self) -> tuple[TaxRuleVersion, ...]:
        return self._rules

    @staticmethod
    def _validate_non_overlapping(rules: tuple[TaxRuleVersion, ...]) -> None:
        seen_codes: set[str] = set()
        by_key: dict[tuple[TaxRegimeType, str, str], list[TaxRuleVersion]] = {}
        for rule in rules:
            if rule.rule_version_code in seen_codes:
                raise ValidationError(
                    f"Duplicate tax rule version code '{rule.rule_version_code}'.",
                    field="rule_version_code",
                )
            seen_codes.add(rule.rule_version_code)
            key = (rule.regime, rule.jurisdiction.upper(), rule.supply_category_code)
            existing = by_key.setdefault(key, [])
            for other in existing:
                if _ranges_overlap(
                    rule.effective_from,
                    rule.effective_to,
                    other.effective_from,
                    other.effective_to,
                ):
                    raise ValidationError(
                        f"Overlapping tax rule effective_period for {key[0]}/{key[1]}/{key[2]}.",
                        field="effective_from",
                    )
            existing.append(rule)

    def resolve_rule(
        self,
        *,
        regime: TaxRegimeType,
        jurisdiction: str,
        supply_category_code: str,
        transaction_date: date,
    ) -> TaxRuleVersion:
        """Look up the active rule on transaction_date with jurisdiction fallback to FEDERAL."""
        norm_jurisdiction = jurisdiction.strip().upper()
        for candidate_jurisdiction in (norm_jurisdiction, "FEDERAL"):
            for rule in self._rules:
                if (
                    rule.regime is regime
                    and rule.jurisdiction.upper() == candidate_jurisdiction
                    and rule.supply_category_code == supply_category_code
                    and rule.applies_on(transaction_date)
                ):
                    return rule
        raise ValidationError(
            f"No active statutory tax rule found for {regime.value} / {norm_jurisdiction} / "
            f"{supply_category_code} on {transaction_date.isoformat()}.",
            field="supply_category_code",
        )


def _ranges_overlap(
    start_a: date,
    end_a: date | None,
    start_b: date,
    end_b: date | None,
) -> bool:
    if end_a is not None and end_a < start_b:
        return False
    return end_b is None or start_a <= end_b


def evaluate_small_company_eligibility(
    profile: NigerianTaxProfile,
    *,
    as_of_date: date,
    rule_set: TaxRuleSet | None = None,
) -> SmallCompanyEvaluation:
    """Evaluate small-company 0% CIT eligibility & turnover threshold radar under statutory laws."""
    catalog = rule_set or TaxRuleSet(DEFAULT_NIGERIAN_TAX_RULES)
    turnover_cap = (
        SMALL_COMPANY_TURNOVER_CAP_NGN
        if as_of_date >= date(2026, 1, 1)
        else LEGACY_FA2020_SMALL_TURNOVER_CAP_NGN
    )
    turnover_pct = pct_utilization(profile.annual_turnover_ngn, turnover_cap)
    asset_pct = pct_utilization(profile.fixed_assets_ngn, SMALL_COMPANY_ASSETS_CAP_NGN)

    if (
        profile.annual_turnover_ngn > turnover_cap
        or profile.fixed_assets_ngn > SMALL_COMPANY_ASSETS_CAP_NGN
    ):
        alert_level = ThresholdAlertLevel.EXCEEDED
    elif turnover_pct >= APPROACHING_ALERT_PCT or asset_pct >= APPROACHING_ALERT_PCT:
        alert_level = ThresholdAlertLevel.APPROACHING_80_PCT
    else:
        alert_level = ThresholdAlertLevel.NORMAL

    if profile.legal_form is NigerianLegalForm.INCORPORATED_TRUSTEE_NGO:
        ngo_rule = catalog.resolve_rule(
            regime=TaxRegimeType.CIT_NIGERIA_TAX_ACT_2025,
            jurisdiction="FEDERAL",
            supply_category_code="CIT_NGO_EXEMPT",
            transaction_date=max(as_of_date, date(2026, 1, 1)),
        )
        return SmallCompanyEvaluation(
            eligible_for_zero_cit=True,
            applicable_cit_rate=ngo_rule.standard_rate,
            rule_version_code=ngo_rule.rule_version_code,
            reason="Incorporated Trustee NGO non-commercial charitable surplus is CIT-exempt.",
            statutory_citation=ngo_rule.statutory_citation,
            threshold_alert_level=ThresholdAlertLevel.NORMAL,
            turnover_utilization_pct=turnover_pct,
            asset_utilization_pct=asset_pct,
        )

    if profile.legal_form in (
        NigerianLegalForm.BUSINESS_NAME,
        NigerianLegalForm.LIMITED_LIABILITY_PARTNERSHIP,
    ):
        return SmallCompanyEvaluation(
            eligible_for_zero_cit=False,
            applicable_cit_rate=Decimal("0.000000"),
            rule_version_code="NG-PIT-PASSTHROUGH",
            reason=(
                "Business Name / LLP is assessed under Personal Income Tax rather than "
                "corporate CIT small-company exemption."
            ),
            statutory_citation="Personal Income Tax Act (PITA) / Nigeria Tax Act 2025",
            threshold_alert_level=alert_level,
            turnover_utilization_pct=turnover_pct,
            asset_utilization_pct=asset_pct,
        )

    small_rule = catalog.resolve_rule(
        regime=TaxRegimeType.CIT_NIGERIA_TAX_ACT_2025,
        jurisdiction="FEDERAL",
        supply_category_code="CIT_SMALL_COMPANY",
        transaction_date=as_of_date,
    )
    std_rule = catalog.resolve_rule(
        regime=TaxRegimeType.CIT_NIGERIA_TAX_ACT_2025,
        jurisdiction="FEDERAL",
        supply_category_code="CIT_STANDARD_COMPANY",
        transaction_date=as_of_date,
    )

    if profile.is_professional_services:
        return SmallCompanyEvaluation(
            eligible_for_zero_cit=False,
            applicable_cit_rate=std_rule.standard_rate,
            rule_version_code=std_rule.rule_version_code,
            reason=(
                "Professional services firms are statutorily excluded from the 0% small-company "
                "CIT exemption regardless of turnover."
            ),
            statutory_citation=std_rule.statutory_citation,
            threshold_alert_level=alert_level,
            turnover_utilization_pct=turnover_pct,
            asset_utilization_pct=asset_pct,
        )

    within_turnover = profile.annual_turnover_ngn <= turnover_cap
    within_assets = profile.fixed_assets_ngn <= SMALL_COMPANY_ASSETS_CAP_NGN
    if within_turnover and within_assets:
        return SmallCompanyEvaluation(
            eligible_for_zero_cit=True,
            applicable_cit_rate=small_rule.standard_rate,
            rule_version_code=small_rule.rule_version_code,
            reason=(
                f"Qualifies for 0% small-company CIT (turnover <= N{turnover_cap:,.2f} "
                f"and fixed assets <= N{SMALL_COMPANY_ASSETS_CAP_NGN:,.2f})."
            ),
            statutory_citation=small_rule.statutory_citation,
            threshold_alert_level=alert_level,
            turnover_utilization_pct=turnover_pct,
            asset_utilization_pct=asset_pct,
        )

    return SmallCompanyEvaluation(
        eligible_for_zero_cit=False,
        applicable_cit_rate=std_rule.standard_rate,
        rule_version_code=std_rule.rule_version_code,
        reason="Annual turnover or fixed assets exceed statutory small-company threshold.",
        statutory_citation=std_rule.statutory_citation,
        threshold_alert_level=ThresholdAlertLevel.EXCEEDED,
        turnover_utilization_pct=turnover_pct,
        asset_utilization_pct=asset_pct,
    )
