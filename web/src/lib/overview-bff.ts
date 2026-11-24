/**
 * Overview dashboard figures for a real company, computed from its ledger and its saved
 * Transactions Hub records (the demo company keeps its illustrative dashboard).
 */
import { getWorkspaceLedgerForReporting } from "@/lib/bff-client";
import { readDocument } from "@/lib/persistence";
import { isPostingTransaction, toAmount } from "@/lib/posting-rules";
import type { ChartOfAccount, JournalVoucher } from "@/types/ledger";
import type {
  CashflowBarPoint,
  ExpenseCategoryItem,
  LiveOverviewData,
  OverdueInvoiceItem,
  OverviewTimeframeId,
  TimeframeSnapshot,
} from "@/types/overview";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const LONG_MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const BAR_CLASSES = ["bg-[#006838]", "bg-[#0F4C81]", "bg-[#059669]", "bg-[#64748B]"];

interface Range {
  readonly start: string; // inclusive YYYY-MM-DD
  readonly end: string; // inclusive
}

const iso = (y: number, m: number, d: number) =>
  `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
const lastDay = (y: number, m: number) => new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
const monthRange = (y: number, m: number): Range => ({ start: iso(y, m, 1), end: iso(y, m, lastDay(y, m)) });

/** Full naira with commas, e.g. 1234567.5 → "1,234,567.50". */
function money(naira: number): string {
  return Math.abs(naira).toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Short naira for chart labels, e.g. ₦1.25M / ₦3.4k. */
function shortMoney(naira: number): string {
  const abs = Math.abs(naira);
  const sign = naira < 0 ? "-" : "";
  if (abs >= 1_000_000) return `${sign}₦${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${sign}₦${(abs / 1_000).toFixed(1)}k`;
  return `${sign}₦${abs.toFixed(0)}`;
}

/** Vouchers that count: reversed originals and their reversals cancel out, so skip both. */
function liveVouchers(vouchers: readonly JournalVoucher[]): JournalVoucher[] {
  return vouchers.filter((v) => v.status === "POSTED" && v.sourceModule !== "REVERSAL");
}

function inRange(v: JournalVoucher, r: Range): boolean {
  return v.postingDate >= r.start && v.postingDate <= r.end;
}

const isCash = (a: ChartOfAccount) =>
  a.category === "ASSET" && /bank|cash/i.test(a.name) && !/receivable|clearing/i.test(a.name);

function lineNet(line: JournalVoucher["lines"][number]): number {
  return toAmount(line.debit.functionalAmountNgn) - toAmount(line.credit.functionalAmountNgn);
}

function netIncome(accounts: Map<string, ChartOfAccount>, vouchers: readonly JournalVoucher[], r: Range): number {
  let total = 0;
  for (const v of vouchers) {
    if (!inRange(v, r)) continue;
    for (const line of v.lines) {
      const cat = accounts.get(line.accountId)?.category;
      if (cat === "REVENUE" || cat === "EXPENSE") total -= lineNet(line);
    }
  }
  return total;
}

function cashMoves(accounts: Map<string, ChartOfAccount>, vouchers: readonly JournalVoucher[], r: Range) {
  let inflow = 0;
  let outflow = 0;
  for (const v of vouchers) {
    if (!inRange(v, r)) continue;
    for (const line of v.lines) {
      const acct = accounts.get(line.accountId);
      if (!acct || !isCash(acct)) continue;
      inflow += toAmount(line.debit.functionalAmountNgn);
      outflow += toAmount(line.credit.functionalAmountNgn);
    }
  }
  return { inflow, outflow };
}

function topExpenses(accounts: Map<string, ChartOfAccount>, vouchers: readonly JournalVoucher[], r: Range): ExpenseCategoryItem[] {
  const byAccount = new Map<string, number>();
  for (const v of vouchers) {
    if (!inRange(v, r)) continue;
    for (const line of v.lines) {
      if (accounts.get(line.accountId)?.category !== "EXPENSE") continue;
      byAccount.set(line.accountId, (byAccount.get(line.accountId) ?? 0) + lineNet(line));
    }
  }
  const positive = [...byAccount].filter(([, amt]) => amt > 0);
  const total = positive.reduce((s, [, amt]) => s + amt, 0);
  return positive
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([accountId, amt], i) => {
      const acct = accounts.get(accountId)!;
      return {
        id: accountId,
        label: acct.name,
        proCode: `${acct.code} ${acct.name}`,
        amountNgn: `₦${money(amt)}`,
        sharePct: total > 0 ? Math.round((amt / total) * 100) : 0,
        barClass: BAR_CLASSES[i]!,
      };
    });
}

function percentChange(current: number, previous: number): string {
  if (previous === 0) return current === 0 ? "0.0%" : "New";
  const pct = ((current - previous) / Math.abs(previous)) * 100;
  return `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%`;
}

/** Customer invoices past their due date with money still owed (payments settle oldest first). */
function overdueInvoices(workspaceId: string, today: string): { list: OverdueInvoiceItem[]; count: number } {
  const raw = readDocument<unknown>(`records:transactions:${workspaceId}`);
  if (!Array.isArray(raw)) return { list: [], count: 0 };
  type Tx = { id: string; typeId: string; status?: string; reference: string; counterparty: string; date: string; dueDate?: string; amountNgn: number; whtAmountNgn?: number };
  const txs = (raw as Tx[])
    .filter((t) => t && typeof t.typeId === "string" && isPostingTransaction(t))
    .sort((a, b) => a.date.localeCompare(b.date));
  const up = new Set(["sales-invoicing", "invoice-time-expenses", "finance-charge"]);
  const down = new Set(["receive-money", "credit-memos"]);
  const credits = new Map<string, number>();
  for (const t of txs) {
    if (down.has(t.typeId)) {
      const k = t.counterparty.trim().toLowerCase();
      credits.set(k, (credits.get(k) ?? 0) + toAmount(t.amountNgn));
    }
  }
  const overdue: Array<OverdueInvoiceItem & { due: string }> = [];
  for (const t of txs) {
    if (!up.has(t.typeId)) continue;
    const k = t.counterparty.trim().toLowerCase();
    let open = toAmount(t.amountNgn) - toAmount(t.whtAmountNgn ?? 0);
    const available = credits.get(k) ?? 0;
    const applied = Math.min(open, available);
    credits.set(k, available - applied);
    open -= applied;
    const due = t.dueDate || t.date;
    if (open > 0.005 && due < today) {
      const days = Math.floor((Date.parse(today) - Date.parse(due)) / 86_400_000);
      overdue.push({ id: t.id, clientName: t.counterparty, daysOverdue: days, amountNgn: `₦${money(open)}`, invoiceRef: t.reference, due });
    }
  }
  overdue.sort((a, b) => a.due.localeCompare(b.due));
  return { list: overdue.slice(0, 3).map(({ due: _due, ...item }) => item), count: overdue.length };
}

export function buildLiveOverview(workspaceId: string, now: Date = new Date()): LiveOverviewData {
  const { accounts: chart, vouchers: all } = getWorkspaceLedgerForReporting(workspaceId);
  const accounts = new Map(chart.map((a) => [a.id, a]));
  const vouchers = liveVouchers(all);
  const y = now.getFullYear();
  const m = now.getMonth();
  const today = iso(y, m, now.getDate());

  // Trailing six months of cash in/out, shared by every timeframe.
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(y, m - 5 + i, 1);
    return { y: d.getFullYear(), m: d.getMonth() };
  });
  const moves = months.map((mm) => cashMoves(accounts, vouchers, monthRange(mm.y, mm.m)));
  const peak = Math.max(1, ...moves.flatMap((mv) => [mv.inflow, mv.outflow]));
  const bars: CashflowBarPoint[] = months.map((mm, i) => ({
    label: MONTHS[mm.m]!,
    inflowPct: Math.round((moves[i]!.inflow / peak) * 100),
    outflowPct: Math.round((moves[i]!.outflow / peak) * 100),
    inflowNgn: shortMoney(moves[i]!.inflow),
    outflowNgn: shortMoney(moves[i]!.outflow),
    ...(i === 5 ? { isCurrent: true } : {}),
  }));
  const thisMonthNet = moves[5]!.inflow - moves[5]!.outflow;
  const trailing = `Trailing 6 months (${MONTHS[months[0]!.m]} – ${MONTHS[m]})`;

  const q = Math.floor(m / 3);
  const ranges: Record<OverviewTimeframeId, { label: string; note: string; current: Range; previous: Range }> = {
    month: {
      label: "This Month",
      note: `${LONG_MONTHS[m]} ${y} · Current month`,
      current: monthRange(y, m),
      previous: m === 0 ? monthRange(y - 1, 11) : monthRange(y, m - 1),
    },
    quarter: {
      label: "This Quarter",
      note: `Q${q + 1} ${y} · ${MONTHS[q * 3]} – ${MONTHS[q * 3 + 2]}`,
      current: { start: iso(y, q * 3, 1), end: iso(y, q * 3 + 2, lastDay(y, q * 3 + 2)) },
      previous:
        q === 0
          ? { start: iso(y - 1, 9, 1), end: iso(y - 1, 11, 31) }
          : { start: iso(y, q * 3 - 3, 1), end: iso(y, q * 3 - 1, lastDay(y, q * 3 - 1)) },
    },
    ytd: {
      label: "Year to Date",
      note: `1 Jan – ${now.getDate()} ${MONTHS[m]} ${y} · Year to date`,
      current: { start: iso(y, 0, 1), end: today },
      previous: { start: iso(y - 1, 0, 1), end: iso(y - 1, m, Math.min(now.getDate(), lastDay(y - 1, m))) },
    },
  };

  const timeframes = {} as Record<OverviewTimeframeId, TimeframeSnapshot>;
  for (const id of ["month", "quarter", "ytd"] as const) {
    const r = ranges[id];
    const net = netIncome(accounts, vouchers, r.current);
    timeframes[id] = {
      id,
      label: r.label,
      rangeNote: r.note,
      netIncomeNgn: `${net < 0 ? "-" : ""}${money(net)}`,
      netIncomeDelta: percentChange(net, netIncome(accounts, vouchers, r.previous)),
      cashFlowBars: bars,
      cashFlowSummary: `${trailing} · Net ${thisMonthNet >= 0 ? "+" : "-"}₦${money(thisMonthNet)} this month`,
      topExpenses: topExpenses(accounts, vouchers, r.current),
      unreconciledCount: 0,
    };
  }

  const overdue = overdueInvoices(workspaceId, today);
  return { timeframes, overdueInvoices: overdue.list, overdueCount: overdue.count };
}
