"""Parameterized PostgreSQL 18 SQL query builders for industry_pack_manifests & profiles."""

from __future__ import annotations

import json
from uuid import UUID

from nairabooks.packs.domain.models import IndustryPackManifest, WorkspaceIndustryProfile


class PostgresPackSqlBuilder:
    """Build parameterized SQL aligned with migration 0001_initial_core_schema.sql."""

    @staticmethod
    def upsert_manifest(manifest: IndustryPackManifest) -> tuple[str, tuple[object, ...]]:
        """Persist or update a declarative IndustryPackManifest JSONB payload."""
        sql = (
            "INSERT INTO industry_pack_manifests ("
            "  pack_code, display_name, is_flagship, manifest_version, manifest_payload"
            ") VALUES (%s, %s, %s, %s, %s::JSONB) "
            "ON CONFLICT (pack_code) DO UPDATE SET "
            "  display_name = EXCLUDED.display_name, "
            "  is_flagship = EXCLUDED.is_flagship, "
            "  manifest_version = EXCLUDED.manifest_version, "
            "  manifest_payload = EXCLUDED.manifest_payload;"
        )
        payload_json = manifest.model_dump_json()
        return sql, (
            manifest.pack_code.value,
            manifest.display_name,
            manifest.is_flagship,
            manifest.manifest_version,
            payload_json,
        )

    @staticmethod
    def select_workspace_pack_profile(workspace_id: UUID) -> tuple[str, tuple[object, ...]]:
        """Query the workspace's active WorkspaceIndustryProfile."""
        sql = (
            "SELECT wp.id, wp.workspace_id, ipm.pack_code, wp.is_hybrid_multi_unit, "
            "       wp.active_primitives, wp.config, wp.updated_at "
            "FROM workspace_pack_profiles AS wp "
            "INNER JOIN industry_pack_manifests AS ipm ON ipm.id = wp.primary_pack_id "
            "WHERE wp.workspace_id = %s;"
        )
        return sql, (str(workspace_id),)

    @staticmethod
    def upsert_workspace_pack_profile(
        profile: WorkspaceIndustryProfile,
        *,
        primary_pack_id: UUID,
    ) -> tuple[str, tuple[object, ...]]:
        """Persist composed workspace pack primitives and config JSONB cleanly."""
        sql = (
            "INSERT INTO workspace_pack_profiles ("
            "  id, workspace_id, primary_pack_id, is_hybrid_multi_unit, active_primitives, config"
            ") VALUES (%s, %s, %s, %s, %s::TEXT[], %s::JSONB) "
            "ON CONFLICT (workspace_id) DO UPDATE SET "
            "  primary_pack_id = EXCLUDED.primary_pack_id, "
            "  is_hybrid_multi_unit = EXCLUDED.is_hybrid_multi_unit, "
            "  active_primitives = EXCLUDED.active_primitives, "
            "  config = EXCLUDED.config, "
            "  updated_at = now();"
        )
        primitives = [d.primitive.value for d in profile.active_primitives if d.enabled]
        config_json = json.dumps(
            {
                "terminologyMap": profile.terminology_map,
                "kpiWidgets": list(profile.kpi_widgets),
                "dimensions": [d.model_dump() for d in profile.dimensions],
                "taxDefaults": profile.tax_defaults.model_dump(),
            }
        )
        return sql, (
            str(profile.id),
            str(profile.workspace_id),
            str(primary_pack_id),
            profile.is_hybrid_multi_unit,
            primitives,
            config_json,
        )
