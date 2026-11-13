"""Declarative primitive registry, conflict validator, and hybrid pack composer."""

from __future__ import annotations

from collections.abc import Sequence
from dataclasses import dataclass
from uuid import UUID, uuid4

from nairabooks.ledger.domain.errors import ValidationError
from nairabooks.ledger.domain.models import AccountCategory
from nairabooks.packs.domain.models import (
    FlagshipPackCode,
    IndustryPackManifest,
    OperationalPrimitive,
    PackAccountBlueprint,
    PackDimensionSpec,
    PackKpiDefinition,
    PackModuleDescriptor,
    PackTaxDefaults,
    WorkspaceIndustryProfile,
)
from nairabooks.tax.domain.models import TaxRegimeType


@dataclass(frozen=True, slots=True)
class PrimitiveCapabilitySpec:
    """Reusable operational building block supplying accounts, KPIs, and vocabulary."""

    primitive: OperationalPrimitive
    display_name: str
    plain_english_summary: str
    accounts: tuple[PackAccountBlueprint, ...]
    dimensions: tuple[PackDimensionSpec, ...]
    kpis: tuple[PackKpiDefinition, ...]
    vocabulary_defaults: dict[str, str]
    tax_hints: PackTaxDefaults


PRIMITIVE_CATALOG: dict[OperationalPrimitive, PrimitiveCapabilitySpec] = {
    OperationalPrimitive.POS_DAILY_CASHUP: PrimitiveCapabilitySpec(
        primitive=OperationalPrimitive.POS_DAILY_CASHUP,
        display_name="POS Daily Cash-Up & Terminal Clearing",
        plain_english_summary="Track daily cash, Paystack/Moniepoint POS receipts, and MDR fees.",
        accounts=(
            PackAccountBlueprint(
                code="1210",
                name="POS Terminal Settlement Clearing",
                category=AccountCategory.ASSET,
                ifrs_tag="CASH_AND_CASH_EQUIVALENTS",
                source_primitive=OperationalPrimitive.POS_DAILY_CASHUP,
            ),
            PackAccountBlueprint(
                code="4020",
                name="Retail POS Sales Revenue",
                category=AccountCategory.REVENUE,
                ifrs_tag="REVENUE_CONTRACTS",
                source_primitive=OperationalPrimitive.POS_DAILY_CASHUP,
            ),
        ),
        dimensions=(PackDimensionSpec(key="terminal_till", label="POS Till / Outlet"),),
        kpis=(
            PackKpiDefinition(
                key="daily_pos_takings",
                label="Daily POS & Cash Takings",
                formula_plain_english="Total settled card + transfer + cash receipts per day",
            ),
        ),
        vocabulary_defaults={"receipt": "POS Till Receipt"},
        tax_hints=PackTaxDefaults(vat_registered=True),
    ),
    OperationalPrimitive.SKU_INVENTORY_COGS: PrimitiveCapabilitySpec(
        primitive=OperationalPrimitive.SKU_INVENTORY_COGS,
        display_name="SKU Inventory & Cost of Goods Sold",
        plain_english_summary="Track stock on hand, stock adjustments, and gross margins.",
        accounts=(
            PackAccountBlueprint(
                code="1310",
                name="Merchandise Inventory (IAS 2)",
                category=AccountCategory.ASSET,
                ifrs_tag="INVENTORIES",
                source_primitive=OperationalPrimitive.SKU_INVENTORY_COGS,
            ),
            PackAccountBlueprint(
                code="5020",
                name="Cost of Goods Sold (Merchandise)",
                category=AccountCategory.EXPENSE,
                ifrs_tag="COST_OF_SALES",
                source_primitive=OperationalPrimitive.SKU_INVENTORY_COGS,
            ),
        ),
        dimensions=(PackDimensionSpec(key="product_category", label="Product Category"),),
        kpis=(
            PackKpiDefinition(
                key="gross_margin_pct",
                label="Gross Profit Margin (%)",
                formula_plain_english="(Net sales minus COGS) divided by net sales",
            ),
        ),
        vocabulary_defaults={"item": "Stock SKU"},
        tax_hints=PackTaxDefaults(default_wht_category="WHT_GOODS_SUPPLY"),
    ),
    OperationalPrimitive.MULTI_TIER_WAREHOUSE_PO: PrimitiveCapabilitySpec(
        primitive=OperationalPrimitive.MULTI_TIER_WAREHOUSE_PO,
        display_name="Multi-Tier Warehouse & Landed Cost",
        plain_english_summary="Manage regional depots, distributor tiers, and freight costs.",
        accounts=(
            PackAccountBlueprint(
                code="1320",
                name="Goods-in-Transit & Warehouse Stock",
                category=AccountCategory.ASSET,
                ifrs_tag="INVENTORIES",
                source_primitive=OperationalPrimitive.MULTI_TIER_WAREHOUSE_PO,
            ),
            PackAccountBlueprint(
                code="5030",
                name="Clearing, Freight & Landed Duty",
                category=AccountCategory.EXPENSE,
                ifrs_tag="COST_OF_SALES",
                source_primitive=OperationalPrimitive.MULTI_TIER_WAREHOUSE_PO,
            ),
        ),
        dimensions=(PackDimensionSpec(key="warehouse_depot", label="Warehouse / Depot"),),
        kpis=(
            PackKpiDefinition(
                key="inventory_days",
                label="Inventory Days on Hand",
                formula_plain_english="Average inventory value divided by daily COGS",
            ),
        ),
        vocabulary_defaults={"location": "Warehouse Depot"},
        tax_hints=PackTaxDefaults(default_wht_category="WHT_GOODS_SUPPLY"),
    ),
    OperationalPrimitive.BILL_OF_MATERIALS_WIP: PrimitiveCapabilitySpec(
        primitive=OperationalPrimitive.BILL_OF_MATERIALS_WIP,
        display_name="Bill of Materials (BOM) & Light Production WIP",
        plain_english_summary="Convert raw materials into work-in-progress and finished goods.",
        accounts=(
            PackAccountBlueprint(
                code="1330",
                name="Raw Materials Inventory",
                category=AccountCategory.ASSET,
                ifrs_tag="INVENTORIES",
                source_primitive=OperationalPrimitive.BILL_OF_MATERIALS_WIP,
            ),
            PackAccountBlueprint(
                code="1340",
                name="Work-in-Progress (WIP) Production",
                category=AccountCategory.ASSET,
                ifrs_tag="INVENTORIES",
                source_primitive=OperationalPrimitive.BILL_OF_MATERIALS_WIP,
            ),
            PackAccountBlueprint(
                code="5040",
                name="Production Scrap & Yield Variance",
                category=AccountCategory.EXPENSE,
                ifrs_tag="COST_OF_SALES",
                source_primitive=OperationalPrimitive.BILL_OF_MATERIALS_WIP,
            ),
        ),
        dimensions=(PackDimensionSpec(key="production_batch", label="Production Batch"),),
        kpis=(
            PackKpiDefinition(
                key="bom_yield_pct",
                label="Batch Yield Efficiency (%)",
                formula_plain_english="Finished units produced vs planned BOM output",
            ),
        ),
        vocabulary_defaults={"work_order": "Assembly Batch"},
        tax_hints=PackTaxDefaults(default_wht_category="WHT_GOODS_SUPPLY"),
    ),
    OperationalPrimitive.JOB_COSTING_RETENTION: PrimitiveCapabilitySpec(
        primitive=OperationalPrimitive.JOB_COSTING_RETENTION,
        display_name="Project Job Costing & Retention",
        plain_english_summary=(
            "Track costs per construction site, retention, and subcontractor WHT."
        ),
        accounts=(
            PackAccountBlueprint(
                code="1140",
                name="Contract Retention Receivable",
                category=AccountCategory.ASSET,
                ifrs_tag="TRADE_RECEIVABLES",
                source_primitive=OperationalPrimitive.JOB_COSTING_RETENTION,
            ),
            PackAccountBlueprint(
                code="2120",
                name="Withholding Tax Payable",
                category=AccountCategory.LIABILITY,
                ifrs_tag="TAX_LIABILITIES",
                source_primitive=OperationalPrimitive.JOB_COSTING_RETENTION,
            ),
            PackAccountBlueprint(
                code="2150",
                name="Subcontractor Retention Payable",
                category=AccountCategory.LIABILITY,
                ifrs_tag="TRADE_PAYABLES",
                source_primitive=OperationalPrimitive.JOB_COSTING_RETENTION,
            ),
            PackAccountBlueprint(
                code="4070",
                name="Construction Contract Valuation Revenue",
                category=AccountCategory.REVENUE,
                ifrs_tag="REVENUE_CONTRACTS",
                source_primitive=OperationalPrimitive.JOB_COSTING_RETENTION,
            ),
            PackAccountBlueprint(
                code="5050",
                name="Subcontractor & Site Direct Costs",
                category=AccountCategory.EXPENSE,
                ifrs_tag="COST_OF_SALES",
                source_primitive=OperationalPrimitive.JOB_COSTING_RETENTION,
            ),
        ),
        dimensions=(
            PackDimensionSpec(
                key="project_site",
                label="Project / Construction Site",
                required=True,
            ),
        ),
        kpis=(
            PackKpiDefinition(
                key="job_margin_ngn",
                label="Project Gross Margin",
                formula_plain_english=(
                    "Certified valuation revenue minus site & subcontractor costs"
                ),
            ),
        ),
        vocabulary_defaults={"project": "Job Site", "vendor": "Subcontractor"},
        tax_hints=PackTaxDefaults(default_wht_category="WHT_CONSTRUCTION_CIVIL"),
    ),
    OperationalPrimitive.TIME_RETAINER_BILLING: PrimitiveCapabilitySpec(
        primitive=OperationalPrimitive.TIME_RETAINER_BILLING,
        display_name="Time, Retainer & Advisory Billing",
        plain_english_summary="Track billable hours, client retainers, and WHT credit notes.",
        accounts=(
            PackAccountBlueprint(
                code="1130",
                name="Unbilled Work-in-Progress (Advisory)",
                category=AccountCategory.ASSET,
                ifrs_tag="CONTRACT_ASSETS",
                source_primitive=OperationalPrimitive.TIME_RETAINER_BILLING,
            ),
            PackAccountBlueprint(
                code="1150",
                name="WHT Credit Note Receivable",
                category=AccountCategory.ASSET,
                ifrs_tag="TRADE_RECEIVABLES",
                source_primitive=OperationalPrimitive.TIME_RETAINER_BILLING,
            ),
            PackAccountBlueprint(
                code="2160",
                name="Client Retainer & Unearned Fees",
                category=AccountCategory.LIABILITY,
                ifrs_tag="CONTRACT_LIABILITIES",
                source_primitive=OperationalPrimitive.TIME_RETAINER_BILLING,
            ),
            PackAccountBlueprint(
                code="4030",
                name="Professional Fees & Retainer Income",
                category=AccountCategory.REVENUE,
                ifrs_tag="REVENUE_CONTRACTS",
                source_primitive=OperationalPrimitive.TIME_RETAINER_BILLING,
            ),
        ),
        dimensions=(
            PackDimensionSpec(key="engagement_code", label="Client Engagement", required=True),
        ),
        kpis=(
            PackKpiDefinition(
                key="realization_rate_pct",
                label="Fee Realization Rate (%)",
                formula_plain_english="Billed client fees divided by standard time value",
            ),
        ),
        vocabulary_defaults={"customer": "Client", "product": "Service / Retainer"},
        tax_hints=PackTaxDefaults(
            is_professional_services=True,
            default_wht_category="WHT_PROFESSIONAL_CONSULTING",
        ),
    ),
    OperationalPrimitive.FUND_GRANT_ACCOUNTING: PrimitiveCapabilitySpec(
        primitive=OperationalPrimitive.FUND_GRANT_ACCOUNTING,
        display_name="Restricted Fund & Donor Grant Tracking",
        plain_english_summary="Separate donor-restricted funds from unrestricted operations.",
        accounts=(
            PackAccountBlueprint(
                code="3200",
                name="Restricted Donor Grant Funds",
                category=AccountCategory.RESTRICTED_FUND,
                ifrs_tag="RESTRICTED_NET_ASSETS",
                source_primitive=OperationalPrimitive.FUND_GRANT_ACCOUNTING,
            ),
            PackAccountBlueprint(
                code="4040",
                name="Donor Grants & Contributions Income",
                category=AccountCategory.REVENUE,
                ifrs_tag="GRANT_INCOME",
                source_primitive=OperationalPrimitive.FUND_GRANT_ACCOUNTING,
            ),
            PackAccountBlueprint(
                code="4045",
                name="Unrestricted Donations & Operating Income",
                category=AccountCategory.REVENUE,
                ifrs_tag="GRANT_INCOME",
                source_primitive=OperationalPrimitive.FUND_GRANT_ACCOUNTING,
            ),
            PackAccountBlueprint(
                code="5090",
                name="Donor Program & Grant Disbursements",
                category=AccountCategory.EXPENSE,
                ifrs_tag="PROGRAM_EXPENSES",
                source_primitive=OperationalPrimitive.FUND_GRANT_ACCOUNTING,
            ),
        ),
        dimensions=(
            PackDimensionSpec(key="donor_fund", label="Grant / Donor Fund", required=True),
        ),
        kpis=(
            PackKpiDefinition(
                key="grant_burn_rate_pct",
                label="Grant Budget Utilization (%)",
                formula_plain_english="Program spend to date vs approved donor grant budget",
            ),
        ),
        vocabulary_defaults={"customer": "Donor / Funder", "invoice": "Grant Drawdown"},
        tax_hints=PackTaxDefaults(
            vat_registered=False,
            default_vat_regime=TaxRegimeType.VAT_EXEMPT,
        ),
    ),
    OperationalPrimitive.HOSPITALITY_FOLIO_USALI: PrimitiveCapabilitySpec(
        primitive=OperationalPrimitive.HOSPITALITY_FOLIO_USALI,
        display_name="Hospitality Room Folios (USALI) & Service Charge",
        plain_english_summary=(
            "Manage guest folios, state consumption tax, and staff service charge."
        ),
        accounts=(
            PackAccountBlueprint(
                code="2130",
                name="State Consumption Levy Payable",
                category=AccountCategory.LIABILITY,
                ifrs_tag="TAX_LIABILITIES",
                source_primitive=OperationalPrimitive.HOSPITALITY_FOLIO_USALI,
            ),
            PackAccountBlueprint(
                code="2140",
                name="Fiduciary Staff Service Charge Payable",
                category=AccountCategory.LIABILITY,
                ifrs_tag="FIDUCIARY_PAYABLES",
                source_primitive=OperationalPrimitive.HOSPITALITY_FOLIO_USALI,
            ),
            PackAccountBlueprint(
                code="4050",
                name="Room & Accommodation Folio Revenue",
                category=AccountCategory.REVENUE,
                ifrs_tag="REVENUE_CONTRACTS",
                source_primitive=OperationalPrimitive.HOSPITALITY_FOLIO_USALI,
            ),
        ),
        dimensions=(PackDimensionSpec(key="property_wing", label="Property / Wing"),),
        kpis=(
            PackKpiDefinition(
                key="revpar",
                label="RevPAR (Revenue Per Available Room)",
                formula_plain_english="Room revenue divided by total available rooms",
            ),
        ),
        vocabulary_defaults={"customer": "Guest", "invoice": "Guest Folio"},
        tax_hints=PackTaxDefaults(
            include_state_consumption_tax=True,
            default_service_charge_rate="0.100000",
        ),
    ),
    OperationalPrimitive.DINER_RECIPE_TABLE: PrimitiveCapabilitySpec(
        primitive=OperationalPrimitive.DINER_RECIPE_TABLE,
        display_name="Diner, Kitchen Recipe & Table POS",
        plain_english_summary=(
            "Track kitchen ingredients, plate margins, and dine-in/takeout sales."
        ),
        accounts=(
            PackAccountBlueprint(
                code="1310",
                name="Merchandise Inventory (IAS 2)",
                category=AccountCategory.ASSET,
                ifrs_tag="INVENTORIES",
                source_primitive=OperationalPrimitive.DINER_RECIPE_TABLE,
            ),
            PackAccountBlueprint(
                code="2130",
                name="State Consumption Levy Payable",
                category=AccountCategory.LIABILITY,
                ifrs_tag="TAX_LIABILITIES",
                source_primitive=OperationalPrimitive.DINER_RECIPE_TABLE,
            ),
            PackAccountBlueprint(
                code="4060",
                name="Kitchen & Beverage Sales Revenue",
                category=AccountCategory.REVENUE,
                ifrs_tag="REVENUE_CONTRACTS",
                source_primitive=OperationalPrimitive.DINER_RECIPE_TABLE,
            ),
            PackAccountBlueprint(
                code="5060",
                name="Kitchen Ingredient Food Cost (COGS)",
                category=AccountCategory.EXPENSE,
                ifrs_tag="COST_OF_SALES",
                source_primitive=OperationalPrimitive.DINER_RECIPE_TABLE,
            ),
            PackAccountBlueprint(
                code="5095",
                name="Kitchen Spoilage & Waste Loss",
                category=AccountCategory.EXPENSE,
                ifrs_tag="COST_OF_SALES",
                source_primitive=OperationalPrimitive.DINER_RECIPE_TABLE,
            ),
        ),
        dimensions=(PackDimensionSpec(key="dining_outlet", label="Dining Section / Outlet"),),
        kpis=(
            PackKpiDefinition(
                key="food_cost_pct",
                label="Food Cost Percentage (%)",
                formula_plain_english="Ingredient cost divided by food & beverage sales",
            ),
        ),
        vocabulary_defaults={"invoice": "Table Check", "item": "Menu Dish"},
        tax_hints=PackTaxDefaults(include_state_consumption_tax=True),
    ),
    OperationalPrimitive.LOGISTICS_FLEET_TRIP: PrimitiveCapabilitySpec(
        primitive=OperationalPrimitive.LOGISTICS_FLEET_TRIP,
        display_name="Fleet & Delivery Trip Costing",
        plain_english_summary="Track diesel, maintenance, and margin per haulage route or truck.",
        accounts=(
            PackAccountBlueprint(
                code="1520",
                name="Delivery Vehicles & Fleet Equipment",
                category=AccountCategory.ASSET,
                ifrs_tag="PROPERTY_PLANT_EQUIPMENT",
                source_primitive=OperationalPrimitive.LOGISTICS_FLEET_TRIP,
            ),
            PackAccountBlueprint(
                code="5070",
                name="Fleet Diesel, Tolls & Trip Maintenance",
                category=AccountCategory.EXPENSE,
                ifrs_tag="COST_OF_SALES",
                source_primitive=OperationalPrimitive.LOGISTICS_FLEET_TRIP,
            ),
        ),
        dimensions=(PackDimensionSpec(key="vehicle_unit", label="Truck / Fleet Route"),),
        kpis=(
            PackKpiDefinition(
                key="profit_per_trip",
                label="Net Profit Per Trip",
                formula_plain_english=(
                    "Waybill freight revenue minus diesel and driver trip expenses"
                ),
            ),
        ),
        vocabulary_defaults={"project": "Trip Waybill"},
        tax_hints=PackTaxDefaults(default_wht_category="WHT_GOODS_SUPPLY"),
    ),
}


def validate_pack_manifest(manifest: IndustryPackManifest) -> None:
    """Validate declarative 6-section pack integrity and fail loudly on gaps/conflicts."""
    if not manifest.operational_primitives:
        raise ValidationError(
            f"Pack '{manifest.pack_code.value}' must enable at least one operational primitive.",
            field="operational_primitives",
        )

    seen_codes: dict[str, PackAccountBlueprint] = {}
    covered_primitives: set[OperationalPrimitive] = set()
    for acct in manifest.coa_accounts:
        if not acct.code.strip():
            raise ValidationError("Account code in pack manifest cannot be empty.", field="code")
        if not acct.ifrs_tag.strip():
            raise ValidationError(
                f"Account '{acct.code} ({acct.name})' must define an IFRS statement mapping "
                "(ifrs_tag).",
                field="ifrs_tag",
            )
        if acct.code in seen_codes:
            raise ValidationError(
                f"Duplicate account code '{acct.code}' inside pack '{manifest.display_name}'.",
                field="coa_accounts",
            )
        seen_codes[acct.code] = acct
        covered_primitives.add(acct.source_primitive)

    for primitive in manifest.operational_primitives:
        if primitive not in covered_primitives:
            raise ValidationError(
                f"Operational primitive '{primitive.value}' is enabled in "
                f"'{manifest.display_name}' without any mapped IFRS Chart of Accounts entry.",
                field="operational_primitives",
            )


def merge_pack_coa(manifests: Sequence[IndustryPackManifest]) -> tuple[PackAccountBlueprint, ...]:
    """Merge Chart of Accounts across 1+ packs, failing loudly on incompatible account codes."""
    if not manifests:
        raise ValidationError("At least one pack manifest is required.", field="manifests")

    by_code: dict[str, PackAccountBlueprint] = {}
    for manifest in manifests:
        validate_pack_manifest(manifest)
        for acct in manifest.coa_accounts:
            existing = by_code.get(acct.code)
            if existing is None:
                by_code[acct.code] = acct
                continue
            if (
                existing.category != acct.category
                or existing.ifrs_tag != acct.ifrs_tag
                or existing.name != acct.name
            ):
                raise ValidationError(
                    f"Account code conflict on '{acct.code}': '{existing.name}' "
                    f"({existing.category.value}/{existing.ifrs_tag}) conflicts with "
                    f"'{acct.name}' ({acct.category.value}/{acct.ifrs_tag}). Use distinct "
                    "non-overlapping account codes across hybrid units.",
                    field="coa_accounts",
                )

    return tuple(sorted(by_code.values(), key=lambda a: a.code))


def build_manifest_from_primitives(
    *,
    pack_code: FlagshipPackCode,
    display_name: str,
    primitives: Sequence[OperationalPrimitive],
    terminology_overrides: dict[str, str] | None = None,
    is_flagship: bool = False,
) -> IndustryPackManifest:
    """Assemble a validated declarative 6-section IndustryPackManifest from primitives."""
    unique_primitives = tuple(dict.fromkeys(primitives))
    if not unique_primitives:
        raise ValidationError(
            "Select at least one operational primitive for this business profile.",
            field="primitives",
        )

    accounts: list[PackAccountBlueprint] = []
    seen_codes: set[str] = set()
    dims: dict[str, PackDimensionSpec] = {}
    kpis: dict[str, PackKpiDefinition] = {}
    vocab: dict[str, str] = {}

    vat_registered = True
    is_prof = False
    include_state_tax = False
    service_charge_rate = "0.000000"
    vat_regime = TaxRegimeType.VAT_STANDARD_7_5
    wht_cat: str | None = None

    for prim in unique_primitives:
        spec = PRIMITIVE_CATALOG[prim]
        for acct in spec.accounts:
            if acct.code not in seen_codes:
                seen_codes.add(acct.code)
                accounts.append(acct)
        for dim in spec.dimensions:
            dims.setdefault(dim.key, dim)
        for kpi in spec.kpis:
            kpis.setdefault(kpi.key, kpi)
        for k, v in spec.vocabulary_defaults.items():
            vocab.setdefault(k, v)
        if spec.tax_hints.is_professional_services:
            is_prof = True
        if spec.tax_hints.include_state_consumption_tax:
            include_state_tax = True
        if spec.tax_hints.default_service_charge_rate != "0.000000":
            service_charge_rate = spec.tax_hints.default_service_charge_rate
        if spec.tax_hints.default_wht_category and not wht_cat:
            wht_cat = spec.tax_hints.default_wht_category
        if not spec.tax_hints.vat_registered and len(unique_primitives) == 1:
            vat_registered = False
            vat_regime = spec.tax_hints.default_vat_regime

    if terminology_overrides:
        vocab.update({k: v for k, v in terminology_overrides.items() if v.strip()})

    if len(unique_primitives) > 1 or pack_code is FlagshipPackCode.CUSTOM_COMPOSABLE:
        dims.setdefault(
            "business_unit",
            PackDimensionSpec(key="business_unit", label="Business Unit / Branch", required=True),
        )

    manifest = IndustryPackManifest(
        pack_code=pack_code,
        display_name=display_name,
        is_flagship=is_flagship,
        manifest_version="1.0.0",
        coa_accounts=tuple(sorted(accounts, key=lambda a: a.code)),
        tax_profile=PackTaxDefaults(
            vat_registered=vat_registered,
            default_vat_regime=vat_regime,
            is_professional_services=is_prof,
            include_state_consumption_tax=include_state_tax,
            default_service_charge_rate=service_charge_rate,
            default_wht_category=wht_cat,
        ),
        operational_primitives=unique_primitives,
        vocabulary_overrides=vocab,
        dimensions=tuple(dims.values()),
        kpi_definitions=tuple(kpis.values()),
    )
    validate_pack_manifest(manifest)
    return manifest


def compose_hybrid_pack(
    *,
    workspace_id: UUID,
    primary_pack: FlagshipPackCode,
    manifests: Sequence[IndustryPackManifest],
    is_hybrid_multi_unit: bool | None = None,
    terminology_overrides: dict[str, str] | None = None,
    profile_id: UUID | None = None,
) -> WorkspaceIndustryProfile:
    """Merge multiple packs into one WorkspaceIndustryProfile without CoA/IFRS collisions."""
    merged_coa = merge_pack_coa(manifests)
    primitives: list[OperationalPrimitive] = []
    seen_prims: set[OperationalPrimitive] = set()
    vocab: dict[str, str] = {}
    dims: dict[str, PackDimensionSpec] = {}
    kpi_keys: list[str] = []

    vat_registered = False
    is_prof = False
    include_state_tax = False
    service_charge_rate = "0.000000"
    default_vat_regime = TaxRegimeType.VAT_STANDARD_7_5
    wht_category: str | None = None

    for manifest in manifests:
        for prim in manifest.operational_primitives:
            if prim not in seen_prims:
                seen_prims.add(prim)
                primitives.append(prim)
        vocab.update(manifest.vocabulary_overrides)
        for dim in manifest.dimensions:
            dims.setdefault(dim.key, dim)
        for kpi in manifest.kpi_definitions:
            if kpi.key not in kpi_keys:
                kpi_keys.append(kpi.key)
        if manifest.tax_profile.vat_registered:
            vat_registered = True
        if manifest.tax_profile.is_professional_services:
            is_prof = True
        if manifest.tax_profile.include_state_consumption_tax:
            include_state_tax = True
        if manifest.tax_profile.default_service_charge_rate != "0.000000":
            service_charge_rate = manifest.tax_profile.default_service_charge_rate
        if manifest.tax_profile.default_wht_category and wht_category is None:
            wht_category = manifest.tax_profile.default_wht_category
        if len(manifests) == 1:
            default_vat_regime = manifest.tax_profile.default_vat_regime

    if terminology_overrides:
        vocab.update({k: v for k, v in terminology_overrides.items() if v.strip()})

    hybrid_flag = is_hybrid_multi_unit if is_hybrid_multi_unit is not None else len(manifests) > 1
    if hybrid_flag:
        dims.setdefault(
            "business_unit",
            PackDimensionSpec(key="business_unit", label="Business Unit / Branch", required=True),
        )

    descriptors = tuple(
        PackModuleDescriptor(
            primitive=prim,
            enabled=True,
            custom_labels=vocab,
        )
        for prim in primitives
    )

    return WorkspaceIndustryProfile(
        id=profile_id or uuid4(),
        workspace_id=workspace_id,
        primary_pack=primary_pack,
        is_hybrid_multi_unit=hybrid_flag,
        active_primitives=descriptors,
        kpi_widgets=tuple(kpi_keys),
        terminology_map=vocab,
        dimensions=tuple(dims.values()),
        tax_defaults=PackTaxDefaults(
            vat_registered=vat_registered,
            default_vat_regime=default_vat_regime,
            is_professional_services=is_prof,
            include_state_consumption_tax=include_state_tax,
            default_service_charge_rate=service_charge_rate,
            default_wht_category=wht_category,
        ),
        coa_accounts=merged_coa,
    )
