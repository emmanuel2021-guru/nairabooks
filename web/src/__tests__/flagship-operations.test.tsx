import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import { NextRequest } from "next/server";
import { GET as getFlagships, POST as postApplyFlagship } from "@/app/api/packs/flagships/route";
import { POST as postPackOperation } from "@/app/api/packs/operations/route";
import { FlagshipOperationsWorkspace } from "@/components/FlagshipOperationsWorkspace";
import { TopNavCapsule } from "@/components/TopNavCapsule";
import { WorkspaceModeProvider } from "@/state/workspace-mode";
import type { FlagshipPackPreset } from "@/types/packs";

describe("Slice 5 Track 4 Phase 1 Flagship Packs & Commerce/BOM BFF + /operations A11Y", () => {
  it("lists all 6 flagship packs, activates Retail/Wholesale/Manufacturing, and computes exact kobo plans", async () => {
    const listRes = await getFlagships(
      new NextRequest("http://localhost:3000/api/packs/flagships"),
    );
    expect(listRes.status).toBe(200);
    const listBody = (await listRes.json()) as { items: FlagshipPackPreset[] };
    expect(listBody.items).toHaveLength(6);

    const applyRes = await postApplyFlagship(
      new NextRequest("http://localhost:3000/api/packs/flagships", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packCode: "RETAIL_ECOMMERCE" }),
      }),
    );
    expect(applyRes.status).toBe(200);

    // 1. Retail POS Daily Cash-Up
    const retailRes = await postPackOperation(
      new NextRequest("http://localhost:3000/api/packs/operations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          operationType: "RETAIL_POS_CASHUP",
          postingDate: "2026-06-02",
          reference: "POS-UI-001",
          payload: {
            grossSalesNgn: "107500.00",
            cashTenderNgn: "30000.00",
            posCardTenderNgn: "77500.00",
            posMdrFeeNgn: "1162.50",
            cogsNgn: "60000.00",
            vatInclusive: true,
          },
        }),
      }),
    );
    expect(retailRes.status).toBe(201);
    const retailJson = (await retailRes.json()) as {
      metrics: Record<string, string>;
      lines: { accountCode: string; debitNgn: string; creditNgn: string }[];
    };
    expect(retailJson.metrics.netRevenueNgn).toBe("100000.00");
    expect(retailJson.metrics.vatAmountNgn).toBe("7500.00");
    expect(retailJson.metrics.grossMarginNgn).toBe("40000.00");

    // 2. Wholesale Landed Receipt
    const wholesaleRes = await postPackOperation(
      new NextRequest("http://localhost:3000/api/packs/operations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          operationType: "WHOLESALE_LANDED_RECEIPT",
          postingDate: "2026-06-03",
          reference: "PO-UI-002",
          payload: {
            unitsReceived: 100,
            supplierInvoiceNgn: "500000.00",
            freightAndClearingNgn: "150000.00",
            sellingPricePerUnitNgn: "8500.00",
          },
        }),
      }),
    );
    expect(wholesaleRes.status).toBe(201);
    const wholesaleJson = (await wholesaleRes.json()) as { metrics: Record<string, string> };
    expect(wholesaleJson.metrics.unitLandedCostNgn).toBe("6500.00");
    expect(wholesaleJson.metrics.projectedGrossMarginPct).toBe("23.53");

    // 3. Manufacturing Light BOM Run + Invalid tender rejection
    const bomRes = await postPackOperation(
      new NextRequest("http://localhost:3000/api/packs/operations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          operationType: "MANUFACTURING_BOM_RUN",
          postingDate: "2026-06-04",
          reference: "BOM-UI-003",
          payload: {
            rawMaterialsIssuedNgn: "400000.00",
            directConversionCostNgn: "100000.00",
            scrapSpoilageNgn: "25000.00",
            unitsProduced: 50,
          },
        }),
      }),
    );
    expect(bomRes.status).toBe(201);
    const bomJson = (await bomRes.json()) as { metrics: Record<string, string> };
    expect(bomJson.metrics.finishedGoodsCostNgn).toBe("475000.00");
    expect(bomJson.metrics.yieldPct).toBe("95.00");

    const badRetail = await postPackOperation(
      new NextRequest("http://localhost:3000/api/packs/operations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          operationType: "RETAIL_POS_CASHUP",
          postingDate: "2026-06-04",
          reference: "POS-BAD",
          payload: {
            grossSalesNgn: "50000.00",
            cashTenderNgn: "10000.00",
            posCardTenderNgn: "10000.00",
            posMdrFeeNgn: "0.00",
            cogsNgn: "5000.00",
            vatInclusive: true,
          },
        }),
      }),
    );
    expect(badRetail.status).toBe(400);

    // 4. Construction Job Progress (Retention + 2%/5% WHT & No-TIN doubling)
    const constructionRes = await postPackOperation(
      new NextRequest("http://localhost:3000/api/packs/operations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          operationType: "CONSTRUCTION_JOB_PROGRESS",
          postingDate: "2026-06-10",
          reference: "VAL-LEKKI-01",
          payload: {
            projectSite: "Lekki Phase 1 Duplex",
            certifiedValuationNgn: "2000000.00",
            clientRetentionPct: "5.00",
            materialsIssuedNgn: "300000.00",
            subcontractorClaimNgn: "1000000.00",
            subcontractorRetentionPct: "5.00",
            subcontractorWhtRatePct: "2.00",
            subcontractorHasTin: false,
          },
        }),
      }),
    );
    expect(constructionRes.status).toBe(201);
    const constJson = (await constructionRes.json()) as { metrics: Record<string, string> };
    expect(constJson.metrics.clientRetentionNgn).toBe("100000.00");
    expect(constJson.metrics.effectiveWhtRatePct).toBe("4.00");
    expect(constJson.metrics.subcontractorWhtNgn).toBe("40000.00");
    expect(constJson.metrics.jobMarginNgn).toBe("700000.00");

    // 5. Professional Services Time & Retainer Billing + Non-Exempt CIT notice
    const profRes = await postPackOperation(
      new NextRequest("http://localhost:3000/api/packs/operations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          operationType: "PROFESSIONAL_TIME_BILLING",
          postingDate: "2026-06-11",
          reference: "INV-ADV-009",
          payload: {
            engagementCode: "ENG-ZENITH-AUDIT",
            billableHours: "40.00",
            hourlyRateNgn: "25000.00",
            billedFeeNgn: "950000.00",
            retainerAppliedNgn: "200000.00",
            reimbursableExpenseNgn: "50000.00",
            whtRatePct: "5.00",
            vatApplicable: true,
          },
        }),
      }),
    );
    expect(profRes.status).toBe(201);
    const profJson = (await profRes.json()) as { metrics: Record<string, string> };
    expect(profJson.metrics.realizationRatePct).toBe("95.00");
    expect(profJson.metrics.whtCreditNgn).toBe("47500.00");
    expect(profJson.metrics.citStatusNotice).toBe("NON_EXEMPT_NTA_2025_CIT_APPLIES");

    // 6. Non-Profit Restricted Grant & Budget-vs-Actual
    const ngoRes = await postPackOperation(
      new NextRequest("http://localhost:3000/api/packs/operations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          operationType: "NONPROFIT_GRANT_ACTIVITY",
          postingDate: "2026-06-12",
          reference: "GRANT-MALARIA-Q2",
          payload: {
            donorFundName: "Sahel Malaria Relief Fund",
            fundRestriction: "RESTRICTED",
            approvedBudgetNgn: "5000000.00",
            trancheReceivedNgn: "3000000.00",
            programSpendNgn: "1800000.00",
            priorSpendNgn: "2500000.00",
          },
        }),
      }),
    );
    expect(ngoRes.status).toBe(201);
    const ngoJson = (await ngoRes.json()) as { metrics: Record<string, string> };
    expect(ngoJson.metrics.burnRatePct).toBe("86.00");
    expect(ngoJson.metrics.budgetStatus).toBe("APPROACHING_CAP");

    // 7. Hotel USALI Folio & 8. Diner Shift Templates
    const hotelRes = await postPackOperation(
      new NextRequest("http://localhost:3000/api/packs/operations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          operationType: "HOSPITALITY_FOLIO_SETTLEMENT",
          postingDate: "2026-06-15",
          reference: "FOLIO-IKOYI-304",
          payload: {
            propertyWing: "Victoria Island Main Wing",
            roomsSold: 12,
            availableRooms: 20,
            roomRateBaseNgn: "600000.00",
            applyLagosConsumptionTax: true,
            serviceChargeRatePct: "10.00",
          },
        }),
      }),
    );
    expect(hotelRes.status).toBe(201);
    const hotelJson = (await hotelRes.json()) as { metrics: Record<string, string> };
    expect(hotelJson.metrics.revparNgn).toBe("30000.00");
    expect(hotelJson.metrics.serviceChargeFiduciaryNgn).toBe("60000.00");

    const dinerRes = await postPackOperation(
      new NextRequest("http://localhost:3000/api/packs/operations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          operationType: "DINER_SERVICE_SHIFT",
          postingDate: "2026-06-15",
          reference: "SHIFT-BISTRO-08",
          payload: {
            diningOutlet: "Main Grill & Lounge",
            coversServed: 85,
            foodBeverageSalesNgn: "450000.00",
            ingredientCogsNgn: "157500.00",
            kitchenSpoilageNgn: "11250.00",
            applyStateConsumptionTax: true,
          },
        }),
      }),
    );
    expect(dinerRes.status).toBe(201);
    const dinerJson = (await dinerRes.json()) as { metrics: Record<string, string> };
    expect(dinerJson.metrics.foodCostPct).toBe("37.50");
    expect(dinerJson.metrics.stateConsumptionTaxNgn).toBe("22500.00");
  });

  it("renders FlagshipOperationsWorkspace cleanly with zero sidebars, Pro IFRS toggle, and zero axe violations", async () => {
    const listRes = await getFlagships(
      new NextRequest("http://localhost:3000/api/packs/flagships"),
    );
    const listBody = (await listRes.json()) as { items: FlagshipPackPreset[] };

    const { container } = render(
      <WorkspaceModeProvider>
        <TopNavCapsule activeTab="people" />
        <main id="main-content">
          <FlagshipOperationsWorkspace presets={listBody.items} initialPackCode="RETAIL_ECOMMERCE" />
        </main>
      </WorkspaceModeProvider>,
    );

    expect(container.querySelectorAll("aside").length).toBe(0);
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByTestId("flagship-op-status")).toHaveAttribute("aria-live", "polite");

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Pro" }));
    expect(screen.getByText(/IFRS Double-Entry Posting Lines/i)).toBeInTheDocument();

    // Switching to Professional Services surfaces the non-exempt CIT statutory banner
    await user.click(screen.getByRole("button", { name: /Professional Services Time/i }));
    expect(screen.getByTestId("prof-cit-notice")).toHaveTextContent(/Nigeria Tax Act 2025/i);

    // Switching to Hotel USALI and Diner templates adapts the workbook form cleanly
    await user.click(screen.getByRole("button", { name: /Hotel Folio \(USALI\)/i }));
    expect(screen.getByLabelText(/Rooms Sold/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Diner & Kitchen Shift/i }));
    expect(screen.getByLabelText(/Covers Served/i)).toBeInTheDocument();

    const axeResults = await axe.run(container, {
      rules: {
        region: { enabled: true },
        "heading-order": { enabled: true },
      },
    });
    expect(axeResults.violations).toEqual([]);
  });
});
