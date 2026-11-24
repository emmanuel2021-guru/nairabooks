import { describe, expect, it } from "vitest";
import { getReportDefinition } from "@/components/reports/reports-data";
import { loadAdminRecords } from "@/components/admin/admin-store";
import type { FrcnFinancialStatementPackage } from "@/types/ledger";

const ZERO_TEST_PACKAGE: FrcnFinancialStatementPackage = {
  fiscalPeriodId: "period-zero-test",
  fiscalPeriodLabel: "FY2026",
  statementCurrency: "NGN",
  trialBalance: [],
  totalDebitsNgn: "0.00",
  totalCreditsNgn: "0.00",
  profitAndLoss: {
    revenueLines: [],
    operatingExpenseLines: [],
    taxExpenseLines: [],
    totalRevenueNgn: "0.00",
    operatingExpensesNgn: "0.00",
    profitBeforeTaxNgn: "0.00",
    incomeTaxExpenseNgn: "0.00",
    netProfitNgn: "0.00",
  },
  financialPosition: {
    asOfDate: "2026-12-31",
    assetLines: [],
    liabilityLines: [],
    equityLines: [],
    retainedAndCurrentEarningsNgn: "0.00",
    totalAssetsNgn: "0.00",
    totalLiabilitiesNgn: "0.00",
    totalEquityNgn: "0.00",
    isBalanced: true,
  },
  valueAddedStatement: [],
  fiveYearSummary: [],
  isBalanced: true,
  snapshotHash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  trialBalanceCsv: "",
  generatedAt: new Date().toISOString(),
};

describe("Reports Live Data Binding & Chart of Accounts Wizard Seeding", () => {
  it("generates pure zero-state rows and ₦0.00 KPIs for balance-sheet when ledger has zero balances", () => {
    const balanceSheet = getReportDefinition("balance-sheet");
    const result = balanceSheet.generateRows(ZERO_TEST_PACKAGE);

    // Must be completely free of synthetic ₦28,500,000.00 or fake rows
    expect(result.summaryKpis).toEqual([
      { label: "Total Assets", value: "₦0.00" },
      { label: "Total Liabilities", value: "₦0.00" },
      { label: "Net Equity", value: "₦0.00" },
    ]);
    // The related accounts from the chart of accounts are visible even at zero balance
    expect(result.rows.length).toBeGreaterThan(0);
    for (const r of result.rows) {
      expect(r.values.amountNgn).toBe(0);
    }
  });

  it("links balance-sheet strictly to live StatementLineItem lines when present", () => {
    const livePackage: FrcnFinancialStatementPackage = {
      ...ZERO_TEST_PACKAGE,
      financialPosition: {
        ...ZERO_TEST_PACKAGE.financialPosition,
        totalAssetsNgn: "500,000.00",
        totalLiabilitiesNgn: "200,000.00",
        totalEquityNgn: "300,000.00",
        assetLines: [
          {
            accountCode: "1110",
            accountName: "Operating Bank (Access Bank)",
            ifrsTag: "CASH_AND_CASH_EQUIVALENTS",
            amountNgn: "500,000.00",
          },
        ],
        liabilityLines: [
          {
            accountCode: "2110",
            accountName: "Trade Payables",
            ifrsTag: "TRADE_AND_OTHER_PAYABLES",
            amountNgn: "200,000.00",
          },
        ],
        equityLines: [
          {
            accountCode: "3010",
            accountName: "Share Capital",
            ifrsTag: "SHARE_CAPITAL",
            amountNgn: "300,000.00",
          },
        ],
      },
    };

    const balanceSheet = getReportDefinition("balance-sheet");
    const result = balanceSheet.generateRows(livePackage);

    expect(result.summaryKpis[0]?.value).toBe("₦500,000.00");
    expect(result.summaryKpis[1]?.value).toBe("₦200,000.00");
    expect(result.summaryKpis[2]?.value).toBe("₦300,000.00");

    const cashRow = result.rows.find((r) => r.id === "b-1110");
    expect(cashRow).toBeDefined();
    expect(cashRow?.values.account).toContain("Operating Bank (Access Bank)");
    expect(cashRow?.values.amountNgn).toBe(500000);
  });

  it("generates pure zero-state rows and ₦0.00 KPIs for income-statement when ledger has zero turnover", () => {
    const incomeStatement = getReportDefinition("income-statement");
    const result = incomeStatement.generateRows(ZERO_TEST_PACKAGE);

    // Must be completely free of synthetic ₦15,500,000.00 or ₦7,200,000.00
    expect(result.summaryKpis).toEqual([
      { label: "Total Revenue", value: "₦0.00" },
      { label: "Gross Margin", value: "0.0%" },
      { label: "Net Profit", value: "₦0.00" },
    ]);
    // The related revenue and expense accounts from the chart of accounts are visible even at zero balance
    expect(result.rows.length).toBeGreaterThan(0);
    for (const r of result.rows) {
      expect(r.values.amountNgn).toBe(0);
    }
  });

  it("seeds tailored IFRS Chart of Accounts with zero balances for newly registered SME workspace", () => {
    const newWorkspaceId = "test-ws-" + Date.now();
    const records = loadAdminRecords(newWorkspaceId);

    // Newly registered SME workspace should have tailored Chart of Accounts seeded
    const accountRecords = records.filter((r) => r.module === "accounts");
    expect(accountRecords.length).toBeGreaterThanOrEqual(20);

    // All seeded accounts must have ₦0.00 starting balance
    for (const acc of accountRecords) {
      expect(acc.primaryMetricValue).toBe("₦0.00");
      expect(acc.isActive).toBe(true);
    }

    // Customers, vendors, employees must start empty (zero mock bleed)
    expect(records.filter((r) => r.module === "customers")).toHaveLength(0);
    expect(records.filter((r) => r.module === "vendors")).toHaveLength(0);
    expect(records.filter((r) => r.module === "employees")).toHaveLength(0);
  });
});
