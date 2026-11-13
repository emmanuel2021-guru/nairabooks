import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import { NextRequest } from "next/server";
import { GET as getPackProfile, POST as postPackProfile } from "@/app/api/packs/profile/route";
import { POST as postComposePreview } from "@/app/api/packs/compose-preview/route";
import { PackComposerWorkspace } from "@/components/PackComposerWorkspace";
import { TopNavCapsule } from "@/components/TopNavCapsule";
import { WorkspaceModeProvider } from "@/state/workspace-mode";
import type { PackWorkspacePayload } from "@/types/packs";

describe("Slice 4 Composable Pack Engine BFF routes and /packs A11Y", () => {
  it("lists all 10 primitives, composes hybrid hotel+diner pack, and rejects empty primitives", async () => {
    const initialRes = await getPackProfile(
      new NextRequest("http://localhost:3000/api/packs/profile"),
    );
    expect(initialRes.status).toBe(200);
    const initialBody = (await initialRes.json()) as PackWorkspacePayload;
    expect(initialBody.primitives).toHaveLength(10);
    expect(initialBody.profile.primaryPack).toBe("CUSTOM_COMPOSABLE");

    // Preview hybrid Hospitality + Diner composition
    const previewRes = await postComposePreview(
      new NextRequest("http://localhost:3000/api/packs/compose-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          primaryPack: "CUSTOM_COMPOSABLE",
          isHybridMultiUnit: true,
          primitives: ["HOSPITALITY_FOLIO_USALI", "DINER_RECIPE_TABLE"],
          terminologyOverrides: {
            customer: "Guest",
            invoice: "Guest Folio / Table Check",
          },
        }),
      }),
    );
    expect(previewRes.status).toBe(200);
    const previewBody = (await previewRes.json()) as {
      isHybridMultiUnit: boolean;
      taxDefaults: { includeStateConsumptionTax: boolean; defaultServiceChargeRate: string };
      terminologyMap: Record<string, string>;
      kpiWidgets: string[];
      coaAccounts: { code: string }[];
    };
    expect(previewBody.isHybridMultiUnit).toBe(true);
    expect(previewBody.taxDefaults.includeStateConsumptionTax).toBe(true);
    expect(previewBody.taxDefaults.defaultServiceChargeRate).toBe("0.100000");
    expect(previewBody.terminologyMap.customer).toBe("Guest");
    expect(previewBody.kpiWidgets).toEqual(expect.arrayContaining(["revpar", "food_cost_pct"]));
    expect(previewBody.coaAccounts.map((a) => a.code)).toEqual(
      expect.arrayContaining(["2140", "4050", "4060", "5060"]),
    );

    // Reject empty primitive list cleanly (400 ValidationError)
    const invalidRes = await postComposePreview(
      new NextRequest("http://localhost:3000/api/packs/compose-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          primaryPack: "CUSTOM_COMPOSABLE",
          primitives: [],
        }),
      }),
    );
    expect(invalidRes.status).toBe(400);

    // Persist custom hybrid configuration
    const saveRes = await postPackProfile(
      new NextRequest("http://localhost:3000/api/packs/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          primaryPack: "RETAIL_ECOMMERCE",
          isHybridMultiUnit: true,
          primitives: ["POS_DAILY_CASHUP", "SKU_INVENTORY_COGS", "BILL_OF_MATERIALS_WIP"],
          terminologyOverrides: { project: "Production Batch" },
        }),
      }),
    );
    expect(saveRes.status).toBe(200);
    const savedBody = (await saveRes.json()) as PackWorkspacePayload;
    expect(savedBody.profile.primaryPack).toBe("RETAIL_ECOMMERCE");
    expect(savedBody.profile.dimensions.some((d) => d.key === "business_unit")).toBe(true);
    expect(savedBody.profile.terminologyMap.project).toBe("Production Batch");
  });

  it("renders PackComposerWorkspace cleanly with zero sidebars, Pro IFRS toggle, and zero axe violations", async () => {
    const initialRes = await getPackProfile(
      new NextRequest("http://localhost:3000/api/packs/profile"),
    );
    const initialData = (await initialRes.json()) as PackWorkspacePayload;

    const { container } = render(
      <WorkspaceModeProvider>
        <TopNavCapsule activeTab="overview" />
        <main id="main-content">
          <PackComposerWorkspace initialData={initialData} />
        </main>
      </WorkspaceModeProvider>,
    );

    expect(container.querySelectorAll("aside").length).toBe(0);
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByTestId("pack-composer-status")).toHaveAttribute("aria-live", "polite");

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Pro" }));
    expect(screen.getByText(/Declarative IFRS CoA & JSON Manifest Preview/i)).toBeInTheDocument();

    // One-click Universal Pack Builder template presets (Hotel USALI / Diner / Hybrid)
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async (_input, init) => {
      const bodyText = typeof init?.body === "string" ? init.body : "{}";
      return postComposePreview(
        new NextRequest("http://localhost:3000/api/packs/compose-preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: bodyText,
        }),
      );
    });
    try {
      await user.click(screen.getByRole("button", { name: /Load Hybrid Hotel \+ Diner/i }));
      expect(screen.getByLabelText(/Who pays you\?/i)).toHaveValue("Guest");
      expect(
        screen.getByText(
          (_, el) =>
            el?.tagName === "SPAN" &&
            /4050\s+—\s+Room & Accommodation Folio Revenue/i.test(el.textContent ?? ""),
        ),
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          (_, el) =>
            el?.tagName === "SPAN" &&
            /4060\s+—\s+Kitchen & Beverage Sales Revenue/i.test(el.textContent ?? ""),
        ),
      ).toBeInTheDocument();
    } finally {
      fetchSpy.mockRestore();
    }

    const axeResults = await axe.run(container, {
      rules: {
        region: { enabled: true },
        "heading-order": { enabled: true },
      },
    });
    expect(axeResults.violations).toEqual([]);
  });
});
