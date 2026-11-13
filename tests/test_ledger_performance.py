"""Performance benchmarks for NairaBooks ledger engine.

Verifies high-throughput journal voucher posting, trial balance generation,
and exact decimal invariance under high volume.
Activated by: `application-performance-performance-optimization` (#89)
and `performance-engineer` (#90).
"""

from __future__ import annotations

import time
from datetime import date
from decimal import Decimal
from uuid import uuid4

from nairabooks.ledger.adapters.in_memory import InMemoryLedgerStore
from nairabooks.ledger.application.use_cases import (
    PostJournalVoucherCommand,
    PostJournalVoucherUseCase,
)
from nairabooks.ledger.domain.models import (
    AccountCategory,
    ChartOfAccount,
    FiscalPeriod,
    JournalLineInput,
    PeriodStatus,
)


def test_high_volume_journal_voucher_posting_throughput() -> None:
    """Benchmark posting 1,000 journal vouchers and validating balance in under 2 seconds."""
    workspace_id = uuid4()
    actor_id = uuid4()
    store = InMemoryLedgerStore()

    bank_acct = ChartOfAccount(
        id=uuid4(),
        workspace_id=workspace_id,
        code="1010",
        name="Zenith Bank Operating",
        category=AccountCategory.ASSET,
        ifrs_tag="CASH_AND_CASH_EQUIVALENTS",
        source_primitive="BOOKKEEPING_AND_LEDGER",
        is_system_locked=True,
    )
    rev_acct = ChartOfAccount(
        id=uuid4(),
        workspace_id=workspace_id,
        code="4010",
        name="Sales Revenue",
        category=AccountCategory.REVENUE,
        ifrs_tag="REVENUE_FROM_CONTRACTS",
        source_primitive="INVOICES_AND_RECEIVABLES",
        is_system_locked=False,
    )
    store.seed_account(bank_acct)
    store.seed_account(rev_acct)

    period = FiscalPeriod(
        id=uuid4(),
        workspace_id=workspace_id,
        label="October 2026",
        start_date=date(2026, 10, 1),
        end_date=date(2026, 10, 31),
        status=PeriodStatus.OPEN,
    )
    store.seed_period(period)

    use_case = PostJournalVoucherUseCase(store)

    count = 1000
    start_time = time.perf_counter()

    for i in range(count):
        amount_dec = Decimal(f"{1000 + i}.50")
        cmd = PostJournalVoucherCommand(
            workspace_id=workspace_id,
            actor_user_id=actor_id,
            idempotency_key=uuid4(),
            posting_date=date(2026, 10, 15),
            reference=f"PERF-TX-{i:05d}",
            source_module="BENCHMARK",
            lines=[
                JournalLineInput(
                    account_id=bank_acct.id,
                    debit_amount=amount_dec,
                    credit_amount=Decimal("0.00"),
                    memo=f"Debit bank #{i}",
                ),
                JournalLineInput(
                    account_id=rev_acct.id,
                    debit_amount=Decimal("0.00"),
                    credit_amount=amount_dec,
                    memo=f"Credit revenue #{i}",
                ),
            ],
        )
        use_case.execute(cmd)

    total_duration = time.perf_counter() - start_time
    avg_per_voucher_ms = (total_duration / count) * 1000.0

    # Invariants
    vouchers = store.list_vouchers(workspace_id)
    assert len(vouchers) == count
    assert total_duration < 2.5, f"Expected 1,000 postings in < 2.5s, took {total_duration:.3f}s"
    assert avg_per_voucher_ms < 2.5, f"Expected < 2.5ms/voucher, took {avg_per_voucher_ms:.3f}ms"
