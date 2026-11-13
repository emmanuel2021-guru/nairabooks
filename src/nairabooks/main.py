"""Starter catalog & health check metadata for NairaBooks (Phase 2 scaffold)."""

from __future__ import annotations

from typing import Final

from pydantic import BaseModel, ConfigDict

from nairabooks.config import NairaBooksSettings, get_settings


class FlagshipPackSummary(BaseModel):
    """Metadata descriptor for a NairaBooks Flagship Reference Industry Pack."""

    model_config = ConfigDict(frozen=True)

    pack_id: str
    display_name: str
    primary_focus: str
    is_flagship: bool = True


FLAGSHIP_PACKS: Final[tuple[FlagshipPackSummary, ...]] = (
    FlagshipPackSummary(
        pack_id="retail_ecommerce",
        display_name="Retail & E-commerce",
        primary_focus="POS transactions, daily cash flows, VAT/sales tax, stock levels",
    ),
    FlagshipPackSummary(
        pack_id="wholesale_distribution",
        display_name="Wholesale & Distribution",
        primary_focus="Multi-tier inventory, vendor POs, landed shipping costs, gross margins",
    ),
    FlagshipPackSummary(
        pack_id="manufacturing_light",
        display_name="Manufacturing (Light / Small Scale)",
        primary_focus="Bill of materials (BOM), assembly tracking, raw materials, WIP costing",
    ),
    FlagshipPackSummary(
        pack_id="construction_trades",
        display_name="Construction & Trades",
        primary_focus="Job costing, subcontractor WHT & payments, site materials tracking",
    ),
    FlagshipPackSummary(
        pack_id="professional_services",
        display_name="Professional Services",
        primary_focus="Client billing, time tracking, reimbursable expenses, project bookkeeping",
    ),
    FlagshipPackSummary(
        pack_id="non_profit",
        display_name="Non-Profit Organizations",
        primary_focus=(
            "Restricted fund accounting, donor grant tracking, budget-vs-actual reporting"
        ),
    ),
)


def get_pack_catalog() -> dict[str, object]:
    """Return the initial Layer B Flagship Reference Packs plus Universal Custom Builder flag."""
    return {
        "flagship_packs": [pack.model_dump() for pack in FLAGSHIP_PACKS],
        "flagship_count": len(FLAGSHIP_PACKS),
        "universal_custom_builder_supported": True,
        "custom_domain_examples": [
            "Hospitality & Hotels (USALI)",
            "Diner & Restaurants",
            "Healthcare Clinics & Pharmacies",
            "Logistics & Fleet Operations",
        ],
    }


def health_status(settings: NairaBooksSettings | None = None) -> dict[str, object]:
    """Return starter health & regulatory baseline status for diagnostics."""
    cfg = settings or get_settings()
    return {
        "status": "ok",
        "app_name": cfg.app_name,
        "env": cfg.env,
        "default_currency": cfg.default_currency,
        "vat_rate": str(cfg.default_vat_rate),
        "ifrs_standard": cfg.ifrs_standard,
        "flagship_pack_count": len(FLAGSHIP_PACKS),
        "custom_pack_builder": "planned",
    }
