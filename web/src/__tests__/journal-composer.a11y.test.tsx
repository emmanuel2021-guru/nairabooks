import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import { TopNavCapsule } from "@/components/TopNavCapsule";
import { JournalVoucherComposer } from "@/components/JournalVoucherComposer";
import { WorkspaceModeProvider } from "@/state/workspace-mode";
import type { ChartOfAccount, FiscalPeriod, JournalVoucherEdge } from "@/types/ledger";

const SAMPLE_ACCOUNTS: ChartOfAccount[] = [
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
    id: "11111111-1111-4111-8111-111111110401",
    code: "4010",
    name: "Lagos Retail & Supply Revenue",
    category: "REVENUE",
    ifrsTag: "REVENUE_FROM_CONTRACTS",
    sourcePrimitive: "INVOICES_AND_RECEIVABLES",
    isSystemLocked: false,
    isActive: true,
  },
];

const SAMPLE_PERIODS: FiscalPeriod[] = [
  {
    id: "22222222-2222-4222-8222-222222220002",
    label: "FY2026",
    startDate: "2026-01-01",
    endDate: "2026-12-31",
    status: "OPEN",
    camaCertification: null,
  },
];

const EMPTY_EDGES: JournalVoucherEdge[] = [];

describe("Zero-Sidebar TopNavCapsule and JournalVoucherComposer A11Y-01..05", () => {
  it("renders zero sidebars, single H1, 5-tab whitespace-nowrap capsule, and aria-live balance updates", async () => {
    const user = userEvent.setup();

    const { container } = render(
      <WorkspaceModeProvider>
        <a href="#main-content" className="nb-skip-link">
          Skip to main content
        </a>
        <TopNavCapsule activeTab="books" />
        <main id="main-content">
          <JournalVoucherComposer
            accounts={SAMPLE_ACCOUNTS}
            periods={SAMPLE_PERIODS}
            initialVouchers={EMPTY_EDGES}
          />
        </main>
      </WorkspaceModeProvider>,
    );

    // A11Y-01 & A11Y-02: Skip link, zero <aside>, single <h1>, 5 floating tabs
    expect(screen.getByRole("link", { name: "Skip to main content" })).toHaveAttribute(
      "href",
      "#main-content",
    );
    expect(container.querySelectorAll("aside")).toHaveLength(0);
    expect(container.querySelectorAll("h1")).toHaveLength(1);

    for (const label of ["Overview", "Transactions", "Reconcile", "Reports", "Admin"]) {
      const link = screen.getByRole("link", { name: label });
      expect(link.className).toContain("whitespace-nowrap");
    }
    for (const removed of ["Books", "People & Stock", "Sign In", "Access & Audit", "+ New Entry"]) {
      expect(screen.queryByRole("link", { name: removed })).toBeNull();
      expect(screen.queryByRole("button", { name: removed })).toBeNull();
    }

    // Settings link and Sign Out button in TopNavCapsule
    const settingsLink = screen.getByRole("link", { name: "Settings" });
    expect(settingsLink).toHaveAttribute("href", "/security");
    expect(settingsLink.className).toContain("min-h-[44px]");
    expect(settingsLink.className).toContain("min-w-[44px]");

    const signOutBtn = screen.getByRole("button", { name: "Sign Out" });
    expect(signOutBtn.className).toContain("min-h-[44px]");
    expect(signOutBtn.className).toContain("min-w-[44px]");

    // Simple | Pro mode pill
    const proBtn = screen.getByRole("button", { name: "Pro" });
    expect(proBtn).toHaveAttribute("aria-pressed", "false");
    await user.click(proBtn);
    expect(proBtn).toHaveAttribute("aria-pressed", "true");

    // A11Y-03: Unique per-row labeled inputs inside semantic <th scope="col"> table
    expect(container.querySelectorAll('th[scope="col"]').length).toBeGreaterThanOrEqual(4);
    const line1Debit = screen.getByLabelText("Line 1 Debit amount (NGN)");
    const line2Credit = screen.getByLabelText("Line 2 Credit amount (NGN)");

    // A11Y-05: Live balance status region updates dynamically via BigInt arithmetic
    const liveStatus = screen.getByTestId("balance-live-region");
    expect(liveStatus).toHaveAttribute("aria-live", "polite");

    await user.clear(line1Debit);
    await user.type(line1Debit, "50000.00");
    await user.clear(line2Credit);
    await user.type(line2Credit, "40000.00");
    expect(liveStatus).toHaveTextContent("Out of balance");

    await user.clear(line2Credit);
    await user.type(line2Credit, "50000.00");
    expect(liveStatus).toHaveTextContent("Balanced");

    // Zero fixed bottom-0 overlays (A11Y-04)
    expect(container.innerHTML).not.toContain("fixed bottom-0");

    // Run automated axe-core WCAG 2.1 AA scan
    const results = await axe.run(container);
    expect(results.violations).toEqual([]);
  });
});
