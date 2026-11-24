import { describe, expect, it } from "vitest";
import { registerWorkspaceAccountViaBff } from "@/lib/auth-bff";
import { postStandardTransactionViaBff } from "@/lib/bff-client";
import { buildLiveOverview } from "@/lib/overview-bff";
import { writeRecordCollection } from "@/lib/records-bff";

const line = (unitPriceNgn: number, extra: Record<string, unknown> = {}) => ({ quantity: 1, unitPriceNgn, vatApplicable: false, ...extra });

describe("Overview dashboard for a real company", () => {
  it("shows only figures from the company's own books", async () => {
    const reg = registerWorkspaceAccountViaBff(
      JSON.stringify({ fullName: "Dash Owner", email: `dash-${Date.now()}@co.ng`, password: "Dash#2026pass", workspaceName: "Dash Ltd", businessType: "RETAIL_ECOMMERCE" }),
    );
    const ws = (reg.body as { workspace: { id: string } }).workspace.id;
    const post = (tx: Record<string, unknown>) =>
      postStandardTransactionViaBff(JSON.stringify({ status: "Posted", counterparty: "Chika", ...tx }), ws);

    const invoiceOld = { id: "i1", typeId: "sales-invoicing", reference: "INV-1", date: "2026-11-02", dueDate: "2026-11-10", amountNgn: 80_000, lineItems: [line(80_000)] };
    const invoiceNew = { id: "i2", typeId: "sales-invoicing", reference: "INV-2", date: "2026-11-20", dueDate: "2026-12-20", amountNgn: 20_000, lineItems: [line(20_000)] };
    const receipt = { id: "r1", typeId: "receive-money", reference: "RCT-1", date: "2026-11-21", amountNgn: 30_000, lineItems: [line(30_000, { entryKind: "manual-item" })] };
    const bill = { id: "b1", typeId: "write-checks", reference: "CHQ-1", counterparty: "Landlord", date: "2026-11-05", amountNgn: 15_000, lineItems: [line(15_000, { accountCode: "6120" })] };
    for (const tx of [invoiceOld, invoiceNew, receipt, bill]) expect((await post(tx)).status).toBe(201);
    await writeRecordCollection("transactions", ws, JSON.stringify([invoiceOld, invoiceNew, receipt, bill].map((t) => ({ status: "Posted", counterparty: "Chika", whtAmountNgn: 0, ...t }))));

    const o = buildLiveOverview(ws, new Date(2026, 10, 24)); // 24 Nov 2026
    const month = o.timeframes.month;
    expect(month.rangeNote).toBe("November 2026 · Current month");
    expect(month.netIncomeNgn).toBe("85,000.00"); // 100,000 sales - 15,000 rent
    expect(month.netIncomeDelta).toBe("New");
    expect(month.topExpenses).toHaveLength(1);
    expect(month.topExpenses[0]).toMatchObject({ proCode: expect.stringMatching(/^6120 /), amountNgn: "₦15,000.00", sharePct: 100 });
    const nov = month.cashFlowBars[5]!;
    expect(nov).toMatchObject({ label: "Nov", isCurrent: true, inflowNgn: "₦30.0k", outflowNgn: "₦15.0k" });
    expect(month.cashFlowSummary).toContain("Net +₦15,000.00 this month");
    // The receipt settles 30,000 of INV-1 (oldest): 50,000 left and 14 days past due; INV-2 not yet due.
    expect(o.overdueCount).toBe(1);
    expect(o.overdueInvoices[0]).toMatchObject({ invoiceRef: "INV-1", amountNgn: "₦50,000.00", daysOverdue: 14 });
    expect(JSON.stringify(o)).not.toMatch(/6,940,000|Eko Atlantic|Zenith/);
  });
});
