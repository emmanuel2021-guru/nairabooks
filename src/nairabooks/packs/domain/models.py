"""Pydantic declarative schemas and domain models for NairaBooks Industry Packs."""

from __future__ import annotations

from datetime import UTC, datetime
from enum import StrEnum
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from nairabooks.ledger.domain.models import AccountCategory
from nairabooks.tax.domain.models import TaxRegimeType


class FlagshipPackCode(StrEnum):
    """Supported Flagship Reference Packs + Custom Composable Builder aligned with GraphQL."""

    RETAIL_ECOMMERCE = "RETAIL_ECOMMERCE"
    WHOLESALE_DISTRIBUTION = "WHOLESALE_DISTRIBUTION"
    MANUFACTURING_LIGHT = "MANUFACTURING_LIGHT"
    CONSTRUCTION_TRADES = "CONSTRUCTION_TRADES"
    PROFESSIONAL_SERVICES = "PROFESSIONAL_SERVICES"
    NON_PROFIT = "NON_PROFIT"
    CUSTOM_COMPOSABLE = "CUSTOM_COMPOSABLE"


class OperationalPrimitive(StrEnum):
    """Ten reusable operational capability primitives aligned with api/graphql/schema.graphql."""

    POS_DAILY_CASHUP = "POS_DAILY_CASHUP"
    SKU_INVENTORY_COGS = "SKU_INVENTORY_COGS"
    MULTI_TIER_WAREHOUSE_PO = "MULTI_TIER_WAREHOUSE_PO"
    BILL_OF_MATERIALS_WIP = "BILL_OF_MATERIALS_WIP"
    JOB_COSTING_RETENTION = "JOB_COSTING_RETENTION"
    TIME_RETAINER_BILLING = "TIME_RETAINER_BILLING"
    FUND_GRANT_ACCOUNTING = "FUND_GRANT_ACCOUNTING"
    HOSPITALITY_FOLIO_USALI = "HOSPITALITY_FOLIO_USALI"
    DINER_RECIPE_TABLE = "DINER_RECIPE_TABLE"
    LOGISTICS_FLEET_TRIP = "LOGISTICS_FLEET_TRIP"


class PackAccountBlueprint(BaseModel):
    """Section 1: Declarative IFRS Chart of Accounts entry contributed by a pack or primitive."""

    model_config = ConfigDict(frozen=True)

    code: str
    name: str
    category: AccountCategory
    ifrs_tag: str
    source_primitive: OperationalPrimitive
    is_system_locked: bool = False


class PackTaxDefaults(BaseModel):
    """Section 2: Declarative Nigerian tax defaults attached to an industry profile."""

    model_config = ConfigDict(frozen=True)

    vat_registered: bool = True
    default_vat_regime: TaxRegimeType = TaxRegimeType.VAT_STANDARD_7_5
    is_professional_services: bool = False
    include_state_consumption_tax: bool = False
    default_service_charge_rate: str = "0.000000"
    default_wht_category: str | None = None


class PackDimensionSpec(BaseModel):
    """Section 5: Analytical reporting dimension (Branch, Site, Donor Fund, Property Wing)."""

    model_config = ConfigDict(frozen=True)

    key: str
    label: str
    required: bool = False


class PackKpiDefinition(BaseModel):
    """Section 6: Industry KPI widget specification."""

    model_config = ConfigDict(frozen=True)

    key: str
    label: str
    formula_plain_english: str


class IndustryPackManifest(BaseModel):
    """6-Section declarative IndustryPack blueprint validated before composition."""

    model_config = ConfigDict(frozen=True)

    pack_code: FlagshipPackCode
    display_name: str
    is_flagship: bool = True
    manifest_version: str = "1.0.0"
    coa_accounts: tuple[PackAccountBlueprint, ...] = Field(default=())
    tax_profile: PackTaxDefaults = Field(default_factory=PackTaxDefaults)
    operational_primitives: tuple[OperationalPrimitive, ...] = Field(default=())
    vocabulary_overrides: dict[str, str] = Field(default_factory=dict)
    dimensions: tuple[PackDimensionSpec, ...] = Field(default=())
    kpi_definitions: tuple[PackKpiDefinition, ...] = Field(default=())


class PackModuleDescriptor(BaseModel):
    """Enabled primitive descriptor matching GraphQL PackModuleDescriptor."""

    model_config = ConfigDict(frozen=True)

    primitive: OperationalPrimitive
    enabled: bool = True
    custom_labels: dict[str, str] = Field(default_factory=dict)


class WorkspaceIndustryProfile(BaseModel):
    """Workspace-level composed Industry Profile aligned with schema.graphql."""

    model_config = ConfigDict(frozen=True)

    id: UUID
    workspace_id: UUID
    primary_pack: FlagshipPackCode
    is_hybrid_multi_unit: bool
    active_primitives: tuple[PackModuleDescriptor, ...]
    kpi_widgets: tuple[str, ...]
    terminology_map: dict[str, str] = Field(default_factory=dict)
    dimensions: tuple[PackDimensionSpec, ...] = Field(default=())
    tax_defaults: PackTaxDefaults = Field(default_factory=PackTaxDefaults)
    coa_accounts: tuple[PackAccountBlueprint, ...] = Field(default=())
    updated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
