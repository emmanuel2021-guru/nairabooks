import React from "react";
import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import axe from "axe-core";
import { NextRequest } from "next/server";

import { WorkspaceModeProvider } from "@/state/workspace-mode";
import { TopNavCapsule } from "@/components/TopNavCapsule";
import LoginPage from "@/app/login/page";
import { SignupWorkspace } from "@/components/SignupWorkspace";
import { OverviewLandingClient } from "@/components/OverviewLandingClient";
import { AdminMaintainWorkspace } from "@/components/AdminMaintainWorkspace";
import { AdminRecordEditorWorkspace } from "@/components/admin/AdminRecordEditorWorkspace";
import { resetAdminStore } from "@/components/admin/admin-store";
import { LandingPageClient } from "@/components/LandingPageClient";
import { LOADER_SCENES, NairaBooksLoader } from "@/components/NairaBooksLoader";
import { RouteLoaderOverlay } from "@/components/RouteLoaderOverlay";
import { POST as registerPost } from "@/app/api/auth/register/route";
import { GET as auditEventsGet } from "@/app/api/audit/events/route";

describe("Google Stitch Product Landing, Login & Create Account Flows", () => {
  it("registers a new business owner & workspace with HttpOnly cookie and genesis audit event", async () => {
    const dupRes = await registerPost(
      new NextRequest("http://localhost:3000/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: "Duplicate Owner",
          email: "owner@lagostrading.ng",
          password: "StrongPassword#2026",
          workspaceName: "Dup Ltd",
          rcNumber: "RC 999111",
          businessType: "RETAIL_ECOMMERCE",
        }),
      }),
    );
    expect(dupRes.status).toBe(409);

    const uniqueEmail = `founder-${Date.now()}@ibadanmart.ng`;
    const okRes = await registerPost(
      new NextRequest("http://localhost:3000/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: "Kemi Adeyemi",
          email: uniqueEmail,
          password: "StrongPassword#2026",
          workspaceName: "Ibadan Fresh Mart Ltd",
          rcNumber: "RC 3104821",
          tinNumber: "24108291-0001",
          legalStructure: "LIMITED_COMPANY",
          state: "Oyo",
          businessType: "RETAIL_ECOMMERCE",
          setupMethod: "INDUSTRY_TEMPLATE",
          accountingMethod: "ACCRUAL",
          postingMethod: "BATCH",
          periodStructure: "MONTHLY_12",
          fiscalStartMonth: "January",
          fiscalYear: 2026,
          turnoverBand: "BETWEEN_25M_100M",
        }),
      }),
    );
    expect(okRes.status).toBe(201);
    const setCookie = okRes.headers.get("set-cookie") ?? "";
    expect(setCookie).toContain("nb_session=");
    expect(setCookie).toContain("HttpOnly");

    const okJson = (await okRes.json()) as {
      authenticated: boolean;
      user: { email: string; role: string };
      workspace: { id: string; legalName: string; rcNumber: string };
    };
    expect(okJson.authenticated).toBe(true);
    expect(okJson.user.email).toBe(uniqueEmail);
    expect(okJson.user.role).toBe("OWNER_MANAGING_DIRECTOR");
    expect(okJson.workspace.legalName).toBe("Ibadan Fresh Mart Ltd");

    const cookieMatch = /nb_session=([^;]+)/.exec(setCookie);
    expect(cookieMatch).not.toBeNull();
    const auditRes = await auditEventsGet(
      new NextRequest("http://localhost:3000/api/audit/events?first=10", {
        method: "GET",
        headers: { Cookie: `nb_session=${cookieMatch![1]}` },
      }),
    );
    expect(auditRes.status).toBe(200);
    const auditBody = (await auditRes.json()) as { items: Array<{ action: string }> };
    expect(auditBody.items.some((e) => e.action === "WORKSPACE_REGISTERED")).toBe(true);
  });

  it("renders minimalist LoginPage cleanly with password reveal, collapsible demo role drawer, single h1, and zero axe violations", async () => {
    const { container } = render(
      <WorkspaceModeProvider>
        <LoginPage />
      </WorkspaceModeProvider>,
    );

    expect(container.querySelectorAll("aside")).toHaveLength(0);
    expect(container.querySelectorAll("h1")).toHaveLength(1);
    expect(screen.getByRole("heading", { name: /Sign in to NairaBooks/i })).toBeTruthy();
    expect(screen.getByRole("link", { name: /Create a new account/i })).toBeTruthy();

    // Verify minimalist initial state: demo roles tucked cleanly inside collapsible drawer
    expect(screen.queryByRole("button", { name: /Chartered Accountant CFO/i })).toBeNull();

    // Toggle password visibility safely
    const passwordInput = screen.getByLabelText(/^Password$/i) as HTMLInputElement;
    expect(passwordInput.type).toBe("password");
    fireEvent.click(screen.getByRole("button", { name: /Show password/i }));
    expect(passwordInput.type).toBe("text");

    let results = await axe.run(container);
    expect(results.violations).toHaveLength(0);

    // Open collapsible demo role drawer and quick-fill CFO credentials
    fireEvent.click(screen.getByRole("button", { name: /Try a demo role/i }));
    fireEvent.click(screen.getByRole("button", { name: /Chartered Accountant CFO/i }));

    const emailInput = screen.getByLabelText(/Work Email/i) as HTMLInputElement;
    expect(emailInput.value).toBe("cfo@lagostrading.ng");
    expect(passwordInput.value).toBe("NairaBooks#2026");

    results = await axe.run(container);
    expect(results.violations).toHaveLength(0);
  }, 30000);

  it("renders 4-step Cupertino Company Creation Wizard with live Chart of Accounts, Tax Act 2025 tiers, and zero axe violations", async () => {
    const { container } = render(
      <WorkspaceModeProvider>
        <SignupWorkspace />
      </WorkspaceModeProvider>,
    );

    expect(container.querySelectorAll("aside")).toHaveLength(0);
    expect(container.querySelectorAll("h1")).toHaveLength(1);
    expect(screen.getByRole("heading", { name: /What kind of business do you run/i })).toBeTruthy();
    expect(screen.getByText(/Retail & Online Shop/i)).toBeTruthy();
    expect(screen.getByRole("radio", { name: /Builder & Contractor/i })).toBeTruthy();
    expect(screen.getByText(/Mix and match modules/i)).toBeTruthy();
    expect(screen.getByText(/29 Accounts Ready/i)).toBeTruthy();

    // Toggle GL Codes switch inside live Chart of Accounts preview
    const glSwitch = screen.getByRole("switch", {
      name: /Toggle accountant GL codes in Chart of Accounts preview/i,
    });
    fireEvent.click(glSwitch);
    expect(screen.getByText(/Property, Plant and Equipment \(Fixed Assets\)/i)).toBeTruthy();
    expect(screen.getByText(/1120 · Contract Milestones Receivable/i)).toBeTruthy();
    expect(screen.getByText(/6130 · Power, Diesel & Generator Maintenance/i)).toBeTruthy();

    let results = await axe.run(container);
    expect(results.violations).toHaveLength(0);

    // Step 1 -> Step 2 (Company & Owner)
    fireEvent.click(screen.getByRole("button", { name: /Continue to Step 2/i }));
    expect(screen.getByRole("heading", { name: /Tell us about your company and owner login/i })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Fill Sample Lagos Company/i }));

    // Step 2 -> Step 3 (Accounting Rules, Fiscal Calendar & Nigeria Tax Act 2025)
    fireEvent.click(screen.getByRole("button", { name: /Continue to Step 3/i }));
    expect(
      screen.getByRole("heading", { name: /Set how your books record money and year-end dates/i }),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole("radio", { name: /Under ₦25M/i }));
    expect(screen.getByText(/0% Company Tax \(Small Business\)/i)).toBeTruthy();

    // Step 3 -> Step 4 (Review & Launch)
    fireEvent.click(screen.getByRole("button", { name: /Continue to Step 4/i }));
    expect(screen.getByRole("heading", { name: /Ready to launch Lekki Palms Construction Ltd/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Create Company & Launch Workspace/i })).toBeTruthy();

    results = await axe.run(container);
    expect(results.violations).toHaveLength(0);
  }, 25000);

  it("renders minimalist OverviewLandingClient with 4 KPI cards, 2 core charts, actionable alerts, global date filter, and zero axe violations", async () => {
    const { container } = render(
      <WorkspaceModeProvider>
        <TopNavCapsule activeTab="overview" />
        <OverviewLandingClient
          authenticatedUser={null}
          workspaceName="Lagos Trading & Hospitality Ltd"
          workspaceRc="RC 1482910"
          accountCount={6}
          voucherCount={2}
          bankBalanceNgn="48,250,000.00"
          receivablesNgn="12,480,000.00"
          payablesNgn="4,920,000.00"
        />
      </WorkspaceModeProvider>,
    );

    expect(container.querySelectorAll("aside")).toHaveLength(0);
    expect(container.querySelectorAll("h1")).toHaveLength(1);
    expect(screen.getByRole("heading", { name: /Financial Overview/i })).toBeTruthy();

    // 4 Top-Level KPI Cards
    expect(screen.getByText(/Cash on Hand/i)).toBeTruthy();
    expect(screen.getByText(/Net Income/i)).toBeTruthy();
    expect(screen.getByText(/\+14\.2%/i)).toBeTruthy();
    expect(screen.getByText(/Total Receivables/i)).toBeTruthy();
    expect(screen.getByText(/Total Payables/i)).toBeTruthy();

    // 2 Core Visuals
    expect(screen.getByRole("heading", { name: /Cash Flow Trend/i })).toBeTruthy();
    expect(screen.getByRole("heading", { name: /Top Expense Categories/i })).toBeTruthy();

    // Global Date Filter updates metrics consistently across dashboard
    fireEvent.click(screen.getByRole("button", { name: /Year to Date/i }));
    expect(screen.getByText(/58,410,000\.00/i)).toBeTruthy();
    expect(screen.getByText(/\+18\.4%/i)).toBeTruthy();
    expect(screen.getByText(/21 pending/i)).toBeTruthy();

    // Actionable Alerts: Unreconciled Transactions + 3 Overdue Invoices with Reminder action
    expect(screen.getByRole("link", { name: /Review & Match Feed/i })).toBeTruthy();
    expect(screen.getByText(/Eko Atlantic Suites Ltd/i)).toBeTruthy();
    expect(screen.getByText(/Zaria Agro Distributors/i)).toBeTruthy();
    expect(screen.getByText(/Abuja Civic Catering/i)).toBeTruthy();

    const reminderButtons = screen.getAllByRole("button", { name: /Send Reminder/i });
    expect(reminderButtons).toHaveLength(3);
    const firstReminderButton = reminderButtons[0];
    if (!firstReminderButton) {
      throw new Error("Expected at least one Send Reminder button");
    }
    fireEvent.click(firstReminderButton);
    expect(screen.getByText(/Payment reminder queued for Eko Atlantic Suites Ltd/i)).toBeTruthy();

    // Sign In and Create Account buttons removed from Overview header
    expect(screen.queryByRole("link", { name: "Sign In" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Create Account" })).toBeNull();

    // TopNavCapsule provides global Settings and Sign Out
    expect(screen.getByRole("link", { name: "Settings" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Sign Out" })).toBeTruthy();

    const results = await axe.run(container);
    expect(results.violations).toHaveLength(0);
  }, 30000);

  it("renders authentic custom-shadcn Public LandingPageClient with simple copy, interactive workspace preview, cashflow split, and zero axe violations", async () => {
    const { container } = render(
      <WorkspaceModeProvider>
        <LandingPageClient activeSession={null} />
      </WorkspaceModeProvider>,
    );

    expect(container.querySelectorAll("aside")).toHaveLength(0);
    expect(container.querySelectorAll("h1")).toHaveLength(1);
    expect(container.innerHTML).not.toContain("fixed bottom-0");
    expect(
      screen.getByRole("img", { name: /Confident Nigerian business owner holding a green NairaBooks card/i }),
    ).toBeTruthy();
    expect(
      screen.getByRole("img", { name: /Animated emerald cashflow trend/i }),
    ).toBeTruthy();
    expect(screen.getAllByRole("link", { name: /Get Started Free/i }).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByRole("link", { name: /Sign In/i }).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByRole("link", { name: /Try Live Demo/i }).length).toBeGreaterThanOrEqual(1);

    // Interactive Product Preview Window switches Nigerian business examples cleanly
    expect(screen.getByText(/Shop Sale/i)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Abuja Invoice/i }));
    const livePreview = screen.getByTestId("product-preview-window");
    expect(livePreview.textContent).toContain("2,500,000.00");
    expect(livePreview.textContent).toContain("Tax held back");
    expect(livePreview.textContent).toContain("50,000.00");

    // Plain English vs Accountant View morph switches GL account codes smoothly
    fireEvent.click(screen.getByRole("button", { name: /Accountant View/i }));
    expect(livePreview.textContent).toContain("DR 1120");
    expect(livePreview.textContent).toContain("DR 1125");

    // Interactive Cashflow Split quarterly bar selector
    fireEvent.click(screen.getByRole("button", { name: /Q3/i }));
    expect(screen.getByTestId("cashflow-quarter-detail").textContent).toContain("₦");

    // 6 Nigerian business types via customized shadcn/Radix Tabs
    const contractorsTab = screen.getByRole("tab", { name: /Contractors/i });
    fireEvent.mouseDown(contractorsTab);
    fireEvent.click(contractorsTab);
    expect(screen.getByText(/Retail Shops/i)).toBeTruthy();
    expect(screen.getByText(/Wholesale/i)).toBeTruthy();
    expect(screen.getByText(/Makers/i)).toBeTruthy();
    expect(screen.getByText(/Agencies/i)).toBeTruthy();
    expect(screen.getByText(/NGOs/i)).toBeTruthy();

    // Plain-English Comparison Table & Short Human FAQ Accordion
    expect(screen.getByRole("table")).toBeTruthy();
    fireEvent.click(
      screen.getByRole("button", { name: /Do small businesses pay Company Tax/i }),
    );
    expect(screen.getByText(/₦100 million/i)).toBeTruthy();

    // Interactive Sample Receipt Dialog (open & close cleanly before axe scan)
    fireEvent.click(
      screen.getByRole("button", { name: /See Sample Receipt/i }),
    );
    expect(screen.getByRole("dialog")).toBeTruthy();
    const closeButtons = screen.getAllByRole("button", { name: /^Close$/i });
    const firstCloseButton = closeButtons[0];
    if (!firstCloseButton) {
      throw new Error("Expected at least one Close button inside sample receipt dialog");
    }
    fireEvent.click(firstCloseButton);

    const results = await axe.run(container);
    expect(results.violations).toHaveLength(0);
  }, 30000);

  it("renders fullscreen NairaBooksLoader dynamically across remounts without unwanted chrome and with zero axe violations", async () => {
    window.sessionStorage.clear();
    const seenBadges = new Set<string>();

    const firstRender = render(<NairaBooksLoader />);
    const statusEl = screen.getByRole("status");
    expect(statusEl.className).toContain("min-h-screen");
    expect(screen.queryByText(/Style \d+\//i)).toBeNull();
    expect(screen.queryByRole("button", { name: /Try Another Loader Vibe/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /Continue Now/i })).toBeNull();

    const firstBadge = LOADER_SCENES.find((s) => screen.queryByText(s.badge) !== null);
    expect(firstBadge).toBeTruthy();
    if (firstBadge) seenBadges.add(firstBadge.badge);

    const results = await axe.run(firstRender.container);
    expect(results.violations).toHaveLength(0);
    firstRender.unmount();

    const secondRender = render(<NairaBooksLoader />);
    const secondBadge = LOADER_SCENES.find((s) => screen.queryByText(s.badge) !== null);
    expect(secondBadge).toBeTruthy();
    if (secondBadge) seenBadges.add(secondBadge.badge);
    expect(seenBadges.size).toBe(2);
    secondRender.unmount();
  }, 20000);

  it("opens full-screen RouteLoaderOverlay immediately when clicking an internal route link without control buttons", async () => {
    const { container } = render(
      <RouteLoaderOverlay>
        <div>
          <a href="/signup" onClick={(e) => e.preventDefault()}>
            Start New Company
          </a>
        </div>
      </RouteLoaderOverlay>,
    );

    const navLink = screen.getByRole("link", { name: /Start New Company/i });
    fireEvent.click(navLink);

    expect(screen.getByText(/Opening Company Setup Wizard/i)).toBeTruthy();
    expect(screen.queryByText(/Style \d+\//i)).toBeNull();
    expect(screen.queryByRole("button", { name: /Try Another Loader Vibe/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /Continue Now/i })).toBeNull();

    const results = await axe.run(container);
    expect(results.violations).toHaveLength(0);
  }, 20000);

  it("renders AdminMaintainWorkspace with Balance (DR/CR) instead of Credit Limit, links to dedicated create/edit pages, IFRS Chart of Accounts, and zero axe violations", async () => {
    resetAdminStore();

    const { container } = render(
      <WorkspaceModeProvider>
        <TopNavCapsule activeTab="overview" />
        <AdminMaintainWorkspace
          workspaceName="Lagos Trading & Hospitality Ltd"
          workspaceRc="RC 1482910"
        />
      </WorkspaceModeProvider>,
    );

    expect(container.querySelectorAll("aside")).toHaveLength(0);
    expect(container.querySelectorAll("h1")).toHaveLength(1);
    expect(screen.getByRole("heading", { name: /Maintain & Admin Studio/i })).toBeTruthy();

    // Admin link sits on TopNavCapsule at the top of the screen
    const adminNavLink = screen.getByRole("link", { name: /^Admin$/i });
    expect(adminNavLink.getAttribute("href")).toBe("/admin");
    expect(adminNavLink.className).toContain("whitespace-nowrap");

    // Lists use top-to-down outline style, not side-by-side card grids
    expect(container.querySelector('[data-testid="admin-outline-list"]')).toBeTruthy();
    expect(container.querySelector(".md\\:grid-cols-2[data-testid='admin-record-grid']")).toBeNull();

    // Customer list shows Balance (Debit / Credit) and does NOT show Credit Limit
    expect(screen.queryByText(/Credit Limit/i)).toBeNull();
    expect(screen.getByText(/₦1,450,000 DR/i)).toBeTruthy();
    expect(screen.getByText(/₦150,000 CR/i)).toBeTruthy();
    expect(screen.getAllByText(/^Balance$/i).length).toBeGreaterThanOrEqual(1);

    // + New Customer and Edit rows navigate cleanly to dedicated create/edit pages
    const createCustomerLink = screen.getByRole("link", { name: /New Customer/i });
    expect(createCustomerLink.getAttribute("href")).toBe("/admin/customers/new");

    const editEkoLink = screen.getByRole("link", {
      name: /Edit Eko Atlantic Suites Ltd/i,
    });
    expect(editEkoLink.getAttribute("href")).toBe("/admin/customers/cust-1");

    // Toggle Active / Inactive state directly on record
    fireEvent.click(
      screen.getByRole("switch", {
        name: /Toggle active state for Eko Atlantic Suites Ltd/i,
      }),
    );
    expect(screen.getByText(/Marked "Eko Atlantic Suites Ltd" as Inactive safely\./i)).toBeTruthy();

    // Switch pillars to Books & Budgets -> Chart of Accounts: verify IFRS Group & Individual hierarchy
    fireEvent.click(screen.getByRole("tab", { name: /Books & Budgets/i }));
    expect(screen.getByRole("heading", { name: /Chart of Accounts/i })).toBeTruthy();
    expect(screen.getByRole("heading", { name: /Property, Plant and Equipment \(Fixed Assets\)/i })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Motor Vehicles" })).toBeTruthy();
    expect(screen.getAllByText(/IAS 16/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Group Account/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Individual/i).length).toBeGreaterThanOrEqual(1);

    const newGlLink = screen.getByRole("link", { name: /New GL Account/i });
    expect(newGlLink.getAttribute("href")).toBe("/admin/accounts/new");

    fireEvent.click(screen.getByRole("tab", { name: /Company & Defaults/i }));
    expect(screen.getByLabelText(/Legal Business Name/i)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Save Company Information/i }));
    expect(screen.getByText(/Saved Company Information/i)).toBeTruthy();

    const results = await axe.run(container);
    expect(results.violations).toHaveLength(0);
  }, 30000);

  it("supports Simple vs Full Creation toggle when creating records and strictly locks Edit mode to Full mode with zero axe violations", async () => {
    resetAdminStore();

    // 1. Creation Mode: Simple Creation -> Full Creation toggle works and saves to list
    const { container, unmount } = render(
      <AdminRecordEditorWorkspace mode="create" moduleId="customers" />,
    );

    expect(screen.getByTestId("creation-mode-toggle")).toBeTruthy();
    expect(screen.getByTestId("simple-creation-pane")).toBeTruthy();
    expect(screen.queryByRole("tablist")).toBeNull();

    // Toggle to Full Creation: reveals enterprise Customer tabs including Payment & Credit
    fireEvent.click(screen.getByRole("button", { name: /^Full Creation$/i }));
    expect(screen.getByTestId("full-editor-pane")).toBeTruthy();
    expect(screen.getByRole("tab", { name: /^General$/i })).toBeTruthy();
    expect(screen.getByRole("tab", { name: /^Contacts$/i })).toBeTruthy();
    expect(screen.getByRole("tab", { name: /^History$/i })).toBeTruthy();
    expect(screen.getByRole("tab", { name: /^Sales Info$/i })).toBeTruthy();
    expect(screen.getByRole("tab", { name: /Payment & Credit/i })).toBeTruthy();

    fireEvent.click(screen.getByRole("tab", { name: /Payment & Credit/i }));
    expect(screen.getByLabelText(/Credit Limit/i)).toBeTruthy();

    fireEvent.change(screen.getByLabelText(/Customer Name/i), {
      target: { value: "Victoria Island Medical Hub" },
    });
    fireEvent.change(screen.getByLabelText(/Current \/ Opening Balance/i), {
      target: { value: "₦450,000" },
    });
    fireEvent.click(screen.getByRole("button", { name: /CR \(Credit\)/i }));
    fireEvent.click(screen.getByRole("button", { name: /Create Customer/i }));

    expect(
      screen.getByText(/Created "Victoria Island Medical Hub"/i),
    ).toBeTruthy();

    const createAxe = await axe.run(container);
    expect(createAxe.violations).toHaveLength(0);
    unmount();

    // Verify new customer persisted cleanly into AdminMaintainWorkspace with CR balance
    const listRender = render(
      <WorkspaceModeProvider>
        <AdminMaintainWorkspace
          workspaceName="Lagos Trading & Hospitality Ltd"
          workspaceRc="RC 1482910"
        />
      </WorkspaceModeProvider>,
    );
    expect(
      screen.getByRole("heading", { name: "Victoria Island Medical Hub" }),
    ).toBeTruthy();
    expect(screen.getByText(/₦450,000 CR/i)).toBeTruthy();
    listRender.unmount();

    // 2. Edit Mode: ALWAYS locked to Full mode (no Simple Creation toggle rendered)
    const editCust = render(
      <AdminRecordEditorWorkspace
        mode="edit"
        moduleId="customers"
        recordId="cust-1"
      />,
    );
    expect(screen.queryByTestId("creation-mode-toggle")).toBeNull();
    expect(screen.queryByRole("button", { name: /Simple Creation/i })).toBeNull();
    expect(screen.getByTestId("edit-full-mode-badge")).toBeTruthy();
    expect(screen.getByTestId("full-editor-pane")).toBeTruthy();
    expect((screen.getByLabelText(/Customer Name/i) as HTMLInputElement).value).toBe(
      "Eko Atlantic Suites Ltd",
    );
    const editAxe = await axe.run(editCust.container);
    expect(editAxe.violations).toHaveLength(0);
    editCust.unmount();

    // 3. Spot-check specialized modules in Edit Mode
    const editBudget = render(
      <AdminRecordEditorWorkspace
        mode="edit"
        moduleId="budgets"
        recordId="bdg-1"
      />,
    );
    expect(screen.getByText(/12-Month Period Allocation Grid/i)).toBeTruthy();
    expect(screen.queryByTestId("creation-mode-toggle")).toBeNull();
    editBudget.unmount();

    const editAsset = render(
      <AdminRecordEditorWorkspace
        mode="edit"
        moduleId="assets"
        recordId="fa-1"
      />,
    );
    fireEvent.click(screen.getByRole("tab", { name: /Depreciation Schedule/i }));
    expect(screen.getByText(/IAS 16 Annual Depreciation/i)).toBeTruthy();
    editAsset.unmount();

    const editEmployee = render(
      <AdminRecordEditorWorkspace
        mode="edit"
        moduleId="employees"
        recordId="emp-1"
      />,
    );
    fireEvent.click(screen.getByRole("tab", { name: /Pay & Statutory/i }));
    expect(screen.getByText(/Employee PenCom \(8%\)/i)).toBeTruthy();
    editEmployee.unmount();
  }, 35000);
});
