"""Tests for standard operational business transaction posting into the IFRS general ledger."""

from __future__ import annotations

import json
from datetime import date
from decimal import Decimal
from uuid import UUID, uuid4

import pytest

from nairabooks.api.app import LedgerApiApplication
from nairabooks.ledger.adapters.in_memory import InMemoryLedgerStore, create_seeded_demo_store
from nairabooks.ledger.application.use_cases import (
    PostJournalVoucherUseCase,
    PostStandardTransactionCommand,
    PostStandardTransactionUseCase,
    StandardTransactionLineItemInput,
)
from nairabooks.ledger.domain import (
    AccountCategory,
    ChartOfAccount,
    FiscalPeriod,
    PeriodStatus,
    ValidationError,
)
from nairabooks.ledger.domain.transaction_posting import (
    plan_standard_transaction_lines,
)


def _setup_test_ledger() -> tuple[
    InMemoryLedgerStore, UUID, UUID, FiscalPeriod, dict[str, ChartOfAccount]
]:
    workspace_id = uuid4()
    actor_id = uuid4()
    store = InMemoryLedgerStore()

    accounts = {
        "1010": ChartOfAccount(
            id=uuid4(),
            workspace_id=workspace_id,
            code="1010",
            name="Zenith Bank Current",
            category=AccountCategory.ASSET,
            ifrs_tag="CASH_AND_CASH_EQUIVALENTS",
            source_primitive="BOOKKEEPING_AND_LEDGER",
            is_system_locked=True,
        ),
        "1120": ChartOfAccount(
            id=uuid4(),
            workspace_id=workspace_id,
            code="1120",
            name="Trade Receivables / Debtors",
            category=AccountCategory.ASSET,
            ifrs_tag="TRADE_AND_OTHER_RECEIVABLES",
            source_primitive="INVOICES_AND_RECEIVABLES",
            is_system_locked=True,
        ),
        "1150": ChartOfAccount(
            id=uuid4(),
            workspace_id=workspace_id,
            code="1150",
            name="WHT Credit Notes Receivable",
            category=AccountCategory.ASSET,
            ifrs_tag="OTHER_CURRENT_ASSETS",
            source_primitive="TAX_AND_STATUTORY",
            is_system_locked=True,
        ),
        "1310": ChartOfAccount(
            id=uuid4(),
            workspace_id=workspace_id,
            code="1310",
            name="Merchandise Inventory on Hand",
            category=AccountCategory.ASSET,
            ifrs_tag="INVENTORIES",
            source_primitive="INVENTORY_AND_STOCK",
            is_system_locked=False,
        ),
        "2010": ChartOfAccount(
            id=uuid4(),
            workspace_id=workspace_id,
            code="2010",
            name="NRS Output VAT Payable (7.5%)",
            category=AccountCategory.LIABILITY,
            ifrs_tag="TAX_LIABILITIES",
            source_primitive="TAX_AND_STATUTORY",
            is_system_locked=True,
        ),
        "2120": ChartOfAccount(
            id=uuid4(),
            workspace_id=workspace_id,
            code="2120",
            name="Trade Payables / Creditors",
            category=AccountCategory.LIABILITY,
            ifrs_tag="TRADE_AND_OTHER_PAYABLES",
            source_primitive="BILLS_AND_EXPENSES",
            is_system_locked=True,
        ),
        "2130": ChartOfAccount(
            id=uuid4(),
            workspace_id=workspace_id,
            code="2130",
            name="Withholding Tax (WHT) Payable",
            category=AccountCategory.LIABILITY,
            ifrs_tag="TAX_LIABILITIES",
            source_primitive="TAX_AND_STATUTORY",
            is_system_locked=True,
        ),
        "3010": ChartOfAccount(
            id=uuid4(),
            workspace_id=workspace_id,
            code="3010",
            name="Owner Share Capital",
            category=AccountCategory.EQUITY,
            ifrs_tag="ISSUED_CAPITAL",
            source_primitive="BOOKKEEPING_AND_LEDGER",
            is_system_locked=True,
        ),
        "4010": ChartOfAccount(
            id=uuid4(),
            workspace_id=workspace_id,
            code="4010",
            name="Sales Revenue",
            category=AccountCategory.REVENUE,
            ifrs_tag="REVENUE_FROM_CONTRACTS",
            source_primitive="INVOICES_AND_RECEIVABLES",
            is_system_locked=False,
        ),
        "5010": ChartOfAccount(
            id=uuid4(),
            workspace_id=workspace_id,
            code="5010",
            name="Cost of Goods & Operating Expense",
            category=AccountCategory.EXPENSE,
            ifrs_tag="COST_OF_SALES",
            source_primitive="BILLS_AND_EXPENSES",
            is_system_locked=False,
        ),
    }
    for acct in accounts.values():
        store.seed_account(acct)

    period = FiscalPeriod(
        id=uuid4(),
        workspace_id=workspace_id,
        label="October 2026",
        start_date=date(2026, 10, 1),
        end_date=date(2026, 10, 31),
        status=PeriodStatus.OPEN,
    )
    store.seed_period(period)

    return store, workspace_id, actor_id, period, accounts


def test_plan_sales_invoice_generates_balanced_ifrs_lines() -> None:
    """Sales invoice with 7.5% VAT and 5% WHT plans exact DR/CR lines."""
    lines = [
        StandardTransactionLineItemInput(
            description="Consulting & Advisory Services",
            account_code="4010",
            quantity=Decimal("1"),
            unit_price_ngn=Decimal("100000.00"),
            vat_applicable=True,
        )
    ]
    plan = plan_standard_transaction_lines(
        transaction_type="sales-invoicing",
        reference="INV-2026-001",
        counterparty="Dangote Refinery Ltd",
        posting_date=date(2026, 10, 15),
        lines=lines,
        vat_enabled=True,
        wht_rate_pct=Decimal("5"),
        payment_method="Bank Transfer",
    )

    total_dr = sum(line.debit_ngn for line in plan)
    total_cr = sum(line.credit_ngn for line in plan)
    assert total_dr == total_cr == Decimal("107500.00")

    # Revenue is credited 100,000
    rev_line = next(line for line in plan if line.account_code == "4010")
    assert rev_line.credit_ngn == Decimal("100000.00")

    # VAT Output (7.5%) is credited 7,500
    vat_line = next(line for line in plan if line.account_code == "2010")
    assert vat_line.credit_ngn == Decimal("7500.00")

    # WHT Credit Note Receivable (5% of 100k) is debited 5,000
    wht_line = next(line for line in plan if line.account_code == "1150")
    assert wht_line.debit_ngn == Decimal("5000.00")

    # Net Trade Receivable (107,500 - 5,000) is debited 102,500
    ar_line = next(line for line in plan if line.account_code == "1120")
    assert ar_line.debit_ngn == Decimal("102500.00")


def test_post_standard_transaction_use_case_commits_to_ledger() -> None:
    """Posting a standard transaction through use case commits a valid JournalVoucher."""
    store, workspace_id, actor_id, period, accounts = _setup_test_ledger()
    post_voucher_uc = PostJournalVoucherUseCase(store)
    use_case = PostStandardTransactionUseCase(store=store, post_voucher_uc=post_voucher_uc)

    cmd = PostStandardTransactionCommand(
        workspace_id=workspace_id,
        actor_user_id=actor_id,
        idempotency_key=uuid4(),
        transaction_type="sales-invoicing",
        reference="INV-2026-042",
        counterparty="Flutterwave Inc",
        posting_date=date(2026, 10, 20),
        due_date=date(2026, 11, 20),
        payment_method="Bank Transfer",
        vat_enabled=True,
        wht_rate_pct=Decimal("0"),
        memo="Q4 Tech Retainer",
        lines=[
            StandardTransactionLineItemInput(
                description="Software Architecture Retainer",
                account_code="4010",
                quantity=Decimal("1"),
                unit_price_ngn=Decimal("250000.00"),
                vat_applicable=True,
            )
        ],
    )

    result = use_case.execute(cmd)

    assert result.voucher_id is not None
    assert result.voucher_number.startswith("JV-2026-")
    assert result.total_debit_ngn == Decimal("268750.00")  # 250,000 + 7.5% VAT (18,750)
    assert result.total_credit_ngn == Decimal("268750.00")

    # Check voucher in store
    saved_voucher = store.find_voucher_by_id(workspace_id, result.voucher_id)
    assert saved_voucher.reference == "INV-2026-042"
    assert saved_voucher.source_module == "TRANSACTIONS_HUB:sales-invoicing"
    assert len(saved_voucher.lines) >= 2


def test_post_customer_receipt_reconciles_ar_and_bank() -> None:
    """Posting a customer receipt debits bank and credits accounts receivable."""
    store, workspace_id, actor_id, period, accounts = _setup_test_ledger()
    post_voucher_uc = PostJournalVoucherUseCase(store)
    use_case = PostStandardTransactionUseCase(store=store, post_voucher_uc=post_voucher_uc)

    cmd = PostStandardTransactionCommand(
        workspace_id=workspace_id,
        actor_user_id=actor_id,
        idempotency_key=uuid4(),
        transaction_type="receive-money",
        reference="REC-2026-009",
        counterparty="Dangote Refinery Ltd",
        posting_date=date(2026, 10, 22),
        payment_method="Zenith Bank Transfer",
        lines=[
            StandardTransactionLineItemInput(
                description="Receipt against INV-2026-001",
                account_code="1120",
                quantity=Decimal("1"),
                unit_price_ngn=Decimal("102500.00"),
                vat_applicable=False,
            )
        ],
    )

    result = use_case.execute(cmd)
    assert result.total_debit_ngn == Decimal("102500.00")
    assert result.total_credit_ngn == Decimal("102500.00")

    voucher = store.find_voucher_by_id(workspace_id, result.voucher_id)
    bank_line = next(line for line in voucher.lines if line.account_code == "1010")
    ar_line = next(line for line in voucher.lines if line.account_code == "1120")
    assert bank_line.debit.amount == Decimal("102500.00")
    assert ar_line.credit.amount == Decimal("102500.00")


def test_post_vendor_bill_with_vat_and_wht_credits_ap_and_wht_payable() -> None:
    """Posting a vendor bill debits expense, debits VAT, credits AP and WHT payable."""
    store, workspace_id, actor_id, period, accounts = _setup_test_ledger()
    post_voucher_uc = PostJournalVoucherUseCase(store)
    use_case = PostStandardTransactionUseCase(store=store, post_voucher_uc=post_voucher_uc)

    cmd = PostStandardTransactionCommand(
        workspace_id=workspace_id,
        actor_user_id=actor_id,
        idempotency_key=uuid4(),
        transaction_type="bills",
        reference="BILL-2026-101",
        counterparty="Mikano Power Generators Ltd",
        posting_date=date(2026, 10, 18),
        payment_method="Bank Transfer",
        vat_enabled=True,
        wht_rate_pct=Decimal("5"),
        lines=[
            StandardTransactionLineItemInput(
                description="Diesel Supply & Generator Maintenance",
                account_code="5010",
                quantity=Decimal("1"),
                unit_price_ngn=Decimal("200000.00"),
                vat_applicable=True,
            )
        ],
    )

    result = use_case.execute(cmd)
    # Total expense 200k + VAT 15k = 215k gross. WHT 5% of 200k = 10k. AP = 205k.
    assert result.total_debit_ngn == Decimal("215000.00")
    assert result.total_credit_ngn == Decimal("215000.00")

    voucher = store.find_voucher_by_id(workspace_id, result.voucher_id)
    exp_line = next(line for line in voucher.lines if line.account_code == "5010")
    vat_line = next(line for line in voucher.lines if line.account_code == "2010")
    wht_line = next(line for line in voucher.lines if line.account_code == "2130")
    ap_line = next(line for line in voucher.lines if line.account_code == "2120")

    assert exp_line.debit.amount == Decimal("200000.00")
    assert vat_line.debit.amount == Decimal("15000.00")
    assert wht_line.credit.amount == Decimal("10000.00")
    assert ap_line.credit.amount == Decimal("205000.00")


def test_post_general_journal_balanced_grid() -> None:
    """Posting a manual General Journal enforces strict debits equal credits."""
    store, workspace_id, actor_id, period, accounts = _setup_test_ledger()
    post_voucher_uc = PostJournalVoucherUseCase(store)
    use_case = PostStandardTransactionUseCase(store=store, post_voucher_uc=post_voucher_uc)

    cmd = PostStandardTransactionCommand(
        workspace_id=workspace_id,
        actor_user_id=actor_id,
        idempotency_key=uuid4(),
        transaction_type="general-journal",
        reference="JV-MANUAL-001",
        counterparty="Month-End Accruals",
        posting_date=date(2026, 10, 31),
        lines=[
            StandardTransactionLineItemInput(
                description="Debit Operating Expense",
                account_code="5010",
                quantity=Decimal("1"),
                unit_price_ngn=Decimal("50000.00"),
                debit_ngn=Decimal("50000.00"),
                credit_ngn=Decimal("0.00"),
            ),
            StandardTransactionLineItemInput(
                description="Credit Bank Current",
                account_code="1010",
                quantity=Decimal("1"),
                unit_price_ngn=Decimal("50000.00"),
                debit_ngn=Decimal("0.00"),
                credit_ngn=Decimal("50000.00"),
            ),
        ],
    )

    result = use_case.execute(cmd)
    assert result.total_debit_ngn == Decimal("50000.00")
    assert result.total_credit_ngn == Decimal("50000.00")


def test_post_general_journal_unbalanced_fails() -> None:
    """Unbalanced General Journal raises ValidationError."""
    store, workspace_id, actor_id, period, accounts = _setup_test_ledger()
    post_voucher_uc = PostJournalVoucherUseCase(store)
    use_case = PostStandardTransactionUseCase(store=store, post_voucher_uc=post_voucher_uc)

    cmd = PostStandardTransactionCommand(
        workspace_id=workspace_id,
        actor_user_id=actor_id,
        idempotency_key=uuid4(),
        transaction_type="general-journal",
        reference="JV-UNBALANCED",
        counterparty="Mistake",
        posting_date=date(2026, 10, 31),
        lines=[
            StandardTransactionLineItemInput(
                description="Debit Only",
                account_code="5010",
                quantity=Decimal("1"),
                unit_price_ngn=Decimal("50000.00"),
                debit_ngn=Decimal("50000.00"),
                credit_ngn=Decimal("0.00"),
            ),
        ],
    )

    with pytest.raises(ValidationError, match="Double-entry invariant violated"):
        use_case.execute(cmd)


def test_api_post_standard_transaction_endpoint() -> None:
    """REST endpoint /api/v1/ledger/transactions/post posts a sales invoice and returns 201."""
    workspace_id = UUID("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0001")
    actor_id = UUID("bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbb0001")
    store = create_seeded_demo_store(workspace_id=workspace_id, actor_user_id=actor_id)
    app = LedgerApiApplication(store)

    body = json.dumps({
        "transactionType": "sales-invoicing",
        "reference": "API-INV-2026-999",
        "counterparty": "Zenith Bank Plc",
        "date": "2026-04-15",
        "vatEnabled": True,
        "whtRatePct": 5,
        "paymentMethod": "Bank Transfer",
        "lineItems": [
            {
                "description": "Enterprise API Integration",
                "accountCode": "4010",
                "quantity": 1,
                "unitPriceNgn": "500000.00",
                "vatApplicable": True,
            }
        ],
    }).encode("utf-8")

    status, payload = app.handle_request(
        method="POST",
        path="/api/v1/ledger/transactions/post",
        headers={"X-Workspace-Id": str(workspace_id), "X-Actor-User-Id": str(actor_id)},
        body=body,
    )

    assert status == 201
    assert payload["ok"] is True
    assert payload["reference"] == "API-INV-2026-999"
    assert payload["transactionType"] == "sales-invoicing"
    assert payload["totalDebitNgn"] == "537500.00"  # 500k + 7.5% VAT (37,500)
    assert payload["totalCreditNgn"] == "537500.00"
    assert "voucherId" in payload
    assert "voucherNumber" in payload


