"""Parameterized PostgreSQL 18 SQL query builders for nigerian_tax_profiles & tax_rule_versions."""

from __future__ import annotations

from datetime import date
from uuid import UUID

from nairabooks.tax.domain.models import NigerianTaxProfile, TaxRegimeType


class PostgresTaxSqlBuilder:
    """Build parameterized SQL aligned with migration 0001_initial_core_schema.sql."""

    @staticmethod
    def select_active_tax_profile(
        workspace_id: UUID,
        *,
        as_of_date: date,
    ) -> tuple[str, tuple[object, ...]]:
        """Query latest effective-dated nigerian_tax_profiles row for workspace_id."""
        sql = (
            "SELECT id, workspace_id, legal_form, tin_number, vat_registered, "
            "annual_turnover_ngn, fixed_assets_ngn, state_of_operation, "
            "is_professional_services, effective_from, effective_to "
            "FROM nigerian_tax_profiles "
            "WHERE workspace_id = %s "
            "  AND effective_from <= %s::DATE "
            "  AND (effective_to IS NULL OR effective_to > %s::DATE) "
            "ORDER BY effective_from DESC "
            "LIMIT 1;"
        )
        return sql, (str(workspace_id), as_of_date.isoformat(), as_of_date.isoformat())

    @staticmethod
    def upsert_tax_profile(profile: NigerianTaxProfile) -> tuple[str, tuple[object, ...]]:
        """Insert or update an effective-dated nigerian_tax_profiles row."""
        sql = (
            "INSERT INTO nigerian_tax_profiles ("
            "  id, workspace_id, legal_form, tin_number, vat_registered, "
            "  annual_turnover_ngn, fixed_assets_ngn, state_of_operation, "
            "  is_professional_services, effective_from, effective_to"
            ") VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s::DATE, %s::DATE) "
            "ON CONFLICT (workspace_id, effective_from) DO UPDATE SET "
            "  legal_form = EXCLUDED.legal_form, "
            "  tin_number = EXCLUDED.tin_number, "
            "  vat_registered = EXCLUDED.vat_registered, "
            "  annual_turnover_ngn = EXCLUDED.annual_turnover_ngn, "
            "  fixed_assets_ngn = EXCLUDED.fixed_assets_ngn, "
            "  state_of_operation = EXCLUDED.state_of_operation, "
            "  is_professional_services = EXCLUDED.is_professional_services, "
            "  effective_to = EXCLUDED.effective_to;"
        )
        return sql, (
            str(profile.id),
            str(profile.workspace_id),
            profile.legal_form.value,
            profile.tin_number,
            profile.vat_registered,
            f"{profile.annual_turnover_ngn:.2f}",
            f"{profile.fixed_assets_ngn:.2f}",
            profile.state_of_operation,
            profile.is_professional_services,
            profile.effective_from.isoformat(),
            profile.effective_to.isoformat() if profile.effective_to else None,
        )

    @staticmethod
    def select_effective_tax_rule(
        *,
        regime: TaxRegimeType,
        jurisdiction: str,
        supply_category_code: str,
        transaction_date: date,
    ) -> tuple[str, tuple[object, ...]]:
        """Query tax_rule_versions using PostgreSQL DATERANGE containment (@>)."""
        sql = (
            "SELECT rule_version_code, standard_rate, no_tin_penalty_rate, statutory_citation "
            "FROM tax_rule_versions "
            "WHERE regime = %s "
            "  AND jurisdiction = %s "
            "  AND supply_category_code = %s "
            "  AND effective_period @> %s::DATE "
            "LIMIT 1;"
        )
        return sql, (
            regime.value,
            jurisdiction.strip().upper(),
            supply_category_code,
            transaction_date.isoformat(),
        )
