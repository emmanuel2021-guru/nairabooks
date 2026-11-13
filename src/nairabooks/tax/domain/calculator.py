"""Pure Nigerian VAT, 2024 WHT, State Consumption, Fiduciary Service Charge & NRS calculators."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from decimal import ROUND_HALF_UP, Decimal
from enum import StrEnum

from nairabooks.ledger.domain.errors import ValidationError
from nairabooks.ledger.domain.money import (
    MONEY_QUANTUM,
    RATE_QUANTUM,
    ZERO_MONEY,
    MoneyInput,
    parse_decimal,
)
from nairabooks.tax.domain.models import (
    NigerianTaxProfile,
    TaxRegimeType,
    TaxRuleVersion,
)
from nairabooks.tax.domain.rules import (
    DEFAULT_NIGERIAN_TAX_RULES,
    WHT_SMALL_ENTITY_MONTHLY_TX_CAP_NGN,
    WHT_SMALL_ENTITY_TURNOVER_CAP_NGN,
    TaxRuleSet,
    evaluate_small_company_eligibility,
)


class TransactionDirection(StrEnum):
    """Determines whether WHT is receivable credit (SALES) or payable deduction (PURCHASE)."""

    SALES = "SALES"
    PURCHASE = "PURCHASE"


@dataclass(frozen=True, slots=True)
class NrsTaxSubtotal:
    """NRS e-invoice TaxSubtotal breakdown separating Federal VAT, WHT, and State levies."""

    tax_scheme_id: str
    category_code: str
    taxable_amount_ngn: Decimal
    tax_rate: Decimal
    tax_amount_ngn: Decimal
    statutory_citation: str
    rule_version_code: str


@dataclass(frozen=True, slots=True)
class TaxAccountAllocation:
    """Ledger liability or asset account allocation for balanced double-entry tax posting."""

    account_code: str
    account_name: str
    side: str
    tax_scheme_id: str
    amount_ngn: Decimal


@dataclass(frozen=True, slots=True)
class TaxComputationPreview:
    """Server-computed single-regime Nigerian tax computation aligned with schema.graphql."""

    effective_date: date
    regime: TaxRegimeType
    rule_version_code: str
    supply_category_code: str
    taxable_base_ngn: Decimal
    applied_rate: Decimal
    computed_tax_ngn: Decimal
    vat_nrs_category_code: str | None
    wht_higher_no_tin_applied: bool
    wht_exempt_small_entity_applied: bool
    statutory_citation: str
    nrs_subtotals: tuple[NrsTaxSubtotal, ...]


@dataclass(frozen=True, slots=True)
class MultiLayerIndirectTaxBreakdown:
    """Concurrent Federal VAT + State Consumption + Fiduciary Service Charge + WHT computation."""

    effective_date: date
    jurisdiction: str
    base_amount_ngn: Decimal
    vat_amount_ngn: Decimal
    state_consumption_tax_ngn: Decimal
    service_charge_ngn: Decimal
    wht_deduction_ngn: Decimal
    gross_customer_invoice_ngn: Decimal
    net_cash_payable_ngn: Decimal
    vat_nrs_category_code: str
    wht_higher_no_tin_applied: bool
    wht_exempt_small_entity_applied: bool
    account_postings: tuple[TaxAccountAllocation, ...]
    nrs_subtotals: tuple[NrsTaxSubtotal, ...]


def _compute_amount(base_ngn: Decimal, rate: Decimal) -> Decimal:
    return (base_ngn * rate).quantize(MONEY_QUANTUM, rounding=ROUND_HALF_UP)


def compute_tax_preview(
    *,
    profile: NigerianTaxProfile,
    transaction_date: date,
    regime: TaxRegimeType,
    gross_amount_ngn: MoneyInput,
    counterparty_has_valid_tin: bool,
    supply_category_code: str,
    monthly_cumulative_with_supplier_ngn: MoneyInput = ZERO_MONEY,
    rule_set: TaxRuleSet | None = None,
) -> TaxComputationPreview:
    """Calculate Nigerian statutory tax strictly from effective-dated rules (SEC-REQ-04)."""
    base = parse_decimal(gross_amount_ngn, quantum=MONEY_QUANTUM, field="gross_amount_ngn")
    if base < ZERO_MONEY:
        raise ValidationError(
            "gross_amount_ngn cannot be negative.",
            field="gross_amount_ngn",
        )
    prior_monthly = parse_decimal(
        monthly_cumulative_with_supplier_ngn,
        quantum=MONEY_QUANTUM,
        field="monthly_cumulative_with_supplier_ngn",
    )
    if prior_monthly < ZERO_MONEY:
        raise ValidationError(
            "monthly_cumulative_with_supplier_ngn cannot be negative.",
            field="monthly_cumulative_with_supplier_ngn",
        )

    catalog = rule_set or TaxRuleSet(DEFAULT_NIGERIAN_TAX_RULES)

    if regime is TaxRegimeType.CIT_NIGERIA_TAX_ACT_2025:
        cit_eval = evaluate_small_company_eligibility(
            profile,
            as_of_date=transaction_date,
            rule_set=catalog,
        )
        computed = _compute_amount(base, cit_eval.applicable_cit_rate)
        subtotal = NrsTaxSubtotal(
            tax_scheme_id="CIT",
            category_code="EXEMPT" if cit_eval.eligible_for_zero_cit else "STANDARD",
            taxable_amount_ngn=base,
            tax_rate=cit_eval.applicable_cit_rate,
            tax_amount_ngn=computed,
            statutory_citation=cit_eval.statutory_citation,
            rule_version_code=cit_eval.rule_version_code,
        )
        return TaxComputationPreview(
            effective_date=transaction_date,
            regime=regime,
            rule_version_code=cit_eval.rule_version_code,
            supply_category_code=supply_category_code,
            taxable_base_ngn=base,
            applied_rate=cit_eval.applicable_cit_rate,
            computed_tax_ngn=computed,
            vat_nrs_category_code=None,
            wht_higher_no_tin_applied=False,
            wht_exempt_small_entity_applied=False,
            statutory_citation=cit_eval.statutory_citation,
            nrs_subtotals=(subtotal,),
        )

    jurisdiction = (
        profile.state_of_operation
        if regime is TaxRegimeType.STATE_HOSPITALITY_CONSUMPTION
        else "FEDERAL"
    )
    rule = catalog.resolve_rule(
        regime=regime,
        jurisdiction=jurisdiction,
        supply_category_code=supply_category_code,
        transaction_date=transaction_date,
    )

    applied_rate, no_tin_applied, small_wht_exempt = _resolve_effective_rate(
        rule=rule,
        profile=profile,
        base_amount=base,
        prior_monthly_cumulative=prior_monthly,
        counterparty_has_valid_tin=counterparty_has_valid_tin,
    )
    computed = _compute_amount(base, applied_rate)
    scheme_id, cat_code = _nrs_scheme_and_category(rule, small_wht_exempt=small_wht_exempt)

    subtotal = NrsTaxSubtotal(
        tax_scheme_id=scheme_id,
        category_code=cat_code,
        taxable_amount_ngn=base,
        tax_rate=applied_rate,
        tax_amount_ngn=computed,
        statutory_citation=rule.statutory_citation,
        rule_version_code=rule.rule_version_code,
    )
    return TaxComputationPreview(
        effective_date=transaction_date,
        regime=regime,
        rule_version_code=rule.rule_version_code,
        supply_category_code=supply_category_code,
        taxable_base_ngn=base,
        applied_rate=applied_rate,
        computed_tax_ngn=computed,
        vat_nrs_category_code=rule.vat_nrs_category_code,
        wht_higher_no_tin_applied=no_tin_applied,
        wht_exempt_small_entity_applied=small_wht_exempt,
        statutory_citation=rule.statutory_citation,
        nrs_subtotals=(subtotal,),
    )


def calculate_multi_layer_indirect_tax(
    *,
    profile: NigerianTaxProfile,
    transaction_date: date,
    base_amount_ngn: MoneyInput,
    vat_supply_category_code: str = "STANDARD_TAXABLE_SUPPLY",
    vat_regime: TaxRegimeType = TaxRegimeType.VAT_STANDARD_7_5,
    include_state_consumption_tax: bool = False,
    state_supply_category_code: str = "HOSPITALITY_CONSUMPTION_TAX",
    service_charge_rate: MoneyInput = Decimal("0.000000"),
    wht_supply_category_code: str | None = None,
    counterparty_has_valid_tin: bool = True,
    monthly_cumulative_with_supplier_ngn: MoneyInput = ZERO_MONEY,
    transaction_direction: TransactionDirection = TransactionDirection.SALES,
    rule_set: TaxRuleSet | None = None,
) -> MultiLayerIndirectTaxBreakdown:
    """Compute concurrent Federal VAT + State Consumption + Service Charge + WHT with GL splits."""
    if vat_regime not in (
        TaxRegimeType.VAT_STANDARD_7_5,
        TaxRegimeType.VAT_ZERO_RATED,
        TaxRegimeType.VAT_EXEMPT,
    ):
        raise ValidationError(
            "vat_regime must be a VAT regime (VAT_STANDARD_7_5, VAT_ZERO_RATED, or VAT_EXEMPT).",
            field="vat_regime",
        )

    base = parse_decimal(base_amount_ngn, quantum=MONEY_QUANTUM, field="base_amount_ngn")
    if base < ZERO_MONEY:
        raise ValidationError("base_amount_ngn cannot be negative.", field="base_amount_ngn")

    sc_rate = parse_decimal(service_charge_rate, quantum=RATE_QUANTUM, field="service_charge_rate")
    if sc_rate < Decimal("0") or sc_rate > Decimal("0.500000"):
        raise ValidationError(
            "service_charge_rate must be between 0.000000 and 0.500000.",
            field="service_charge_rate",
        )

    catalog = rule_set or TaxRuleSet(DEFAULT_NIGERIAN_TAX_RULES)

    vat_preview = compute_tax_preview(
        profile=profile,
        transaction_date=transaction_date,
        regime=vat_regime,
        gross_amount_ngn=base,
        counterparty_has_valid_tin=counterparty_has_valid_tin,
        supply_category_code=vat_supply_category_code,
        rule_set=catalog,
    )
    vat_amount = vat_preview.computed_tax_ngn
    vat_cat = vat_preview.vat_nrs_category_code or "E"

    subtotals: list[NrsTaxSubtotal] = [vat_preview.nrs_subtotals[0]]
    postings: list[TaxAccountAllocation] = []
    if vat_amount > ZERO_MONEY:
        postings.append(
            TaxAccountAllocation(
                account_code="2110",
                account_name="Output VAT Payable (7.5%)"
                if transaction_direction is TransactionDirection.SALES
                else "Input VAT Recoverable (7.5%)",
                side="CREDIT" if transaction_direction is TransactionDirection.SALES else "DEBIT",
                tax_scheme_id="VAT",
                amount_ngn=vat_amount,
            )
        )

    state_tax_amount = ZERO_MONEY
    if include_state_consumption_tax:
        state_preview = compute_tax_preview(
            profile=profile,
            transaction_date=transaction_date,
            regime=TaxRegimeType.STATE_HOSPITALITY_CONSUMPTION,
            gross_amount_ngn=base,
            counterparty_has_valid_tin=counterparty_has_valid_tin,
            supply_category_code=state_supply_category_code,
            rule_set=catalog,
        )
        state_tax_amount = state_preview.computed_tax_ngn
        subtotals.append(state_preview.nrs_subtotals[0])
        if state_tax_amount > ZERO_MONEY:
            postings.append(
                TaxAccountAllocation(
                    account_code="2130",
                    account_name=f"{profile.state_of_operation.title()} Consumption Levy Payable",
                    side="CREDIT"
                    if transaction_direction is TransactionDirection.SALES
                    else "DEBIT",
                    tax_scheme_id="STATE_CONSUMPTION",
                    amount_ngn=state_tax_amount,
                )
            )

    service_charge_amount = _compute_amount(base, sc_rate)
    if service_charge_amount > ZERO_MONEY:
        subtotals.append(
            NrsTaxSubtotal(
                tax_scheme_id="SERVICE_CHARGE",
                category_code="FIDUCIARY",
                taxable_amount_ngn=base,
                tax_rate=sc_rate,
                tax_amount_ngn=service_charge_amount,
                statutory_citation=(
                    "Fiduciary Hospitality Service Charge Pool (Non-Revenue Clearing)"
                ),
                rule_version_code="NG-FIDUCIARY-SC",
            )
        )
        postings.append(
            TaxAccountAllocation(
                account_code="2140",
                account_name="Fiduciary Staff Service Charge Payable",
                side="CREDIT" if transaction_direction is TransactionDirection.SALES else "DEBIT",
                tax_scheme_id="SERVICE_CHARGE",
                amount_ngn=service_charge_amount,
            )
        )

    wht_deduction = ZERO_MONEY
    wht_no_tin = False
    wht_small_exempt = False
    if wht_supply_category_code:
        wht_preview = compute_tax_preview(
            profile=profile,
            transaction_date=transaction_date,
            regime=TaxRegimeType.WHT_CORPORATE_AND_UNINCORPORATED,
            gross_amount_ngn=base,
            counterparty_has_valid_tin=counterparty_has_valid_tin,
            supply_category_code=wht_supply_category_code,
            monthly_cumulative_with_supplier_ngn=monthly_cumulative_with_supplier_ngn,
            rule_set=catalog,
        )
        wht_deduction = wht_preview.computed_tax_ngn
        wht_no_tin = wht_preview.wht_higher_no_tin_applied
        wht_small_exempt = wht_preview.wht_exempt_small_entity_applied
        subtotals.append(wht_preview.nrs_subtotals[0])
        if wht_deduction > ZERO_MONEY:
            if transaction_direction is TransactionDirection.SALES:
                postings.append(
                    TaxAccountAllocation(
                        account_code="1150",
                        account_name="WHT Credit Note Receivable",
                        side="DEBIT",
                        tax_scheme_id="WHT",
                        amount_ngn=wht_deduction,
                    )
                )
            else:
                postings.append(
                    TaxAccountAllocation(
                        account_code="2120",
                        account_name="Withholding Tax Payable",
                        side="CREDIT",
                        tax_scheme_id="WHT",
                        amount_ngn=wht_deduction,
                    )
                )

    gross_invoice = (base + vat_amount + state_tax_amount + service_charge_amount).quantize(
        MONEY_QUANTUM, rounding=ROUND_HALF_UP
    )
    net_cash = (gross_invoice - wht_deduction).quantize(MONEY_QUANTUM, rounding=ROUND_HALF_UP)

    return MultiLayerIndirectTaxBreakdown(
        effective_date=transaction_date,
        jurisdiction=profile.state_of_operation,
        base_amount_ngn=base,
        vat_amount_ngn=vat_amount,
        state_consumption_tax_ngn=state_tax_amount,
        service_charge_ngn=service_charge_amount,
        wht_deduction_ngn=wht_deduction,
        gross_customer_invoice_ngn=gross_invoice,
        net_cash_payable_ngn=net_cash,
        vat_nrs_category_code=vat_cat,
        wht_higher_no_tin_applied=wht_no_tin,
        wht_exempt_small_entity_applied=wht_small_exempt,
        account_postings=tuple(postings),
        nrs_subtotals=tuple(subtotals),
    )


def _resolve_effective_rate(
    *,
    rule: TaxRuleVersion,
    profile: NigerianTaxProfile,
    base_amount: Decimal,
    prior_monthly_cumulative: Decimal,
    counterparty_has_valid_tin: bool,
) -> tuple[Decimal, bool, bool]:
    if rule.regime is not TaxRegimeType.WHT_CORPORATE_AND_UNINCORPORATED:
        return rule.standard_rate, False, False

    if not counterparty_has_valid_tin:
        penalty = rule.no_tin_penalty_rate or rule.standard_rate
        return penalty, True, False

    monthly_total = prior_monthly_cumulative + base_amount
    if (
        profile.annual_turnover_ngn <= WHT_SMALL_ENTITY_TURNOVER_CAP_NGN
        and monthly_total <= WHT_SMALL_ENTITY_MONTHLY_TX_CAP_NGN
    ):
        return Decimal("0.000000"), False, True

    return rule.standard_rate, False, False


def _nrs_scheme_and_category(
    rule: TaxRuleVersion,
    *,
    small_wht_exempt: bool,
) -> tuple[str, str]:
    if rule.regime in (
        TaxRegimeType.VAT_STANDARD_7_5,
        TaxRegimeType.VAT_ZERO_RATED,
        TaxRegimeType.VAT_EXEMPT,
    ):
        return "VAT", rule.vat_nrs_category_code or "S"
    if rule.regime is TaxRegimeType.WHT_CORPORATE_AND_UNINCORPORATED:
        return "WHT", "EXEMPT_SMALL_ENTITY" if small_wht_exempt else rule.supply_category_code
    if rule.regime is TaxRegimeType.STATE_HOSPITALITY_CONSUMPTION:
        return "STATE_CONSUMPTION", rule.jurisdiction
    return rule.regime.value, rule.supply_category_code
