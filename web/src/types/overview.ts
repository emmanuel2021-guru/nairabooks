export type OverviewTimeframeId = "month" | "quarter" | "ytd";

export interface CashflowBarPoint {
  readonly label: string;
  readonly inflowPct: number;
  readonly outflowPct: number;
  readonly inflowNgn: string;
  readonly outflowNgn: string;
  readonly isCurrent?: boolean;
}

export interface ExpenseCategoryItem {
  readonly id: string;
  readonly label: string;
  readonly proCode: string;
  readonly amountNgn: string;
  readonly sharePct: number;
  readonly barClass: string;
}

export interface TimeframeSnapshot {
  readonly id: OverviewTimeframeId;
  readonly label: string;
  readonly rangeNote: string;
  readonly netIncomeNgn: string;
  readonly netIncomeDelta: string;
  readonly cashFlowBars: readonly CashflowBarPoint[];
  readonly cashFlowSummary: string;
  readonly topExpenses: readonly ExpenseCategoryItem[];
  readonly unreconciledCount: number;
}

export interface OverdueInvoiceItem {
  readonly id: string;
  readonly clientName: string;
  readonly daysOverdue: number;
  readonly amountNgn: string;
  readonly invoiceRef: string;
}

/** Overview figures computed from a company's own books. */
export interface LiveOverviewData {
  readonly timeframes: Readonly<Record<OverviewTimeframeId, TimeframeSnapshot>>;
  /** The three oldest overdue invoices. */
  readonly overdueInvoices: readonly OverdueInvoiceItem[];
  readonly overdueCount: number;
}
