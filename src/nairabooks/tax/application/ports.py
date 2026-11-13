"""Application ports for workspace tax profiles and statutory rule storage."""

from __future__ import annotations

from datetime import date
from typing import Protocol
from uuid import UUID

from nairabooks.tax.domain.models import NigerianTaxProfile, TaxRuleVersion


class TaxProfileStore(Protocol):
    """Repository abstraction isolating tax rule storage from domain calculations."""

    def get_active_tax_profile(
        self,
        workspace_id: UUID,
        *,
        as_of_date: date | None = None,
    ) -> NigerianTaxProfile: ...

    def save_tax_profile(self, profile: NigerianTaxProfile) -> NigerianTaxProfile: ...

    def list_tax_rules(self) -> tuple[TaxRuleVersion, ...]: ...
