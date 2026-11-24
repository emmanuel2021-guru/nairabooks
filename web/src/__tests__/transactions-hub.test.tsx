import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import axe from "axe-core";
import { TopNavCapsule } from "@/components/TopNavCapsule";
import { TransactionsHubWorkspace } from "@/components/TransactionsHubWorkspace";
import { TransactionRecordEditorWorkspace } from "@/components/transactions/TransactionRecordEditorWorkspace";
import { TRANSACTION_TYPES } from "@/components/transactions/transactions-data";
import { resetTransactionsStore } from "@/components/transactions/transactions-store";
import { WorkspaceModeProvider } from "@/state/workspace-mode";

// The editor waits for the ledger to accept a record before confirming it was saved.
beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      new Response(JSON.stringify({ ok: true, posted: true, voucherId: "v-1", voucherNumber: "JV-2026-0001" }), {
        status: 201,
      }),
    ),
  );
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Transactions Hub & Dedicated Create/Edit Pages (Phase 5 Enterprise)", () => {
  it("renders TransactionsHubWorkspace with 6 pillars, all 27 enterprise transaction types, outline list, and zero axe violations", async () => {
    resetTransactionsStore();

    const { container } = render(
      <WorkspaceModeProvider>
        <TopNavCapsule activeTab="transactions" />
        <main id="main-content">
          <TransactionsHubWorkspace />
        </main>
      </WorkspaceModeProvider>,
    );

    expect(container.querySelectorAll("aside")).toHaveLength(0);
    expect(container.querySelectorAll("h1")).toHaveLength(1);
    expect(screen.getByRole("heading", { name: /^Transactions$/i })).toBeTruthy();

    // TopNavCapsule has Transactions link with whitespace-nowrap
    const txNavLink = screen.getByRole("link", { name: /^Transactions$/i });
    expect(txNavLink.getAttribute("href")).toBe("/transactions");
    expect(txNavLink.className).toContain("whitespace-nowrap");

    // 6 Pillar Tabs exist
    for (const label of [
      "Money In",
      "Money Out",
      "Banking & Register",
      "Time & Payroll",
      "Ledger & Stock",
      "Follow-Ups & System",
    ]) {
      expect(screen.getByRole("tab", { name: label })).toBeTruthy();
    }

    // Create New view displays all 27 enterprise transaction types
    fireEvent.click(screen.getByTestId("hero-choice-create"));
    expect(screen.getByText(/Record a New Transaction/i)).toBeTruthy();
    for (const txType of TRANSACTION_TYPES) {
      const links = container.querySelectorAll(`a[href="/transactions/${txType.id}/new"]`);
      expect(links.length).toBeGreaterThanOrEqual(1);
    }

    // Return to Transaction List view
    fireEvent.click(screen.getByTestId("hero-choice-list"));
    expect(container.querySelector('[data-testid="transactions-outline-list"]')).toBeTruthy();
    const editInvLink = screen.getByRole("link", {
      name: /Edit INV-2026-104 Eko Atlantic Suites Ltd/i,
    });
    expect(editInvLink.getAttribute("href")).toBe("/transactions/sales-invoicing/tx-inv-104");

    // Switch to Money Out pillar and check Vendor Bills
    fireEvent.click(screen.getByRole("tab", { name: "Money Out" }));
    expect(screen.getByText(/BIL-2026-210/i)).toBeTruthy();

    const results = await axe.run(container);
    expect(results.violations).toHaveLength(0);
  }, 30000);

  it("supports Simple vs Full Creation toggle on create, persists new Sales Invoice with 7.5% VAT, and locks Edit mode to Full mode with zero axe violations", async () => {
    resetTransactionsStore();

    // 1. Creation Mode for Sales Invoice
    const { container, unmount } = render(
      <TransactionRecordEditorWorkspace mode="create" typeId="sales-invoicing" />,
    );

    expect(screen.getByTestId("tx-creation-mode-toggle")).toBeTruthy();
    expect(screen.getByTestId("tx-simple-pane")).toBeTruthy();
    expect(screen.queryByRole("tablist")).toBeNull();

    // Fill customer, description, qty, unit price -> auto-calculates 7.5% VAT
    fireEvent.change(screen.getByLabelText(/^Customer$/i), {
      target: { value: "Victoria Island Suites Ltd" },
    });
    fireEvent.change(screen.getByLabelText("Line 1 Description"), {
      target: { value: "Hospitality Solar Backup Pack" },
    });
    fireEvent.change(screen.getByLabelText("Line 1 Unit Price (NGN)"), {
      target: { value: "100000" },
    });

    // 100,000 + 7.5% VAT = 107,500.00
    expect(screen.getByText(/₦107,500\.00/i)).toBeTruthy();

    // Switch to Full Creation -> reveals enterprise Full tabs + GL impact preview
    fireEvent.click(screen.getByRole("button", { name: /^Full Creation$/i }));
    expect(screen.getByTestId("tx-full-pane")).toBeTruthy();
    fireEvent.click(screen.getByRole("tab", { name: /Tax & Accounting/i }));
    expect(screen.getByText(/Automatic Double-Entry Impact Preview/i)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /Post Sales Invoice/i }));
    expect(await screen.findByText(/Created .* for Victoria Island Suites Ltd/i)).toBeTruthy();

    const createAxe = await axe.run(container);
    expect(createAxe.violations).toHaveLength(0);
    unmount();

    // Verify persisted in TransactionsHubWorkspace
    const hubRender = render(
      <WorkspaceModeProvider>
        <TransactionsHubWorkspace />
      </WorkspaceModeProvider>,
    );
    expect(screen.getByRole("heading", { name: "Victoria Island Suites Ltd" })).toBeTruthy();
    hubRender.unmount();

    // 2. Edit Mode: ALWAYS locked to Full Mode
    const editRender = render(
      <TransactionRecordEditorWorkspace
        mode="edit"
        typeId="sales-invoicing"
        recordId="tx-inv-104"
      />,
    );
    expect(screen.queryByTestId("tx-creation-mode-toggle")).toBeNull();
    expect(screen.getByTestId("tx-edit-full-badge")).toBeTruthy();
    expect(screen.getByTestId("tx-full-pane")).toBeTruthy();
    expect((screen.getByLabelText(/^Customer$/i) as HTMLInputElement).value).toBe(
      "Eko Atlantic Suites Ltd",
    );

    const editAxe = await axe.run(editRender.container);
    expect(editAxe.violations).toHaveLength(0);
    editRender.unmount();

    // 3. Specialized layouts spot-check (Payroll Slip, General Journal, Inventory Adjustment)
    const payrollRender = render(
      <TransactionRecordEditorWorkspace
        mode="edit"
        typeId="payroll-entry"
        recordId="tx-payslip-104"
      />,
    );
    expect(screen.getByText(/Employee PenCom \(8%\)/i)).toBeTruthy();
    expect(screen.getByText(/Net Take-Home/i)).toBeTruthy();
    payrollRender.unmount();

    const journalRender = render(
      <TransactionRecordEditorWorkspace
        mode="edit"
        typeId="general-journal"
        recordId="tx-jv-081"
      />,
    );
    expect(screen.getByText(/Balanced \(₦312,500\.00\)/i)).toBeTruthy();
    journalRender.unmount();

    const adjRender = render(
      <TransactionRecordEditorWorkspace
        mode="edit"
        typeId="inventory-adjustments"
        recordId="tx-adj-015"
      />,
    );
    expect(screen.getByText(/Stock Variance: -6 units/i)).toBeTruthy();
    adjRender.unmount();
  }, 35000);

  it("lets users manually enter direct items on Customer Receipts and Vendor Payments without creating invoices first", async () => {
    resetTransactionsStore();

    // 1. Direct manual items on Receive Money (no invoice created first)
    const rcpt = render(
      <TransactionRecordEditorWorkspace mode="create" typeId="receive-money" />,
    );
    expect(screen.getByText(/Direct Items Received \(No Invoice Needed\)/i)).toBeTruthy();
    expect(screen.getByText(/No open customer invoices linked/i)).toBeTruthy();

    fireEvent.change(screen.getByLabelText(/Customer Paying/i), {
      target: { value: "Lekki Walk-In Buyer" },
    });
    fireEvent.change(screen.getByLabelText("Manual Item 1 Description"), {
      target: { value: "Walk-in Inverter Battery" },
    });
    fireEvent.change(screen.getByLabelText("Manual Item 1 Quantity"), {
      target: { value: "2" },
    });
    fireEvent.change(screen.getByLabelText("Manual Item 1 Unit Price (NGN)"), {
      target: { value: "45000" },
    });

    // 2 x 45,000 = ₦90,000.00
    expect(screen.getAllByText(/₦90,000\.00/i).length).toBeGreaterThanOrEqual(1);

    // Add a second manual item and save without linking any invoice
    fireEvent.click(screen.getByRole("button", { name: /Add Manual Item/i }));
    fireEvent.change(screen.getByLabelText("Manual Item 2 Description"), {
      target: { value: "Installation Cable Kit" },
    });
    fireEvent.change(screen.getByLabelText("Manual Item 2 Unit Price (NGN)"), {
      target: { value: "10000" },
    });

    // Enable optional 7.5% VAT -> 100,000 -> wait VAT checkbox on new lines matches vatEnabled
    fireEvent.click(screen.getByRole("button", { name: /Post Customer Receipt/i }));
    expect(await screen.findByText(/Created .* for Lekki Walk-In Buyer/i)).toBeTruthy();

    const rcptAxe = await axe.run(rcpt.container);
    expect(rcptAxe.violations).toHaveLength(0);
    rcpt.unmount();

    // 2. Direct manual items on Vendor Payments (no bill/invoice created first)
    const pay = render(
      <TransactionRecordEditorWorkspace mode="create" typeId="payments" />,
    );
    expect(screen.getByText(/Direct Items Paid \(No Bill \/ Invoice Needed\)/i)).toBeTruthy();

    fireEvent.change(screen.getByLabelText(/Vendor Paid/i), {
      target: { value: "Yaba Logistics Riders" },
    });
    fireEvent.change(screen.getByLabelText("Manual Item 1 Description"), {
      target: { value: "Same-day dispatch run (x3)" },
    });
    fireEvent.change(screen.getByLabelText("Manual Item 1 Quantity"), {
      target: { value: "3" },
    });
    fireEvent.change(screen.getByLabelText("Manual Item 1 Unit Price (NGN)"), {
      target: { value: "5000" },
    });

    // Enable 7.5% Nigeria VAT in Simple Creation and tick Manual Item 1 VAT checkbox
    fireEvent.click(screen.getByRole("switch", { name: /Apply 7\.5% Nigeria VAT/i }));
    fireEvent.click(screen.getByLabelText("Manual Item 1 Apply 7.5% VAT"));
    // 15,000 + 7.5% (1,125) = ₦16,125.00
    expect(screen.getByText(/₦16,125\.00/i)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /Post Vendor Payment/i }));
    expect(await screen.findByText(/Created .* for Yaba Logistics Riders/i)).toBeTruthy();

    const payAxe = await axe.run(pay.container);
    expect(payAxe.violations).toHaveLength(0);
    pay.unmount();

    // Verify both records appear in TransactionsHubWorkspace
    const hub = render(
      <WorkspaceModeProvider>
        <TransactionsHubWorkspace />
      </WorkspaceModeProvider>,
    );
    expect(screen.getByRole("heading", { name: "Lekki Walk-In Buyer" })).toBeTruthy();
    fireEvent.click(screen.getByRole("tab", { name: "Money Out" }));
    expect(screen.getByRole("heading", { name: "Yaba Logistics Riders" })).toBeTruthy();
    hub.unmount();
  }, 35000);

  it("renders the 3 hero action gateway choices and seamlessly switches between Create, List, and Edit modes with zero axe violations", async () => {
    resetTransactionsStore();

    const { container } = render(
      <WorkspaceModeProvider>
        <TopNavCapsule activeTab="transactions" />
        <main id="main-content">
          <TransactionsHubWorkspace />
        </main>
      </WorkspaceModeProvider>,
    );

    // 1. Verify all 3 Action Buttons exist
    const createChoiceBtn = screen.getByTestId("hero-choice-create");
    const listChoiceBtn = screen.getByTestId("hero-choice-list");
    const editChoiceBtn = screen.getByTestId("hero-choice-edit");

    expect(createChoiceBtn).toBeTruthy();
    expect(listChoiceBtn).toBeTruthy();
    expect(editChoiceBtn).toBeTruthy();

    expect(screen.getByRole("button", { name: /Create New/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Transaction List/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Edit a Transaction/i })).toBeTruthy();

    // 2. Click Create New Transaction -> Switches to Creation Studio
    fireEvent.click(createChoiceBtn);
    expect(createChoiceBtn.getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("heading", { name: /Record a New Transaction/i })).toBeTruthy();
    expect(screen.getByPlaceholderText(/Search among 27 types/i)).toBeTruthy();

    // 3. Click Edit a Transaction -> Switches to Edit & Audit Studio
    fireEvent.click(editChoiceBtn);
    expect(editChoiceBtn.getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("heading", { name: /Edit & Manage Transactions/i })).toBeTruthy();
    expect(screen.getAllByText(/CAMA 2020 Section 374/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Edit Full Sheet/i).length).toBeGreaterThanOrEqual(1);

    // 4. Click Transaction List -> Switches back to Transaction Register
    fireEvent.click(listChoiceBtn);
    expect(listChoiceBtn.getAttribute("aria-pressed")).toBe("true");
    expect(container.querySelector('[data-testid="transactions-outline-list"]')).toBeTruthy();

    // 5. Verify WCAG Accessibility across the revamped workspace
    const results = await axe.run(container);
    expect(results.violations).toHaveLength(0);
  }, 35000);
});
