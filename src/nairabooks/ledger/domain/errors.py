"""Typed domain errors for the NairaBooks IFRS ledger bounded context."""

from __future__ import annotations

from decimal import Decimal
from uuid import UUID


class LedgerDomainError(Exception):
    """Base error for all ledger invariant and boundary violations."""

    code: str = "LEDGER_ERROR"

    def __init__(self, message: str, *, code: str | None = None) -> None:
        super().__init__(message)
        self.message = message
        if code is not None:
            self.code = code


class ValidationError(LedgerDomainError):
    """Raised when an input value violates structural or domain validation."""

    code = "VALIDATION_ERROR"

    def __init__(self, message: str, *, field: str | None = None) -> None:
        super().__init__(message)
        self.field = field


class UnbalancedJournalError(LedgerDomainError):
    """Raised when a journal voucher's functional NGN debits and credits do not match."""

    code = "UNBALANCED_JOURNAL"

    def __init__(
        self,
        total_debit_ngn: Decimal,
        total_credit_ngn: Decimal,
        *,
        message: str | None = None,
    ) -> None:
        msg = message or (
            f"Journal voucher is out of balance: debit NGN {total_debit_ngn} != "
            f"credit NGN {total_credit_ngn}."
        )
        super().__init__(msg)
        self.total_debit_ngn = total_debit_ngn
        self.total_credit_ngn = total_credit_ngn


class ClosedPeriodError(LedgerDomainError):
    """Raised when posting or reversing targets a soft-locked or closed fiscal period."""

    code = "CLOSED_PERIOD"

    def __init__(
        self,
        period_label: str,
        period_status: str,
        *,
        message: str | None = None,
    ) -> None:
        msg = message or (
            f"Fiscal period '{period_label}' is {period_status} and does not accept postings."
        )
        super().__init__(msg)
        self.period_label = period_label
        self.period_status = period_status


class CrossTenantAccessError(LedgerDomainError):
    """Raised when a workspace tenant boundary is violated."""

    code = "CROSS_TENANT_ACCESS"

    def __init__(self, message: str = "Resource does not belong to the active workspace.") -> None:
        super().__init__(message)


class SegregationOfDutiesError(LedgerDomainError):
    """Raised when a voucher preparer attempts to self-approve or approve when disallowed."""

    code = "SEGREGATION_OF_DUTIES"

    def __init__(
        self,
        message: str = "Segregation of duties violation: approver must differ from preparer.",
    ) -> None:
        super().__init__(message)


class ImmutableVoucherError(LedgerDomainError):
    """Raised when attempting to modify, delete, or double-reverse an immutable voucher."""

    code = "IMMUTABLE_VOUCHER"

    def __init__(
        self,
        voucher_id: UUID,
        voucher_status: str,
        *,
        message: str | None = None,
    ) -> None:
        msg = message or (
            f"Voucher {voucher_id} is {voucher_status} and cannot be mutated or reversed again."
        )
        super().__init__(msg)
        self.voucher_id = voucher_id
        self.voucher_status = voucher_status
