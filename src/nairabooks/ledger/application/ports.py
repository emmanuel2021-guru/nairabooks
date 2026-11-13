"""Hexagonal output ports for the NairaBooks IFRS ledger application layer."""

from __future__ import annotations

from collections.abc import Iterator
from contextlib import AbstractContextManager
from datetime import date
from typing import Protocol
from uuid import UUID

from nairabooks.ledger.domain import (
    AccountCategory,
    ChartOfAccount,
    FiscalPeriod,
    JournalVoucher,
    VoucherStatus,
)


class LedgerStore(Protocol):
    """Transactional persistence port scoped strictly by workspace_id."""

    def transaction(self) -> AbstractContextManager[None]:
        """Begin an atomic transaction unit of work with workspace isolation."""

    def find_account(self, workspace_id: UUID, account_id: UUID) -> ChartOfAccount:
        """Fetch an account or raise CrossTenantAccessError / ValidationError."""

    def seed_account(self, account: ChartOfAccount) -> None:
        """Insert or update a ChartOfAccount entry scoped to workspace_id."""

    def list_accounts(
        self,
        workspace_id: UUID,
        *,
        category: AccountCategory | None = None,
        active_only: bool = True,
    ) -> list[ChartOfAccount]:
        """Return ordered chart of accounts rows for the active workspace."""

    def find_period(self, workspace_id: UUID, period_id: UUID) -> FiscalPeriod:
        """Fetch a fiscal period owned by workspace_id or raise error."""

    def find_period_for_date(self, workspace_id: UUID, target_date: date) -> FiscalPeriod | None:
        """Return the fiscal period covering target_date within the active workspace."""

    def list_periods(self, workspace_id: UUID) -> list[FiscalPeriod]:
        """Return ordered fiscal periods for the active workspace."""

    def close_period_cama(
        self,
        workspace_id: UUID,
        period_id: UUID,
        frc_reg_number: str,
    ) -> FiscalPeriod:
        """Certify and close a fiscal period under CAMA 2020 Section 405."""

    def find_voucher_by_idempotency_key(
        self, workspace_id: UUID, idempotency_key: UUID
    ) -> JournalVoucher | None:
        """Look up an existing posted/reversed voucher for retry deduplication."""

    def find_voucher_by_id(self, workspace_id: UUID, voucher_id: UUID) -> JournalVoucher:
        """Fetch a voucher owned by workspace_id or raise CrossTenantAccessError/ValidationError."""

    def next_voucher_number(self, workspace_id: UUID, posting_year: int) -> str:
        """Allocate the next sequential JV-YYYY-NNNN voucher number."""

    def save_voucher(self, voucher: JournalVoucher) -> None:
        """Persist a new immutable posted voucher atomically."""

    def mark_voucher_reversed(
        self,
        workspace_id: UUID,
        original_voucher_id: UUID,
        reversal_voucher_id: UUID,
    ) -> JournalVoucher:
        """Transition a POSTED voucher to REVERSED and record its offsetting voucher ID."""

    def list_vouchers(
        self,
        workspace_id: UUID,
        *,
        status: VoucherStatus | None = None,
        from_date: date | None = None,
        to_date: date | None = None,
    ) -> list[JournalVoucher]:
        """Return workspace vouchers filtered and ordered newest-first."""


LedgerUnitOfWork = LedgerStore


def iter_empty_context() -> Iterator[None]:
    """Yield helper used by in-memory transaction helpers."""
    yield
