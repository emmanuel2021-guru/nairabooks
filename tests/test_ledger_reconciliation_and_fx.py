from __future__ import annotations

from datetime import date
from decimal import Decimal
from uuid import uuid4

import pytest

from nairabooks.ledger.adapters.in_memory import InMemoryLedgerStore
from nairabooks.ledger.application.use_cases import (
    CalculateFxRevaluationUseCase,
    PostJournalVoucherCommand,
    PostJournalVoucherUseCase,
    ReconcileBankStatementUseCase,
)
from nairabooks.ledger.domain import (
    AccountCategory,
    BankStatementLine,
    ChartOfAccount,
    CurrencyCode,
    FiscalPeriod,
    JournalLineInput,
    PeriodStatus,
    ReconciliationStatus,
    ValidationError,
)


def test_bank_and_pos_reconciliation_matches_exact_and_fee_adjusted_settlements() -> None:
    workspace_id = uuid4()
    actor_id = uuid4()
    store = InMemoryLedgerStore()

    bank_id = uuid4()
    rev_id = uuid4()
    store.seed_account(
        ChartOfAccount(
            id=bank_id,
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
            id=rev_id,
            workspace_id=workspace_id,
            code="4010",
            name="POS & Retail Revenue",
            category=AccountCategory.REVENUE,
            ifrs_tag="REVENUE_FROM_CONTRACTS",
            source_primitive="INVOICES_AND_RECEIVABLES",
            is_system_locked=False,
        )
    )
    store.seed_period(
        FiscalPeriod(
            id=uuid4(),
            workspace_id=workspace_id,
            label="FY2026",
            start_date=date(2026, 1, 1),
            end_date=date(2026, 12, 31),
            status=PeriodStatus.OPEN,
        )
    )

    post_uc = PostJournalVoucherUseCase(store)
    # Sale 1: Exact NIP inflow 120,000.00
    post_uc.execute(
        PostJournalVoucherCommand(
            workspace_id=workspace_id,
            actor_user_id=actor_id,
            idempotency_key=uuid4(),
            posting_date=date(2026, 5, 1),
            reference="NIP-001",
            source_module="SALES",
            lines=(
                JournalLineInput(account_id=bank_id, debit_amount=Decimal("120000.00")),
                JournalLineInput(account_id=rev_id, credit_amount=Decimal("120000.00")),
            ),
        )
    )
    # Sale 2: Gross POS sale 50,000.00 (bank settles T+1 at 49,750.00 after 250.00 MDR fee)
    post_uc.execute(
        PostJournalVoucherCommand(
            workspace_id=workspace_id,
            actor_user_id=actor_id,
            idempotency_key=uuid4(),
            posting_date=date(2026, 5, 2),
            reference="POS-002",
            source_module="POS",
            lines=(
                JournalLineInput(account_id=bank_id, debit_amount=Decimal("50000.00")),
                JournalLineInput(account_id=rev_id, credit_amount=Decimal("50000.00")),
            ),
        )
    )

    statement_lines = (
        BankStatementLine(
            line_id="STMT-1",
            value_date=date(2026, 5, 1),
            amount_ngn=Decimal("120000.00"),
            direction="CREDIT",
            channel="NIP_INFLOW",
            reference="NIP-001",
        ),
        BankStatementLine(
            line_id="STMT-2",
            value_date=date(2026, 5, 3),
            amount_ngn=Decimal("49750.00"),
            direction="CREDIT",
            channel="POS_SETTLEMENT",
            reference="POS-BATCH-502",
            fee_ngn=Decimal("250.00"),
        ),
        BankStatementLine(
            line_id="STMT-3",
            value_date=date(2026, 5, 3),
            amount_ngn=Decimal("50.00"),
            direction="DEBIT",
            channel="EMT_LEVY",
            reference="CBN-EMT-50",
        ),
    )

    result = ReconcileBankStatementUseCase(store).execute(
        workspace_id=workspace_id,
        account_id=bank_id,
        statement_lines=statement_lines,
        through_date=date(2026, 5, 5),
    )

    assert result.matched_count == 2
    assert len(result.unmatched_statement_lines) == 1
    assert result.unmatched_statement_lines[0].line_id == "STMT-3"
    assert len(result.unmatched_ledger_lines) == 0

    by_stmt = {m.statement_line_id: m for m in result.matches}
    assert by_stmt["STMT-1"].status is ReconciliationStatus.MATCHED_EXACT
    assert by_stmt["STMT-2"].status is ReconciliationStatus.MATCHED_FEE_ADJUSTED
    assert by_stmt["STMT-2"].fee_variance_ngn == Decimal("250.00")


def test_fx_revaluation_computes_exact_unrealized_gain_or_loss() -> None:
    workspace_id = uuid4()
    actor_id = uuid4()
    store = InMemoryLedgerStore()

    usd_acct = uuid4()
    rev_id = uuid4()
    store.seed_account(
        ChartOfAccount(
            id=usd_acct,
            workspace_id=workspace_id,
            code="1020",
            name="Access Bank Domiciliary (USD)",
            category=AccountCategory.ASSET,
            ifrs_tag="CASH_AND_CASH_EQUIVALENTS",
            source_primitive="MULTI_CURRENCY_AND_FX",
            is_system_locked=False,
        )
    )
    store.seed_account(
        ChartOfAccount(
            id=rev_id,
            workspace_id=workspace_id,
            code="4010",
            name="Export Sales",
            category=AccountCategory.REVENUE,
            ifrs_tag="REVENUE_FROM_CONTRACTS",
            source_primitive="INVOICES_AND_RECEIVABLES",
            is_system_locked=False,
        )
    )
    store.seed_period(
        FiscalPeriod(
            id=uuid4(),
            workspace_id=workspace_id,
            label="FY2026",
            start_date=date(2026, 1, 1),
            end_date=date(2026, 12, 31),
            status=PeriodStatus.OPEN,
        )
    )

    # Receipt of USD 1,000.00 at 1,550.00 NGN/USD -> carrying 1,550,000.00 NGN
    PostJournalVoucherUseCase(store).execute(
        PostJournalVoucherCommand(
            workspace_id=workspace_id,
            actor_user_id=actor_id,
            idempotency_key=uuid4(),
            posting_date=date(2026, 3, 10),
            reference="USD-IN-001",
            source_module="GENERAL_LEDGER",
            lines=(
                JournalLineInput(
                    account_id=usd_acct,
                    debit_amount=Decimal("1000.00"),
                    currency=CurrencyCode.USD,
                    exchange_rate_to_ngn=Decimal("1550.000000"),
                ),
                JournalLineInput(
                    account_id=rev_id,
                    credit_amount=Decimal("1550000.00"),
                    currency=CurrencyCode.NGN,
                ),
            ),
        )
    )

    reval = CalculateFxRevaluationUseCase(store).execute(
        workspace_id=workspace_id,
        account_id=usd_acct,
        currency=CurrencyCode.USD,
        closing_rate_to_ngn="1620.500000",
        as_of_date=date(2026, 3, 31),
    )

    assert reval.foreign_balance == Decimal("1000.00")
    assert reval.carrying_ngn == Decimal("1550000.00")
    assert reval.revalued_ngn == Decimal("1620500.00")
    assert reval.unrealized_gain_loss_ngn == Decimal("70500.00")
    assert reval.is_gain is True

    with pytest.raises(ValidationError):
        CalculateFxRevaluationUseCase(store).execute(
            workspace_id=workspace_id,
            account_id=usd_acct,
            currency=CurrencyCode.NGN,
            closing_rate_to_ngn="1.000000",
            as_of_date=date(2026, 3, 31),
        )
