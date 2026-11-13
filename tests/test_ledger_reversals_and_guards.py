from __future__ import annotations

from dataclasses import FrozenInstanceError
from datetime import date
from decimal import Decimal
from uuid import UUID, uuid4

import pytest

from nairabooks.ledger.adapters.in_memory import InMemoryLedgerStore
from nairabooks.ledger.application.use_cases import (
    PostJournalVoucherCommand,
    PostJournalVoucherUseCase,
    ReverseJournalVoucherCommand,
    ReverseJournalVoucherUseCase,
)
from nairabooks.ledger.domain import (
    AccountCategory,
    ChartOfAccount,
    ClosedPeriodError,
    CrossTenantAccessError,
    CurrencyCode,
    FiscalPeriod,
    ImmutableVoucherError,
    JournalLineInput,
    PeriodStatus,
    SegregationOfDutiesError,
    ValidationError,
    VoucherStatus,
)


def _setup_store() -> tuple[InMemoryLedgerStore, UUID, UUID, UUID, UUID]:
    workspace_id = uuid4()
    actor_id = uuid4()
    store = InMemoryLedgerStore()
    cash_id = uuid4()
    exp_id = uuid4()

    store.seed_account(
        ChartOfAccount(
            id=cash_id,
            workspace_id=workspace_id,
            code="1010",
            name="Zenith Bank Current",
            category=AccountCategory.ASSET,
            ifrs_tag="CASH_AND_CASH_EQUIVALENTS",
            source_primitive="BOOKKEEPING_AND_LEDGER",
            is_system_locked=True,
        )
    )
    store.seed_account(
        ChartOfAccount(
            id=exp_id,
            workspace_id=workspace_id,
            code="5010",
            name="Diesel Fuel Expense",
            category=AccountCategory.EXPENSE,
            ifrs_tag="ADMINISTRATIVE_EXPENSES",
            source_primitive="BILLS_AND_EXPENSES",
            is_system_locked=False,
        )
    )
    store.seed_period(
        FiscalPeriod(
            id=uuid4(),
            workspace_id=workspace_id,
            label="FY2025",
            start_date=date(2025, 1, 1),
            end_date=date(2025, 12, 31),
            status=PeriodStatus.CLOSED_CAMA_CERTIFIED,
            cama_certification="FRC/2025/004192",
        )
    )
    store.seed_period(
        FiscalPeriod(
            id=uuid4(),
            workspace_id=workspace_id,
            label="FY2026-SOFT",
            start_date=date(2026, 1, 1),
            end_date=date(2026, 1, 31),
            status=PeriodStatus.SOFT_LOCKED,
        )
    )
    store.seed_period(
        FiscalPeriod(
            id=uuid4(),
            workspace_id=workspace_id,
            label="FY2026-OPEN",
            start_date=date(2026, 2, 1),
            end_date=date(2026, 12, 31),
            status=PeriodStatus.OPEN,
        )
    )
    return store, workspace_id, actor_id, cash_id, exp_id


def test_soft_locked_and_closed_periods_block_posting() -> None:
    store, workspace_id, actor_id, cash_id, exp_id = _setup_store()
    post_uc = PostJournalVoucherUseCase(store)

    for target_date in (date(2025, 12, 20), date(2026, 1, 15)):
        with pytest.raises(ClosedPeriodError):
            post_uc.execute(
                PostJournalVoucherCommand(
                    workspace_id=workspace_id,
                    actor_user_id=actor_id,
                    idempotency_key=uuid4(),
                    posting_date=target_date,
                    reference="LOCKED-TEST",
                    source_module="GENERAL_LEDGER",
                    lines=(
                        JournalLineInput(account_id=exp_id, debit_amount=Decimal("25000.00")),
                        JournalLineInput(account_id=cash_id, credit_amount=Decimal("25000.00")),
                    ),
                )
            )


def test_posted_voucher_immutability_and_sod_guard() -> None:
    store, workspace_id, actor_id, cash_id, exp_id = _setup_store()
    post_uc = PostJournalVoucherUseCase(store)

    with pytest.raises(SegregationOfDutiesError):
        post_uc.execute(
            PostJournalVoucherCommand(
                workspace_id=workspace_id,
                actor_user_id=actor_id,
                approved_by_user_id=actor_id,
                idempotency_key=uuid4(),
                posting_date=date(2026, 3, 5),
                reference="SELF-APPROVE",
                source_module="GENERAL_LEDGER",
                lines=(
                    JournalLineInput(account_id=exp_id, debit_amount=Decimal("1000.00")),
                    JournalLineInput(account_id=cash_id, credit_amount=Decimal("1000.00")),
                ),
            )
        )

    posted = post_uc.execute(
        PostJournalVoucherCommand(
            workspace_id=workspace_id,
            actor_user_id=actor_id,
            approved_by_user_id=uuid4(),
            idempotency_key=uuid4(),
            posting_date=date(2026, 3, 5),
            reference="EXP-2026-001",
            source_module="GENERAL_LEDGER",
            lines=(
                JournalLineInput(account_id=exp_id, debit_amount=Decimal("42000.00")),
                JournalLineInput(account_id=cash_id, credit_amount=Decimal("42000.00")),
            ),
        )
    )

    with pytest.raises(FrozenInstanceError):
        posted.reference = "TAMPERED"  # type: ignore[misc]

    with pytest.raises(ImmutableVoucherError):
        store.save_voucher(posted)


def test_reverse_journal_voucher_creates_offsetting_entry_and_blocks_double_reversal() -> None:
    store, workspace_id, actor_id, cash_id, exp_id = _setup_store()
    post_uc = PostJournalVoucherUseCase(store)
    reverse_uc = ReverseJournalVoucherUseCase(store)

    original = post_uc.execute(
        PostJournalVoucherCommand(
            workspace_id=workspace_id,
            actor_user_id=actor_id,
            idempotency_key=uuid4(),
            posting_date=date(2026, 3, 10),
            reference="DIESEL-MARCH",
            source_module="GENERAL_LEDGER",
            lines=(
                JournalLineInput(
                    account_id=exp_id,
                    debit_amount=Decimal("75000.00"),
                    currency=CurrencyCode.NGN,
                    memo="Diesel purchase",
                ),
                JournalLineInput(
                    account_id=cash_id,
                    credit_amount=Decimal("75000.00"),
                    currency=CurrencyCode.NGN,
                    memo="Paid Zenith",
                ),
            ),
        )
    )

    rev_idem = uuid4()
    reversal = reverse_uc.execute(
        ReverseJournalVoucherCommand(
            workspace_id=workspace_id,
            actor_user_id=uuid4(),
            idempotency_key=rev_idem,
            original_voucher_id=original.id,
            reversal_date=date(2026, 3, 12),
            reason="Duplicate supplier entry",
        )
    )

    # Idempotent retry returns the same reversal voucher
    retry = reverse_uc.execute(
        ReverseJournalVoucherCommand(
            workspace_id=workspace_id,
            actor_user_id=uuid4(),
            idempotency_key=rev_idem,
            original_voucher_id=original.id,
            reversal_date=date(2026, 3, 12),
            reason="Duplicate supplier entry",
        )
    )
    assert retry.id == reversal.id

    updated_original = store.find_voucher_by_id(workspace_id, original.id)
    assert updated_original.status is VoucherStatus.REVERSED
    assert updated_original.reversed_by_voucher_id == reversal.id
    assert updated_original.total_debit_ngn == Decimal("75000.00")

    assert reversal.status is VoucherStatus.POSTED
    assert reversal.total_debit_ngn == Decimal("75000.00")
    assert reversal.lines[0].account_id == exp_id
    assert reversal.lines[0].credit.functional_amount_ngn == Decimal("75000.00")
    assert reversal.lines[1].account_id == cash_id
    assert reversal.lines[1].debit.functional_amount_ngn == Decimal("75000.00")

    # Double reversal blocked
    with pytest.raises(ImmutableVoucherError):
        reverse_uc.execute(
            ReverseJournalVoucherCommand(
                workspace_id=workspace_id,
                actor_user_id=uuid4(),
                idempotency_key=uuid4(),
                original_voucher_id=original.id,
                reversal_date=date(2026, 3, 13),
                reason="Second reversal attempt",
            )
        )

    # Blank reason rejected before mutating another voucher
    other_voucher = post_uc.execute(
        PostJournalVoucherCommand(
            workspace_id=workspace_id,
            actor_user_id=actor_id,
            idempotency_key=uuid4(),
            posting_date=date(2026, 3, 14),
            reference="VALID-002",
            source_module="GENERAL_LEDGER",
            lines=(
                JournalLineInput(account_id=exp_id, debit_amount=Decimal("1000.00")),
                JournalLineInput(account_id=cash_id, credit_amount=Decimal("1000.00")),
            ),
        )
    )
    with pytest.raises(ValidationError):
        reverse_uc.execute(
            ReverseJournalVoucherCommand(
                workspace_id=workspace_id,
                actor_user_id=actor_id,
                idempotency_key=uuid4(),
                original_voucher_id=other_voucher.id,
                reversal_date=date(2026, 3, 15),
                reason="   ",
            )
        )

    # Reversal into closed period blocked, original remains POSTED
    with pytest.raises(ClosedPeriodError):
        reverse_uc.execute(
            ReverseJournalVoucherCommand(
                workspace_id=workspace_id,
                actor_user_id=actor_id,
                idempotency_key=uuid4(),
                original_voucher_id=other_voucher.id,
                reversal_date=date(2026, 1, 15),
                reason="Cannot post reversal into soft-locked month",
            )
        )
    assert store.find_voucher_by_id(workspace_id, other_voucher.id).status is VoucherStatus.POSTED

    # Cross-tenant reversal rejected
    with pytest.raises(CrossTenantAccessError):
        reverse_uc.execute(
            ReverseJournalVoucherCommand(
                workspace_id=uuid4(),
                actor_user_id=actor_id,
                idempotency_key=uuid4(),
                original_voucher_id=other_voucher.id,
                reversal_date=date(2026, 3, 16),
                reason="Cross tenant attempt",
            )
        )
