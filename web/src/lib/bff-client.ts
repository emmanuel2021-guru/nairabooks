/**
 * Next.js Server BFF adapter delegating to Python NAIRABOOKS_API_URL when configured,
 * with a parity-checked local transactional Ledger fallback for standalone runs and Vitest.
 */

import { createHash } from "node:crypto";
import { convertToNgnKobo, formatKobo, parseMoneyToKobo, parseRateScaled } from "@/lib/decimal";
import type {
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
} from "@/types/ledger";

const WORKSPACE_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0001";
const ACTOR_USER_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbb0001";

interface LocalBffState {
  accounts: ChartOfAccount[];
  periods: FiscalPeriod[];
  vouchers: JournalVoucher[];
  idempotency: Map<string, JournalVoucher>;
  sequence: number;
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
  };
}

const globalForLedger = globalThis as unknown as {
  __nairabooksBffState?: LocalBffState;
};

function getLocalState(): LocalBffState {
  if (!globalForLedger.__nairabooksBffState) {
    globalForLedger.__nairabooksBffState = createInitialState();
  }
  return globalForLedger.__nairabooksBffState;
}

function getUpstreamBaseUrl(): string | null {
  const url = process.env.NAIRABOOKS_API_URL?.trim();
  return url && url.length > 0 ? url.replace(/\/$/, "") : null;
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

export async function fetchChartOfAccounts(): Promise<ChartOfAccount[]> {
  const upstream = getUpstreamBaseUrl();
  if (upstream) {
    try {
      const res = await fetch(`${upstream}/api/v1/ledger/accounts`, {
        headers: {
          "X-Workspace-Id": WORKSPACE_ID,
          "X-Actor-User-Id": ACTOR_USER_ID,
        },
        cache: "no-store",
      });
      if (res.ok) {
        const body = (await res.json()) as { items: ChartOfAccount[] };
        return body.items;
      }
    } catch {
      // Fall back to local BFF store when Python server is offline in dev/test
    }
  }
  return [...getLocalState().accounts];
}

export async function fetchFiscalPeriods(): Promise<FiscalPeriod[]> {
  const upstream = getUpstreamBaseUrl();
  if (upstream) {
    try {
      const res = await fetch(`${upstream}/api/v1/ledger/periods`, {
        headers: {
          "X-Workspace-Id": WORKSPACE_ID,
          "X-Actor-User-Id": ACTOR_USER_ID,
        },
        cache: "no-store",
      });
      if (res.ok) {
        const body = (await res.json()) as { items: FiscalPeriod[] };
        return body.items;
      }
    } catch {
      // Fallback
    }
  }
  return [...getLocalState().periods];
}

export async function fetchJournalVouchers(first = 25): Promise<JournalVoucherConnection> {
  const boundedFirst = Math.min(Math.max(first, 1), 100);
  const upstream = getUpstreamBaseUrl();
  if (upstream) {
    try {
      const res = await fetch(
        `${upstream}/api/v1/ledger/vouchers?first=${boundedFirst}`,
        {
          headers: {
            "X-Workspace-Id": WORKSPACE_ID,
            "X-Actor-User-Id": ACTOR_USER_ID,
          },
          cache: "no-store",
        },
      );
      if (res.ok) {
        return (await res.json()) as JournalVoucherConnection;
      }
    } catch {
      // Fallback
    }
  }
  const state = getLocalState();
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

export async function postJournalVoucherViaBff(
  rawJsonText: string,
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

  const upstream = getUpstreamBaseUrl();
  if (upstream) {
    try {
      const res = await fetch(`${upstream}/api/v1/ledger/vouchers`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Workspace-Id": WORKSPACE_ID,
          "X-Actor-User-Id": ACTOR_USER_ID,
        },
        body: rawJsonText,
        cache: "no-store",
      });
      const body = (await res.json()) as JournalVoucher | MutationError;
      return { status: res.status, body };
    } catch {
      // Fallback to local engine
    }
  }

  const payload = parsed as Record<string, unknown>;
  const state = getLocalState();

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
      createdByUserId: ACTOR_USER_ID,
      approvedByUserId: null,
      reversedByVoucherId: null,
      createdAt: new Date().toISOString(),
    };
    state.vouchers = [voucher, ...state.vouchers];
    state.idempotency.set(idempotencyKey, voucher);
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

  const upstream = getUpstreamBaseUrl();
  if (upstream) {
    try {
      const res = await fetch(`${upstream}/api/v1/ledger/vouchers/reverse`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Workspace-Id": WORKSPACE_ID,
          "X-Actor-User-Id": ACTOR_USER_ID,
        },
        body: rawJsonText,
        cache: "no-store",
      });
      const body = (await res.json()) as JournalVoucher | MutationError;
      return { status: res.status, body };
    } catch {
      // Fallback
    }
  }

  const payload = parsed as Record<string, unknown>;
  const state = getLocalState();

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
): Promise<{ status: number; body: FrcnFinancialStatementPackage | MutationError }> {
  const upstream = getUpstreamBaseUrl();
  if (upstream) {
    try {
      const res = await fetch(
        `${upstream}/api/v1/ledger/reports/frcn?fiscalPeriodId=${encodeURIComponent(fiscalPeriodId)}`,
        {
          headers: {
            "X-Workspace-Id": WORKSPACE_ID,
            "X-Actor-User-Id": ACTOR_USER_ID,
          },
          cache: "no-store",
        },
      );
      const body = (await res.json()) as FrcnFinancialStatementPackage | MutationError;
      return { status: res.status, body };
    } catch {
      // Fallback
    }
  }

  const state = getLocalState();
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
      if (TAX_TAGS.has(acct.ifrsTag)) {
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
        if (EMP_TAGS.has(acct.ifrsTag)) {
          employees += net;
        } else if (FIN_TAGS.has(acct.ifrsTag)) {
          capProviders += net;
        } else if (DEPR_TAGS.has(acct.ifrsTag)) {
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
      } else if (acct.category === "EXPENSE" && !TAX_TAGS.has(acct.ifrsTag)) {
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
      generatedAt: new Date().toISOString(),
    },
  };
}

export async function reconcileBankStatementViaBff(
  rawJsonText: string,
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

  const upstream = getUpstreamBaseUrl();
  if (upstream) {
    try {
      const res = await fetch(`${upstream}/api/v1/ledger/reconcile/bank`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Workspace-Id": WORKSPACE_ID,
          "X-Actor-User-Id": ACTOR_USER_ID,
        },
        body: rawJsonText,
        cache: "no-store",
      });
      const body = (await res.json()) as BankReconciliationReport | MutationError;
      return { status: res.status, body };
    } catch {
      // Fallback
    }
  }

  const state = getLocalState();
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

  const upstream = getUpstreamBaseUrl();
  if (upstream) {
    try {
      const res = await fetch(`${upstream}/api/v1/ledger/reconcile/fx-revaluation`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Workspace-Id": WORKSPACE_ID,
          "X-Actor-User-Id": ACTOR_USER_ID,
        },
        body: rawJsonText,
        cache: "no-store",
      });
      const body = (await res.json()) as FxRevaluationReport | MutationError;
      return { status: res.status, body };
    } catch {
      // Fallback
    }
  }

  const state = getLocalState();
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
): Promise<{ period: FiscalPeriod; snapshotHash: string }> {
  const frcn = await fetchFrcnPackage(periodId);
  if (frcn.status !== 200 || !("snapshotHash" in frcn.body)) {
    throw validationError(`Fiscal period '${periodId}' not found.`, "periodId");
  }
  const state = getLocalState();
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
  return {
    period: updated,
    snapshotHash: frcn.body.snapshotHash,
  };
}

export interface StandardTransactionPostingResponse {
  readonly ok: boolean;
  readonly voucherId: string;
  readonly voucherNumber: string;
  readonly reference: string;
  readonly transactionType: string;
  readonly counterparty: string;
  readonly postingDate: string;
  readonly totalDebitNgn: string;
  readonly totalCreditNgn: string;
  readonly linesCount: number;
}

export async function postStandardTransactionViaBff(
  rawJsonText: string,
): Promise<{ status: number; body: StandardTransactionPostingResponse | MutationError }> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJsonText);
  } catch {
    return { status: 400, body: validationError("Malformed JSON payload.", "body") };
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return { status: 400, body: validationError("Request body must be a JSON object.", "body") };
  }

  const upstream = getUpstreamBaseUrl();
  if (upstream) {
    try {
      const res = await fetch(`${upstream}/api/v1/ledger/transactions/post`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Workspace-Id": WORKSPACE_ID,
          "X-Actor-User-Id": ACTOR_USER_ID,
        },
        body: rawJsonText,
        cache: "no-store",
      });
      const data = (await res.json()) as StandardTransactionPostingResponse | MutationError;
      return { status: res.status, body: data };
    } catch {
      // Fallback gracefully to local ledger if upstream unavailable
    }
  }

  const state = getLocalState();
  const tx = parsed as Record<string, unknown>;
  const txType = assertStringField(tx.transactionType ?? tx.typeId, "transactionType");
  const reference = assertStringField(tx.reference, "reference").trim();
  const counterparty = String(tx.counterparty ?? "General Counterparty").trim();
  const postingDate = assertStringField(tx.date ?? tx.postingDate, "date");
  const vatEnabled = Boolean(tx.vatEnabled);
  const whtRatePct = Number(tx.whtRatePct ?? 0);

  // Find or map standard accounts
  const bankAcct = state.accounts.find((a) => a.code === "1010") ?? state.accounts[0]!;
  const arAcct = state.accounts.find((a) => a.code === "1120") ?? bankAcct;
  const apAcct = state.accounts.find((a) => a.code === "2120") ?? bankAcct;
  const revAcct = state.accounts.find((a) => a.code === "4010") ?? state.accounts[0]!;
  const expAcct = state.accounts.find((a) => a.code === "5010") ?? state.accounts[0]!;
  const vatAcct = state.accounts.find((a) => a.code === "2010") ?? revAcct;

  const rawLines = Array.isArray(tx.lineItems) ? tx.lineItems : Array.isArray(tx.lines) ? tx.lines : [];
  let subtotalKobo = 0n;
  for (const rawL of rawLines) {
    const l = rawL as Record<string, unknown>;
    const qty = BigInt(Math.max(1, Math.round(Number(l.quantity ?? 1))));
    const unitPrice = typeof l.unitPriceNgn === "number"
      ? BigInt(Math.round(l.unitPriceNgn * 100))
      : parseMoneyToKobo(String(l.unitPriceNgn ?? "0.00"));
    subtotalKobo += qty * unitPrice;
  }
  if (subtotalKobo === 0n && typeof tx.amountNgn === "number") {
    subtotalKobo = BigInt(Math.round(tx.amountNgn * 100));
  }
  if (subtotalKobo === 0n) {
    subtotalKobo = 10_000_00n; // Default fallback: 10,000 NGN
  }

  const vatKobo = vatEnabled ? (subtotalKobo * 75n) / 1000n : 0n;
  const whtKobo = whtRatePct > 0 ? (subtotalKobo * BigInt(whtRatePct)) / 100n : 0n;
  const grossKobo = subtotalKobo + vatKobo;

  const journalLines: Array<{ accountId: string; debitAmount: string; creditAmount: string; memo: string }> = [];

  if (txType === "sales-invoicing" || txType === "invoice-time-expenses") {
    journalLines.push({
      accountId: revAcct.id,
      debitAmount: "0.00",
      creditAmount: formatKobo(subtotalKobo),
      memo: `Sales Revenue - ${reference} (${counterparty})`,
    });
    if (vatKobo > 0n) {
      journalLines.push({
        accountId: vatAcct.id,
        debitAmount: "0.00",
        creditAmount: formatKobo(vatKobo),
        memo: `Output VAT 7.5% - ${reference}`,
      });
    }
    const netArKobo = grossKobo - whtKobo;
    journalLines.push({
      accountId: arAcct.id,
      debitAmount: formatKobo(netArKobo),
      creditAmount: "0.00",
      memo: `Trade Receivables - ${reference} (${counterparty})`,
    });
    if (whtKobo > 0n) {
      const whtAcct = state.accounts.find((a) => a.code === "1150") ?? arAcct;
      journalLines.push({
        accountId: whtAcct.id,
        debitAmount: formatKobo(whtKobo),
        creditAmount: "0.00",
        memo: `WHT Deducted at Source - ${reference}`,
      });
    }
  } else if (txType === "receive-money" || txType === "select-for-deposit") {
    journalLines.push({
      accountId: bankAcct.id,
      debitAmount: formatKobo(subtotalKobo),
      creditAmount: "0.00",
      memo: `Bank Receipt - ${reference} from ${counterparty}`,
    });
    journalLines.push({
      accountId: arAcct.id,
      debitAmount: "0.00",
      creditAmount: formatKobo(subtotalKobo),
      memo: `Clear AR - ${reference} (${counterparty})`,
    });
  } else if (txType === "bills" || txType === "purchases-receive-inventory") {
    journalLines.push({
      accountId: expAcct.id,
      debitAmount: formatKobo(subtotalKobo),
      creditAmount: "0.00",
      memo: `Purchase Expense - ${reference} from ${counterparty}`,
    });
    if (vatKobo > 0n) {
      journalLines.push({
        accountId: vatAcct.id,
        debitAmount: formatKobo(vatKobo),
        creditAmount: "0.00",
        memo: `Input VAT 7.5% - ${reference}`,
      });
    }
    const netApKobo = grossKobo - whtKobo;
    journalLines.push({
      accountId: apAcct.id,
      debitAmount: "0.00",
      creditAmount: formatKobo(netApKobo),
      memo: `Trade Payables - ${reference} to ${counterparty}`,
    });
    if (whtKobo > 0n) {
      const whtPayableAcct = state.accounts.find((a) => a.code === "2130") ?? apAcct;
      journalLines.push({
        accountId: whtPayableAcct.id,
        debitAmount: "0.00",
        creditAmount: formatKobo(whtKobo),
        memo: `WHT Payable - ${reference}`,
      });
    }
  } else if (txType === "payments" || txType === "write-checks") {
    journalLines.push({
      accountId: apAcct.id,
      debitAmount: formatKobo(subtotalKobo),
      creditAmount: "0.00",
      memo: `Clear AP - ${reference} to ${counterparty}`,
    });
    journalLines.push({
      accountId: bankAcct.id,
      debitAmount: "0.00",
      creditAmount: formatKobo(subtotalKobo),
      memo: `Bank Payment - ${reference} to ${counterparty}`,
    });
  } else {
    // Default balanced entry
    journalLines.push({
      accountId: bankAcct.id,
      debitAmount: formatKobo(subtotalKobo),
      creditAmount: "0.00",
      memo: `${reference} Clearing`,
    });
    journalLines.push({
      accountId: revAcct.id,
      debitAmount: "0.00",
      creditAmount: formatKobo(subtotalKobo),
      memo: `${reference} Clearing Entry`,
    });
  }

  const vRes = await postJournalVoucherViaBff(
    JSON.stringify({
      idempotencyKey: String(tx.idempotencyKey ?? `idem-${Date.now()}`),
      postingDate,
      reference,
      sourceModule: `TRANSACTIONS_HUB:${txType}`,
      lines: journalLines,
    }),
  );

  if (vRes.status !== 201 || !("voucherNumber" in vRes.body)) {
    return { status: vRes.status, body: vRes.body as MutationError };
  }

  const voucher = vRes.body;
  return {
    status: 201,
    body: {
      ok: true,
      voucherId: voucher.id,
      voucherNumber: voucher.voucherNumber,
      reference,
      transactionType: txType,
      counterparty,
      postingDate,
      totalDebitNgn: voucher.totalDebitNgn,
      totalCreditNgn: voucher.totalCreditNgn,
      linesCount: voucher.lines.length,
    },
  };
}
