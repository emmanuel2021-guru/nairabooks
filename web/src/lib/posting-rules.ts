/**
 * Double-entry posting rules for every Transactions Hub record type.
 *
 * Pure and isomorphic: the server uses it to build journal vouchers, and the browser uses
 * the shared payroll / stock helpers so the editor, the ledger and the reports agree.
 *
 * Amounts are handled in integer kobo (1 NGN = 100 kobo).
 */
import type { AccountCategory } from "@/types/ledger";

// ---------------------------------------------------------------------------------------
// Input shapes (structural, so both the client record type and raw JSON fit)
// ---------------------------------------------------------------------------------------

export interface PostingLineInput {
  readonly description?: string;
  readonly accountCode?: string;
  readonly quantity?: number;
  readonly unitPriceNgn?: number;
  readonly vatApplicable?: boolean;
  readonly debitNgn?: number;
  readonly creditNgn?: number;
  readonly selected?: boolean;
  readonly entryKind?: string;
  /** Inventory item record id when the line was picked from the stock list. */
  readonly itemId?: string;
}

export interface PostingTransactionInput {
  readonly id?: string;
  readonly typeId: string;
  readonly reference: string;
  readonly counterparty?: string;
  readonly date: string;
  readonly status?: string;
  readonly vatEnabled?: boolean;
  readonly vatAmountNgn?: number;
  /** Total incl. VAT; used as a single line when a record arrives without line items. */
  readonly amountNgn?: number;
  readonly whtRatePct?: number;
  readonly lineItems?: readonly PostingLineInput[];
  readonly details?: Readonly<Record<string, string>>;
}

export interface PostingChartAccount {
  readonly code: string;
  readonly name: string;
  readonly category: AccountCategory;
}

/** The parts of an Admin inventory record the posting rules need. */
export interface PostingStockItem {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly module?: string;
  readonly primaryMetricValue?: string;
  readonly details?: Readonly<Record<string, string>>;
}

export interface PlannedLine {
  readonly accountCode: string;
  readonly debitKobo: number;
  readonly creditKobo: number;
  readonly memo: string;
}

export interface NewAccountSpec {
  readonly code: string;
  readonly name: string;
  readonly category: AccountCategory;
  readonly ifrsTag: string;
}

export interface StockMovement {
  readonly itemId: string;
  readonly quantity: number; // + into stock, - out of stock
}

export type PostingPlan =
  | {
      readonly kind: "post";
      readonly lines: readonly PlannedLine[];
      readonly newAccounts: readonly NewAccountSpec[];
      readonly stockMovements: readonly StockMovement[];
    }
  | { readonly kind: "skip"; readonly reason: string; readonly stockMovements: readonly StockMovement[] }
  | { readonly kind: "error"; readonly message: string };

// ---------------------------------------------------------------------------------------
// Which transaction types touch the ledger
// ---------------------------------------------------------------------------------------

/** Documents that record intent or workflow only; they never post to the ledger. */
export const NON_POSTING_TYPES: ReadonlySet<string> = new Set([
  "quotes-sales-orders",
  "select-for-purchase-orders",
  "purchase-orders",
  "select-for-deposit",
  "account-reconciliation",
  "write-letters",
  "action-items",
  "system-tasks",
]);

/** Statuses that are not (yet) accounting events. */
const NON_POSTING_STATUSES: ReadonlySet<string> = new Set(["Draft", "Voided"]);

export function isPostingTransaction(tx: Pick<PostingTransactionInput, "typeId" | "status">): boolean {
  return !NON_POSTING_TYPES.has(tx.typeId) && !NON_POSTING_STATUSES.has(tx.status ?? "Posted");
}

// ---------------------------------------------------------------------------------------
// Number helpers
// ---------------------------------------------------------------------------------------

/** Parse "₦45,000.50", "45000", 45000 → 45000.5. Invalid → 0. */
export function toAmount(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value !== "string") return 0;
  const cleaned = value.replace(/[^0-9.-]/g, "");
  const n = Number.parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
}

export function toKobo(naira: number): number {
  return Math.round(naira * 100);
}

export function koboToDecimalString(kobo: number): string {
  const sign = kobo < 0 ? "-" : "";
  const abs = Math.abs(kobo);
  return `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, "0")}`;
}

/** "4010 Sales Revenue" / "4010 — Sales" / "4010" → "4010". */
export function parseAccountCode(value: string | undefined): string | null {
  if (!value) return null;
  const m = value.trim().match(/^(\d{3,6})\b/);
  return m ? m[1]! : null;
}

// ---------------------------------------------------------------------------------------
// Shared payroll & stock maths (also used by the editor screens)
// ---------------------------------------------------------------------------------------

export const PAYSLIP_DEFAULTS = {
  basicSalary: "390000",
  housingAllowance: "160000",
  transportAllowance: "100000",
  payeTax: "68400",
} as const;

export interface Payslip {
  readonly basic: number;
  readonly housing: number;
  readonly transport: number;
  readonly gross: number;
  readonly employeePension: number; // 8% of gross
  readonly employerPension: number; // 10% of gross
  readonly nhf: number; // 2.5% of basic
  readonly paye: number;
  readonly netPay: number;
}

export function computePayslip(details: Readonly<Record<string, string>> = {}): Payslip {
  const basic = toAmount(details.basicSalary ?? PAYSLIP_DEFAULTS.basicSalary);
  const housing = toAmount(details.housingAllowance ?? PAYSLIP_DEFAULTS.housingAllowance);
  const transport = toAmount(details.transportAllowance ?? PAYSLIP_DEFAULTS.transportAllowance);
  const gross = basic + housing + transport;
  const employeePension = Math.round(gross * 0.08);
  const employerPension = Math.round(gross * 0.1);
  const nhf = Math.round(basic * 0.025);
  const paye = toAmount(details.payeTax ?? PAYSLIP_DEFAULTS.payeTax);
  const netPay = gross - employeePension - nhf - paye;
  return { basic, housing, transport, gross, employeePension, employerPension, nhf, paye, netPay };
}

export const STOCK_COUNT_DEFAULTS = {
  systemQty: "206",
  actualQty: "200",
  yieldQuantity: "50",
  unitCost: "7600",
} as const;

export interface StockCountResult {
  /** + gain / - shrinkage for adjustments; units built for assemblies. */
  readonly deltaQty: number;
  readonly unitCost: number;
  readonly value: number;
}

export function computeStockCount(
  typeId: string,
  details: Readonly<Record<string, string>> = {},
): StockCountResult {
  const unitCost = toAmount(details.unitCost ?? STOCK_COUNT_DEFAULTS.unitCost);
  const deltaQty =
    typeId === "assemblies"
      ? toAmount(details.yieldQuantity ?? STOCK_COUNT_DEFAULTS.yieldQuantity)
      : toAmount(details.actualQty ?? STOCK_COUNT_DEFAULTS.actualQty) -
        toAmount(details.systemQty ?? STOCK_COUNT_DEFAULTS.systemQty);
  return { deltaQty, unitCost, value: Math.abs(deltaQty) * unitCost };
}

/** Unit cost of a stock item (its last purchase cost). */
export function stockItemUnitCost(item: PostingStockItem): number {
  return toAmount(item.details?.lastUnitCost ?? item.details?.standardCost ?? "0");
}

/** Selling price of a stock item (price level 1). */
export function stockItemUnitPrice(item: PostingStockItem): number {
  return toAmount(item.details?.priceLevel1 ?? item.primaryMetricValue ?? "0");
}

export function isTrackedStockItem(item: PostingStockItem): boolean {
  const cls = item.details?.itemClass ?? "Stock Item";
  return cls === "Stock Item" || cls === "Assembly / Kit";
}

/** Opening quantity typed on the item record. */
export function stockItemOpeningQty(item: PostingStockItem): number {
  return toAmount(item.details?.qtyOnHand ?? item.details?.quantityOnHand ?? "0");
}

/** Stock movements a transaction causes, whether or not it posts a voucher. */
export function stockMovementsFor(
  tx: PostingTransactionInput,
  items: readonly PostingStockItem[],
): StockMovement[] {
  if (!isPostingTransaction(tx)) return [];
  const byId = new Map(items.map((i) => [i.id, i]));
  const sign = STOCK_DIRECTION[tx.typeId];
  const moves: StockMovement[] = [];
  if (sign) {
    for (const line of activeLines(tx)) {
      const item = line.itemId ? byId.get(line.itemId) : undefined;
      if (!item || !isTrackedStockItem(item)) continue;
      const qty = Math.max(0, toAmount(line.quantity ?? 1)) || 1;
      moves.push({ itemId: item.id, quantity: sign * qty });
    }
  }
  if (tx.typeId === "inventory-adjustments" || tx.typeId === "assemblies") {
    const itemId = tx.details?.itemId;
    if (itemId && byId.has(itemId)) {
      const { deltaQty } = computeStockCount(tx.typeId, tx.details);
      if (deltaQty !== 0) moves.push({ itemId, quantity: deltaQty });
    }
  }
  return moves;
}

/** On-hand quantity per item: opening quantity plus every posted movement. */
export function computeStockOnHand(
  items: readonly PostingStockItem[],
  transactions: readonly PostingTransactionInput[],
): Map<string, number> {
  const onHand = new Map<string, number>();
  for (const item of items) onHand.set(item.id, stockItemOpeningQty(item));
  for (const tx of transactions) {
    for (const move of stockMovementsFor(tx, items)) {
      onHand.set(move.itemId, (onHand.get(move.itemId) ?? 0) + move.quantity);
    }
  }
  return onHand;
}

/** +1 when the line brings stock in, -1 when it sends stock out. */
const STOCK_DIRECTION: Readonly<Record<string, 1 | -1>> = {
  "sales-invoicing": -1,
  "credit-memos": 1,
  "purchases-receive-inventory": 1,
  bills: 1,
  "write-checks": 1,
  "vendor-credit-memos": -1,
};

// ---------------------------------------------------------------------------------------
// Account resolution by role
// ---------------------------------------------------------------------------------------

type Role =
  | "cash"
  | "bank"
  | "receivable"
  | "payable"
  | "outputVat"
  | "inputVat"
  | "whtPayable"
  | "whtReceivable"
  | "payePayable"
  | "pensionPayable"
  | "nhfPayable"
  | "staffPayable"
  | "salaries"
  | "revenue"
  | "financeIncome"
  | "salesReturns"
  | "cogs"
  | "expense"
  | "inventory"
  | "rawMaterials"
  | "finishedGoods"
  | "inventoryVariance"
  | "openingEquity";

interface RoleRule {
  readonly codes: readonly string[];
  readonly match?: (a: PostingChartAccount) => boolean;
  readonly create: NewAccountSpec;
}

const nameIs = (re: RegExp) => (a: PostingChartAccount) => re.test(a.name);

const ROLE_RULES: Readonly<Record<Role, RoleRule>> = {
  bank: {
    codes: ["1110"],
    match: (a) => a.category === "ASSET" && /bank/i.test(a.name) && !/domiciliary|usd|foreign/i.test(a.name),
    create: { code: "1110", name: "Operating Bank Accounts (NGN)", category: "ASSET", ifrsTag: "CASH_AND_CASH_EQUIVALENTS" },
  },
  cash: {
    codes: ["1010"],
    match: (a) => a.category === "ASSET" && /cash/i.test(a.name),
    create: { code: "1010", name: "Cash in Hand & Till Float", category: "ASSET", ifrsTag: "CASH_AND_CASH_EQUIVALENTS" },
  },
  receivable: {
    codes: ["1120"],
    match: (a) => a.category === "ASSET" && /receivable/i.test(a.name) && !/wht|tax/i.test(a.name),
    create: { code: "1120", name: "Trade Accounts Receivable", category: "ASSET", ifrsTag: "TRADE_RECEIVABLES" },
  },
  whtReceivable: {
    codes: ["1340"],
    match: (a) => a.category === "ASSET" && /wht|withholding/i.test(a.name),
    create: { code: "1340", name: "Withholding Tax Credit Asset", category: "ASSET", ifrsTag: "CURRENT_TAX_ASSETS" },
  },
  inventory: {
    codes: ["1200", "1210", "1230", "1205", "1240"],
    match: (a) => a.category === "ASSET" && /inventor|stock/i.test(a.name),
    create: { code: "1200", name: "Merchandise Inventory (IAS 2)", category: "ASSET", ifrsTag: "INVENTORIES" },
  },
  rawMaterials: {
    codes: ["1215"],
    match: (a) => a.category === "ASSET" && /raw material|component/i.test(a.name),
    create: { code: "1215", name: "Raw Materials Inventory", category: "ASSET", ifrsTag: "INVENTORIES" },
  },
  finishedGoods: {
    codes: ["1230"],
    match: (a) => a.category === "ASSET" && /finished goods/i.test(a.name),
    create: { code: "1230", name: "Finished Goods Inventory", category: "ASSET", ifrsTag: "INVENTORIES" },
  },
  payable: {
    codes: ["2110"],
    match: (a) => a.category === "LIABILITY" && /payable/i.test(a.name) && /trade|supplier|account/i.test(a.name),
    create: { code: "2110", name: "Trade Accounts Payable", category: "LIABILITY", ifrsTag: "TRADE_PAYABLES" },
  },
  outputVat: {
    codes: ["2210"],
    match: (a) => a.category === "LIABILITY" && /output vat/i.test(a.name),
    create: { code: "2210", name: "Output VAT Payable (7.5% NRS)", category: "LIABILITY", ifrsTag: "TAX_LIABILITIES" },
  },
  inputVat: {
    codes: ["2215"],
    match: nameIs(/input vat|recoverable.*vat/i),
    create: { code: "2215", name: "Recoverable Input VAT", category: "LIABILITY", ifrsTag: "TAX_LIABILITIES" },
  },
  whtPayable: {
    codes: ["2220"],
    match: (a) => a.category === "LIABILITY" && /wht|withholding/i.test(a.name),
    create: { code: "2220", name: "Withholding Tax Payable (WHT)", category: "LIABILITY", ifrsTag: "TAX_LIABILITIES" },
  },
  payePayable: {
    codes: ["2240"],
    match: (a) => a.category === "LIABILITY" && /paye/i.test(a.name),
    create: { code: "2240", name: "PAYE Tax & PENCOM Deductions", category: "LIABILITY", ifrsTag: "EMPLOYEE_BENEFIT_LIABILITIES" },
  },
  pensionPayable: {
    codes: ["2245"],
    match: (a) => a.category === "LIABILITY" && /pension|pencom/i.test(a.name) && !/paye/i.test(a.name),
    create: { code: "2245", name: "PenCom Pension Contributions Payable", category: "LIABILITY", ifrsTag: "EMPLOYEE_BENEFIT_LIABILITIES" },
  },
  nhfPayable: {
    codes: ["2246"],
    match: (a) => a.category === "LIABILITY" && /nhf|housing fund/i.test(a.name),
    create: { code: "2246", name: "NHF Contributions Payable", category: "LIABILITY", ifrsTag: "EMPLOYEE_BENEFIT_LIABILITIES" },
  },
  staffPayable: {
    codes: ["2230"],
    match: (a) => a.category === "LIABILITY" && /staff expense|reimburse/i.test(a.name),
    create: { code: "2230", name: "Staff Expense Claims Payable", category: "LIABILITY", ifrsTag: "OTHER_PAYABLES" },
  },
  openingEquity: {
    codes: ["3900"],
    match: nameIs(/opening balance/i),
    create: { code: "3900", name: "Opening Balance Equity", category: "EQUITY", ifrsTag: "OTHER_RESERVES" },
  },
  revenue: {
    codes: [],
    match: (a) => a.category === "REVENUE" && !/discount|return|finance income|interest/i.test(a.name),
    create: { code: "4010", name: "Sales Revenue", category: "REVENUE", ifrsTag: "REVENUE_FROM_CONTRACTS" },
  },
  financeIncome: {
    codes: ["4090"],
    match: (a) => a.category === "REVENUE" && /finance income|interest/i.test(a.name),
    create: { code: "4090", name: "Finance Charges & Interest Income", category: "REVENUE", ifrsTag: "FINANCE_INCOME" },
  },
  salesReturns: {
    codes: ["4050"],
    match: (a) => a.category === "REVENUE" && /return|discount/i.test(a.name),
    create: { code: "4050", name: "Sales Returns & Allowances", category: "REVENUE", ifrsTag: "REVENUE_FROM_CONTRACTS" },
  },
  cogs: {
    codes: ["5010", "5100"],
    match: (a) => a.category === "EXPENSE" && /cost of goods|cogs|cost of stock|cogm/i.test(a.name),
    create: { code: "5010", name: "Cost of Goods Sold (COGS)", category: "EXPENSE", ifrsTag: "COST_OF_SALES" },
  },
  inventoryVariance: {
    codes: ["5190"],
    match: (a) => a.category === "EXPENSE" && /shrinkage|stock variance|inventory (loss|gain)/i.test(a.name),
    create: { code: "5190", name: "Inventory Shrinkage & Count Variance", category: "EXPENSE", ifrsTag: "COST_OF_SALES" },
  },
  salaries: {
    codes: ["6110"],
    match: (a) => a.category === "EXPENSE" && /salar|payroll|wage/i.test(a.name),
    create: { code: "6110", name: "Payroll & Staff Welfare Expense", category: "EXPENSE", ifrsTag: "EMPLOYEE_BENEFITS" },
  },
  expense: {
    codes: [],
    match: (a) =>
      a.category === "EXPENSE" &&
      !/cost of goods|cogs|depreciation|salar|payroll|wage|shrinkage/i.test(a.name),
    create: { code: "6900", name: "General Operating Expenses", category: "EXPENSE", ifrsTag: "ADMINISTRATIVE_EXPENSES" },
  },
};

class AccountResolver {
  private readonly byCode = new Map<string, PostingChartAccount>();
  readonly created: NewAccountSpec[] = [];

  constructor(chart: readonly PostingChartAccount[]) {
    const sorted = [...chart].sort((a, b) => a.code.localeCompare(b.code));
    for (const a of sorted) this.byCode.set(a.code, a);
  }

  has(code: string | null): code is string {
    return code !== null && this.byCode.has(code);
  }

  category(code: string): AccountCategory | undefined {
    return this.byCode.get(code)?.category;
  }

  /** The account this company uses for a role, without adding one. */
  find(role: Role): string | null {
    const rule = ROLE_RULES[role];
    for (const code of rule.codes) if (this.byCode.has(code)) return code;
    if (rule.match) {
      for (const a of this.byCode.values()) if (rule.match(a)) return a.code;
    }
    return null;
  }

  role(role: Role): string {
    const rule = ROLE_RULES[role];
    for (const code of rule.codes) if (this.byCode.has(code)) return code;
    if (rule.match) {
      for (const a of this.byCode.values()) if (rule.match(a)) return a.code;
    }
    // Not in this company's chart: add the standard account (once).
    let code = rule.create.code;
    while (this.byCode.has(code)) code = String(Number(code) + 1);
    const spec = { ...rule.create, code };
    this.byCode.set(code, spec);
    this.created.push(spec);
    return code;
  }

  /** The line's own account when it is in the chart (and of an allowed kind), else the role. */
  lineOr(line: PostingLineInput, role: Role, allowed?: readonly AccountCategory[]): string {
    const code = parseAccountCode(line.accountCode);
    if (this.has(code)) {
      const cat = this.category(code);
      if (!allowed || (cat && allowed.includes(cat))) return code;
    }
    return this.role(role);
  }
}

// ---------------------------------------------------------------------------------------
// Journal builder
// ---------------------------------------------------------------------------------------

class JournalBuilder {
  private readonly lines: PlannedLine[] = [];
  debit(accountCode: string, kobo: number, memo: string): void {
    if (kobo > 0) this.lines.push({ accountCode, debitKobo: kobo, creditKobo: 0, memo });
    else if (kobo < 0) this.credit(accountCode, -kobo, memo);
  }
  credit(accountCode: string, kobo: number, memo: string): void {
    if (kobo > 0) this.lines.push({ accountCode, debitKobo: 0, creditKobo: kobo, memo });
    else if (kobo < 0) this.debit(accountCode, -kobo, memo);
  }
  totals(): { debit: number; credit: number } {
    let debit = 0;
    let credit = 0;
    for (const l of this.lines) {
      debit += l.debitKobo;
      credit += l.creditKobo;
    }
    return { debit, credit };
  }
  /** Merge lines that hit the same account on the same side with the same memo. */
  build(): PlannedLine[] {
    const merged = new Map<string, PlannedLine>();
    for (const l of this.lines) {
      const key = `${l.accountCode}|${l.debitKobo > 0 ? "D" : "C"}|${l.memo}`;
      const prev = merged.get(key);
      merged.set(
        key,
        prev
          ? { ...prev, debitKobo: prev.debitKobo + l.debitKobo, creditKobo: prev.creditKobo + l.creditKobo }
          : l,
      );
    }
    return [...merged.values()];
  }
}

const SETTLEMENT_TYPES: ReadonlySet<string> = new Set([
  "receive-money",
  "select-for-deposit",
  "select-for-purchase-orders",
  "select-for-payment",
  "payments",
  "select-for-payroll",
]);

/** Lines that count: settlement screens only count ticked or manually added lines. */
function activeLines(tx: PostingTransactionInput): PostingLineInput[] {
  let lines = tx.lineItems ?? [];
  const total = toAmount(tx.amountNgn ?? 0);
  if (lines.length === 0 && total > 0) {
    lines = [{ description: tx.reference, quantity: 1, unitPriceNgn: total - toAmount(tx.vatAmountNgn ?? 0) }];
  }
  if (!SETTLEMENT_TYPES.has(tx.typeId)) return [...lines];
  return lines.filter((l) => l.entryKind === "manual-item" || l.selected !== false);
}

function lineBaseKobo(line: PostingLineInput): number {
  const qty = line.quantity === undefined ? 1 : toAmount(line.quantity);
  return toKobo((qty || 0) * toAmount(line.unitPriceNgn ?? 0));
}

function vatEnabled(tx: PostingTransactionInput): boolean {
  if (typeof tx.vatEnabled === "boolean") return tx.vatEnabled;
  return toAmount(tx.vatAmountNgn ?? 0) > 0;
}

interface LineTotals {
  readonly subtotal: number;
  readonly vat: number;
  readonly wht: number;
}

function lineTotals(tx: PostingTransactionInput, lines: readonly PostingLineInput[], withWht: boolean): LineTotals {
  let subtotal = 0;
  let taxable = 0;
  const vatOn = vatEnabled(tx);
  for (const line of lines) {
    const base = lineBaseKobo(line);
    subtotal += base;
    if (vatOn && line.vatApplicable !== false) taxable += base;
  }
  const vat = Math.round(taxable * 0.075);
  const rate = withWht ? toAmount(tx.whtRatePct ?? 0) : 0;
  const wht = rate > 0 ? Math.round(subtotal * (rate / 100)) : 0;
  return { subtotal, vat, wht };
}

export interface BuildPostingOptions {
  readonly chart: readonly PostingChartAccount[];
  readonly stockItems?: readonly PostingStockItem[];
}

/**
 * Turn one Transactions Hub record into a balanced journal (or explain why it does not post).
 */
export function buildPostingPlan(tx: PostingTransactionInput, options: BuildPostingOptions): PostingPlan {
  const items = options.stockItems ?? [];
  const stockMovements = stockMovementsFor(tx, items);
  if (NON_POSTING_TYPES.has(tx.typeId)) {
    return { kind: "skip", reason: "This document type does not post to the ledger.", stockMovements };
  }
  if (NON_POSTING_STATUSES.has(tx.status ?? "Posted")) {
    return { kind: "skip", reason: `${tx.status} records are not posted to the ledger.`, stockMovements };
  }

  const acc = new AccountResolver(options.chart);
  const j = new JournalBuilder();
  const ref = tx.reference || "TX";
  const party = tx.counterparty?.trim() || "General";
  const lines = activeLines(tx);
  const itemsById = new Map(items.map((i) => [i.id, i]));
  const stockItemFor = (line: PostingLineInput): PostingStockItem | undefined => {
    const item = line.itemId ? itemsById.get(line.itemId) : undefined;
    return item && isTrackedStockItem(item) ? item : undefined;
  };
  const itemAccount = (item: PostingStockItem, key: string, role: Role): string => {
    const code = parseAccountCode(item.details?.[key]);
    return acc.has(code) ? code : acc.role(role);
  };
  const lineQty = (line: PostingLineInput) => Math.max(0, toAmount(line.quantity ?? 1)) || 1;

  switch (tx.typeId) {
    // ---- Money in ------------------------------------------------------------------
    case "sales-invoicing":
    case "invoice-time-expenses":
    case "finance-charge": {
      const t = lineTotals(tx, lines, true);
      const defaultRole: Role = tx.typeId === "finance-charge" ? "financeIncome" : "revenue";
      for (const line of lines) {
        j.credit(acc.lineOr(line, defaultRole, ["REVENUE"]), lineBaseKobo(line), `Sales - ${ref} (${party})`);
        const item = stockItemFor(line);
        const cost = item ? toKobo(lineQty(line) * stockItemUnitCost(item)) : 0;
        if (item && cost > 0) {
          j.debit(itemAccount(item, "glCogsAcct", "cogs"), cost, `Cost of sales - ${item.name} (${ref})`);
          j.credit(itemAccount(item, "glInventoryAcct", "inventory"), cost, `Stock issued - ${item.name} (${ref})`);
        }
      }
      j.credit(acc.role("outputVat"), t.vat, `Output VAT 7.5% - ${ref}`);
      j.debit(acc.role("receivable"), t.subtotal + t.vat - t.wht, `Receivable - ${ref} (${party})`);
      j.debit(acc.role("whtReceivable"), t.wht, `WHT deducted by customer - ${ref}`);
      break;
    }
    case "receive-money": {
      const t = lineTotals(tx, lines, false);
      j.debit(acc.role("bank"), t.subtotal, `Receipt - ${ref} from ${party}`);
      j.credit(acc.role("receivable"), t.subtotal, `Customer payment - ${ref} (${party})`);
      break;
    }
    case "credit-memos": {
      const t = lineTotals(tx, lines, false);
      for (const line of lines) {
        j.debit(acc.lineOr(line, "salesReturns", ["REVENUE"]), lineBaseKobo(line), `Sales return - ${ref} (${party})`);
        const item = stockItemFor(line);
        const cost = item ? toKobo(lineQty(line) * stockItemUnitCost(item)) : 0;
        if (item && cost > 0) {
          j.debit(itemAccount(item, "glInventoryAcct", "inventory"), cost, `Stock returned - ${item.name} (${ref})`);
          j.credit(itemAccount(item, "glCogsAcct", "cogs"), cost, `Cost of sales reversed - ${item.name} (${ref})`);
        }
      }
      j.debit(acc.role("outputVat"), t.vat, `Output VAT reversed - ${ref}`);
      j.credit(acc.role("receivable"), t.subtotal + t.vat, `Credit to customer - ${ref} (${party})`);
      break;
    }

    // ---- Money out -----------------------------------------------------------------
    case "purchases-receive-inventory":
    case "bills":
    case "write-checks": {
      const t = lineTotals(tx, lines, true);
      for (const line of lines) {
        const item = stockItemFor(line);
        const code =
          tx.typeId === "purchases-receive-inventory"
            ? item
              ? itemAccount(item, "glInventoryAcct", "inventory")
              : acc.lineOr(line, "inventory", ["ASSET"])
            : item
              ? itemAccount(item, "glInventoryAcct", "inventory")
              : acc.lineOr(line, "expense", ["EXPENSE", "ASSET"]);
        j.debit(code, lineBaseKobo(line), `Purchase - ${ref} from ${party}`);
      }
      j.debit(acc.role("inputVat"), t.vat, `Input VAT 7.5% - ${ref}`);
      const creditRole: Role = tx.typeId === "write-checks" ? "bank" : "payable";
      j.credit(acc.role(creditRole), t.subtotal + t.vat - t.wht, `${creditRole === "bank" ? "Cheque" : "Payable"} - ${ref} to ${party}`);
      j.credit(acc.role("whtPayable"), t.wht, `WHT withheld - ${ref}`);
      break;
    }
    case "payments":
    case "select-for-payment": {
      const t = lineTotals(tx, lines, false);
      j.debit(acc.role("payable"), t.subtotal, `Supplier payment - ${ref} to ${party}`);
      j.credit(acc.role("bank"), t.subtotal, `Bank payment - ${ref} to ${party}`);
      break;
    }
    case "vendor-credit-memos": {
      const t = lineTotals(tx, lines, false);
      for (const line of lines) {
        const item = stockItemFor(line);
        const code = item
          ? itemAccount(item, "glInventoryAcct", "inventory")
          : acc.lineOr(line, "expense", ["EXPENSE", "ASSET"]);
        j.credit(code, lineBaseKobo(line), `Supplier credit - ${ref} (${party})`);
      }
      j.credit(acc.role("inputVat"), t.vat, `Input VAT reversed - ${ref}`);
      j.debit(acc.role("payable"), t.subtotal + t.vat, `Supplier credit - ${ref} (${party})`);
      break;
    }

    // ---- Banking -------------------------------------------------------------------
    case "account-register": {
      const isDeposit = !/withdraw|decrease/i.test(tx.details?.entryDirection ?? "Deposit");
      const bank = acc.role("bank");
      for (const line of lines) {
        const other = acc.lineOr(line, isDeposit ? "revenue" : "expense");
        const amt = lineBaseKobo(line);
        const memo = `${isDeposit ? "Deposit" : "Withdrawal"} - ${ref} (${party})`;
        if (other === bank) continue;
        if (isDeposit) {
          j.debit(bank, amt, memo);
          j.credit(other, amt, memo);
        } else {
          j.debit(other, amt, memo);
          j.credit(bank, amt, memo);
        }
      }
      break;
    }
    case "void-checks": {
      const t = lineTotals(tx, lines, false);
      j.debit(acc.role("bank"), t.subtotal, `Voided cheque - ${ref} (${party})`);
      j.credit(acc.role("payable"), t.subtotal, `Voided cheque reinstates payable - ${ref}`);
      break;
    }

    // ---- Time & payroll ------------------------------------------------------------
    case "time-expense": {
      const t = lineTotals(tx, lines, false);
      for (const line of lines) {
        j.debit(acc.lineOr(line, "expense", ["EXPENSE"]), lineBaseKobo(line), `Staff expense - ${ref} (${party})`);
      }
      j.credit(acc.role("staffPayable"), t.subtotal, `Owed to staff - ${ref} (${party})`);
      break;
    }
    case "payroll-entry": {
      const slip = computePayslip(tx.details);
      if (slip.gross <= 0) return { kind: "error", message: "Gross pay must be more than ₦0." };
      if (slip.netPay < 0) {
        return { kind: "error", message: "Deductions (pension, NHF and PAYE) are larger than gross pay." };
      }
      const memo = `Payroll - ${ref} (${party})`;
      j.debit(acc.role("salaries"), toKobo(slip.gross + slip.employerPension), `${memo}: gross pay + employer pension`);
      j.credit(acc.role("payePayable"), toKobo(slip.paye), `${memo}: PAYE withheld`);
      j.credit(acc.role("pensionPayable"), toKobo(slip.employeePension + slip.employerPension), `${memo}: PenCom 8% + 10%`);
      j.credit(acc.role("nhfPayable"), toKobo(slip.nhf), `${memo}: NHF 2.5%`);
      j.credit(acc.role("bank"), toKobo(slip.netPay), `${memo}: net pay`);
      break;
    }
    case "select-for-payroll": {
      // A batch of staff with their net pay: pay salaries straight from the bank.
      const t = lineTotals(tx, lines, false);
      j.debit(acc.role("salaries"), t.subtotal, `Payroll batch - ${ref}`);
      j.credit(acc.role("bank"), t.subtotal, `Payroll batch paid - ${ref}`);
      break;
    }

    // ---- Ledger & stock ------------------------------------------------------------
    case "general-journal": {
      for (const [i, line] of lines.entries()) {
        const code = parseAccountCode(line.accountCode);
        const dr = toKobo(toAmount(line.debitNgn ?? 0));
        const cr = toKobo(toAmount(line.creditNgn ?? 0));
        if (dr === 0 && cr === 0) continue;
        if (!acc.has(code)) {
          return {
            kind: "error",
            message: `Line ${i + 1}: account '${line.accountCode ?? ""}' is not in your chart of accounts.`,
          };
        }
        const memo = line.description?.trim() || `${party} - ${ref}`;
        j.debit(code, dr, memo);
        j.credit(code, cr, memo);
      }
      break;
    }
    case "inventory-adjustments": {
      const count = computeStockCount(tx.typeId, tx.details);
      const item = tx.details?.itemId ? itemsById.get(tx.details.itemId) : undefined;
      const inv = item ? itemAccount(item, "glInventoryAcct", "inventory") : acc.role("inventory");
      const value = toKobo(count.value);
      const memo = `Stock count ${count.deltaQty < 0 ? "shortage" : "gain"} - ${ref} (${party})`;
      if (count.deltaQty < 0) {
        j.debit(acc.role("inventoryVariance"), value, memo);
        j.credit(inv, value, memo);
      } else {
        j.debit(inv, value, memo);
        j.credit(acc.role("inventoryVariance"), value, memo);
      }
      break;
    }
    case "assemblies": {
      const count = computeStockCount(tx.typeId, tx.details);
      const fg = acc.role("finishedGoods");
      const rm = acc.role("rawMaterials");
      const value = toKobo(count.value);
      j.debit(fg, value, `Assembly built - ${ref} (${party})`);
      j.credit(rm, value, `Components used - ${ref} (${party})`);
      break;
    }

    default:
      return { kind: "error", message: `Unknown transaction type '${tx.typeId}'.` };
  }

  const built = j.build();
  const { debit, credit } = j.totals();
  if (debit <= 0) {
    return { kind: "error", message: "Enter an amount greater than ₦0 before posting." };
  }
  if (debit !== credit) {
    return {
      kind: "error",
      message: `Journal is out of balance: debits ${koboToDecimalString(debit)} vs credits ${koboToDecimalString(credit)}.`,
    };
  }
  return { kind: "post", lines: built, newAccounts: acc.created, stockMovements };
}

// ---------------------------------------------------------------------------------------
// Editor helpers
// ---------------------------------------------------------------------------------------

/** Map an Admin IFRS element ("Assets — Current", "Revenue", …) to a ledger category. */
export function categoryFromIfrsElement(element: string): AccountCategory | null {
  if (element.startsWith("Assets")) return "ASSET";
  if (element.startsWith("Liabilities")) return "LIABILITY";
  if (element.startsWith("Equity")) return "EQUITY";
  if (element.startsWith("Revenue")) return "REVENUE";
  if (element.startsWith("Expenses")) return "EXPENSE";
  return null;
}

const LINE_ROLE_BY_TYPE: Readonly<Record<string, Role>> = {
  "quotes-sales-orders": "revenue",
  "sales-invoicing": "revenue",
  "invoice-time-expenses": "revenue",
  "finance-charge": "financeIncome",
  "credit-memos": "salesReturns",
  "select-for-purchase-orders": "inventory",
  "purchase-orders": "inventory",
  "purchases-receive-inventory": "inventory",
  bills: "expense",
  "write-checks": "expense",
  "vendor-credit-memos": "expense",
  "time-expense": "expense",
  "account-register": "revenue",
};

/** The account a new line of this transaction type should start on, if the chart has one. */
export function suggestLineAccountCode(
  typeId: string,
  chart: readonly PostingChartAccount[],
): string | null {
  const role = LINE_ROLE_BY_TYPE[typeId];
  return role ? new AccountResolver(chart).find(role) : null;
}
