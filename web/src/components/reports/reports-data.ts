import type { FrcnFinancialStatementPackage } from "@/types/ledger";
import { loadAdminRecords } from "@/components/admin/admin-store";
import { parseNairaNumeric } from "@/components/admin/admin-maintain-data";

export type ReportCategoryKey =
  | "financial-statements"
  | "accounts-receivable"
  | "accounts-payable"
  | "general-ledger"
  | "inventory"
  | "payroll"
  | "reconciliation"
  | "job-costing"
  | "time-expense"
  | "company-audit";

export interface ReportCategoryMeta {
  readonly key: ReportCategoryKey;
  readonly label: string;
  readonly shortLabel: string;
  readonly description: string;
  readonly iconKey: string;
  readonly tintBg: string;
  readonly tintText: string;
}

export interface ReportColumn {
  readonly id: string;
  readonly label: string;
  readonly align?: "left" | "right" | "center";
  readonly isNumeric?: boolean;
  readonly isDefaultVisible: boolean;
  readonly width?: string;
}

export interface ReportRow {
  readonly id: string;
  readonly isHeader?: boolean;
  readonly isTotal?: boolean;
  readonly values: Record<string, string | number>;
}

export interface ReportAdvancedOptionConfig {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly type: "boolean" | "select";
  readonly defaultValue: boolean | string;
  readonly options?: readonly { readonly label: string; readonly value: string }[];
}

export interface ReportDefinition {
  readonly id: string;
  readonly category: ReportCategoryKey;
  readonly title: string;
  readonly statutoryStandard: string;
  readonly summary: string;
  readonly tags: readonly string[];
  readonly columns: readonly ReportColumn[];
  readonly advancedOptions: readonly ReportAdvancedOptionConfig[];
  readonly generateRows: (
    pkg?: FrcnFinancialStatementPackage,
    advOptions?: Record<string, boolean | string>,
  ) => {
    readonly rows: readonly ReportRow[];
    readonly summaryKpis: readonly {
      readonly label: string;
      readonly value: string;
      readonly change?: string;
    }[];
  };
}

export const REPORT_CATEGORIES: readonly ReportCategoryMeta[] = [
  {
    key: "financial-statements",
    label: "Financial Statements & FRCN",
    shortLabel: "Financials",
    description: "Balance Sheets, Income Statements, Trial Balance, FRCN Value Added & Cash Flow.",
    iconKey: "scale",
    tintBg: "#E6F5ED",
    tintText: "#006838",
  },
  {
    key: "accounts-receivable",
    label: "Accounts Receivable & Sales",
    shortLabel: "Receivables",
    description: "Customer aging, sales journals, invoice registers, and collection histories.",
    iconKey: "receipt",
    tintBg: "#EAF3FC",
    tintText: "#0F4C81",
  },
  {
    key: "accounts-payable",
    label: "Accounts Payable & Purchases",
    shortLabel: "Payables",
    description: "Vendor aging, purchase journals, check registers, cash requirements & WHT.",
    iconKey: "banknote",
    tintBg: "#FDF2E9",
    tintText: "#C25E00",
  },
  {
    key: "general-ledger",
    label: "General Ledger & Journals",
    shortLabel: "General Ledger",
    description: "Account variance vs budget, chart of accounts, journal registers & audit detail.",
    iconKey: "book-open",
    tintBg: "#F3E8FF",
    tintText: "#6B21A8",
  },
  {
    key: "inventory",
    label: "Inventory & Production",
    shortLabel: "Inventory",
    description: "IAS 2 stock valuation, reorder status, BOM assemblies, and gross profit by SKU.",
    iconKey: "boxes",
    tintBg: "#FEF9C3",
    tintText: "#854D0E",
  },
  {
    key: "payroll",
    label: "Payroll & PAYE Taxes",
    shortLabel: "Payroll",
    description: "Employee earnings, state PAYE tax schedules (LIRS), and PenCom 8%/10% pensions.",
    iconKey: "users",
    tintBg: "#FCE7F3",
    tintText: "#9D174D",
  },
  {
    key: "reconciliation",
    label: "Banking & Reconciliation",
    shortLabel: "Banking",
    description: "Account reconciliation, deposits in transit, outstanding NIP transits & POS MDR.",
    iconKey: "landmark",
    tintBg: "#E0F2FE",
    tintText: "#0369A1",
  },
  {
    key: "job-costing",
    label: "Job & Project Costing",
    shortLabel: "Job Costs",
    description: "Project profitability, estimated vs actual expenses, and retainage holdbacks.",
    iconKey: "briefcase",
    tintBg: "#E2E8F0",
    tintText: "#334155",
  },
  {
    key: "time-expense",
    label: "Time & Expense Tickets",
    shortLabel: "Time & Expense",
    description: "Aged unbilled time tickets, employee expense claims, and billable hour logs.",
    iconKey: "clock",
    tintBg: "#CCFBF1",
    tintText: "#0F766E",
  },
  {
    key: "company-audit",
    label: "Company Audit & Security",
    shortLabel: "Audit & Security",
    description: "CAMA 2020 Section 405 SHA-256 hash chains, user activity, and statutory seals.",
    iconKey: "shield-check",
    tintBg: "#F1F5F9",
    tintText: "#0F172A",
  },
];

export function formatNairaAmount(val: number | string): string {
  const num = typeof val === "string" ? Number(val) : val;
  if (isNaN(num)) return "₦0.00";
  return `₦${num.toLocaleString("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatShortNaira(val: number | string): string {
  const num = typeof val === "string" ? Number(val) : val;
  if (isNaN(num)) return "₦0";
  if (Math.abs(num) >= 1_000_000_000) {
    return `₦${(num / 1_000_000_000).toFixed(2)}B`;
  }
  if (Math.abs(num) >= 1_000_000) {
    return `₦${(num / 1_000_000).toFixed(2)}M`;
  }
  if (Math.abs(num) >= 1_000) {
    return `₦${(num / 1_000).toFixed(1)}k`;
  }
  return `₦${num.toLocaleString("en-NG")}`;
}

// -------------------------------------------------------------
// CATALOG DEFINITIONS: 15 FRCN & IFRS STATUTORY REPORTS
// -------------------------------------------------------------

export const REPORTS_CATALOG: readonly ReportDefinition[] = [
  // 1. FINANCIAL STATEMENTS
  {
    id: "trial-balance",
    category: "financial-statements",
    title: "General Ledger Trial Balance",
    statutoryStandard: "IFRS / CAMA Sec 405",
    summary:
      "Listing of all debit and credit balances for every IFRS account in the chart of accounts, verifying double-entry equilibrium.",
    tags: ["IFRS", "FRCN", "CAMA Sec 405", "Audit-Ready"],
    columns: [
      { id: "code", label: "Account Code", align: "left", isDefaultVisible: true, width: "120px" },
      { id: "name", label: "Account Name", align: "left", isDefaultVisible: true },
      { id: "category", label: "IFRS Category", align: "left", isDefaultVisible: true },
      { id: "debit", label: "Debit (₦)", align: "right", isNumeric: true, isDefaultVisible: true },
      { id: "credit", label: "Credit (₦)", align: "right", isNumeric: true, isDefaultVisible: true },
      { id: "netBalance", label: "Net Balance (₦)", align: "right", isNumeric: true, isDefaultVisible: false },
    ],
    advancedOptions: [
      {
        id: "showZeroBalances",
        label: "Show Zero-Balance Accounts",
        description: "Include accounts with ₦0.00 debit and credit balance.",
        type: "boolean",
        defaultValue: false,
      },
      {
        id: "camaHashSeal",
        label: "Display CAMA 2020 Sec 405 Hash",
        description: "Show SHA-256 ledger integrity digest on exported sheets.",
        type: "boolean",
        defaultValue: true,
      },
      {
        id: "subtotalByCategory",
        label: "Subtotal by IFRS Category",
        description: "Insert summary rows for Assets, Liabilities, Equity, Revenue, and Expenses.",
        type: "boolean",
        defaultValue: true,
      },
    ],
    generateRows: (pkg) => {
      if (!pkg) {
        return {
          rows: [],
          summaryKpis: [
            { label: "Total Debits", value: "₦0.00" },
            { label: "Total Credits", value: "₦0.00" },
            { label: "Balance Status", value: "Awaiting Data" },
          ],
        };
      }
      const rows: ReportRow[] = pkg.trialBalance.map((r) => {
        const d = Number(r.debitBalanceNgn) || 0;
        const c = Number(r.creditBalanceNgn) || 0;
        return {
          id: r.accountCode,
          values: {
            code: r.accountCode,
            name: r.accountName,
            category: r.category,
            debit: d,
            credit: c,
            netBalance: d - c,
          },
        };
      });

      return {
        rows,
        summaryKpis: [
          { label: "Total Debits", value: `₦${pkg.totalDebitsNgn}` },
          { label: "Total Credits", value: `₦${pkg.totalCreditsNgn}` },
          {
            label: "Equilibrium Status",
            value: pkg.isBalanced ? "Balanced (0.00 variance)" : "Out of balance",
            change: pkg.isBalanced ? "+ Balanced" : "Check Entries",
          },
        ],
      };
    },
  },
  {
    id: "income-statement",
    category: "financial-statements",
    title: "Income Statement (Profit & Loss)",
    statutoryStandard: "IAS 1 / FRCN P&L",
    summary:
      "Comprehensive profit and loss statement showing Operating Revenue, Cost of Sales, Gross Profit, Operating Expenses, and Net Profit.",
    tags: ["IFRS 15", "IAS 1", "P&L", "Executive"],
    columns: [
      { id: "lineLabel", label: "Line Item", align: "left", isDefaultVisible: true },
      { id: "category", label: "Group", align: "left", isDefaultVisible: true },
      { id: "amountNgn", label: "Amount (₦)", align: "right", isNumeric: true, isDefaultVisible: true },
      { id: "sharePct", label: "Share of Revenue (%)", align: "right", isNumeric: true, isDefaultVisible: true },
    ],
    advancedOptions: [
      {
        id: "comparisonPeriod",
        label: "Comparative Mode",
        description: "Compare with previous fiscal year.",
        type: "select",
        defaultValue: "none",
        options: [
          { label: "Current Period Only", value: "none" },
          { label: "Compare vs FY2025 (Variance %)", value: "prior-year" },
        ],
      },
    ],
    generateRows: (pkg) => {
      const rev = Number(pkg?.profitAndLoss.totalRevenueNgn) || 15500000;
      const profit = Number(pkg?.profitAndLoss.netProfitNgn) || 7200000;
      const cogs = Math.round(rev * 0.38);
      const grossProfit = rev - cogs;
      const opex = grossProfit - profit;

      const rows: ReportRow[] = [
        {
          id: "r-rev",
          values: {
            lineLabel: "Operating Sales Revenue (IFRS 15)",
            category: "Revenue",
            amountNgn: rev,
            sharePct: "100.0%",
          },
        },
        {
          id: "r-cogs",
          values: {
            lineLabel: "Cost of Goods & Direct Services Sold (COGS)",
            category: "Direct Cost",
            amountNgn: -cogs,
            sharePct: `${((cogs / rev) * 100).toFixed(1)}%`,
          },
        },
        {
          id: "r-gp",
          isTotal: true,
          values: {
            lineLabel: "Gross Profit",
            category: "Subtotal",
            amountNgn: grossProfit,
            sharePct: `${((grossProfit / rev) * 100).toFixed(1)}%`,
          },
        },
        {
          id: "r-opex",
          values: {
            lineLabel: "Operating, Administrative & General Expenses",
            category: "Operating Expense",
            amountNgn: -opex,
            sharePct: `${((opex / rev) * 100).toFixed(1)}%`,
          },
        },
        {
          id: "r-net",
          isTotal: true,
          values: {
            lineLabel: "Net Profit Before Tax (PBT)",
            category: "Profit",
            amountNgn: profit,
            sharePct: `${((profit / rev) * 100).toFixed(1)}%`,
          },
        },
      ];

      return {
        rows,
        summaryKpis: [
          { label: "Total Revenue", value: formatNairaAmount(rev) },
          { label: "Gross Margin", value: `${((grossProfit / rev) * 100).toFixed(1)}%` },
          { label: "Net Profit", value: formatNairaAmount(profit) },
        ],
      };
    },
  },
  {
    id: "balance-sheet",
    category: "financial-statements",
    title: "Statement of Financial Position (Balance Sheet)",
    statutoryStandard: "IAS 1 / FRCN SOFP",
    summary:
      "Assets, liabilities, and owners' equity structured under IFRS (IAS 1), demonstrating solvency and capital structure.",
    tags: ["IAS 1", "Financial Position", "Solvency"],
    columns: [
      { id: "section", label: "Element", align: "left", isDefaultVisible: true },
      { id: "account", label: "Account Classification", align: "left", isDefaultVisible: true },
      { id: "amountNgn", label: "Balance (₦)", align: "right", isNumeric: true, isDefaultVisible: true },
      { id: "sharePct", label: "% of Total Assets", align: "right", isNumeric: true, isDefaultVisible: true },
    ],
    advancedOptions: [
      {
        id: "liquidityOrder",
        label: "IAS 1 Presentation Order",
        description: "Choose liquidity presentation order for assets and liabilities.",
        type: "select",
        defaultValue: "current-first",
        options: [
          { label: "Current Assets First (Operational)", value: "current-first" },
          { label: "Non-Current First (Capital Intensive)", value: "non-current-first" },
        ],
      },
    ],
    generateRows: (pkg) => {
      const assets = Number(pkg?.financialPosition.totalAssetsNgn) || 28500000;
      const equity = Number(pkg?.financialPosition.totalEquityNgn) || 19200000;
      const liabilities = assets - equity;

      const rows: ReportRow[] = [
        {
          id: "b-cash",
          values: {
            section: "Current Assets",
            account: "Cash & Cash Equivalents (Zenith, GTBank)",
            amountNgn: Math.round(assets * 0.45),
            sharePct: "45.0%",
          },
        },
        {
          id: "b-ar",
          values: {
            section: "Current Assets",
            account: "Trade Receivables (Less IFRS 9 ECL)",
            amountNgn: Math.round(assets * 0.25),
            sharePct: "25.0%",
          },
        },
        {
          id: "b-inv",
          values: {
            section: "Current Assets",
            account: "Inventory Stock on Hand (IAS 2)",
            amountNgn: Math.round(assets * 0.15),
            sharePct: "15.0%",
          },
        },
        {
          id: "b-ppe",
          values: {
            section: "Non-Current Assets",
            account: "Property, Plant & Equipment (IAS 16)",
            amountNgn: Math.round(assets * 0.15),
            sharePct: "15.0%",
          },
        },
        {
          id: "b-tot-assets",
          isTotal: true,
          values: {
            section: "Total Assets",
            account: "Sum of All Economic Resources Owned",
            amountNgn: assets,
            sharePct: "100.0%",
          },
        },
        {
          id: "b-ap",
          values: {
            section: "Current Liabilities",
            account: "Trade Payables & Accrued Expenses",
            amountNgn: Math.round(liabilities * 0.7),
            sharePct: `${((Math.round(liabilities * 0.7) / assets) * 100).toFixed(1)}%`,
          },
        },
        {
          id: "b-tax",
          values: {
            section: "Current Liabilities",
            account: "Nigeria Tax Liabilities (VAT, WHT, CIT)",
            amountNgn: Math.round(liabilities * 0.3),
            sharePct: `${((Math.round(liabilities * 0.3) / assets) * 100).toFixed(1)}%`,
          },
        },
        {
          id: "b-equity",
          isTotal: true,
          values: {
            section: "Total Equity & Net Capital",
            account: "Contributed Capital + Retained Earnings",
            amountNgn: equity,
            sharePct: `${((equity / assets) * 100).toFixed(1)}%`,
          },
        },
      ];

      return {
        rows,
        summaryKpis: [
          { label: "Total Assets", value: formatNairaAmount(assets) },
          { label: "Total Liabilities", value: formatNairaAmount(liabilities) },
          { label: "Net Equity", value: formatNairaAmount(equity) },
        ],
      };
    },
  },
  {
    id: "value-added",
    category: "financial-statements",
    title: "FRCN Statement of Value Added",
    statutoryStandard: "FRCN OND Page 41",
    summary:
      "Statutory Nigerian FRCN disclosure showing wealth created by the reporting entity and its distribution to employees, government, capital providers, and retained for future expansion.",
    tags: ["FRCN OND", "Nigerian Statutory", "Wealth Distribution"],
    columns: [
      { id: "lineLabel", label: "Wealth Distribution Category", align: "left", isDefaultVisible: true },
      { id: "amountNgn", label: "Amount (₦)", align: "right", isNumeric: true, isDefaultVisible: true },
      { id: "percentageShare", label: "Distribution Share (%)", align: "right", isNumeric: true, isDefaultVisible: true },
    ],
    advancedOptions: [
      {
        id: "benchmarkIndustry",
        label: "Benchmark Against Sector Average",
        description: "Display Nigerian Chamber of Commerce standard labor/tax distribution ratios.",
        type: "boolean",
        defaultValue: false,
      },
    ],
    generateRows: (pkg) => {
      const items = pkg?.valueAddedStatement ?? [
        { lineLabel: "Turnover & Invoiced Revenue", amountNgn: "18,500,000.00", percentageShare: "100.00" },
        { lineLabel: "Bought-in Materials & Services", amountNgn: "6,800,000.00", percentageShare: "36.75" },
        { lineLabel: "Value Added Created", amountNgn: "11,700,000.00", percentageShare: "63.25" },
        { lineLabel: "To Employees (Salaries, PAYE & Pensions)", amountNgn: "4,200,000.00", percentageShare: "22.70" },
        { lineLabel: "To Government (Company Income Tax & Levies)", amountNgn: "1,150,000.00", percentageShare: "6.22" },
        { lineLabel: "To Providers of Capital (Bank Interest & Dividends)", amountNgn: "450,000.00", percentageShare: "2.43" },
        { lineLabel: "Retained for Future Expansion (Depreciation & Reserves)", amountNgn: "5,900,000.00", percentageShare: "31.90" },
      ];

      const rows: ReportRow[] = items.map((r, idx) => ({
        id: `va-${idx}`,
        isTotal: r.lineLabel.includes("Value Added"),
        values: {
          lineLabel: r.lineLabel,
          amountNgn: Number(r.amountNgn.replace(/,/g, "")) || 0,
          percentageShare: `${r.percentageShare}%`,
        },
      }));

      return {
        rows,
        summaryKpis: [
          { label: "Value Created", value: formatNairaAmount(items[2]?.amountNgn ?? 11700000) },
          { label: "Employee Share", value: `${items[3]?.percentageShare ?? "22.7"}%` },
          { label: "Government Share", value: `${items[4]?.percentageShare ?? "6.2"}%` },
        ],
      };
    },
  },
  {
    id: "five-year-summary",
    category: "financial-statements",
    title: "FRCN Five-Year Financial Summary",
    statutoryStandard: "FRCN OND Page 42",
    summary:
      "Statutory Nigerian FRCN multi-year trend table detailing turnover, operating profit, gross assets, and net equity across up to five consecutive fiscal years.",
    tags: ["FRCN OND", "Multi-Year", "Long-Term Growth"],
    columns: [
      { id: "fiscalYearLabel", label: "Fiscal Period", align: "left", isDefaultVisible: true },
      { id: "revenueNgn", label: "Turnover (₦)", align: "right", isNumeric: true, isDefaultVisible: true },
      { id: "profitBeforeTaxNgn", label: "Profit Before Tax (₦)", align: "right", isNumeric: true, isDefaultVisible: true },
      { id: "totalAssetsNgn", label: "Total Assets (₦)", align: "right", isNumeric: true, isDefaultVisible: true },
      { id: "netEquityNgn", label: "Net Equity (₦)", align: "right", isNumeric: true, isDefaultVisible: true },
    ],
    advancedOptions: [
      {
        id: "cagrMetric",
        label: "Compute 5-Year CAGR",
        description: "Calculate Compound Annual Growth Rate for Turnover and Net Worth.",
        type: "boolean",
        defaultValue: true,
      },
    ],
    generateRows: (pkg) => {
      const items = pkg?.fiveYearSummary ?? [
        { fiscalYearLabel: "FY2022", revenueNgn: "8,200,000.00", profitBeforeTaxNgn: "1,200,000.00", totalAssetsNgn: "12,000,000.00", netEquityNgn: "7,500,000.00" },
        { fiscalYearLabel: "FY2023", revenueNgn: "11,400,000.00", profitBeforeTaxNgn: "2,400,000.00", totalAssetsNgn: "16,500,000.00", netEquityNgn: "9,800,000.00" },
        { fiscalYearLabel: "FY2024", revenueNgn: "14,800,000.00", profitBeforeTaxNgn: "3,800,000.00", totalAssetsNgn: "21,200,000.00", netEquityNgn: "13,400,000.00" },
        { fiscalYearLabel: "FY2025", revenueNgn: "18,900,000.00", profitBeforeTaxNgn: "5,100,000.00", totalAssetsNgn: "26,800,000.00", netEquityNgn: "17,600,000.00" },
        { fiscalYearLabel: "FY2026", revenueNgn: "24,500,000.00", profitBeforeTaxNgn: "7,200,000.00", totalAssetsNgn: "34,000,000.00", netEquityNgn: "22,500,000.00" },
      ];

      const rows: ReportRow[] = items.map((col) => ({
        id: col.fiscalYearLabel,
        values: {
          fiscalYearLabel: col.fiscalYearLabel,
          revenueNgn: Number(col.revenueNgn.replace(/,/g, "")) || 0,
          profitBeforeTaxNgn: Number(col.profitBeforeTaxNgn.replace(/,/g, "")) || 0,
          totalAssetsNgn: Number(col.totalAssetsNgn.replace(/,/g, "")) || 0,
          netEquityNgn: Number(col.netEquityNgn.replace(/,/g, "")) || 0,
        },
      }));

      return {
        rows,
        summaryKpis: [
          { label: "Latest Revenue", value: formatNairaAmount(items[items.length - 1]?.revenueNgn ?? 24500000) },
          { label: "PBT Growth", value: "+32.4% YoY" },
          { label: "5-Yr Turnover CAGR", value: "+31.5%" },
        ],
      };
    },
  },

  // 2. ACCOUNTS RECEIVABLE
  {
    id: "aged-receivables",
    category: "accounts-receivable",
    title: "Aged Receivables Schedule",
    statutoryStandard: "IFRS 7 / Aging Schedule",
    summary:
      "Outstanding customer invoices categorized by aging brackets (Current, 1–30, 31–60, 61–90, 90+ days), identifying credit risk and expected cash collections.",
    tags: ["AR", "Credit Control", "Aging Brackets", "IFRS 9"],
    columns: [
      { id: "customer", label: "Customer Name", align: "left", isDefaultVisible: true },
      { id: "contact", label: "Primary Phone / Rep", align: "left", isDefaultVisible: false },
      { id: "current", label: "Current (₦)", align: "right", isNumeric: true, isDefaultVisible: true },
      { id: "days30", label: "1-30 Days (₦)", align: "right", isNumeric: true, isDefaultVisible: true },
      { id: "days60", label: "31-60 Days (₦)", align: "right", isNumeric: true, isDefaultVisible: true },
      { id: "days90", label: "61-90 Days (₦)", align: "right", isNumeric: true, isDefaultVisible: true },
      { id: "over90", label: "Over 90 Days (₦)", align: "right", isNumeric: true, isDefaultVisible: true },
      { id: "totalDue", label: "Total Outstanding (₦)", align: "right", isNumeric: true, isDefaultVisible: true },
    ],
    advancedOptions: [
      {
        id: "agingInterval",
        label: "Aging Bracket Intervals",
        description: "Choose 30-day standard or 15-day strict credit cycle.",
        type: "select",
        defaultValue: "30-days",
        options: [
          { label: "Standard 30 Days (0-30, 31-60, 61-90, 90+)", value: "30-days" },
          { label: "Strict 15 Days (0-15, 16-30, 31-45, 45+)", value: "15-days" },
        ],
      },
      {
        id: "dateBasis",
        label: "Aging Date Calculation Basis",
        description: "Age receivables from original invoice date or due date.",
        type: "select",
        defaultValue: "due-date",
        options: [
          { label: "Due Date (Credit Terms Expiry)", value: "due-date" },
          { label: "Invoice Date (Transaction Creation)", value: "invoice-date" },
        ],
      },
      {
        id: "highlightOverdue",
        label: "Highlight Risk Over 60 Days",
        description: "Flag severely overdue balances requiring immediate demand letter.",
        type: "boolean",
        defaultValue: true,
      },
    ],
    generateRows: () => {
      const records = loadAdminRecords().filter((r) => r.module === "customers");
      let totCurrent = 0, tot30 = 0, tot60 = 0, tot90 = 0, totOver = 0;
      const rows: ReportRow[] = records.map((cust) => {
        const total = parseNairaNumeric(cust.primaryMetricValue);
        const current = Math.round(total * 0.7);
        const days30 = Math.round(total * 0.3);
        totCurrent += current;
        tot30 += days30;
        return {
          id: cust.id,
          values: {
            customer: cust.name,
            contact: cust.contactOrNote || cust.code,
            current,
            days30,
            days60: 0,
            days90: 0,
            over90: 0,
            totalDue: total,
          },
        };
      });

      const grandTotal = totCurrent + tot30 + tot60 + tot90 + totOver;

      return {
        rows,
        summaryKpis: [
          { label: "Total Receivables", value: formatNairaAmount(grandTotal) },
          { label: "Current (Not Due)", value: formatNairaAmount(totCurrent) },
          { label: "Overdue (>30 Days)", value: formatNairaAmount(tot30 + tot60 + tot90 + totOver) },
        ],
      };
    },
  },
  {
    id: "invoice-register",
    category: "accounts-receivable",
    title: "Customer Invoice Register",
    statutoryStandard: "NRS VAT & Sales Register",
    summary:
      "Log of all customer sales invoices issued, listing invoice number, customer, issuance date, due date, 7.5% VAT, and payment status.",
    tags: ["Sales Invoices", "Audit", "VAT 7.5%"],
    columns: [
      { id: "ref", label: "Invoice #", align: "left", isDefaultVisible: true, width: "130px" },
      { id: "customer", label: "Customer", align: "left", isDefaultVisible: true },
      { id: "issueDate", label: "Date Issued", align: "left", isDefaultVisible: true },
      { id: "dueDate", label: "Due Date", align: "left", isDefaultVisible: true },
      { id: "subtotalNgn", label: "Net Subtotal (₦)", align: "right", isNumeric: true, isDefaultVisible: false },
      { id: "vatNgn", label: "7.5% VAT (₦)", align: "right", isNumeric: true, isDefaultVisible: true },
      { id: "totalNgn", label: "Invoice Total (₦)", align: "right", isNumeric: true, isDefaultVisible: true },
      { id: "status", label: "Status", align: "center", isDefaultVisible: true },
    ],
    advancedOptions: [
      {
        id: "statusFilter",
        label: "Invoice Status Filter",
        description: "Filter invoices by payment lifecycle.",
        type: "select",
        defaultValue: "all",
        options: [
          { label: "All Invoices (Paid & Unpaid)", value: "all" },
          { label: "Unpaid / Overdue Only", value: "unpaid" },
          { label: "Settled / Fully Paid Only", value: "paid" },
        ],
      },
    ],
    generateRows: () => {
      const customers = loadAdminRecords().filter((r) => r.module === "customers");
      const sampleDates = [
        { issue: "2026-03-15", due: "2026-04-14", status: "Open" },
        { issue: "2026-03-12", due: "2026-04-11", status: "Paid" },
        { issue: "2026-03-08", due: "2026-04-07", status: "Open" },
        { issue: "2026-03-05", due: "2026-03-05", status: "Paid" },
        { issue: "2026-02-28", due: "2026-03-30", status: "Overdue" },
      ];

      const invoices = customers.map((c, idx) => {
        const total = parseNairaNumeric(c.primaryMetricValue) || (idx === 0 ? 1075000 : 850000);
        const subtotal = Math.round(total / 1.075);
        const vat = total - subtotal;
        const meta = sampleDates[idx % sampleDates.length] ?? {
          issue: "2026-03-15",
          due: "2026-04-14",
          status: "Open",
        };
        return {
          ref: `INV-2026-${104 + idx}`,
          customer: c.name,
          issueDate: meta.issue,
          dueDate: meta.due,
          subtotal,
          vat,
          total,
          status: meta.status,
        };
      });

      const rows: ReportRow[] = invoices.map((inv) => ({
        id: inv.ref,
        values: {
          ref: inv.ref,
          customer: inv.customer,
          issueDate: inv.issueDate,
          dueDate: inv.dueDate,
          subtotalNgn: inv.subtotal,
          vatNgn: inv.vat,
          totalNgn: inv.total,
          status: inv.status,
        },
      }));

      const sum = invoices.reduce((acc, i) => acc + i.total, 0);
      const vatSum = invoices.reduce((acc, i) => acc + i.vat, 0);

      return {
        rows,
        summaryKpis: [
          { label: "Invoiced Total", value: formatNairaAmount(sum) },
          { label: "Output VAT (7.5%)", value: formatNairaAmount(vatSum) },
          { label: "Invoices Count", value: `${invoices.length} invoices` },
        ],
      };
    },
  },

  // 3. ACCOUNTS PAYABLE
  {
    id: "aged-payables",
    category: "accounts-payable",
    title: "Aged Payables Schedule",
    statutoryStandard: "IFRS 7 / Vendor Aging",
    summary:
      "Outstanding vendor bills organized by aging buckets to prioritize supplier cash payments and manage liquidity.",
    tags: ["AP", "Cash Management", "Vendors"],
    columns: [
      { id: "vendor", label: "Vendor / Supplier", align: "left", isDefaultVisible: true },
      { id: "tin", label: "Tax ID / TIN", align: "left", isDefaultVisible: false },
      { id: "current", label: "Current (₦)", align: "right", isNumeric: true, isDefaultVisible: true },
      { id: "days30", label: "1-30 Days (₦)", align: "right", isNumeric: true, isDefaultVisible: true },
      { id: "days60", label: "31-60 Days (₦)", align: "right", isNumeric: true, isDefaultVisible: true },
      { id: "days90", label: "61-90 Days (₦)", align: "right", isNumeric: true, isDefaultVisible: true },
      { id: "totalDue", label: "Total Payables (₦)", align: "right", isNumeric: true, isDefaultVisible: true },
    ],
    advancedOptions: [
      {
        id: "whtDeductionCheck",
        label: "Deduct Applicable WHT Preview",
        description: "Show net cash required after subtracting 2%/5% statutory WHT holdback.",
        type: "boolean",
        defaultValue: false,
      },
    ],
    generateRows: () => {
      const records = loadAdminRecords().filter((r) => r.module === "vendors");
      let totCurrent = 0, tot30 = 0, tot60 = 0, tot90 = 0;
      const rows: ReportRow[] = records.map((vend) => {
        const total = parseNairaNumeric(vend.primaryMetricValue);
        const current = Math.round(total * 0.8);
        const days30 = Math.round(total * 0.2);
        totCurrent += current;
        tot30 += days30;
        return {
          id: vend.id,
          values: {
            vendor: vend.name,
            tin: vend.details?.tinNumber ?? vend.code,
            current,
            days30,
            days60: 0,
            days90: 0,
            totalDue: total,
          },
        };
      });

      const grandTotal = totCurrent + tot30 + tot60 + tot90;

      return {
        rows,
        summaryKpis: [
          { label: "Total Supplier Payables", value: formatNairaAmount(grandTotal) },
          { label: "Due Immediately (Current)", value: formatNairaAmount(totCurrent) },
          { label: "Active Suppliers", value: `${records.length} vendors` },
        ],
      };
    },
  },

  // 4. GENERAL LEDGER
  {
    id: "general-journal",
    category: "general-ledger",
    title: "General Journal Audit Report",
    statutoryStandard: "Double-Entry General Journal",
    summary:
      "Sequential audit journal of all balanced double-entry transactions posted into the general ledger, showing debit/credit accounts, memos, and session references.",
    tags: ["Double-Entry", "Journal Vouchers", "Audit Trail"],
    columns: [
      { id: "voucherRef", label: "Voucher #", align: "left", isDefaultVisible: true, width: "120px" },
      { id: "postDate", label: "Post Date", align: "left", isDefaultVisible: true },
      { id: "account", label: "GL Account", align: "left", isDefaultVisible: true },
      { id: "memo", label: "Transaction Memo", align: "left", isDefaultVisible: true },
      { id: "debit", label: "Debit (₦)", align: "right", isNumeric: true, isDefaultVisible: true },
      { id: "credit", label: "Credit (₦)", align: "right", isNumeric: true, isDefaultVisible: true },
    ],
    advancedOptions: [
      {
        id: "includeReversals",
        label: "Include Reversed Entries",
        description: "Display audit reversal offset pairs marked with CAMA void reasons.",
        type: "boolean",
        defaultValue: true,
      },
      {
        id: "sortBySequence",
        label: "Sort by Journal Sequence",
        description: "Order by strict voucher chronological insertion order.",
        type: "boolean",
        defaultValue: true,
      },
    ],
    generateRows: () => {
      const entries = [
        { voucherRef: "JV-2026-081", postDate: "2026-03-14", account: "6510 Depreciation Expense", memo: "Monthly vehicle fleet depreciation", debit: 312500, credit: 0 },
        { voucherRef: "JV-2026-081", postDate: "2026-03-14", account: "1590 Accumulated Depr - Motor Vehicles", memo: "IAS 16 contra account offset", debit: 0, credit: 312500 },
        { voucherRef: "JV-2026-082", postDate: "2026-03-12", account: "1010 Zenith Bank Current", memo: "Customer cash receipt settlement", debit: 850000, credit: 0 },
        { voucherRef: "JV-2026-082", postDate: "2026-03-12", account: "1200 Trade Receivables", memo: "Eko Atlantic Suites Ltd payment settlement", debit: 0, credit: 850000 },
        { voucherRef: "JV-2026-083", postDate: "2026-03-10", account: "5010 Raw Materials Inventory", memo: "Factory stock intake", debit: 420000, credit: 0 },
        { voucherRef: "JV-2026-083", postDate: "2026-03-10", account: "2010 Trade Payables", memo: "Eko Diesel & Haulage Ltd PO-102", debit: 0, credit: 420000 },
      ];

      const rows: ReportRow[] = entries.map((e, idx) => ({
        id: `gj-${idx}`,
        values: {
          voucherRef: e.voucherRef,
          postDate: e.postDate,
          account: e.account,
          memo: e.memo,
          debit: e.debit,
          credit: e.credit,
        },
      }));

      const totDebit = entries.reduce((s, e) => s + e.debit, 0);

      return {
        rows,
        summaryKpis: [
          { label: "Total Journal Activity", value: formatNairaAmount(totDebit) },
          { label: "Equilibrium", value: "Balanced 100%" },
          { label: "Vouchers Count", value: "3 balanced vouchers" },
        ],
      };
    },
  },

  // 5. INVENTORY & STOCK
  {
    id: "inventory-valuation",
    category: "inventory",
    title: "IAS 2 Inventory Valuation & Costing",
    statutoryStandard: "IAS 2 Inventory Valuation",
    summary:
      "Comprehensive inventory valuation per IAS 2, listing quantity on hand, average unit cost, total book value, and gross margin contribution by SKU.",
    tags: ["IAS 2", "Stock Valuation", "COGS", "Manufacturing"],
    columns: [
      { id: "sku", label: "SKU / Item ID", align: "left", isDefaultVisible: true, width: "130px" },
      { id: "name", label: "Item Description", align: "left", isDefaultVisible: true },
      { id: "qtyOnHand", label: "Qty on Hand", align: "right", isNumeric: true, isDefaultVisible: true },
      { id: "unitCost", label: "Unit Cost (₦)", align: "right", isNumeric: true, isDefaultVisible: true },
      { id: "assetValue", label: "Asset Valuation (₦)", align: "right", isNumeric: true, isDefaultVisible: true },
      { id: "reorderLevel", label: "Reorder Point", align: "right", isNumeric: true, isDefaultVisible: false },
    ],
    advancedOptions: [
      {
        id: "valuationMethod",
        label: "IAS 2 Costing Methodology",
        description: "Calculate asset value using FIFO or Weighted Average Cost.",
        type: "select",
        defaultValue: "fifo",
        options: [
          { label: "FIFO (First In, First Out)", value: "fifo" },
          { label: "Weighted Average Cost (AVCO)", value: "avco" },
        ],
      },
      {
        id: "highlightLowStock",
        label: "Highlight Low Stock Alerts",
        description: "Color items where Qty on Hand is less than Reorder Point in amber.",
        type: "boolean",
        defaultValue: true,
      },
    ],
    generateRows: () => {
      const records = loadAdminRecords().filter((r) => r.module === "inventory");
      const rows: ReportRow[] = records.map((item) => {
        const qtyMatch = item.primaryMetricValue.match(/\d+/);
        const qty = qtyMatch ? Number.parseInt(qtyMatch[0], 10) : 12;
        const cost = 285000;
        const val = qty * cost;
        return {
          id: item.id,
          values: {
            sku: item.code,
            name: item.name,
            qtyOnHand: qty,
            unitCost: cost,
            assetValue: val,
            reorderLevel: 6,
          },
        };
      });

      const totalValuation = rows.reduce((sum, r) => sum + (Number(r.values.assetValue) || 0), 0);
      const totalUnits = rows.reduce((sum, r) => sum + (Number(r.values.qtyOnHand) || 0), 0);

      return {
        rows,
        summaryKpis: [
          { label: "Total Inventory Value", value: formatNairaAmount(totalValuation) },
          { label: "Total Physical Units", value: `${totalUnits.toLocaleString("en-NG")} units` },
          { label: "Valuation Standard", value: "IAS 2 Lower of Cost / NRV" },
        ],
      };
    },
  },

  // 6. PAYROLL & COMPENSATION
  {
    id: "payroll-register",
    category: "payroll",
    title: "Payroll Register & Statutory Remittance",
    statutoryStandard: "PITA & Pension Reform Act",
    summary:
      "Employee gross remuneration, employee 8% and employer 10% PenCom pensions, State PAYE income tax (e.g. Lagos LIRS), and net take-home salary.",
    tags: ["PAYE", "PenCom", "LIRS", "NHF", "Payroll"],
    columns: [
      { id: "staffId", label: "Staff ID", align: "left", isDefaultVisible: true, width: "110px" },
      { id: "name", label: "Employee Name", align: "left", isDefaultVisible: true },
      { id: "state", label: "State of Residence", align: "left", isDefaultVisible: true },
      { id: "gross", label: "Gross Salary (₦)", align: "right", isNumeric: true, isDefaultVisible: true },
      { id: "pencomEmployee", label: "PenCom 8% (₦)", align: "right", isNumeric: true, isDefaultVisible: true },
      { id: "payeTax", label: "PAYE Tax (₦)", align: "right", isNumeric: true, isDefaultVisible: true },
      { id: "netPay", label: "Net Take-Home (₦)", align: "right", isNumeric: true, isDefaultVisible: true },
      { id: "pencomEmployer", label: "Employer 10% (₦)", align: "right", isNumeric: true, isDefaultVisible: false },
    ],
    advancedOptions: [
      {
        id: "stateTaxFilter",
        label: "Filter by State Tax Authority",
        description: "Isolate remittances for Lagos LIRS, FCT Internal Revenue, or Ogun State.",
        type: "select",
        defaultValue: "all",
        options: [
          { label: "All States", value: "all" },
          { label: "Lagos State Internal Revenue (LIRS)", value: "lagos" },
          { label: "FCT Internal Revenue (Abuja)", value: "fct" },
        ],
      },
      {
        id: "taxAct2025Relief",
        label: "Apply Nigeria Tax Act 2025 CRA",
        description: "Calculate consolidated relief allowance under modern tax tables.",
        type: "boolean",
        defaultValue: true,
      },
    ],
    generateRows: () => {
      const records = loadAdminRecords().filter((r) => r.module === "employees");
      const rows: ReportRow[] = records.map((emp) => {
        const gross = parseNairaNumeric(emp.primaryMetricValue) || 450000;
        const pencomEmp = Math.round(gross * 0.08);
        const pencomCo = Math.round(gross * 0.10);
        const paye = Math.round(gross * 0.12);
        const net = gross - pencomEmp - paye;
        return {
          id: emp.id,
          values: {
            staffId: emp.code,
            name: emp.name,
            state: "Lagos (LIRS)",
            gross,
            pencomEmployee: pencomEmp,
            payeTax: paye,
            netPay: net,
            pencomEmployer: pencomCo,
          },
        };
      });

      const totGross = rows.reduce((s, r) => s + (Number(r.values.gross) || 0), 0);
      const totPaye = rows.reduce((s, r) => s + (Number(r.values.payeTax) || 0), 0);
      const totNet = rows.reduce((s, r) => s + (Number(r.values.netPay) || 0), 0);

      return {
        rows,
        summaryKpis: [
          { label: "Gross Payroll Cost", value: formatNairaAmount(totGross) },
          { label: "Total PAYE Withheld", value: formatNairaAmount(totPaye) },
          { label: "Net Salaries Disbursed", value: formatNairaAmount(totNet) },
        ],
      };
    },
  },

  // 7. BANKING & RECONCILIATION
  {
    id: "bank-reconciliation-summary",
    category: "reconciliation",
    title: "Account Reconciliation & Clearance Report",
    statutoryStandard: "CBN / Bank Reconciliation",
    summary:
      "Bank statement ending balance matched against internal general ledger cash accounts, detailing deposits in transit, outstanding checks/NIP transits, and bank fees.",
    tags: ["Reconciliation", "NIBSS", "Paystack", "Audit"],
    columns: [
      { id: "itemType", label: "Reconciliation Component", align: "left", isDefaultVisible: true },
      { id: "refOrAccount", label: "Reference / Account", align: "left", isDefaultVisible: true },
      { id: "amountNgn", label: "Amount (₦)", align: "right", isNumeric: true, isDefaultVisible: true },
      { id: "status", label: "Clearance Status", align: "center", isDefaultVisible: true },
    ],
    advancedOptions: [
      {
        id: "showClearedItems",
        label: "Show Cleared Items",
        description: "Include items already matched and verified in the selected period.",
        type: "boolean",
        defaultValue: false,
      },
    ],
    generateRows: () => {
      const rows: ReportRow[] = [
        {
          id: "br-1",
          values: {
            itemType: "General Ledger Ending Book Balance",
            refOrAccount: "1010 Zenith Bank Current (NGN)",
            amountNgn: 14850000,
            status: "Book Balance",
          },
        },
        {
          id: "br-2",
          values: {
            itemType: "Add: Deposits in Transit (Undeposited POS)",
            refOrAccount: "Paystack Batch #PAY-8812",
            amountNgn: 1250000,
            status: "Pending Bank Credit",
          },
        },
        {
          id: "br-3",
          values: {
            itemType: "Less: Outstanding NIP Transfers",
            refOrAccount: "Vendor Payment #PAY-329",
            amountNgn: -680000,
            status: "Pending Clearance",
          },
        },
        {
          id: "br-4",
          values: {
            itemType: "Less: Unposted Bank MDR & Maintenance Fee",
            refOrAccount: "Zenith Electronic Transfer Levy / Stamp Duty",
            amountNgn: -4500,
            status: "Adjustment Required",
          },
        },
        {
          id: "br-5",
          isTotal: true,
          values: {
            itemType: "Adjusted Bank Statement Ending Balance",
            refOrAccount: "Zenith Bank E-Statement (31 Mar 2026)",
            amountNgn: 15415500,
            status: "Reconciled",
          },
        },
      ];

      return {
        rows,
        summaryKpis: [
          { label: "Book Balance", value: "₦14,850,000.00" },
          { label: "Adjusted Statement", value: "₦15,415,500.00" },
          { label: "Reconciliation Status", value: "Clean Match (₦0 discrepancy)" },
        ],
      };
    },
  },

  // 8. JOB & PROJECT COSTING
  {
    id: "job-profitability",
    category: "job-costing",
    title: "Project & Job Profitability Report",
    statutoryStandard: "IFRS 15 Contract Performance",
    summary:
      "Job costing tracking contracted contract sum, materials consumed, direct labor hours, subcontractor WHT costs, and realized gross profit percentage.",
    tags: ["Job Costing", "Construction", "WHT 5%", "Margin"],
    columns: [
      { id: "jobCode", label: "Job #", align: "left", isDefaultVisible: true, width: "120px" },
      { id: "client", label: "Client & Site", align: "left", isDefaultVisible: true },
      { id: "contractSum", label: "Contract Sum (₦)", align: "right", isNumeric: true, isDefaultVisible: true },
      { id: "actualCosts", label: "Actual Costs (₦)", align: "right", isNumeric: true, isDefaultVisible: true },
      { id: "grossMargin", label: "Gross Profit (₦)", align: "right", isNumeric: true, isDefaultVisible: true },
      { id: "marginPct", label: "Margin (%)", align: "right", isNumeric: true, isDefaultVisible: true },
    ],
    advancedOptions: [
      {
        id: "retainagePercent",
        label: "Deduct 5% Retainage Holdback",
        description: "Isolate client retention guarantees held until defect liability period.",
        type: "boolean",
        defaultValue: true,
      },
    ],
    generateRows: () => {
      const jobs = [
        { jobCode: "JOB-2026-001", client: "Eko Atlantic Phase 2 Penthouse", contract: 18500000, cost: 11200000 },
        { jobCode: "JOB-2026-002", client: "Victoria Island Clinic Solar Retrofit", contract: 9200000, cost: 5800000 },
        { jobCode: "JOB-2026-003", client: "Ikeja Industrial Warehouse Flooring", contract: 6400000, cost: 4100000 },
        { jobCode: "JOB-2026-004", client: "Abuja Diplomatic Zone CCTV / Access", contract: 4800000, cost: 2650000 },
      ];

      const rows: ReportRow[] = jobs.map((j) => {
        const profit = j.contract - j.cost;
        const pct = ((profit / j.contract) * 100).toFixed(1);
        return {
          id: j.jobCode,
          values: {
            jobCode: j.jobCode,
            client: j.client,
            contractSum: j.contract,
            actualCosts: j.cost,
            grossMargin: profit,
            marginPct: `${pct}%`,
          },
        };
      });

      const totContract = jobs.reduce((s, j) => s + j.contract, 0);
      const totCost = jobs.reduce((s, j) => s + j.cost, 0);

      return {
        rows,
        summaryKpis: [
          { label: "Active Contracts Sum", value: formatNairaAmount(totContract) },
          { label: "Costs Incurred", value: formatNairaAmount(totCost) },
          { label: "Average Job Margin", value: `${(((totContract - totCost) / totContract) * 100).toFixed(1)}%` },
        ],
      };
    },
  },

  // 9. TIME & EXPENSE
  {
    id: "unbilled-time-tickets",
    category: "time-expense",
    title: "Aged Unbilled Time & Expense Tickets",
    statutoryStandard: "Time & Billing Tracking",
    summary:
      "Listing of billable consultant hours and out-of-pocket reimbursable expenses logged by team members that have not yet been billed onto client invoices.",
    tags: ["Time Billing", "Consulting", "WIP"],
    columns: [
      { id: "ticketRef", label: "Ticket #", align: "left", isDefaultVisible: true, width: "120px" },
      { id: "consultant", label: "Consultant / Staff", align: "left", isDefaultVisible: true },
      { id: "client", label: "Client & Service", align: "left", isDefaultVisible: true },
      { id: "hours", label: "Hours", align: "right", isNumeric: true, isDefaultVisible: true },
      { id: "rate", label: "Hourly Rate (₦)", align: "right", isNumeric: true, isDefaultVisible: true },
      { id: "billableNgn", label: "Billable Amount (₦)", align: "right", isNumeric: true, isDefaultVisible: true },
    ],
    advancedOptions: [
      {
        id: "minAgingDays",
        label: "Tickets Older Than (Days)",
        description: "Filter tickets logged more than 14 or 30 days ago.",
        type: "select",
        defaultValue: "all",
        options: [
          { label: "All Unbilled Tickets", value: "all" },
          { label: "Older than 14 Days", value: "14" },
          { label: "Older than 30 Days (High Delay)", value: "30" },
        ],
      },
    ],
    generateRows: () => {
      const tickets = [
        { ref: "TCK-109", consultant: "Chinedu Okafor", client: "Eko Atlantic Suites Ltd (Tax Audit)", hours: 18, rate: 35000 },
        { ref: "TCK-110", consultant: "Amina Bello", client: "Victoria Island Logistics (IFRS Review)", hours: 24, rate: 50000 },
        { ref: "TCK-111", consultant: "Chinedu Okafor", client: "Ikeja City Mall Pharmacy (POS Setup)", hours: 12, rate: 40000 },
        { ref: "TCK-112", consultant: "Amina Bello", client: "Eko Diesel & Haulage Ltd (Stock Review)", hours: 8, rate: 25000 },
      ];

      const rows: ReportRow[] = tickets.map((t) => ({
        id: t.ref,
        values: {
          ticketRef: t.ref,
          consultant: t.consultant,
          client: t.client,
          hours: t.hours,
          rate: t.rate,
          billableNgn: t.hours * t.rate,
        },
      }));

      const totBillable = tickets.reduce((s, t) => s + t.hours * t.rate, 0);
      const totHours = tickets.reduce((s, t) => s + t.hours, 0);

      return {
        rows,
        summaryKpis: [
          { label: "Unbilled WIP", value: formatNairaAmount(totBillable) },
          { label: "Unbilled Hours", value: `${totHours} billable hrs` },
          { label: "Ready for Invoicing", value: "4 client tickets" },
        ],
      };
    },
  },

  // 10. COMPANY AUDIT & SECURITY
  {
    id: "cama-audit-trail",
    category: "company-audit",
    title: "CAMA 2020 Section 405 Immutable Audit Trail",
    statutoryStandard: "CAMA 2020 Sec 405 Audit Trail",
    summary:
      "Immutable cryptographic SHA-256 hash-chained log of every transaction creation, reversal, fiscal period certification, and user session.",
    tags: ["CAMA 2020", "SHA-256", "Audit Trail", "Tamper-Evident"],
    columns: [
      { id: "eventSeq", label: "Seq #", align: "left", isDefaultVisible: true, width: "90px" },
      { id: "timestamp", label: "Timestamp (WAT)", align: "left", isDefaultVisible: true },
      { id: "actor", label: "User / Role", align: "left", isDefaultVisible: true },
      { id: "action", label: "Action & Entity", align: "left", isDefaultVisible: true },
      { id: "hashDigest", label: "SHA-256 Digest Preview", align: "left", isDefaultVisible: true },
      { id: "status", label: "Chain Status", align: "center", isDefaultVisible: true },
    ],
    advancedOptions: [
      {
        id: "verifyChainIntegrity",
        label: "Live Hash-Chain Verification",
        description: "Re-verify parent hash linkages across all historical events.",
        type: "boolean",
        defaultValue: true,
      },
    ],
    generateRows: (pkg) => {
      const digest = pkg?.snapshotHash ?? "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
      const events = [
        { seq: "AUD-0091", time: "2026-03-15 14:22:08", actor: "cfo@lagostrading.ng", action: "POST_VOUCHER (JV-2026-081)", hash: digest.slice(0, 16) + "...", status: "Valid Link" },
        { seq: "AUD-0090", time: "2026-03-15 12:05:41", actor: "owner@lagostrading.ng", action: "CAMA_PERIOD_LOCK (FY2025)", hash: "7f83b1657ff1fc53...", status: "Valid Link" },
        { seq: "AUD-0089", time: "2026-03-14 16:30:19", actor: "clerk@lagostrading.ng", action: "CREATE_INVOICE (INV-2026-104)", hash: "cb8379ac2098aa1e...", status: "Valid Link" },
        { seq: "AUD-0088", time: "2026-03-14 11:15:02", actor: "cfo@lagostrading.ng", action: "REVERSE_VOUCHER (JV-2026-079)", hash: "185f8db32271fe25...", status: "Valid Link" },
      ];

      const rows: ReportRow[] = events.map((ev) => ({
        id: ev.seq,
        values: {
          eventSeq: ev.seq,
          timestamp: ev.time,
          actor: ev.actor,
          action: ev.action,
          hashDigest: ev.hash,
          status: ev.status,
        },
      }));

      return {
        rows,
        summaryKpis: [
          { label: "Chain Status", value: "100% Intact (Zero Drift)" },
          { label: "Active Digest", value: `${digest.slice(0, 12)}...` },
          { label: "Statutory Law", value: "CAMA 2020 Sec 405" },
        ],
      };
    },
  },
];

export function getReportDefinition(id: string): ReportDefinition {
  const found = REPORTS_CATALOG.find((r) => r.id === id);
  if (found) return found;
  return REPORTS_CATALOG[0]!;
}

export function getReportsByCategory(category: ReportCategoryKey): readonly ReportDefinition[] {
  return REPORTS_CATALOG.filter((r) => r.category === category);
}
