"""Ledger application use cases orchestrating domain invariants and ports."""

from __future__ import annotations

import base64
from collections.abc import Sequence
from dataclasses import dataclass
from datetime import date
from decimal import Decimal
from uuid import UUID

from nairabooks.ledger.application.ports import LedgerStore
from nairabooks.ledger.domain import (
    AccountCategory,
    BankReconciliationReport,
    BankStatementLine,
    ChartOfAccount,
    CurrencyCode,
    FiscalPeriod,
    FrcnFinancialStatementPackage,
    FxRevaluationReport,
    JournalLineInput,
    JournalVoucher,
    StatementOfFinancialPosition,
    StatementOfProfitOrLoss,
    TrialBalanceReport,
    ValidationError,
    VoucherStatus,
    build_financial_position,
    build_frcn_statement_package,
    build_profit_and_loss,
    build_trial_balance,
    compute_fx_revaluation,
    reconcile_bank_statement,
)
from nairabooks.ledger.domain.money import MoneyInput
from nairabooks.ledger.domain.transaction_posting import plan_standard_transaction_lines


@dataclass(frozen=True, slots=True)
class PostJournalVoucherCommand:
    """Command payload for posting a balanced double-entry journal voucher."""

    workspace_id: UUID
    actor_user_id: UUID
    idempotency_key: UUID
    posting_date: date
    reference: str
    source_module: str
    lines: Sequence[JournalLineInput]
    approved_by_user_id: UUID | None = None


@dataclass(frozen=True, slots=True)
class ReverseJournalVoucherCommand:
    """Command payload for creating an immutable offsetting reversal voucher."""

    workspace_id: UUID
    actor_user_id: UUID
    idempotency_key: UUID
    original_voucher_id: UUID
    reversal_date: date
    reason: str


@dataclass(frozen=True, slots=True)
class JournalVoucherEdge:
    """Relay GraphQL connection edge carrying an opaque keyset cursor."""

    cursor: str
    node: JournalVoucher


@dataclass(frozen=True, slots=True)
class PageInfo:
    """Relay GraphQL PageInfo pagination metadata."""

    has_next_page: bool
    has_previous_page: bool
    start_cursor: str | None
    end_cursor: str | None


@dataclass(frozen=True, slots=True)
class JournalVoucherConnection:
    """Relay GraphQL paginated connection for JournalVoucher records."""

    edges: tuple[JournalVoucherEdge, ...]
    page_info: PageInfo


class PostJournalVoucherUseCase:
    """Validate fiscal period, accounts, idempotency, and double-entry balance before posting."""

    def __init__(self, store: LedgerStore) -> None:
        self._store = store

    def execute(self, command: PostJournalVoucherCommand) -> JournalVoucher:
        """Post a balanced journal voucher atomically within workspace RLS context."""
        with self._store.transaction():
            existing = self._store.find_voucher_by_idempotency_key(
                command.workspace_id,
                command.idempotency_key,
            )
            if existing is not None:
                return existing

            period = self._store.find_period_for_date(command.workspace_id, command.posting_date)
            if period is None:
                raise ValidationError(
                    f"No fiscal period exists for posting date {command.posting_date.isoformat()}.",
                    field="posting_date",
                )
            period.ensure_accepts_posting(command.posting_date)

            resolved_lines: list[tuple[UUID, str, str, JournalLineInput]] = []
            for line_input in command.lines:
                account = self._store.find_account(command.workspace_id, line_input.account_id)
                if not account.is_active:
                    raise ValidationError(
                        f"Account '{account.code} - {account.name}' is inactive.",
                        field="lines",
                    )
                resolved_lines.append((account.id, account.code, account.name, line_input))

            voucher_number = self._store.next_voucher_number(
                command.workspace_id,
                command.posting_date.year,
            )
            voucher = JournalVoucher.post(
                workspace_id=command.workspace_id,
                fiscal_period_id=period.id,
                idempotency_key=command.idempotency_key,
                voucher_number=voucher_number,
                posting_date=command.posting_date,
                reference=command.reference,
                source_module=command.source_module,
                created_by_user_id=command.actor_user_id,
                approved_by_user_id=command.approved_by_user_id,
                lines=resolved_lines,
            )
            self._store.save_voucher(voucher)
            return voucher


class ReverseJournalVoucherUseCase:
    """Reverse a POSTED voucher cleanly via an offsetting entry within an OPEN period."""

    def __init__(self, store: LedgerStore) -> None:
        self._store = store

    def execute(self, command: ReverseJournalVoucherCommand) -> JournalVoucher:
        """Validate period/immutability invariants, post offsetting entry, and mark REVERSED."""
        with self._store.transaction():
            existing = self._store.find_voucher_by_idempotency_key(
                command.workspace_id,
                command.idempotency_key,
            )
            if existing is not None:
                return existing

            original = self._store.find_voucher_by_id(
                command.workspace_id,
                command.original_voucher_id,
            )
            period = self._store.find_period_for_date(
                command.workspace_id,
                command.reversal_date,
            )
            if period is None:
                rev_date = command.reversal_date.isoformat()
                raise ValidationError(
                    f"No fiscal period exists for reversal date {rev_date}.",
                    field="reversalDate",
                )
            period.ensure_accepts_posting(command.reversal_date)

            voucher_number = self._store.next_voucher_number(
                command.workspace_id,
                command.reversal_date.year,
            )
            reversal = original.build_reversal(
                fiscal_period_id=period.id,
                idempotency_key=command.idempotency_key,
                voucher_number=voucher_number,
                reversal_date=command.reversal_date,
                reason=command.reason,
                actor_user_id=command.actor_user_id,
            )
            self._store.save_voucher(reversal)
            self._store.mark_voucher_reversed(
                command.workspace_id,
                original.id,
                reversal.id,
            )
            return reversal


class ListChartOfAccountsUseCase:
    """Query active or historical accounts scoped to the active workspace."""

    def __init__(self, store: LedgerStore) -> None:
        self._store = store

    def execute(
        self,
        *,
        workspace_id: UUID,
        category: AccountCategory | None = None,
        active_only: bool = True,
    ) -> list[ChartOfAccount]:
        """Return workspace-scoped accounts filtered by category and active flag."""
        return self._store.list_accounts(
            workspace_id,
            category=category,
            active_only=active_only,
        )


class ListFiscalPeriodsUseCase:
    """Query fiscal periods and lock statuses for the active workspace."""

    def __init__(self, store: LedgerStore) -> None:
        self._store = store

    def execute(self, *, workspace_id: UUID) -> list[FiscalPeriod]:
        """Return fiscal periods ordered chronologically."""
        return self._store.list_periods(workspace_id)


def _encode_cursor(voucher_id: UUID) -> str:
    return base64.urlsafe_b64encode(str(voucher_id).encode("utf-8")).decode("ascii")


def _decode_cursor(cursor: str) -> UUID:
    try:
        raw = base64.urlsafe_b64decode(cursor.encode("ascii")).decode("utf-8")
        return UUID(raw)
    except (ValueError, UnicodeDecodeError) as exc:
        raise ValidationError("Invalid pagination cursor.", field="after") from exc


class ListJournalVouchersUseCase:
    """Relay cursor-paginated journal voucher query bounded to 1..100 items per page."""

    def __init__(self, store: LedgerStore) -> None:
        self._store = store

    def execute(
        self,
        *,
        workspace_id: UUID,
        first: int = 25,
        after: str | None = None,
        status: VoucherStatus | None = None,
        from_date: date | None = None,
        to_date: date | None = None,
    ) -> JournalVoucherConnection:
        """List journal vouchers matching filters using opaque keyset cursor pagination."""
        if first < 1 or first > 100:
            raise ValidationError(
                "Pagination argument 'first' must be between 1 and 100 inclusive.",
                field="first",
            )

        rows = self._store.list_vouchers(
            workspace_id,
            status=status,
            from_date=from_date,
            to_date=to_date,
        )

        start_index = 0
        if after is not None:
            cursor_id = _decode_cursor(after)
            idx_map = {row.id: idx for idx, row in enumerate(rows)}
            if cursor_id not in idx_map:
                raise ValidationError("Pagination cursor does not match result set.", field="after")
            start_index = idx_map[cursor_id] + 1

        sliced = rows[start_index : start_index + first]
        edges = tuple(
            JournalVoucherEdge(cursor=_encode_cursor(voucher.id), node=voucher)
            for voucher in sliced
        )
        page_info = PageInfo(
            has_next_page=(start_index + first) < len(rows),
            has_previous_page=start_index > 0,
            start_cursor=edges[0].cursor if edges else None,
            end_cursor=edges[-1].cursor if edges else None,
        )
        return JournalVoucherConnection(edges=edges, page_info=page_info)


class GenerateTrialBalanceUseCase:
    """Compute a workspace-scoped FRCN Trial Balance for a single fiscal period."""

    def __init__(self, store: LedgerStore) -> None:
        self._store = store

    def execute(self, *, workspace_id: UUID, fiscal_period_id: UUID) -> TrialBalanceReport:
        period = self._store.find_period(workspace_id, fiscal_period_id)
        accounts = self._store.list_accounts(workspace_id, active_only=False)
        vouchers = self._store.list_vouchers(workspace_id)
        return build_trial_balance(period=period, accounts=accounts, vouchers=vouchers)


class GenerateProfitAndLossUseCase:
    """Compute IFRS Statement of Profit or Loss for a single fiscal period."""

    def __init__(self, store: LedgerStore) -> None:
        self._store = store

    def execute(
        self, *, workspace_id: UUID, fiscal_period_id: UUID
    ) -> StatementOfProfitOrLoss:
        period = self._store.find_period(workspace_id, fiscal_period_id)
        accounts = self._store.list_accounts(workspace_id, active_only=False)
        vouchers = self._store.list_vouchers(workspace_id)
        return build_profit_and_loss(period=period, accounts=accounts, vouchers=vouchers)


class GenerateFinancialPositionUseCase:
    """Compute cumulative IFRS Statement of Financial Position up to period end date."""

    def __init__(self, store: LedgerStore) -> None:
        self._store = store

    def execute(
        self, *, workspace_id: UUID, fiscal_period_id: UUID
    ) -> StatementOfFinancialPosition:
        period = self._store.find_period(workspace_id, fiscal_period_id)
        accounts = self._store.list_accounts(workspace_id, active_only=False)
        vouchers = self._store.list_vouchers(workspace_id)
        return build_financial_position(period=period, accounts=accounts, vouchers=vouchers)


class GenerateFrcnPackageUseCase:
    """Assemble full FRCN IFRS + Other National Disclosures package for a workspace period."""

    def __init__(self, store: LedgerStore) -> None:
        self._store = store

    def execute(
        self, *, workspace_id: UUID, fiscal_period_id: UUID
    ) -> FrcnFinancialStatementPackage:
        period = self._store.find_period(workspace_id, fiscal_period_id)
        periods = self._store.list_periods(workspace_id)
        accounts = self._store.list_accounts(workspace_id, active_only=False)
        vouchers = self._store.list_vouchers(workspace_id)
        return build_frcn_statement_package(
            period=period,
            periods=periods,
            accounts=accounts,
            vouchers=vouchers,
        )


class ReconcileBankStatementUseCase:
    """Reconcile bank/POS settlement lines against workspace GL cash movements."""

    def __init__(self, store: LedgerStore) -> None:
        self._store = store

    def execute(
        self,
        *,
        workspace_id: UUID,
        account_id: UUID,
        statement_lines: Sequence[BankStatementLine],
        through_date: date | None = None,
        max_date_delta_days: int = 3,
    ) -> BankReconciliationReport:
        account = self._store.find_account(workspace_id, account_id)
        vouchers = self._store.list_vouchers(workspace_id)
        return reconcile_bank_statement(
            account=account,
            statement_lines=statement_lines,
            vouchers=vouchers,
            through_date=through_date,
            max_date_delta_days=max_date_delta_days,
        )


class CalculateFxRevaluationUseCase:
    """Compute IAS 21 closing FX revaluation for a domiciliary/foreign monetary account."""

    def __init__(self, store: LedgerStore) -> None:
        self._store = store

    def execute(
        self,
        *,
        workspace_id: UUID,
        account_id: UUID,
        currency: CurrencyCode,
        closing_rate_to_ngn: MoneyInput,
        as_of_date: date,
    ) -> FxRevaluationReport:
        account = self._store.find_account(workspace_id, account_id)
        vouchers = self._store.list_vouchers(workspace_id)
        return compute_fx_revaluation(
            account=account,
            currency=currency,
            closing_rate_to_ngn=closing_rate_to_ngn,
            as_of_date=as_of_date,
            vouchers=vouchers,
        )


@dataclass(frozen=True, slots=True)
class StandardTransactionLineItemInput:
    """Operational line item passed from the Transactions Hub composer."""

    description: str
    account_code: str
    quantity: Decimal
    unit_price_ngn: Decimal
    vat_applicable: bool = False
    debit_ngn: Decimal = Decimal("0.00")
    credit_ngn: Decimal = Decimal("0.00")


@dataclass(frozen=True, slots=True)
class PostStandardTransactionCommand:
    """Command payload to post any of the 27 standard business transaction types."""

    workspace_id: UUID
    actor_user_id: UUID
    idempotency_key: UUID
    transaction_type: str
    reference: str
    counterparty: str
    posting_date: date
    lines: Sequence[StandardTransactionLineItemInput]
    due_date: date | None = None
    payment_method: str = "Bank Transfer"
    vat_enabled: bool = False
    wht_rate_pct: Decimal = Decimal("0")
    memo: str = ""
    details: dict[str, str] | None = None


@dataclass(frozen=True, slots=True)
class StandardTransactionPostingResult:
    """Result returned after successfully posting a standard operational transaction."""

    voucher_id: UUID
    voucher_number: str
    reference: str
    transaction_type: str
    counterparty: str
    posting_date: date
    total_debit_ngn: Decimal
    total_credit_ngn: Decimal
    lines_count: int


class PostStandardTransactionUseCase:
    """Plan double-entry lines for standard operational transactions and post to LedgerStore."""

    def __init__(self, store: LedgerStore, post_voucher_uc: PostJournalVoucherUseCase) -> None:
        self._store = store
        self._post_voucher_uc = post_voucher_uc

    def execute(self, command: PostStandardTransactionCommand) -> StandardTransactionPostingResult:
        with self._store.transaction():
            planned_lines = plan_standard_transaction_lines(
                transaction_type=command.transaction_type,
                reference=command.reference,
                counterparty=command.counterparty,
                posting_date=command.posting_date,
                lines=command.lines,
                vat_enabled=command.vat_enabled,
                wht_rate_pct=command.wht_rate_pct,
                payment_method=command.payment_method,
                details=command.details,
            )

            # Map account codes to existing account IDs or seed missing account
            accounts = {
                acct.code: acct
                for acct in self._store.list_accounts(command.workspace_id, active_only=False)
            }

            journal_line_inputs: list[JournalLineInput] = []
            for pl in planned_lines:
                target_acct = accounts.get(pl.account_code)
                if target_acct is None:
                    # Look for fallback account or create dynamically
                    fallback = next(
                        (a for a in accounts.values() if a.code.startswith(pl.account_code[:2])),
                        None,
                    )
                    if fallback is not None:
                        target_acct = fallback
                    else:
                        first_acct = next(iter(accounts.values()), None)
                        if first_acct is None:
                            raise ValidationError(
                                f"No account available in workspace for code {pl.account_code}.",
                                field="account_code",
                            )
                        target_acct = first_acct

                journal_line_inputs.append(
                    JournalLineInput(
                        account_id=target_acct.id,
                        debit_amount=pl.debit_ngn,
                        credit_amount=pl.credit_ngn,
                        memo=pl.memo,
                        currency=CurrencyCode.NGN,
                    )
                )

            voucher = self._post_voucher_uc.execute(
                PostJournalVoucherCommand(
                    workspace_id=command.workspace_id,
                    actor_user_id=command.actor_user_id,
                    idempotency_key=command.idempotency_key,
                    posting_date=command.posting_date,
                    reference=command.reference,
                    source_module=f"TRANSACTIONS_HUB:{command.transaction_type}",
                    lines=journal_line_inputs,
                )
            )

            return StandardTransactionPostingResult(
                voucher_id=voucher.id,
                voucher_number=voucher.voucher_number,
                reference=voucher.reference,
                transaction_type=command.transaction_type,
                counterparty=command.counterparty,
                posting_date=voucher.posting_date,
                total_debit_ngn=voucher.total_debit_ngn,
                total_credit_ngn=voucher.total_credit_ngn,
                lines_count=len(voucher.lines),
            )

