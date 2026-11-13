"""Application ports for declarative industry packs and workspace industry profiles."""

from __future__ import annotations

from typing import Protocol
from uuid import UUID

from nairabooks.packs.domain.models import (
    FlagshipPackCode,
    IndustryPackManifest,
    WorkspaceIndustryProfile,
)


class IndustryPackStore(Protocol):
    """Repository abstraction for industry pack manifests and workspace profiles."""

    def save_manifest(self, manifest: IndustryPackManifest) -> IndustryPackManifest: ...

    def get_manifest(self, pack_code: FlagshipPackCode) -> IndustryPackManifest | None: ...

    def list_manifests(self) -> tuple[IndustryPackManifest, ...]: ...

    def get_workspace_pack_profile(self, workspace_id: UUID) -> WorkspaceIndustryProfile: ...

    def save_workspace_pack_profile(
        self, profile: WorkspaceIndustryProfile
    ) -> WorkspaceIndustryProfile: ...
