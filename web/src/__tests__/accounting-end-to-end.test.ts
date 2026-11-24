/**
 * End-to-end bookkeeping: create a company, its accounting / inventory / payroll ledgers,
 * post every Transactions Hub type through the real API routes, and check the reports.
 */
import { beforeAll, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { DELETE, POST } from "@/app/api/transactions/route";
import { PUT as PUT_RECORDS } from "@/app/api/records/[collection]/route";
import { registerWorkspaceAccountViaBff } from "@/lib/auth-bff";
import { fetchChartOfAccounts, fetchFiscalPeriods, fetchFrcnPackage, fetchKpiSummary } from "@/lib/bff-client";
import { seedTailoredAccountsForWorkspace } from "@/components/admin/admin-store";
import type { AdminRecord } from "@/components/admin/admin-maintain-data";
import type { FrcnFinancialStatementPackage } from "@/types/ledger";
import { computeStockOnHand, type PostingTransactionInput } from "@/lib/posting-rules";

let cookie = "";
let workspaceId = "";
let seq = 0;

function req(method: string, url: string, body?: unknown): NextRequest {
  return new NextRequest(url, {
    method,
    headers: { "Content-Type": "application/json", cookie },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

const RICE = "inv-rice";
const EMPLOYEE = "emp-ada";

function adminRecords(extra: AdminRecord[] = []): AdminRecord[] {
  const seeded = seedTailoredAccountsForWorkspace(workspaceId, "RETAIL_ECOMMERCE").map((r) => {
    if (r.code === "1110") return { ...r, primaryMetricValue: "₦1,000,000.00 DR", balanceSide: "DR" as const };
    if (r.code === "3010") return { ...r, primaryMetricValue: "₦1,000,000.00 CR", balanceSide: "CR" as const };
    return r;
  });
  return [
    ...seeded,
    {
      id: "acc-6175",
      module: "accounts",
      name: "Generator Repairs",
      code: "6175",
      category: "Expenses",
      primaryMetricLabel: "Current Balance",
      primaryMetricValue: "₦0.00 DR",
      balanceSide: "DR",
      contactOrNote: "Individual",
      isActive: true,
      accountLevel: "INDIVIDUAL",
      parentGroupCode: "6000",
      ifrsElement: "Expenses",
      ifrsStandard: "IAS 1",
    },
    {
      id: RICE,
      module: "inventory",
      name: "50kg Rice Bag",
      code: "SKU-RICE",
      category: "Standard",
      primaryMetricLabel: "Unit Price",
      primaryMetricValue: "₦30,000",
      contactOrNote: "",
      isActive: true,
      details: {
        itemClass: "Stock Item",
        priceLevel1: "₦30,000",
        lastUnitCost: "₦20,000",
        qtyOnHand: "10",
        glInventoryAcct: "1200 — Retail Merchandise Inventory",
        glCogsAcct: "5010 — Cost of Goods Sold",
      },
    },
    {
      id: EMPLOYEE,
      module: "employees",
      name: "Ada Obi",
      code: "EMP-001",
      category: "Finance & Accounting",
      primaryMetricLabel: "Monthly Gross",
      primaryMetricValue: "₦450,000",
      contactOrNote: "",
      isActive: true,
      details: { monthlyGross: "450000", lirsTaxState: "LIRS (Lagos State)" },
    },
    ...extra,
  ];
}

async function putAdmin(records: AdminRecord[]): Promise<number> {
  const res = await PUT_RECORDS(
    req("PUT", "http://localhost/api/records/admin-records", records),
    { params: Promise.resolve({ collection: "admin-records" }) },
  );
  return res.status;
}

type Tx = Partial<PostingTransactionInput> & { typeId: string };
const posted: PostingTransactionInput[] = [];

async function post(tx: Tx): Promise<{ status: number; body: Record<string, unknown> }> {
  seq += 1;
  const full: PostingTransactionInput = {
    id: `tx-${seq}`,
    reference: `REF-${seq}`,
    counterparty: "Test Party",
    date: "2026-03-15",
    status: "Posted",
    lineItems: [],
    ...tx,
  };
  const res = await POST(req("POST", "http://localhost/api/transactions", full));
  const body = (await res.json()) as Record<string, unknown>;
  if (res.status === 201) posted.push(full);
  return { status: res.status, body };
}

const line = (unitPriceNgn: number, extra: Record<string, unknown> = {}) => ({
  description: "Line",
  quantity: 1,
  unitPriceNgn,
  vatApplicable: true,
  ...extra,
});

async function pkg(): Promise<FrcnFinancialStatementPackage> {
  const periods = await fetchFiscalPeriods(workspaceId);
  const open = periods.find((p) => p.status === "OPEN")!;
  const res = await fetchFrcnPackage(open.id, workspaceId);
  expect(res.status).toBe(200);
  return res.body as FrcnFinancialStatementPackage;
}

function net(p: FrcnFinancialStatementPackage, code: string): number {
  const row = p.trialBalance.find((r) => r.accountCode === code);
  return row ? Number(row.debitBalanceNgn) - Number(row.creditBalanceNgn) : 0;
}

beforeAll(() => {
  const res = registerWorkspaceAccountViaBff(
    JSON.stringify({
      fullName: "Bola Retail",
      email: `e2e-${Date.now()}@retail.ng`,
      password: "Retail#2026",
      workspaceName: "Bola Retail Stores Ltd",
      rcNumber: "RC 770077",
      businessType: "RETAIL_ECOMMERCE",
    }),
  );
  expect(res.status).toBe(201);
  cookie = res.setCookie!.split(";")[0]!;
  workspaceId = (res.body as { workspace: { id: string } }).workspace.id;
});

describe("1. creating a company", () => {
  it("starts with its sector chart of accounts and empty, balanced books", async () => {
    const chart = await fetchChartOfAccounts(workspaceId);
    expect(chart.map((a) => a.code)).toEqual(expect.arrayContaining(["1010", "1110", "1120", "1200", "2110", "4010", "5010"]));
    const p = await pkg();
    expect(p.trialBalance).toEqual([]);
    expect(p.isBalanced).toBe(true);
    const kpi = await fetchKpiSummary(workspaceId);
    expect(kpi.isZeroState).toBe(true);
  });
});

describe("2-4. accounting, inventory and payroll ledgers", () => {
  it("adds new Admin accounts to the ledger and posts beginning balances", async () => {
    expect(await putAdmin(adminRecords())).toBe(200);
    const chart = await fetchChartOfAccounts(workspaceId);
    expect(chart.find((a) => a.code === "6175")).toMatchObject({ name: "Generator Repairs", category: "EXPENSE" });
    const p = await pkg();
    expect(net(p, "1110")).toBe(1_000_000);
    expect(net(p, "3010")).toBe(-1_000_000);
    expect(p.isBalanced).toBe(true);

    // Saving again with the same balances does not post a second opening voucher.
    expect(await putAdmin(adminRecords())).toBe(200);
    expect(net(await pkg(), "1110")).toBe(1_000_000);
  });
});

describe("5. every transaction type", () => {
  it("posts each type with correct double entry", async () => {
    const ok = async (tx: Tx) => {
      const r = await post(tx);
      expect(r.status, `${tx.typeId}: ${JSON.stringify(r.body)}`).toBe(201);
      expect(r.body.totalDebitNgn).toBe(r.body.totalCreditNgn);
      return r.body;
    };

    // Money in
    await ok({ typeId: "sales-invoicing", vatEnabled: true, lineItems: [line(30_000, { quantity: 2, itemId: RICE, accountCode: "4010 Retail Store & Online Revenue" })] });
    await ok({ typeId: "receive-money", lineItems: [line(64_500, { entryKind: "manual-item" })] });
    await ok({ typeId: "credit-memos", lineItems: [line(30_000, { itemId: RICE, vatApplicable: false })] });
    await ok({ typeId: "finance-charge", lineItems: [line(1_000)] });
    await ok({ typeId: "invoice-time-expenses", lineItems: [line(5_000)] });
    // Money out
    await ok({ typeId: "bills", vatEnabled: true, whtRatePct: 5, lineItems: [line(50_000, { accountCode: "6175 Generator Repairs" })] });
    await ok({ typeId: "payments", lineItems: [line(51_250, { entryKind: "manual-item" })] });
    await ok({ typeId: "purchases-receive-inventory", lineItems: [line(20_000, { quantity: 5, itemId: RICE, vatApplicable: false })] });
    await ok({ typeId: "vendor-credit-memos", lineItems: [line(20_000, { itemId: RICE, vatApplicable: false })] });
    await ok({ typeId: "write-checks", lineItems: [line(10_000, { accountCode: "6120 Occupancy & Rent Expense", vatApplicable: false })] });
    await ok({ typeId: "select-for-payment", lineItems: [line(3_000, { selected: true })] });
    // Banking
    await ok({ typeId: "account-register", details: { entryDirection: "Deposit / Increase (+)" }, lineItems: [line(7_000, { accountCode: "3010 Issued Share Capital / Owner Equity" })] });
    await ok({ typeId: "void-checks", lineItems: [line(3_000)] });
    // Time & payroll
    await ok({ typeId: "time-expense", lineItems: [line(2_000, { accountCode: "6140 Telecoms, Internet & Subscriptions" })] });
    await ok({
      typeId: "payroll-entry",
      counterparty: "Ada Obi",
      details: { basicSalary: "300000", housingAllowance: "100000", transportAllowance: "50000", payeTax: "40000" },
    });
    await ok({ typeId: "select-for-payroll", lineItems: [line(100_000, { selected: true })] });
    // Ledger & stock
    await ok({
      typeId: "general-journal",
      lineItems: [
        { description: "Depreciation", accountCode: "6190 Depreciation on Property & Equipment", debitNgn: 8_000, creditNgn: 0 },
        { description: "Depreciation", accountCode: "1590 Accumulated Depreciation", debitNgn: 0, creditNgn: 8_000 },
      ],
    });
    await ok({ typeId: "inventory-adjustments", details: { itemId: RICE, systemQty: "13", actualQty: "12", unitCost: "20000" } });
    await ok({ typeId: "assemblies", details: { yieldQuantity: "2", unitCost: "1000" } });
  });

  it("does not post quotes, orders, workflow notes or drafts", async () => {
    for (const typeId of [
      "quotes-sales-orders",
      "purchase-orders",
      "select-for-purchase-orders",
      "select-for-deposit",
      "account-reconciliation",
      "write-letters",
      "action-items",
      "system-tasks",
    ]) {
      const r = await post({ typeId, lineItems: [line(99_999)] });
      expect(r.status, typeId).toBe(200);
      expect(r.body.posted, typeId).toBe(false);
    }
    const draft = await post({ typeId: "sales-invoicing", status: "Draft", lineItems: [line(99_999)] });
    expect(draft.body.posted).toBe(false);
  });

  it("rejects unbalanced journals, unknown accounts and zero amounts", async () => {
    const unbalanced = await post({
      typeId: "general-journal",
      lineItems: [
        { accountCode: "6190", debitNgn: 100, creditNgn: 0 },
        { accountCode: "1590", debitNgn: 0, creditNgn: 90 },
      ],
    });
    expect(unbalanced.status).toBe(422);
    const unknown = await post({
      typeId: "general-journal",
      lineItems: [
        { accountCode: "9999 Not Real", debitNgn: 100, creditNgn: 0 },
        { accountCode: "1590", debitNgn: 0, creditNgn: 100 },
      ],
    });
    expect(unknown.status).toBe(422);
    expect((await post({ typeId: "bills", lineItems: [line(0)] })).status).toBe(422);
    expect((await post({ typeId: "bills", date: "2025-06-01", lineItems: [line(10)] })).status).toBe(422); // closed year
  });

  it("replaces the voucher when a record is edited and reverses it when deleted", async () => {
    const before = await pkg();
    const id = "tx-edit-me";
    const first = await post({ id, reference: "INV-EDIT", typeId: "sales-invoicing", lineItems: [line(10_000, { vatApplicable: false })] });
    expect(first.status).toBe(201);
    const same = await post({ id, reference: "INV-EDIT", typeId: "sales-invoicing", lineItems: [line(10_000, { vatApplicable: false })] });
    expect(same.body.voucherId).toBe(first.body.voucherId); // unchanged save: no new voucher
    const edited = await post({ id, reference: "INV-EDIT", typeId: "sales-invoicing", lineItems: [line(25_000, { vatApplicable: false })] });
    expect(edited.body.replacedVoucherId).toBe(first.body.voucherId);
    expect(net(await pkg(), "4010") - net(before, "4010")).toBe(-25_000);

    const del = await DELETE(req("DELETE", `http://localhost/api/transactions?id=${id}`));
    expect(del.status).toBe(200);
    expect(net(await pkg(), "4010")).toBe(net(before, "4010"));
    posted.splice(posted.findIndex((t) => t.id === id), 3);
  });
});

describe("6. reports reflect what was entered", () => {
  it("trial balance, P&L and balance sheet match the hand-calculated books", async () => {
    const p = await pkg();
    expect(p.isBalanced).toBe(true);
    expect(p.totalDebitsNgn).toBe(p.totalCreditsNgn);

    // Bank: 1,000,000 opening +64,500 receipt -51,250 payment -10,000 cheque +7,000 deposit
    //       -366,500 net pay -100,000 payroll batch +3,000 void -3,000 payment run
    expect(net(p, "1110")).toBe(543_750);
    // Receivables: +64,500 -64,500 -30,000 credit +1,000 finance charge +5,000 time invoice
    expect(net(p, "1120")).toBe(-24_000);
    // Inventory: -40,000 COGS +100,000 received -20,000 returned to supplier +20,000 customer return -20,000 shrinkage
    expect(net(p, "1200")).toBe(40_000);
    // Payables: +51,250 -51,250 +100,000 -20,000 +3,000 void -3,000 run
    expect(net(p, "2110")).toBe(-80_000);
    expect(net(p, "2210")).toBe(-4_500); // output VAT
    expect(net(p, "2215")).toBe(3_750); // input VAT
    expect(net(p, "2220")).toBe(-2_500); // WHT withheld
    expect(net(p, "2240")).toBe(-40_000); // PAYE
    expect(net(p, "6110")).toBe(595_000); // gross 450,000 + employer pension 45,000 + batch 100,000
    expect(net(p, "6175")).toBe(50_000);
    expect(net(p, "5010")).toBe(20_000); // COGS 40,000 - 20,000 returned

    const revenue = 65_000 + 1_000 - 30_000;
    const expenses = 20_000 + 50_000 + 10_000 + 2_000 + 595_000 + 8_000 + 20_000;
    expect(Number(p.profitAndLoss.totalRevenueNgn)).toBe(revenue);
    expect(Number(p.profitAndLoss.netProfitNgn)).toBe(revenue - expenses);
    expect(p.financialPosition.isBalanced).toBe(true);
    expect(p.journalVouchers!.length).toBeGreaterThan(19);

    const kpi = await fetchKpiSummary(workspaceId);
    expect(kpi.isZeroState).toBe(false);
    expect(kpi.payablesNgn).toBe("80,000.00");
  });

  it("stock on hand follows every stock movement", () => {
    const items = adminRecords().filter((r) => r.module === "inventory");
    const onHand = computeStockOnHand(items, posted);
    // 10 opening -2 sold +1 returned +5 received -1 back to supplier -1 count shortage
    expect(onHand.get(RICE)).toBe(12);
  });
});

describe("6b. report screens show the same numbers as the ledger", () => {
  it("builds every core report from this company's books", async () => {
    const { getReportDefinition } = await import("@/components/reports/reports-data");
    const { saveAdminRecords } = await import("@/components/admin/admin-store");
    const { saveTransactions } = await import("@/components/transactions/transactions-store");
    window.localStorage.setItem("nairabooks_active_workspace", workspaceId);
    saveAdminRecords(adminRecords(), workspaceId);
    // Client copies of the posted records (amounts as the editor computes them).
    const amounts: Record<string, { amountNgn: number; vatAmountNgn: number; whtAmountNgn: number; counterparty: string }> = {
      "sales-invoicing": { amountNgn: 64_500, vatAmountNgn: 4_500, whtAmountNgn: 0, counterparty: "Chika Stores" },
      "receive-money": { amountNgn: 64_500, vatAmountNgn: 0, whtAmountNgn: 0, counterparty: "Chika Stores" },
      bills: { amountNgn: 53_750, vatAmountNgn: 3_750, whtAmountNgn: 2_500, counterparty: "Gen Fixers" },
      payments: { amountNgn: 51_250, vatAmountNgn: 0, whtAmountNgn: 0, counterparty: "Gen Fixers" },
    };
    saveTransactions(
      posted.map((t) => ({
        whtRatePct: 0,
        paymentMethod: "",
        bankOrGlAccount: "",
        memo: "",
        amountNgn: 0,
        vatAmountNgn: 0,
        whtAmountNgn: 0,
        ...t,
        ...(amounts[t.typeId] ?? {}),
      })) as never,
      workspaceId,
    );
    const p = await pkg();
    const kpi = (id: string, label: string) =>
      getReportDefinition(id).generateRows(p, {}).summaryKpis.find((k) => k.label === label)?.value;
    const naira = (n: number) => `₦${n.toLocaleString("en-NG", { minimumFractionDigits: 2 })}`;

    // Trial balance: every account the ledger used, totals equal to the ledger's
    const tb = getReportDefinition("trial-balance").generateRows(p, {});
    expect(tb.rows.some((r) => r.values.code === "6175")).toBe(true);
    expect(tb.rows.some((r) => r.values.code === "2245")).toBe(true); // auto-created pension payable
    expect(kpi("trial-balance", "Total Debits")).toBe(naira(Number(p.totalDebitsNgn)));
    expect(kpi("trial-balance", "Equilibrium Status")).toBe("Balanced (0.00 variance)");
    // P&L and balance sheet
    expect(kpi("income-statement", "Net Profit")).toBe(naira(Number(p.profitAndLoss.netProfitNgn)));
    expect(kpi("balance-sheet", "Total Assets")).toBe(naira(Number(p.financialPosition.totalAssetsNgn)));
    // Journal register lists every posted line
    const gj = getReportDefinition("general-journal").generateRows(p, {});
    expect(gj.rows.length).toBe(p.journalVouchers!.reduce((s, v) => s + v.lines.length, 0));
    // Receivables / payables: paid in full, so nothing is owed by those parties
    const ar = getReportDefinition("aged-receivables").generateRows(p, {});
    expect(ar.rows.find((r) => r.values.customer === "Chika Stores")?.values.totalDue).toBe(0);
    const ap = getReportDefinition("aged-payables").generateRows(p, {});
    expect(ap.rows.find((r) => r.values.vendor === "Gen Fixers")?.values.totalDue).toBe(0);
    // Stock and payroll
    const inv = getReportDefinition("inventory-valuation").generateRows(p, {});
    expect(inv.rows.find((r) => r.id === RICE)?.values).toMatchObject({ qtyOnHand: 12, unitCost: 20_000, assetValue: 240_000 });
    const payroll = getReportDefinition("payroll-register").generateRows(p, {});
    expect(payroll.rows.find((r) => r.id === EMPLOYEE)?.values).toMatchObject({
      gross: 450_000,
      pencomEmployee: 36_000,
      payeTax: 40_000,
      netPay: 366_500,
      pencomEmployer: 45_000,
    });
  });
});
