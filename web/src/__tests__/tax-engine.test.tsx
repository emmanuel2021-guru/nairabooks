import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import { NextRequest } from "next/server";
import { GET as getTaxProfile, POST as postTaxProfile } from "@/app/api/tax/profile/route";
import { POST as postTaxPreview } from "@/app/api/tax/preview/route";
import { POST as postIndirectTaxPreview } from "@/app/api/tax/nrs-indirect-preview/route";
import { TaxEngineWorkspace } from "@/components/TaxEngineWorkspace";
import { TopNavCapsule } from "@/components/TopNavCapsule";
import { WorkspaceModeProvider } from "@/state/workspace-mode";
import type { TaxProfilePayload } from "@/types/tax";

describe("Slice 3 Tax Engine BFF routes and /tax A11Y", () => {
  it("evaluates Tax Act 2025 profile, SEC-REQ-04 WHT rules, and NRS indirect taxes via BFF", async () => {
    const initialRes = await getTaxProfile(new NextRequest("http://localhost:3000/api/tax/profile"));
    expect(initialRes.status).toBe(200);
    const initialBody = (await initialRes.json()) as TaxProfilePayload;
    expect(initialBody.profile.isSmallBusinessCitExempt).toBe(true);
    expect(initialBody.evaluation.applicableCitRate).toBe("0.000000");

    // Professional services excluded from 0% small-company CIT even under N100M
    const profRes = await postTaxProfile(
      new NextRequest("http://localhost:3000/api/tax/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          legalForm: "PRIVATE_LIMITED",
          tinNumber: "20269988-0001",
          vatRegistered: true,
          annualTurnoverNgn: "88000000.00",
          fixedAssetsNgn: "50000000.00",
          stateOfOperation: "LAGOS",
          isProfessionalServices: true,
        }),
      }),
    );
    expect(profRes.status).toBe(200);
    const profBody = (await profRes.json()) as TaxProfilePayload;
    expect(profBody.profile.isProfessionalServicesExcludedFromSmallExempt).toBe(true);
    expect(profBody.profile.isSmallBusinessCitExempt).toBe(false);
    expect(profBody.evaluation.thresholdAlertLevel).toBe("APPROACHING_80_PCT");

    // SEC-REQ-04: caller cannot inject appliedRate
    const badRes = await postTaxPreview(
      new NextRequest("http://localhost:3000/api/tax/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transactionDate: "2026-04-01",
          regime: "VAT_STANDARD_7_5",
          grossAmountNgn: "100000.00",
          counterpartyHasValidTin: true,
          supplyCategoryCode: "STANDARD_TAXABLE_SUPPLY",
          appliedRate: "0.010000",
        }),
      }),
    );
    expect(badRes.status).toBe(400);

    // No-TIN WHT doubles 5% -> 10%
    const whtRes = await postTaxPreview(
      new NextRequest("http://localhost:3000/api/tax/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transactionDate: "2026-04-01",
          regime: "WHT_CORPORATE_AND_UNINCORPORATED",
          grossAmountNgn: "1000000.00",
          counterpartyHasValidTin: false,
          supplyCategoryCode: "WHT_PROFESSIONAL_CONSULTING",
        }),
      }),
    );
    expect(whtRes.status).toBe(200);
    const whtBody = (await whtRes.json()) as {
      appliedRate: string;
      computedTaxNgn: string;
      whtHigherNoTinApplied: boolean;
    };
    expect(whtBody.appliedRate).toBe("0.100000");
    expect(whtBody.computedTaxNgn).toBe("100000.00");
    expect(whtBody.whtHigherNoTinApplied).toBe(true);

    // Concurrent VAT 7.5% + Lagos 5% + Service Charge 10% + WHT 5% + NRS TaxSubtotals
    const nrsRes = await postIndirectTaxPreview(
      new NextRequest("http://localhost:3000/api/tax/nrs-indirect-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transactionDate: "2026-05-01",
          baseAmountNgn: "100000.00",
          vatSupplyCategoryCode: "STANDARD_TAXABLE_SUPPLY",
          vatRegime: "VAT_STANDARD_7_5",
          includeStateConsumptionTax: true,
          serviceChargeRate: "0.100000",
          whtSupplyCategoryCode: "WHT_PROFESSIONAL_CONSULTING",
          counterpartyHasValidTin: true,
          transactionDirection: "SALES",
        }),
      }),
    );
    expect(nrsRes.status).toBe(200);
    const nrsBody = (await nrsRes.json()) as {
      vatAmountNgn: string;
      stateConsumptionTaxNgn: string;
      serviceChargeNgn: string;
      whtDeductionNgn: string;
      grossCustomerInvoiceNgn: string;
      netCashPayableNgn: string;
      nrsSubtotals: { taxSchemeId: string; categoryCode: string }[];
    };
    expect(nrsBody.vatAmountNgn).toBe("7500.00");
    expect(nrsBody.stateConsumptionTaxNgn).toBe("5000.00");
    expect(nrsBody.serviceChargeNgn).toBe("10000.00");
    expect(nrsBody.whtDeductionNgn).toBe("5000.00");
    expect(nrsBody.grossCustomerInvoiceNgn).toBe("122500.00");
    expect(nrsBody.netCashPayableNgn).toBe("117500.00");
    expect(nrsBody.nrsSubtotals.map((s) => s.taxSchemeId)).toEqual([
      "VAT",
      "STATE_CONSUMPTION",
      "SERVICE_CHARGE",
      "WHT",
    ]);
  });

  it("renders TaxEngineWorkspace cleanly with zero sidebars and zero axe violations", async () => {
    const initialRes = await getTaxProfile(new NextRequest("http://localhost:3000/api/tax/profile"));
    const initialPayload = (await initialRes.json()) as TaxProfilePayload;

    const { container } = render(
      <WorkspaceModeProvider>
        <TopNavCapsule activeTab="reports" />
        <main id="main-content">
          <TaxEngineWorkspace initialData={initialPayload} />
        </main>
      </WorkspaceModeProvider>,
    );

    expect(container.querySelectorAll("aside").length).toBe(0);
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByTestId("tax-cit-status")).toHaveAttribute("aria-live", "polite");

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Pro" }));
    expect(screen.getByText(/NRS E-Invoice TaxSubtotal Payload/i)).toBeInTheDocument();

    const axeResults = await axe.run(container, {
      rules: {
        region: { enabled: true },
        "heading-order": { enabled: true },
      },
    });
    expect(axeResults.violations).toEqual([]);
  });
});
