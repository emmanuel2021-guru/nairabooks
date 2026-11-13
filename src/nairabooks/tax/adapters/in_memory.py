"""In-memory adapter for workspace Nigerian tax profiles and effective-dated rule tables."""

from __future__ import annotations

from datetime import date
from uuid import UUID, uuid4

from nairabooks.ledger.domain.errors import ValidationError
from nairabooks.tax.domain import (
    DEFAULT_NIGERIAN_TAX_RULES,
    NigerianLegalForm,
    NigerianTaxProfile,
    TaxRuleVersion,
)


class InMemoryTaxStore:
    """Thread-safe/deterministic in-memory TaxProfileStore for tests and local API preview."""

    def __init__(
        self,
        *,
        rules: tuple[TaxRuleVersion, ...] = DEFAULT_NIGERIAN_TAX_RULES,
    ) -> None:
        self._profiles_by_workspace: dict[UUID, list[NigerianTaxProfile]] = {}
        self._rules: tuple[TaxRuleVersion, ...] = rules

    def seed_default_workspace(
        self,
        workspace_id: UUID,
        *,
        state_of_operation: str = "LAGOS",
        annual_turnover_ngn: str = "42000000.00",
        fixed_assets_ngn: str = "65000000.00",
    ) -> NigerianTaxProfile:
        """Seed a realistic Nigerian SME tax profile if none is present for workspace_id."""
        existing = self._profiles_by_workspace.get(workspace_id)
        if existing:
            return existing[-1]
        profile = NigerianTaxProfile.create(
            id=uuid4(),
            workspace_id=workspace_id,
            legal_form=NigerianLegalForm.PRIVATE_LIMITED,
            tin_number="10459821-0001",
            vat_registered=True,
            annual_turnover_ngn=annual_turnover_ngn,
            fixed_assets_ngn=fixed_assets_ngn,
            state_of_operation=state_of_operation,
            is_professional_services=False,
            effective_from=date(2026, 1, 1),
        )
        return self.save_tax_profile(profile)

    def save_tax_profile(self, profile: NigerianTaxProfile) -> NigerianTaxProfile:
        """Upsert or append an effective-dated tax profile for a workspace."""
        bucket = self._profiles_by_workspace.setdefault(profile.workspace_id, [])
        replaced = False
        for idx, existing in enumerate(bucket):
            if existing.effective_from == profile.effective_from:
                bucket[idx] = profile
                replaced = True
                break
        if not replaced:
            bucket.append(profile)
            bucket.sort(key=lambda item: item.effective_from)
        return profile

    def get_active_tax_profile(
        self,
        workspace_id: UUID,
        *,
        as_of_date: date | None = None,
    ) -> NigerianTaxProfile:
        """Fetch latest effective-dated tax profile matching workspace_id and as_of_date."""
        bucket = self._profiles_by_workspace.get(workspace_id)
        if not bucket:
            raise ValidationError(
                f"No NigerianTaxProfile configured for workspace '{workspace_id}'.",
                field="workspace_id",
            )
        if as_of_date is None:
            return bucket[-1]
        matching = [p for p in bucket if p.effective_from <= as_of_date]
        return matching[-1] if matching else bucket[0]

    def list_tax_rules(self) -> tuple[TaxRuleVersion, ...]:
        """Return all configured effective-dated Nigerian tax rules."""
        return self._rules
