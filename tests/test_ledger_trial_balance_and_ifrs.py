from __future__ import annotations

from datetime import date
from decimal import Decimal
from uuid import UUID, uuid4

import pytest

from nairabooks.ledger.adapters.in_memory import InMemoryLedgerStore
from nairabooks.ledger.application.use_cases import (
    GenerateFinancialPositionUseCase,
    GenerateProfitAndLossUseCase,
    GenerateTrialBalanceUseCase,
    PostJournalVoucherCommand,
    PostJournalVoucherUseCase,
    ReverseJournalVoucherCommand,
    ReverseJournalVoucherUseCase,
)
from nairabooks.ledger.domain import (
    AccountCategory,
    ChartOfAccount,
    CrossTenantAccessError,
    FiscalPeriod,
    JournalLineInput,
    PeriodStatus,
)


def _seed_two_year_ledger() -> tuple[
    InMemoryLedgerStore,
    UUID,
    UUID,
    FiscalPeriod,
    FiscalPeriod,
    dict[str, UUID],
]:
    workspace_id = uuid4()
    actor_id = uuid4()
    store = InMemoryLedgerStore()

    accts = {
        "cash": ChartOfAccount(
            id=uuid4(),
            workspace_id=workspace_id,
            code="1010",
            name="Zenith Bank Current",
            category=AccountCategory.ASSET,
            ifrs_tag="CASH_AND_CASH_EQUIVALENTS",
            source_primitive="BOOKKEEPING_AND_LEDGER",
            is_system_locked=True,
        ),
        "capital": ChartOfAccount(
            id=uuid4(),
            workspace_id=workspace_id,
            code="3010",
            name="Owner Share Capital",
            category=AccountCategory.EQUITY,
            ifrs_tag="ISSUED_CAPITAL",
            source_primitive="BOOKKEEPING_AND_LEDGER",
            is_system_locked=True,
        ),
        "revenue": ChartOfAccount(
            id=uuid4(),
            workspace_id=workspace_id,
            code="4010",
            name="Trading Revenue",
            category=AccountCategory.REVENUE,
            ifrs_tag="REVENUE_FROM_CONTRACTS",
            source_primitive="INVOICES_AND_RECEIVABLES",
            is_system_locked=False,
        ),
        "cogs": ChartOfAccount(
            id=uuid4(),
            workspace_id=workspace_id,
            code="5010",
            name="Bought-In Goods & Logistics",
            category=AccountCategory.EXPENSE,
            ifrs_tag="COST_OF_SALES",
            source_primitive="BILLS_AND_EXPENSES",
            is_system_locked=False,
        ),
        "payroll": ChartOfAccount(
            id=uuid4(),
            workspace_id=workspace_id,
            code="5020",
            name="Employee Salaries & Pension",
            category=AccountCategory.EXPENSE,
            ifrs_tag="EMPLOYEE_BENEFITS",
            source_primitive="PAYROLL_AND_HR",
            is_system_locked=False,
        ),
        "depr": ChartOfAccount(
            id=uuid4(),
            workspace_id=workspace_id,
            code="5030",
            name="Equipment Depreciation",
            category=AccountCategory.EXPENSE,
            ifrs_tag="DEPRECIATION_AND_AMORTISATION",
            source_primitive="BOOKKEEPING_AND_LEDGER",
            is_system_locked=False,
        ),
        "tax_exp": ChartOfAccount(
            id=uuid4(),
            workspace_id=workspace_id,
            code="5090",
            name="Company Income Tax Expense",
            category=AccountCategory.EXPENSE,
            ifrs_tag="INCOME_TAX_EXPENSE",
            source_primitive="TAX_AND_STATUTORY",
            is_system_locked=False,
        ),
        "tax_payable": ChartOfAccount(
            id=uuid4(),
            workspace_id=workspace_id,
            code="2090",
            name="NRS CIT Payable",
            category=AccountCategory.LIABILITY,
            ifrs_tag="TAX_LIABILITIES",
            source_primitive="TAX_AND_STATUTORY",
            is_system_locked=True,
        ),
    }
    for acct in accts.values():
        store.seed_account(acct)

    fy2025 = FiscalPeriod(
        id=uuid4(),
        workspace_id=workspace_id,
        label="FY2025",
        start_date=date(2025, 1, 1),
        end_date=date(2025, 12, 31),
        status=PeriodStatus.OPEN,
    )
    fy2026 = FiscalPeriod(
        id=uuid4(),
        workspace_id=workspace_id,
        label="FY2026",
        start_date=date(2026, 1, 1),
        end_date=date(2026, 12, 31),
        status=PeriodStatus.OPEN,
    )
    store.seed_period(fy2025)
    store.seed_period(fy2026)

    post_uc = PostJournalVoucherUseCase(store)
    rev_uc = ReverseJournalVoucherUseCase(store)

    # FY2025: 100,000 retained revenue
    post_uc.execute(
        PostJournalVoucherCommand(
            workspace_id=workspace_id,
            actor_user_id=actor_id,
            idempotency_key=uuid4(),
            posting_date=date(2025, 6, 10),
            reference="2025-SALE",
            source_module="GENERAL_LEDGER",
            lines=(
                JournalLineInput(
                    account_id=accts["cash"].id, debit_amount=Decimal("100000.00")
                ),
                JournalLineInput(
                    account_id=accts["revenue"].id, credit_amount=Decimal("100000.00")
                ),
            ),
        )
    )

    # FY2026: Cap 2.5M + Sales 450k + COGS 150k + Payroll 120k + Depr 30k + Tax 20k
    post_uc.execute(
        PostJournalVoucherCommand(
            workspace_id=workspace_id,
            actor_user_id=actor_id,
            idempotency_key=uuid4(),
            posting_date=date(2026, 1, 5),
            reference="2026-CAP",
            source_module="GENERAL_LEDGER",
            lines=(
                JournalLineInput(
                    account_id=accts["cash"].id, debit_amount=Decimal("2500000.00")
                ),
                JournalLineInput(
                    account_id=accts["capital"].id, credit_amount=Decimal("2500000.00")
                ),
            ),
        )
    )
    post_uc.execute(
        PostJournalVoucherCommand(
            workspace_id=workspace_id,
            actor_user_id=actor_id,
            idempotency_key=uuid4(),
            posting_date=date(2026, 3, 15),
            reference="2026-SALE",
            source_module="GENERAL_LEDGER",
            lines=(
                JournalLineInput(
                    account_id=accts["cash"].id, debit_amount=Decimal("450000.00")
                ),
                JournalLineInput(
                    account_id=accts["revenue"].id, credit_amount=Decimal("450000.00")
                ),
            ),
        )
    )
    post_uc.execute(
        PostJournalVoucherCommand(
            workspace_id=workspace_id,
            actor_user_id=actor_id,
            idempotency_key=uuid4(),
            posting_date=date(2026, 4, 2),
            reference="2026-COGS",
            source_module="GENERAL_LEDGER",
            lines=(
                JournalLineInput(account_id=accts["cogs"].id, debit_amount=Decimal("150000.00")),
                JournalLineInput(account_id=accts["cash"].id, credit_amount=Decimal("150000.00")),
            ),
        )
    )
    mistake = post_uc.execute(
        PostJournalVoucherCommand(
            workspace_id=workspace_id,
            actor_user_id=actor_id,
            idempotency_key=uuid4(),
            posting_date=date(2026, 4, 3),
            reference="2026-ERR-DUP",
            source_module="GENERAL_LEDGER",
            lines=(
                JournalLineInput(account_id=accts["cogs"].id, debit_amount=Decimal("75000.00")),
                JournalLineInput(account_id=accts["cash"].id, credit_amount=Decimal("75000.00")),
            ),
        )
    )
    rev_uc.execute(
        ReverseJournalVoucherCommand(
            workspace_id=workspace_id,
            actor_user_id=uuid4(),
            idempotency_key=uuid4(),
            original_voucher_id=mistake.id,
            reversal_date=date(2026, 4, 4),
            reason="Duplicate entry reversal",
        )
    )
    post_uc.execute(
        PostJournalVoucherCommand(
            workspace_id=workspace_id,
            actor_user_id=actor_id,
            idempotency_key=uuid4(),
            posting_date=date(2026, 5, 25),
            reference="2026-PAY",
            source_module="GENERAL_LEDGER",
            lines=(
                JournalLineInput(account_id=accts["payroll"].id, debit_amount=Decimal("120000.00")),
                JournalLineInput(account_id=accts["cash"].id, credit_amount=Decimal("120000.00")),
            ),
        )
    )
    post_uc.execute(
        PostJournalVoucherCommand(
            workspace_id=workspace_id,
            actor_user_id=actor_id,
            idempotency_key=uuid4(),
            posting_date=date(2026, 6, 30),
            reference="2026-DEPR",
            source_module="GENERAL_LEDGER",
            lines=(
                JournalLineInput(account_id=accts["depr"].id, debit_amount=Decimal("30000.00")),
                JournalLineInput(account_id=accts["cash"].id, credit_amount=Decimal("30000.00")),
            ),
        )
    )
    post_uc.execute(
        PostJournalVoucherCommand(
            workspace_id=workspace_id,
            actor_user_id=actor_id,
            idempotency_key=uuid4(),
            posting_date=date(2026, 12, 31),
            reference="2026-CIT",
            source_module="GENERAL_LEDGER",
            lines=(
                JournalLineInput(
                    account_id=accts["tax_exp"].id, debit_amount=Decimal("20000.00")
                ),
                JournalLineInput(
                    account_id=accts["tax_payable"].id, credit_amount=Decimal("20000.00")
                ),
            ),
        )
    )
    return store, workspace_id, actor_id, fy2025, fy2026, {k: v.id for k, v in accts.items()}


def test_trial_balance_nets_reversals_and_balances_debits_and_credits() -> None:
    store, workspace_id, _, _, fy2026, _ = _seed_two_year_ledger()
    tb = GenerateTrialBalanceUseCase(store).execute(
        workspace_id=workspace_id,
        fiscal_period_id=fy2026.id,
    )

    assert tb.is_balanced is True
    assert tb.total_debits_ngn == tb.total_credits_ngn
    # FY2026 Cash = 2,500,000 + 450,000 - 150,000 - 75,000 + 75,000 - 120,000 - 30,000 = 2,650,000
    cash_row = next(r for r in tb.rows if r.account_code == "1010")
    assert cash_row.debit_balance_ngn == Decimal("2650000.00")
    assert cash_row.credit_balance_ngn == Decimal("0.00")

    # COGS had 150k + 75k - 75k reversal = 150,000.00 net
    cogs_row = next(r for r in tb.rows if r.account_code == "5010")
    assert cogs_row.debit_balance_ngn == Decimal("150000.00")


def test_statement_of_profit_or_loss_and_financial_position_reconcile() -> None:
    store, workspace_id, _, _, fy2026, _ = _seed_two_year_ledger()

    pnl = GenerateProfitAndLossUseCase(store).execute(
        workspace_id=workspace_id,
        fiscal_period_id=fy2026.id,
    )
    assert pnl.total_revenue_ngn == Decimal("450000.00")
    assert pnl.operating_expenses_ngn == Decimal("300000.00")
    assert pnl.profit_before_tax_ngn == Decimal("150000.00")
    assert pnl.income_tax_expense_ngn == Decimal("20000.00")
    assert pnl.net_profit_ngn == Decimal("130000.00")

    sofp = GenerateFinancialPositionUseCase(store).execute(
        workspace_id=workspace_id,
        fiscal_period_id=fy2026.id,
    )
    assert sofp.is_balanced is True
    # Cash = 100k (2025) + 2,650,000 (2026) = 2,750,000
    assert sofp.total_assets_ngn == Decimal("2750000.00")
    # CIT payable = 20,000
    assert sofp.total_liabilities_ngn == Decimal("20000.00")
    # Equity = 2.5M Capital + 100k Retained (2025) + 130k Net Profit (2026)
    assert sofp.total_equity_ngn == Decimal("2730000.00")
    assert sofp.total_assets_ngn == sofp.total_liabilities_ngn + sofp.total_equity_ngn


def test_period_report_blocks_cross_tenant_period_access() -> None:
    store, _, _, _, fy2026, _ = _seed_two_year_ledger()
    with pytest.raises(CrossTenantAccessError):
        GenerateTrialBalanceUseCase(store).execute(
            workspace_id=uuid4(),
            fiscal_period_id=fy2026.id,
        )
