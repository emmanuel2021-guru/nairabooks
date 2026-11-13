"""Application use cases for Nigeria Tax Act 2025, 2024 WHT, VAT, and NRS calculations."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from decimal import Decimal
from uuid import UUID, uuid4

from nairabooks.ledger.domain.money import (
    MONEY_QUANTUM,
    RATE_QUANTUM,
    ZERO_MONEY,
    MoneyInput,
    parse_decimal,
)
from nairabooks.tax.application.ports import TaxProfileStore
from nairabooks.tax.domain import (
    MultiLayerIndirectTaxBreakdown,
    NigerianLegalForm,
    NigerianTaxProfile,
    SmallCompanyEvaluation,
    TaxComputationPreview,
    TaxRegimeType,
    TaxRuleSet,
    TaxRuleVersion,
    TransactionDirection,
    calculate_multi_layer_indirect_tax,
    compute_tax_preview,
    evaluate_small_company_eligibility,
)


@dataclass(frozen=True, slots=True)
class UpdateTaxProfileCommand:
    """Command to update and version a workspace's Nigerian entity tax profile."""

    workspace_id: UUID
    legal_form: NigerianLegalForm
    tin_number: str | None
    vat_registered: bool
    annual_turnover_ngn: MoneyInput
    fixed_assets_ngn: MoneyInput
    state_of_operation: str
    is_professional_services: bool = False
    effective_from: date = date(2026, 1, 1)


@dataclass(frozen=True, slots=True)
class PreviewNigerianTaxCommand:
    """Command aligned with PreviewNigerianTaxInput (SEC-REQ-04: no caller rate override)."""

    workspace_id: UUID
    transaction_date: date
    regime: TaxRegimeType
    gross_amount_ngn: MoneyInput
    counterparty_has_valid_tin: bool
    supply_category_code: str
    monthly_cumulative_with_supplier_ngn: MoneyInput = ZERO_MONEY

    def __post_init__(self) -> None:
        parse_decimal(self.gross_amount_ngn, quantum=MONEY_QUANTUM, field="gross_amount_ngn")
        parse_decimal(
            self.monthly_cumulative_with_supplier_ngn,
            quantum=MONEY_QUANTUM,
            field="monthly_cumulative_with_supplier_ngn",
        )


@dataclass(frozen=True, slots=True)
class CalculateMultiLayerIndirectTaxCommand:
    """Command for combined VAT + State Consumption + Fiduciary Service Charge + WHT computation."""

    workspace_id: UUID
    transaction_date: date
    base_amount_ngn: MoneyInput
    vat_supply_category_code: str = "STANDARD_TAXABLE_SUPPLY"
    vat_regime: TaxRegimeType = TaxRegimeType.VAT_STANDARD_7_5
    include_state_consumption_tax: bool = False
    state_supply_category_code: str = "HOSPITALITY_CONSUMPTION_TAX"
    service_charge_rate: MoneyInput = Decimal("0.000000")
    wht_supply_category_code: str | None = None
    counterparty_has_valid_tin: bool = True
    monthly_cumulative_with_supplier_ngn: MoneyInput = ZERO_MONEY
    transaction_direction: TransactionDirection = TransactionDirection.SALES

    def __post_init__(self) -> None:
        parse_decimal(self.base_amount_ngn, quantum=MONEY_QUANTUM, field="base_amount_ngn")
        parse_decimal(self.service_charge_rate, quantum=RATE_QUANTUM, field="service_charge_rate")
        parse_decimal(
            self.monthly_cumulative_with_supplier_ngn,
            quantum=MONEY_QUANTUM,
            field="monthly_cumulative_with_supplier_ngn",
        )


class GetTaxProfileUseCase:
    """Return active tax profile and Tax Act 2025 threshold evaluation."""

    def __init__(self, store: TaxProfileStore) -> None:
        self._store = store

    def execute(
        self,
        *,
        workspace_id: UUID,
        as_of_date: date = date(2026, 3, 1),
    ) -> tuple[NigerianTaxProfile, SmallCompanyEvaluation]:
        profile = self._store.get_active_tax_profile(workspace_id, as_of_date=as_of_date)
        rule_set = TaxRuleSet(self._store.list_tax_rules())
        evaluation = evaluate_small_company_eligibility(
            profile,
            as_of_date=as_of_date,
            rule_set=rule_set,
        )
        return profile, evaluation


class UpdateTaxProfileUseCase:
    """Validate, persist, and evaluate a workspace Nigerian tax profile update."""

    def __init__(self, store: TaxProfileStore) -> None:
        self._store = store

    def execute(
        self, command: UpdateTaxProfileCommand
    ) -> tuple[NigerianTaxProfile, SmallCompanyEvaluation]:
        profile = NigerianTaxProfile.create(
            id=uuid4(),
            workspace_id=command.workspace_id,
            legal_form=command.legal_form,
            tin_number=command.tin_number,
            vat_registered=command.vat_registered,
            annual_turnover_ngn=command.annual_turnover_ngn,
            fixed_assets_ngn=command.fixed_assets_ngn,
            state_of_operation=command.state_of_operation,
            is_professional_services=command.is_professional_services,
            effective_from=command.effective_from,
        )
        saved = self._store.save_tax_profile(profile)
        rule_set = TaxRuleSet(self._store.list_tax_rules())
        evaluation = evaluate_small_company_eligibility(
            saved,
            as_of_date=max(command.effective_from, date(2026, 1, 1)),
            rule_set=rule_set,
        )
        return saved, evaluation


class ListTaxRulesUseCase:
    """List effective-dated statutory Nigerian tax rule versions."""

    def __init__(self, store: TaxProfileStore) -> None:
        self._store = store

    def execute(self) -> tuple[TaxRuleVersion, ...]:
        return self._store.list_tax_rules()


class PreviewNigerianTaxUseCase:
    """Compute a single Nigerian statutory tax preview from effective-dated rules."""

    def __init__(self, store: TaxProfileStore) -> None:
        self._store = store

    def execute(self, command: PreviewNigerianTaxCommand) -> TaxComputationPreview:
        profile = self._store.get_active_tax_profile(
            command.workspace_id,
            as_of_date=command.transaction_date,
        )
        rule_set = TaxRuleSet(self._store.list_tax_rules())
        return compute_tax_preview(
            profile=profile,
            transaction_date=command.transaction_date,
            regime=command.regime,
            gross_amount_ngn=command.gross_amount_ngn,
            counterparty_has_valid_tin=command.counterparty_has_valid_tin,
            supply_category_code=command.supply_category_code,
            monthly_cumulative_with_supplier_ngn=command.monthly_cumulative_with_supplier_ngn,
            rule_set=rule_set,
        )


class CalculateMultiLayerIndirectTaxUseCase:
    """Compute concurrent Federal VAT, State Levy, Service Charge, WHT, & NRS subtotals."""

    def __init__(self, store: TaxProfileStore) -> None:
        self._store = store

    def execute(
        self, command: CalculateMultiLayerIndirectTaxCommand
    ) -> MultiLayerIndirectTaxBreakdown:
        profile = self._store.get_active_tax_profile(
            command.workspace_id,
            as_of_date=command.transaction_date,
        )
        rule_set = TaxRuleSet(self._store.list_tax_rules())
        return calculate_multi_layer_indirect_tax(
            profile=profile,
            transaction_date=command.transaction_date,
            base_amount_ngn=command.base_amount_ngn,
            vat_supply_category_code=command.vat_supply_category_code,
            vat_regime=command.vat_regime,
            include_state_consumption_tax=command.include_state_consumption_tax,
            state_supply_category_code=command.state_supply_category_code,
            service_charge_rate=command.service_charge_rate,
            wht_supply_category_code=command.wht_supply_category_code,
            counterparty_has_valid_tin=command.counterparty_has_valid_tin,
            monthly_cumulative_with_supplier_ngn=command.monthly_cumulative_with_supplier_ngn,
            transaction_direction=command.transaction_direction,
            rule_set=rule_set,
        )
