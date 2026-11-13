"""Deterministic operational posting planners for all Flagship & Template Packs."""

from __future__ import annotations

from dataclasses import dataclass
from decimal import ROUND_HALF_UP, Decimal
from enum import StrEnum

from nairabooks.ledger.domain.errors import ValidationError
from nairabooks.ledger.domain.money import MONEY_QUANTUM, ZERO_MONEY, MoneyInput, parse_decimal


class PackOperationType(StrEnum):
    """Supported Flagship & Template Pack operational posting workflows."""

    RETAIL_POS_CASHUP = "RETAIL_POS_CASHUP"
    WHOLESALE_LANDED_RECEIPT = "WHOLESALE_LANDED_RECEIPT"
    MANUFACTURING_BOM_RUN = "MANUFACTURING_BOM_RUN"
    CONSTRUCTION_JOB_PROGRESS = "CONSTRUCTION_JOB_PROGRESS"
    PROFESSIONAL_TIME_BILLING = "PROFESSIONAL_TIME_BILLING"
    NONPROFIT_GRANT_ACTIVITY = "NONPROFIT_GRANT_ACTIVITY"
    HOSPITALITY_FOLIO_SETTLEMENT = "HOSPITALITY_FOLIO_SETTLEMENT"
    DINER_SERVICE_SHIFT = "DINER_SERVICE_SHIFT"


@dataclass(frozen=True, slots=True)
class PackPlannedLine:
    """Balanced double-entry line targeting an account code in Workspace ChartOfAccounts."""

    account_code: str
    debit_ngn: Decimal
    credit_ngn: Decimal
    memo: str


@dataclass(frozen=True, slots=True)
class PackOperationPostingPlan:
    """Computed KPI summary and kobo-balanced IFRS journal plan for a pack workflow."""

    operation_type: PackOperationType
    reference: str
    summary: str
    metrics: dict[str, str]
    lines: tuple[PackPlannedLine, ...]


@dataclass(frozen=True, slots=True)
class RetailPosCashupInput:
    """Daily Z-report inputs for Retail & E-Commerce POS settlement + COGS."""

    reference: str
    gross_sales_ngn: MoneyInput
    cash_tender_ngn: MoneyInput
    pos_card_tender_ngn: MoneyInput
    pos_mdr_fee_ngn: MoneyInput = "0.00"
    cogs_ngn: MoneyInput = "0.00"
    vat_inclusive: bool = True


@dataclass(frozen=True, slots=True)
class WholesaleLandedPurchaseInput:
    """Vendor stock receipt + shipping/clearing capitalization inputs (IAS 2)."""

    reference: str
    units_received: int
    supplier_invoice_ngn: MoneyInput
    freight_and_clearing_ngn: MoneyInput
    selling_price_per_unit_ngn: MoneyInput


@dataclass(frozen=True, slots=True)
class ManufacturingBomRunInput:
    """BOM batch completion inputs converting raw inputs + WIP -> Finished Goods."""

    reference: str
    raw_materials_issued_ngn: MoneyInput
    direct_conversion_cost_ngn: MoneyInput
    scrap_spoilage_ngn: MoneyInput
    units_produced: int


@dataclass(frozen=True, slots=True)
class ConstructionJobProgressInput:
    """Construction site progress billing, material issues, retention & 2%/5% WHT."""

    reference: str
    project_site: str
    certified_valuation_ngn: MoneyInput = "0.00"
    client_retention_pct: MoneyInput = "5.00"
    materials_issued_ngn: MoneyInput = "0.00"
    subcontractor_claim_ngn: MoneyInput = "0.00"
    subcontractor_retention_pct: MoneyInput = "5.00"
    subcontractor_wht_rate_pct: MoneyInput = "2.00"
    subcontractor_has_tin: bool = True


@dataclass(frozen=True, slots=True)
class ProfessionalTimeBillingInput:
    """Advisory time realization, retainer drawdown, reimbursements & WHT credit."""

    reference: str
    engagement_code: str
    billable_hours: MoneyInput
    hourly_rate_ngn: MoneyInput
    billed_fee_ngn: MoneyInput
    retainer_applied_ngn: MoneyInput = "0.00"
    reimbursable_expense_ngn: MoneyInput = "0.00"
    wht_rate_pct: MoneyInput = "5.00"
    vat_applicable: bool = True


@dataclass(frozen=True, slots=True)
class NonProfitGrantActivityInput:
    """Restricted vs unrestricted donor grant tranche & budget-vs-actual spend."""

    reference: str
    donor_fund_name: str
    fund_restriction: str
    approved_budget_ngn: MoneyInput
    tranche_received_ngn: MoneyInput = "0.00"
    program_spend_ngn: MoneyInput = "0.00"
    prior_spend_ngn: MoneyInput = "0.00"


@dataclass(frozen=True, slots=True)
class HospitalityFolioInput:
    """USALI guest folio settlement with 7.5% VAT, 5% State Levy & Service Charge."""

    reference: str
    property_wing: str
    rooms_sold: int
    available_rooms: int
    room_rate_base_ngn: MoneyInput
    apply_lagos_consumption_tax: bool = True
    service_charge_rate_pct: MoneyInput = "10.00"


@dataclass(frozen=True, slots=True)
class DinerServiceShiftInput:
    """Diner shift POS, recipe COGS, spoilage & state hospitality consumption levy."""

    reference: str
    dining_outlet: str
    covers_served: int
    food_beverage_sales_ngn: MoneyInput
    ingredient_cogs_ngn: MoneyInput = "0.00"
    kitchen_spoilage_ngn: MoneyInput = "0.00"
    apply_state_consumption_tax: bool = True


_VAT_FACTOR = Decimal("1.075")
_VAT_RATE = Decimal("0.075")
_LAGOS_CONSUMPTION_RATE = Decimal("0.05")
_HUNDRED = Decimal("100")
_ZERO = ZERO_MONEY


def _parse_money(value: MoneyInput, *, field: str) -> Decimal:
    return parse_decimal(value, quantum=MONEY_QUANTUM, field=field)


def _q2(val: Decimal) -> Decimal:
    return val.quantize(MONEY_QUANTUM, rounding=ROUND_HALF_UP)


def _fmt(val: Decimal) -> str:
    return f"{_q2(val):.2f}"


def _pct_of(amount: Decimal, pct: Decimal) -> Decimal:
    return _q2((amount * pct) / _HUNDRED)


def _require_non_empty(value: str, *, field: str, label: str) -> str:
    cleaned = value.strip()
    if not cleaned:
        raise ValidationError(f"{label} is required.", field=field)
    return cleaned


def build_retail_pos_cashup_plan(inp: RetailPosCashupInput) -> PackOperationPostingPlan:
    """Compute kobo-balanced double-entry lines for daily POS cash/card settlement & COGS."""
    ref = inp.reference.strip()
    if not ref:
        raise ValidationError("POS cash-up reference is required.", field="reference")

    gross = _parse_money(inp.gross_sales_ngn, field="grossSalesNgn")
    cash = _parse_money(inp.cash_tender_ngn, field="cashTenderNgn")
    card = _parse_money(inp.pos_card_tender_ngn, field="posCardTenderNgn")
    mdr = _parse_money(inp.pos_mdr_fee_ngn, field="posMdrFeeNgn")
    cogs = _parse_money(inp.cogs_ngn, field="cogsNgn")

    if gross <= _ZERO:
        raise ValidationError("Gross POS sales must be greater than zero.", field="grossSalesNgn")
    if cash < _ZERO or card < _ZERO or mdr < _ZERO or cogs < _ZERO:
        raise ValidationError("Monetary amounts cannot be negative.", field="grossSalesNgn")
    if cash + card != gross:
        raise ValidationError(
            f"Cash tender ({_fmt(cash)}) + POS card tender ({_fmt(card)}) must equal "
            f"gross sales ({_fmt(gross)}).",
            field="cashTenderNgn",
        )
    if mdr > card:
        raise ValidationError(
            "POS MDR settlement fee cannot exceed POS card tender.",
            field="posMdrFeeNgn",
        )

    if inp.vat_inclusive:
        net_revenue = (gross / _VAT_FACTOR).quantize(MONEY_QUANTUM)
        vat_amount = gross - net_revenue
    else:
        net_revenue = gross
        vat_amount = _ZERO

    net_pos_clearing = card - mdr
    gross_margin = net_revenue - cogs

    lines: list[PackPlannedLine] = []
    if cash > _ZERO:
        lines.append(
            PackPlannedLine(
                account_code="1010",
                debit_ngn=cash,
                credit_ngn=_ZERO,
                memo=f"Cash till receipts ({ref})",
            )
        )
    if net_pos_clearing > _ZERO:
        lines.append(
            PackPlannedLine(
                account_code="1210",
                debit_ngn=net_pos_clearing,
                credit_ngn=_ZERO,
                memo=f"Net POS terminal receivable ({ref})",
            )
        )
    if mdr > _ZERO:
        lines.append(
            PackPlannedLine(
                account_code="5010",
                debit_ngn=mdr,
                credit_ngn=_ZERO,
                memo=f"POS terminal MDR merchant fee ({ref})",
            )
        )
    lines.append(
        PackPlannedLine(
            account_code="4020",
            debit_ngn=_ZERO,
            credit_ngn=net_revenue,
            memo=f"Retail POS sales net of VAT ({ref})",
        )
    )
    if vat_amount > _ZERO:
        lines.append(
            PackPlannedLine(
                account_code="2010",
                debit_ngn=_ZERO,
                credit_ngn=vat_amount,
                memo=f"NRS Output VAT 7.5% ({ref})",
            )
        )
    if cogs > _ZERO:
        lines.append(
            PackPlannedLine(
                account_code="5020",
                debit_ngn=cogs,
                credit_ngn=_ZERO,
                memo=f"Cost of goods sold for daily POS sales ({ref})",
            )
        )
        lines.append(
            PackPlannedLine(
                account_code="1310",
                debit_ngn=_ZERO,
                credit_ngn=cogs,
                memo=f"SKU inventory drawdown ({ref})",
            )
        )

    return PackOperationPostingPlan(
        operation_type=PackOperationType.RETAIL_POS_CASHUP,
        reference=ref,
        summary=(
            f"POS cash-up {ref}: net sales ₦{_fmt(net_revenue)}, VAT ₦{_fmt(vat_amount)}, "
            f"gross margin ₦{_fmt(gross_margin)}."
        ),
        metrics={
            "grossSalesNgn": _fmt(gross),
            "netRevenueNgn": _fmt(net_revenue),
            "vatAmountNgn": _fmt(vat_amount),
            "netPosClearingNgn": _fmt(net_pos_clearing),
            "mdrFeeNgn": _fmt(mdr),
            "cogsNgn": _fmt(cogs),
            "grossMarginNgn": _fmt(gross_margin),
        },
        lines=tuple(lines),
    )


def build_wholesale_landed_purchase_plan(
    inp: WholesaleLandedPurchaseInput,
) -> PackOperationPostingPlan:
    """Capitalize vendor stock + shipping/clearing into IAS 2 warehouse inventory."""
    ref = inp.reference.strip()
    if not ref:
        raise ValidationError("Wholesale PO receipt reference is required.", field="reference")
    if inp.units_received <= 0:
        raise ValidationError("Units received must be positive.", field="unitsReceived")

    supplier = _parse_money(inp.supplier_invoice_ngn, field="supplierInvoiceNgn")
    freight = _parse_money(inp.freight_and_clearing_ngn, field="freightAndClearingNgn")
    selling_unit = _parse_money(inp.selling_price_per_unit_ngn, field="sellingPricePerUnitNgn")

    if supplier <= _ZERO:
        raise ValidationError(
            "Supplier invoice cost must be greater than zero.",
            field="supplierInvoiceNgn",
        )
    if freight < _ZERO or selling_unit <= _ZERO:
        raise ValidationError(
            "Freight cannot be negative and selling price must be positive.",
            field="sellingPricePerUnitNgn",
        )

    total_landed = supplier + freight
    units_dec = Decimal(inp.units_received)
    unit_landed = _q2(total_landed / units_dec)
    projected_margin_pct = _q2(((selling_unit - unit_landed) / selling_unit) * Decimal("100"))

    lines: list[PackPlannedLine] = [
        PackPlannedLine(
            account_code="1320",
            debit_ngn=supplier,
            credit_ngn=_ZERO,
            memo=f"Goods-in-transit supplier invoice ({ref})",
        ),
    ]
    if freight > _ZERO:
        lines.append(
            PackPlannedLine(
                account_code="5030",
                debit_ngn=freight,
                credit_ngn=_ZERO,
                memo=f"Freight, port clearing & haulage ({ref})",
            )
        )
    lines.append(
        PackPlannedLine(
            account_code="1010",
            debit_ngn=_ZERO,
            credit_ngn=total_landed,
            memo=f"Settlement of wholesale stock & clearing ({ref})",
        )
    )
    lines.append(
        PackPlannedLine(
            account_code="1310",
            debit_ngn=total_landed,
            credit_ngn=_ZERO,
            memo=f"IAS 2 landed stock capitalization ({inp.units_received} units, {ref})",
        )
    )
    lines.append(
        PackPlannedLine(
            account_code="1320",
            debit_ngn=_ZERO,
            credit_ngn=supplier,
            memo=f"Transfer goods-in-transit into warehouse stock ({ref})",
        )
    )
    if freight > _ZERO:
        lines.append(
            PackPlannedLine(
                account_code="5030",
                debit_ngn=_ZERO,
                credit_ngn=freight,
                memo=f"Absorb landed clearing & freight into SKU cost ({ref})",
            )
        )

    return PackOperationPostingPlan(
        operation_type=PackOperationType.WHOLESALE_LANDED_RECEIPT,
        reference=ref,
        summary=(
            f"Wholesale receipt {ref}: {inp.units_received} units landed at "
            f"₦{_fmt(unit_landed)}/unit (margin {projected_margin_pct:.2f}%)."
        ),
        metrics={
            "unitsReceived": str(inp.units_received),
            "supplierInvoiceNgn": _fmt(supplier),
            "freightAndClearingNgn": _fmt(freight),
            "totalLandedCostNgn": _fmt(total_landed),
            "unitLandedCostNgn": _fmt(unit_landed),
            "projectedGrossMarginPct": f"{projected_margin_pct:.2f}",
        },
        lines=tuple(lines),
    )


def build_manufacturing_bom_plan(inp: ManufacturingBomRunInput) -> PackOperationPostingPlan:
    """Convert raw materials + direct conversion cost through WIP into finished goods + scrap."""
    ref = inp.reference.strip()
    if not ref:
        raise ValidationError("BOM batch reference is required.", field="reference")
    if inp.units_produced <= 0:
        raise ValidationError("Units produced must be positive.", field="unitsProduced")

    raw_issued = _parse_money(inp.raw_materials_issued_ngn, field="rawMaterialsIssuedNgn")
    conversion = _parse_money(inp.direct_conversion_cost_ngn, field="directConversionCostNgn")
    scrap = _parse_money(inp.scrap_spoilage_ngn, field="scrapSpoilageNgn")

    if raw_issued <= _ZERO:
        raise ValidationError(
            "Raw materials issued must be greater than zero.",
            field="rawMaterialsIssuedNgn",
        )
    if conversion < _ZERO or scrap < _ZERO:
        raise ValidationError(
            "Conversion and scrap costs cannot be negative.",
            field="scrapSpoilageNgn",
        )

    total_wip = raw_issued + conversion
    if scrap >= total_wip:
        raise ValidationError(
            "Scrap/spoilage cannot consume 100% or more of total WIP cost.",
            field="scrapSpoilageNgn",
        )

    finished_goods = total_wip - scrap
    unit_cost = _q2(finished_goods / Decimal(inp.units_produced))
    yield_pct = _q2((finished_goods / total_wip) * Decimal("100"))

    lines: list[PackPlannedLine] = [
        PackPlannedLine(
            account_code="1340",
            debit_ngn=total_wip,
            credit_ngn=_ZERO,
            memo=f"Issue raw inputs & conversion to WIP ({ref})",
        ),
        PackPlannedLine(
            account_code="1330",
            debit_ngn=_ZERO,
            credit_ngn=raw_issued,
            memo=f"Raw material store issue ({ref})",
        ),
    ]
    if conversion > _ZERO:
        lines.append(
            PackPlannedLine(
                account_code="1010",
                debit_ngn=_ZERO,
                credit_ngn=conversion,
                memo=f"Direct factory labor/power absorbed ({ref})",
            )
        )
    lines.append(
        PackPlannedLine(
            account_code="1310",
            debit_ngn=finished_goods,
            credit_ngn=_ZERO,
            memo=f"Completed finished goods to store ({inp.units_produced} units, {ref})",
        )
    )
    if scrap > _ZERO:
        lines.append(
            PackPlannedLine(
                account_code="5040",
                debit_ngn=scrap,
                credit_ngn=_ZERO,
                memo=f"Production yield/scrap variance ({ref})",
            )
        )
    lines.append(
        PackPlannedLine(
            account_code="1340",
            debit_ngn=_ZERO,
            credit_ngn=total_wip,
            memo=f"Clear WIP on BOM batch completion ({ref})",
        )
    )

    return PackOperationPostingPlan(
        operation_type=PackOperationType.MANUFACTURING_BOM_RUN,
        reference=ref,
        summary=(
            f"BOM batch {ref}: produced {inp.units_produced} units at ₦{_fmt(unit_cost)}/unit "
            f"(yield {yield_pct:.2f}%)."
        ),
        metrics={
            "unitsProduced": str(inp.units_produced),
            "rawMaterialsIssuedNgn": _fmt(raw_issued),
            "directConversionCostNgn": _fmt(conversion),
            "scrapSpoilageNgn": _fmt(scrap),
            "finishedGoodsCostNgn": _fmt(finished_goods),
            "unitCostNgn": _fmt(unit_cost),
            "yieldPct": f"{yield_pct:.2f}",
        },
        lines=tuple(lines),
    )


def build_construction_job_progress_plan(
    inp: ConstructionJobProgressInput,
) -> PackOperationPostingPlan:
    """Compute site progress valuation, client/subcontractor retention, and 2%/5% WHT lines."""
    ref = _require_non_empty(inp.reference, field="reference", label="Valuation reference")
    site = _require_non_empty(inp.project_site, field="projectSite", label="Project site")

    valuation = _parse_money(inp.certified_valuation_ngn, field="certifiedValuationNgn")
    client_ret_pct = _parse_money(inp.client_retention_pct, field="clientRetentionPct")
    materials = _parse_money(inp.materials_issued_ngn, field="materialsIssuedNgn")
    sub_claim = _parse_money(inp.subcontractor_claim_ngn, field="subcontractorClaimNgn")
    sub_ret_pct = _parse_money(inp.subcontractor_retention_pct, field="subcontractorRetentionPct")
    sub_wht_pct = _parse_money(inp.subcontractor_wht_rate_pct, field="subcontractorWhtRatePct")

    if valuation < _ZERO or materials < _ZERO or sub_claim < _ZERO:
        raise ValidationError(
            "Construction amounts cannot be negative.",
            field="certifiedValuationNgn",
        )
    if valuation == _ZERO and materials == _ZERO and sub_claim == _ZERO:
        raise ValidationError(
            "Provide a certified valuation, site material issue, or subcontractor claim.",
            field="certifiedValuationNgn",
        )
    if not (_ZERO <= client_ret_pct <= Decimal("50.00")) or not (
        _ZERO <= sub_ret_pct <= Decimal("50.00")
    ):
        raise ValidationError(
            "Retention percentage must be between 0% and 50%.",
            field="clientRetentionPct",
        )
    if sub_claim > _ZERO and sub_wht_pct not in {Decimal("2.00"), Decimal("5.00")}:
        raise ValidationError(
            "Construction subcontractor WHT rate must be 2.00% (resident works) or 5.00%.",
            field="subcontractorWhtRatePct",
        )

    lines: list[PackPlannedLine] = []
    client_retention = _ZERO
    if valuation > _ZERO:
        client_retention = _pct_of(valuation, client_ret_pct)
        net_client_cash = valuation - client_retention
        if net_client_cash > _ZERO:
            lines.append(
                PackPlannedLine(
                    account_code="1010",
                    debit_ngn=net_client_cash,
                    credit_ngn=_ZERO,
                    memo=f"Certified progress receipt for {site} ({ref})",
                )
            )
        if client_retention > _ZERO:
            lines.append(
                PackPlannedLine(
                    account_code="1140",
                    debit_ngn=client_retention,
                    credit_ngn=_ZERO,
                    memo=f"Client retention receivable on {site} ({ref})",
                )
            )
        lines.append(
            PackPlannedLine(
                account_code="4070",
                debit_ngn=_ZERO,
                credit_ngn=valuation,
                memo=f"Construction valuation revenue on {site} ({ref})",
            )
        )

    if materials > _ZERO:
        lines.append(
            PackPlannedLine(
                account_code="5050",
                debit_ngn=materials,
                credit_ngn=_ZERO,
                memo=f"Direct materials issued to {site} ({ref})",
            )
        )
        lines.append(
            PackPlannedLine(
                account_code="1010",
                debit_ngn=_ZERO,
                credit_ngn=materials,
                memo=f"Settlement for site materials on {site} ({ref})",
            )
        )

    no_tin_doubled = False
    effective_wht_pct = sub_wht_pct
    sub_wht = _ZERO
    sub_retention = _ZERO
    if sub_claim > _ZERO:
        if not inp.subcontractor_has_tin:
            no_tin_doubled = True
            effective_wht_pct = sub_wht_pct * Decimal("2")
        sub_wht = _pct_of(sub_claim, effective_wht_pct)
        sub_retention = _pct_of(sub_claim, sub_ret_pct)
        net_sub_cash = sub_claim - sub_wht - sub_retention
        if net_sub_cash < _ZERO:
            raise ValidationError(
                "Subcontractor WHT and retention exceed gross claim.",
                field="subcontractorClaimNgn",
            )
        lines.append(
            PackPlannedLine(
                account_code="5050",
                debit_ngn=sub_claim,
                credit_ngn=_ZERO,
                memo=f"Subcontractor certified work on {site} ({ref})",
            )
        )
        if sub_wht > _ZERO:
            lines.append(
                PackPlannedLine(
                    account_code="2120",
                    debit_ngn=_ZERO,
                    credit_ngn=sub_wht,
                    memo=f"Subcontractor WHT payable ({effective_wht_pct:.2f}%, {ref})",
                )
            )
        if sub_retention > _ZERO:
            lines.append(
                PackPlannedLine(
                    account_code="2150",
                    debit_ngn=_ZERO,
                    credit_ngn=sub_retention,
                    memo=f"Subcontractor retention withheld on {site} ({ref})",
                )
            )
        if net_sub_cash > _ZERO:
            lines.append(
                PackPlannedLine(
                    account_code="1010",
                    debit_ngn=_ZERO,
                    credit_ngn=net_sub_cash,
                    memo=f"Net subcontractor payment on {site} ({ref})",
                )
            )

    total_site_cost = materials + sub_claim
    job_margin = valuation - total_site_cost
    job_margin_pct = _q2((job_margin / valuation) * _HUNDRED) if valuation > _ZERO else _ZERO

    return PackOperationPostingPlan(
        operation_type=PackOperationType.CONSTRUCTION_JOB_PROGRESS,
        reference=ref,
        summary=(
            f"Site {site} ({ref}): valuation ₦{_fmt(valuation)}, "
            f"site cost ₦{_fmt(total_site_cost)}, "
            f"WHT ₦{_fmt(sub_wht)} ({effective_wht_pct:.2f}%), job margin ₦{_fmt(job_margin)}."
        ),
        metrics={
            "projectSite": site,
            "certifiedValuationNgn": _fmt(valuation),
            "clientRetentionNgn": _fmt(client_retention),
            "materialsIssuedNgn": _fmt(materials),
            "subcontractorClaimNgn": _fmt(sub_claim),
            "subcontractorRetentionNgn": _fmt(sub_retention),
            "subcontractorWhtNgn": _fmt(sub_wht),
            "effectiveWhtRatePct": f"{effective_wht_pct:.2f}",
            "noTinDoublingApplied": "true" if no_tin_doubled else "false",
            "totalSiteCostNgn": _fmt(total_site_cost),
            "jobMarginNgn": _fmt(job_margin),
            "jobMarginPct": f"{job_margin_pct:.2f}",
        },
        lines=tuple(lines),
    )


def build_professional_time_billing_plan(
    inp: ProfessionalTimeBillingInput,
) -> PackOperationPostingPlan:
    """Compute advisory time realization, retainer drawdown, reimbursements & WHT credit."""
    ref = _require_non_empty(inp.reference, field="reference", label="Invoice reference")
    engagement = _require_non_empty(
        inp.engagement_code,
        field="engagementCode",
        label="Engagement code",
    )

    hours = _parse_money(inp.billable_hours, field="billableHours")
    hourly_rate = _parse_money(inp.hourly_rate_ngn, field="hourlyRateNgn")
    billed_fee = _parse_money(inp.billed_fee_ngn, field="billedFeeNgn")
    retainer_applied = _parse_money(inp.retainer_applied_ngn, field="retainerAppliedNgn")
    reimbursable = _parse_money(inp.reimbursable_expense_ngn, field="reimbursableExpenseNgn")
    wht_pct = _parse_money(inp.wht_rate_pct, field="whtRatePct")

    if hours <= _ZERO or hourly_rate <= _ZERO or billed_fee <= _ZERO:
        raise ValidationError(
            "Billable hours, hourly rate, and billed fee must be positive.",
            field="billedFeeNgn",
        )
    if retainer_applied < _ZERO or reimbursable < _ZERO:
        raise ValidationError(
            "Retainer and reimbursable expenses cannot be negative.",
            field="retainerAppliedNgn",
        )
    if wht_pct not in {Decimal("0.00"), Decimal("5.00"), Decimal("10.00")}:
        raise ValidationError(
            "Professional services WHT rate must be 0.00%, 5.00%, or 10.00%.",
            field="whtRatePct",
        )

    standard_value = _q2(hours * hourly_rate)
    realization_pct = _q2((billed_fee / standard_value) * _HUNDRED)
    vat_amount = _q2(billed_fee * _VAT_RATE) if inp.vat_applicable else _ZERO
    wht_credit = _pct_of(billed_fee, wht_pct)
    gross_invoice = billed_fee + vat_amount + reimbursable
    net_cash = gross_invoice - wht_credit - retainer_applied
    if net_cash < _ZERO:
        raise ValidationError(
            "Retainer applied and WHT credit cannot exceed total client invoice.",
            field="retainerAppliedNgn",
        )

    lines: list[PackPlannedLine] = []
    if reimbursable > _ZERO:
        lines.append(
            PackPlannedLine(
                account_code="1130",
                debit_ngn=reimbursable,
                credit_ngn=_ZERO,
                memo=f"Client reimbursable expense incurred for {engagement} ({ref})",
            )
        )
        lines.append(
            PackPlannedLine(
                account_code="1010",
                debit_ngn=_ZERO,
                credit_ngn=reimbursable,
                memo=f"Out-of-pocket disbursement for {engagement} ({ref})",
            )
        )
    if net_cash > _ZERO:
        lines.append(
            PackPlannedLine(
                account_code="1010",
                debit_ngn=net_cash,
                credit_ngn=_ZERO,
                memo=f"Net advisory settlement received for {engagement} ({ref})",
            )
        )
    if retainer_applied > _ZERO:
        lines.append(
            PackPlannedLine(
                account_code="2160",
                debit_ngn=retainer_applied,
                credit_ngn=_ZERO,
                memo=f"Drawdown client retainer deposit on {engagement} ({ref})",
            )
        )
    if wht_credit > _ZERO:
        lines.append(
            PackPlannedLine(
                account_code="1150",
                debit_ngn=wht_credit,
                credit_ngn=_ZERO,
                memo=f"Client WHT credit note receivable ({wht_pct:.2f}%, {ref})",
            )
        )
    lines.append(
        PackPlannedLine(
            account_code="4030",
            debit_ngn=_ZERO,
            credit_ngn=billed_fee,
            memo=f"Advisory fee revenue for {engagement} ({ref})",
        )
    )
    if vat_amount > _ZERO:
        lines.append(
            PackPlannedLine(
                account_code="2010",
                debit_ngn=_ZERO,
                credit_ngn=vat_amount,
                memo=f"NRS Output VAT 7.5% on {engagement} ({ref})",
            )
        )
    if reimbursable > _ZERO:
        lines.append(
            PackPlannedLine(
                account_code="1130",
                debit_ngn=_ZERO,
                credit_ngn=reimbursable,
                memo=f"Reimbursable expense recovered from client on {engagement} ({ref})",
            )
        )

    return PackOperationPostingPlan(
        operation_type=PackOperationType.PROFESSIONAL_TIME_BILLING,
        reference=ref,
        summary=(
            f"Engagement {engagement} ({ref}): billed ₦{_fmt(billed_fee)} "
            f"({realization_pct:.2f}% realization), WHT credit ₦{_fmt(wht_credit)}; "
            "NTA 2025 non-exempt CIT applies."
        ),
        metrics={
            "engagementCode": engagement,
            "standardTimeValueNgn": _fmt(standard_value),
            "billedFeeNgn": _fmt(billed_fee),
            "realizationRatePct": f"{realization_pct:.2f}",
            "retainerAppliedNgn": _fmt(retainer_applied),
            "reimbursableExpenseNgn": _fmt(reimbursable),
            "vatAmountNgn": _fmt(vat_amount),
            "whtCreditNgn": _fmt(wht_credit),
            "netCashCollectedNgn": _fmt(net_cash),
            "citStatusNotice": "NON_EXEMPT_NTA_2025_CIT_APPLIES",
        },
        lines=tuple(lines),
    )


def build_nonprofit_grant_activity_plan(
    inp: NonProfitGrantActivityInput,
) -> PackOperationPostingPlan:
    """Compute restricted vs unrestricted grant accounting & budget-vs-actual utilization."""
    ref = _require_non_empty(inp.reference, field="reference", label="Grant reference")
    donor = _require_non_empty(inp.donor_fund_name, field="donorFundName", label="Donor fund name")
    restriction = inp.fund_restriction.strip().upper()
    if restriction not in {"RESTRICTED", "UNRESTRICTED"}:
        raise ValidationError(
            "Fund restriction must be 'RESTRICTED' or 'UNRESTRICTED'.",
            field="fundRestriction",
        )

    budget = _parse_money(inp.approved_budget_ngn, field="approvedBudgetNgn")
    tranche = _parse_money(inp.tranche_received_ngn, field="trancheReceivedNgn")
    spend = _parse_money(inp.program_spend_ngn, field="programSpendNgn")
    prior = _parse_money(inp.prior_spend_ngn, field="priorSpendNgn")

    if budget <= _ZERO:
        raise ValidationError("Approved grant budget must be positive.", field="approvedBudgetNgn")
    if tranche < _ZERO or spend < _ZERO or prior < _ZERO:
        raise ValidationError("Grant amounts cannot be negative.", field="programSpendNgn")
    if tranche == _ZERO and spend == _ZERO:
        raise ValidationError(
            "Provide either a donor tranche receipt or program expenditure.",
            field="trancheReceivedNgn",
        )

    lines: list[PackPlannedLine] = []
    if restriction == "RESTRICTED":
        if tranche > _ZERO:
            lines.append(
                PackPlannedLine(
                    account_code="1010",
                    debit_ngn=tranche,
                    credit_ngn=_ZERO,
                    memo=f"Restricted donor grant tranche for {donor} ({ref})",
                )
            )
            lines.append(
                PackPlannedLine(
                    account_code="3200",
                    debit_ngn=_ZERO,
                    credit_ngn=tranche,
                    memo=f"Increase restricted net assets for {donor} ({ref})",
                )
            )
        if spend > _ZERO:
            lines.append(
                PackPlannedLine(
                    account_code="5090",
                    debit_ngn=spend,
                    credit_ngn=_ZERO,
                    memo=f"Restricted program disbursement for {donor} ({ref})",
                )
            )
            lines.append(
                PackPlannedLine(
                    account_code="1010",
                    debit_ngn=_ZERO,
                    credit_ngn=spend,
                    memo=f"Cash disbursed for {donor} program ({ref})",
                )
            )
            lines.append(
                PackPlannedLine(
                    account_code="3200",
                    debit_ngn=spend,
                    credit_ngn=_ZERO,
                    memo=f"Release restricted fund on qualifying spend ({ref})",
                )
            )
            lines.append(
                PackPlannedLine(
                    account_code="4040",
                    debit_ngn=_ZERO,
                    credit_ngn=spend,
                    memo=f"Recognize restricted grant income earned ({ref})",
                )
            )
        restricted_delta = tranche - spend
    else:
        if tranche > _ZERO:
            lines.append(
                PackPlannedLine(
                    account_code="1010",
                    debit_ngn=tranche,
                    credit_ngn=_ZERO,
                    memo=f"Unrestricted donation received for {donor} ({ref})",
                )
            )
            lines.append(
                PackPlannedLine(
                    account_code="4045",
                    debit_ngn=_ZERO,
                    credit_ngn=tranche,
                    memo=f"Unrestricted contribution income ({ref})",
                )
            )
        if spend > _ZERO:
            lines.append(
                PackPlannedLine(
                    account_code="5090",
                    debit_ngn=spend,
                    credit_ngn=_ZERO,
                    memo=f"Unrestricted program disbursement for {donor} ({ref})",
                )
            )
            lines.append(
                PackPlannedLine(
                    account_code="1010",
                    debit_ngn=_ZERO,
                    credit_ngn=spend,
                    memo=f"Cash disbursed for {donor} ({ref})",
                )
            )
        restricted_delta = _ZERO

    total_actual = prior + spend
    remaining_budget = budget - total_actual
    burn_rate_pct = _q2((total_actual / budget) * _HUNDRED)
    if total_actual > budget:
        budget_status = "OVER_BUDGET"
    elif burn_rate_pct >= Decimal("80.00"):
        budget_status = "APPROACHING_CAP"
    else:
        budget_status = "ON_TRACK"

    return PackOperationPostingPlan(
        operation_type=PackOperationType.NONPROFIT_GRANT_ACTIVITY,
        reference=ref,
        summary=(
            f"{restriction.title()} fund {donor} ({ref}): budget burn {burn_rate_pct:.2f}% "
            f"({budget_status}), remaining budget ₦{_fmt(remaining_budget)}."
        ),
        metrics={
            "donorFundName": donor,
            "fundRestriction": restriction,
            "approvedBudgetNgn": _fmt(budget),
            "trancheReceivedNgn": _fmt(tranche),
            "programSpendNgn": _fmt(spend),
            "totalActualSpendNgn": _fmt(total_actual),
            "remainingBudgetNgn": _fmt(remaining_budget),
            "burnRatePct": f"{burn_rate_pct:.2f}",
            "budgetStatus": budget_status,
            "restrictedNetBalanceDeltaNgn": _fmt(restricted_delta),
            "vatStatus": "VAT_EXEMPT_CHARITABLE_DEFAULT",
        },
        lines=tuple(lines),
    )


def build_hospitality_folio_plan(inp: HospitalityFolioInput) -> PackOperationPostingPlan:
    """Compute USALI room metrics, 7.5% VAT, 5% State Levy & 10% Fiduciary Service Charge."""
    ref = _require_non_empty(inp.reference, field="reference", label="Folio reference")
    wing = _require_non_empty(inp.property_wing, field="propertyWing", label="Property wing")
    if inp.available_rooms <= 0:
        raise ValidationError("Available rooms must be positive.", field="availableRooms")
    if inp.rooms_sold < 0 or inp.rooms_sold > inp.available_rooms:
        raise ValidationError(
            "Rooms sold must be between 0 and available rooms.",
            field="roomsSold",
        )

    room_base = _parse_money(inp.room_rate_base_ngn, field="roomRateBaseNgn")
    sc_pct = _parse_money(inp.service_charge_rate_pct, field="serviceChargeRatePct")
    if room_base <= _ZERO:
        raise ValidationError("Room base revenue must be positive.", field="roomRateBaseNgn")
    if not (_ZERO <= sc_pct <= Decimal("25.00")):
        raise ValidationError(
            "Service charge percentage must be 0% to 25%.",
            field="serviceChargeRatePct",
        )

    vat_amount = _q2(room_base * _VAT_RATE)
    state_tax = (
        _q2(room_base * _LAGOS_CONSUMPTION_RATE) if inp.apply_lagos_consumption_tax else _ZERO
    )
    service_charge = _pct_of(room_base, sc_pct)
    total_folio = room_base + vat_amount + state_tax + service_charge

    occupancy_pct = _q2((Decimal(inp.rooms_sold) / Decimal(inp.available_rooms)) * _HUNDRED)
    adr = _q2(room_base / Decimal(inp.rooms_sold)) if inp.rooms_sold > 0 else _ZERO
    revpar = _q2(room_base / Decimal(inp.available_rooms))

    lines: list[PackPlannedLine] = [
        PackPlannedLine(
            account_code="1010",
            debit_ngn=total_folio,
            credit_ngn=_ZERO,
            memo=f"Guest folio settlement for {wing} ({ref})",
        ),
        PackPlannedLine(
            account_code="4050",
            debit_ngn=_ZERO,
            credit_ngn=room_base,
            memo=f"USALI room revenue for {wing} ({ref})",
        ),
        PackPlannedLine(
            account_code="2010",
            debit_ngn=_ZERO,
            credit_ngn=vat_amount,
            memo=f"NRS Output VAT 7.5% on guest folio ({ref})",
        ),
    ]
    if state_tax > _ZERO:
        lines.append(
            PackPlannedLine(
                account_code="2130",
                debit_ngn=_ZERO,
                credit_ngn=state_tax,
                memo=f"State 5% hospitality consumption levy ({ref})",
            )
        )
    if service_charge > _ZERO:
        lines.append(
            PackPlannedLine(
                account_code="2140",
                debit_ngn=_ZERO,
                credit_ngn=service_charge,
                memo=f"Fiduciary staff service charge pool ({sc_pct:.2f}%, {ref})",
            )
        )

    return PackOperationPostingPlan(
        operation_type=PackOperationType.HOSPITALITY_FOLIO_SETTLEMENT,
        reference=ref,
        summary=(
            f"USALI Folio {ref} ({wing}): occupancy {occupancy_pct:.2f}%, "
            f"RevPAR ₦{_fmt(revpar)}, fiduciary service charge ₦{_fmt(service_charge)}."
        ),
        metrics={
            "propertyWing": wing,
            "roomsSold": str(inp.rooms_sold),
            "availableRooms": str(inp.available_rooms),
            "occupancyPct": f"{occupancy_pct:.2f}",
            "adrNgn": _fmt(adr),
            "revparNgn": _fmt(revpar),
            "roomRevenueNgn": _fmt(room_base),
            "vatAmountNgn": _fmt(vat_amount),
            "stateConsumptionTaxNgn": _fmt(state_tax),
            "serviceChargeFiduciaryNgn": _fmt(service_charge),
            "totalGuestFolioNgn": _fmt(total_folio),
        },
        lines=tuple(lines),
    )


def build_diner_service_shift_plan(inp: DinerServiceShiftInput) -> PackOperationPostingPlan:
    """Compute Diner table shift F&B sales, recipe COGS, kitchen spoilage & state levy."""
    ref = _require_non_empty(inp.reference, field="reference", label="Shift reference")
    outlet = _require_non_empty(inp.dining_outlet, field="diningOutlet", label="Dining outlet")
    if inp.covers_served <= 0:
        raise ValidationError("Covers served must be positive.", field="coversServed")

    sales = _parse_money(inp.food_beverage_sales_ngn, field="foodBeverageSalesNgn")
    cogs = _parse_money(inp.ingredient_cogs_ngn, field="ingredientCogsNgn")
    spoilage = _parse_money(inp.kitchen_spoilage_ngn, field="kitchenSpoilageNgn")
    if sales <= _ZERO:
        raise ValidationError(
            "Food & beverage sales must be positive.",
            field="foodBeverageSalesNgn",
        )
    if cogs < _ZERO or spoilage < _ZERO:
        raise ValidationError(
            "Ingredient COGS and spoilage cannot be negative.",
            field="ingredientCogsNgn",
        )

    vat_amount = _q2(sales * _VAT_RATE)
    state_tax = _q2(sales * _LAGOS_CONSUMPTION_RATE) if inp.apply_state_consumption_tax else _ZERO
    gross_checks = sales + vat_amount + state_tax
    avg_check = _q2(sales / Decimal(inp.covers_served))
    total_kitchen_cost = cogs + spoilage
    food_cost_pct = _q2((total_kitchen_cost / sales) * _HUNDRED)
    plate_margin = sales - total_kitchen_cost

    lines: list[PackPlannedLine] = [
        PackPlannedLine(
            account_code="1010",
            debit_ngn=gross_checks,
            credit_ngn=_ZERO,
            memo=f"Diner table checks collected at {outlet} ({ref})",
        ),
        PackPlannedLine(
            account_code="4060",
            debit_ngn=_ZERO,
            credit_ngn=sales,
            memo=f"Kitchen & beverage sales at {outlet} ({ref})",
        ),
        PackPlannedLine(
            account_code="2010",
            debit_ngn=_ZERO,
            credit_ngn=vat_amount,
            memo=f"NRS Output VAT 7.5% on diner checks ({ref})",
        ),
    ]
    if state_tax > _ZERO:
        lines.append(
            PackPlannedLine(
                account_code="2130",
                debit_ngn=_ZERO,
                credit_ngn=state_tax,
                memo=f"State 5% restaurant consumption levy ({ref})",
            )
        )
    if cogs > _ZERO:
        lines.append(
            PackPlannedLine(
                account_code="5060",
                debit_ngn=cogs,
                credit_ngn=_ZERO,
                memo=f"Recipe ingredient food cost ({ref})",
            )
        )
        lines.append(
            PackPlannedLine(
                account_code="1310",
                debit_ngn=_ZERO,
                credit_ngn=cogs,
                memo=f"Kitchen pantry stock drawdown ({ref})",
            )
        )
    if spoilage > _ZERO:
        lines.append(
            PackPlannedLine(
                account_code="5095",
                debit_ngn=spoilage,
                credit_ngn=_ZERO,
                memo=f"Kitchen spoilage & waste loss ({ref})",
            )
        )
        lines.append(
            PackPlannedLine(
                account_code="1310",
                debit_ngn=_ZERO,
                credit_ngn=spoilage,
                memo=f"Write off spoiled kitchen ingredients ({ref})",
            )
        )

    return PackOperationPostingPlan(
        operation_type=PackOperationType.DINER_SERVICE_SHIFT,
        reference=ref,
        summary=(
            f"Diner shift {ref} ({outlet}): {inp.covers_served} covers, avg check "
            f"₦{_fmt(avg_check)}, food cost {food_cost_pct:.2f}%, "
            f"plate margin ₦{_fmt(plate_margin)}."
        ),
        metrics={
            "diningOutlet": outlet,
            "coversServed": str(inp.covers_served),
            "averageCheckNgn": _fmt(avg_check),
            "foodBeverageSalesNgn": _fmt(sales),
            "vatAmountNgn": _fmt(vat_amount),
            "stateConsumptionTaxNgn": _fmt(state_tax),
            "grossTableChecksNgn": _fmt(gross_checks),
            "ingredientCogsNgn": _fmt(cogs),
            "kitchenSpoilageNgn": _fmt(spoilage),
            "foodCostPct": f"{food_cost_pct:.2f}",
            "plateMarginNgn": _fmt(plate_margin),
        },
        lines=tuple(lines),
    )
