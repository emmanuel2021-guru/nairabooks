/**
 * Strict domain & GraphQL contracts matching api/graphql/schema.graphql.
 * Monetary and FX rate fields are serialized strictly as decimal strings to avoid float drift.
 */

export type CurrencyCode = "NGN" | "USD" | "GBP" | "EUR";

export type AccountCategory =
  | "ASSET"
  | "LIABILITY"
  | "EQUITY"
  | "REVENUE"
  | "EXPENSE"
  | "RESTRICTED_FUND";

export type PeriodStatus = "OPEN" | "SOFT_LOCKED" | "CLOSED_CAMA_CERTIFIED";

export type VoucherStatus = "DRAFT" | "POSTED" | "REVERSED";

/** Fixed 2-decimal monetary string (e.g. "50000.00"). Never pass IEEE-754 floats. */
export type DecimalMoneyString = string;

/** Fixed 6-decimal FX rate string (e.g. "1.000000"). */
export type DecimalRateString = string;

export interface MoneyAmount {
  readonly amount: DecimalMoneyString;
  readonly currency: CurrencyCode;
  readonly functionalAmountNgn: DecimalMoneyString;
  readonly exchangeRateToNgn: DecimalRateString;
}

export interface ChartOfAccount {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly category: AccountCategory;
  readonly ifrsTag: string;
  readonly sourcePrimitive: string;
  readonly isSystemLocked: boolean;
  readonly isActive: boolean;
}

export interface FiscalPeriod {
  readonly id: string;
  readonly label: string;
  readonly startDate: string;
  readonly endDate: string;
  readonly status: PeriodStatus;
  readonly camaCertification: string | null;
}

export interface JournalLine {
  readonly id: string;
  readonly accountId: string;
  readonly accountCode: string;
  readonly accountName: string;
  readonly debit: MoneyAmount;
  readonly credit: MoneyAmount;
  readonly fundOrDepartmentCode: string | null;
  readonly projectOrSiteCode: string | null;
  readonly memo: string | null;
}

export interface JournalVoucher {
  readonly __typename: "JournalVoucher";
  readonly id: string;
  readonly voucherNumber: string;
  readonly postingDate: string;
  readonly status: VoucherStatus;
  readonly reference: string;
  readonly sourceModule: string;
  readonly lines: readonly JournalLine[];
  readonly totalDebitNgn: DecimalMoneyString;
  readonly totalCreditNgn: DecimalMoneyString;
  readonly createdByUserId: string;
  readonly approvedByUserId: string | null;
  readonly reversedByVoucherId: string | null;
  readonly createdAt: string;
}

export interface JournalVoucherEdge {
  readonly cursor: string;
  readonly node: JournalVoucher;
}

export interface PageInfo {
  readonly hasNextPage: boolean;
  readonly hasPreviousPage: boolean;
  readonly startCursor: string | null;
  readonly endCursor: string | null;
}

export interface JournalVoucherConnection {
  readonly edges: readonly JournalVoucherEdge[];
  readonly pageInfo: PageInfo;
}

export interface JournalLineDraft {
  readonly accountId: string;
  readonly debitAmount: DecimalMoneyString;
  readonly creditAmount: DecimalMoneyString;
  readonly currency: CurrencyCode;
  readonly exchangeRateToNgn: DecimalRateString;
  readonly fundOrDepartmentCode?: string | null;
  readonly projectOrSiteCode?: string | null;
  readonly memo?: string | null;
}

export interface PostJournalVoucherInput {
  readonly idempotencyKey: string;
  readonly postingDate: string;
  readonly reference: string;
  readonly sourceModule: string;
  readonly lines: readonly JournalLineDraft[];
}

export interface ReverseJournalVoucherInput {
  readonly idempotencyKey: string;
  readonly originalVoucherId: string;
  readonly reversalDate: string;
  readonly reason: string;
}

export interface ValidationError {
  readonly __typename: "ValidationError";
  readonly code: string;
  readonly message: string;
  readonly field: string | null;
}

export interface UnbalancedJournalError {
  readonly __typename: "UnbalancedJournalError";
  readonly code: string;
  readonly message: string;
  readonly totalDebitNgn: DecimalMoneyString;
  readonly totalCreditNgn: DecimalMoneyString;
}

export interface ClosedPeriodError {
  readonly __typename: "ClosedPeriodError";
  readonly code: string;
  readonly message: string;
  readonly periodLabel: string;
  readonly periodStatus: PeriodStatus;
}

export type ActorRole =
  | "OWNER_MANAGING_DIRECTOR"
  | "CHARTERED_ACCOUNTANT_CFO"
  | "BOOKKEEPER"
  | "BRANCH_OUTLET_CASHIER"
  | "EXTERNAL_AUDITOR_READONLY";

export interface CrossTenantAccessError {
  readonly __typename: "CrossTenantAccessError";
  readonly code: string;
  readonly message: string;
}

export interface SegregationOfDutiesError {
  readonly __typename: "SegregationOfDutiesError";
  readonly code: string;
  readonly message: string;
  readonly requiredRole: ActorRole;
}

export interface AuthSecurityError {
  readonly __typename: "AuthenticationError" | "AuthorizationError" | "RateLimitExceededError";
  readonly code: string;
  readonly message: string;
}

export type MutationError =
  | ValidationError
  | UnbalancedJournalError
  | ClosedPeriodError
  | CrossTenantAccessError
  | SegregationOfDutiesError
  | AuthSecurityError;

export type PostJournalVoucherResult = JournalVoucher | MutationError;

export type Result<T, E> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };

export interface TrialBalanceRow {
  readonly accountCode: string;
  readonly accountName: string;
  readonly category: AccountCategory;
  readonly ifrsTag: string;
  readonly debitBalanceNgn: DecimalMoneyString;
  readonly creditBalanceNgn: DecimalMoneyString;
}

export interface StatementLineItem {
  readonly accountCode: string;
  readonly accountName: string;
  readonly ifrsTag: string;
  readonly amountNgn: DecimalMoneyString;
}

export interface ProfitAndLossStatement {
  readonly revenueLines: readonly StatementLineItem[];
  readonly operatingExpenseLines: readonly StatementLineItem[];
  readonly taxExpenseLines: readonly StatementLineItem[];
  readonly totalRevenueNgn: DecimalMoneyString;
  readonly operatingExpensesNgn: DecimalMoneyString;
  readonly profitBeforeTaxNgn: DecimalMoneyString;
  readonly incomeTaxExpenseNgn: DecimalMoneyString;
  readonly netProfitNgn: DecimalMoneyString;
}

export interface FinancialPositionStatement {
  readonly asOfDate: string;
  readonly assetLines: readonly StatementLineItem[];
  readonly liabilityLines: readonly StatementLineItem[];
  readonly equityLines: readonly StatementLineItem[];
  readonly retainedAndCurrentEarningsNgn: DecimalMoneyString;
  readonly totalAssetsNgn: DecimalMoneyString;
  readonly totalLiabilitiesNgn: DecimalMoneyString;
  readonly totalEquityNgn: DecimalMoneyString;
  readonly isBalanced: boolean;
}

export interface ValueAddedStatementRow {
  readonly lineLabel: string;
  readonly amountNgn: DecimalMoneyString;
  readonly percentageShare: DecimalRateString;
}

export interface FiveYearMetricColumn {
  readonly fiscalYearLabel: string;
  readonly revenueNgn: DecimalMoneyString;
  readonly profitBeforeTaxNgn: DecimalMoneyString;
  readonly totalAssetsNgn: DecimalMoneyString;
  readonly netEquityNgn: DecimalMoneyString;
}

export interface FrcnFinancialStatementPackage {
  readonly fiscalPeriodId: string;
  readonly fiscalPeriodLabel: string;
  readonly statementCurrency: CurrencyCode;
  readonly trialBalance: readonly TrialBalanceRow[];
  readonly totalDebitsNgn: DecimalMoneyString;
  readonly totalCreditsNgn: DecimalMoneyString;
  readonly profitAndLoss: ProfitAndLossStatement;
  readonly financialPosition: FinancialPositionStatement;
  readonly valueAddedStatement: readonly ValueAddedStatementRow[];
  readonly fiveYearSummary: readonly FiveYearMetricColumn[];
  readonly isBalanced: boolean;
  readonly snapshotHash: string;
  readonly trialBalanceCsv: string;
  /** Every voucher posted in the period (newest first), for journal registers. */
  readonly journalVouchers?: readonly JournalVoucher[];
  readonly generatedAt: string;
}

export interface BankStatementLineDraft {
  readonly lineId: string;
  readonly valueDate: string;
  readonly amountNgn: DecimalMoneyString;
  readonly direction: "CREDIT" | "DEBIT";
  readonly channel: string;
  readonly reference: string;
  readonly feeNgn: DecimalMoneyString;
}

export interface ReconciliationMatchItem {
  readonly statementLineId: string;
  readonly voucherId: string;
  readonly voucherNumber: string;
  readonly status: "MATCHED_EXACT" | "MATCHED_FEE_ADJUSTED";
  readonly matchedAmountNgn: DecimalMoneyString;
  readonly feeVarianceNgn: DecimalMoneyString;
}

export interface BankReconciliationReport {
  readonly accountId: string;
  readonly accountCode: string;
  readonly accountName: string;
  readonly matchedCount: number;
  readonly matches: readonly ReconciliationMatchItem[];
  readonly unmatchedStatementLines: readonly BankStatementLineDraft[];
  readonly unmatchedLedgerLines: readonly {
    readonly voucherId: string;
    readonly voucherNumber: string;
    readonly postingDate: string;
    readonly reference: string;
    readonly direction: "CREDIT" | "DEBIT";
    readonly amountNgn: DecimalMoneyString;
  }[];
  readonly statementNetNgn: DecimalMoneyString;
  readonly ledgerNetNgn: DecimalMoneyString;
  readonly reconciliationDifferenceNgn: DecimalMoneyString;
}

export interface FxRevaluationReport {
  readonly accountId: string;
  readonly accountCode: string;
  readonly accountName: string;
  readonly currency: CurrencyCode;
  readonly asOfDate: string;
  readonly foreignBalance: DecimalMoneyString;
  readonly carryingNgn: DecimalMoneyString;
  readonly closingRateToNgn: DecimalRateString;
  readonly revaluedNgn: DecimalMoneyString;
  readonly unrealizedGainLossNgn: DecimalMoneyString;
  readonly isGain: boolean;
}

export interface WorkspaceKpiSummary {
  readonly workspaceId: string;
  readonly bankBalanceNgn: string;
  readonly receivablesNgn: string;
  readonly payablesNgn: string;
  readonly netIncomeNgn: string;
  readonly accountCount: number;
  readonly voucherCount: number;
  readonly isZeroState: boolean;
}
