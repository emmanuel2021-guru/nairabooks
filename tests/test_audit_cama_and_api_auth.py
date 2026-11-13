"""TDD tests for immutable hash-chained audit trail, CAMA Sec 405, and API auth/RBAC."""

from __future__ import annotations

import json
from typing import cast
from uuid import UUID, uuid4

import pytest

from nairabooks.api.app import LedgerApiApplication
from nairabooks.audit.adapters.in_memory import InMemoryAuditStore
from nairabooks.audit.application import (
    CertifyCamaSec405Command,
    CertifyCamaSec405UseCase,
    ListAuditEventsUseCase,
    RecordAuditEventCommand,
    RecordAuditEventUseCase,
    VerifyAuditChainUseCase,
)
from nairabooks.audit.domain import (
    GENESIS_HASH,
    ImmutableAuditLogError,
    ProfessionalBody,
    verify_audit_chain,
)
from nairabooks.auth.adapters.in_memory import create_seeded_demo_auth_store
from nairabooks.auth.domain import ActorRole, TokenService
from nairabooks.ledger.adapters.in_memory import create_seeded_demo_store
from nairabooks.ledger.domain import (
    ClosedPeriodError,
    PeriodStatus,
    SegregationOfDutiesError,
)


def _as_dict(value: object) -> dict[str, object]:
    assert isinstance(value, dict)
    return cast(dict[str, object], value)


def test_hash_chained_audit_log_immutability_and_tamper_detection() -> None:
    audit_store = InMemoryAuditStore()
    record_uc = RecordAuditEventUseCase(audit_store)
    verify_uc = VerifyAuditChainUseCase(audit_store)
    workspace_id = uuid4()
    actor_id = uuid4()

    ev1 = record_uc.execute(
        RecordAuditEventCommand(
            workspace_id=workspace_id,
            actor_user_id=actor_id,
            actor_role=ActorRole.OWNER_MANAGING_DIRECTOR,
            action="VOUCHER_POSTED",
            entity_type="JournalVoucher",
            entity_id=uuid4(),
            payload={"amount": "50000.00", "password": "MUST_BE_REDACTED"},
        )
    )
    ev2 = record_uc.execute(
        RecordAuditEventCommand(
            workspace_id=workspace_id,
            actor_user_id=actor_id,
            actor_role=ActorRole.CHARTERED_ACCOUNTANT_CFO,
            action="TAX_PROFILE_UPDATED",
            entity_type="NigerianTaxProfile",
            entity_id=uuid4(),
            payload={"annualTurnoverNgn": "85000000.00"},
        )
    )

    assert ev1.sequence_number == 1
    assert ev1.previous_event_hash == GENESIS_HASH
    assert len(ev1.payload_hash) == 64
    assert ev2.sequence_number == 2
    assert ev2.previous_event_hash == ev1.event_hash

    verification = verify_uc.execute(workspace_id=workspace_id)
    assert verification.is_valid is True
    assert verification.event_count == 2
    assert verification.latest_event_hash == ev2.event_hash

    # Unauthorized mutation or deletion is rejected by append-only store
    with pytest.raises(ImmutableAuditLogError):
        audit_store.update_event(workspace_id, ev1.id)
    with pytest.raises(ImmutableAuditLogError):
        audit_store.delete_event(workspace_id, ev1.id)

    # Tampered event detected deterministically by chain verifier
    from dataclasses import replace

    tampered_ev1 = replace(ev1, payload_hash="f" * 64)
    tampered_check = verify_audit_chain([tampered_ev1, ev2])
    assert tampered_check.is_valid is False
    assert tampered_check.broken_at_sequence == 1


def test_cama_sec405_certification_sod_and_period_lock() -> None:
    workspace_id = UUID("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0001")
    owner_id = UUID("bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbb0001")
    cfo_id = UUID("bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbb0002")

    ledger_store = create_seeded_demo_store(workspace_id=workspace_id, actor_user_id=owner_id)
    audit_store = InMemoryAuditStore()
    certify_uc = CertifyCamaSec405UseCase(ledger_store=ledger_store, audit_store=audit_store)

    fy2026 = next(p for p in ledger_store.list_periods(workspace_id) if p.label == "FY2026")

    # Segregation of Duties: preparer cannot self-certify when dual-control is active
    with pytest.raises(SegregationOfDutiesError):
        certify_uc.execute(
            CertifyCamaSec405Command(
                workspace_id=workspace_id,
                fiscal_period_id=fy2026.id,
                certified_by_user_id=owner_id,
                certified_by_role=ActorRole.OWNER_MANAGING_DIRECTOR,
                certified_by_name="Chief Adewale Okonkwo",
                professional_body=ProfessionalBody.DIRECTOR_CAMA,
                frc_reg_number="FRC/2026/009100",
                prepared_by_user_id=owner_id,
            )
        )

    # CFO (distinct from preparer) certifies FY2026 under CAMA Sec 405
    period, cert = certify_uc.execute(
        CertifyCamaSec405Command(
            workspace_id=workspace_id,
            fiscal_period_id=fy2026.id,
            certified_by_user_id=cfo_id,
            certified_by_role=ActorRole.CHARTERED_ACCOUNTANT_CFO,
            certified_by_name="Adaeze Nwosu, FCA",
            professional_body=ProfessionalBody.ICAN,
            frc_reg_number="FRC/2026/ICAN/44120",
            prepared_by_user_id=owner_id,
        )
    )
    assert period.status is PeriodStatus.CLOSED_CAMA_CERTIFIED
    assert period.cama_certification == "FRC/2026/ICAN/44120"
    assert len(cert.statement_snapshot_hash) == 64

    # Re-certifying an already closed period raises ClosedPeriodError
    with pytest.raises(ClosedPeriodError):
        certify_uc.execute(
            CertifyCamaSec405Command(
                workspace_id=workspace_id,
                fiscal_period_id=fy2026.id,
                certified_by_user_id=cfo_id,
                certified_by_role=ActorRole.CHARTERED_ACCOUNTANT_CFO,
                certified_by_name="Adaeze Nwosu, FCA",
                professional_body=ProfessionalBody.ICAN,
                frc_reg_number="FRC/2026/ICAN/99999",
                prepared_by_user_id=owner_id,
            )
        )

    events = ListAuditEventsUseCase(audit_store).execute(workspace_id=workspace_id)
    assert events.total_count == 1
    assert events.edges[0].node.action == "CAMA_SEC405_CERTIFIED"


def test_api_auth_rbac_spoof_rejection_and_audit_trail_roundtrip() -> None:
    auth_store, seeded = create_seeded_demo_auth_store()
    ledger_store = create_seeded_demo_store(
        workspace_id=seeded.primary_workspace_id,
        actor_user_id=seeded.owner_user_id,
    )
    audit_store = InMemoryAuditStore()
    token_service = TokenService(secret="api-auth-test-secret-32-bytes-minimum")
    app = LedgerApiApplication(
        ledger_store,
        auth_store=auth_store,
        audit_store=audit_store,
        token_service=token_service,
        require_auth=True,
    )

    # Unauthenticated request denied with 401
    unauth_status, unauth_body = app.handle_request(
        method="GET",
        path="/api/v1/ledger/accounts",
        headers={},
        body=b"",
    )
    assert unauth_status == 401
    assert unauth_body["code"] == "UNAUTHENTICATED"

    # Login as External Auditor (Read-Only)
    auditor_login_status, auditor_login = app.handle_request(
        method="POST",
        path="/api/v1/auth/login",
        headers={},
        body=json.dumps(
            {
                "email": "auditor@icanaudit.ng",
                "password": "NairaBooks#2026",
            }
        ).encode("utf-8"),
    )
    assert auditor_login_status == 200
    auditor_token = str(auditor_login["accessToken"])
    auditor_headers = {"Authorization": f"Bearer {auditor_token}"}

    # Spoofed X-Workspace-Id header must trigger CrossTenantAccessError (403)
    spoof_status, spoof_body = app.handle_request(
        method="GET",
        path="/api/v1/ledger/accounts",
        headers={
            "Authorization": f"Bearer {auditor_token}",
            "X-Workspace-Id": str(seeded.secondary_workspace_id),
        },
        body=b"",
    )
    assert spoof_status == 403
    assert spoof_body["__typename"] == "CrossTenantAccessError"

    # Auditor CAN read FRCN reports and audit log
    frcn_status, _ = app.handle_request(
        method="GET",
        path="/api/v1/ledger/reports/frcn?fiscalPeriodId=22222222-2222-4222-8222-222222220002",
        headers=auditor_headers,
        body=b"",
    )
    assert frcn_status == 200

    # Auditor CANNOT post journal voucher (403 Forbidden)
    post_body = json.dumps(
        {
            "idempotencyKey": str(uuid4()),
            "postingDate": "2026-04-10",
            "reference": "AUD-DENY-01",
            "sourceModule": "GENERAL_LEDGER",
            "lines": [
                {
                    "accountId": "11111111-1111-4111-8111-111111110101",
                    "debitAmount": "1000.00",
                    "creditAmount": "0.00",
                    "currency": "NGN",
                    "exchangeRateToNgn": "1.000000",
                },
                {
                    "accountId": "11111111-1111-4111-8111-111111110401",
                    "debitAmount": "0.00",
                    "creditAmount": "1000.00",
                    "currency": "NGN",
                    "exchangeRateToNgn": "1.000000",
                },
            ],
        }
    ).encode("utf-8")
    auditor_post_status, auditor_post_body = app.handle_request(
        method="POST",
        path="/api/v1/ledger/vouchers",
        headers=auditor_headers,
        body=post_body,
    )
    assert auditor_post_status == 403
    assert auditor_post_body["code"] == "FORBIDDEN"

    # Login as Bookkeeper / Clerk: CAN post voucher, CANNOT certify CAMA Sec 405
    _, clerk_login = app.handle_request(
        method="POST",
        path="/api/v1/auth/login",
        headers={},
        body=json.dumps({"email": "clerk@lagostrading.ng", "password": "NairaBooks#2026"}).encode(
            "utf-8"
        ),
    )
    clerk_headers = {"Authorization": f"Bearer {clerk_login['accessToken']}"}

    clerk_post_status, _ = app.handle_request(
        method="POST",
        path="/api/v1/ledger/vouchers",
        headers=clerk_headers,
        body=post_body,
    )
    assert clerk_post_status == 201

    clerk_cama_status, _ = app.handle_request(
        method="POST",
        path="/api/v1/audit/cama-certifications",
        headers=clerk_headers,
        body=json.dumps(
            {
                "fiscalPeriodId": "22222222-2222-4222-8222-222222220002",
                "certifiedByName": "Clerk Try",
                "professionalBody": "ICAN",
                "frcRegNumber": "FRC/2026/00001",
            }
        ).encode("utf-8"),
    )
    assert clerk_cama_status == 403

    # Login as CFO: certify FY2026 via GraphQL certifyCamaSec405
    _, cfo_login = app.handle_request(
        method="POST",
        path="/api/v1/auth/login",
        headers={},
        body=json.dumps({"email": "cfo@lagostrading.ng", "password": "NairaBooks#2026"}).encode(
            "utf-8"
        ),
    )
    cfo_headers = {"Authorization": f"Bearer {cfo_login['accessToken']}"}
    cama_gql_status, cama_gql = app.handle_request(
        method="POST",
        path="/graphql",
        headers=cfo_headers,
        body=json.dumps(
            {
                "operationName": "CertifyCamaSec405",
                "query": (
                    "mutation CertifyCamaSec405($input: CertifyCamaSec405Input!) { "
                    "certifyCamaSec405(input: $input) { __typename } }"
                ),
                "variables": {
                    "input": {
                        "fiscalPeriodId": "22222222-2222-4222-8222-222222220002",
                        "certifiedByName": "Adaeze Nwosu, FCA",
                        "professionalBody": "ICAN",
                        "frcRegNumber": "FRC/2026/ICAN/44120",
                    }
                },
            }
        ).encode("utf-8"),
    )
    assert cama_gql_status == 200
    assert _as_dict(_as_dict(cama_gql["data"])["certifyCamaSec405"])["status"] == (
        "CLOSED_CAMA_CERTIFIED"
    )

    # Auditor reads immutable audit events & verifies hash chain integrity
    audit_status, audit_body = app.handle_request(
        method="GET",
        path="/api/v1/audit/events?first=20",
        headers=auditor_headers,
        body=b"",
    )
    assert audit_status == 200
    assert cast(int, audit_body["totalCount"]) >= 4

    verify_status, verify_body = app.handle_request(
        method="GET",
        path="/api/v1/audit/verify",
        headers=auditor_headers,
        body=b"",
    )
    assert verify_status == 200
    assert verify_body["isValid"] is True
