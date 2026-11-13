"""Privacy by Design, Data Subject Rights (DSR) & Statutory Retention Engine.

Implements Nigeria Data Protection Act (NDPA) 2023 & GDPR compliance:
Right to Access (DSAR export), Right to Rectification, and Right to Erasure / Anonymization
reconciled with CAMA 2020 Section 374 6-year statutory accounting retention rules.
Activated by: `gdpr-data-handling` (#102) and `legal-advisor` (#101).
"""

from __future__ import annotations

import hashlib
from dataclasses import dataclass
from datetime import UTC, date, datetime
from typing import Any

CAMA_STATUTORY_RETENTION_YEARS = 6


@dataclass(frozen=True)
class DataSubjectProfile:
    user_id: str
    tenant_id: str
    full_name: str
    email: str
    phone_number: str | None
    role: str
    created_at: str
    is_anonymized: bool = False


@dataclass
class DsarExportBundle:
    export_id: str
    generated_at: str
    user_profile: dict[str, Any]
    audit_activity_count: int
    activities: list[dict[str, Any]]
    statutory_retention_notice: str


class PrivacyComplianceManager:
    """Handles NDPA 2023 / GDPR DSR operations with CAMA 2020 retention reconciliation."""

    @classmethod
    def export_dsar_bundle(
        cls,
        profile: DataSubjectProfile,
        activities: list[dict[str, Any]] | None = None,
    ) -> DsarExportBundle:
        """Right to Access: Generate structured, machine-readable JSON bundle."""
        hashed_uid = hashlib.sha256(profile.user_id.encode()).hexdigest()[:8]
        export_id = f"DSAR-{profile.tenant_id[:6]}-{hashed_uid}"
        user_data = {
            "userId": profile.user_id,
            "tenantId": profile.tenant_id,
            "fullName": profile.full_name,
            "email": profile.email,
            "phoneNumber": profile.phone_number,
            "assignedRole": profile.role,
            "accountCreated": profile.created_at,
            "isAnonymized": profile.is_anonymized,
        }
        activity_list = activities or []

        return DsarExportBundle(
            export_id=export_id,
            generated_at=datetime.now(UTC).isoformat(),
            user_profile=user_data,
            audit_activity_count=len(activity_list),
            activities=activity_list,
            statutory_retention_notice=(
                "Financial ledger vouchers are maintained for a mandatory 6-year retention period "
                "under Companies and Allied Matters Act (CAMA) 2020 Section 374."
            ),
        )

    @classmethod
    def anonymize_user(cls, profile: DataSubjectProfile) -> DataSubjectProfile:
        """Right to Erasure / Anonymization: Mask personal identifying details.

        Preserves double-entry audit linkage while scrubbing PII.
        """
        anon_hash = hashlib.sha256(f"{profile.user_id}-{profile.email}".encode()).hexdigest()[:8]
        return DataSubjectProfile(
            user_id=profile.user_id,
            tenant_id=profile.tenant_id,
            full_name=f"Anonymized User {anon_hash}",
            email=f"anonymized_{anon_hash}@privacy.nairabooks.internal",
            phone_number=None,
            role=profile.role,
            created_at=profile.created_at,
            is_anonymized=True,
        )

    @classmethod
    def is_within_cama_statutory_retention(
        cls, transaction_date: date, as_of: date | None = None
    ) -> bool:
        """CAMA 2020 Sec 374 requires books of accounts to be kept for 6 years."""
        ref_date = as_of or date.today()
        diff_years = ref_date.year - transaction_date.year
        if (ref_date.month, ref_date.day) < (transaction_date.month, transaction_date.day):
            diff_years -= 1
        return diff_years < CAMA_STATUTORY_RETENTION_YEARS
