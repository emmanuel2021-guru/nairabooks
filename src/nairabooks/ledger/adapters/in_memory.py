"""In-memory transactional LedgerStore adapter and default SME seed helper."""

from __future__ import annotations

from collections.abc import Iterator
from contextlib import contextmanager
from datetime import date
from decimal import Decimal
from threading import RLock
from uuid import UUID, uuid4

from nairabooks.ledger.domain import (
    AccountCategory,
    ChartOfAccount,
    CrossTenantAccessError,
    CurrencyCode,
    FiscalPeriod,
    ImmutableVoucherError,
    JournalLineInput,
    JournalVoucher,
    PeriodStatus,
    ValidationError,
    VoucherStatus,
)


class InMemoryLedgerStore:
    """Thread-safe in-memory transactional adapter enforcing tenant RLS semantics."""

    def __init__(self) -> None:
        self._lock = RLock()
        self._accounts: dict[UUID, ChartOfAccount] = {}
        self._periods: dict[UUID, FiscalPeriod] = {}
        self._vouchers: dict[UUID, JournalVoucher] = {}
        self._idempotency: dict[tuple[UUID, UUID], UUID] = {}
        self._sequences: dict[tuple[UUID, int], int] = {}

    @contextmanager
    def transaction(self) -> Iterator[None]:
        """Acquire lock and roll back in-memory maps cleanly if an exception escapes."""
        with self._lock:
            accounts_snap = dict(self._accounts)
            periods_snap = dict(self._periods)
            vouchers_snap = dict(self._vouchers)
            idempotency_snap = dict(self._idempotency)
            sequences_snap = dict(self._sequences)
            try:
                yield
            except Exception:
                self._accounts = accounts_snap
                self._periods = periods_snap
                self._vouchers = vouchers_snap
                self._idempotency = idempotency_snap
                self._sequences = sequences_snap
                raise

    def seed_account(self, account: ChartOfAccount) -> None:
        """Insert or update a ChartOfAccount fixture."""
        with self._lock:
            self._accounts[account.id] = account

    def seed_period(self, period: FiscalPeriod) -> None:
        """Insert or update a FiscalPeriod fixture."""
        with self._lock:
            self._periods[period.id] = period

    def find_account(self, workspace_id: UUID, account_id: UUID) -> ChartOfAccount:
        with self._lock:
            account = self._accounts.get(account_id)
            if account is None:
                raise ValidationError(
                    f"Account {account_id} does not exist.",
                    field="lines",
                )
            if account.workspace_id != workspace_id:
                raise CrossTenantAccessError(
                    f"Account {account_id} does not belong to the active workspace."
                )
            return account

    def list_accounts(
        self,
        workspace_id: UUID,
        *,
        category: AccountCategory | None = None,
        active_only: bool = True,
    ) -> list[ChartOfAccount]:
        with self._lock:
            items = [
                acct
                for acct in self._accounts.values()
                if acct.workspace_id == workspace_id
                and (not active_only or acct.is_active)
                and (category is None or acct.category is category)
            ]
            return sorted(items, key=lambda acct: acct.code)

    def find_period(self, workspace_id: UUID, period_id: UUID) -> FiscalPeriod:
        with self._lock:
            period = self._periods.get(period_id)
            if period is None:
                raise ValidationError(
                    f"Fiscal period {period_id} does not exist.",
                    field="fiscalPeriodId",
                )
            if period.workspace_id != workspace_id:
                raise CrossTenantAccessError(
                    f"Fiscal period {period_id} does not belong to the active workspace."
                )
            return period

    def find_period_for_date(self, workspace_id: UUID, target_date: date) -> FiscalPeriod | None:
        with self._lock:
            matches = [
                period
                for period in self._periods.values()
                if period.workspace_id == workspace_id and period.contains(target_date)
            ]
            return matches[0] if matches else None

    def list_periods(self, workspace_id: UUID) -> list[FiscalPeriod]:
        with self._lock:
            items = [p for p in self._periods.values() if p.workspace_id == workspace_id]
            return sorted(items, key=lambda period: period.start_date)

    def close_period_cama(
        self,
        workspace_id: UUID,
        period_id: UUID,
        frc_reg_number: str,
    ) -> FiscalPeriod:
        with self._lock:
            period = self.find_period(workspace_id, period_id)
            closed = period.close_cama_certified(frc_reg_number)
            self._periods[period.id] = closed
            return closed

    def find_voucher_by_idempotency_key(
        self, workspace_id: UUID, idempotency_key: UUID
    ) -> JournalVoucher | None:
        with self._lock:
            voucher_id = self._idempotency.get((workspace_id, idempotency_key))
            if voucher_id is None:
                return None
            return self._vouchers.get(voucher_id)

    def find_voucher_by_id(self, workspace_id: UUID, voucher_id: UUID) -> JournalVoucher:
        with self._lock:
            voucher = self._vouchers.get(voucher_id)
            if voucher is None:
                raise ValidationError(
                    f"Journal voucher {voucher_id} does not exist.",
                    field="voucherId",
                )
            if voucher.workspace_id != workspace_id:
                raise CrossTenantAccessError(
                    f"Journal voucher {voucher_id} does not belong to the active workspace."
                )
            return voucher

    def next_voucher_number(self, workspace_id: UUID, posting_year: int) -> str:
        with self._lock:
            key = (workspace_id, posting_year)
            seq = self._sequences.get(key, 0) + 1
            self._sequences[key] = seq
            return f"JV-{posting_year}-{seq:04d}"

    def save_voucher(self, voucher: JournalVoucher) -> None:
        with self._lock:
            existing = self._vouchers.get(voucher.id)
            if existing is not None:
                raise ImmutableVoucherError(existing.id, existing.status.value)
            self._vouchers[voucher.id] = voucher
            self._idempotency[(voucher.workspace_id, voucher.idempotency_key)] = voucher.id

    def mark_voucher_reversed(
        self,
        workspace_id: UUID,
        original_voucher_id: UUID,
        reversal_voucher_id: UUID,
    ) -> JournalVoucher:
        with self._lock:
            original = self.find_voucher_by_id(workspace_id, original_voucher_id)
            updated = original.mark_reversed(reversal_voucher_id)
            self._vouchers[original.id] = updated
            return updated

    def list_vouchers(
        self,
        workspace_id: UUID,
        *,
        status: VoucherStatus | None = None,
        from_date: date | None = None,
        to_date: date | None = None,
    ) -> list[JournalVoucher]:
        with self._lock:
            items = [
                v
                for v in self._vouchers.values()
                if v.workspace_id == workspace_id
                and (status is None or v.status is status)
                and (from_date is None or v.posting_date >= from_date)
                and (to_date is None or v.posting_date <= to_date)
            ]
            return sorted(
                items,
                key=lambda v: (v.posting_date, v.created_at, v.voucher_number),
                reverse=True,
            )


def create_seeded_demo_store(
    *,
    workspace_id: UUID,
    actor_user_id: UUID,
) -> InMemoryLedgerStore:
    """Seed realistic Nigerian SME accounts, fiscal periods, and opening entry."""
    store = InMemoryLedgerStore()
    accounts = [
        ChartOfAccount(
            id=UUID("11111111-1111-4111-8111-111111110101"),
            workspace_id=workspace_id,
            code="1010",
            name="Zenith Bank Current (NGN)",
            category=AccountCategory.ASSET,
            ifrs_tag="CASH_AND_CASH_EQUIVALENTS",
            source_primitive="BOOKKEEPING_AND_LEDGER",
            is_system_locked=True,
        ),
        ChartOfAccount(
            id=UUID("11111111-1111-4111-8111-111111110102"),
            workspace_id=workspace_id,
            code="1020",
            name="Access Bank Domiciliary (USD)",
            category=AccountCategory.ASSET,
            ifrs_tag="CASH_AND_CASH_EQUIVALENTS",
            source_primitive="MULTI_CURRENCY_AND_FX",
            is_system_locked=False,
        ),
        ChartOfAccount(
            id=UUID("11111111-1111-4111-8111-111111110201"),
            workspace_id=workspace_id,
            code="2010",
            name="NRS Output VAT Payable (7.5%)",
            category=AccountCategory.LIABILITY,
            ifrs_tag="TAX_LIABILITIES",
            source_primitive="TAX_AND_STATUTORY",
            is_system_locked=True,
        ),
        ChartOfAccount(
            id=UUID("11111111-1111-4111-8111-111111110301"),
            workspace_id=workspace_id,
            code="3010",
            name="Owner Share Capital",
            category=AccountCategory.EQUITY,
            ifrs_tag="ISSUED_CAPITAL",
            source_primitive="BOOKKEEPING_AND_LEDGER",
            is_system_locked=True,
        ),
        ChartOfAccount(
            id=UUID("11111111-1111-4111-8111-111111110401"),
            workspace_id=workspace_id,
            code="4010",
            name="Lagos Retail & Supply Revenue",
            category=AccountCategory.REVENUE,
            ifrs_tag="REVENUE_FROM_CONTRACTS",
            source_primitive="INVOICES_AND_RECEIVABLES",
            is_system_locked=False,
        ),
        ChartOfAccount(
            id=UUID("11111111-1111-4111-8111-111111110501"),
            workspace_id=workspace_id,
            code="5010",
            name="Logistics & Diesel Power Expense",
            category=AccountCategory.EXPENSE,
            ifrs_tag="ADMINISTRATIVE_EXPENSES",
            source_primitive="BILLS_AND_EXPENSES",
            is_system_locked=False,
        ),
    ]
    for acct in accounts:
        store.seed_account(acct)

    closed_period = FiscalPeriod(
        id=UUID("22222222-2222-4222-8222-222222220001"),
        workspace_id=workspace_id,
        label="FY2025",
        start_date=date(2025, 1, 1),
        end_date=date(2025, 12, 31),
        status=PeriodStatus.CLOSED_CAMA_CERTIFIED,
        cama_certification="FRC/2025/004192",
    )
    open_period = FiscalPeriod(
        id=UUID("22222222-2222-4222-8222-222222220002"),
        workspace_id=workspace_id,
        label="FY2026",
        start_date=date(2026, 1, 1),
        end_date=date(2026, 12, 31),
        status=PeriodStatus.OPEN,
    )
    store.seed_period(closed_period)
    store.seed_period(open_period)

    opening = JournalVoucher.post(
        workspace_id=workspace_id,
        fiscal_period_id=open_period.id,
        idempotency_key=UUID("33333333-3333-4333-8333-333333330001"),
        voucher_number=store.next_voucher_number(workspace_id, 2026),
        posting_date=date(2026, 1, 5),
        reference="CAP-OPEN-2026",
        source_module="GENERAL_LEDGER",
        created_by_user_id=actor_user_id,
        lines=[
            (
                accounts[0].id,
                accounts[0].code,
                accounts[0].name,
                JournalLineInput(
                    account_id=accounts[0].id,
                    debit_amount=Decimal("2500000.00"),
                    currency=CurrencyCode.NGN,
                    memo="Opening working capital deposit",
                ),
            ),
            (
                accounts[3].id,
                accounts[3].code,
                accounts[3].name,
                JournalLineInput(
                    account_id=accounts[3].id,
                    credit_amount=Decimal("2500000.00"),
                    currency=CurrencyCode.NGN,
                    memo="Share capital paid-in",
                ),
            ),
        ],
        voucher_id=uuid4(),
    )
    store.save_voucher(opening)
    return store
