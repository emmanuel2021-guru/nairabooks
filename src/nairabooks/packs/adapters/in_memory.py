"""In-memory adapter for IndustryPackManifest and WorkspaceIndustryProfile storage."""

from __future__ import annotations

from uuid import UUID

from nairabooks.ledger.domain.errors import ValidationError
from nairabooks.packs.domain import (
    FlagshipPackCode,
    IndustryPackManifest,
    OperationalPrimitive,
    WorkspaceIndustryProfile,
    build_manifest_from_primitives,
    compose_hybrid_pack,
)


class InMemoryPackStore:
    """In-memory persistence for declarative pack manifests and workspace profiles."""

    def __init__(self) -> None:
        self._manifests: dict[FlagshipPackCode, IndustryPackManifest] = {}
        self._workspace_profiles: dict[UUID, WorkspaceIndustryProfile] = {}

    def seed_default_workspace(self, workspace_id: UUID) -> WorkspaceIndustryProfile:
        """Seed a default Retail POS + SKU Inventory profile if none exists yet."""
        existing = self._workspace_profiles.get(workspace_id)
        if existing is not None:
            return existing
        manifest = build_manifest_from_primitives(
            pack_code=FlagshipPackCode.RETAIL_ECOMMERCE,
            display_name="Retail & E-Commerce Default Profile",
            primitives=(
                OperationalPrimitive.POS_DAILY_CASHUP,
                OperationalPrimitive.SKU_INVENTORY_COGS,
            ),
        )
        profile = compose_hybrid_pack(
            workspace_id=workspace_id,
            primary_pack=FlagshipPackCode.RETAIL_ECOMMERCE,
            manifests=[manifest],
            is_hybrid_multi_unit=False,
        )
        return self.save_workspace_pack_profile(profile)

    def save_manifest(self, manifest: IndustryPackManifest) -> IndustryPackManifest:
        self._manifests[manifest.pack_code] = manifest
        return manifest

    def get_manifest(self, pack_code: FlagshipPackCode) -> IndustryPackManifest | None:
        return self._manifests.get(pack_code)

    def list_manifests(self) -> tuple[IndustryPackManifest, ...]:
        return tuple(self._manifests.values())

    def get_workspace_pack_profile(self, workspace_id: UUID) -> WorkspaceIndustryProfile:
        profile = self._workspace_profiles.get(workspace_id)
        if profile is None:
            raise ValidationError(
                f"No WorkspaceIndustryProfile configured for workspace '{workspace_id}'.",
                field="workspace_id",
            )
        return profile

    def save_workspace_pack_profile(
        self, profile: WorkspaceIndustryProfile
    ) -> WorkspaceIndustryProfile:
        self._workspace_profiles[profile.workspace_id] = profile
        return profile
