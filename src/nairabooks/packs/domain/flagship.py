"""Catalog of the 6 Flagship Nigerian Industry Pack reference presets."""

from __future__ import annotations

from dataclasses import dataclass

from nairabooks.packs.domain.models import FlagshipPackCode, OperationalPrimitive


@dataclass(frozen=True, slots=True)
class FlagshipPackPreset:
    """Opinionated starter template for one of the 6 core Nigerian industry verticals."""

    pack_code: FlagshipPackCode
    title: str
    plain_english_summary: str
    target_sectors: tuple[str, ...]
    recommended_primitives: tuple[OperationalPrimitive, ...]
    terminology_defaults: dict[str, str]
    tax_highlights: tuple[str, ...]
    phase_status: str


FLAGSHIP_PACK_CATALOG: dict[FlagshipPackCode, FlagshipPackPreset] = {
    FlagshipPackCode.RETAIL_ECOMMERCE: FlagshipPackPreset(
        pack_code=FlagshipPackCode.RETAIL_ECOMMERCE,
        title="Retail & E-Commerce",
        plain_english_summary=(
            "Run daily POS cash-ups (Paystack, Moniepoint, cash), track SKU stock on hand "
            "& COGS margins, and collect 7.5% NRS VAT cleanly."
        ),
        target_sectors=("Supermarkets & Mini-marts", "Pharmacies", "Fashion & Online Shops"),
        recommended_primitives=(
            OperationalPrimitive.POS_DAILY_CASHUP,
            OperationalPrimitive.SKU_INVENTORY_COGS,
        ),
        terminology_defaults={
            "customer": "Shopper",
            "invoice": "POS Sales Receipt",
            "item": "Retail SKU",
        },
        tax_highlights=(
            "Automatic 7.5% Output VAT split on POS Z-reports",
            "Merchant MDR clearing charges isolated from gross sales",
        ),
        phase_status="ACTIVE_PHASE_1",
    ),
    FlagshipPackCode.WHOLESALE_DISTRIBUTION: FlagshipPackPreset(
        pack_code=FlagshipPackCode.WHOLESALE_DISTRIBUTION,
        title="Wholesale & Distribution",
        plain_english_summary=(
            "Manage depot stock transfers, vendor purchase orders, clearing/freight "
            "landed costs (IAS 2), and reseller gross margin per tier."
        ),
        target_sectors=("FMCG Distributors", "Importers & Depots", "B2B Trade Suppliers"),
        recommended_primitives=(
            OperationalPrimitive.MULTI_TIER_WAREHOUSE_PO,
            OperationalPrimitive.SKU_INVENTORY_COGS,
        ),
        terminology_defaults={
            "customer": "Distributor / Trade Buyer",
            "invoice": "Wholesale Waybill Invoice",
            "location": "Regional Depot",
        },
        tax_highlights=(
            "Goods-in-Transit clearing & freight capitalized under IAS 2",
            "WHT goods-supply tracking for corporate trade vendors",
        ),
        phase_status="ACTIVE_PHASE_1",
    ),
    FlagshipPackCode.MANUFACTURING_LIGHT: FlagshipPackPreset(
        pack_code=FlagshipPackCode.MANUFACTURING_LIGHT,
        title="Manufacturing (Light / Small Scale)",
        plain_english_summary=(
            "Track Bills of Materials (BOM), factory conversion into WIP, finished-goods "
            "unit costs, and production yield/scrap variances."
        ),
        target_sectors=("Bakeries & Food Processing", "Cosmetics & Packaging", "Light Assembly"),
        recommended_primitives=(
            OperationalPrimitive.BILL_OF_MATERIALS_WIP,
            OperationalPrimitive.SKU_INVENTORY_COGS,
        ),
        terminology_defaults={
            "work_order": "Production Batch",
            "item": "Finished SKU / Raw Input",
            "project": "Factory Batch",
        },
        tax_highlights=(
            "Raw-material-to-WIP-to-Finished-Goods cost roll-up under IAS 2",
            "Yield & scrap variance posted transparently to COGS",
        ),
        phase_status="ACTIVE_PHASE_1",
    ),
    FlagshipPackCode.CONSTRUCTION_TRADES: FlagshipPackPreset(
        pack_code=FlagshipPackCode.CONSTRUCTION_TRADES,
        title="Construction & Trades",
        plain_english_summary=(
            "Track project job sites, certified valuation progress, retention receivable, "
            "and 2%/5% subcontractor Withholding Tax."
        ),
        target_sectors=("Civil & Building Contractors", "Solar/MEP Installers", "Real Estate"),
        recommended_primitives=(OperationalPrimitive.JOB_COSTING_RETENTION,),
        terminology_defaults={
            "project": "Construction Site",
            "vendor": "Subcontractor",
            "invoice": "Valuation Certificate",
        },
        tax_highlights=(
            "2%/5% Construction WHT with No-TIN 2x enforcement",
            "Contract retention receivable tracked separately from current AR",
        ),
        phase_status="ACTIVE_PHASE_2",
    ),
    FlagshipPackCode.PROFESSIONAL_SERVICES: FlagshipPackPreset(
        pack_code=FlagshipPackCode.PROFESSIONAL_SERVICES,
        title="Professional & Consulting Services",
        plain_english_summary=(
            "Manage client engagements, unbilled advisory WIP, retainer billing, WHT "
            "credit notes, and Nigeria Tax Act 2025 CIT notices."
        ),
        target_sectors=("Law & Accounting Practices", "Software/IT Studios", "Agencies"),
        recommended_primitives=(OperationalPrimitive.TIME_RETAINER_BILLING,),
        terminology_defaults={
            "customer": "Client",
            "product": "Advisory Retainer",
            "project": "Engagement Code",
        },
        tax_highlights=(
            "Nigeria Tax Act 2025 small-company 0% CIT exclusion notice active",
            "5%/10% Consulting WHT credit-note receivable ledger tracking",
        ),
        phase_status="ACTIVE_PHASE_2",
    ),
    FlagshipPackCode.NON_PROFIT: FlagshipPackPreset(
        pack_code=FlagshipPackCode.NON_PROFIT,
        title="Non-Profit Organizations & NGOs",
        plain_english_summary=(
            "Separate donor-restricted grant funds from unrestricted operating income "
            "and monitor grant burn rates against budgets."
        ),
        target_sectors=("NGOs & Foundations", "Faith-Based Orgs", "Donor-Funded Initiatives"),
        recommended_primitives=(OperationalPrimitive.FUND_GRANT_ACCOUNTING,),
        terminology_defaults={
            "customer": "Donor / Grantmaker",
            "invoice": "Grant Tranche Receipt",
            "project": "Donor Program",
        },
        tax_highlights=(
            "VAT-exempt grant accounting default & charitable CIT status banner",
            "Program-level restricted net asset separation",
        ),
        phase_status="ACTIVE_PHASE_2",
    ),
}
