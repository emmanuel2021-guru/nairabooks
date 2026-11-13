"""Tests for Track 3 Phase 1: IndustryPack 6-section Pydantic schema, primitives & conflicts."""

from __future__ import annotations

import pytest

from nairabooks.ledger.domain.errors import ValidationError
from nairabooks.ledger.domain.models import AccountCategory
from nairabooks.packs.domain.composer import (
    PRIMITIVE_CATALOG,
    merge_pack_coa,
    validate_pack_manifest,
)
from nairabooks.packs.domain.models import (
    FlagshipPackCode,
    IndustryPackManifest,
    OperationalPrimitive,
    PackAccountBlueprint,
    PackDimensionSpec,
    PackKpiDefinition,
    PackTaxDefaults,
)


def _sample_manifest(
    *,
    pack_code: FlagshipPackCode = FlagshipPackCode.CUSTOM_COMPOSABLE,
    primitives: tuple[OperationalPrimitive, ...] = (OperationalPrimitive.HOSPITALITY_FOLIO_USALI,),
    accounts: tuple[PackAccountBlueprint, ...] | None = None,
) -> IndustryPackManifest:
    default_accounts = (
        PackAccountBlueprint(
            code="4050",
            name="Room Folio Revenue",
            category=AccountCategory.REVENUE,
            ifrs_tag="REVENUE_CONTRACTS",
            source_primitive=OperationalPrimitive.HOSPITALITY_FOLIO_USALI,
        ),
        PackAccountBlueprint(
            code="2140",
            name="Staff Service Charge Fiduciary Pool",
            category=AccountCategory.LIABILITY,
            ifrs_tag="FIDUCIARY_PAYABLES",
            source_primitive=OperationalPrimitive.HOSPITALITY_FOLIO_USALI,
        ),
    )
    return IndustryPackManifest(
        pack_code=pack_code,
        display_name="Nigerian Boutique Hotel Profile",
        is_flagship=False,
        manifest_version="1.0.0",
        coa_accounts=accounts if accounts is not None else default_accounts,
        tax_profile=PackTaxDefaults(
            vat_registered=True,
            include_state_consumption_tax=True,
            default_service_charge_rate="0.100000",
        ),
        operational_primitives=primitives,
        vocabulary_overrides={"customer": "Guest", "invoice": "Guest Folio"},
        dimensions=(
            PackDimensionSpec(key="property_wing", label="Hotel Wing / Property", required=True),
        ),
        kpi_definitions=(
            PackKpiDefinition(
                key="revpar",
                label="RevPAR (Revenue Per Available Room)",
                formula_plain_english="Room revenue divided by total available rooms",
            ),
        ),
    )


def test_industry_pack_6_section_schema_and_10_primitives_catalog() -> None:
    """Validate 6 declarative sections and ensure all 10 OperationalPrimitives exist."""
    manifest = _sample_manifest()
    validate_pack_manifest(manifest)

    assert len(PRIMITIVE_CATALOG) == 10
    for primitive in OperationalPrimitive:
        spec = PRIMITIVE_CATALOG[primitive]
        assert len(spec.accounts) >= 1
        assert len(spec.kpis) >= 1


def test_invalid_pack_missing_ifrs_tag_duplicate_code_or_missing_primitive_account() -> None:
    """Invalid packs fail loudly with plain-English ValidationError guidance."""
    # Missing IFRS mapping
    with pytest.raises(ValidationError, match="IFRS"):
        manifest_bad_ifrs = _sample_manifest(
            accounts=(
                PackAccountBlueprint(
                    code="4050",
                    name="Room Revenue",
                    category=AccountCategory.REVENUE,
                    ifrs_tag="",
                    source_primitive=OperationalPrimitive.HOSPITALITY_FOLIO_USALI,
                ),
            )
        )
        validate_pack_manifest(manifest_bad_ifrs)

    # Duplicate account code inside same pack
    with pytest.raises(ValidationError, match="4050"):
        manifest_dup = _sample_manifest(
            accounts=(
                PackAccountBlueprint(
                    code="4050",
                    name="Room Revenue A",
                    category=AccountCategory.REVENUE,
                    ifrs_tag="REVENUE_CONTRACTS",
                    source_primitive=OperationalPrimitive.HOSPITALITY_FOLIO_USALI,
                ),
                PackAccountBlueprint(
                    code="4050",
                    name="Room Revenue B",
                    category=AccountCategory.REVENUE,
                    ifrs_tag="REVENUE_CONTRACTS",
                    source_primitive=OperationalPrimitive.HOSPITALITY_FOLIO_USALI,
                ),
            )
        )
        validate_pack_manifest(manifest_dup)

    # Enabled primitive lacks matching CoA account in custom manifest
    with pytest.raises(ValidationError, match="BILL_OF_MATERIALS_WIP"):
        manifest_missing_prim_acct = _sample_manifest(
            primitives=(
                OperationalPrimitive.HOSPITALITY_FOLIO_USALI,
                OperationalPrimitive.BILL_OF_MATERIALS_WIP,
            )
        )
        validate_pack_manifest(manifest_missing_prim_acct)


def test_coa_merger_deduplicates_identical_and_rejects_conflicting_codes() -> None:
    """Identical accounts deduplicate cleanly; mismatched names/categories on same code fail."""
    pack_a = _sample_manifest()
    pack_b_compatible = _sample_manifest(
        pack_code=FlagshipPackCode.CUSTOM_COMPOSABLE,
        primitives=(OperationalPrimitive.DINER_RECIPE_TABLE,),
        accounts=(
            PackAccountBlueprint(
                code="4060",
                name="Restaurant Dine-In & Bar Sales",
                category=AccountCategory.REVENUE,
                ifrs_tag="REVENUE_CONTRACTS",
                source_primitive=OperationalPrimitive.DINER_RECIPE_TABLE,
            ),
            # Exact identical fiduciary clearing account merges without collision
            PackAccountBlueprint(
                code="2140",
                name="Staff Service Charge Fiduciary Pool",
                category=AccountCategory.LIABILITY,
                ifrs_tag="FIDUCIARY_PAYABLES",
                source_primitive=OperationalPrimitive.HOSPITALITY_FOLIO_USALI,
            ),
        ),
    )

    merged = merge_pack_coa([pack_a, pack_b_compatible])
    assert [acct.code for acct in merged] == ["2140", "4050", "4060"]

    pack_c_conflict = _sample_manifest(
        primitives=(OperationalPrimitive.DINER_RECIPE_TABLE,),
        accounts=(
            PackAccountBlueprint(
                code="4050",
                name="Kitchen Equipment Asset",
                category=AccountCategory.ASSET,
                ifrs_tag="PROPERTY_PLANT_EQUIPMENT",
                source_primitive=OperationalPrimitive.DINER_RECIPE_TABLE,
            ),
        ),
    )
    with pytest.raises(ValidationError, match="conflict"):
        merge_pack_coa([pack_a, pack_c_conflict])
