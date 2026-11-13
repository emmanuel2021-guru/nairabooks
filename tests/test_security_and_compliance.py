"""Automated security, SAST, privacy, and regulatory compliance tests.

Verifies:
- Privacy by design: DSAR export and user anonymization (NDPA 2023 / GDPR).
- CAMA 2020 6-year statutory retention logic.
- SAST scanner execution returning zero vulnerabilities.
- Compliance checker audit validating statutory controls.
"""

from __future__ import annotations

from datetime import date

from scripts.compliance_check import run_compliance_audit
from scripts.run_sast_scan import run_sast_scan

from nairabooks.compliance.privacy import (
    CAMA_STATUTORY_RETENTION_YEARS,
    DataSubjectProfile,
    PrivacyComplianceManager,
)


def test_dsar_export_bundle_contains_statutory_and_profile_data() -> None:
    profile = DataSubjectProfile(
        user_id="usr-cfo-101",
        tenant_id="ws-eko-hotel",
        full_name="Babatunde Adeleke",
        email="b.adeleke@ekohotel.ng",
        phone_number="+2348030001122",
        role="CHARTERED_ACCOUNTANT_CFO",
        created_at="2026-01-15T09:00:00Z",
    )
    activities = [
        {"action": "CERTIFY_CAMA_SEC_405", "period": "2026-01", "timestamp": "2026-02-01T10:00:00Z"}
    ]

    bundle = PrivacyComplianceManager.export_dsar_bundle(profile, activities)

    assert bundle.export_id.startswith("DSAR-ws-eko")
    assert bundle.user_profile["fullName"] == "Babatunde Adeleke"
    assert bundle.user_profile["email"] == "b.adeleke@ekohotel.ng"
    assert bundle.audit_activity_count == 1
    assert "CAMA" in bundle.statutory_retention_notice
    assert "Section 374" in bundle.statutory_retention_notice


def test_user_anonymization_scrubs_pii_cleanly() -> None:
    profile = DataSubjectProfile(
        user_id="usr-cashier-05",
        tenant_id="ws-diner-ikeja",
        full_name="Chidinma Okafor",
        email="chidinma@dinerikeja.ng",
        phone_number="+2348123456789",
        role="BRANCH_OUTLET_CASHIER",
        created_at="2026-03-01T08:00:00Z",
    )

    anon = PrivacyComplianceManager.anonymize_user(profile)

    assert anon.user_id == "usr-cashier-05"
    assert anon.is_anonymized is True
    assert "Chidinma" not in anon.full_name
    assert "Anonymized User" in anon.full_name
    assert "chidinma@dinerikeja.ng" not in anon.email
    assert anon.phone_number is None


def test_cama_statutory_retention_fence_calculation() -> None:
    as_of = date(2026, 11, 12)

    # 2 years ago (2024) -> Protected under CAMA 6-year lock
    recent_entry = date(2024, 6, 1)
    retention_check_recent = PrivacyComplianceManager.is_within_cama_statutory_retention(
        recent_entry, as_of
    )
    assert retention_check_recent is True

    # 5 years ago (2021) -> Still within CAMA 6-year lock
    five_years_ago = date(2021, 1, 15)
    retention_check_five = PrivacyComplianceManager.is_within_cama_statutory_retention(
        five_years_ago, as_of
    )
    assert retention_check_five is True

    # 7 years ago (2019) -> Exceeds CAMA 6-year retention period
    seven_years_ago = date(2019, 1, 1)
    retention_check_seven = PrivacyComplianceManager.is_within_cama_statutory_retention(
        seven_years_ago, as_of
    )
    assert retention_check_seven is False
    assert CAMA_STATUTORY_RETENTION_YEARS == 6


def test_sast_scanner_detects_zero_critical_or_high_vulnerabilities() -> None:
    critical_high_count, findings = run_sast_scan()
    assert critical_high_count == 0, f"Expected 0 critical/high findings, got {critical_high_count}"
    assert len(findings) == 0


def test_compliance_checker_verifies_all_statutory_gates() -> None:
    result = run_compliance_audit()
    assert result == 0, "Compliance audit should return 0 (all pillars passing)"
