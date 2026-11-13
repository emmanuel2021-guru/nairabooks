from __future__ import annotations

from datetime import date
from decimal import Decimal
from uuid import UUID, uuid4

import pytest

from nairabooks.ledger.adapters.in_memory import InMemoryLedgerStore
from nairabooks.ledger.adapters.postgres import PostgresLedgerSqlBuilder
from nairabooks.ledger.application.use_cases import (
    ListChartOfAccountsUseCase,
    ListJournalVouchersUseCase,
    PostJournalVoucherCommand,
    PostJournalVoucherUseCase,
)
from nairabooks.ledger.domain import (
    AccountCategory,
    ChartOfAccount,
    ClosedPeriodError,
    CrossTenantAccessError,
    CurrencyCode,
    FiscalPeriod,
    JournalLineInput,
    PeriodStatus,
    ValidationError,
)


def _seed_workspace() -> tuple[InMemoryLedgerStore, UUID, UUID, UUID, UUID, UUID]:
    workspace_id = uuid4()
    actor_id = uuid4()
    store = InMemoryLedgerStore()
    cash_id = uuid4()
    rev_id = uuid4()
    inactive_id = uuid4()

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
            is_active=True,
        )
    )
    store.seed_account(
        ChartOfAccount(
            id=rev_id,
            workspace_id=workspace_id,
            code="4010",
            name="Trading Sales Revenue",
            category=AccountCategory.REVENUE,
            ifrs_tag="REVENUE_FROM_CONTRACTS",
            source_primitive="BOOKKEEPING_AND_LEDGER",
            is_system_locked=False,
            is_active=True,
        )
    )
    store.seed_account(
        ChartOfAccount(
            id=inactive_id,
            workspace_id=workspace_id,
            code="5099",
            name="Deprecated Expense",
            category=AccountCategory.EXPENSE,
            ifrs_tag="OPERATING_EXPENSES",
            source_primitive="BOOKKEEPING_AND_LEDGER",
            is_system_locked=False,
            is_active=False,
        )
    )
    store.seed_period(
        FiscalPeriod(
            id=uuid4(),
            workspace_id=workspace_id,
            label="FY2026-Q1",
            start_date=date(2026, 1, 1),
            end_date=date(2026, 3, 31),
            status=PeriodStatus.OPEN,
        )
    )
    return store, workspace_id, actor_id, cash_id, rev_id, inactive_id


def test_account_and_period_domain_invariants() -> None:
    workspace_id = uuid4()
    with pytest.raises(ValidationError):
        FiscalPeriod(
            id=uuid4(),
            workspace_id=workspace_id,
            label="Bad Range",
            start_date=date(2026, 4, 1),
            end_date=date(2026, 3, 31),
            status=PeriodStatus.OPEN,
        )

    closed = FiscalPeriod(
        id=uuid4(),
        workspace_id=workspace_id,
        label="FY2025",
        start_date=date(2025, 1, 1),
        end_date=date(2025, 12, 31),
        status=PeriodStatus.CLOSED_CAMA_CERTIFIED,
    )
    with pytest.raises(ClosedPeriodError):
        closed.ensure_accepts_posting(date(2025, 6, 15))


def test_post_journal_voucher_use_case_and_idempotency() -> None:
    store, workspace_id, actor_id, cash_id, rev_id, _ = _seed_workspace()
    use_case = PostJournalVoucherUseCase(store)
    idem_key = uuid4()

    cmd = PostJournalVoucherCommand(
        workspace_id=workspace_id,
        actor_user_id=actor_id,
        idempotency_key=idem_key,
        posting_date=date(2026, 2, 20),
        reference="INV-2026-009",
        source_module="GENERAL_LEDGER",
        lines=(
            JournalLineInput(
                account_id=cash_id,
                debit_amount=Decimal("107500.00"),
                credit_amount=Decimal("0.00"),
                currency=CurrencyCode.NGN,
            ),
            JournalLineInput(
                account_id=rev_id,
                debit_amount=Decimal("0.00"),
                credit_amount=Decimal("107500.00"),
                currency=CurrencyCode.NGN,
            ),
        ),
    )

    first = use_case.execute(cmd)
    second = use_case.execute(cmd)

    assert first.id == second.id
    assert first.voucher_number == "JV-2026-0001"
    page = ListJournalVouchersUseCase(store).execute(workspace_id=workspace_id, first=10)
    assert len(page.edges) == 1


def test_cross_tenant_account_and_inactive_account_rejected() -> None:
    store, workspace_id, actor_id, cash_id, rev_id, inactive_id = _seed_workspace()
    other_workspace_id = uuid4()
    foreign_acct = uuid4()
    store.seed_account(
        ChartOfAccount(
            id=foreign_acct,
            workspace_id=other_workspace_id,
            code="1010",
            name="Other Workspace Cash",
            category=AccountCategory.ASSET,
            ifrs_tag="CASH_AND_CASH_EQUIVALENTS",
            source_primitive="BOOKKEEPING_AND_LEDGER",
            is_system_locked=True,
            is_active=True,
        )
    )

    use_case = PostJournalVoucherUseCase(store)
    with pytest.raises(CrossTenantAccessError):
        use_case.execute(
            PostJournalVoucherCommand(
                workspace_id=workspace_id,
                actor_user_id=actor_id,
                idempotency_key=uuid4(),
                posting_date=date(2026, 2, 20),
                reference="CROSS-TENANT",
                source_module="GENERAL_LEDGER",
                lines=(
                    JournalLineInput(account_id=foreign_acct, debit_amount=Decimal("500.00")),
                    JournalLineInput(account_id=rev_id, credit_amount=Decimal("500.00")),
                ),
            )
        )

    with pytest.raises(ValidationError):
        use_case.execute(
            PostJournalVoucherCommand(
                workspace_id=workspace_id,
                actor_user_id=actor_id,
                idempotency_key=uuid4(),
                posting_date=date(2026, 2, 20),
                reference="INACTIVE-ACCT",
                source_module="GENERAL_LEDGER",
                lines=(
                    JournalLineInput(account_id=inactive_id, debit_amount=Decimal("500.00")),
                    JournalLineInput(account_id=cash_id, credit_amount=Decimal("500.00")),
                ),
            )
        )

    active_accounts = ListChartOfAccountsUseCase(store).execute(
        workspace_id=workspace_id,
        active_only=True,
    )
    assert [a.code for a in active_accounts] == ["1010", "4010"]


def test_postgres_sql_builder_uses_rls_session_guc_and_parameters() -> None:
    workspace_id = uuid4()
    rls_stmt, rls_params = PostgresLedgerSqlBuilder.set_workspace_context(workspace_id)
    assert "set_config('app.current_workspace_id'" in rls_stmt
    assert rls_params == (str(workspace_id),)
