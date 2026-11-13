"""Pure Bank/POS reconciliation matching and closing FX revaluation calculations."""

from __future__ import annotations

from collections.abc import Sequence
from dataclasses import dataclass
from datetime import date
from decimal import ROUND_HALF_UP, Decimal
from enum import StrEnum
from typing import Literal
from uuid import UUID

from nairabooks.ledger.domain.errors import ValidationError
from nairabooks.ledger.domain.models import (
    ChartOfAccount,
    JournalVoucher,
    VoucherStatus,
)
from nairabooks.ledger.domain.money import (
    MONEY_QUANTUM,
    RATE_QUANTUM,
    ZERO_MONEY,
    CurrencyCode,
    MoneyInput,
    parse_decimal,
)


class ReconciliationStatus(StrEnum):
    """Status of a matched bank/POS statement line against GL cash movement."""

    MATCHED_EXACT = "MATCHED_EXACT"
    MATCHED_FEE_ADJUSTED = "MATCHED_FEE_ADJUSTED"


@dataclass(frozen=True, slots=True)
class BankStatementLine:
    """Imported Nigerian bank, NIP, or POS settlement statement line."""

    line_id: str
    value_date: date
    amount_ngn: Decimal
    direction: Literal["CREDIT", "DEBIT"]
    channel: str
    reference: str
    fee_ngn: Decimal = ZERO_MONEY

    def __post_init__(self) -> None:
        if not self.line_id.strip():
            raise ValidationError("Statement line_id cannot be blank.", field="lineId")
        if self.amount_ngn <= ZERO_MONEY:
            raise ValidationError("Statement amount_ngn must be positive.", field="amountNgn")
        if self.fee_ngn < ZERO_MONEY:
            raise ValidationError("Statement fee_ngn cannot be negative.", field="feeNgn")

    @property
    def gross_amount_ngn(self) -> Decimal:
        """Gross pre-fee amount (applicable to POS settlements settled net of MDR)."""
        return (self.amount_ngn + self.fee_ngn).quantize(MONEY_QUANTUM, rounding=ROUND_HALF_UP)


@dataclass(frozen=True, slots=True)
class LedgerCashMovement:
    """Flattened cash-side journal line eligible for bank reconciliation."""

    voucher_id: UUID
    voucher_number: str
    posting_date: date
    reference: str
    direction: Literal["CREDIT", "DEBIT"]
    amount_ngn: Decimal


@dataclass(frozen=True, slots=True)
class ReconciliationMatch:
    """Matched pairing between an external bank/POS line and a GL cash movement."""

    statement_line_id: str
    voucher_id: UUID
    voucher_number: str
    status: ReconciliationStatus
    matched_amount_ngn: Decimal
    fee_variance_ngn: Decimal


@dataclass(frozen=True, slots=True)
class BankReconciliationReport:
    """Outcome summary of reconciling imported bank/POS lines against cash GL."""

    account_id: UUID
    account_code: str
    account_name: str
    matched_count: int
    matches: tuple[ReconciliationMatch, ...]
    unmatched_statement_lines: tuple[BankStatementLine, ...]
    unmatched_ledger_lines: tuple[LedgerCashMovement, ...]
    statement_net_ngn: Decimal
    ledger_net_ngn: Decimal
    reconciliation_difference_ngn: Decimal


@dataclass(frozen=True, slots=True)
class FxRevaluationReport:
    """Unrealized gain/loss calculation revaluing an FX monetary balance to CBN closing rate."""

    account_id: UUID
    account_code: str
    account_name: str
    currency: CurrencyCode
    as_of_date: str
    foreign_balance: Decimal
    carrying_ngn: Decimal
    closing_rate_to_ngn: Decimal
    revalued_ngn: Decimal
    unrealized_gain_loss_ngn: Decimal
    is_gain: bool


def _extract_cash_movements(
    *,
    account_id: UUID,
    vouchers: Sequence[JournalVoucher],
    through_date: date | None,
) -> list[LedgerCashMovement]:
    movements: list[LedgerCashMovement] = []
    for voucher in sorted(vouchers, key=lambda v: (v.posting_date, v.voucher_number)):
        if voucher.status is not VoucherStatus.POSTED:
            continue
        if through_date is not None and voucher.posting_date > through_date:
            continue
        for line in voucher.lines:
            if line.account_id != account_id:
                continue
            if line.debit.functional_amount_ngn > ZERO_MONEY:
                movements.append(
                    LedgerCashMovement(
                        voucher_id=voucher.id,
                        voucher_number=voucher.voucher_number,
                        posting_date=voucher.posting_date,
                        reference=voucher.reference,
                        direction="CREDIT",  # Debit to bank asset corresponds to bank CREDIT
                        amount_ngn=line.debit.functional_amount_ngn,
                    )
                )
            elif line.credit.functional_amount_ngn > ZERO_MONEY:
                movements.append(
                    LedgerCashMovement(
                        voucher_id=voucher.id,
                        voucher_number=voucher.voucher_number,
                        posting_date=voucher.posting_date,
                        reference=voucher.reference,
                        direction="DEBIT",  # Credit to bank asset corresponds to bank DEBIT
                        amount_ngn=line.credit.functional_amount_ngn,
                    )
                )
    return movements


def _pick_candidate(
    *,
    stmt: BankStatementLine,
    ledger_movements: Sequence[LedgerCashMovement],
    used_indices: set[int],
    max_date_delta_days: int,
) -> tuple[int, ReconciliationStatus, Decimal] | None:
    best_exact: tuple[int, int] | None = None  # (date_delta, idx)
    best_fee: tuple[int, int] | None = None

    for idx, mv in enumerate(ledger_movements):
        if idx in used_indices or mv.direction != stmt.direction:
            continue
        delta = abs((stmt.value_date - mv.posting_date).days)
        if delta > max_date_delta_days:
            continue

        if mv.amount_ngn == stmt.amount_ngn:
            score = (delta, idx)
            if best_exact is None or score < best_exact:
                best_exact = score
        elif stmt.fee_ngn > ZERO_MONEY and mv.amount_ngn == stmt.gross_amount_ngn:
            score = (delta, idx)
            if best_fee is None or score < best_fee:
                best_fee = score

    if best_exact is not None:
        idx = best_exact[1]
        return idx, ReconciliationStatus.MATCHED_EXACT, ZERO_MONEY
    if best_fee is not None:
        idx = best_fee[1]
        return idx, ReconciliationStatus.MATCHED_FEE_ADJUSTED, stmt.fee_ngn
    return None


def reconcile_bank_statement(
    *,
    account: ChartOfAccount,
    statement_lines: Sequence[BankStatementLine],
    vouchers: Sequence[JournalVoucher],
    through_date: date | None = None,
    max_date_delta_days: int = 3,
) -> BankReconciliationReport:
    """Match imported Nigerian NIP/POS/bank statement lines 1-to-1 against GL movements."""
    if max_date_delta_days < 0:
        raise ValidationError("max_date_delta_days cannot be negative.", field="maxDateDeltaDays")

    ledger_movements = _extract_cash_movements(
        account_id=account.id,
        vouchers=vouchers,
        through_date=through_date,
    )
    used_indices: set[int] = set()
    matches: list[ReconciliationMatch] = []
    unmatched_stmt: list[BankStatementLine] = []

    for stmt in statement_lines:
        candidate = _pick_candidate(
            stmt=stmt,
            ledger_movements=ledger_movements,
            used_indices=used_indices,
            max_date_delta_days=max_date_delta_days,
        )
        if candidate is None:
            unmatched_stmt.append(stmt)
            continue
        idx, status, fee_var = candidate
        used_indices.add(idx)
        mv = ledger_movements[idx]
        matches.append(
            ReconciliationMatch(
                statement_line_id=stmt.line_id,
                voucher_id=mv.voucher_id,
                voucher_number=mv.voucher_number,
                status=status,
                matched_amount_ngn=stmt.amount_ngn,
                fee_variance_ngn=fee_var,
            )
        )

    unmatched_ledger = [
        mv for idx, mv in enumerate(ledger_movements) if idx not in used_indices
    ]

    stmt_net = sum(
        (s.amount_ngn if s.direction == "CREDIT" else -s.amount_ngn for s in statement_lines),
        start=ZERO_MONEY,
    )
    ledger_net = sum(
        (m.amount_ngn if m.direction == "CREDIT" else -m.amount_ngn for m in ledger_movements),
        start=ZERO_MONEY,
    )

    return BankReconciliationReport(
        account_id=account.id,
        account_code=account.code,
        account_name=account.name,
        matched_count=len(matches),
        matches=tuple(matches),
        unmatched_statement_lines=tuple(unmatched_stmt),
        unmatched_ledger_lines=tuple(unmatched_ledger),
        statement_net_ngn=stmt_net,
        ledger_net_ngn=ledger_net,
        reconciliation_difference_ngn=ledger_net - stmt_net,
    )


def compute_fx_revaluation(
    *,
    account: ChartOfAccount,
    currency: CurrencyCode,
    closing_rate_to_ngn: MoneyInput,
    as_of_date: date,
    vouchers: Sequence[JournalVoucher],
) -> FxRevaluationReport:
    """Compute IAS 21 closing FX revaluation against functional NGN carrying balance."""
    if currency is CurrencyCode.NGN:
        raise ValidationError(
            "FX revaluation applies only to non-NGN foreign currencies.",
            field="currency",
        )

    closing_rate = parse_decimal(
        closing_rate_to_ngn,
        quantum=RATE_QUANTUM,
        field="closingRateToNgn",
    )
    if closing_rate <= Decimal("0"):
        raise ValidationError(
            "Closing exchange rate must be strictly positive.",
            field="closingRateToNgn",
        )

    foreign_balance = ZERO_MONEY
    carrying_ngn = ZERO_MONEY

    for voucher in vouchers:
        if voucher.status not in (VoucherStatus.POSTED, VoucherStatus.REVERSED):
            continue
        if voucher.posting_date > as_of_date:
            continue
        for line in voucher.lines:
            if line.account_id != account.id:
                continue
            if line.debit.currency is currency and line.debit.amount > ZERO_MONEY:
                foreign_balance += line.debit.amount
                carrying_ngn += line.debit.functional_amount_ngn
            elif line.credit.currency is currency and line.credit.amount > ZERO_MONEY:
                foreign_balance -= line.credit.amount
                carrying_ngn -= line.credit.functional_amount_ngn

    revalued_ngn = (foreign_balance * closing_rate).quantize(
        MONEY_QUANTUM, rounding=ROUND_HALF_UP
    )
    diff = revalued_ngn - carrying_ngn

    return FxRevaluationReport(
        account_id=account.id,
        account_code=account.code,
        account_name=account.name,
        currency=currency,
        as_of_date=as_of_date.isoformat(),
        foreign_balance=foreign_balance,
        carrying_ngn=carrying_ngn,
        closing_rate_to_ngn=closing_rate,
        revalued_ngn=revalued_ngn,
        unrealized_gain_loss_ngn=diff,
        is_gain=(diff >= ZERO_MONEY),
    )
