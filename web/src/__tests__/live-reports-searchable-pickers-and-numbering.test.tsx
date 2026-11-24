import React from "react";
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import {
  getNextTransactionReference,
  getNextAdminRecordCode,
} from "@/lib/numbering-service";
import {
  loadAdminRecords,
  saveAdminRecords,
  seedTailoredAccountsForWorkspace,
  upsertAdminRecord,
} from "@/components/admin/admin-store";
import {
  loadTransactions,
  saveTransactions,
  upsertTransaction,
} from "@/components/transactions/transactions-store";
import {
  getReportDefinition,
} from "@/components/reports/reports-data";
import { ReportViewer } from "@/components/reports/ReportViewer";
import { TransactionRecordEditorWorkspace } from "@/components/transactions/TransactionRecordEditorWorkspace";
import { AdminRecordEditorWorkspace } from "@/components/admin/AdminRecordEditorWorkspace";
import { AdminMaintainWorkspace } from "@/components/AdminMaintainWorkspace";
import { AdminEditorTabWidget } from "@/components/admin/AdminEditorWidgets";
import { WorkspaceModeProvider } from "@/state/workspace-mode";

const TEST_WS = "test-ws-numbering-and-reports-001";

describe("Live Reports, Searchable Pickers, and 1-Based Numbering Suite", () => {
  beforeEach(() => {
    window.localStorage.setItem("nairabooks_active_workspace", TEST_WS);
    window.sessionStorage.clear();
    saveTransactions([], TEST_WS);
    saveAdminRecords([], TEST_WS);
  });

  describe("1. Sequential Numbering Starting From 1 in a New Company", () => {
    it("starts every transaction numbering from 1 in a new company", () => {
      // Clean workspace with 0 transactions
      expect(getNextTransactionReference("sales-invoicing", TEST_WS)).toBe("INV-2026-001");
      expect(getNextTransactionReference("quotes-sales-orders", TEST_WS)).toBe("QUO-2026-001");
      expect(getNextTransactionReference("bills", TEST_WS)).toBe("BIL-2026-001");
      expect(getNextTransactionReference("purchase-orders", TEST_WS)).toBe("PO-2026-001");
      expect(getNextTransactionReference("payments", TEST_WS)).toBe("PAY-2026-001");
      expect(getNextTransactionReference("receive-money", TEST_WS)).toBe("REC-2026-001");
      expect(getNextTransactionReference("general-journal", TEST_WS)).toBe("JV-2026-001");
    });

    it("increments transaction numbering sequentially as transactions are added", () => {
      expect(getNextTransactionReference("sales-invoicing", TEST_WS)).toBe("INV-2026-001");

      upsertTransaction(
        {
          id: "tx-test-1",
          typeId: "sales-invoicing",
          reference: "INV-2026-001",
          counterparty: "Dangote Foods",
          date: "2026-03-01",
          status: "Posted",
          amountNgn: 100000,
          vatAmountNgn: 7500,
          whtRatePct: 0,
          whtAmountNgn: 0,
          paymentMethod: "Bank Transfer",
          bankOrGlAccount: "1010 Zenith Bank",
          memo: "First invoice",
          lineItems: [],
        },
        TEST_WS,
      );

      expect(getNextTransactionReference("sales-invoicing", TEST_WS)).toBe("INV-2026-002");
    });

    it("starts admin record numbering from 1 in a new company and increments sequentially", () => {
      expect(getNextAdminRecordCode("customers", TEST_WS)).toBe("CUS-001");
      expect(getNextAdminRecordCode("vendors", TEST_WS)).toBe("VND-001");
      expect(getNextAdminRecordCode("inventory", TEST_WS)).toBe("SKU-001");
      expect(getNextAdminRecordCode("jobs", TEST_WS)).toBe("JOB-001");
      expect(getNextAdminRecordCode("employees", TEST_WS)).toBe("EMP-001");
      expect(getNextAdminRecordCode("assets", TEST_WS)).toBe("FA-001");

      upsertAdminRecord(
        {
          id: "cus-1",
          module: "customers",
          name: "Alpha Retailers",
          code: "CUS-001",
          category: "Retail",
          primaryMetricLabel: "Balance",
          primaryMetricValue: "₦0.00",
          contactOrNote: "Primary Contact",
          isActive: true,
        },
        TEST_WS,
      );

      expect(getNextAdminRecordCode("customers", TEST_WS)).toBe("CUS-002");
    });
  });

  describe("2. Live Reports & Related Accounts Display (Even at Zero Balance)", () => {
    it("Income Statement displays all revenue and expense accounts even at zero balance", () => {
      // Seed tailored chart of accounts with 0 balance
      const seededAccounts = seedTailoredAccountsForWorkspace(TEST_WS, "RETAIL_ECOMMERCE");
      saveAdminRecords(seededAccounts, TEST_WS);

      const incomeDef = getReportDefinition("income-statement");
      const { rows, summaryKpis } = incomeDef.generateRows(undefined, {});

      expect(rows.length).toBeGreaterThan(0);
      // Verify revenue accounts exist and have 0.00
      const revRows = rows.filter((r) => r.values.category === "Revenue");
      expect(revRows.length).toBeGreaterThan(0);
      expect(revRows[0]!.values.amountNgn).toBe(0);

      // Verify expense accounts exist and have 0.00
      const expRows = rows.filter((r) => r.values.category === "Operating Expense");
      expect(expRows.length).toBeGreaterThan(0);
      expect(expRows[0]!.values.amountNgn).toBe(0);

      // Summary KPIs at zero balance
      const revKpi = summaryKpis.find((k) => k.label === "Total Revenue");
      expect(revKpi?.value).toBe("₦0.00");
    });

    it("Balance Sheet displays all asset, liability, and equity accounts even at zero balance", () => {
      const seededAccounts = seedTailoredAccountsForWorkspace(TEST_WS, "RETAIL_ECOMMERCE");
      saveAdminRecords(seededAccounts, TEST_WS);

      const bsDef = getReportDefinition("balance-sheet");
      const { rows, summaryKpis } = bsDef.generateRows(undefined, {});

      expect(rows.length).toBeGreaterThan(0);
      const assetRows = rows.filter((r) => String(r.values.section).includes("Asset"));
      expect(assetRows.length).toBeGreaterThan(0);
      expect(assetRows[0]!.values.amountNgn).toBe(0);

      const liabRows = rows.filter((r) => String(r.values.section).includes("Liabilit"));
      expect(liabRows.length).toBeGreaterThan(0);

      const kpi = summaryKpis.find((k) => k.label === "Total Assets");
      expect(kpi?.value).toBe("₦0.00");
    });

    it("General Journal Audit Report connects to live transactions with zero mock bleed", () => {
      const gjDef = getReportDefinition("general-journal");

      // In a clean workspace with 0 transactions, report returns 0 vouchers with balanced status
      const zeroState = gjDef.generateRows(undefined, {});
      expect(zeroState.rows.length).toBe(0);
      expect(zeroState.summaryKpis.find((k) => k.label === "Total Journal Activity")?.value).toBe("₦0.00");
      expect(zeroState.summaryKpis.find((k) => k.label === "Equilibrium")?.value).toBe("Balanced 100%");
      expect(zeroState.summaryKpis.find((k) => k.label === "Vouchers Count")?.value).toBe("0 balanced vouchers");

      // Now post a live transaction
      upsertTransaction(
        {
          id: "tx-test-gj-1",
          typeId: "general-journal",
          reference: "JV-2026-001",
          counterparty: "Honey Home School",
          date: "2026-03-20",
          status: "Posted",
          amountNgn: 500000,
          vatAmountNgn: 0,
          whtRatePct: 0,
          whtAmountNgn: 0,
          paymentMethod: "Journal",
          bankOrGlAccount: "1010 Zenith Bank",
          memo: "School Tuition Receipt",
          lineItems: [
            {
              id: "l-1",
              description: "Debit Zenith Bank",
              accountCode: "1010 Zenith Bank",
              quantity: 1,
              unitPriceNgn: 500000,
              vatApplicable: false,
              debitNgn: 500000,
              creditNgn: 0,
            },
            {
              id: "l-2",
              description: "Credit Tuition Fees Revenue",
              accountCode: "4010 Tuition Revenue",
              quantity: 1,
              unitPriceNgn: 500000,
              vatApplicable: false,
              debitNgn: 0,
              creditNgn: 500000,
            },
          ],
        },
        TEST_WS,
      );

      const liveState = gjDef.generateRows(undefined, {});
      expect(liveState.rows.length).toBe(2);
      expect(liveState.rows[0]!.values.voucherRef).toBe("JV-2026-001");
      expect(liveState.rows[0]!.values.debit).toBe(500000);
      expect(liveState.rows[1]!.values.credit).toBe(500000);
      expect(liveState.summaryKpis.find((k) => k.label === "Total Journal Activity")?.value).toContain("500,000.00");
      expect(liveState.summaryKpis.find((k) => k.label === "Vouchers Count")?.value).toBe("1 balanced vouchers");
    });

    it("Aged Receivables and Aged Payables show all records even at zero balance", () => {
      upsertAdminRecord(
        {
          id: "cus-1",
          module: "customers",
          name: "Lekki Bistro Group",
          code: "CUS-001",
          category: "Hospitality",
          primaryMetricLabel: "Balance",
          primaryMetricValue: "₦0.00",
          contactOrNote: "lekki@bistro.ng",
          isActive: true,
        },
        TEST_WS,
      );

      const arDef = getReportDefinition("aged-receivables");
      const { rows } = arDef.generateRows(undefined, {});
      expect(rows.length).toBe(2); // the customer + the totals row
      expect(rows[0]!.values.customer).toBe("Lekki Bistro Group");
      expect(rows[0]!.values.totalDue).toBe(0);
      expect(rows[1]!.isTotal).toBe(true);
    });
  });

  describe("3. Searchable Pickers in Transactions and Admin", () => {
    it("renders counterparty search picker in TransactionRecordEditorWorkspace", () => {
      upsertAdminRecord(
        {
          id: "cus-1",
          module: "customers",
          name: "Eko Atlantic Suites Ltd",
          code: "CUS-001",
          category: "Hospitality",
          primaryMetricLabel: "Balance",
          primaryMetricValue: "₦0.00",
          contactOrNote: "finance@ekoatlantic.ng",
          isActive: true,
        },
        TEST_WS,
      );

      render(
        <TransactionRecordEditorWorkspace
          mode="create"
          typeId="sales-invoicing"
        />,
      );

      // The invoice number should be sequential starting at 1
      const refInput = screen.getByLabelText(/Invoice Number/i) as HTMLInputElement;
      expect(refInput.value).toBe("INV-2026-001");

      // The customer picker should allow searching and picking Eko Atlantic Suites Ltd
      const counterpartyInput = screen.getByPlaceholderText(/e\.g\. Eko Atlantic Suites Ltd/i);
      expect(counterpartyInput).toBeInTheDocument();

      // Quick pick chip button or combobox option for Eko Atlantic Suites Ltd should be present
      const customerChip = screen.getByRole("button", { name: /\+ Eko Atlantic Suites Ltd/i });
      fireEvent.click(customerChip);
      expect((counterpartyInput as HTMLInputElement).value).toBe("Eko Atlantic Suites Ltd");
    });
  });

  describe("4. Dark Mode Tab Contrast and Inventory Stock KPI Calculations", () => {
    it("renders AdminMaintainWorkspace tablist with high-contrast dark mode classes", () => {
      render(
        <WorkspaceModeProvider>
          <AdminMaintainWorkspace workspaceName="Lagos Trading & Hospitality Ltd" workspaceRc="RC 1482910" />
        </WorkspaceModeProvider>,
      );
      const tablist = screen.getByRole("tablist", { name: /Admin Pillars/i });
      expect(tablist).toBeInTheDocument();
      // Verifies container has dark mode classes to avoid washed out gray box in dark mode
      expect(tablist.className).toContain("dark:!bg-[#18181A]");
      expect(tablist.className).toContain("dark:border-[#2C2C2E]");

      const stockTab = screen.getByRole("tab", { name: /Stock, Jobs & Assets/i });
      expect(stockTab).toBeInTheDocument();
    });

    it("calculates Inventory Stock KPIs: onHand - committedOnSalesOrder = availableToPromise", () => {
      // Test 1: Existing item with 42 physical on hand, 6 committed on sales orders, 15 min stock
      const { unmount } = render(
        <AdminEditorTabWidget
          widget="inventory-stock-kpi"
          balanceAmount="0.00"
          balanceSide="DR"
          onUpdateDetail={() => undefined}
          details={{ qtyOnHand: "42", qtyOnSo: "6", minStock: "15" }}
        />,
      );

      expect(screen.getByText(/42 units/i)).toBeInTheDocument(); // Physical on hand
      expect(screen.getByText(/36 units/i)).toBeInTheDocument(); // 42 - 6 = 36 available to promise
      expect(screen.getByText(/Healthy Buffer \(Min 15\)/i)).toBeInTheDocument();
      unmount();

      // Test 2: New item in clean company (0 stock on hand, 0 committed, 0 min stock)
      render(
        <AdminEditorTabWidget
          widget="inventory-stock-kpi"
          balanceAmount="0.00"
          balanceSide="DR"
          onUpdateDetail={() => undefined}
          details={{ qtyOnHand: "0", qtyOnSo: "0", minStock: "0" }}
        />,
      );

      const zeroUnits = screen.getAllByText(/0 units/i);
      expect(zeroUnits.length).toBeGreaterThanOrEqual(2); // 0 on hand and 0 available
      expect(screen.getByText(/Zero Initial Stock/i)).toBeInTheDocument();
    });
  });
});
