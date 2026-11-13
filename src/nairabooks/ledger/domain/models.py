"""Pure double-entry journal domain models and invariants."""

from __future__ import annotations

from collections.abc import Sequence
from dataclasses import dataclass, replace
from datetime import UTC, date, datetime
from decimal import Decimal
from enum import StrEnum
from uuid import UUID, uuid4

from nairabooks.ledger.domain.errors import (
    ClosedPeriodError,
    ImmutableVoucherError,
    SegregationOfDutiesError,
    UnbalancedJournalError,
    ValidationError,
)
from nairabooks.ledger.domain.money import (
    UNITY_RATE,
    ZERO_MONEY,
    CurrencyCode,
    Money,
    MoneyInput,
)


class AccountCategory(StrEnum):
    """IFRS-aligned chart of accounts classifications."""

    ASSET = "ASSET"
    LIABILITY = "LIABILITY"
    EQUITY = "EQUITY"
    REVENUE = "REVENUE"
    EXPENSE = "EXPENSE"
    RESTRICTED_FUND = "RESTRICTED_FUND"


class PeriodStatus(StrEnum):
    """Fiscal period lock lifecycle matching SQL and GraphQL enums."""

    OPEN = "OPEN"
    SOFT_LOCKED = "SOFT_LOCKED"
    CLOSED_CAMA_CERTIFIED = "CLOSED_CAMA_CERTIFIED"


@dataclass(frozen=True, slots=True)
class ChartOfAccount:
    """Tenant-scoped general ledger account tagged for IFRS statements."""

    id: UUID
    workspace_id: UUID
    code: str
    name: str
    category: AccountCategory
    ifrs_tag: str
    source_primitive: str
    is_system_locked: bool
    is_active: bool = True

    def __post_init__(self) -> None:
        if not self.code.strip():
            raise ValidationError("Account code cannot be blank.", field="code")
        if not self.name.strip():
            raise ValidationError("Account name cannot be blank.", field="name")
        if not self.ifrs_tag.strip():
            raise ValidationError("Account ifrs_tag cannot be blank.", field="ifrs_tag")


@dataclass(frozen=True, slots=True)
class FiscalPeriod:
    """Workspace fiscal period enforcing posting window and lock status."""

    id: UUID
    workspace_id: UUID
    label: str
    start_date: date
    end_date: date
    status: PeriodStatus
    cama_certification: str | None = None

    def __post_init__(self) -> None:
        if not self.label.strip():
            raise ValidationError("Fiscal period label cannot be blank.", field="label")
        if self.start_date > self.end_date:
            raise ValidationError(
                "Fiscal period start_date cannot exceed end_date.",
                field="start_date",
            )

    def contains(self, posting_date: date) -> bool:
        """Return True when posting_date falls within [start_date, end_date]."""
        return self.start_date <= posting_date <= self.end_date

    def ensure_accepts_posting(self, posting_date: date) -> None:
        """Guard against posting into closed/soft-locked periods or out-of-range dates."""
        if not self.contains(posting_date):
            raise ValidationError(
                f"Posting date {posting_date.isoformat()} falls outside period '{self.label}'.",
                field="posting_date",
            )
        if self.status is not PeriodStatus.OPEN:
            raise ClosedPeriodError(self.label, self.status.value)

    def close_cama_certified(self, frc_reg_number: str) -> FiscalPeriod:
        """Transition an OPEN/SOFT_LOCKED period to CLOSED_CAMA_CERTIFIED."""
        if self.status is PeriodStatus.CLOSED_CAMA_CERTIFIED:
            raise ClosedPeriodError(
                self.label,
                self.status.value,
                message=f"Fiscal period '{self.label}' is already CAMA-certified and closed.",
            )
        clean_reg = frc_reg_number.strip()
        if len(clean_reg) < 3 or len(clean_reg) > 40:
            raise ValidationError(
                "FRC/ICAN/ANAN registration number must be 3 to 40 characters.",
                field="frcRegNumber",
            )
        return replace(
            self,
            status=PeriodStatus.CLOSED_CAMA_CERTIFIED,
            cama_certification=clean_reg,
        )


class VoucherStatus(StrEnum):
    """Lifecycle status of a double-entry journal voucher."""

    DRAFT = "DRAFT"
    POSTED = "POSTED"
    REVERSED = "REVERSED"


@dataclass(frozen=True, slots=True)
class JournalLineInput:
    """Validated single-sided journal entry line command prior to posting."""

    account_id: UUID
    debit_amount: MoneyInput = ZERO_MONEY
    credit_amount: MoneyInput = ZERO_MONEY
    currency: CurrencyCode = CurrencyCode.NGN
    exchange_rate_to_ngn: MoneyInput = UNITY_RATE
    fund_or_department_code: str | None = None
    project_or_site_code: str | None = None
    memo: str | None = None

    def __post_init__(self) -> None:
        self.to_line_money()

    def to_line_money(self) -> tuple[Money, Money]:
        """Validate single-sided positive posting rule and convert to debit/credit Money."""
        rate = UNITY_RATE if self.currency is CurrencyCode.NGN else self.exchange_rate_to_ngn
        debit = Money.of(
            self.debit_amount,
            currency=self.currency,
            exchange_rate_to_ngn=rate,
            field_prefix="debit_amount",
        )
        credit = Money.of(
            self.credit_amount,
            currency=self.currency,
            exchange_rate_to_ngn=rate,
            field_prefix="credit_amount",
        )

        debit_pos = debit.is_positive()
        credit_pos = credit.is_positive()
        if debit_pos == credit_pos:
            raise ValidationError(
                "Each journal line must have strictly one positive side (debit OR credit > 0).",
                field="lines",
            )
        return debit, credit


@dataclass(frozen=True, slots=True)
class JournalLine:
    """Immutable posted double-entry journal line."""

    id: UUID
    line_number: int
    account_id: UUID
    account_code: str
    account_name: str
    debit: Money
    credit: Money
    fund_or_department_code: str | None = None
    project_or_site_code: str | None = None
    memo: str | None = None


@dataclass(frozen=True, slots=True)
class JournalVoucher:
    """Immutable double-entry journal voucher guaranteeing Debits == Credits in NGN."""

    id: UUID
    workspace_id: UUID
    fiscal_period_id: UUID
    idempotency_key: UUID
    voucher_number: str
    posting_date: date
    status: VoucherStatus
    reference: str
    source_module: str
    lines: tuple[JournalLine, ...]
    total_debit_ngn: Decimal
    total_credit_ngn: Decimal
    created_by_user_id: UUID
    approved_by_user_id: UUID | None
    reversed_by_voucher_id: UUID | None
    created_at: datetime

    @classmethod
    def post(
        cls,
        *,
        workspace_id: UUID,
        fiscal_period_id: UUID,
        idempotency_key: UUID,
        voucher_number: str,
        posting_date: date,
        reference: str,
        source_module: str,
        created_by_user_id: UUID,
        lines: Sequence[tuple[UUID, str, str, JournalLineInput]],
        approved_by_user_id: UUID | None = None,
        voucher_id: UUID | None = None,
        created_at: datetime | None = None,
    ) -> JournalVoucher:
        """Validate double-entry invariants and construct a POSTED JournalVoucher."""
        clean_ref = reference.strip()
        if not clean_ref:
            raise ValidationError("Voucher reference cannot be blank.", field="reference")
        clean_source = source_module.strip()
        if not clean_source:
            raise ValidationError("Voucher source_module cannot be blank.", field="source_module")
        if len(lines) < 2:
            raise ValidationError(
                "A posted journal voucher requires at least two double-entry lines.",
                field="lines",
            )
        if approved_by_user_id is not None and approved_by_user_id == created_by_user_id:
            raise SegregationOfDutiesError()

        posted_lines: list[JournalLine] = []
        total_debit_ngn = ZERO_MONEY
        total_credit_ngn = ZERO_MONEY
        currencies_seen: set[CurrencyCode] = set()
        total_debit_txn = ZERO_MONEY
        total_credit_txn = ZERO_MONEY

        for idx, (account_id, account_code, account_name, line_input) in enumerate(lines, start=1):
            debit, credit = line_input.to_line_money()
            currencies_seen.add(line_input.currency)
            total_debit_ngn += debit.functional_amount_ngn
            total_credit_ngn += credit.functional_amount_ngn
            total_debit_txn += debit.amount
            total_credit_txn += credit.amount
            posted_lines.append(
                JournalLine(
                    id=uuid4(),
                    line_number=idx,
                    account_id=account_id,
                    account_code=account_code,
                    account_name=account_name,
                    debit=debit,
                    credit=credit,
                    fund_or_department_code=line_input.fund_or_department_code,
                    project_or_site_code=line_input.project_or_site_code,
                    memo=line_input.memo,
                )
            )

        if total_debit_ngn <= ZERO_MONEY or total_debit_ngn != total_credit_ngn:
            raise UnbalancedJournalError(total_debit_ngn, total_credit_ngn)

        if len(currencies_seen) == 1 and total_debit_txn != total_credit_txn:
            raise UnbalancedJournalError(
                total_debit_ngn,
                total_credit_ngn,
                message=(
                    f"Single-currency journal voucher transaction totals must balance: "
                    f"{total_debit_txn} != {total_credit_txn}."
                ),
            )

        return cls(
            id=voucher_id or uuid4(),
            workspace_id=workspace_id,
            fiscal_period_id=fiscal_period_id,
            idempotency_key=idempotency_key,
            voucher_number=voucher_number,
            posting_date=posting_date,
            status=VoucherStatus.POSTED,
            reference=clean_ref,
            source_module=clean_source,
            lines=tuple(posted_lines),
            total_debit_ngn=total_debit_ngn,
            total_credit_ngn=total_credit_ngn,
            created_by_user_id=created_by_user_id,
            approved_by_user_id=approved_by_user_id,
            reversed_by_voucher_id=None,
            created_at=created_at or datetime.now(UTC),
        )

    def build_reversal(
        self,
        *,
        fiscal_period_id: UUID,
        idempotency_key: UUID,
        voucher_number: str,
        reversal_date: date,
        reason: str,
        actor_user_id: UUID,
        created_at: datetime | None = None,
    ) -> JournalVoucher:
        """Create an offsetting balanced reversal voucher without altering original totals."""
        if self.status is not VoucherStatus.POSTED or self.reversed_by_voucher_id is not None:
            raise ImmutableVoucherError(self.id, self.status.value)
        clean_reason = reason.strip()
        if not clean_reason:
            raise ValidationError("Reversal reason cannot be blank.", field="reason")

        inverted_lines: list[tuple[UUID, str, str, JournalLineInput]] = []
        for line in self.lines:
            orig_debit_amt = line.debit.amount
            orig_credit_amt = line.credit.amount
            rate = (
                line.credit.exchange_rate_to_ngn
                if orig_credit_amt > ZERO_MONEY
                else line.debit.exchange_rate_to_ngn
            )
            currency = (
                line.credit.currency if orig_credit_amt > ZERO_MONEY else line.debit.currency
            )
            memo_prefix = f"Reversal ({clean_reason})"
            memo_text = f"{memo_prefix}: {line.memo}" if line.memo else memo_prefix
            inverted_lines.append(
                (
                    line.account_id,
                    line.account_code,
                    line.account_name,
                    JournalLineInput(
                        account_id=line.account_id,
                        debit_amount=orig_credit_amt,
                        credit_amount=orig_debit_amt,
                        currency=currency,
                        exchange_rate_to_ngn=rate,
                        fund_or_department_code=line.fund_or_department_code,
                        project_or_site_code=line.project_or_site_code,
                        memo=memo_text,
                    ),
                )
            )

        return JournalVoucher.post(
            workspace_id=self.workspace_id,
            fiscal_period_id=fiscal_period_id,
            idempotency_key=idempotency_key,
            voucher_number=voucher_number,
            posting_date=reversal_date,
            reference=f"REV-{self.voucher_number}",
            source_module="REVERSAL",
            created_by_user_id=actor_user_id,
            lines=inverted_lines,
            created_at=created_at,
        )

    def mark_reversed(self, reversal_voucher_id: UUID) -> JournalVoucher:
        """Transition a POSTED voucher to REVERSED with linkage to its offsetting voucher."""
        if self.status is not VoucherStatus.POSTED or self.reversed_by_voucher_id is not None:
            raise ImmutableVoucherError(self.id, self.status.value)
        return replace(
            self,
            status=VoucherStatus.REVERSED,
            reversed_by_voucher_id=reversal_voucher_id,
        )
