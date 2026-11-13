"""Application use cases for composing, validating, and applying industry packs."""

from __future__ import annotations

from collections.abc import Sequence
from dataclasses import dataclass
from datetime import date
from uuid import UUID, uuid5

from nairabooks.ledger.application.ports import LedgerStore
from nairabooks.ledger.application.use_cases import (
    PostJournalVoucherCommand,
    PostJournalVoucherUseCase,
)
from nairabooks.ledger.domain.errors import ValidationError
from nairabooks.ledger.domain.models import (
    ChartOfAccount,
    JournalLineInput,
    JournalVoucher,
)
from nairabooks.ledger.domain.money import CurrencyCode, MoneyInput
from nairabooks.packs.application.ports import IndustryPackStore
from nairabooks.packs.domain.composer import (
    PRIMITIVE_CATALOG,
    PrimitiveCapabilitySpec,
    build_manifest_from_primitives,
    compose_hybrid_pack,
)
from nairabooks.packs.domain.flagship import (
    FLAGSHIP_PACK_CATALOG,
    FlagshipPackPreset,
)
from nairabooks.packs.domain.models import (
    FlagshipPackCode,
    IndustryPackManifest,
    OperationalPrimitive,
    WorkspaceIndustryProfile,
)
from nairabooks.packs.domain.operations import (
    ConstructionJobProgressInput,
    DinerServiceShiftInput,
    HospitalityFolioInput,
    ManufacturingBomRunInput,
    NonProfitGrantActivityInput,
    PackOperationPostingPlan,
    PackOperationType,
    ProfessionalTimeBillingInput,
    RetailPosCashupInput,
    WholesaleLandedPurchaseInput,
    build_construction_job_progress_plan,
    build_diner_service_shift_plan,
    build_hospitality_folio_plan,
    build_manufacturing_bom_plan,
    build_nonprofit_grant_activity_plan,
    build_professional_time_billing_plan,
    build_retail_pos_cashup_plan,
    build_wholesale_landed_purchase_plan,
)


@dataclass(frozen=True, slots=True)
class ComposeCustomPackCommand:
    """Preview command for validating and assembling a custom/hybrid business pack."""

    workspace_id: UUID
    primary_pack: FlagshipPackCode
    primitives: tuple[OperationalPrimitive, ...]
    is_hybrid_multi_unit: bool = False
    display_name: str = "Custom Composable Business Pack"
    terminology_overrides: dict[str, str] | None = None
    extra_manifests: tuple[IndustryPackManifest, ...] = ()


@dataclass(frozen=True, slots=True)
class ConfigureIndustryPackCommand:
    """Command aligned with ConfigureIndustryPackInput in api/graphql/schema.graphql."""

    workspace_id: UUID
    primary_pack: FlagshipPackCode
    is_hybrid_multi_unit: bool
    primitives: tuple[OperationalPrimitive, ...]
    terminology_overrides: dict[str, str] | None = None
    extra_manifests: tuple[IndustryPackManifest, ...] = ()


class ListPrimitiveCapabilitiesUseCase:
    """Return all 10 reusable operational capability primitives."""

    def execute(self) -> tuple[PrimitiveCapabilitySpec, ...]:
        return tuple(PRIMITIVE_CATALOG.values())


class GetWorkspacePackProfileUseCase:
    """Return the active workspace's composed WorkspaceIndustryProfile."""

    def __init__(self, pack_store: IndustryPackStore) -> None:
        self._pack_store = pack_store

    def execute(self, *, workspace_id: UUID) -> WorkspaceIndustryProfile:
        return self._pack_store.get_workspace_pack_profile(workspace_id)


class ComposeCustomPackPreviewUseCase:
    """Validate and preview a custom or hybrid multi-unit pack without persisting."""

    def execute(self, command: ComposeCustomPackCommand) -> WorkspaceIndustryProfile:
        manifests: list[IndustryPackManifest] = [
            build_manifest_from_primitives(
                pack_code=command.primary_pack,
                display_name=command.display_name,
                primitives=command.primitives,
                terminology_overrides=command.terminology_overrides,
            )
        ]
        manifests.extend(command.extra_manifests)
        return compose_hybrid_pack(
            workspace_id=command.workspace_id,
            primary_pack=command.primary_pack,
            manifests=manifests,
            is_hybrid_multi_unit=command.is_hybrid_multi_unit,
            terminology_overrides=command.terminology_overrides,
        )


class ConfigureIndustryPackUseCase:
    """Compose, persist, and apply an Industry Pack's IFRS CoA onto the workspace ledger."""

    def __init__(
        self,
        *,
        pack_store: IndustryPackStore,
        ledger_store: LedgerStore | None = None,
    ) -> None:
        self._pack_store = pack_store
        self._ledger_store = ledger_store

    def execute(self, command: ConfigureIndustryPackCommand) -> WorkspaceIndustryProfile:
        if not command.primitives and not command.extra_manifests:
            raise ValidationError(
                "At least one operational primitive must be selected.",
                field="primitives",
            )
        manifests: list[IndustryPackManifest] = []
        if command.primitives:
            manifests.append(
                build_manifest_from_primitives(
                    pack_code=command.primary_pack,
                    display_name=f"{command.primary_pack.value} Profile",
                    primitives=command.primitives,
                    terminology_overrides=command.terminology_overrides,
                )
            )
        manifests.extend(command.extra_manifests)

        composed = compose_hybrid_pack(
            workspace_id=command.workspace_id,
            primary_pack=command.primary_pack,
            manifests=manifests,
            is_hybrid_multi_unit=command.is_hybrid_multi_unit,
            terminology_overrides=command.terminology_overrides,
        )

        if self._ledger_store is not None:
            _provision_pack_accounts_to_ledger(
                ledger_store=self._ledger_store,
                workspace_id=command.workspace_id,
                profile=composed,
            )

        return self._pack_store.save_workspace_pack_profile(composed)


def _provision_pack_accounts_to_ledger(
    *,
    ledger_store: LedgerStore,
    workspace_id: UUID,
    profile: WorkspaceIndustryProfile,
) -> None:
    with ledger_store.transaction():
        existing = {
            acct.code: acct
            for acct in ledger_store.list_accounts(workspace_id=workspace_id, active_only=False)
        }
        for blueprint in profile.coa_accounts:
            match = existing.get(blueprint.code)
            if match is not None:
                if match.category != blueprint.category:
                    raise ValidationError(
                        f"Ledger account '{blueprint.code}' already exists as "
                        f"{match.category.value} and conflicts with pack account "
                        f"'{blueprint.name}' ({blueprint.category.value}).",
                        field="coa_accounts",
                    )
                continue
            deterministic_id = uuid5(workspace_id, f"pack-acct:{blueprint.code}")
            ledger_store.seed_account(
                ChartOfAccount(
                    id=deterministic_id,
                    workspace_id=workspace_id,
                    code=blueprint.code,
                    name=blueprint.name,
                    category=blueprint.category,
                    ifrs_tag=blueprint.ifrs_tag,
                    source_primitive=blueprint.source_primitive.value,
                    is_system_locked=blueprint.is_system_locked,
                    is_active=True,
                )
            )


def normalize_primitives(raw_items: Sequence[str]) -> tuple[OperationalPrimitive, ...]:
    """Parse and deduplicate GraphQL/REST OperationalPrimitive strings."""
    parsed: list[OperationalPrimitive] = []
    for raw in raw_items:
        try:
            prim = OperationalPrimitive(raw)
        except ValueError as exc:
            raise ValidationError(
                f"Unknown operational primitive '{raw}'.",
                field="primitives",
            ) from exc
        if prim not in parsed:
            parsed.append(prim)
    return tuple(parsed)


@dataclass(frozen=True, slots=True)
class ApplyFlagshipPackCommand:
    """Apply one of the 6 Flagship Reference Packs onto a workspace."""

    workspace_id: UUID
    pack_code: FlagshipPackCode
    terminology_overrides: dict[str, str] | None = None


@dataclass(frozen=True, slots=True)
class PostPackOperationCommand:
    """Execute a Flagship operational workflow and post balanced IFRS entries."""

    workspace_id: UUID
    actor_user_id: UUID
    idempotency_key: UUID
    posting_date: date
    operation_type: PackOperationType
    reference: str
    payload: dict[str, object]


class ListFlagshipPacksUseCase:
    """Return all 6 Nigerian Flagship Reference Pack starter templates."""

    def execute(self) -> tuple[FlagshipPackPreset, ...]:
        return tuple(FLAGSHIP_PACK_CATALOG.values())


class ApplyFlagshipPackUseCase:
    """Resolve a Flagship Pack preset, configure the workspace, and seed its IFRS accounts."""

    def __init__(
        self,
        *,
        pack_store: IndustryPackStore,
        ledger_store: LedgerStore | None = None,
    ) -> None:
        self._configure_uc = ConfigureIndustryPackUseCase(
            pack_store=pack_store,
            ledger_store=ledger_store,
        )

    def execute(self, command: ApplyFlagshipPackCommand) -> WorkspaceIndustryProfile:
        preset = FLAGSHIP_PACK_CATALOG.get(command.pack_code)
        if preset is None:
            raise ValidationError(
                f"Flagship pack '{command.pack_code.value}' is not a predefined reference preset.",
                field="packCode",
            )
        merged_labels = dict(preset.terminology_defaults)
        if command.terminology_overrides:
            merged_labels.update(
                {k: v for k, v in command.terminology_overrides.items() if v.strip()}
            )
        return self._configure_uc.execute(
            ConfigureIndustryPackCommand(
                workspace_id=command.workspace_id,
                primary_pack=preset.pack_code,
                is_hybrid_multi_unit=False,
                primitives=preset.recommended_primitives,
                terminology_overrides=merged_labels,
            )
        )


def _req_money(payload: dict[str, object], key: str, default: str | None = None) -> MoneyInput:
    val = payload.get(key, default)
    if isinstance(val, bool) or isinstance(val, float) or not isinstance(val, int | str):
        raise ValidationError(
            f"Field '{key}' must be a fixed decimal string.",
            field=key,
        )
    return val


def _req_int(payload: dict[str, object], key: str) -> int:
    val = payload.get(key)
    if isinstance(val, bool) or not isinstance(val, int):
        raise ValidationError(f"Field '{key}' must be a positive integer.", field=key)
    return val


def _req_str(payload: dict[str, object], key: str) -> str:
    val = payload.get(key)
    if not isinstance(val, str):
        raise ValidationError(f"Field '{key}' must be a string.", field=key)
    return val


def _opt_bool(payload: dict[str, object], key: str, default: bool = True) -> bool:
    val = payload.get(key, default)
    if not isinstance(val, bool):
        raise ValidationError(f"Field '{key}' must be a boolean.", field=key)
    return val


def _plan_operation(
    *,
    operation_type: PackOperationType,
    reference: str,
    payload: dict[str, object],
) -> PackOperationPostingPlan:
    if operation_type is PackOperationType.RETAIL_POS_CASHUP:
        return build_retail_pos_cashup_plan(
            RetailPosCashupInput(
                reference=reference,
                gross_sales_ngn=_req_money(payload, "grossSalesNgn"),
                cash_tender_ngn=_req_money(payload, "cashTenderNgn", "0.00"),
                pos_card_tender_ngn=_req_money(payload, "posCardTenderNgn", "0.00"),
                pos_mdr_fee_ngn=_req_money(payload, "posMdrFeeNgn", "0.00"),
                cogs_ngn=_req_money(payload, "cogsNgn", "0.00"),
                vat_inclusive=_opt_bool(payload, "vatInclusive", True),
            )
        )
    if operation_type is PackOperationType.WHOLESALE_LANDED_RECEIPT:
        return build_wholesale_landed_purchase_plan(
            WholesaleLandedPurchaseInput(
                reference=reference,
                units_received=_req_int(payload, "unitsReceived"),
                supplier_invoice_ngn=_req_money(payload, "supplierInvoiceNgn"),
                freight_and_clearing_ngn=_req_money(payload, "freightAndClearingNgn", "0.00"),
                selling_price_per_unit_ngn=_req_money(payload, "sellingPricePerUnitNgn"),
            )
        )
    if operation_type is PackOperationType.MANUFACTURING_BOM_RUN:
        return build_manufacturing_bom_plan(
            ManufacturingBomRunInput(
                reference=reference,
                raw_materials_issued_ngn=_req_money(payload, "rawMaterialsIssuedNgn"),
                direct_conversion_cost_ngn=_req_money(payload, "directConversionCostNgn", "0.00"),
                scrap_spoilage_ngn=_req_money(payload, "scrapSpoilageNgn", "0.00"),
                units_produced=_req_int(payload, "unitsProduced"),
            )
        )
    if operation_type is PackOperationType.CONSTRUCTION_JOB_PROGRESS:
        return build_construction_job_progress_plan(
            ConstructionJobProgressInput(
                reference=reference,
                project_site=_req_str(payload, "projectSite"),
                certified_valuation_ngn=_req_money(payload, "certifiedValuationNgn", "0.00"),
                client_retention_pct=_req_money(payload, "clientRetentionPct", "5.00"),
                materials_issued_ngn=_req_money(payload, "materialsIssuedNgn", "0.00"),
                subcontractor_claim_ngn=_req_money(payload, "subcontractorClaimNgn", "0.00"),
                subcontractor_retention_pct=_req_money(
                    payload, "subcontractorRetentionPct", "5.00"
                ),
                subcontractor_wht_rate_pct=_req_money(payload, "subcontractorWhtRatePct", "2.00"),
                subcontractor_has_tin=_opt_bool(payload, "subcontractorHasTin", True),
            )
        )
    if operation_type is PackOperationType.PROFESSIONAL_TIME_BILLING:
        return build_professional_time_billing_plan(
            ProfessionalTimeBillingInput(
                reference=reference,
                engagement_code=_req_str(payload, "engagementCode"),
                billable_hours=_req_money(payload, "billableHours"),
                hourly_rate_ngn=_req_money(payload, "hourlyRateNgn"),
                billed_fee_ngn=_req_money(payload, "billedFeeNgn"),
                retainer_applied_ngn=_req_money(payload, "retainerAppliedNgn", "0.00"),
                reimbursable_expense_ngn=_req_money(payload, "reimbursableExpenseNgn", "0.00"),
                wht_rate_pct=_req_money(payload, "whtRatePct", "5.00"),
                vat_applicable=_opt_bool(payload, "vatApplicable", True),
            )
        )
    if operation_type is PackOperationType.NONPROFIT_GRANT_ACTIVITY:
        return build_nonprofit_grant_activity_plan(
            NonProfitGrantActivityInput(
                reference=reference,
                donor_fund_name=_req_str(payload, "donorFundName"),
                fund_restriction=_req_str(payload, "fundRestriction"),
                approved_budget_ngn=_req_money(payload, "approvedBudgetNgn"),
                tranche_received_ngn=_req_money(payload, "trancheReceivedNgn", "0.00"),
                program_spend_ngn=_req_money(payload, "programSpendNgn", "0.00"),
                prior_spend_ngn=_req_money(payload, "priorSpendNgn", "0.00"),
            )
        )
    if operation_type is PackOperationType.HOSPITALITY_FOLIO_SETTLEMENT:
        return build_hospitality_folio_plan(
            HospitalityFolioInput(
                reference=reference,
                property_wing=_req_str(payload, "propertyWing"),
                rooms_sold=_req_int(payload, "roomsSold"),
                available_rooms=_req_int(payload, "availableRooms"),
                room_rate_base_ngn=_req_money(payload, "roomRateBaseNgn"),
                apply_lagos_consumption_tax=_opt_bool(payload, "applyLagosConsumptionTax", True),
                service_charge_rate_pct=_req_money(payload, "serviceChargeRatePct", "10.00"),
            )
        )
    if operation_type is PackOperationType.DINER_SERVICE_SHIFT:
        return build_diner_service_shift_plan(
            DinerServiceShiftInput(
                reference=reference,
                dining_outlet=_req_str(payload, "diningOutlet"),
                covers_served=_req_int(payload, "coversServed"),
                food_beverage_sales_ngn=_req_money(payload, "foodBeverageSalesNgn"),
                ingredient_cogs_ngn=_req_money(payload, "ingredientCogsNgn", "0.00"),
                kitchen_spoilage_ngn=_req_money(payload, "kitchenSpoilageNgn", "0.00"),
                apply_state_consumption_tax=_opt_bool(payload, "applyStateConsumptionTax", True),
            )
        )
    raise ValidationError(
        f"Unsupported pack operation '{operation_type}'.",
        field="operationType",
    )


class PostPackOperationUseCase:
    """Compute balanced operational accounting lines and post them to LedgerStore."""

    def __init__(self, ledger_store: LedgerStore) -> None:
        self._ledger_store = ledger_store
        self._post_uc = PostJournalVoucherUseCase(ledger_store)

    def execute_with_plan(
        self, command: PostPackOperationCommand
    ) -> tuple[JournalVoucher, PackOperationPostingPlan]:
        plan = _plan_operation(
            operation_type=command.operation_type,
            reference=command.reference,
            payload=command.payload,
        )
        accounts_by_code = {
            acct.code: acct
            for acct in self._ledger_store.list_accounts(
                workspace_id=command.workspace_id,
                active_only=True,
            )
        }
        line_inputs: list[JournalLineInput] = []
        for planned in plan.lines:
            acct = accounts_by_code.get(planned.account_code)
            if acct is None:
                raise ValidationError(
                    f"Required pack account '{planned.account_code}' is not enabled yet. "
                    "Apply the matching Industry Pack before posting.",
                    field="operationType",
                )
            line_inputs.append(
                JournalLineInput(
                    account_id=acct.id,
                    debit_amount=planned.debit_ngn,
                    credit_amount=planned.credit_ngn,
                    currency=CurrencyCode.NGN,
                    memo=planned.memo,
                )
            )

        voucher = self._post_uc.execute(
            PostJournalVoucherCommand(
                workspace_id=command.workspace_id,
                actor_user_id=command.actor_user_id,
                idempotency_key=command.idempotency_key,
                posting_date=command.posting_date,
                reference=plan.reference,
                source_module=command.operation_type.value,
                lines=tuple(line_inputs),
            )
        )
        return voucher, plan

    def execute(self, command: PostPackOperationCommand) -> JournalVoucher:
        voucher, _ = self.execute_with_plan(command)
        return voucher
