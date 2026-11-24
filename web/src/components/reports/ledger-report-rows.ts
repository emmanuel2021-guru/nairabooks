/**
 * Report rows built from the company's real books:
 * - statements and journals come from the server ledger package (`pkg`);
 * - aging, registers, stock and payroll come from the posted Transactions Hub records,
 *   using the same rules the ledger posts with (`@/lib/posting-rules`).
 */
import type { AccountCategory, FrcnFinancialStatementPackage } from "@/types/ledger";
import type { AdminRecord } from "@/components/admin/admin-maintain-data";
import type { TransactionRecord } from "@/components/transactions/transactions-data";
import { loadAdminRecords } from "@/components/admin/admin-store";
import { loadTransactions } from "@/components/transactions/transactions-store";
import {
  buildPostingPlan,
  categoryFromIfrsElement,
  computePayslip,
  computeStockOnHand,
  isPostingTransaction,
  isTrackedStockItem,
  stockItemUnitCost,
  toAmount,
} from "@/lib/posting-rules";

export interface BuiltRow {
  readonly id: string;
  readonly isHeader?: boolean;
  readonly isTotal?: boolean;
  readonly values: Record<string, string | number>;
}

export interface BuiltReport {
  readonly rows: readonly BuiltRow[];
  readonly summaryKpis: readonly { readonly label: string; readonly value: string; readonly change?: string }[];
}

type Options = Record<string, boolean | string> | undefined;

export function naira(val: number): string {
  return `₦${val.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const round2 = (n: number) => Math.round(n * 100) / 100 || 0; // "|| 0" turns -0 into 0
const pct = (part: number, whole: number) => (whole !== 0 ? `${((part / whole) * 100).toFixed(1)}%` : "0.0%");

// ---------------------------------------------------------------------------------------
// Chart: the Admin chart of accounts merged with every account the ledger has used
// ---------------------------------------------------------------------------------------

interface ChartLine {
  readonly code: string;
  readonly name: string;
  readonly category: AccountCategory;
  readonly isNonCurrent: boolean;
  /** Period movement, debit positive. */
  readonly periodNet: number;
}

function adminAccounts(records: readonly AdminRecord[]): AdminRecord[] {
  return records.filter((r) => r.module === "accounts" && r.accountLevel !== "GROUP");
}

function buildChart(pkg: FrcnFinancialStatementPackage | undefined, records: readonly AdminRecord[]): ChartLine[] {
  const byCode = new Map<string, ChartLine>();
  for (const a of adminAccounts(records)) {
    const element = a.ifrsElement ?? a.category;
    const category = categoryFromIfrsElement(element);
    if (!category) continue;
    byCode.set(a.code, {
      code: a.code,
      name: a.name,
      category,
      isNonCurrent: /Non-Current/.test(element) || /^15|^25/.test(a.code),
      periodNet: 0,
    });
  }
  for (const tb of pkg?.trialBalance ?? []) {
    const prev = byCode.get(tb.accountCode);
    byCode.set(tb.accountCode, {
      code: tb.accountCode,
      name: prev?.name ?? tb.accountName,
      category: (prev?.category ?? tb.category) as AccountCategory,
      isNonCurrent: prev?.isNonCurrent ?? /^15|^25/.test(tb.accountCode),
      periodNet: toAmount(tb.debitBalanceNgn) - toAmount(tb.creditBalanceNgn),
    });
  }
  return [...byCode.values()].sort((a, b) => a.code.localeCompare(b.code));
}

const CATEGORY_LABEL: Readonly<Record<string, string>> = {
  ASSET: "Assets",
  LIABILITY: "Liabilities",
  EQUITY: "Equity",
  REVENUE: "Revenue",
  EXPENSE: "Expenses",
  RESTRICTED_FUND: "Restricted Funds",
};

// ---------------------------------------------------------------------------------------
// Financial statements
// ---------------------------------------------------------------------------------------

export function trialBalanceRows(pkg?: FrcnFinancialStatementPackage, opts?: Options): BuiltReport {
  const showZero = opts?.showZeroBalances !== false;
  const subtotal = opts?.subtotalByCategory !== false;
  const chart = buildChart(pkg, loadAdminRecords());
  const rows: BuiltRow[] = [];
  let totalDebits = 0;
  let totalCredits = 0;

  for (const category of ["ASSET", "LIABILITY", "EQUITY", "REVENUE", "EXPENSE", "RESTRICTED_FUND"]) {
    const lines = chart.filter((c) => c.category === category && (showZero || c.periodNet !== 0));
    let catDr = 0;
    let catCr = 0;
    for (const c of lines) {
      const debit = c.periodNet > 0 ? round2(c.periodNet) : 0;
      const credit = c.periodNet < 0 ? round2(-c.periodNet) : 0;
      catDr += debit;
      catCr += credit;
      rows.push({
        id: c.code,
        values: { code: c.code, name: c.name, category: CATEGORY_LABEL[category]!, debit, credit, netBalance: round2(debit - credit) },
      });
    }
    totalDebits += catDr;
    totalCredits += catCr;
    if (subtotal && lines.length > 0) {
      rows.push({
        id: `tb-sub-${category}`,
        isTotal: true,
        values: { code: "", name: `Total ${CATEGORY_LABEL[category]}`, category: "Subtotal", debit: round2(catDr), credit: round2(catCr), netBalance: round2(catDr - catCr) },
      });
    }
  }
  rows.push({
    id: "tb-total",
    isTotal: true,
    values: { code: "", name: "Trial Balance Totals", category: "Total", debit: round2(totalDebits), credit: round2(totalCredits), netBalance: round2(totalDebits - totalCredits) },
  });

  const variance = Math.abs(totalDebits - totalCredits);
  const isBalanced = variance < 0.01;
  return {
    rows,
    summaryKpis: [
      { label: "Total Debits", value: naira(totalDebits) },
      { label: "Total Credits", value: naira(totalCredits) },
      {
        label: "Equilibrium Status",
        value: isBalanced ? "Balanced (0.00 variance)" : `Out of balance (${naira(variance)})`,
        change: isBalanced ? "+ Balanced" : "Check Entries",
      },
    ],
  };
}

export function incomeStatementRows(pkg?: FrcnFinancialStatementPackage): BuiltReport {
  const chart = buildChart(pkg, loadAdminRecords());
  const revenue = chart.filter((c) => c.category === "REVENUE");
  const expenses = chart.filter((c) => c.category === "EXPENSE");
  const totalRev = revenue.reduce((s, c) => s - c.periodNet, 0);
  const costOfSales = expenses.filter((c) => c.code.startsWith("5")).reduce((s, c) => s + c.periodNet, 0);
  const totalExp = expenses.reduce((s, c) => s + c.periodNet, 0);
  const netProfit = totalRev - totalExp;

  const rows: BuiltRow[] = [];
  for (const c of revenue) {
    const amt = round2(-c.periodNet);
    rows.push({ id: `r-${c.code}`, values: { lineLabel: `${c.code} - ${c.name}`, category: "Revenue", amountNgn: amt, sharePct: pct(amt, totalRev) } });
  }
  rows.push({ id: "r-tot-rev", isTotal: true, values: { lineLabel: "Total Revenue", category: "Subtotal", amountNgn: round2(totalRev), sharePct: totalRev !== 0 ? "100.0%" : "0.0%" } });
  for (const c of expenses) {
    const amt = round2(c.periodNet);
    rows.push({
      id: `r-${c.code}`,
      values: {
        lineLabel: `${c.code} - ${c.name}`,
        category: c.code.startsWith("5") ? "Cost of Sales" : "Operating Expense",
        amountNgn: amt === 0 ? 0 : -amt,
        sharePct: pct(amt, totalRev),
      },
    });
  }
  rows.push({ id: "r-tot-exp", isTotal: true, values: { lineLabel: "Total Expenses", category: "Subtotal", amountNgn: round2(-totalExp), sharePct: pct(totalExp, totalRev) } });
  rows.push({ id: "r-net", isTotal: true, values: { lineLabel: "Net Profit / (Loss)", category: "Profit", amountNgn: round2(netProfit), sharePct: pct(netProfit, totalRev) } });

  return {
    rows,
    summaryKpis: [
      { label: "Total Revenue", value: naira(totalRev) },
      { label: "Gross Margin", value: pct(totalRev - costOfSales, totalRev) },
      { label: "Net Profit", value: naira(netProfit) },
    ],
  };
}

export function balanceSheetRows(pkg?: FrcnFinancialStatementPackage, opts?: Options): BuiltReport {
  const chart = buildChart(pkg, loadAdminRecords());
  const fp = pkg?.financialPosition;
  const amounts = new Map<string, number>();
  const ledgerNames = new Map<string, string>();
  for (const l of [...(fp?.assetLines ?? []), ...(fp?.liabilityLines ?? []), ...(fp?.equityLines ?? [])]) {
    amounts.set(l.accountCode, toAmount(l.amountNgn));
    if (l.accountName) ledgerNames.set(l.accountCode, l.accountName);
  }
  const totAssets = toAmount(fp?.totalAssetsNgn ?? "0");
  const totLiab = toAmount(fp?.totalLiabilitiesNgn ?? "0");
  const totEquity = toAmount(fp?.totalEquityNgn ?? "0");
  const earnings = toAmount(fp?.retainedAndCurrentEarningsNgn ?? "0");

  const rows: BuiltRow[] = [];
  const push = (section: string, c: ChartLine) => {
    const amt = round2(amounts.get(c.code) ?? 0);
    const name = ledgerNames.get(c.code) ?? c.name;
    rows.push({ id: `b-${c.code}`, values: { section, account: `${c.code} - ${name}`, amountNgn: amt, sharePct: pct(amt, totAssets) } });
  };
  const total = (id: string, section: string, account: string, amount: number) =>
    rows.push({ id, isTotal: true, values: { section, account, amountNgn: round2(amount), sharePct: pct(amount, totAssets) } });

  const assets = chart.filter((c) => c.category === "ASSET");
  const current = assets.filter((c) => !c.isNonCurrent);
  const nonCurrent = assets.filter((c) => c.isNonCurrent);
  const assetGroups =
    opts?.liquidityOrder === "non-current-first"
      ? ([["Non-Current Assets", nonCurrent], ["Current Assets", current]] as const)
      : ([["Current Assets", current], ["Non-Current Assets", nonCurrent]] as const);
  for (const [section, list] of assetGroups) for (const c of list) push(section, c);
  total("b-tot-assets", "Total Assets", "Total Assets (Current + Non-Current)", totAssets);

  for (const c of chart.filter((c) => c.category === "LIABILITY")) {
    push(c.isNonCurrent ? "Non-Current Liabilities" : "Current Liabilities", c);
  }
  total("b-tot-liab", "Total Liabilities", "Total Liabilities (Current + Non-Current)", totLiab);

  for (const c of chart.filter((c) => c.category === "EQUITY")) push("Equity", c);
  rows.push({
    id: "b-earnings",
    values: { section: "Equity", account: "Retained & Current-Year Earnings", amountNgn: round2(earnings), sharePct: pct(earnings, totAssets) },
  });
  total("b-tot-equity", "Total Equity", "Total Equity", totEquity);
  total("b-equity", "Total Equity & Liabilities", "Total Equity and Liabilities", totLiab + totEquity);

  return {
    rows,
    summaryKpis: [
      { label: "Total Assets", value: naira(totAssets) },
      { label: "Total Liabilities", value: naira(totLiab) },
      { label: "Net Equity", value: naira(totEquity) },
    ],
  };
}

interface JournalEntry {
  readonly id: string;
  readonly voucherRef: string;
  readonly postDate: string;
  readonly account: string;
  readonly memo: string;
  readonly debit: number;
  readonly credit: number;
}

/**
 * Before the ledger package has loaded (offline / first paint), show the entries this
 * browser's posted records produce, using the same posting rules as the ledger.
 */
function journalFromLocalRecords(): { entries: JournalEntry[]; vouchers: number } {
  const records = loadAdminRecords();
  const chart = buildChart(undefined, records).map((c) => ({ code: c.code, name: c.name, category: c.category }));
  const names = new Map(chart.map((c) => [c.code, c.name]));
  const stockItems = records.filter((r) => r.module === "inventory");
  const entries: JournalEntry[] = [];
  let vouchers = 0;
  for (const tx of postedTransactions()) {
    const ref = tx.voucherNumber || tx.reference;
    if (tx.typeId === "general-journal") {
      vouchers += 1;
      tx.lineItems.forEach((l, i) =>
        entries.push({
          id: `${tx.id}-${i}`,
          voucherRef: ref,
          postDate: tx.date,
          account: l.accountCode,
          memo: l.description || tx.memo,
          debit: l.debitNgn ?? 0,
          credit: l.creditNgn ?? 0,
        }),
      );
      continue;
    }
    const plan = buildPostingPlan(tx, { chart, stockItems });
    if (plan.kind !== "post") continue;
    vouchers += 1;
    plan.lines.forEach((l, i) =>
      entries.push({
        id: `${tx.id}-${i}`,
        voucherRef: ref,
        postDate: tx.date,
        account: `${l.accountCode} ${names.get(l.accountCode) ?? ""}`.trim(),
        memo: l.memo,
        debit: l.debitKobo / 100,
        credit: l.creditKobo / 100,
      }),
    );
  }
  return { entries, vouchers };
}

export function generalJournalRows(pkg?: FrcnFinancialStatementPackage, opts?: Options): BuiltReport {
  if (!pkg?.journalVouchers) {
    const { entries, vouchers } = journalFromLocalRecords();
    const totDebit = entries.reduce((s, e) => s + e.debit, 0);
    const totCredit = entries.reduce((s, e) => s + e.credit, 0);
    return {
      rows: entries.map(({ id, ...values }) => ({ id, values })),
      summaryKpis: [
        { label: "Total Journal Activity", value: naira(totDebit) },
        { label: "Equilibrium", value: Math.abs(totDebit - totCredit) < 0.01 ? "Balanced 100%" : "Out of balance" },
        { label: "Vouchers Count", value: `${vouchers} balanced vouchers` },
      ],
    };
  }
  const includeReversals = opts?.includeReversals !== false;
  const bySequence = opts?.sortBySequence !== false;
  let vouchers = [...(pkg?.journalVouchers ?? [])];
  if (!includeReversals) {
    vouchers = vouchers.filter((v) => v.status !== "REVERSED" && v.sourceModule !== "REVERSAL");
  }
  vouchers.sort((a, b) =>
    bySequence ? a.voucherNumber.localeCompare(b.voucherNumber) : a.postingDate.localeCompare(b.postingDate),
  );

  const rows: BuiltRow[] = [];
  let totDebit = 0;
  let totCredit = 0;
  for (const v of vouchers) {
    v.lines.forEach((line, i) => {
      const debit = toAmount(line.debit.functionalAmountNgn);
      const credit = toAmount(line.credit.functionalAmountNgn);
      totDebit += debit;
      totCredit += credit;
      rows.push({
        id: `${v.id}-${i}`,
        values: {
          voucherRef: `${v.voucherNumber}${v.status === "REVERSED" ? " (reversed)" : ""}`,
          postDate: v.postingDate,
          account: `${line.accountCode} ${line.accountName}`,
          memo: line.memo ?? v.reference,
          debit,
          credit,
        },
      });
    });
  }
  const balanced = Math.abs(totDebit - totCredit) < 0.01;
  return {
    rows,
    summaryKpis: [
      { label: "Total Journal Activity", value: naira(totDebit) },
      { label: "Equilibrium", value: balanced ? "Balanced 100%" : "Out of balance" },
      { label: "Vouchers Count", value: `${vouchers.length} balanced vouchers` },
    ],
  };
}

// ---------------------------------------------------------------------------------------
// Receivables & payables: open items, with payments applied to the oldest first
// ---------------------------------------------------------------------------------------

interface OpenItem {
  readonly tx: TransactionRecord;
  readonly amount: number;
  outstanding: number;
}

interface PartyLedger {
  readonly party: string;
  readonly items: OpenItem[];
  /** Payments / credits not matched to any document yet. */
  unapplied: number;
}

function postedTransactions(): TransactionRecord[] {
  return loadTransactions().filter((t) => isPostingTransaction(t));
}

function buildPartyLedgers(
  increases: ReadonlySet<string>,
  decreases: ReadonlySet<string>,
  txs: readonly TransactionRecord[],
): Map<string, PartyLedger> {
  const byParty = new Map<string, PartyLedger>();
  const ledgerFor = (party: string) => {
    let l = byParty.get(party);
    if (!l) {
      l = { party, items: [], unapplied: 0 };
      byParty.set(party, l);
    }
    return l;
  };
  const sorted = [...txs].sort((a, b) => a.date.localeCompare(b.date));
  for (const tx of sorted) {
    const party = tx.counterparty.trim();
    if (increases.has(tx.typeId)) {
      const amount = round2(tx.amountNgn - (tx.whtAmountNgn || 0));
      ledgerFor(party).items.push({ tx, amount, outstanding: amount });
    } else if (decreases.has(tx.typeId)) {
      ledgerFor(party).unapplied += tx.amountNgn;
    }
  }
  for (const l of byParty.values()) {
    for (const item of l.items) {
      if (l.unapplied <= 0) break;
      const applied = Math.min(item.outstanding, l.unapplied);
      item.outstanding = round2(item.outstanding - applied);
      l.unapplied = round2(l.unapplied - applied);
    }
  }
  return byParty;
}

function daysPastDue(tx: TransactionRecord, now: number): number {
  const due = Date.parse(tx.dueDate || tx.date);
  return Number.isNaN(due) ? 0 : Math.max(0, Math.floor((now - due) / 86_400_000));
}

const AR_UP = new Set(["sales-invoicing", "invoice-time-expenses", "finance-charge"]);
const AR_DOWN = new Set(["receive-money", "credit-memos"]);
const AP_UP = new Set(["bills", "purchases-receive-inventory", "void-checks"]);
const AP_DOWN = new Set(["payments", "select-for-payment", "vendor-credit-memos"]);

/** Party names known from Admin plus any that only appear on transactions. */
function partyNames(records: readonly AdminRecord[], module: string, ledgers: Map<string, PartyLedger>): string[] {
  const names = records.filter((r) => r.module === module).map((r) => r.name.trim());
  for (const name of ledgers.keys()) if (!names.includes(name)) names.push(name);
  return names;
}

export function agedReceivablesRows(_pkg?: FrcnFinancialStatementPackage, opts?: Options): BuiltReport {
  const strict = opts?.agingInterval === "15-days";
  const step = strict ? 15 : 30;
  const records = loadAdminRecords();
  const ledgers = buildPartyLedgers(AR_UP, AR_DOWN, postedTransactions());
  const now = Date.now();
  const totals = { current: 0, days30: 0, days60: 0, days90: 0, over90: 0 };

  const rows: BuiltRow[] = partyNames(records, "customers", ledgers).map((name) => {
    const b = { current: 0, days30: 0, days60: 0, days90: 0, over90: 0 };
    const l = ledgers.get(name);
    for (const item of l?.items ?? []) {
      if (item.outstanding <= 0) continue;
      const d = daysPastDue(item.tx, now);
      if (d === 0) b.current += item.outstanding;
      else if (d <= step) b.days30 += item.outstanding;
      else if (d <= step * 2) b.days60 += item.outstanding;
      else if (d <= step * 3) b.days90 += item.outstanding;
      else b.over90 += item.outstanding;
    }
    b.current -= l?.unapplied ?? 0; // unapplied receipts are a credit to the customer
    for (const k of Object.keys(totals) as (keyof typeof totals)[]) totals[k] += b[k];
    const rec = records.find((r) => r.module === "customers" && r.name.trim() === name);
    return {
      id: rec?.id ?? `cust-${name}`,
      values: {
        customer: name,
        contact: rec?.contactOrNote || rec?.code || "",
        current: round2(b.current),
        days30: round2(b.days30),
        days60: round2(b.days60),
        days90: round2(b.days90),
        over90: round2(b.over90),
        totalDue: round2(b.current + b.days30 + b.days60 + b.days90 + b.over90),
      },
    };
  });

  const grand = totals.current + totals.days30 + totals.days60 + totals.days90 + totals.over90;
  rows.push({
    id: "ar-total",
    isTotal: true,
    values: {
      customer: "Total Receivables",
      contact: "",
      current: round2(totals.current),
      days30: round2(totals.days30),
      days60: round2(totals.days60),
      days90: round2(totals.days90),
      over90: round2(totals.over90),
      totalDue: round2(grand),
    },
  });
  return {
    rows,
    summaryKpis: [
      { label: "Total Receivables", value: naira(grand) },
      { label: "Current (Not Due)", value: naira(totals.current) },
      { label: `Overdue (>0 Days)`, value: naira(grand - totals.current) },
    ],
  };
}

export function agedPayablesRows(_pkg?: FrcnFinancialStatementPackage, opts?: Options): BuiltReport {
  const records = loadAdminRecords();
  const ledgers = buildPartyLedgers(AP_UP, AP_DOWN, postedTransactions());
  const now = Date.now();
  const totals = { current: 0, days30: 0, days60: 0, days90: 0 };

  const rows: BuiltRow[] = partyNames(records, "vendors", ledgers).map((name) => {
    const b = { current: 0, days30: 0, days60: 0, days90: 0 };
    const l = ledgers.get(name);
    for (const item of l?.items ?? []) {
      if (item.outstanding <= 0) continue;
      const d = daysPastDue(item.tx, now);
      if (d === 0) b.current += item.outstanding;
      else if (d <= 30) b.days30 += item.outstanding;
      else if (d <= 60) b.days60 += item.outstanding;
      else b.days90 += item.outstanding;
    }
    b.current -= l?.unapplied ?? 0;
    for (const k of Object.keys(totals) as (keyof typeof totals)[]) totals[k] += b[k];
    const rec = records.find((r) => r.module === "vendors" && r.name.trim() === name);
    return {
      id: rec?.id ?? `vend-${name}`,
      values: {
        vendor: name,
        tin: rec?.details?.tinNumber ?? rec?.code ?? "",
        current: round2(b.current),
        days30: round2(b.days30),
        days60: round2(b.days60),
        days90: round2(b.days90),
        totalDue: round2(b.current + b.days30 + b.days60 + b.days90),
      },
    };
  });

  const grand = totals.current + totals.days30 + totals.days60 + totals.days90;
  rows.push({
    id: "ap-total",
    isTotal: true,
    values: {
      vendor: "Total Payables",
      tin: "",
      current: round2(totals.current),
      days30: round2(totals.days30),
      days60: round2(totals.days60),
      days90: round2(totals.days90),
      totalDue: round2(grand),
    },
  });
  void opts;
  return {
    rows,
    summaryKpis: [
      { label: "Total Supplier Payables", value: naira(grand) },
      { label: "Due Immediately (Current)", value: naira(totals.current) },
      { label: "Active Suppliers", value: `${rows.length - 1} vendors` },
    ],
  };
}

export function invoiceRegisterRows(_pkg?: FrcnFinancialStatementPackage, opts?: Options): BuiltReport {
  const filter = typeof opts?.statusFilter === "string" ? opts.statusFilter : "all";
  const ledgers = buildPartyLedgers(AR_UP, AR_DOWN, postedTransactions());
  const outstanding = new Map<string, number>();
  for (const l of ledgers.values()) for (const item of l.items) outstanding.set(item.tx.id, item.outstanding);

  const invoices = loadTransactions().filter(
    (t) => t.typeId === "sales-invoicing" || t.typeId === "invoice-time-expenses" || t.typeId === "finance-charge",
  );
  const rows: BuiltRow[] = [];
  let sum = 0;
  let vatSum = 0;
  for (const inv of invoices) {
    let status: string = inv.status;
    if (isPostingTransaction(inv)) {
      const left = outstanding.get(inv.id) ?? 0;
      status = left <= 0 ? "Paid" : left < inv.amountNgn - (inv.whtAmountNgn || 0) ? "Part-paid" : "Open";
    }
    if (filter === "paid" && status !== "Paid") continue;
    if (filter === "unpaid" && (status === "Paid" || status === "Draft" || status === "Voided")) continue;
    if (isPostingTransaction(inv)) {
      sum += inv.amountNgn;
      vatSum += inv.vatAmountNgn;
    }
    rows.push({
      id: inv.id,
      values: {
        ref: inv.reference,
        customer: inv.counterparty,
        issueDate: inv.date,
        dueDate: inv.dueDate || inv.date,
        subtotalNgn: round2(inv.amountNgn - inv.vatAmountNgn),
        vatNgn: inv.vatAmountNgn,
        totalNgn: inv.amountNgn,
        status,
      },
    });
  }
  return {
    rows,
    summaryKpis: [
      { label: "Invoiced Total", value: naira(sum) },
      { label: "Output VAT (7.5%)", value: naira(vatSum) },
      { label: "Invoices Count", value: `${rows.length} invoices` },
    ],
  };
}

// ---------------------------------------------------------------------------------------
// Inventory & payroll
// ---------------------------------------------------------------------------------------

export function inventoryValuationRows(): BuiltReport {
  const items = loadAdminRecords().filter((r) => r.module === "inventory" && isTrackedStockItem(r));
  const onHand = computeStockOnHand(items, loadTransactions());
  let totalValue = 0;
  let totalUnits = 0;
  const rows: BuiltRow[] = items.map((item) => {
    const qty = onHand.get(item.id) ?? 0;
    const cost = stockItemUnitCost(item);
    const value = round2(qty * cost);
    totalValue += value;
    totalUnits += qty;
    return {
      id: item.id,
      values: {
        sku: item.code,
        name: item.name,
        qtyOnHand: qty,
        unitCost: cost,
        assetValue: value,
        reorderLevel: toAmount(item.details?.minStock ?? item.details?.reorderPoint ?? "0"),
      },
    };
  });
  rows.push({
    id: "inv-total",
    isTotal: true,
    values: { sku: "", name: "Total Inventory", qtyOnHand: totalUnits, unitCost: 0, assetValue: round2(totalValue), reorderLevel: 0 },
  });
  return {
    rows,
    summaryKpis: [
      { label: "Total Inventory Value", value: naira(totalValue) },
      { label: "Total Physical Units", value: `${totalUnits.toLocaleString("en-NG")} units` },
      { label: "Valuation Standard", value: "IAS 2 Lower of Cost / NRV" },
    ],
  };
}

export function payrollRegisterRows(_pkg?: FrcnFinancialStatementPackage, opts?: Options): BuiltReport {
  const stateFilter = typeof opts?.stateTaxFilter === "string" ? opts.stateTaxFilter : "all";
  const employees = loadAdminRecords().filter((r) => r.module === "employees");
  const slips = postedTransactions().filter((t) => t.typeId === "payroll-entry");

  const employeeFor = (counterparty: string) => {
    const name = counterparty.split("—")[0]!.trim().toLowerCase();
    return employees.find((e) => e.name.trim().toLowerCase() === name);
  };

  interface Totals { gross: number; empPension: number; paye: number; net: number; erPension: number; slips: number }
  const byPerson = new Map<string, { label: string; staffId: string; state: string; t: Totals }>();
  const blank = (): Totals => ({ gross: 0, empPension: 0, paye: 0, net: 0, erPension: 0, slips: 0 });
  for (const e of employees) {
    byPerson.set(e.id, { label: e.name, staffId: e.code, state: e.details?.lirsTaxState || e.details?.stateOfResidence || "LIRS (Lagos State)", t: blank() });
  }
  for (const tx of slips) {
    const emp = employeeFor(tx.counterparty);
    const key = emp?.id ?? `party:${tx.counterparty}`;
    if (!byPerson.has(key)) byPerson.set(key, { label: tx.counterparty, staffId: "—", state: "—", t: blank() });
    const p = byPerson.get(key)!;
    const slip = computePayslip(tx.details);
    p.t.gross += slip.gross;
    p.t.empPension += slip.employeePension;
    p.t.paye += slip.paye;
    p.t.net += slip.netPay;
    p.t.erPension += slip.employerPension;
    p.t.slips += 1;
  }

  const matchesState = (state: string) =>
    stateFilter === "all" ||
    (stateFilter === "lagos" && /lirs|lagos/i.test(state)) ||
    (stateFilter === "fct" && /fct|abuja/i.test(state));

  const sums = blank();
  const rows: BuiltRow[] = [];
  for (const [id, p] of byPerson) {
    if (!matchesState(p.state)) continue;
    for (const k of Object.keys(sums) as (keyof Totals)[]) sums[k] += p.t[k];
    rows.push({
      id,
      values: {
        staffId: p.staffId,
        name: p.label,
        state: p.state,
        gross: p.t.gross,
        pencomEmployee: p.t.empPension,
        payeTax: p.t.paye,
        netPay: p.t.net,
        pencomEmployer: p.t.erPension,
      },
    });
  }
  rows.push({
    id: "pay-total",
    isTotal: true,
    values: { staffId: "", name: "Payroll Totals", state: `${sums.slips} payslips`, gross: sums.gross, pencomEmployee: sums.empPension, payeTax: sums.paye, netPay: sums.net, pencomEmployer: sums.erPension },
  });
  return {
    rows,
    summaryKpis: [
      { label: "Gross Payroll Cost", value: naira(sums.gross) },
      { label: "Total PAYE Withheld", value: naira(sums.paye) },
      { label: "Net Salaries Disbursed", value: naira(sums.net) },
    ],
  };
}
