from __future__ import annotations

from datetime import date
from decimal import Decimal
from uuid import uuid4

import pytest

from nairabooks.ledger.domain import (
    CurrencyCode,
    JournalLineInput,
    JournalVoucher,
    Money,
    UnbalancedJournalError,
    ValidationError,
    VoucherStatus,
)


def test_money_quantizes_half_up_and_computes_functional_ngn() -> None:
    ngn = Money.of("15000.125", CurrencyCode.NGN)
    assert ngn.amount == Decimal("15000.13")
    assert ngn.currency is CurrencyCode.NGN
    assert ngn.exchange_rate_to_ngn == Decimal("1.000000")
    assert ngn.functional_amount_ngn == Decimal("15000.13")

    usd = Money.of("100.004", CurrencyCode.USD, exchange_rate_to_ngn="1625.5000005")
    assert usd.amount == Decimal("100.00")
    assert usd.exchange_rate_to_ngn == Decimal("1625.500001")
    assert usd.functional_amount_ngn == Decimal("162550.00")


def test_money_rejects_binary_float_and_invalid_rates() -> None:
    with pytest.raises(ValidationError):
        Money.of(100.5, CurrencyCode.NGN)  # type: ignore[arg-type]

    with pytest.raises(ValidationError):
        Money.of("100.00", CurrencyCode.USD, exchange_rate_to_ngn=1600.25)  # type: ignore[arg-type]

    with pytest.raises(ValidationError):
        Money.of("-1.00", CurrencyCode.NGN)

    with pytest.raises(ValidationError):
        Money.of("10.00", CurrencyCode.USD, exchange_rate_to_ngn="0")

    with pytest.raises(ValidationError):
        Money.of("10.00", CurrencyCode.NGN, exchange_rate_to_ngn="1.500000")


def test_journal_line_enforces_single_sided_positive_amount() -> None:
    acct_id = uuid4()

    with pytest.raises(ValidationError):
        JournalLineInput(
            account_id=acct_id,
            debit_amount=Decimal("0.00"),
            credit_amount=Decimal("0.00"),
            currency=CurrencyCode.NGN,
            exchange_rate_to_ngn=Decimal("1.000000"),
        )

    with pytest.raises(ValidationError):
        JournalLineInput(
            account_id=acct_id,
            debit_amount=Decimal("1000.00"),
            credit_amount=Decimal("1000.00"),
            currency=CurrencyCode.NGN,
            exchange_rate_to_ngn=Decimal("1.000000"),
        )


def test_balanced_voucher_posts_with_exact_ngn_totals() -> None:
    workspace_id = uuid4()
    actor_id = uuid4()
    period_id = uuid4()
    cash_id = uuid4()
    rev_id = uuid4()

    voucher = JournalVoucher.post(
        workspace_id=workspace_id,
        fiscal_period_id=period_id,
        idempotency_key=uuid4(),
        voucher_number="JV-2026-0001",
        posting_date=date(2026, 3, 15),
        reference="INV-001",
        source_module="GENERAL_LEDGER",
        created_by_user_id=actor_id,
        lines=[
            (
                cash_id,
                "1010",
                "Zenith Bank Current",
                JournalLineInput(
                    account_id=cash_id,
                    debit_amount=Decimal("53750.00"),
                    credit_amount=Decimal("0.00"),
                    currency=CurrencyCode.NGN,
                    exchange_rate_to_ngn=Decimal("1.000000"),
                    memo="Customer receipt",
                ),
            ),
            (
                rev_id,
                "4010",
                "Trading Revenue",
                JournalLineInput(
                    account_id=rev_id,
                    debit_amount=Decimal("0.00"),
                    credit_amount=Decimal("53750.00"),
                    currency=CurrencyCode.NGN,
                    exchange_rate_to_ngn=Decimal("1.000000"),
                    memo="Sales revenue",
                ),
            ),
        ],
    )

    assert voucher.status is VoucherStatus.POSTED
    assert voucher.total_debit_ngn == Decimal("53750.00")
    assert voucher.total_credit_ngn == Decimal("53750.00")
    assert len(voucher.lines) == 2


def test_unbalanced_or_single_line_voucher_is_rejected() -> None:
    workspace_id = uuid4()
    actor_id = uuid4()
    period_id = uuid4()
    cash_id = uuid4()
    rev_id = uuid4()

    with pytest.raises(ValidationError):
        JournalVoucher.post(
            workspace_id=workspace_id,
            fiscal_period_id=period_id,
            idempotency_key=uuid4(),
            voucher_number="JV-2026-0002",
            posting_date=date(2026, 3, 15),
            reference="BAD-1",
            source_module="GENERAL_LEDGER",
            created_by_user_id=actor_id,
            lines=[
                (
                    cash_id,
                    "1010",
                    "Cash",
                    JournalLineInput(
                        account_id=cash_id,
                        debit_amount=Decimal("100.00"),
                        credit_amount=Decimal("0.00"),
                    ),
                )
            ],
        )

    with pytest.raises(UnbalancedJournalError) as exc_info:
        JournalVoucher.post(
            workspace_id=workspace_id,
            fiscal_period_id=period_id,
            idempotency_key=uuid4(),
            voucher_number="JV-2026-0003",
            posting_date=date(2026, 3, 15),
            reference="BAD-2",
            source_module="GENERAL_LEDGER",
            created_by_user_id=actor_id,
            lines=[
                (
                    cash_id,
                    "1010",
                    "Cash",
                    JournalLineInput(
                        account_id=cash_id,
                        debit_amount=Decimal("50000.00"),
                        credit_amount=Decimal("0.00"),
                    ),
                ),
                (
                    rev_id,
                    "4010",
                    "Sales",
                    JournalLineInput(
                        account_id=rev_id,
                        debit_amount=Decimal("0.00"),
                        credit_amount=Decimal("45000.00"),
                    ),
                ),
            ],
        )

    assert exc_info.value.total_debit_ngn == Decimal("50000.00")
    assert exc_info.value.total_credit_ngn == Decimal("45000.00")


def test_fx_voucher_must_balance_in_functional_ngn() -> None:
    workspace_id = uuid4()
    actor_id = uuid4()
    period_id = uuid4()
    usd_bank = uuid4()
    ngn_rev = uuid4()

    voucher = JournalVoucher.post(
        workspace_id=workspace_id,
        fiscal_period_id=period_id,
        idempotency_key=uuid4(),
        voucher_number="JV-2026-0004",
        posting_date=date(2026, 3, 16),
        reference="FX-001",
        source_module="GENERAL_LEDGER",
        created_by_user_id=actor_id,
        lines=[
            (
                usd_bank,
                "1020",
                "USD Domiciliary Account",
                JournalLineInput(
                    account_id=usd_bank,
                    debit_amount=Decimal("100.00"),
                    credit_amount=Decimal("0.00"),
                    currency=CurrencyCode.USD,
                    exchange_rate_to_ngn=Decimal("1600.000000"),
                ),
            ),
            (
                ngn_rev,
                "4010",
                "Export Revenue",
                JournalLineInput(
                    account_id=ngn_rev,
                    debit_amount=Decimal("0.00"),
                    credit_amount=Decimal("160000.00"),
                    currency=CurrencyCode.NGN,
                    exchange_rate_to_ngn=Decimal("1.000000"),
                ),
            ),
        ],
    )

    assert voucher.total_debit_ngn == Decimal("160000.00")
    assert voucher.total_credit_ngn == Decimal("160000.00")
