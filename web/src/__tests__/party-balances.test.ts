import { describe, expect, it } from "vitest";
import { withLivePartyBalances } from "@/components/admin/party-balances";
import type { AdminRecord } from "@/components/admin/admin-maintain-data";
import type { TransactionRecord } from "@/components/transactions/transactions-data";

const party = (module: "customers" | "vendors", name: string, value = "₦0.00 DR"): AdminRecord => ({
  id: `${module}-${name}`,
  module,
  name,
  code: "X-1",
  category: "Standard",
  primaryMetricLabel: "Balance",
  primaryMetricValue: value,
  contactOrNote: "",
  isActive: true,
});

const tx = (typeId: string, counterparty: string, amountNgn: number, extra: Partial<TransactionRecord> = {}) =>
  ({
    id: `${typeId}-${amountNgn}`,
    typeId,
    reference: "R",
    counterparty,
    date: "2026-03-01",
    status: "Posted",
    amountNgn,
    vatAmountNgn: 0,
    whtRatePct: 0,
    whtAmountNgn: 0,
    paymentMethod: "",
    bankOrGlAccount: "",
    memo: "",
    lineItems: [],
    ...extra,
  }) as TransactionRecord;

describe("live customer and vendor balances", () => {
  it("adds invoices and subtracts receipts for a customer", () => {
    const [cust] = withLivePartyBalances(
      [party("customers", "emmanuel")],
      [tx("sales-invoicing", "Emmanuel ", 5_375), tx("receive-money", "emmanuel", 1_000)],
    );
    expect(cust!.primaryMetricValue).toBe("₦4,375.00 DR");
  });

  it("starts from the typed opening balance and ignores drafts, quotes and other parties", () => {
    const [cust] = withLivePartyBalances(
      [party("customers", "Ada", "₦2,000.00 DR")],
      [
        tx("sales-invoicing", "Ada", 500, { status: "Draft" }),
        tx("quotes-sales-orders", "Ada", 900),
        tx("sales-invoicing", "Bola", 700),
      ],
    );
    expect(cust!.primaryMetricValue).toBe("₦2,000.00 DR");
  });

  it("shows overpayment as a credit, and vendor bills net of WHT as a credit balance", () => {
    const [cust, vend] = withLivePartyBalances(
      [party("customers", "Ada"), party("vendors", "Gen Fixers", "₦0.00 CR")],
      [
        tx("receive-money", "Ada", 300),
        tx("bills", "Gen Fixers", 53_750, { whtAmountNgn: 2_500 }),
        tx("payments", "Gen Fixers", 1_250),
      ],
    );
    expect(cust!.primaryMetricValue).toBe("₦300.00 CR");
    expect(vend!.primaryMetricValue).toBe("₦50,000.00 CR");
    expect(vend!.balanceSide).toBe("CR");
  });
});
