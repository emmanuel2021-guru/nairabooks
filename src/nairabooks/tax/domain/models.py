"""Domain models for Nigerian tax profiles, statutory rule versions, and thresholds."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from decimal import ROUND_HALF_UP, Decimal
from enum import StrEnum
from uuid import UUID

from nairabooks.ledger.domain.errors import ValidationError
from nairabooks.ledger.domain.money import (
    MONEY_QUANTUM,
    RATE_QUANTUM,
    ZERO_MONEY,
    MoneyInput,
    parse_decimal,
)

HUNDRED_PERCENT = Decimal("100.00")


class NigerianLegalForm(StrEnum):
    """Statutory Nigerian entity legal structures aligned with GraphQL and SQL enums."""

    PRIVATE_LIMITED = "PRIVATE_LIMITED"
    PUBLIC_LIMITED = "PUBLIC_LIMITED"
    BUSINESS_NAME = "BUSINESS_NAME"
    LIMITED_LIABILITY_PARTNERSHIP = "LIMITED_LIABILITY_PARTNERSHIP"
    INCORPORATED_TRUSTEE_NGO = "INCORPORATED_TRUSTEE_NGO"


class TaxRegimeType(StrEnum):
    """Effective-dated Nigerian tax regimes aligned with schema.graphql."""

    VAT_STANDARD_7_5 = "VAT_STANDARD_7_5"
    VAT_ZERO_RATED = "VAT_ZERO_RATED"
    VAT_EXEMPT = "VAT_EXEMPT"
    WHT_CORPORATE_AND_UNINCORPORATED = "WHT_CORPORATE_AND_UNINCORPORATED"
    CIT_NIGERIA_TAX_ACT_2025 = "CIT_NIGERIA_TAX_ACT_2025"
    STATE_HOSPITALITY_CONSUMPTION = "STATE_HOSPITALITY_CONSUMPTION"


class ThresholdAlertLevel(StrEnum):
    """Radar status relative to Nigeria Tax Act 2025 small-company caps."""

    NORMAL = "NORMAL"
    APPROACHING_80_PCT = "APPROACHING_80_PCT"
    EXCEEDED = "EXCEEDED"


@dataclass(frozen=True, slots=True)
class TaxRuleVersion:
    """Immutable statutory Nigerian tax rule version bounded by effective dates."""

    rule_version_code: str
    regime: TaxRegimeType
    jurisdiction: str
    supply_category_code: str
    standard_rate: Decimal
    no_tin_penalty_rate: Decimal | None
    effective_from: date
    effective_to: date | None
    statutory_citation: str
    vat_nrs_category_code: str | None = None
    description: str = ""

    def __post_init__(self) -> None:
        if not 4 <= len(self.rule_version_code.strip()) <= 40:
            raise ValidationError(
                "rule_version_code must be between 4 and 40 characters.",
                field="rule_version_code",
            )
        if not 2 <= len(self.jurisdiction.strip()) <= 40:
            raise ValidationError(
                "jurisdiction must be between 2 and 40 characters.",
                field="jurisdiction",
            )
        if self.effective_to is not None and self.effective_to < self.effective_from:
            raise ValidationError(
                "effective_to cannot precede effective_from.",
                field="effective_to",
            )
        rate = parse_decimal(self.standard_rate, quantum=RATE_QUANTUM, field="standard_rate")
        if rate < Decimal("0") or rate > Decimal("1"):
            raise ValidationError(
                "standard_rate must be between 0 and 1.",
                field="standard_rate",
            )
        object.__setattr__(self, "standard_rate", rate)
        if self.no_tin_penalty_rate is not None:
            penalty = parse_decimal(
                self.no_tin_penalty_rate,
                quantum=RATE_QUANTUM,
                field="no_tin_penalty_rate",
            )
            if penalty < rate or penalty > Decimal("1"):
                raise ValidationError(
                    "no_tin_penalty_rate must be >= standard_rate and <= 1.",
                    field="no_tin_penalty_rate",
                )
            object.__setattr__(self, "no_tin_penalty_rate", penalty)

    def applies_on(self, target_date: date) -> bool:
        """Return True when target_date falls inside [effective_from, effective_to]."""
        if target_date < self.effective_from:
            return False
        return self.effective_to is None or target_date <= self.effective_to


@dataclass(frozen=True, slots=True)
class SmallCompanyEvaluation:
    """Result of evaluating Nigeria Tax Act 2025 small-company CIT & radar thresholds."""

    eligible_for_zero_cit: bool
    applicable_cit_rate: Decimal
    rule_version_code: str
    reason: str
    statutory_citation: str
    threshold_alert_level: ThresholdAlertLevel
    turnover_utilization_pct: Decimal
    asset_utilization_pct: Decimal


@dataclass(frozen=True, slots=True)
class NigerianTaxProfile:
    """Workspace-scoped Nigerian entity tax profile."""

    id: UUID
    workspace_id: UUID
    legal_form: NigerianLegalForm
    tin_number: str | None
    vat_registered: bool
    annual_turnover_ngn: Decimal
    fixed_assets_ngn: Decimal
    state_of_operation: str
    is_professional_services: bool
    effective_from: date
    effective_to: date | None = None

    @classmethod
    def create(
        cls,
        *,
        id: UUID,
        workspace_id: UUID,
        legal_form: NigerianLegalForm,
        tin_number: str | None,
        vat_registered: bool,
        annual_turnover_ngn: MoneyInput,
        fixed_assets_ngn: MoneyInput,
        state_of_operation: str,
        is_professional_services: bool,
        effective_from: date,
        effective_to: date | None = None,
    ) -> NigerianTaxProfile:
        """Construct a validated NigerianTaxProfile using strict Decimal parsing."""
        turnover = parse_decimal(
            annual_turnover_ngn,
            quantum=MONEY_QUANTUM,
            field="annual_turnover_ngn",
        )
        assets = parse_decimal(
            fixed_assets_ngn,
            quantum=MONEY_QUANTUM,
            field="fixed_assets_ngn",
        )
        if turnover < ZERO_MONEY:
            raise ValidationError(
                "annual_turnover_ngn cannot be negative.",
                field="annual_turnover_ngn",
            )
        if assets < ZERO_MONEY:
            raise ValidationError(
                "fixed_assets_ngn cannot be negative.",
                field="fixed_assets_ngn",
            )
        cleaned_tin = tin_number.strip() if tin_number is not None else None
        if cleaned_tin == "":
            cleaned_tin = None
        if cleaned_tin is not None and not 8 <= len(cleaned_tin) <= 20:
            raise ValidationError(
                "tin_number must be between 8 and 20 characters when provided.",
                field="tin_number",
            )
        cleaned_state = state_of_operation.strip().upper()
        if not 2 <= len(cleaned_state) <= 40:
            raise ValidationError(
                "state_of_operation must be between 2 and 40 characters.",
                field="state_of_operation",
            )
        if effective_to is not None and effective_to <= effective_from:
            raise ValidationError(
                "effective_to must be after effective_from.",
                field="effective_to",
            )
        return cls(
            id=id,
            workspace_id=workspace_id,
            legal_form=legal_form,
            tin_number=cleaned_tin,
            vat_registered=vat_registered,
            annual_turnover_ngn=turnover,
            fixed_assets_ngn=assets,
            state_of_operation=cleaned_state,
            is_professional_services=is_professional_services,
            effective_from=effective_from,
            effective_to=effective_to,
        )

    @property
    def has_valid_tin(self) -> bool:
        """Return True when the entity carries a non-empty validated TIN."""
        return self.tin_number is not None

    @property
    def is_professional_services_excluded_from_small_exempt(self) -> bool:
        """GraphQL mirror: True when professional-services exclusion disqualifies 0% CIT."""
        return self.is_professional_services

    @property
    def is_small_business_cit_exempt(self) -> bool:
        """Evaluate small-company CIT exemption as of the profile's effective date."""
        from nairabooks.tax.domain.rules import evaluate_small_company_eligibility

        return evaluate_small_company_eligibility(
            self,
            as_of_date=max(self.effective_from, date(2026, 1, 1)),
        ).eligible_for_zero_cit


def pct_utilization(value: Decimal, cap: Decimal) -> Decimal:
    """Compute percentage utilization against a statutory NGN cap rounded to 2dp."""
    if cap <= ZERO_MONEY:
        return ZERO_MONEY
    return ((value / cap) * HUNDRED_PERCENT).quantize(MONEY_QUANTUM, rounding=ROUND_HALF_UP)
