"""Domain exports for NairaBooks audit & CAMA Sec 405 bounded context."""

from nairabooks.audit.domain.errors import ImmutableAuditLogError
from nairabooks.audit.domain.models import (
    GENESIS_HASH,
    AuditChainVerificationResult,
    AuditEvent,
    CamaSec405Certification,
    ProfessionalBody,
    compute_event_hash,
    compute_payload_hash,
    verify_audit_chain,
)

__all__ = [
    "AuditChainVerificationResult",
    "AuditEvent",
    "CamaSec405Certification",
    "GENESIS_HASH",
    "ImmutableAuditLogError",
    "ProfessionalBody",
    "compute_event_hash",
    "compute_payload_hash",
    "verify_audit_chain",
]
