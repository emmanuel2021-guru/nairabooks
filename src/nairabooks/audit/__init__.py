"""NairaBooks immutable hash-chained audit trail & CAMA 2020 Sec 405 bounded context."""

from nairabooks.audit.adapters import InMemoryAuditStore, PostgresAuditSqlBuilder
from nairabooks.audit.application import (
    AuditEventConnection,
    AuditEventEdge,
    AuditStore,
    CertifyCamaSec405Command,
    CertifyCamaSec405UseCase,
    ListAuditEventsUseCase,
    RecordAuditEventCommand,
    RecordAuditEventUseCase,
    VerifyAuditChainUseCase,
)
from nairabooks.audit.domain import (
    GENESIS_HASH,
    AuditChainVerificationResult,
    AuditEvent,
    CamaSec405Certification,
    ImmutableAuditLogError,
    ProfessionalBody,
    compute_event_hash,
    compute_payload_hash,
    verify_audit_chain,
)

__all__ = [
    "AuditChainVerificationResult",
    "AuditEvent",
    "AuditEventConnection",
    "AuditEventEdge",
    "AuditStore",
    "CamaSec405Certification",
    "CertifyCamaSec405Command",
    "CertifyCamaSec405UseCase",
    "GENESIS_HASH",
    "ImmutableAuditLogError",
    "InMemoryAuditStore",
    "ListAuditEventsUseCase",
    "PostgresAuditSqlBuilder",
    "ProfessionalBody",
    "RecordAuditEventCommand",
    "RecordAuditEventUseCase",
    "VerifyAuditChainUseCase",
    "compute_event_hash",
    "compute_payload_hash",
    "verify_audit_chain",
]
