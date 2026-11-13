"""Pure FRCN IFRS financial statement builders (Trial Balance, P&L, Financial Position)."""

from __future__ import annotations

import csv
import hashlib
import io
import json
from collections.abc import Sequence
from dataclasses import dataclass
from datetime import UTC, datetime
from decimal import ROUND_HALF_UP, Decimal
from uuid import UUID

from nairabooks.ledger.domain.models import (
    AccountCategory,
    ChartOfAccount,
    FiscalPeriod,
    JournalVoucher,
    VoucherStatus,
)
from nairabooks.ledger.domain.money import RATE_QUANTUM, ZERO_MONEY, CurrencyCode

_LEDGER_ELIGIBLE_STATUSES = frozenset({VoucherStatus.POSTED, VoucherStatus.REVERSED})
_TAX_EXPENSE_TAGS = frozenset({"INCOME_TAX_EXPENSE", "TAX_EXPENSE", "CORPORATE_INCOME_TAX"})
_EMPLOYEE_TAGS = frozenset({"EMPLOYEE_BENEFITS", "STAFF_COSTS", "PAYROLL_EXPENSE"})
_FINANCE_TAGS = frozenset({"FINANCE_COSTS", "INTEREST_EXPENSE"})
_DEPRECIATION_TAGS = frozenset({"DEPRECIATION_AND_AMORTISATION", "DEPRECIATION"})
_ZERO_RATE = Decimal("0.000000")
_HUNDRED = Decimal("100")


@dataclass(frozen=True, slots=True)
class TrialBalanceRow:
    """Normalized net debit/credit balance row per account matching schema.graphql."""

    account_code: str
    account_name: str
    category: AccountCategory
    ifrs_tag: str
    debit_balance_ngn: Decimal
    credit_balance_ngn: Decimal


@dataclass(frozen=True, slots=True)
class TrialBalanceReport:
    """Balanced Trial Balance for a single fiscal period."""

    fiscal_period_id: UUID
    fiscal_period_label: str
    rows: tuple[TrialBalanceRow, ...]
    total_debits_ngn: Decimal
    total_credits_ngn: Decimal
    is_balanced: bool


@dataclass(frozen=True, slots=True)
class StatementLineItem:
    """Single IFRS statement account line expressed in normal presentation sign."""

    account_code: str
    account_name: str
    ifrs_tag: str
    amount_ngn: Decimal


@dataclass(frozen=True, slots=True)
class StatementOfProfitOrLoss:
    """IFRS Statement of Profit or Loss for a fiscal period."""

    fiscal_period_id: UUID
    fiscal_period_label: str
    revenue_lines: tuple[StatementLineItem, ...]
    operating_expense_lines: tuple[StatementLineItem, ...]
    tax_expense_lines: tuple[StatementLineItem, ...]
    total_revenue_ngn: Decimal
    operating_expenses_ngn: Decimal
    profit_before_tax_ngn: Decimal
    income_tax_expense_ngn: Decimal
    net_profit_ngn: Decimal


@dataclass(frozen=True, slots=True)
class StatementOfFinancialPosition:
    """Point-in-time IFRS Balance Sheet (cumulative up to period.end_date)."""

    fiscal_period_id: UUID
    as_of_date: str
    asset_lines: tuple[StatementLineItem, ...]
    liability_lines: tuple[StatementLineItem, ...]
    equity_lines: tuple[StatementLineItem, ...]
    retained_and_current_earnings_ngn: Decimal
    total_assets_ngn: Decimal
    total_liabilities_ngn: Decimal
    total_equity_ngn: Decimal
    is_balanced: bool


def _aggregate_account_nets(
    accounts: Sequence[ChartOfAccount],
    vouchers: Sequence[JournalVoucher],
) -> dict[UUID, Decimal]:
    """Sum (debit_ngn - credit_ngn) per account across non-draft vouchers."""
    nets: dict[UUID, Decimal] = {acct.id: ZERO_MONEY for acct in accounts}
    for voucher in vouchers:
        if voucher.status not in _LEDGER_ELIGIBLE_STATUSES:
            continue
        for line in voucher.lines:
            nets[line.account_id] = (
                nets.get(line.account_id, ZERO_MONEY)
                + line.debit.functional_amount_ngn
                - line.credit.functional_amount_ngn
            )
    return nets


def build_trial_balance(
    *,
    period: FiscalPeriod,
    accounts: Sequence[ChartOfAccount],
    vouchers: Sequence[JournalVoucher],
) -> TrialBalanceReport:
    """Build a period Trial Balance matching debits == credits in NGN."""
    period_vouchers = [v for v in vouchers if period.contains(v.posting_date)]
    nets = _aggregate_account_nets(accounts, period_vouchers)

    rows: list[TrialBalanceRow] = []
    total_debits = ZERO_MONEY
    total_credits = ZERO_MONEY

    for acct in sorted(accounts, key=lambda item: item.code):
        net = nets.get(acct.id, ZERO_MONEY)
        if net == ZERO_MONEY:
            continue
        if net > ZERO_MONEY:
            debit_bal = net
            credit_bal = ZERO_MONEY
        else:
            debit_bal = ZERO_MONEY
            credit_bal = -net
        total_debits += debit_bal
        total_credits += credit_bal
        rows.append(
            TrialBalanceRow(
                account_code=acct.code,
                account_name=acct.name,
                category=acct.category,
                ifrs_tag=acct.ifrs_tag,
                debit_balance_ngn=debit_bal,
                credit_balance_ngn=credit_bal,
            )
        )

    return TrialBalanceReport(
        fiscal_period_id=period.id,
        fiscal_period_label=period.label,
        rows=tuple(rows),
        total_debits_ngn=total_debits,
        total_credits_ngn=total_credits,
        is_balanced=total_debits == total_credits,
    )


def build_profit_and_loss(
    *,
    period: FiscalPeriod,
    accounts: Sequence[ChartOfAccount],
    vouchers: Sequence[JournalVoucher],
) -> StatementOfProfitOrLoss:
    """Build IFRS Statement of Profit or Loss strictly for period date window."""
    period_vouchers = [v for v in vouchers if period.contains(v.posting_date)]
    nets = _aggregate_account_nets(accounts, period_vouchers)

    revenue_lines: list[StatementLineItem] = []
    op_exp_lines: list[StatementLineItem] = []
    tax_exp_lines: list[StatementLineItem] = []
    total_rev = ZERO_MONEY
    total_op_exp = ZERO_MONEY
    total_tax = ZERO_MONEY

    for acct in sorted(accounts, key=lambda item: item.code):
        net = nets.get(acct.id, ZERO_MONEY)
        if net == ZERO_MONEY:
            continue
        if acct.category is AccountCategory.REVENUE:
            amount = -net
            total_rev += amount
            revenue_lines.append(
                StatementLineItem(acct.code, acct.name, acct.ifrs_tag, amount)
            )
        elif acct.category is AccountCategory.EXPENSE:
            amount = net
            if acct.ifrs_tag in _TAX_EXPENSE_TAGS:
                total_tax += amount
                tax_exp_lines.append(
                    StatementLineItem(acct.code, acct.name, acct.ifrs_tag, amount)
                )
            else:
                total_op_exp += amount
                op_exp_lines.append(
                    StatementLineItem(acct.code, acct.name, acct.ifrs_tag, amount)
                )

    pbt = total_rev - total_op_exp
    net_profit = pbt - total_tax
    return StatementOfProfitOrLoss(
        fiscal_period_id=period.id,
        fiscal_period_label=period.label,
        revenue_lines=tuple(revenue_lines),
        operating_expense_lines=tuple(op_exp_lines),
        tax_expense_lines=tuple(tax_exp_lines),
        total_revenue_ngn=total_rev,
        operating_expenses_ngn=total_op_exp,
        profit_before_tax_ngn=pbt,
        income_tax_expense_ngn=total_tax,
        net_profit_ngn=net_profit,
    )


def build_financial_position(
    *,
    period: FiscalPeriod,
    accounts: Sequence[ChartOfAccount],
    vouchers: Sequence[JournalVoucher],
) -> StatementOfFinancialPosition:
    """Build cumulative IFRS Statement of Financial Position as at period.end_date."""
    cum_vouchers = [v for v in vouchers if v.posting_date <= period.end_date]
    nets = _aggregate_account_nets(accounts, cum_vouchers)

    assets: list[StatementLineItem] = []
    liabilities: list[StatementLineItem] = []
    equity: list[StatementLineItem] = []

    total_assets = ZERO_MONEY
    total_liabilities = ZERO_MONEY
    total_equity_accounts = ZERO_MONEY
    cumulative_rev = ZERO_MONEY
    cumulative_exp = ZERO_MONEY

    for acct in sorted(accounts, key=lambda item: item.code):
        net = nets.get(acct.id, ZERO_MONEY)
        if acct.category is AccountCategory.REVENUE:
            cumulative_rev += -net
        elif acct.category is AccountCategory.EXPENSE:
            cumulative_exp += net
        elif net == ZERO_MONEY:
            continue
        elif acct.category is AccountCategory.ASSET:
            total_assets += net
            assets.append(StatementLineItem(acct.code, acct.name, acct.ifrs_tag, net))
        elif acct.category is AccountCategory.LIABILITY:
            bal = -net
            total_liabilities += bal
            liabilities.append(StatementLineItem(acct.code, acct.name, acct.ifrs_tag, bal))
        elif acct.category in (AccountCategory.EQUITY, AccountCategory.RESTRICTED_FUND):
            bal = -net
            total_equity_accounts += bal
            equity.append(StatementLineItem(acct.code, acct.name, acct.ifrs_tag, bal))

    retained = cumulative_rev - cumulative_exp
    total_equity = total_equity_accounts + retained

    return StatementOfFinancialPosition(
        fiscal_period_id=period.id,
        as_of_date=period.end_date.isoformat(),
        asset_lines=tuple(assets),
        liability_lines=tuple(liabilities),
        equity_lines=tuple(equity),
        retained_and_current_earnings_ngn=retained,
        total_assets_ngn=total_assets,
        total_liabilities_ngn=total_liabilities,
        total_equity_ngn=total_equity,
        is_balanced=(total_assets == total_liabilities + total_equity),
    )


@dataclass(frozen=True, slots=True)
class ValueAddedStatementRow:
    """FRCN Other National Disclosure: Statement of Value Added row."""

    line_label: str
    amount_ngn: Decimal
    percentage_share: Decimal


@dataclass(frozen=True, slots=True)
class FiveYearMetricColumn:
    """FRCN Other National Disclosure: Five-Year Financial Summary column."""

    fiscal_year_label: str
    revenue_ngn: Decimal
    profit_before_tax_ngn: Decimal
    total_assets_ngn: Decimal
    net_equity_ngn: Decimal


@dataclass(frozen=True, slots=True)
class FrcnFinancialStatementPackage:
    """Complete FRCN IFRS + Nigerian Other National Disclosures financial package."""

    fiscal_period_id: UUID
    fiscal_period_label: str
    statement_currency: CurrencyCode
    trial_balance: TrialBalanceReport
    profit_and_loss: StatementOfProfitOrLoss
    financial_position: StatementOfFinancialPosition
    value_added_statement: tuple[ValueAddedStatementRow, ...]
    five_year_summary: tuple[FiveYearMetricColumn, ...]
    is_balanced: bool
    snapshot_hash: str
    generated_at: datetime

    def to_trial_balance_csv(self) -> str:
        """Export normalized Trial Balance rows cleanly as RFC 4180 CSV."""
        buf = io.StringIO()
        writer = csv.writer(buf, lineterminator="\n")
        writer.writerow(["account_code", "account_name", "category", "debit_ngn", "credit_ngn"])
        for row in self.trial_balance.rows:
            writer.writerow(
                [
                    row.account_code,
                    row.account_name,
                    row.category.value,
                    f"{row.debit_balance_ngn:.2f}",
                    f"{row.credit_balance_ngn:.2f}",
                ]
            )
        return buf.getvalue()


def _share_percent(part: Decimal, total: Decimal) -> Decimal:
    if total == ZERO_MONEY:
        return _ZERO_RATE
    return ((part * _HUNDRED) / total).quantize(RATE_QUANTUM, rounding=ROUND_HALF_UP)


def build_value_added_statement(
    *,
    period: FiscalPeriod,
    accounts: Sequence[ChartOfAccount],
    vouchers: Sequence[JournalVoucher],
) -> tuple[ValueAddedStatementRow, ...]:
    """Compute Nigerian Statement of Value Added reconciling creation to distribution."""
    period_vouchers = [v for v in vouchers if period.contains(v.posting_date)]
    nets = _aggregate_account_nets(accounts, period_vouchers)

    revenue = ZERO_MONEY
    bought_in = ZERO_MONEY
    employees = ZERO_MONEY
    capital_providers = ZERO_MONEY
    government_tax = ZERO_MONEY
    depreciation = ZERO_MONEY

    for acct in accounts:
        net = nets.get(acct.id, ZERO_MONEY)
        if net == ZERO_MONEY:
            continue
        if acct.category is AccountCategory.REVENUE:
            revenue += -net
        elif acct.category is AccountCategory.EXPENSE:
            if acct.ifrs_tag in _EMPLOYEE_TAGS:
                employees += net
            elif acct.ifrs_tag in _FINANCE_TAGS:
                capital_providers += net
            elif acct.ifrs_tag in _TAX_EXPENSE_TAGS:
                government_tax += net
            elif acct.ifrs_tag in _DEPRECIATION_TAGS:
                depreciation += net
            else:
                bought_in += net

    value_added = revenue - bought_in
    retained = value_added - employees - capital_providers - government_tax - depreciation

    return (
        ValueAddedStatementRow(
            line_label="Turnover & Other Income",
            amount_ngn=revenue,
            percentage_share=_ZERO_RATE,
        ),
        ValueAddedStatementRow(
            line_label="Bought-In Materials & Services",
            amount_ngn=bought_in,
            percentage_share=_ZERO_RATE,
        ),
        ValueAddedStatementRow(
            line_label="Value Added",
            amount_ngn=value_added,
            percentage_share=Decimal("100.000000") if value_added != ZERO_MONEY else _ZERO_RATE,
        ),
        ValueAddedStatementRow(
            line_label="To Pay Employees",
            amount_ngn=employees,
            percentage_share=_share_percent(employees, value_added),
        ),
        ValueAddedStatementRow(
            line_label="To Pay Providers of Capital",
            amount_ngn=capital_providers,
            percentage_share=_share_percent(capital_providers, value_added),
        ),
        ValueAddedStatementRow(
            line_label="To Pay Government (Taxes)",
            amount_ngn=government_tax,
            percentage_share=_share_percent(government_tax, value_added),
        ),
        ValueAddedStatementRow(
            line_label="Depreciation & Asset Replacement",
            amount_ngn=depreciation,
            percentage_share=_share_percent(depreciation, value_added),
        ),
        ValueAddedStatementRow(
            line_label="Retained for Future Expansion",
            amount_ngn=retained,
            percentage_share=_share_percent(retained, value_added),
        ),
    )


def build_five_year_summary(
    *,
    target_period: FiscalPeriod,
    periods: Sequence[FiscalPeriod],
    accounts: Sequence[ChartOfAccount],
    vouchers: Sequence[JournalVoucher],
) -> tuple[FiveYearMetricColumn, ...]:
    """Compute up to 5 chronological periods of Five-Year Financial Summary metrics."""
    eligible_periods = sorted(
        (p for p in periods if p.start_date <= target_period.start_date),
        key=lambda p: p.start_date,
    )[-5:]

    columns: list[FiveYearMetricColumn] = []
    for period in eligible_periods:
        pnl = build_profit_and_loss(period=period, accounts=accounts, vouchers=vouchers)
        sofp = build_financial_position(period=period, accounts=accounts, vouchers=vouchers)
        columns.append(
            FiveYearMetricColumn(
                fiscal_year_label=period.label,
                revenue_ngn=pnl.total_revenue_ngn,
                profit_before_tax_ngn=pnl.profit_before_tax_ngn,
                total_assets_ngn=sofp.total_assets_ngn,
                net_equity_ngn=sofp.total_equity_ngn,
            )
        )
    return tuple(columns)


def build_frcn_statement_package(
    *,
    period: FiscalPeriod,
    periods: Sequence[FiscalPeriod],
    accounts: Sequence[ChartOfAccount],
    vouchers: Sequence[JournalVoucher],
    generated_at: datetime | None = None,
) -> FrcnFinancialStatementPackage:
    """Assemble full FRCN IFRS + Other National Disclosures statement package with SHA-256."""
    trial_balance = build_trial_balance(period=period, accounts=accounts, vouchers=vouchers)
    pnl = build_profit_and_loss(period=period, accounts=accounts, vouchers=vouchers)
    sofp = build_financial_position(period=period, accounts=accounts, vouchers=vouchers)
    vas = build_value_added_statement(period=period, accounts=accounts, vouchers=vouchers)
    five_year = build_five_year_summary(
        target_period=period,
        periods=periods,
        accounts=accounts,
        vouchers=vouchers,
    )

    is_balanced = trial_balance.is_balanced and sofp.is_balanced
    digest_input = json.dumps(
        {
            "periodId": str(period.id),
            "tbDebits": str(trial_balance.total_debits_ngn),
            "tbCredits": str(trial_balance.total_credits_ngn),
            "assets": str(sofp.total_assets_ngn),
            "liabilities": str(sofp.total_liabilities_ngn),
            "equity": str(sofp.total_equity_ngn),
            "revenue": str(pnl.total_revenue_ngn),
            "netProfit": str(pnl.net_profit_ngn),
        },
        sort_keys=True,
    ).encode("utf-8")
    snapshot_hash = hashlib.sha256(digest_input).hexdigest()

    return FrcnFinancialStatementPackage(
        fiscal_period_id=period.id,
        fiscal_period_label=period.label,
        statement_currency=CurrencyCode.NGN,
        trial_balance=trial_balance,
        profit_and_loss=pnl,
        financial_position=sofp,
        value_added_statement=vas,
        five_year_summary=five_year,
        is_balanced=is_balanced,
        snapshot_hash=snapshot_hash,
        generated_at=generated_at or datetime.now(UTC),
    )

