import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import { NextRequest } from "next/server";
import { GET as getFrcnReport } from "@/app/api/ledger/reports/frcn/route";
import { POST as postBankReconcile } from "@/app/api/ledger/reconcile/bank/route";
import { POST as postFxReval } from "@/app/api/ledger/reconcile/fx-revaluation/route";
import { BankReconciliationWorkspace } from "@/components/BankReconciliationWorkspace";
import { FrcnReportsDashboard } from "@/components/FrcnReportsDashboard";
import { TopNavCapsule } from "@/components/TopNavCapsule";
import { WorkspaceModeProvider } from "@/state/workspace-mode";
import type { ChartOfAccount, FiscalPeriod, FrcnFinancialStatementPackage } from "@/types/ledger";

const DEMO_PERIOD: FiscalPeriod = {
  id: "22222222-2222-4222-8222-222222220002",
  label: "FY2026",
  startDate: "2026-01-01",
  endDate: "2026-12-31",
  status: "OPEN",
  camaCertification: null,
};

const DEMO_ACCOUNTS: ChartOfAccount[] = [
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
];

describe("Slice 2 BFF routes and FRCN Reports + Reconcile A11Y", () => {
  it("computes FRCN statement package, bank reconciliation, and FX revaluation via BFF", async () => {
    const repReq = new NextRequest(
      `http://localhost:3000/api/ledger/reports/frcn?fiscalPeriodId=${DEMO_PERIOD.id}`,
    );
    const repRes = await getFrcnReport(repReq);
    expect(repRes.status).toBe(200);
    const pkg = (await repRes.json()) as FrcnFinancialStatementPackage;
    expect(pkg.isBalanced).toBe(true);
    expect(pkg.trialBalance.length).toBeGreaterThanOrEqual(2);
    expect(pkg.valueAddedStatement.some((r) => r.lineLabel === "Value Added")).toBe(true);
    expect(pkg.fiveYearSummary.some((c) => c.fiscalYearLabel === "FY2026")).toBe(true);
    expect(pkg.snapshotHash).toHaveLength(64);

    // Rejects float on bank reconcile
    const badBankReq = new NextRequest("http://localhost:3000/api/ledger/reconcile/bank", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        accountId: DEMO_ACCOUNTS[0]!.id,
        statementLines: [
          {
            lineId: "L1",
            valueDate: "2026-01-05",
            amountNgn: 2500000.0,
            direction: "CREDIT",
            channel: "NIP_INFLOW",
            reference: "CAP-OPEN-2026",
            feeNgn: "0.00",
          },
        ],
      }),
    });
    const badBankRes = await postBankReconcile(badBankReq);
    expect(badBankRes.status).toBe(400);

    // Valid bank reconcile matches opening 2,500,000.00 deposit
    const okBankReq = new NextRequest("http://localhost:3000/api/ledger/reconcile/bank", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        accountId: DEMO_ACCOUNTS[0]!.id,
        throughDate: "2026-12-31",
        statementLines: [
          {
            lineId: "L1",
            valueDate: "2026-01-05",
            amountNgn: "2500000.00",
            direction: "CREDIT",
            channel: "NIP_INFLOW",
            reference: "CAP-OPEN-2026",
            feeNgn: "0.00",
          },
        ],
      }),
    });
    const okBankRes = await postBankReconcile(okBankReq);
    expect(okBankRes.status).toBe(200);
    const okBankBody = (await okBankRes.json()) as { matchedCount: number };
    expect(okBankBody.matchedCount).toBe(1);

    // Valid FX revaluation on USD account
    const fxReq = new NextRequest("http://localhost:3000/api/ledger/reconcile/fx-revaluation", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        accountId: DEMO_ACCOUNTS[1]!.id,
        currency: "USD",
        closingRateToNgn: "1620.000000",
        asOfDate: "2026-03-31",
      }),
    });
    const fxRes = await postFxReval(fxReq);
    expect(fxRes.status).toBe(200);
  });

  it("renders FrcnReportsDashboard and BankReconciliationWorkspace cleanly with zero axe violations", async () => {
    const user = userEvent.setup();
    const repRes = await getFrcnReport(
      new NextRequest(
        `http://localhost:3000/api/ledger/reports/frcn?fiscalPeriodId=${DEMO_PERIOD.id}`,
      ),
    );
    const pkg = (await repRes.json()) as FrcnFinancialStatementPackage;

    const { container } = render(
      <WorkspaceModeProvider>
        <a href="#main-content" className="nb-skip-link">
          Skip to main content
        </a>
        <TopNavCapsule activeTab="reports" />
        <main id="main-content">
          <FrcnReportsDashboard periods={[DEMO_PERIOD]} initialPackage={pkg} />
          <BankReconciliationWorkspace accounts={DEMO_ACCOUNTS} headingLevel="h2" />
        </main>
      </WorkspaceModeProvider>,
    );

    expect(container.querySelectorAll("aside")).toHaveLength(0);
    expect(container.querySelectorAll("h1")).toHaveLength(1);
    expect(screen.getByTestId("frcn-balance-status")).toHaveAttribute("aria-live", "polite");
    expect(screen.getByTestId("frcn-balance-status")).toHaveTextContent("Balanced");

    // Toggle Simple | Pro exposes Pro snapshot hash & CSV export metadata cleanly
    await user.click(screen.getByRole("button", { name: "Pro" }));
    expect(screen.getAllByText(/SHA-256/).length).toBeGreaterThanOrEqual(1);

    const axeResults = await axe.run(container);
    expect(axeResults.violations).toEqual([]);
  });

  it("supports All Reports catalog default landing, 1-click FRCN compliant annual report generator, Excel export, and customizable report views with zero axe violations", async () => {
    const user = userEvent.setup();
    const repRes = await getFrcnReport(
      new NextRequest(
        `http://localhost:3000/api/ledger/reports/frcn?fiscalPeriodId=${DEMO_PERIOD.id}`,
      ),
    );
    const pkg = (await repRes.json()) as FrcnFinancialStatementPackage;

    const { container } = render(
      <WorkspaceModeProvider>
        <main id="main-content">
          <FrcnReportsDashboard periods={[DEMO_PERIOD]} initialPackage={pkg} />
        </main>
      </WorkspaceModeProvider>,
    );

    // 1. Initial Landing: ALL REPORTS CATALOG is displayed by default
    expect(
      screen.getByRole("heading", { level: 1, name: /Financial & Operational Reports/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/FRCN & IFRS Compliant Suite/i)).toBeInTheDocument();
    expect(screen.getByText(/Featured Statutory & Executive Statements/i)).toBeInTheDocument();
    expect(screen.queryByText(/Sage 50/i)).not.toBeInTheDocument();

    // Equilibrium status banner visible on catalog
    const balanceBanner = screen.getByTestId("frcn-balance-status");
    expect(balanceBanner).toHaveTextContent("Balanced");

    // 2. 1-Click FRCN Compliant Annual Report Generator Modal
    const genFrcnBtn = screen.getByRole("button", {
      name: /Generate FRCN Compliant Annual Report/i,
    });
    expect(genFrcnBtn).toBeInTheDocument();
    await user.click(genFrcnBtn);

    // Modal opens with official sections modeled after FRCN signed financial statements
    expect(
      screen.getByRole("heading", {
        name: /FRCN & CAMA 2020 Compliant Financial Report/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getAllByText(/Cover & Corporate Info/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/CAMA 2020 Sec 405 Certification/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Independent Auditor's Report/i).length).toBeGreaterThanOrEqual(1);

    // Verify 1-click Excel export is present in modal
    expect(screen.getAllByRole("button", { name: /Export Excel \(\.xlsx\)/i }).length).toBeGreaterThanOrEqual(1);

    // Close modal
    const closeModalBtn = screen.getByRole("button", { name: /Close dialog/i });
    await user.click(closeModalBtn);

    // 3. Drill down into General Ledger Trial Balance report from catalog
    const trialBalanceBtns = screen.getAllByRole("button", {
      name: /General Ledger Trial Balance/i,
    });
    await user.click(trialBalanceBtns[0]!);

    // Now viewing Trial Balance in ReportViewer
    expect(
      screen.getByRole("heading", { level: 1, name: /General Ledger Trial Balance/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Standard: IFRS \/ CAMA Sec 405/i)).toBeInTheDocument();
    expect(screen.queryByText(/Inspiration:/i)).not.toBeInTheDocument();

    // 4. Add / Remove Columns: Open drawer & toggle Account Code column off then on
    const colBtn = screen.getByRole("button", { name: /Columns/i });
    await user.click(colBtn);
    expect(screen.getByText(/Customize Visible Columns/i)).toBeInTheDocument();
    const acctCodeCheck = screen.getByRole("checkbox", { name: "Account Code" });
    expect(acctCodeCheck).toHaveAttribute("aria-checked", "true");
    await user.click(acctCodeCheck);
    expect(acctCodeCheck).toHaveAttribute("aria-checked", "false");
    await user.click(acctCodeCheck);
    expect(acctCodeCheck).toHaveAttribute("aria-checked", "true");

    // 5. Filters: Open drawer, search text, and toggle Hide Zero Balances
    const filterBtn = screen.getByRole("button", { name: /^Filters/i });
    await user.click(filterBtn);
    expect(screen.getByText(/Report Filters/i)).toBeInTheDocument();
    const searchInput = screen.getByPlaceholderText(/Search any field\.\.\./i);
    await user.type(searchInput, "Zenith");
    expect(screen.getByText(/Zenith Bank/i)).toBeInTheDocument();
    await user.click(screen.getByRole("switch", { name: /Hide Zero Balances/i }));

    // 6. View Options: Open drawer and switch to Compact Ledger + Short Naira
    const viewBtn = screen.getByRole("button", { name: /Display & Scale/i });
    await user.click(viewBtn);
    expect(screen.getByText(/Viewing & Formatting Options/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Compact Ledger" }));
    await user.click(screen.getByRole("button", { name: "Short (₦k / ₦M)" }));

    // 7. Advanced Options: Open report-specific advanced drawer
    const advBtn = screen.getByRole("button", { name: /Advanced Options/i });
    await user.click(advBtn);
    expect(
      screen.getByText(/Advanced Controls for General Ledger Trial Balance/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/Display CAMA 2020 Sec 405 Hash/i)).toBeInTheDocument();

    // 8. Export Options: Verify Excel (.xlsx), CSV, JSON, Copy, and Print buttons are accessible
    expect(screen.getByRole("button", { name: /Export Excel \(\.xlsx\)/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Export CSV/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "JSON" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Copy" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Print Report" })).toBeInTheDocument();

    // 9. Back to All Reports Catalog
    await user.click(screen.getByRole("button", { name: /Back to All Reports/i }));
    expect(
      screen.getByRole("heading", { level: 1, name: /Financial & Operational Reports/i }),
    ).toBeInTheDocument();

    // Category tabs present
    expect(screen.getByRole("tab", { name: /Receivables/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Payables/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Inventory/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Payroll/i })).toBeInTheDocument();

    // Filter by Receivables category tab
    await user.click(screen.getByRole("tab", { name: /Receivables/i }));
    expect(screen.getByText(/Aged Receivables Schedule/i)).toBeInTheDocument();

    // Open Aged Receivables Schedule
    const viewArButtons = screen.getAllByRole("button", {
      name: /View & Customize Report/i,
    });
    await user.click(viewArButtons[0]!);
    expect(
      screen.getByRole("heading", { level: 1, name: /Aged Receivables Schedule/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Current \(₦\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Total Outstanding \(₦\)/i)).toBeInTheDocument();

    // Verify Aged Receivables has its own advanced options
    const arAdvBtn = screen.getByRole("button", { name: /Advanced Options/i });
    await user.click(arAdvBtn);
    expect(screen.getByText(/Aging Bracket Intervals/i)).toBeInTheDocument();

    const results = await axe.run(container);
    expect(results.violations).toEqual([]);
  }, 35000);

  it("supports PDF bank statement upload, 1-click Access Bank parsing, side-by-side feed matching, quick-post to books, and zero axe violations", async () => {
    const user = userEvent.setup();

    const { container } = render(
      <WorkspaceModeProvider>
        <a href="#main-content" className="nb-skip-link">
          Skip to main content
        </a>
        <TopNavCapsule activeTab="reconcile" />
        <main id="main-content">
          <BankReconciliationWorkspace accounts={DEMO_ACCOUNTS} headingLevel="h1" />
        </main>
      </WorkspaceModeProvider>,
    );

    // 1. Single H1 and Zero Aside
    expect(container.querySelectorAll("aside")).toHaveLength(0);
    expect(container.querySelectorAll("h1")).toHaveLength(1);
    expect(
      screen.getByRole("heading", { level: 1, name: /Account Reconciliation/i }),
    ).toBeInTheDocument();

    // 2. Bank statement parsed summary (verified commercial bank statement)
    expect(screen.getAllByText(/Commercial Bank/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/0123456789/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/NairaBooks Operating Account/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/₦4\.41/i).length).toBeGreaterThanOrEqual(1);

    // 3. Side-by-side matching feeds
    expect(screen.getByRole("heading", { level: 3, name: /Bank Statement Feed/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3, name: /Company Ledger Books/i })).toBeInTheDocument();

    // 4. Test filtering by status
    const unmatchedBtn = screen.getByRole("button", { name: /^Unmatched/i });
    await user.click(unmatchedBtn);
    expect(screen.getAllByText(/Unmatched/i).length).toBeGreaterThanOrEqual(1);

    const allBtn = screen.getByRole("button", { name: /^All \(/i });
    await user.click(allBtn);

    // 5. Test 1-click Auto-Match
    const autoMatchBtn = screen.getByRole("button", { name: /Auto-Match Feed/i });
    await user.click(autoMatchBtn);
    expect(screen.getAllByRole("status").length).toBeGreaterThanOrEqual(1);

    // 6. Test Quick Post Modal for unmatched bank charges (SMS alert fee / WHT)
    const quickPostButtons = screen.getAllByRole("button", { name: /\+ Quick Post/i });
    expect(quickPostButtons.length).toBeGreaterThanOrEqual(1);
    await user.click(quickPostButtons[0]!);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /Quick Post Bank Item to Books/i }),
    ).toBeInTheDocument();

    const postSubmitBtn = screen.getByRole("button", { name: /Post Voucher & Reconcile/i });
    await user.click(postSubmitBtn);
    expect(screen.queryByRole("dialog")).toBeNull();

    // 7. Test Foreign FX Revaluation Tab
    const fxTab = screen.getByRole("tab", { name: /Foreign FX Revaluation/i });
    await user.click(fxTab);
    expect(
      screen.getByRole("heading", { name: /Closing CBN \/ NFEM FX Revaluation/i }),
    ).toBeInTheDocument();

    // Switch back to Reconcile
    const reconcileTab = screen.getByRole("tab", { name: /Bank Statement Matching/i });
    await user.click(reconcileTab);

    // 8. WCAG 2.2 AA Accessibility Scan
    const axeResults = await axe.run(container);
    expect(axeResults.violations).toEqual([]);
  }, 35000);

  it("enforces strict sequential workflow gating: locks Step 4 while items are pending, unlocks on 1-click batch resolve, and certifies CAMA 2020 sign-off with zero axe violations", async () => {
    const user = userEvent.setup();

    const { container } = render(
      <WorkspaceModeProvider>
        <TopNavCapsule activeTab="reconcile" />
        <main id="main-content">
          <BankReconciliationWorkspace accounts={DEMO_ACCOUNTS} headingLevel="h1" />
        </main>
      </WorkspaceModeProvider>,
    );

    // 1. Initial State: Step 4 must be strictly locked and disabled
    const step4StepperBtn = screen.getByRole("button", { name: /4\. Audit & Sign-Off/i });
    expect(step4StepperBtn).toBeDisabled();
    expect(screen.getAllByText(/🔒 Step 4 · Locked/i).length).toBeGreaterThanOrEqual(1);

    // Clicking Step 4 does not open Step 4 (still in Step 2)
    await user.click(step4StepperBtn);
    expect(screen.queryByText(/CAMA 2020 Section 405 Statutory Reconciliation Certificate/i)).toBeNull();

    // 2. Navigate to Step 3: Resolve Unmatched
    const step3StepperBtn = screen.getByRole("button", { name: /3\. Resolve Unmatched/i });
    expect(step3StepperBtn).toBeEnabled();
    await user.click(step3StepperBtn);

    // Verify Step 3 workspace rendered
    expect(
      screen.getByRole("heading", { name: /Step 3 of 4: Resolve Unmatched Bank Lines/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/32 statement items need ledger vouchers/i)).toBeInTheDocument();

    // In Step 3, bottom Proceed to Step 4 button is strictly locked
    const proceedToStep4Btn = screen.getByRole("button", {
      name: /Step 4 Locked \(32 Pending\)/i,
    });
    expect(proceedToStep4Btn).toBeDisabled();

    // 3. Click ⚡ 1-Click Resolve All Remaining Bank Charges
    const batchResolveBtn = screen.getByRole("button", {
      name: /⚡ 1-Click Resolve All Remaining Bank Charges \(32\)/i,
    });
    await user.click(batchResolveBtn);

    // Status notification verified
    expect(screen.getByRole("status")).toHaveTextContent(
      /posted and matched 32 pending bank charges/i,
    );

    // Step 4 is now unlocked in Stepper!
    expect(step4StepperBtn).toBeEnabled();
    expect(screen.getAllByText(/Step 4 · Balanced/i).length).toBeGreaterThanOrEqual(1);

    // Proceed to Step 4 button in Step 3 is now enabled
    const unlockedStep4Btns = screen.getAllByRole("button", {
      name: /Proceed to Step 4: Audit & Sign-Off/i,
    });
    expect(unlockedStep4Btns[0]).toBeEnabled();
    await user.click(unlockedStep4Btns[0]!);

    // 4. In Step 4: CAMA 2020 Section 405 Certificate rendered
    expect(
      screen.getByRole("heading", {
        name: /CAMA 2020 Section 405 Statutory Reconciliation Certificate/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(/zero reconciliation discrepancy between/i)).toBeInTheDocument();
    expect(screen.getByText(/100% Balanced & Certified/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Export Reconciliation \(\.xlsx\)/i }),
    ).toBeInTheDocument();

    // 5. Open Reconciled Audit Register drawer
    const registerDrawerBtn = screen.getByRole("button", {
      name: /Inspect Complete Reconciled Audit Register \(46 lines\)/i,
    });
    await user.click(registerDrawerBtn);
    expect(screen.getByText(/Hide Complete Reconciled Audit Register/i)).toBeInTheDocument();

    // 6. WCAG 2.2 AA Accessibility Scan on Step 4
    const axeResults = await axe.run(container);
    expect(axeResults.violations).toEqual([]);
  }, 35000);
});
