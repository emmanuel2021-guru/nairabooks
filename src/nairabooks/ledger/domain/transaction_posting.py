"""Domain logic for translating standard Sage-inspired business transactions.

Generates balanced IFRS double-entry lines for all operational workflows.
"""

from __future__ import annotations

from collections.abc import Sequence
from dataclasses import dataclass
from datetime import date
from decimal import ROUND_HALF_UP, Decimal

from nairabooks.ledger.domain.errors import ValidationError
from nairabooks.ledger.domain.money import MONEY_QUANTUM, ZERO_MONEY, parse_decimal


@dataclass(frozen=True, slots=True)
class StandardPlannedLine:
    """Balanced double-entry line targeting a ChartOfAccount code."""

    account_code: str
    debit_ngn: Decimal
    credit_ngn: Decimal
    memo: str


VAT_RATE_7_5 = Decimal("0.075")


def plan_standard_transaction_lines(
    *,
    transaction_type: str,
    reference: str,
    counterparty: str,
    posting_date: date,
    lines: Sequence[object],
    vat_enabled: bool = False,
    wht_rate_pct: Decimal = Decimal("0"),
    payment_method: str = "Bank Transfer",
    details: dict[str, str] | None = None,
) -> tuple[StandardPlannedLine, ...]:
    """Translate a high-level operational transaction into balanced IFRS debit/credit lines."""
    clean_type = transaction_type.strip().lower()
    planned: list[StandardPlannedLine] = []

    # Calculate net subtotal from line items
    net_subtotal = ZERO_MONEY
    total_vat = ZERO_MONEY

    for line in lines:
        qty = getattr(line, "quantity", Decimal("1"))
        if not isinstance(qty, Decimal):
            qty = parse_decimal(qty, quantum=Decimal("1"), field="quantity")
        price = getattr(line, "unit_price_ngn", ZERO_MONEY)
        if not isinstance(price, Decimal):
            price = parse_decimal(price, quantum=MONEY_QUANTUM, field="unit_price_ngn")
        line_net = (qty * price).quantize(MONEY_QUANTUM, rounding=ROUND_HALF_UP)
        net_subtotal += line_net

        vat_applicable = getattr(line, "vat_applicable", False)
        if vat_enabled and vat_applicable:
            line_vat = (line_net * VAT_RATE_7_5).quantize(MONEY_QUANTUM, rounding=ROUND_HALF_UP)
            total_vat += line_vat

    gross_total = net_subtotal + total_vat

    # Calculate WHT deduction
    wht_pct = (
        wht_rate_pct
        if isinstance(wht_rate_pct, Decimal)
        else parse_decimal(wht_rate_pct, quantum=Decimal("0.01"), field="wht_rate_pct")
    )
    wht_deduction = ZERO_MONEY
    if wht_pct > Decimal("0"):
        wht_deduction = (net_subtotal * (wht_pct / Decimal("100"))).quantize(
            MONEY_QUANTUM, rounding=ROUND_HALF_UP
        )

    # 1. Sales Invoicing (Money In -> Accounts Receivable)
    if clean_type in ("sales-invoicing", "invoice-time-expenses"):
        # CR Revenue (4010 or specific line account)
        planned.append(
            StandardPlannedLine(
                account_code="4010",
                debit_ngn=ZERO_MONEY,
                credit_ngn=net_subtotal,
                memo=f"Sales Revenue - {reference} ({counterparty})",
            )
        )
        # CR Output VAT (2010) if applicable
        if total_vat > ZERO_MONEY:
            planned.append(
                StandardPlannedLine(
                    account_code="2010",
                    debit_ngn=ZERO_MONEY,
                    credit_ngn=total_vat,
                    memo=f"Output VAT 7.5% - {reference}",
                )
            )
        # DR WHT Credit Notes Receivable (1150) if deducted at source
        if wht_deduction > ZERO_MONEY:
            planned.append(
                StandardPlannedLine(
                    account_code="1150",
                    debit_ngn=wht_deduction,
                    credit_ngn=ZERO_MONEY,
                    memo=f"WHT {wht_pct}% Deducted at Source - {reference}",
                )
            )
        # DR Trade Receivables (1120) for net invoice receivable
        net_receivable = gross_total - wht_deduction
        planned.append(
            StandardPlannedLine(
                account_code="1120",
                debit_ngn=net_receivable,
                credit_ngn=ZERO_MONEY,
                memo=f"Trade Receivables - {reference} ({counterparty})",
            )
        )

    # 2. Receive Money / Customer Receipt
    elif clean_type in ("receive-money", "select-for-deposit"):
        planned.append(
            StandardPlannedLine(
                account_code="1010",
                debit_ngn=net_subtotal,
                credit_ngn=ZERO_MONEY,
                memo=f"Bank Receipt - {reference} from {counterparty}",
            )
        )
        planned.append(
            StandardPlannedLine(
                account_code="1120",
                debit_ngn=ZERO_MONEY,
                credit_ngn=net_subtotal,
                memo=f"Clear AR - {reference} ({counterparty})",
            )
        )

    # 3. Customer Credit Memo / Return
    elif clean_type == "credit-memos":
        planned.append(
            StandardPlannedLine(
                account_code="4010",
                debit_ngn=net_subtotal,
                credit_ngn=ZERO_MONEY,
                memo=f"Sales Returns - {reference} ({counterparty})",
            )
        )
        if total_vat > ZERO_MONEY:
            planned.append(
                StandardPlannedLine(
                    account_code="2010",
                    debit_ngn=total_vat,
                    credit_ngn=ZERO_MONEY,
                    memo=f"Reverse Output VAT - {reference}",
                )
            )
        planned.append(
            StandardPlannedLine(
                account_code="1120",
                debit_ngn=ZERO_MONEY,
                credit_ngn=gross_total,
                memo=f"Reduce AR - {reference} ({counterparty})",
            )
        )

    # 4. Vendor Bills / Purchases
    elif clean_type in ("bills", "purchases-receive-inventory"):
        # DR Expense or Inventory (5010)
        planned.append(
            StandardPlannedLine(
                account_code="5010",
                debit_ngn=net_subtotal,
                credit_ngn=ZERO_MONEY,
                memo=f"Operating / Purchase Expense - {reference} from {counterparty}",
            )
        )
        # DR Input VAT (2010 or 5010) if applicable
        if total_vat > ZERO_MONEY:
            planned.append(
                StandardPlannedLine(
                    account_code="2010",
                    debit_ngn=total_vat,
                    credit_ngn=ZERO_MONEY,
                    memo=f"Input VAT 7.5% - {reference}",
                )
            )
        # CR WHT Payable (2130) if applicable
        if wht_deduction > ZERO_MONEY:
            planned.append(
                StandardPlannedLine(
                    account_code="2130",
                    debit_ngn=ZERO_MONEY,
                    credit_ngn=wht_deduction,
                    memo=f"WHT Payable {wht_pct}% - {reference}",
                )
            )
        # CR Trade Payables (2120) for net payable
        net_payable = gross_total - wht_deduction
        planned.append(
            StandardPlannedLine(
                account_code="2120",
                debit_ngn=ZERO_MONEY,
                credit_ngn=net_payable,
                memo=f"Trade Payables - {reference} to {counterparty}",
            )
        )

    # 5. Payments / Vendor Payment / Write Checks
    elif clean_type in ("payments", "write-checks", "select-for-payment"):
        planned.append(
            StandardPlannedLine(
                account_code="2120",
                debit_ngn=net_subtotal,
                credit_ngn=ZERO_MONEY,
                memo=f"Clear AP - {reference} to {counterparty}",
            )
        )
        planned.append(
            StandardPlannedLine(
                account_code="1010",
                debit_ngn=ZERO_MONEY,
                credit_ngn=net_subtotal,
                memo=f"Bank Payment - {reference} to {counterparty}",
            )
        )

    # 6. Vendor Debit Memo / Return
    elif clean_type == "vendor-credit-memos":
        planned.append(
            StandardPlannedLine(
                account_code="2120",
                debit_ngn=gross_total,
                credit_ngn=ZERO_MONEY,
                memo=f"Reduce AP - {reference} ({counterparty})",
            )
        )
        planned.append(
            StandardPlannedLine(
                account_code="5010",
                debit_ngn=ZERO_MONEY,
                credit_ngn=net_subtotal,
                memo=f"Purchase Return / Credit - {reference}",
            )
        )
        if total_vat > ZERO_MONEY:
            planned.append(
                StandardPlannedLine(
                    account_code="2010",
                    debit_ngn=ZERO_MONEY,
                    credit_ngn=total_vat,
                    memo=f"Reverse Input VAT - {reference}",
                )
            )

    # 7. General Journal (Direct Custom Grid Lines)
    elif clean_type == "general-journal":
        for line in lines:
            acct = getattr(line, "account_code", "4010")
            dr = getattr(line, "debit_ngn", ZERO_MONEY)
            if not isinstance(dr, Decimal):
                dr = parse_decimal(dr, quantum=MONEY_QUANTUM, field="debit_ngn")
            cr = getattr(line, "credit_ngn", ZERO_MONEY)
            if not isinstance(cr, Decimal):
                cr = parse_decimal(cr, quantum=MONEY_QUANTUM, field="credit_ngn")
            desc = getattr(line, "description", "") or f"Journal Line {reference}"
            planned.append(
                StandardPlannedLine(
                    account_code=acct,
                    debit_ngn=dr,
                    credit_ngn=cr,
                    memo=desc,
                )
            )

    # 8. Inventory Adjustment
    elif clean_type == "inventory-adjustments":
        planned.append(
            StandardPlannedLine(
                account_code="5010",
                debit_ngn=net_subtotal,
                credit_ngn=ZERO_MONEY,
                memo=f"Inventory Adjustment Loss/Usage - {reference}",
            )
        )
        planned.append(
            StandardPlannedLine(
                account_code="1310",
                debit_ngn=ZERO_MONEY,
                credit_ngn=net_subtotal,
                memo=f"Adjust Stock on Hand - {reference}",
            )
        )

    # Fallback / Default: Direct Bank & Expense/Revenue
    else:
        planned.append(
            StandardPlannedLine(
                account_code="1010",
                debit_ngn=net_subtotal,
                credit_ngn=ZERO_MONEY,
                memo=f"Bank Clearing - {reference} ({clean_type})",
            )
        )
        planned.append(
            StandardPlannedLine(
                account_code="4010",
                debit_ngn=ZERO_MONEY,
                credit_ngn=net_subtotal,
                memo=f"Operational Clearing - {reference} ({counterparty})",
            )
        )

    # Verify double-entry balance invariant
    sum_dr = sum(line.debit_ngn for line in planned)
    sum_cr = sum(line.credit_ngn for line in planned)
    if sum_dr != sum_cr:
        raise ValidationError(
            f"Double-entry invariant violated for {transaction_type} {reference}: "
            f"Debits (₦{sum_dr:,.2f}) != Credits (₦{sum_cr:,.2f}).",
            field="lines",
        )

    return tuple(planned)


class StandardTransactionPostingPlanner:
    """Helper service for planning and inspecting standard transaction postings."""

    @staticmethod
    def plan(
        *,
        transaction_type: str,
        reference: str,
        counterparty: str,
        posting_date: date,
        lines: Sequence[object],
        vat_enabled: bool = False,
        wht_rate_pct: Decimal = Decimal("0"),
        payment_method: str = "Bank Transfer",
        details: dict[str, str] | None = None,
    ) -> tuple[StandardPlannedLine, ...]:
        return plan_standard_transaction_lines(
            transaction_type=transaction_type,
            reference=reference,
            counterparty=counterparty,
            posting_date=posting_date,
            lines=lines,
            vat_enabled=vat_enabled,
            wht_rate_pct=wht_rate_pct,
            payment_method=payment_method,
            details=details,
        )
