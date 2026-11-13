"""Parameterized PostgreSQL 18 SQL statement builders with RLS GUC scoping."""

from __future__ import annotations

from datetime import date
from uuid import UUID

from nairabooks.ledger.domain import (
    AccountCategory,
    JournalVoucher,
    VoucherStatus,
)


class PostgresLedgerSqlBuilder:
    """Build parameterized SQL aligned with migrations 0001 and 0002 (zero interpolation)."""

    @staticmethod
    def set_workspace_context(workspace_id: UUID) -> tuple[str, tuple[str]]:
        """Bind transaction-local RLS tenant variable app.current_workspace_id."""
        return (
            "SELECT set_config('app.current_workspace_id', %s, true);",
            (str(workspace_id),),
        )

    @staticmethod
    def select_accounts(
        workspace_id: UUID,
        *,
        category: AccountCategory | None = None,
        active_only: bool = True,
    ) -> tuple[str, tuple[object, ...]]:
        """Build parameterized Chart of Accounts query."""
        clauses = ["workspace_id = %s"]
        params: list[object] = [str(workspace_id)]
        if active_only:
            clauses.append("is_active = %s")
            params.append(True)
        if category is not None:
            clauses.append("category = %s")
            params.append(category.value)
        sql = (
            "SELECT id, workspace_id, code, name, category, ifrs_tag, "
            "source_primitive, is_system_locked, is_active "
            "FROM chart_of_accounts "
            f"WHERE {' AND '.join(clauses)} "
            "ORDER BY code ASC;"
        )
        return sql, tuple(params)

    @staticmethod
    def select_vouchers_keyset(
        workspace_id: UUID,
        *,
        first: int,
        status: VoucherStatus | None = None,
        from_date: date | None = None,
        to_date: date | None = None,
    ) -> tuple[str, tuple[object, ...]]:
        """Build parameterized journal voucher query bounded by LIMIT."""
        clauses = ["workspace_id = %s"]
        params: list[object] = [str(workspace_id)]
        if status is not None:
            clauses.append("status = %s")
            params.append(status.value)
        if from_date is not None:
            clauses.append("posting_date >= %s")
            params.append(from_date.isoformat())
        if to_date is not None:
            clauses.append("posting_date <= %s")
            params.append(to_date.isoformat())
        params.append(first)
        sql = (
            "SELECT id, workspace_id, fiscal_period_id, idempotency_key, voucher_number, "
            "posting_date, status, reference, source_module, total_debit_ngn, total_credit_ngn, "
            "created_by_user_id, approved_by_user_id, reversed_by_voucher_id, created_at "
            "FROM journal_vouchers "
            f"WHERE {' AND '.join(clauses)} "
            "ORDER BY posting_date DESC, created_at DESC, id DESC "
            "LIMIT %s;"
        )
        return sql, tuple(params)

    @staticmethod
    def insert_voucher(voucher: JournalVoucher) -> tuple[str, tuple[object, ...]]:
        """Build parameterized INSERT for an immutable posted journal voucher header."""
        sql = (
            "INSERT INTO journal_vouchers ("
            "id, workspace_id, fiscal_period_id, idempotency_key, voucher_number, "
            "posting_date, status, reference, source_module, total_debit_ngn, total_credit_ngn, "
            "created_by_user_id, approved_by_user_id, reversed_by_voucher_id, created_at"
            ") VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s);"
        )
        params: tuple[object, ...] = (
            str(voucher.id),
            str(voucher.workspace_id),
            str(voucher.fiscal_period_id),
            str(voucher.idempotency_key),
            voucher.voucher_number,
            voucher.posting_date.isoformat(),
            voucher.status.value,
            voucher.reference,
            voucher.source_module,
            str(voucher.total_debit_ngn),
            str(voucher.total_credit_ngn),
            str(voucher.created_by_user_id),
            str(voucher.approved_by_user_id) if voucher.approved_by_user_id else None,
            str(voucher.reversed_by_voucher_id) if voucher.reversed_by_voucher_id else None,
            voucher.created_at.isoformat(),
        )
        return sql, params

    @staticmethod
    def mark_voucher_reversed(
        workspace_id: UUID,
        original_voucher_id: UUID,
        reversal_voucher_id: UUID,
    ) -> tuple[str, tuple[str, str, str]]:
        """Build parameterized UPDATE transitioning POSTED voucher to REVERSED."""
        sql = (
            "UPDATE journal_vouchers "
            "SET status = 'REVERSED', reversed_by_voucher_id = %s "
            "WHERE workspace_id = %s AND id = %s AND status = 'POSTED';"
        )
        return sql, (str(reversal_voucher_id), str(workspace_id), str(original_voucher_id))

    @staticmethod
    def close_fiscal_period_cama(
        workspace_id: UUID, period_id: UUID
    ) -> tuple[str, tuple[str, str]]:
        """Build parameterized UPDATE closing fiscal_periods as CLOSED_CAMA_CERTIFIED."""
        sql = (
            "UPDATE fiscal_periods "
            "SET status = 'CLOSED_CAMA_CERTIFIED', updated_at = now() "
            "WHERE workspace_id = %s AND id = %s AND status <> 'CLOSED_CAMA_CERTIFIED';"
        )
        return sql, (str(workspace_id), str(period_id))
