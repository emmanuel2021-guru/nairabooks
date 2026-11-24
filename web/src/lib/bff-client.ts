/**
 * Next.js server ledger: per-workspace double-entry books, persisted as one document per
 * workspace (`ledger:<workspaceId>`) through `@/lib/persistence` (Postgres in production).
 */

import { createHash } from "node:crypto";
import { readDocument, writeDocument } from "@/lib/persistence";
import { convertToNgnKobo, formatKobo, parseMoneyToKobo, parseRateScaled } from "@/lib/decimal";
import {
  SECTOR_TEMPLATES,
  getIfrsGroupForAccount,
} from "@/components/onboarding/company-wizard-data";
import {
  buildPostingPlan,
  categoryFromIfrsElement,
  koboToDecimalString,
  toAmount,
  toKobo,
  type PlannedLine,
  type PostingStockItem,
  type PostingTransactionInput,
} from "@/lib/posting-rules";
import type {
  AccountCategory,
  BankReconciliationReport,
  BankStatementLineDraft,
  ChartOfAccount,
  CurrencyCode,
  FiscalPeriod,
  FiveYearMetricColumn,
  FrcnFinancialStatementPackage,
  FxRevaluationReport,
  JournalLine,
  JournalLineDraft,
  JournalVoucher,
  JournalVoucherConnection,
  MutationError,
  PeriodStatus,
  ReconciliationMatchItem,
  StatementLineItem,
  TrialBalanceRow,
  ValueAddedStatementRow,
  WorkspaceKpiSummary,
} from "@/types/ledger";

const WORKSPACE_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0001";
const ACTOR_USER_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbb0001";

interface LocalBffState {
  accounts: ChartOfAccount[];
  periods: FiscalPeriod[];
  vouchers: JournalVoucher[];
  idempotency: Map<string, JournalVoucher>;
  sequence: number;
  /** Transactions Hub record id -> the voucher currently carrying it in the books. */
  postedTransactions: Map<string, PostedTransactionLink>;
}

interface PostedTransactionLink {
  readonly voucherId: string;
  readonly fingerprint: string;
}

function createInitialState(): LocalBffState {
  const accounts: ChartOfAccount[] = [
    {
      id: "11111111-1111-4111-8111-111111110101",
      code: "1010",
      name: "Zenith Bank Current (NGN)",
      category: "ASSET",
      ifrsTag: "CASH_AND_CASH_EQUIVALENTS",
      sourcePrimitive: "BOOKKEEPING_AND_LEDGER",
      isSystemLocked: true,
      isActive: true,
    },
    {
      id: "11111111-1111-4111-8111-111111110102",
      code: "1020",
      name: "Access Bank Domiciliary (USD)",
      category: "ASSET",
      ifrsTag: "CASH_AND_CASH_EQUIVALENTS",
      sourcePrimitive: "MULTI_CURRENCY_AND_FX",
      isSystemLocked: false,
      isActive: true,
    },
    {
      id: "11111111-1111-4111-8111-111111110201",
      code: "2010",
      name: "NRS Output VAT Payable (7.5%)",
      category: "LIABILITY",
      ifrsTag: "TAX_LIABILITIES",
      sourcePrimitive: "TAX_AND_STATUTORY",
      isSystemLocked: true,
      isActive: true,
    },
    {
      id: "11111111-1111-4111-8111-111111110301",
      code: "3010",
      name: "Owner Share Capital",
      category: "EQUITY",
      ifrsTag: "ISSUED_CAPITAL",
      sourcePrimitive: "BOOKKEEPING_AND_LEDGER",
      isSystemLocked: true,
      isActive: true,
    },
    {
      id: "11111111-1111-4111-8111-111111110401",
      code: "4010",
      name: "Lagos Retail & Supply Revenue",
      category: "REVENUE",
      ifrsTag: "REVENUE_FROM_CONTRACTS",
      sourcePrimitive: "INVOICES_AND_RECEIVABLES",
      isSystemLocked: false,
      isActive: true,
    },
    {
      id: "11111111-1111-4111-8111-111111110501",
      code: "5010",
      name: "Logistics & Diesel Power Expense",
      category: "EXPENSE",
      ifrsTag: "ADMINISTRATIVE_EXPENSES",
      sourcePrimitive: "BILLS_AND_EXPENSES",
      isSystemLocked: false,
      isActive: true,
    },
  ];

  const periods: FiscalPeriod[] = [
    {
      id: "22222222-2222-4222-8222-222222220001",
      label: "FY2025",
      startDate: "2025-01-01",
      endDate: "2025-12-31",
      status: "CLOSED_CAMA_CERTIFIED",
      camaCertification: "FRC/2025/004192",
    },
    {
      id: "22222222-2222-4222-8222-222222220002",
      label: "FY2026",
      startDate: "2026-01-01",
      endDate: "2026-12-31",
      status: "OPEN",
      camaCertification: null,
    },
  ];

  const openingVoucher: JournalVoucher = {
    __typename: "JournalVoucher",
    id: "44444444-4444-4444-8444-444444440001",
    voucherNumber: "JV-2026-0001",
    postingDate: "2026-01-05",
    status: "POSTED",
    reference: "CAP-OPEN-2026",
    sourceModule: "GENERAL_LEDGER",
    lines: [
      {
        id: "55555555-5555-4555-8555-555555550001",
        accountId: accounts[0]!.id,
        accountCode: accounts[0]!.code,
        accountName: accounts[0]!.name,
        debit: {
          amount: "2500000.00",
          currency: "NGN",
          functionalAmountNgn: "2500000.00",
          exchangeRateToNgn: "1.000000",
        },
        credit: {
          amount: "0.00",
          currency: "NGN",
          functionalAmountNgn: "0.00",
          exchangeRateToNgn: "1.000000",
        },
        fundOrDepartmentCode: null,
        projectOrSiteCode: null,
        memo: "Opening working capital deposit",
      },
      {
        id: "55555555-5555-4555-8555-555555550002",
        accountId: accounts[3]!.id,
        accountCode: accounts[3]!.code,
        accountName: accounts[3]!.name,
        debit: {
          amount: "0.00",
          currency: "NGN",
          functionalAmountNgn: "0.00",
          exchangeRateToNgn: "1.000000",
        },
        credit: {
          amount: "2500000.00",
          currency: "NGN",
          functionalAmountNgn: "2500000.00",
          exchangeRateToNgn: "1.000000",
        },
        fundOrDepartmentCode: null,
        projectOrSiteCode: null,
        memo: "Share capital paid-in",
      },
    ],
    totalDebitNgn: "2500000.00",
    totalCreditNgn: "2500000.00",
    createdByUserId: ACTOR_USER_ID,
    approvedByUserId: null,
    reversedByVoucherId: null,
    createdAt: "2026-01-05T09:00:00Z",
  };

  return {
    accounts,
    periods,
    vouchers: [openingVoucher],
    idempotency: new Map(),
    sequence: 1,
    postedTransactions: new Map(),
  };
}

/**
 * A freshly registered workspace starts with its sector chart of accounts, the shared
 * fiscal calendar, and an empty journal — never the demo company's vouchers.
 */
function createTenantState(workspaceId: string): LocalBffState {
  return {
    accounts: getTailoredBffAccounts(workspaceId),
    periods: createInitialState().periods.map((p) => ({ ...p })),
    vouchers: [],
    idempotency: new Map(),
    sequence: 0,
    postedTransactions: new Map(),
  };
}

/** Stored shape of a workspace ledger (the idempotency Map becomes an entry list). */
interface PersistedLedgerState {
  readonly accounts: ChartOfAccount[];
  readonly periods: FiscalPeriod[];
  readonly vouchers: JournalVoucher[];
  readonly idempotency: Array<[string, string]>; // idempotency key -> voucher id
  readonly sequence: number;
  readonly postedTransactions?: Array<[string, PostedTransactionLink]>;
}

function ledgerDocumentKey(workspaceId: string): string {
  return `ledger:${workspaceId}`;
}

function deserializeLedger(doc: PersistedLedgerState): LocalBffState {
  const byId = new Map(doc.vouchers.map((v) => [v.id, v]));
  const idempotency = new Map<string, JournalVoucher>();
  for (const [key, voucherId] of doc.idempotency) {
    const voucher = byId.get(voucherId);
    if (voucher) idempotency.set(key, voucher);
  }
  return {
    accounts: doc.accounts,
    periods: doc.periods,
    vouchers: doc.vouchers,
    idempotency,
    sequence: doc.sequence,
    postedTransactions: new Map(doc.postedTransactions ?? []),
  };
}

function serializeLedger(state: LocalBffState): PersistedLedgerState {
  return {
    accounts: state.accounts,
    periods: state.periods,
    vouchers: state.vouchers,
    idempotency: [...state.idempotency].map(([key, v]) => [key, v.id]),
    sequence: state.sequence,
    postedTransactions: [...state.postedTransactions],
  };
}

const globalForLedger = globalThis as unknown as {
  __nairabooksBffStates?: Map<string, LocalBffState>;
};

/** Per-workspace ledger: loaded from the stored document, or seeded on first use. */
function getLocalState(workspaceId: string = WORKSPACE_ID): LocalBffState {
  if (!globalForLedger.__nairabooksBffStates) {
    globalForLedger.__nairabooksBffStates = new Map();
  }
  const states = globalForLedger.__nairabooksBffStates;
  let state = states.get(workspaceId);
  if (!state) {
    const stored = readDocument<PersistedLedgerState>(ledgerDocumentKey(workspaceId));
    state = stored
      ? deserializeLedger(stored)
      : workspaceId === WORKSPACE_ID
        ? createInitialState()
        : createTenantState(workspaceId);
    states.set(workspaceId, state);
  }
  return state;
}

/** Read-only view of a workspace's chart and vouchers, for dashboards. */
export function getWorkspaceLedgerForReporting(workspaceId: string): {
  readonly accounts: readonly ChartOfAccount[];
  readonly vouchers: readonly JournalVoucher[];
} {
  const state = getLocalState(workspaceId);
  return { accounts: [...state.accounts], vouchers: [...state.vouchers] };
}

/** Queue a save of the workspace's books; call after every mutation. */
function persistLedger(workspaceId: string, state: LocalBffState): void {
  writeDocument(ledgerDocumentKey(workspaceId), serializeLedger(state));
}

/** Tests: drop live ledger objects so the next access reloads from stored documents. */
export function resetLocalLedgerStateForTesting(): void {
  delete globalForLedger.__nairabooksBffStates;
}


function validationError(message: string, field: string | null = null): MutationError {
  return {
    __typename: "ValidationError",
    code: "VALIDATION_ERROR",
    message,
    field,
  };
}

function assertStringField(value: unknown, field: string): string {
  if (typeof value !== "string") {
    throw validationError(`Field '${field}' must be a string.`, field);
  }
  return value;
}

function assertDecimalString(value: unknown, field: string): string {
  if (typeof value !== "string") {
    throw validationError(
      `Field '${field}' must be a fixed decimal string; numeric literals/floats are prohibited.`,
      field,
    );
  }
  return value;
}

function formatScaledRate(scaled: bigint): string {
  const whole = scaled / 1_000_000n;
  const frac = (scaled % 1_000_000n).toString().padStart(6, "0");
  return `${whole.toString()}.${frac}`;
}

function ensurePeriodOpen(periods: readonly FiscalPeriod[], postingDate: string): FiscalPeriod {
  const match = periods.find(
    (period) => postingDate >= period.startDate && postingDate <= period.endDate,
  );
  if (!match) {
    throw validationError(
      `No fiscal period covers posting date ${postingDate}.`,
      "postingDate",
    );
  }
  if (match.status !== "OPEN") {
    const err: MutationError = {
      __typename: "ClosedPeriodError",
      code: "CLOSED_PERIOD",
      message: `Fiscal period '${match.label}' is ${match.status} and does not accept postings.`,
      periodLabel: match.label,
      periodStatus: match.status as PeriodStatus,
    };
    throw err;
  }
  return match;
}

function isMutationError(err: unknown): err is MutationError {
  return (
    typeof err === "object" &&
    err !== null &&
    "__typename" in err &&
    typeof (err as { __typename: unknown }).__typename === "string"
  );
}

function httpStatusForError(err: MutationError): number {
  switch (err.__typename) {
    case "ValidationError":
      return 400;
    case "AuthenticationError":
      return 401;
    case "CrossTenantAccessError":
    case "AuthorizationError":
    case "SegregationOfDutiesError":
      return 403;
    case "UnbalancedJournalError":
    case "ClosedPeriodError":
      return 422;
    case "RateLimitExceededError":
      return 429;
  }
}

function getTailoredBffAccounts(targetWs: string): ChartOfAccount[] {
  let resolvedType: string | undefined;
  if (typeof window !== "undefined") {
    try {
      resolvedType =
        window.localStorage.getItem(`nairabooks_workspace_business_type_${targetWs}`) ||
        window.sessionStorage.getItem(`nairabooks_workspace_business_type_${targetWs}`) ||
        undefined;
    } catch {
      // Ignore
    }
  }

  if (!resolvedType && typeof window === "undefined") {
    const auth = readDocument<{ workspaces?: Array<{ id: string; businessType?: string }> }>("auth");
    resolvedType = auth?.workspaces?.find((w) => w.id === targetWs)?.businessType;
  }

  const template =
    (resolvedType ? SECTOR_TEMPLATES.find((t) => t.code === resolvedType) : null) ??
    SECTOR_TEMPLATES[0]!;

  return template.accounts.map((acc) => {
    const groupMeta = getIfrsGroupForAccount(acc);
    const category: AccountCategory =
      acc.group === "Assets"
        ? "ASSET"
        : acc.group === "Liabilities"
        ? "LIABILITY"
        : acc.group === "Equity"
        ? "EQUITY"
        : acc.group === "Income"
        ? "REVENUE"
        : "EXPENSE";

    return {
      id: `coa-${targetWs.slice(0, 8)}-${acc.code}`,
      code: acc.code,
      name: acc.accountName,
      category,
      ifrsTag: groupMeta.ifrsStandard,
      sourcePrimitive: "BOOKKEEPING_AND_LEDGER",
      isSystemLocked: ["1010", "1110", "2210", "3010"].includes(acc.code),
      isActive: true,
    };
  });
}

export async function fetchChartOfAccounts(
  workspaceId?: string,
  sessionToken?: string,
): Promise<ChartOfAccount[]> {
  const targetWs = workspaceId || WORKSPACE_ID;
  return [...getLocalState(targetWs).accounts];
}

export async function fetchFiscalPeriods(
  workspaceId?: string,
  sessionToken?: string,
): Promise<FiscalPeriod[]> {
  const targetWs = workspaceId || WORKSPACE_ID;
  return [...getLocalState(targetWs).periods];
}

export async function fetchJournalVouchers(
  first = 25,
  workspaceId?: string,
  sessionToken?: string,
): Promise<JournalVoucherConnection> {
  const targetWs = workspaceId || WORKSPACE_ID;
  const boundedFirst = Math.min(Math.max(first, 1), 100);
  const state = getLocalState(targetWs);
  const sliced = state.vouchers.slice(0, boundedFirst);
  const edges = sliced.map((node) => ({
    cursor: Buffer.from(node.id, "utf-8").toString("base64url"),
    node,
  }));
  return {
    edges,
    pageInfo: {
      hasNextPage: state.vouchers.length > boundedFirst,
      hasPreviousPage: false,
      startCursor: edges[0]?.cursor ?? null,
      endCursor: edges[edges.length - 1]?.cursor ?? null,
    },
  };
}

export async function fetchKpiSummary(
  workspaceId?: string,
  sessionToken?: string,
): Promise<WorkspaceKpiSummary> {
  const targetWs = workspaceId || WORKSPACE_ID;

  // Every real company's KPIs come straight from its own books.
  if (targetWs !== WORKSPACE_ID) {
    const state = getLocalState(targetWs);
    const nets = aggregateNetKobo(state.accounts, state.vouchers);
    let bank = 0n;
    let receivables = 0n;
    let payables = 0n;
    let netIncome = 0n;
    for (const acct of state.accounts) {
      const net = nets.get(acct.id) ?? 0n;
      if (acct.category === "ASSET" && /bank|cash/i.test(acct.name) && !/receivable|clearing/i.test(acct.name)) {
        bank += net;
      } else if (acct.category === "ASSET" && /receivable/i.test(acct.name) && !/wht|tax/i.test(acct.name)) {
        receivables += net;
      } else if (acct.category === "LIABILITY" && /payable/i.test(acct.name) && /trade|supplier/i.test(acct.name)) {
        payables += -net;
      }
      if (acct.category === "REVENUE") netIncome += -net;
      if (acct.category === "EXPENSE") netIncome -= net;
    }
    const withCommas = (kobo: bigint) => {
      const [whole, cents] = formatKobo(kobo).split(".");
      return `${whole!.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}.${cents}`;
    };
    return {
      workspaceId: targetWs,
      bankBalanceNgn: withCommas(bank),
      receivablesNgn: withCommas(receivables),
      payablesNgn: withCommas(payables),
      netIncomeNgn: withCommas(netIncome),
      accountCount: state.accounts.length,
      voucherCount: state.vouchers.length,
      isZeroState: state.vouchers.length === 0,
    };
  }

  return {
    workspaceId: WORKSPACE_ID,
    bankBalanceNgn: "48,250,000.00",
    receivablesNgn: "12,480,000.00",
    payablesNgn: "4,920,000.00",
    netIncomeNgn: "6,940,000.00",
    accountCount: getLocalState().accounts.length,
    voucherCount: getLocalState().vouchers.length,
    isZeroState: false,
  };
}

export async function postJournalVoucherViaBff(
  rawJsonText: string,
  workspaceId?: string,
  sessionToken?: string,
  actorUserId?: string,
): Promise<{ status: number; body: JournalVoucher | MutationError }> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJsonText);
  } catch {
    return { status: 400, body: validationError("Malformed JSON payload.", "body") };
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return { status: 400, body: validationError("Request body must be a JSON object.", "body") };
  }

  const targetWs = workspaceId || WORKSPACE_ID;
  const targetActor = actorUserId || ACTOR_USER_ID;

  const payload = parsed as Record<string, unknown>;
  const state = getLocalState(targetWs);

  try {
    const idempotencyKey = assertStringField(payload.idempotencyKey, "idempotencyKey");
    const existing = state.idempotency.get(idempotencyKey);
    if (existing) {
      return { status: 201, body: existing };
    }

    const postingDate = assertStringField(payload.postingDate, "postingDate");
    const reference = assertStringField(payload.reference, "reference").trim();
    const sourceModule = assertStringField(payload.sourceModule, "sourceModule").trim();
    if (!reference) {
      throw validationError("Voucher reference cannot be blank.", "reference");
    }
    if (!sourceModule) {
      throw validationError("Voucher sourceModule cannot be blank.", "sourceModule");
    }

    ensurePeriodOpen(state.periods, postingDate);

    if (!Array.isArray(payload.lines) || payload.lines.length < 2) {
      throw validationError(
        "A journal voucher requires at least two balanced double-entry lines.",
        "lines",
      );
    }

    let totalDebitNgn = 0n;
    let totalCreditNgn = 0n;
    const builtLines: JournalLine[] = [];

    for (const rawLine of payload.lines) {
      if (typeof rawLine !== "object" || rawLine === null) {
        throw validationError("Each line entry must be an object.", "lines");
      }
      const lineObj = rawLine as Record<string, unknown>;
      const accountId = assertStringField(lineObj.accountId, "accountId");
      const account = state.accounts.find((a) => a.id === accountId && a.isActive);
      if (!account) {
        throw validationError(`Active account '${accountId}' was not found.`, "lines");
      }

      const currency = assertStringField(lineObj.currency ?? "NGN", "currency") as CurrencyCode;
      const rateRaw = assertDecimalString(
        lineObj.exchangeRateToNgn ?? "1.000000",
        "exchangeRateToNgn",
      );
      const debitRaw = assertDecimalString(lineObj.debitAmount ?? "0.00", "debitAmount");
      const creditRaw = assertDecimalString(lineObj.creditAmount ?? "0.00", "creditAmount");

      let debitKobo: bigint;
      let creditKobo: bigint;
      let rateScaled: bigint;
      let debitNgn: bigint;
      let creditNgn: bigint;
      try {
        debitKobo = parseMoneyToKobo(debitRaw);
        creditKobo = parseMoneyToKobo(creditRaw);
        rateScaled = currency === "NGN" ? 1_000_000n : parseRateScaled(rateRaw);
        debitNgn = convertToNgnKobo(debitRaw, currency, rateRaw);
        creditNgn = convertToNgnKobo(creditRaw, currency, rateRaw);
      } catch (err) {
        throw validationError(
          err instanceof Error ? err.message : "Invalid numeric decimal value.",
          "lines",
        );
      }

      const hasDebit = debitNgn > 0n;
      const hasCredit = creditNgn > 0n;
      if (hasDebit === hasCredit) {
        throw validationError(
          "Each journal line must have strictly one positive side (debit OR credit > 0).",
          "lines",
        );
      }

      totalDebitNgn += debitNgn;
      totalCreditNgn += creditNgn;

      const rateStr = formatScaledRate(rateScaled);
      builtLines.push({
        id: crypto.randomUUID(),
        accountId: account.id,
        accountCode: account.code,
        accountName: account.name,
        debit: {
          amount: formatKobo(debitKobo),
          currency,
          functionalAmountNgn: formatKobo(debitNgn),
          exchangeRateToNgn: rateStr,
        },
        credit: {
          amount: formatKobo(creditKobo),
          currency,
          functionalAmountNgn: formatKobo(creditNgn),
          exchangeRateToNgn: rateStr,
        },
        fundOrDepartmentCode:
          typeof lineObj.fundOrDepartmentCode === "string" ? lineObj.fundOrDepartmentCode : null,
        projectOrSiteCode:
          typeof lineObj.projectOrSiteCode === "string" ? lineObj.projectOrSiteCode : null,
        memo: typeof lineObj.memo === "string" ? lineObj.memo : null,
      });
    }

    if (totalDebitNgn <= 0n || totalDebitNgn !== totalCreditNgn) {
      const err: MutationError = {
        __typename: "UnbalancedJournalError",
        code: "UNBALANCED_JOURNAL",
        message: `Journal voucher is out of balance: debit NGN ${formatKobo(totalDebitNgn)} != credit NGN ${formatKobo(totalCreditNgn)}.`,
        totalDebitNgn: formatKobo(totalDebitNgn),
        totalCreditNgn: formatKobo(totalCreditNgn),
      };
      throw err;
    }

    state.sequence += 1;
    const year = postingDate.slice(0, 4);
    const voucher: JournalVoucher = {
      __typename: "JournalVoucher",
      id: crypto.randomUUID(),
      voucherNumber: `JV-${year}-${String(state.sequence).padStart(4, "0")}`,
      postingDate,
      status: "POSTED",
      reference,
      sourceModule,
      lines: builtLines,
      totalDebitNgn: formatKobo(totalDebitNgn),
      totalCreditNgn: formatKobo(totalCreditNgn),
      createdByUserId: targetActor,
      approvedByUserId: null,
      reversedByVoucherId: null,
      createdAt: new Date().toISOString(),
    };
    state.vouchers = [voucher, ...state.vouchers];
    state.idempotency.set(idempotencyKey, voucher);
    persistLedger(targetWs, state);
    return { status: 201, body: voucher };
  } catch (err) {
    if (isMutationError(err)) {
      return { status: httpStatusForError(err), body: err };
    }
    return {
      status: 400,
      body: validationError(err instanceof Error ? err.message : "Invalid voucher payload."),
    };
  }
}

export async function reverseJournalVoucherViaBff(
  rawJsonText: string,
  workspaceId?: string,
  sessionToken?: string,
  actorUserId?: string,
): Promise<{ status: number; body: JournalVoucher | MutationError }> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJsonText);
  } catch {
    return { status: 400, body: validationError("Malformed JSON payload.", "body") };
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return { status: 400, body: validationError("Request body must be a JSON object.", "body") };
  }

  const targetWs = workspaceId || WORKSPACE_ID;
  const targetActor = actorUserId || ACTOR_USER_ID;

  const payload = parsed as Record<string, unknown>;
  const state = getLocalState(targetWs);

  try {
    const idempotencyKey = assertStringField(payload.idempotencyKey, "idempotencyKey");
    const existing = state.idempotency.get(idempotencyKey);
    if (existing) {
      return { status: 200, body: existing };
    }

    const originalVoucherId = assertStringField(
      payload.originalVoucherId,
      "originalVoucherId",
    );
    const reversalDate = assertStringField(payload.reversalDate, "reversalDate");
    const reason = assertStringField(payload.reason, "reason").trim();
    if (!reason) {
      throw validationError("Reversal reason cannot be blank.", "reason");
    }

    const idx = state.vouchers.findIndex((v) => v.id === originalVoucherId);
    if (idx === -1) {
      throw validationError(
        `Original voucher '${originalVoucherId}' was not found.`,
        "originalVoucherId",
      );
    }
    const original = state.vouchers[idx]!;
    if (original.status !== "POSTED" || original.reversedByVoucherId !== null) {
      throw validationError(
        `Voucher ${original.voucherNumber} is ${original.status} and cannot be reversed again.`,
        "originalVoucherId",
      );
    }

    ensurePeriodOpen(state.periods, reversalDate);

    const flippedLines: JournalLineDraft[] = original.lines.map((line) => ({
      accountId: line.accountId,
      debitAmount: line.credit.amount,
      creditAmount: line.debit.amount,
      currency:
        parseMoneyToKobo(line.credit.amount) > 0n ? line.credit.currency : line.debit.currency,
      exchangeRateToNgn:
        parseMoneyToKobo(line.credit.amount) > 0n
          ? line.credit.exchangeRateToNgn
          : line.debit.exchangeRateToNgn,
      fundOrDepartmentCode: line.fundOrDepartmentCode,
      projectOrSiteCode: line.projectOrSiteCode,
      memo: `Reversal (${reason})${line.memo ? `: ${line.memo}` : ""}`,
    }));

    const res = await postJournalVoucherViaBff(
      JSON.stringify({
        idempotencyKey,
        postingDate: reversalDate,
        reference: `REV-${original.voucherNumber}`,
        sourceModule: "REVERSAL",
        lines: flippedLines,
      }),
      targetWs,
      sessionToken,
      targetActor,
    );

    if (res.status !== 201 || res.body.__typename !== "JournalVoucher") {
      return res;
    }

    const reversalVoucher = res.body;
    state.vouchers = state.vouchers.map((v) =>
      v.id === original.id
        ? { ...v, status: "REVERSED", reversedByVoucherId: reversalVoucher.id }
        : v,
    );
    persistLedger(targetWs, state);
    return { status: 200, body: reversalVoucher };
  } catch (err) {
    if (isMutationError(err)) {
      return { status: httpStatusForError(err), body: err };
    }
    return {
      status: 400,
      body: validationError(err instanceof Error ? err.message : "Invalid reversal payload."),
    };
  }
}


const TAX_TAGS = new Set(["INCOME_TAX_EXPENSE", "TAX_EXPENSE", "CORPORATE_INCOME_TAX"]);
const EMP_TAGS = new Set(["EMPLOYEE_BENEFITS", "STAFF_COSTS", "PAYROLL_EXPENSE"]);
const FIN_TAGS = new Set(["FINANCE_COSTS", "INTEREST_EXPENSE"]);
const DEPR_TAGS = new Set(["DEPRECIATION_AND_AMORTISATION", "DEPRECIATION"]);

/** Value-added bucket for an expense account: by IFRS tag, else by its name. */
function classifyExpense(acct: ChartOfAccount): "tax" | "employees" | "finance" | "depreciation" | "bought-in" {
  if (TAX_TAGS.has(acct.ifrsTag) || /income tax|cit/i.test(acct.name)) return "tax";
  if (EMP_TAGS.has(acct.ifrsTag) || /salar|payroll|wage|staff/i.test(acct.name)) return "employees";
  if (FIN_TAGS.has(acct.ifrsTag) || /interest|finance cost/i.test(acct.name)) return "finance";
  if (DEPR_TAGS.has(acct.ifrsTag) || /depreciation|amorti/i.test(acct.name)) return "depreciation";
  return "bought-in";
}

function aggregateNetKobo(
  accounts: readonly ChartOfAccount[],
  vouchers: readonly JournalVoucher[],
): Map<string, bigint> {
  const nets = new Map<string, bigint>();
  for (const acct of accounts) {
    nets.set(acct.id, 0n);
  }
  for (const v of vouchers) {
    if (v.status !== "POSTED" && v.status !== "REVERSED") {
      continue;
    }
    for (const line of v.lines) {
      const prev = nets.get(line.accountId) ?? 0n;
      const dr = parseMoneyToKobo(line.debit.functionalAmountNgn);
      const cr = parseMoneyToKobo(line.credit.functionalAmountNgn);
      nets.set(line.accountId, prev + dr - cr);
    }
  }
  return nets;
}

function shareRateString(part: bigint, total: bigint): string {
  if (total === 0n) {
    return "0.000000";
  }
  const scaled = (part * 100_000_000n) / total;
  const isNeg = scaled < 0n;
  const abs = isNeg ? -scaled : scaled;
  const whole = abs / 1_000_000n;
  const frac = (abs % 1_000_000n).toString().padStart(6, "0");
  return `${isNeg ? "-" : ""}${whole.toString()}.${frac}`;
}

export async function fetchFrcnPackage(
  fiscalPeriodId: string,
  workspaceId?: string,
  sessionToken?: string,
): Promise<{ status: number; body: FrcnFinancialStatementPackage | MutationError }> {
  const targetWs = workspaceId || WORKSPACE_ID;

  const state = getLocalState(targetWs);
  const period = state.periods.find((p) => p.id === fiscalPeriodId);
  if (!period) {
    return {
      status: 400,
      body: validationError(`Fiscal period '${fiscalPeriodId}' not found.`, "fiscalPeriodId"),
    };
  }

  const sortedAccounts = [...state.accounts].sort((a, b) => a.code.localeCompare(b.code));
  const periodVouchers = state.vouchers.filter(
    (v) => v.postingDate >= period.startDate && v.postingDate <= period.endDate,
  );
  const periodNets = aggregateNetKobo(sortedAccounts, periodVouchers);

  const trialBalance: TrialBalanceRow[] = [];
  let totalDebits = 0n;
  let totalCredits = 0n;
  const revenueLines: StatementLineItem[] = [];
  const opExpLines: StatementLineItem[] = [];
  const taxExpLines: StatementLineItem[] = [];
  let totalRev = 0n;
  let boughtIn = 0n;
  let employees = 0n;
  let capProviders = 0n;
  let govtTax = 0n;
  let depr = 0n;

  for (const acct of sortedAccounts) {
    const net = periodNets.get(acct.id) ?? 0n;
    if (net === 0n) {
      continue;
    }
    const drBal = net > 0n ? net : 0n;
    const crBal = net < 0n ? -net : 0n;
    totalDebits += drBal;
    totalCredits += crBal;
    trialBalance.push({
      accountCode: acct.code,
      accountName: acct.name,
      category: acct.category,
      ifrsTag: acct.ifrsTag,
      debitBalanceNgn: formatKobo(drBal),
      creditBalanceNgn: formatKobo(crBal),
    });

    if (acct.category === "REVENUE") {
      totalRev += -net;
      revenueLines.push({
        accountCode: acct.code,
        accountName: acct.name,
        ifrsTag: acct.ifrsTag,
        amountNgn: formatKobo(-net),
      });
    } else if (acct.category === "EXPENSE") {
      const expenseKind = classifyExpense(acct);
      if (expenseKind === "tax") {
        govtTax += net;
        taxExpLines.push({
          accountCode: acct.code,
          accountName: acct.name,
          ifrsTag: acct.ifrsTag,
          amountNgn: formatKobo(net),
        });
      } else {
        opExpLines.push({
          accountCode: acct.code,
          accountName: acct.name,
          ifrsTag: acct.ifrsTag,
          amountNgn: formatKobo(net),
        });
        if (expenseKind === "employees") {
          employees += net;
        } else if (expenseKind === "finance") {
          capProviders += net;
        } else if (expenseKind === "depreciation") {
          depr += net;
        } else {
          boughtIn += net;
        }
      }
    }
  }

  const totalOpExp = boughtIn + employees + capProviders + depr;
  const pbt = totalRev - totalOpExp;
  const netProfit = pbt - govtTax;
  const valueAdded = totalRev - boughtIn;
  const retainedGrowth = valueAdded - employees - capProviders - govtTax - depr;

  const valueAddedStatement: ValueAddedStatementRow[] = [
    { lineLabel: "Turnover & Other Income", amountNgn: formatKobo(totalRev), percentageShare: "0.000000" },
    { lineLabel: "Bought-In Materials & Services", amountNgn: formatKobo(boughtIn), percentageShare: "0.000000" },
    {
      lineLabel: "Value Added",
      amountNgn: formatKobo(valueAdded),
      percentageShare: valueAdded === 0n ? "0.000000" : "100.000000",
    },
    {
      lineLabel: "To Pay Employees",
      amountNgn: formatKobo(employees),
      percentageShare: shareRateString(employees, valueAdded),
    },
    {
      lineLabel: "To Pay Providers of Capital",
      amountNgn: formatKobo(capProviders),
      percentageShare: shareRateString(capProviders, valueAdded),
    },
    {
      lineLabel: "To Pay Government (Taxes)",
      amountNgn: formatKobo(govtTax),
      percentageShare: shareRateString(govtTax, valueAdded),
    },
    {
      lineLabel: "Depreciation & Asset Replacement",
      amountNgn: formatKobo(depr),
      percentageShare: shareRateString(depr, valueAdded),
    },
    {
      lineLabel: "Retained for Future Expansion",
      amountNgn: formatKobo(retainedGrowth),
      percentageShare: shareRateString(retainedGrowth, valueAdded),
    },
  ];

  // Cumulative Financial Position as at period.endDate
  const cumVouchers = state.vouchers.filter((v) => v.postingDate <= period.endDate);
  const cumNets = aggregateNetKobo(sortedAccounts, cumVouchers);
  const assetLines: StatementLineItem[] = [];
  const liabilityLines: StatementLineItem[] = [];
  const equityLines: StatementLineItem[] = [];
  let totalAssets = 0n;
  let totalLiab = 0n;
  let totalEqAccts = 0n;
  let cumRev = 0n;
  let cumExp = 0n;

  for (const acct of sortedAccounts) {
    const net = cumNets.get(acct.id) ?? 0n;
    if (acct.category === "REVENUE") {
      cumRev += -net;
    } else if (acct.category === "EXPENSE") {
      cumExp += net;
    } else if (net !== 0n) {
      if (acct.category === "ASSET") {
        totalAssets += net;
        assetLines.push({ accountCode: acct.code, accountName: acct.name, ifrsTag: acct.ifrsTag, amountNgn: formatKobo(net) });
      } else if (acct.category === "LIABILITY") {
        totalLiab += -net;
        liabilityLines.push({ accountCode: acct.code, accountName: acct.name, ifrsTag: acct.ifrsTag, amountNgn: formatKobo(-net) });
      } else {
        totalEqAccts += -net;
        equityLines.push({ accountCode: acct.code, accountName: acct.name, ifrsTag: acct.ifrsTag, amountNgn: formatKobo(-net) });
      }
    }
  }
  const retainedCum = cumRev - cumExp;
  const totalEquity = totalEqAccts + retainedCum;

  // Five-Year Summary up to target period
  const eligiblePeriods = [...state.periods]
    .filter((p) => p.startDate <= period.startDate)
    .sort((a, b) => a.startDate.localeCompare(b.startDate))
    .slice(-5);

  const fiveYearSummary: FiveYearMetricColumn[] = eligiblePeriods.map((colPeriod) => {
    const colVouchers = state.vouchers.filter(
      (v) => v.postingDate >= colPeriod.startDate && v.postingDate <= colPeriod.endDate,
    );
    const colNets = aggregateNetKobo(sortedAccounts, colVouchers);
    let yRev = 0n;
    let yOpExp = 0n;
    for (const acct of sortedAccounts) {
      const n = colNets.get(acct.id) ?? 0n;
      if (acct.category === "REVENUE") {
        yRev += -n;
      } else if (acct.category === "EXPENSE" && classifyExpense(acct) !== "tax") {
        yOpExp += n;
      }
    }
    const yCumV = state.vouchers.filter((v) => v.postingDate <= colPeriod.endDate);
    const yCumNets = aggregateNetKobo(sortedAccounts, yCumV);
    let yAssets = 0n;
    let yLiab = 0n;
    for (const acct of sortedAccounts) {
      const n = yCumNets.get(acct.id) ?? 0n;
      if (acct.category === "ASSET") {
        yAssets += n;
      } else if (acct.category === "LIABILITY") {
        yLiab += -n;
      }
    }
    return {
      fiscalYearLabel: colPeriod.label,
      revenueNgn: formatKobo(yRev),
      profitBeforeTaxNgn: formatKobo(yRev - yOpExp),
      totalAssetsNgn: formatKobo(yAssets),
      netEquityNgn: formatKobo(yAssets - yLiab),
    };
  });

  const sofpBalanced = totalAssets === totalLiab + totalEquity;
  const isBalanced = totalDebits === totalCredits && sofpBalanced;
  const snapshotHash = createHash("sha256")
    .update(
      JSON.stringify({
        periodId: period.id,
        tbDebits: formatKobo(totalDebits),
        tbCredits: formatKobo(totalCredits),
        assets: formatKobo(totalAssets),
        liabilities: formatKobo(totalLiab),
        equity: formatKobo(totalEquity),
      }),
    )
    .digest("hex");

  const csvRows = [
    "account_code,account_name,category,debit_ngn,credit_ngn",
    ...trialBalance.map(
      (r) =>
        `${r.accountCode},"${r.accountName.replace(/"/g, '""')}",${r.category},${r.debitBalanceNgn},${r.creditBalanceNgn}`,
    ),
  ].join("\n");

  return {
    status: 200,
    body: {
      fiscalPeriodId: period.id,
      fiscalPeriodLabel: period.label,
      statementCurrency: "NGN",
      trialBalance,
      totalDebitsNgn: formatKobo(totalDebits),
      totalCreditsNgn: formatKobo(totalCredits),
      profitAndLoss: {
        revenueLines,
        operatingExpenseLines: opExpLines,
        taxExpenseLines: taxExpLines,
        totalRevenueNgn: formatKobo(totalRev),
        operatingExpensesNgn: formatKobo(totalOpExp),
        profitBeforeTaxNgn: formatKobo(pbt),
        incomeTaxExpenseNgn: formatKobo(govtTax),
        netProfitNgn: formatKobo(netProfit),
      },
      financialPosition: {
        asOfDate: period.endDate,
        assetLines,
        liabilityLines,
        equityLines,
        retainedAndCurrentEarningsNgn: formatKobo(retainedCum),
        totalAssetsNgn: formatKobo(totalAssets),
        totalLiabilitiesNgn: formatKobo(totalLiab),
        totalEquityNgn: formatKobo(totalEquity),
        isBalanced: sofpBalanced,
      },
      valueAddedStatement,
      fiveYearSummary,
      isBalanced,
      snapshotHash,
      trialBalanceCsv: `${csvRows}\n`,
      journalVouchers: periodVouchers,
      generatedAt: new Date().toISOString(),
    },
  };
}

export async function reconcileBankStatementViaBff(
  rawJsonText: string,
  workspaceId?: string,
  sessionToken?: string,
  actorUserId?: string,
): Promise<{ status: number; body: BankReconciliationReport | MutationError }> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJsonText);
  } catch {
    return { status: 400, body: validationError("Malformed JSON payload.", "body") };
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return { status: 400, body: validationError("Request body must be a JSON object.", "body") };
  }

  const targetWs = workspaceId || WORKSPACE_ID;
  const targetActor = actorUserId || ACTOR_USER_ID;

  const state = getLocalState(targetWs);
  const payload = parsed as Record<string, unknown>;
  try {
    const accountId = assertStringField(payload.accountId, "accountId");
    const account = state.accounts.find((a) => a.id === accountId);
    if (!account) {
      throw validationError(`Account '${accountId}' not found.`, "accountId");
    }
    const throughDate =
      typeof payload.throughDate === "string" ? payload.throughDate : undefined;
    if (!Array.isArray(payload.statementLines)) {
      throw validationError("Field 'statementLines' must be an array.", "statementLines");
    }

    const stmtLines: BankStatementLineDraft[] = payload.statementLines.map((raw) => {
      if (typeof raw !== "object" || raw === null) {
        throw validationError("Each statement line must be an object.", "statementLines");
      }
      const item = raw as Record<string, unknown>;
      const direction = assertStringField(item.direction, "direction");
      if (direction !== "CREDIT" && direction !== "DEBIT") {
        throw validationError("Direction must be CREDIT or DEBIT.", "direction");
      }
      const amountNgn = assertDecimalString(item.amountNgn, "amountNgn");
      const feeNgn = assertDecimalString(item.feeNgn ?? "0.00", "feeNgn");
      parseMoneyToKobo(amountNgn);
      parseMoneyToKobo(feeNgn);
      return {
        lineId: assertStringField(item.lineId, "lineId"),
        valueDate: assertStringField(item.valueDate, "valueDate"),
        amountNgn,
        direction,
        channel: assertStringField(item.channel ?? "BANK_TRANSFER", "channel"),
        reference: assertStringField(item.reference ?? "", "reference"),
        feeNgn,
      };
    });

    const movements: Array<{
      voucherId: string;
      voucherNumber: string;
      postingDate: string;
      reference: string;
      direction: "CREDIT" | "DEBIT";
      amountKobo: bigint;
    }> = [];
    for (const v of state.vouchers) {
      if (v.status !== "POSTED" || (throughDate && v.postingDate > throughDate)) {
        continue;
      }
      for (const line of v.lines) {
        if (line.accountId !== account.id) {
          continue;
        }
        const dr = parseMoneyToKobo(line.debit.functionalAmountNgn);
        const cr = parseMoneyToKobo(line.credit.functionalAmountNgn);
        if (dr > 0n) {
          movements.push({
            voucherId: v.id,
            voucherNumber: v.voucherNumber,
            postingDate: v.postingDate,
            reference: v.reference,
            direction: "CREDIT",
            amountKobo: dr,
          });
        } else if (cr > 0n) {
          movements.push({
            voucherId: v.id,
            voucherNumber: v.voucherNumber,
            postingDate: v.postingDate,
            reference: v.reference,
            direction: "DEBIT",
            amountKobo: cr,
          });
        }
      }
    }

    const used = new Set<number>();
    const matches: ReconciliationMatchItem[] = [];
    const unmatchedStmt: BankStatementLineDraft[] = [];

    for (const stmt of stmtLines) {
      const amtKobo = parseMoneyToKobo(stmt.amountNgn);
      const feeKobo = parseMoneyToKobo(stmt.feeNgn);
      const grossKobo = amtKobo + feeKobo;
      const idxExact = movements.findIndex(
        (m, i) => !used.has(i) && m.direction === stmt.direction && m.amountKobo === amtKobo,
      );
      if (idxExact !== -1) {
        used.add(idxExact);
        const mv = movements[idxExact]!;
        matches.push({
          statementLineId: stmt.lineId,
          voucherId: mv.voucherId,
          voucherNumber: mv.voucherNumber,
          status: "MATCHED_EXACT",
          matchedAmountNgn: formatKobo(amtKobo),
          feeVarianceNgn: "0.00",
        });
        continue;
      }
      const idxFee =
        feeKobo > 0n
          ? movements.findIndex(
              (m, i) =>
                !used.has(i) && m.direction === stmt.direction && m.amountKobo === grossKobo,
            )
          : -1;
      if (idxFee !== -1) {
        used.add(idxFee);
        const mv = movements[idxFee]!;
        matches.push({
          statementLineId: stmt.lineId,
          voucherId: mv.voucherId,
          voucherNumber: mv.voucherNumber,
          status: "MATCHED_FEE_ADJUSTED",
          matchedAmountNgn: formatKobo(amtKobo),
          feeVarianceNgn: formatKobo(feeKobo),
        });
        continue;
      }
      unmatchedStmt.push(stmt);
    }

    const unmatchedLedger = movements
      .filter((_, i) => !used.has(i))
      .map((m) => ({
        voucherId: m.voucherId,
        voucherNumber: m.voucherNumber,
        postingDate: m.postingDate,
        reference: m.reference,
        direction: m.direction,
        amountNgn: formatKobo(m.amountKobo),
      }));

    const stmtNet = stmtLines.reduce(
      (acc, s) =>
        acc + (s.direction === "CREDIT" ? parseMoneyToKobo(s.amountNgn) : -parseMoneyToKobo(s.amountNgn)),
      0n,
    );
    const ledgerNet = movements.reduce(
      (acc, m) => acc + (m.direction === "CREDIT" ? m.amountKobo : -m.amountKobo),
      0n,
    );

    return {
      status: 200,
      body: {
        accountId: account.id,
        accountCode: account.code,
        accountName: account.name,
        matchedCount: matches.length,
        matches,
        unmatchedStatementLines: unmatchedStmt,
        unmatchedLedgerLines: unmatchedLedger,
        statementNetNgn: formatKobo(stmtNet),
        ledgerNetNgn: formatKobo(ledgerNet),
        reconciliationDifferenceNgn: formatKobo(ledgerNet - stmtNet),
      },
    };
  } catch (err) {
    if (isMutationError(err)) {
      return { status: httpStatusForError(err), body: err };
    }
    return {
      status: 400,
      body: validationError(err instanceof Error ? err.message : "Invalid reconciliation payload."),
    };
  }
}

export async function calculateFxRevaluationViaBff(
  rawJsonText: string,
  workspaceId?: string,
  sessionToken?: string,
  actorUserId?: string,
): Promise<{ status: number; body: FxRevaluationReport | MutationError }> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJsonText);
  } catch {
    return { status: 400, body: validationError("Malformed JSON payload.", "body") };
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return { status: 400, body: validationError("Request body must be a JSON object.", "body") };
  }

  const targetWs = workspaceId || WORKSPACE_ID;
  const targetActor = actorUserId || ACTOR_USER_ID;

  const state = getLocalState(targetWs);
  const payload = parsed as Record<string, unknown>;
  try {
    const accountId = assertStringField(payload.accountId, "accountId");
    const account = state.accounts.find((a) => a.id === accountId);
    if (!account) {
      throw validationError(`Account '${accountId}' not found.`, "accountId");
    }
    const currency = assertStringField(payload.currency, "currency") as CurrencyCode;
    if (currency === "NGN") {
      throw validationError("FX revaluation applies only to foreign currencies.", "currency");
    }
    const closingRateRaw = assertDecimalString(payload.closingRateToNgn, "closingRateToNgn");
    const closingRateScaled = parseRateScaled(closingRateRaw);
    if (closingRateScaled <= 0n) {
      throw validationError("Closing FX rate must be positive.", "closingRateToNgn");
    }
    const asOfDate = assertStringField(payload.asOfDate, "asOfDate");

    let fxBalanceKobo = 0n;
    let carryingNgnKobo = 0n;
    for (const v of state.vouchers) {
      if ((v.status !== "POSTED" && v.status !== "REVERSED") || v.postingDate > asOfDate) {
        continue;
      }
      for (const line of v.lines) {
        if (line.accountId !== account.id) {
          continue;
        }
        const drTxn = parseMoneyToKobo(line.debit.amount);
        const crTxn = parseMoneyToKobo(line.credit.amount);
        if (line.debit.currency === currency && drTxn > 0n) {
          fxBalanceKobo += drTxn;
          carryingNgnKobo += parseMoneyToKobo(line.debit.functionalAmountNgn);
        } else if (line.credit.currency === currency && crTxn > 0n) {
          fxBalanceKobo -= crTxn;
          carryingNgnKobo -= parseMoneyToKobo(line.credit.functionalAmountNgn);
        }
      }
    }

    const isNegBal = fxBalanceKobo < 0n;
    const absBal = isNegBal ? -fxBalanceKobo : fxBalanceKobo;
    const absRevalued = (absBal * closingRateScaled + 500_000n) / 1_000_000n;
    const revaluedNgnKobo = isNegBal ? -absRevalued : absRevalued;
    const diffKobo = revaluedNgnKobo - carryingNgnKobo;

    return {
      status: 200,
      body: {
        accountId: account.id,
        accountCode: account.code,
        accountName: account.name,
        currency,
        asOfDate,
        foreignBalance: formatKobo(fxBalanceKobo),
        carryingNgn: formatKobo(carryingNgnKobo),
        closingRateToNgn: formatScaledRate(closingRateScaled),
        revaluedNgn: formatKobo(revaluedNgnKobo),
        unrealizedGainLossNgn: formatKobo(diffKobo),
        isGain: diffKobo >= 0n,
      },
    };
  } catch (err) {
    if (isMutationError(err)) {
      return { status: httpStatusForError(err), body: err };
    }
    return {
      status: 400,
      body: validationError(err instanceof Error ? err.message : "Invalid FX revaluation payload."),
    };
  }
}

export async function certifyPeriodCamaInLocalLedger(
  periodId: string,
  certificationLabel: string,
  workspaceId: string = WORKSPACE_ID,
): Promise<{ period: FiscalPeriod; snapshotHash: string }> {
  const frcn = await fetchFrcnPackage(periodId, workspaceId);
  if (frcn.status !== 200 || !("snapshotHash" in frcn.body)) {
    throw validationError(`Fiscal period '${periodId}' not found.`, "periodId");
  }
  const state = getLocalState(workspaceId);
  const idx = state.periods.findIndex((p) => p.id === periodId);
  const existing = idx >= 0 ? state.periods[idx] : undefined;
  if (!existing) {
    throw validationError(`Fiscal period '${periodId}' not found.`, "periodId");
  }
  const updated: FiscalPeriod = {
    ...existing,
    status: "CLOSED_CAMA_CERTIFIED",
    camaCertification: certificationLabel,
  };
  state.periods[idx] = updated;
  persistLedger(workspaceId, state);
  return {
    period: updated,
    snapshotHash: frcn.body.snapshotHash,
  };
}

// ---------------------------------------------------------------------------------------
// Transactions Hub → ledger
// ---------------------------------------------------------------------------------------

export interface StandardTransactionPostingResponse {
  readonly ok: true;
  readonly posted: true;
  readonly voucherId: string;
  readonly voucherNumber: string;
  readonly reference: string;
  readonly transactionType: string;
  readonly counterparty: string;
  readonly postingDate: string;
  readonly totalDebitNgn: string;
  readonly totalCreditNgn: string;
  readonly linesCount: number;
  /** Voucher that was reversed because this record was edited. */
  readonly replacedVoucherId?: string;
}

/** The record was saved but is not an accounting event (draft, quote, letter, …). */
export interface StandardTransactionSkippedResponse {
  readonly ok: true;
  readonly posted: false;
  readonly reason: string;
  readonly reversedVoucherId?: string;
}

const OPENING_BALANCES_KEY = "__opening_balances__";

function accountIdFor(workspaceId: string, code: string): string {
  return `coa-${workspaceId.slice(0, 8)}-${code}`;
}

function addAccountToChart(
  state: LocalBffState,
  workspaceId: string,
  spec: { code: string; name: string; category: AccountCategory; ifrsTag: string },
): ChartOfAccount {
  const existing = state.accounts.find((a) => a.code === spec.code);
  if (existing) return existing;
  const account: ChartOfAccount = {
    id: accountIdFor(workspaceId, spec.code),
    code: spec.code,
    name: spec.name,
    category: spec.category,
    ifrsTag: spec.ifrsTag,
    sourcePrimitive: "BOOKKEEPING_AND_LEDGER",
    isSystemLocked: false,
    isActive: true,
  };
  state.accounts.push(account);
  return account;
}

function stockItemsForWorkspace(workspaceId: string): PostingStockItem[] {
  const records = readDocument<unknown>(`records:admin-records:${workspaceId}`);
  if (!Array.isArray(records)) return [];
  return records.filter(
    (r): r is PostingStockItem =>
      typeof r === "object" && r !== null && (r as { module?: unknown }).module === "inventory",
  );
}

function isIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value));
}

/** Reverse a voucher on its own posting date so the period it hit nets to zero. */
async function reverseLinkedVoucher(
  state: LocalBffState,
  workspaceId: string,
  voucherId: string,
  reason: string,
  actorUserId: string,
): Promise<MutationError | null> {
  const original = state.vouchers.find((v) => v.id === voucherId);
  if (!original || original.status !== "POSTED") return null; // already gone
  const res = await reverseJournalVoucherViaBff(
    JSON.stringify({
      idempotencyKey: `rev-${voucherId}`,
      originalVoucherId: voucherId,
      reversalDate: original.postingDate,
      reason,
    }),
    workspaceId,
    undefined,
    actorUserId,
  );
  return res.status === 200 ? null : (res.body as MutationError);
}

interface LinkedPostingInput {
  readonly linkKey: string;
  readonly postingDate: string;
  readonly reference: string;
  readonly sourceModule: string;
  readonly lines: readonly PlannedLine[];
}

/**
 * Make the books hold exactly one live voucher for `linkKey` with these lines: unchanged
 * re-saves are no-ops, edits reverse the old voucher and post the new one.
 */
async function postLinkedVoucher(
  state: LocalBffState,
  workspaceId: string,
  actorUserId: string,
  input: LinkedPostingInput,
): Promise<
  | { readonly ok: true; readonly voucher: JournalVoucher; readonly replacedVoucherId?: string }
  | { readonly ok: false; readonly status: number; readonly error: MutationError }
> {
  const fingerprint = createHash("sha256")
    .update(JSON.stringify([input.postingDate, input.reference, input.lines]))
    .digest("hex");
  const link = state.postedTransactions.get(input.linkKey);
  const linked = link ? state.vouchers.find((v) => v.id === link.voucherId) : undefined;
  if (link && linked?.status === "POSTED" && link.fingerprint === fingerprint) {
    return { ok: true, voucher: linked };
  }

  try {
    ensurePeriodOpen(state.periods, input.postingDate);
  } catch (err) {
    const error = isMutationError(err) ? err : validationError("Invalid posting date.", "date");
    return { ok: false, status: httpStatusForError(error), error };
  }

  const lines = input.lines.map((l) => {
    const account = state.accounts.find((a) => a.code === l.accountCode);
    return {
      accountId: account?.id ?? "",
      debitAmount: koboToDecimalString(l.debitKobo),
      creditAmount: koboToDecimalString(l.creditKobo),
      memo: l.memo,
    };
  });

  let replacedVoucherId: string | undefined;
  if (linked?.status === "POSTED") {
    const err = await reverseLinkedVoucher(state, workspaceId, linked.id, "Record edited", actorUserId);
    if (err) return { ok: false, status: httpStatusForError(err), error: err };
    replacedVoucherId = linked.id;
  }

  const res = await postJournalVoucherViaBff(
    JSON.stringify({
      idempotencyKey: `${input.linkKey}:${state.sequence + 1}:${fingerprint.slice(0, 12)}`,
      postingDate: input.postingDate,
      reference: input.reference,
      sourceModule: input.sourceModule,
      lines,
    }),
    workspaceId,
    undefined,
    actorUserId,
  );
  if (res.status !== 201 || res.body.__typename !== "JournalVoucher") {
    return { ok: false, status: res.status, error: res.body as MutationError };
  }
  state.postedTransactions.set(input.linkKey, { voucherId: res.body.id, fingerprint });
  persistLedger(workspaceId, state);
  return { ok: true, voucher: res.body, ...(replacedVoucherId ? { replacedVoucherId } : {}) };
}

export async function postStandardTransactionViaBff(
  rawJsonText: string,
  workspaceId?: string,
  _sessionToken?: string,
  actorUserId?: string,
): Promise<{
  status: number;
  body: StandardTransactionPostingResponse | StandardTransactionSkippedResponse | MutationError;
}> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJsonText);
  } catch {
    return { status: 400, body: validationError("Malformed JSON payload.", "body") };
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return { status: 400, body: validationError("Request body must be a JSON object.", "body") };
  }

  const targetWs = workspaceId || WORKSPACE_ID;
  const targetActor = actorUserId || ACTOR_USER_ID;
  const state = getLocalState(targetWs);
  const tx = parsed as Record<string, unknown>;

  let typeId: string;
  let reference: string;
  let postingDate: string;
  try {
    typeId = assertStringField(tx.typeId ?? tx.transactionType, "typeId");
    reference = assertStringField(tx.reference, "reference").trim();
    postingDate = assertStringField(tx.date ?? tx.postingDate, "date");
  } catch (err) {
    return { status: 400, body: err as MutationError };
  }
  if (!reference) {
    return { status: 400, body: validationError("Reference cannot be blank.", "reference") };
  }
  if (!isIsoDate(postingDate)) {
    return { status: 400, body: validationError("Date must be YYYY-MM-DD.", "date") };
  }
  const recordId = typeof tx.id === "string" && tx.id.trim() ? tx.id.trim() : null;
  const counterparty = String(tx.counterparty ?? "").trim() || "General";

  const input = { ...(tx as object), typeId, reference, date: postingDate } as PostingTransactionInput;
  const plan = buildPostingPlan(input, {
    chart: state.accounts,
    stockItems: stockItemsForWorkspace(targetWs),
  });

  if (plan.kind === "error") {
    return { status: 422, body: validationError(plan.message, "lineItems") };
  }

  const linkKey = recordId ? `tx:${recordId}` : null;
  if (plan.kind === "skip") {
    const link = linkKey ? state.postedTransactions.get(linkKey) : undefined;
    if (link && linkKey) {
      const err = await reverseLinkedVoucher(state, targetWs, link.voucherId, plan.reason, targetActor);
      if (err) return { status: httpStatusForError(err), body: err };
      state.postedTransactions.delete(linkKey);
      persistLedger(targetWs, state);
      return {
        status: 200,
        body: { ok: true, posted: false, reason: plan.reason, reversedVoucherId: link.voucherId },
      };
    }
    return { status: 200, body: { ok: true, posted: false, reason: plan.reason } };
  }

  for (const spec of plan.newAccounts) addAccountToChart(state, targetWs, spec);

  const result = await postLinkedVoucher(state, targetWs, targetActor, {
    linkKey: linkKey ?? `tx:anon-${crypto.randomUUID()}`,
    postingDate,
    reference,
    sourceModule: `TRANSACTIONS_HUB:${typeId}`,
    lines: plan.lines,
  });
  if (!result.ok) return { status: result.status, body: result.error };

  const voucher = result.voucher;
  return {
    status: 201,
    body: {
      ok: true,
      posted: true,
      voucherId: voucher.id,
      voucherNumber: voucher.voucherNumber,
      reference,
      transactionType: typeId,
      counterparty,
      postingDate,
      totalDebitNgn: voucher.totalDebitNgn,
      totalCreditNgn: voucher.totalCreditNgn,
      linesCount: voucher.lines.length,
      ...(result.replacedVoucherId ? { replacedVoucherId: result.replacedVoucherId } : {}),
    },
  };
}

/** A Transactions Hub record was deleted: take its voucher back out of the books. */
export async function removeStandardTransactionViaBff(
  recordId: string,
  workspaceId?: string,
  actorUserId?: string,
): Promise<{ status: number; body: StandardTransactionSkippedResponse | MutationError }> {
  const targetWs = workspaceId || WORKSPACE_ID;
  const state = getLocalState(targetWs);
  const linkKey = `tx:${recordId}`;
  const link = state.postedTransactions.get(linkKey);
  if (!link) {
    return { status: 200, body: { ok: true, posted: false, reason: "Nothing was posted for this record." } };
  }
  const err = await reverseLinkedVoucher(
    state,
    targetWs,
    link.voucherId,
    "Record deleted",
    actorUserId || ACTOR_USER_ID,
  );
  if (err) return { status: httpStatusForError(err), body: err };
  state.postedTransactions.delete(linkKey);
  persistLedger(targetWs, state);
  return {
    status: 200,
    body: { ok: true, posted: false, reason: "Record deleted.", reversedVoucherId: link.voucherId },
  };
}

// ---------------------------------------------------------------------------------------
// Admin chart of accounts → ledger
// ---------------------------------------------------------------------------------------

interface AdminAccountLike {
  readonly module?: unknown;
  readonly code?: unknown;
  readonly name?: unknown;
  readonly category?: unknown;
  readonly ifrsElement?: unknown;
  readonly ifrsStandard?: unknown;
  readonly accountLevel?: unknown;
  readonly primaryMetricValue?: unknown;
  readonly balanceSide?: unknown;
}

/**
 * Keep the ledger's chart in step with the Admin chart of accounts: new accounts become
 * postable, renamed accounts are renamed, and typed beginning balances are posted as one
 * "Opening Balances" voucher offset to Opening Balance Equity (replaced when they change).
 * Accounts are never removed from the ledger, so posted history stays intact.
 */
export async function syncChartFromAdminRecords(
  workspaceId: string,
  records: readonly unknown[],
  actorUserId?: string,
): Promise<{ readonly ok: true } | { readonly ok: false; readonly error: MutationError }> {
  const state = getLocalState(workspaceId);
  const actor = actorUserId || ACTOR_USER_ID;
  const accounts = records.filter(
    (r): r is AdminAccountLike =>
      typeof r === "object" &&
      r !== null &&
      (r as AdminAccountLike).module === "accounts" &&
      (r as AdminAccountLike).accountLevel !== "GROUP",
  );

  const opening: PlannedLine[] = [];
  for (const rec of accounts) {
    const code = typeof rec.code === "string" ? rec.code.trim() : "";
    const name = typeof rec.name === "string" ? rec.name.trim() : "";
    if (!/^\d{3,6}$/.test(code) || !name) continue;
    const category = categoryFromIfrsElement(String(rec.ifrsElement ?? rec.category ?? ""));
    if (!category) continue;
    const idx = state.accounts.findIndex((a) => a.code === code);
    if (idx === -1) {
      addAccountToChart(state, workspaceId, {
        code,
        name,
        category,
        ifrsTag: typeof rec.ifrsStandard === "string" ? rec.ifrsStandard : "IAS 1",
      });
    } else if (state.accounts[idx]!.name !== name) {
      state.accounts[idx] = { ...state.accounts[idx]!, name };
    }

    const metric = typeof rec.primaryMetricValue === "string" ? rec.primaryMetricValue : "";
    const kobo = toKobo(toAmount(metric));
    if (kobo > 0) {
      const side = rec.balanceSide === "CR" || /\bCR\s*$/i.test(metric) ? "CR" : "DR";
      opening.push({
        accountCode: code,
        debitKobo: side === "DR" ? kobo : 0,
        creditKobo: side === "CR" ? kobo : 0,
        memo: `Opening balance - ${name}`,
      });
    }
  }

  // The demo company's Admin balances are illustrative; its books carry their own history.
  if (workspaceId !== WORKSPACE_ID) {
    const lines = [...opening];
    const net = opening.reduce((s, l) => s + l.debitKobo - l.creditKobo, 0);
    if (net !== 0) {
      const equity =
        state.accounts.find((a) => a.code === "3900") ??
        addAccountToChart(state, workspaceId, {
          code: "3900",
          name: "Opening Balance Equity",
          category: "EQUITY",
          ifrsTag: "OTHER_RESERVES",
        });
      lines.push({
        accountCode: equity.code,
        debitKobo: net < 0 ? -net : 0,
        creditKobo: net > 0 ? net : 0,
        memo: "Opening balance offset",
      });
    }
    const openPeriod = state.periods.find((p) => p.status === "OPEN");
    const link = state.postedTransactions.get(OPENING_BALANCES_KEY);
    if (lines.length >= 2 && openPeriod) {
      const res = await postLinkedVoucher(state, workspaceId, actor, {
        linkKey: OPENING_BALANCES_KEY,
        postingDate: openPeriod.startDate,
        reference: "OPENING-BALANCES",
        sourceModule: "OPENING_BALANCES",
        lines,
      });
      if (!res.ok) return { ok: false, error: res.error };
    } else if (link) {
      const err = await reverseLinkedVoucher(state, workspaceId, link.voucherId, "Opening balances cleared", actor);
      if (err) return { ok: false, error: err };
      state.postedTransactions.delete(OPENING_BALANCES_KEY);
    }
  }

  persistLedger(workspaceId, state);
  return { ok: true };
}
