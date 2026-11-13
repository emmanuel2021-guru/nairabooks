import { formatKobo, parseMoneyToKobo } from "@/lib/decimal";
import type { MutationError } from "@/types/ledger";
import type {
  FlagshipPackCode,
  FlagshipPackPreset,
  OperationalPrimitive,
  PackAccountBlueprint,
  PackDimensionSpec,
  PackOperationPostResult,
  PackOperationType,
  PackPlannedLine,
  PackTaxDefaults,
  PackWorkspacePayload,
  PrimitiveCapabilitySpec,
  WorkspaceIndustryProfile,
} from "@/types/packs";

const WORKSPACE_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0001";
const ACTOR_USER_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbb0001";

const DEFAULT_TAX_HINTS: PackTaxDefaults = {
  vatRegistered: true,
  defaultVatRegime: "VAT_STANDARD_7_5",
  isProfessionalServices: false,
  includeStateConsumptionTax: false,
  defaultServiceChargeRate: "0.000000",
  defaultWhtCategory: null,
};

function makeHints(overrides: Partial<PackTaxDefaults>): PackTaxDefaults {
  return { ...DEFAULT_TAX_HINTS, ...overrides };
}

export const PRIMITIVE_CATALOG: readonly PrimitiveCapabilitySpec[] = [
  {
    primitive: "POS_DAILY_CASHUP",
    displayName: "POS Daily Cash-Up & Terminal Clearing",
    plainEnglishSummary:
      "Track daily cash, Paystack/Moniepoint POS receipts, and MDR fees.",
    accounts: [
      {
        code: "1210",
        name: "POS Terminal Settlement Clearing",
        category: "ASSET",
        ifrsTag: "CASH_AND_CASH_EQUIVALENTS",
        sourcePrimitive: "POS_DAILY_CASHUP",
        isSystemLocked: false,
      },
      {
        code: "4020",
        name: "Retail POS Sales Revenue",
        category: "REVENUE",
        ifrsTag: "REVENUE_CONTRACTS",
        sourcePrimitive: "POS_DAILY_CASHUP",
        isSystemLocked: false,
      },
    ],
    dimensions: [{ key: "terminal_till", label: "POS Till / Outlet", required: false }],
    kpis: [
      {
        key: "daily_pos_takings",
        label: "Daily POS & Cash Takings",
        formulaPlainEnglish: "Total settled card + transfer + cash receipts per day",
      },
    ],
    vocabularyDefaults: { receipt: "POS Till Receipt" },
    taxHints: makeHints({ vatRegistered: true }),
  },
  {
    primitive: "SKU_INVENTORY_COGS",
    displayName: "SKU Inventory & Cost of Goods Sold",
    plainEnglishSummary: "Track stock on hand, stock adjustments, and gross margins.",
    accounts: [
      {
        code: "1310",
        name: "Merchandise Inventory (IAS 2)",
        category: "ASSET",
        ifrsTag: "INVENTORIES",
        sourcePrimitive: "SKU_INVENTORY_COGS",
        isSystemLocked: false,
      },
      {
        code: "5020",
        name: "Cost of Goods Sold (Merchandise)",
        category: "EXPENSE",
        ifrsTag: "COST_OF_SALES",
        sourcePrimitive: "SKU_INVENTORY_COGS",
        isSystemLocked: false,
      },
    ],
    dimensions: [{ key: "product_category", label: "Product Category", required: false }],
    kpis: [
      {
        key: "gross_margin_pct",
        label: "Gross Profit Margin (%)",
        formulaPlainEnglish: "(Net sales minus COGS) divided by net sales",
      },
    ],
    vocabularyDefaults: { item: "Stock SKU" },
    taxHints: makeHints({ defaultWhtCategory: "WHT_GOODS_SUPPLY" }),
  },
  {
    primitive: "MULTI_TIER_WAREHOUSE_PO",
    displayName: "Multi-Tier Warehouse & Landed Cost",
    plainEnglishSummary: "Manage regional depots, distributor tiers, and freight costs.",
    accounts: [
      {
        code: "1320",
        name: "Goods-in-Transit & Warehouse Stock",
        category: "ASSET",
        ifrsTag: "INVENTORIES",
        sourcePrimitive: "MULTI_TIER_WAREHOUSE_PO",
        isSystemLocked: false,
      },
      {
        code: "5030",
        name: "Clearing, Freight & Landed Duty",
        category: "EXPENSE",
        ifrsTag: "COST_OF_SALES",
        sourcePrimitive: "MULTI_TIER_WAREHOUSE_PO",
        isSystemLocked: false,
      },
    ],
    dimensions: [{ key: "warehouse_depot", label: "Warehouse / Depot", required: false }],
    kpis: [
      {
        key: "inventory_days",
        label: "Inventory Days on Hand",
        formulaPlainEnglish: "Average inventory value divided by daily COGS",
      },
    ],
    vocabularyDefaults: { location: "Warehouse Depot" },
    taxHints: makeHints({ defaultWhtCategory: "WHT_GOODS_SUPPLY" }),
  },
  {
    primitive: "BILL_OF_MATERIALS_WIP",
    displayName: "Bill of Materials (BOM) & Light Production WIP",
    plainEnglishSummary: "Convert raw materials into work-in-progress and finished goods.",
    accounts: [
      {
        code: "1330",
        name: "Raw Materials Inventory",
        category: "ASSET",
        ifrsTag: "INVENTORIES",
        sourcePrimitive: "BILL_OF_MATERIALS_WIP",
        isSystemLocked: false,
      },
      {
        code: "1340",
        name: "Work-in-Progress (WIP) Production",
        category: "ASSET",
        ifrsTag: "INVENTORIES",
        sourcePrimitive: "BILL_OF_MATERIALS_WIP",
        isSystemLocked: false,
      },
      {
        code: "5040",
        name: "Production Scrap & Yield Variance",
        category: "EXPENSE",
        ifrsTag: "COST_OF_SALES",
        sourcePrimitive: "BILL_OF_MATERIALS_WIP",
        isSystemLocked: false,
      },
    ],
    dimensions: [{ key: "production_batch", label: "Production Batch", required: false }],
    kpis: [
      {
        key: "bom_yield_pct",
        label: "Batch Yield Efficiency (%)",
        formulaPlainEnglish: "Finished units produced vs planned BOM output",
      },
    ],
    vocabularyDefaults: { work_order: "Assembly Batch" },
    taxHints: makeHints({ defaultWhtCategory: "WHT_GOODS_SUPPLY" }),
  },
  {
    primitive: "JOB_COSTING_RETENTION",
    displayName: "Project Job Costing & Retention",
    plainEnglishSummary:
      "Track costs per construction site, retention, and subcontractor WHT.",
    accounts: [
      {
        code: "1140",
        name: "Contract Retention Receivable",
        category: "ASSET",
        ifrsTag: "TRADE_RECEIVABLES",
        sourcePrimitive: "JOB_COSTING_RETENTION",
        isSystemLocked: false,
      },
      {
        code: "2120",
        name: "Withholding Tax Payable",
        category: "LIABILITY",
        ifrsTag: "TAX_LIABILITIES",
        sourcePrimitive: "JOB_COSTING_RETENTION",
        isSystemLocked: false,
      },
      {
        code: "2150",
        name: "Subcontractor Retention Payable",
        category: "LIABILITY",
        ifrsTag: "TRADE_PAYABLES",
        sourcePrimitive: "JOB_COSTING_RETENTION",
        isSystemLocked: false,
      },
      {
        code: "4070",
        name: "Construction Contract Valuation Revenue",
        category: "REVENUE",
        ifrsTag: "REVENUE_CONTRACTS",
        sourcePrimitive: "JOB_COSTING_RETENTION",
        isSystemLocked: false,
      },
      {
        code: "5050",
        name: "Subcontractor & Site Direct Costs",
        category: "EXPENSE",
        ifrsTag: "COST_OF_SALES",
        sourcePrimitive: "JOB_COSTING_RETENTION",
        isSystemLocked: false,
      },
    ],
    dimensions: [{ key: "project_site", label: "Project / Construction Site", required: true }],
    kpis: [
      {
        key: "job_margin_ngn",
        label: "Project Gross Margin",
        formulaPlainEnglish: "Certified valuation revenue minus site & subcontractor costs",
      },
    ],
    vocabularyDefaults: { project: "Job Site", vendor: "Subcontractor" },
    taxHints: makeHints({ defaultWhtCategory: "WHT_CONSTRUCTION_CIVIL" }),
  },
  {
    primitive: "TIME_RETAINER_BILLING",
    displayName: "Time, Retainer & Advisory Billing",
    plainEnglishSummary: "Track billable hours, client retainers, and WHT credit notes.",
    accounts: [
      {
        code: "1130",
        name: "Unbilled Work-in-Progress (Advisory)",
        category: "ASSET",
        ifrsTag: "CONTRACT_ASSETS",
        sourcePrimitive: "TIME_RETAINER_BILLING",
        isSystemLocked: false,
      },
      {
        code: "1150",
        name: "WHT Credit Note Receivable",
        category: "ASSET",
        ifrsTag: "TRADE_RECEIVABLES",
        sourcePrimitive: "TIME_RETAINER_BILLING",
        isSystemLocked: false,
      },
      {
        code: "2160",
        name: "Client Retainer & Unearned Fees",
        category: "LIABILITY",
        ifrsTag: "CONTRACT_LIABILITIES",
        sourcePrimitive: "TIME_RETAINER_BILLING",
        isSystemLocked: false,
      },
      {
        code: "4030",
        name: "Professional Fees & Retainer Income",
        category: "REVENUE",
        ifrsTag: "REVENUE_CONTRACTS",
        sourcePrimitive: "TIME_RETAINER_BILLING",
        isSystemLocked: false,
      },
    ],
    dimensions: [{ key: "engagement_code", label: "Client Engagement", required: true }],
    kpis: [
      {
        key: "realization_rate_pct",
        label: "Fee Realization Rate (%)",
        formulaPlainEnglish: "Billed client fees divided by standard time value",
      },
    ],
    vocabularyDefaults: { customer: "Client", product: "Service / Retainer" },
    taxHints: makeHints({
      isProfessionalServices: true,
      defaultWhtCategory: "WHT_PROFESSIONAL_CONSULTING",
    }),
  },
  {
    primitive: "FUND_GRANT_ACCOUNTING",
    displayName: "Restricted Fund & Donor Grant Tracking",
    plainEnglishSummary: "Separate donor-restricted funds from unrestricted operations.",
    accounts: [
      {
        code: "3200",
        name: "Restricted Donor Grant Funds",
        category: "RESTRICTED_FUND",
        ifrsTag: "RESTRICTED_NET_ASSETS",
        sourcePrimitive: "FUND_GRANT_ACCOUNTING",
        isSystemLocked: false,
      },
      {
        code: "4040",
        name: "Donor Grants & Contributions Income",
        category: "REVENUE",
        ifrsTag: "GRANT_INCOME",
        sourcePrimitive: "FUND_GRANT_ACCOUNTING",
        isSystemLocked: false,
      },
      {
        code: "4045",
        name: "Unrestricted Donations & Operating Income",
        category: "REVENUE",
        ifrsTag: "GRANT_INCOME",
        sourcePrimitive: "FUND_GRANT_ACCOUNTING",
        isSystemLocked: false,
      },
      {
        code: "5090",
        name: "Donor Program & Grant Disbursements",
        category: "EXPENSE",
        ifrsTag: "PROGRAM_EXPENSES",
        sourcePrimitive: "FUND_GRANT_ACCOUNTING",
        isSystemLocked: false,
      },
    ],
    dimensions: [{ key: "donor_fund", label: "Grant / Donor Fund", required: true }],
    kpis: [
      {
        key: "grant_burn_rate_pct",
        label: "Grant Budget Utilization (%)",
        formulaPlainEnglish: "Program spend to date vs approved donor grant budget",
      },
    ],
    vocabularyDefaults: { customer: "Donor / Grantmaker", invoice: "Grant Disbursement" },
    taxHints: makeHints({ vatRegistered: false, defaultVatRegime: "VAT_EXEMPT" }),
  },
  {
    primitive: "HOSPITALITY_FOLIO_USALI",
    displayName: "Hospitality Room Folios (USALI) & Service Charge",
    plainEnglishSummary:
      "Manage guest folios, state consumption tax, and staff service charge.",
    accounts: [
      {
        code: "2130",
        name: "State Consumption Levy Payable",
        category: "LIABILITY",
        ifrsTag: "TAX_LIABILITIES",
        sourcePrimitive: "HOSPITALITY_FOLIO_USALI",
        isSystemLocked: false,
      },
      {
        code: "2140",
        name: "Fiduciary Staff Service Charge Payable",
        category: "LIABILITY",
        ifrsTag: "FIDUCIARY_PAYABLES",
        sourcePrimitive: "HOSPITALITY_FOLIO_USALI",
        isSystemLocked: false,
      },
      {
        code: "4050",
        name: "Room & Accommodation Folio Revenue",
        category: "REVENUE",
        ifrsTag: "REVENUE_CONTRACTS",
        sourcePrimitive: "HOSPITALITY_FOLIO_USALI",
        isSystemLocked: false,
      },
    ],
    dimensions: [{ key: "property_wing", label: "Property / Wing", required: false }],
    kpis: [
      {
        key: "revpar",
        label: "RevPAR (Revenue Per Available Room)",
        formulaPlainEnglish: "Room revenue divided by total available rooms",
      },
    ],
    vocabularyDefaults: { customer: "Guest", invoice: "Guest Folio" },
    taxHints: makeHints({
      includeStateConsumptionTax: true,
      defaultServiceChargeRate: "0.100000",
    }),
  },
  {
    primitive: "DINER_RECIPE_TABLE",
    displayName: "Diner, Kitchen Recipe & Table POS",
    plainEnglishSummary:
      "Track kitchen ingredients, plate margins, and dine-in/takeout sales.",
    accounts: [
      {
        code: "1310",
        name: "Merchandise Inventory (IAS 2)",
        category: "ASSET",
        ifrsTag: "INVENTORIES",
        sourcePrimitive: "DINER_RECIPE_TABLE",
        isSystemLocked: false,
      },
      {
        code: "2130",
        name: "State Consumption Levy Payable",
        category: "LIABILITY",
        ifrsTag: "TAX_LIABILITIES",
        sourcePrimitive: "DINER_RECIPE_TABLE",
        isSystemLocked: false,
      },
      {
        code: "4060",
        name: "Kitchen & Beverage Sales Revenue",
        category: "REVENUE",
        ifrsTag: "REVENUE_CONTRACTS",
        sourcePrimitive: "DINER_RECIPE_TABLE",
        isSystemLocked: false,
      },
      {
        code: "5060",
        name: "Kitchen Ingredient Food Cost (COGS)",
        category: "EXPENSE",
        ifrsTag: "COST_OF_SALES",
        sourcePrimitive: "DINER_RECIPE_TABLE",
        isSystemLocked: false,
      },
      {
        code: "5095",
        name: "Kitchen Spoilage & Waste Loss",
        category: "EXPENSE",
        ifrsTag: "COST_OF_SALES",
        sourcePrimitive: "DINER_RECIPE_TABLE",
        isSystemLocked: false,
      },
    ],
    dimensions: [{ key: "dining_outlet", label: "Dining Section / Outlet", required: false }],
    kpis: [
      {
        key: "food_cost_pct",
        label: "Food Cost Percentage (%)",
        formulaPlainEnglish: "Ingredient cost divided by food & beverage sales",
      },
    ],
    vocabularyDefaults: { invoice: "Table Check", item: "Menu Dish" },
    taxHints: makeHints({ includeStateConsumptionTax: true }),
  },
  {
    primitive: "LOGISTICS_FLEET_TRIP",
    displayName: "Fleet & Delivery Trip Costing",
    plainEnglishSummary:
      "Track diesel, maintenance, and margin per haulage route or truck.",
    accounts: [
      {
        code: "1520",
        name: "Delivery Vehicles & Fleet Equipment",
        category: "ASSET",
        ifrsTag: "PROPERTY_PLANT_EQUIPMENT",
        sourcePrimitive: "LOGISTICS_FLEET_TRIP",
        isSystemLocked: false,
      },
      {
        code: "5070",
        name: "Fleet Diesel, Tolls & Trip Maintenance",
        category: "EXPENSE",
        ifrsTag: "COST_OF_SALES",
        sourcePrimitive: "LOGISTICS_FLEET_TRIP",
        isSystemLocked: false,
      },
    ],
    dimensions: [{ key: "vehicle_unit", label: "Truck / Fleet Route", required: false }],
    kpis: [
      {
        key: "profit_per_trip",
        label: "Net Profit Per Trip",
        formulaPlainEnglish: "Waybill freight revenue minus diesel and driver trip expenses",
      },
    ],
    vocabularyDefaults: { project: "Trip Waybill" },
    taxHints: makeHints({ defaultWhtCategory: "WHT_GOODS_SUPPLY" }),
  },
];

const PRIMITIVE_MAP = new Map<OperationalPrimitive, PrimitiveCapabilitySpec>(
  PRIMITIVE_CATALOG.map((spec) => [spec.primitive, spec]),
);

const VALID_PACK_CODES = new Set<FlagshipPackCode>([
  "RETAIL_ECOMMERCE",
  "WHOLESALE_DISTRIBUTION",
  "MANUFACTURING_LIGHT",
  "CONSTRUCTION_TRADES",
  "PROFESSIONAL_SERVICES",
  "NON_PROFIT",
  "CUSTOM_COMPOSABLE",
]);

function validationError(message: string, field: string | null = null): MutationError {
  return {
    __typename: "ValidationError",
    code: "VALIDATION_ERROR",
    message,
    field,
  };
}

function composeProfileFromRequest(
  raw: Record<string, unknown>,
): { ok: true; profile: WorkspaceIndustryProfile } | { ok: false; error: MutationError } {
  const primaryRaw =
    typeof raw.primaryPack === "string" ? raw.primaryPack : "CUSTOM_COMPOSABLE";
  if (!VALID_PACK_CODES.has(primaryRaw as FlagshipPackCode)) {
    return {
      ok: false,
      error: validationError(`Unknown FlagshipPackCode '${primaryRaw}'.`, "primaryPack"),
    };
  }
  const primaryPack = primaryRaw as FlagshipPackCode;

  if (!Array.isArray(raw.primitives) || raw.primitives.length === 0) {
    return {
      ok: false,
      error: validationError(
        "At least one operational primitive must be selected.",
        "primitives",
      ),
    };
  }

  const uniquePrimitives: OperationalPrimitive[] = [];
  for (const item of raw.primitives) {
    if (typeof item !== "string" || !PRIMITIVE_MAP.has(item as OperationalPrimitive)) {
      return {
        ok: false,
        error: validationError(`Unknown operational primitive '${String(item)}'.`, "primitives"),
      };
    }
    const typed = item as OperationalPrimitive;
    if (!uniquePrimitives.includes(typed)) {
      uniquePrimitives.push(typed);
    }
  }

  const coaByCode = new Map<string, PackAccountBlueprint>();
  const dimsByKey = new Map<string, PackDimensionSpec>();
  const kpiWidgets: string[] = [];
  const terminologyMap: Record<string, string> = {};

  const firstPrimitive = uniquePrimitives[0];
  let vatRegistered =
    uniquePrimitives.length === 1 && firstPrimitive
      ? (PRIMITIVE_MAP.get(firstPrimitive)?.taxHints.vatRegistered ?? true)
      : false;
  let defaultVatRegime =
    uniquePrimitives.length === 1 && firstPrimitive
      ? (PRIMITIVE_MAP.get(firstPrimitive)?.taxHints.defaultVatRegime ?? "VAT_STANDARD_7_5")
      : "VAT_STANDARD_7_5";
  let isProfessionalServices = false;
  let includeStateConsumptionTax = false;
  let defaultServiceChargeRate = "0.000000";
  let defaultWhtCategory: string | null = null;

  for (const prim of uniquePrimitives) {
    const spec = PRIMITIVE_MAP.get(prim);
    if (!spec) continue;
    for (const acct of spec.accounts) {
      if (!coaByCode.has(acct.code)) {
        coaByCode.set(acct.code, acct);
      }
    }
    for (const dim of spec.dimensions) {
      if (!dimsByKey.has(dim.key)) {
        dimsByKey.set(dim.key, dim);
      }
    }
    for (const kpi of spec.kpis) {
      if (!kpiWidgets.includes(kpi.key)) {
        kpiWidgets.push(kpi.key);
      }
    }
    for (const [k, v] of Object.entries(spec.vocabularyDefaults)) {
      if (!(k in terminologyMap)) {
        terminologyMap[k] = v;
      }
    }
    if (spec.taxHints.vatRegistered) vatRegistered = true;
    if (spec.taxHints.isProfessionalServices) isProfessionalServices = true;
    if (spec.taxHints.includeStateConsumptionTax) includeStateConsumptionTax = true;
    if (spec.taxHints.defaultServiceChargeRate !== "0.000000") {
      defaultServiceChargeRate = spec.taxHints.defaultServiceChargeRate;
    }
    if (spec.taxHints.defaultWhtCategory && defaultWhtCategory === null) {
      defaultWhtCategory = spec.taxHints.defaultWhtCategory;
    }
  }

  const isHybridMultiUnit =
    typeof raw.isHybridMultiUnit === "boolean"
      ? raw.isHybridMultiUnit
      : uniquePrimitives.length > 1;

  if (isHybridMultiUnit || primaryPack === "CUSTOM_COMPOSABLE" || uniquePrimitives.length > 1) {
    if (!dimsByKey.has("business_unit")) {
      dimsByKey.set("business_unit", {
        key: "business_unit",
        label: "Business Unit / Branch",
        required: true,
      });
    }
  }

  if (raw.terminologyOverrides && typeof raw.terminologyOverrides === "object") {
    for (const [key, val] of Object.entries(
      raw.terminologyOverrides as Record<string, unknown>,
    )) {
      if (typeof val === "string" && val.trim().length > 0) {
        terminologyMap[key] = val.trim();
      }
    }
  }

  const coaAccounts = Array.from(coaByCode.values()).sort((a, b) =>
    a.code.localeCompare(b.code),
  );

  const profile: WorkspaceIndustryProfile = {
    id: "dddddddd-dddd-4ddd-8ddd-dddddddd0001",
    workspaceId: WORKSPACE_ID,
    primaryPack,
    isHybridMultiUnit,
    activePrimitives: uniquePrimitives.map((prim) => ({
      primitive: prim,
      enabled: true,
      customLabels: { ...terminologyMap },
    })),
    kpiWidgets,
    terminologyMap,
    dimensions: Array.from(dimsByKey.values()),
    taxDefaults: {
      vatRegistered,
      defaultVatRegime,
      isProfessionalServices,
      includeStateConsumptionTax,
      defaultServiceChargeRate,
      defaultWhtCategory,
    },
    coaAccounts,
    updatedAt: "2026-11-12T09:00:00+00:00",
  };

  return { ok: true, profile };
}

const DEFAULT_INITIAL_PROFILE = (() => {
  const res = composeProfileFromRequest({
    primaryPack: "CUSTOM_COMPOSABLE",
    isHybridMultiUnit: false,
    primitives: ["POS_DAILY_CASHUP", "SKU_INVENTORY_COGS"],
  });
  if (!res.ok) {
    throw new Error("Invalid default pack seed");
  }
  return res.profile;
})();

const globalForPacks = globalThis as typeof globalThis & {
  __nairabooksPackProfile?: WorkspaceIndustryProfile;
};

function getStoredProfile(): WorkspaceIndustryProfile {
  if (!globalForPacks.__nairabooksPackProfile) {
    globalForPacks.__nairabooksPackProfile = DEFAULT_INITIAL_PROFILE;
  }
  return globalForPacks.__nairabooksPackProfile;
}

function getUpstreamBaseUrl(): string | null {
  const configured = process.env.NAIRABOOKS_API_URL?.trim();
  return configured && configured.length > 0 ? configured.replace(/\/$/, "") : null;
}

function upstreamHeaders(): Record<string, string> {
  return {
    "Content-Type": "application/json",
    "X-Workspace-Id": WORKSPACE_ID,
    "X-Actor-User-Id": ACTOR_USER_ID,
  };
}

export async function fetchPackWorkspace(): Promise<{
  status: number;
  body: PackWorkspacePayload | MutationError;
}> {
  const upstream = getUpstreamBaseUrl();
  if (upstream) {
    const [primRes, profRes] = await Promise.all([
      fetch(`${upstream}/api/v1/packs/primitives`, {
        method: "GET",
        headers: upstreamHeaders(),
        cache: "no-store",
      }),
      fetch(`${upstream}/api/v1/packs/profile`, {
        method: "GET",
        headers: upstreamHeaders(),
        cache: "no-store",
      }),
    ]);
    if (!profRes.ok) {
      return { status: profRes.status, body: (await profRes.json()) as MutationError };
    }
    const primJson = (await primRes.json()) as { items: PrimitiveCapabilitySpec[] };
    const profileJson = (await profRes.json()) as WorkspaceIndustryProfile;
    return {
      status: 200,
      body: {
        primitives: primJson.items,
        profile: profileJson,
      },
    };
  }

  return {
    status: 200,
    body: {
      primitives: [...PRIMITIVE_CATALOG],
      profile: getStoredProfile(),
    },
  };
}

export async function composePackPreviewViaBff(
  rawBody: string,
): Promise<{ status: number; body: WorkspaceIndustryProfile | MutationError }> {
  const upstream = getUpstreamBaseUrl();
  if (upstream) {
    const res = await fetch(`${upstream}/api/v1/packs/compose-preview`, {
      method: "POST",
      headers: upstreamHeaders(),
      body: rawBody,
      cache: "no-store",
    });
    return { status: res.status, body: (await res.json()) as WorkspaceIndustryProfile | MutationError };
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    return { status: 400, body: validationError("Request body must be valid JSON.", "json") };
  }
  const composed = composeProfileFromRequest(parsed);
  if (!composed.ok) {
    return { status: 400, body: composed.error };
  }
  return { status: 200, body: composed.profile };
}

export async function configureIndustryPackViaBff(
  rawBody: string,
): Promise<{ status: number; body: PackWorkspacePayload | MutationError }> {
  const upstream = getUpstreamBaseUrl();
  if (upstream) {
    const res = await fetch(`${upstream}/api/v1/packs/configure`, {
      method: "POST",
      headers: upstreamHeaders(),
      body: rawBody,
      cache: "no-store",
    });
    const json = (await res.json()) as WorkspaceIndustryProfile | MutationError;
    if (!res.ok) {
      return { status: res.status, body: json as MutationError };
    }
    return {
      status: 200,
      body: {
        primitives: [...PRIMITIVE_CATALOG],
        profile: json as WorkspaceIndustryProfile,
      },
    };
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    return { status: 400, body: validationError("Request body must be valid JSON.", "json") };
  }
  const composed = composeProfileFromRequest(parsed);
  if (!composed.ok) {
    return { status: 400, body: composed.error };
  }
  globalForPacks.__nairabooksPackProfile = composed.profile;
  return {
    status: 200,
    body: {
      primitives: [...PRIMITIVE_CATALOG],
      profile: composed.profile,
    },
  };
}

export const FLAGSHIP_PACK_CATALOG: readonly FlagshipPackPreset[] = [
  {
    packCode: "RETAIL_ECOMMERCE",
    title: "Retail & E-Commerce",
    plainEnglishSummary:
      "Run daily POS cash-ups (Paystack, Moniepoint, cash), track SKU stock on hand & COGS margins, and collect 7.5% NRS VAT cleanly.",
    targetSectors: ["Supermarkets & Mini-marts", "Pharmacies", "Fashion & Online Shops"],
    recommendedPrimitives: ["POS_DAILY_CASHUP", "SKU_INVENTORY_COGS"],
    terminologyDefaults: {
      customer: "Shopper",
      invoice: "POS Sales Receipt",
      item: "Retail SKU",
    },
    taxHighlights: [
      "Automatic 7.5% Output VAT split on POS Z-reports",
      "Merchant MDR clearing charges isolated from gross sales",
    ],
    phaseStatus: "ACTIVE_PHASE_1",
  },
  {
    packCode: "WHOLESALE_DISTRIBUTION",
    title: "Wholesale & Distribution",
    plainEnglishSummary:
      "Manage depot stock transfers, vendor purchase orders, clearing/freight landed costs (IAS 2), and reseller gross margin per tier.",
    targetSectors: ["FMCG Distributors", "Importers & Depots", "B2B Trade Suppliers"],
    recommendedPrimitives: ["MULTI_TIER_WAREHOUSE_PO", "SKU_INVENTORY_COGS"],
    terminologyDefaults: {
      customer: "Distributor / Trade Buyer",
      invoice: "Wholesale Waybill Invoice",
      location: "Regional Depot",
    },
    taxHighlights: [
      "Goods-in-Transit clearing & freight capitalized under IAS 2",
      "WHT goods-supply tracking for corporate trade vendors",
    ],
    phaseStatus: "ACTIVE_PHASE_1",
  },
  {
    packCode: "MANUFACTURING_LIGHT",
    title: "Manufacturing (Light / Small Scale)",
    plainEnglishSummary:
      "Track Bills of Materials (BOM), factory conversion into WIP, finished-goods unit costs, and production yield/scrap variances.",
    targetSectors: ["Bakeries & Food Processing", "Cosmetics & Packaging", "Light Assembly"],
    recommendedPrimitives: ["BILL_OF_MATERIALS_WIP", "SKU_INVENTORY_COGS"],
    terminologyDefaults: {
      work_order: "Production Batch",
      item: "Finished SKU / Raw Input",
      project: "Factory Batch",
    },
    taxHighlights: [
      "Raw-material-to-WIP-to-Finished-Goods cost roll-up under IAS 2",
      "Yield & scrap variance posted transparently to COGS",
    ],
    phaseStatus: "ACTIVE_PHASE_1",
  },
  {
    packCode: "CONSTRUCTION_TRADES",
    title: "Construction & Trades",
    plainEnglishSummary:
      "Track project job sites, certified valuation progress, retention receivable, and 2%/5% subcontractor Withholding Tax.",
    targetSectors: ["Civil & Building Contractors", "Solar/MEP Installers", "Real Estate"],
    recommendedPrimitives: ["JOB_COSTING_RETENTION"],
    terminologyDefaults: {
      project: "Construction Site",
      vendor: "Subcontractor",
      invoice: "Valuation Certificate",
    },
    taxHighlights: [
      "2%/5% Construction WHT with No-TIN 2x enforcement",
      "Contract retention receivable tracked separately from current AR",
    ],
    phaseStatus: "ACTIVE_PHASE_2",
  },
  {
    packCode: "PROFESSIONAL_SERVICES",
    title: "Professional & Consulting Services",
    plainEnglishSummary:
      "Manage client engagements, unbilled advisory WIP, retainer billing, WHT credit notes, and Nigeria Tax Act 2025 CIT notices.",
    targetSectors: ["Law & Accounting Practices", "Software/IT Studios", "Agencies"],
    recommendedPrimitives: ["TIME_RETAINER_BILLING"],
    terminologyDefaults: {
      customer: "Client",
      product: "Advisory Retainer",
      project: "Engagement Code",
    },
    taxHighlights: [
      "Nigeria Tax Act 2025 small-company 0% CIT exclusion notice active",
      "5%/10% Consulting WHT credit-note receivable ledger tracking",
    ],
    phaseStatus: "ACTIVE_PHASE_2",
  },
  {
    packCode: "NON_PROFIT",
    title: "Non-Profit Organizations & NGOs",
    plainEnglishSummary:
      "Separate donor-restricted grant funds from unrestricted operating income and monitor grant burn rates against budgets.",
    targetSectors: ["NGOs & Foundations", "Faith-Based Orgs", "Donor-Funded Initiatives"],
    recommendedPrimitives: ["FUND_GRANT_ACCOUNTING"],
    terminologyDefaults: {
      customer: "Donor / Grantmaker",
      invoice: "Grant Tranche Receipt",
      project: "Donor Program",
    },
    taxHighlights: [
      "VAT-exempt grant accounting default & charitable CIT status banner",
      "Program-level restricted net asset separation",
    ],
    phaseStatus: "ACTIVE_PHASE_2",
  },
];

function divRoundHalfUp(numerator: bigint, denominator: bigint): bigint {
  if (denominator <= 0n) {
    throw new Error("Denominator must be positive.");
  }
  const quotient = numerator / denominator;
  const remainder = numerator % denominator;
  return remainder * 2n >= denominator ? quotient + 1n : quotient;
}

function formatBasisPct(pctScaledBy100: bigint): string {
  const sign = pctScaledBy100 < 0n ? "-" : "";
  const abs = pctScaledBy100 < 0n ? -pctScaledBy100 : pctScaledBy100;
  const whole = abs / 100n;
  const frac = (abs % 100n).toString().padStart(2, "0");
  return `${sign}${whole}.${frac}`;
}

function pctOfKobo(amountKobo: bigint, pctScaledBy100: bigint): bigint {
  return divRoundHalfUp(amountKobo * pctScaledBy100, 10_000n);
}

function safeParseKobo(raw: unknown, field: string, fallback = "0.00"): { ok: true; kobo: bigint } | { ok: false; error: MutationError } {
  const value = raw === undefined ? fallback : raw;
  if (typeof value !== "string" && typeof value !== "number") {
    return { ok: false, error: validationError(`Field '${field}' must be a fixed decimal string.`, field) };
  }
  try {
    return { ok: true, kobo: parseMoneyToKobo(String(value)) };
  } catch (err) {
    const msg = err instanceof Error ? err.message : `Invalid money value for '${field}'.`;
    return { ok: false, error: validationError(msg, field) };
  }
}

export async function fetchFlagshipsViaBff(): Promise<{
  status: number;
  body: { items: FlagshipPackPreset[] } | MutationError;
}> {
  const upstream = getUpstreamBaseUrl();
  if (upstream) {
    const res = await fetch(`${upstream}/api/v1/packs/flagships`, {
      method: "GET",
      headers: upstreamHeaders(),
      cache: "no-store",
    });
    return { status: res.status, body: (await res.json()) as { items: FlagshipPackPreset[] } | MutationError };
  }
  return { status: 200, body: { items: [...FLAGSHIP_PACK_CATALOG] } };
}

export async function applyFlagshipPackViaBff(
  rawBody: string,
): Promise<{ status: number; body: PackWorkspacePayload | MutationError }> {
  const upstream = getUpstreamBaseUrl();
  if (upstream) {
    const res = await fetch(`${upstream}/api/v1/packs/flagships/apply`, {
      method: "POST",
      headers: upstreamHeaders(),
      body: rawBody,
      cache: "no-store",
    });
    const json = (await res.json()) as WorkspaceIndustryProfile | MutationError;
    if (!res.ok) {
      return { status: res.status, body: json as MutationError };
    }
    return {
      status: 200,
      body: {
        primitives: [...PRIMITIVE_CATALOG],
        profile: json as WorkspaceIndustryProfile,
      },
    };
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    return { status: 400, body: validationError("Request body must be valid JSON.", "json") };
  }
  const packCode = typeof parsed.packCode === "string" ? parsed.packCode : "";
  const preset = FLAGSHIP_PACK_CATALOG.find((item) => item.packCode === packCode);
  if (!preset) {
    return {
      status: 400,
      body: validationError(`Unknown or non-flagship packCode '${packCode}'.`, "packCode"),
    };
  }
  const overrides =
    parsed.terminologyOverrides && typeof parsed.terminologyOverrides === "object"
      ? { ...preset.terminologyDefaults, ...(parsed.terminologyOverrides as Record<string, unknown>) }
      : preset.terminologyDefaults;

  return configureIndustryPackViaBff(
    JSON.stringify({
      primaryPack: preset.packCode,
      isHybridMultiUnit: false,
      primitives: preset.recommendedPrimitives,
      terminologyOverrides: overrides,
    }),
  );
}

export async function postPackOperationViaBff(
  rawBody: string,
): Promise<{ status: number; body: PackOperationPostResult | MutationError }> {
  const upstream = getUpstreamBaseUrl();
  if (upstream) {
    const res = await fetch(`${upstream}/api/v1/packs/operations/post`, {
      method: "POST",
      headers: upstreamHeaders(),
      body: rawBody,
      cache: "no-store",
    });
    const json = (await res.json()) as {
      voucher?: { reference?: string; postingDate?: string; lines?: { accountCode: string; accountName: string; debitAmount: string; creditAmount: string; memo?: string }[] };
      summary?: string;
      metrics?: Record<string, string>;
    } & Partial<MutationError>;
    if (!res.ok) {
      return { status: res.status, body: json as MutationError };
    }
    const opTypeForUpstream = (
      JSON.parse(rawBody) as { operationType?: PackOperationType }
    ).operationType ?? "RETAIL_POS_CASHUP";
    return {
      status: res.status,
      body: {
        operationType: opTypeForUpstream,
        reference: json.voucher?.reference ?? "",
        postingDate: json.voucher?.postingDate ?? "",
        summary: json.summary ?? "",
        metrics: json.metrics ?? {},
        lines: (json.voucher?.lines ?? []).map((l) => ({
          accountCode: l.accountCode,
          accountName: l.accountName,
          debitNgn: l.debitAmount,
          creditNgn: l.creditAmount,
          memo: l.memo ?? "",
        })),
      },
    };
  }

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    return { status: 400, body: validationError("Request body must be valid JSON.", "json") };
  }

  const opType = typeof body.operationType === "string" ? (body.operationType as PackOperationType) : "";
  const postingDate = typeof body.postingDate === "string" ? body.postingDate : "2026-06-01";
  const reference = typeof body.reference === "string" ? body.reference.trim() : "";
  const payload = body.payload && typeof body.payload === "object"
    ? (body.payload as Record<string, unknown>)
    : null;

  if (!reference) {
    return { status: 400, body: validationError("Operation reference is required.", "reference") };
  }
  if (!payload) {
    return { status: 400, body: validationError("Field 'payload' must be an object.", "payload") };
  }

  if (opType === "RETAIL_POS_CASHUP") {
    const grossR = safeParseKobo(payload.grossSalesNgn, "grossSalesNgn");
    const cashR = safeParseKobo(payload.cashTenderNgn, "cashTenderNgn", "0.00");
    const cardR = safeParseKobo(payload.posCardTenderNgn, "posCardTenderNgn", "0.00");
    const mdrR = safeParseKobo(payload.posMdrFeeNgn, "posMdrFeeNgn", "0.00");
    const cogsR = safeParseKobo(payload.cogsNgn, "cogsNgn", "0.00");
    for (const r of [grossR, cashR, cardR, mdrR, cogsR]) {
      if (!r.ok) return { status: 400, body: r.error };
    }
    if (!grossR.ok || !cashR.ok || !cardR.ok || !mdrR.ok || !cogsR.ok) {
      return { status: 400, body: validationError("Invalid monetary amount.", "payload") };
    }
    const gross = grossR.kobo;
    const cash = cashR.kobo;
    const card = cardR.kobo;
    const mdr = mdrR.kobo;
    const cogs = cogsR.kobo;

    if (gross <= 0n) {
      return { status: 400, body: validationError("Gross POS sales must be greater than zero.", "grossSalesNgn") };
    }
    if (cash + card !== gross) {
      return {
        status: 400,
        body: validationError(
          `Cash tender (${formatKobo(cash)}) + POS card tender (${formatKobo(card)}) must equal gross sales (${formatKobo(gross)}).`,
          "cashTenderNgn",
        ),
      };
    }
    if (mdr > card) {
      return { status: 400, body: validationError("POS MDR settlement fee cannot exceed POS card tender.", "posMdrFeeNgn") };
    }

    const vatInclusive = typeof payload.vatInclusive === "boolean" ? payload.vatInclusive : true;
    const netRevenue = vatInclusive ? divRoundHalfUp(gross * 1000n, 1075n) : gross;
    const vatAmount = vatInclusive ? gross - netRevenue : 0n;
    const netPosClearing = card - mdr;
    const grossMargin = netRevenue - cogs;

    const lines: PackPlannedLine[] = [];
    if (cash > 0n) {
      lines.push({ accountCode: "1010", accountName: "Zenith Bank Current (NGN)", debitNgn: formatKobo(cash), creditNgn: "0.00", memo: `Cash till receipts (${reference})` });
    }
    if (netPosClearing > 0n) {
      lines.push({ accountCode: "1210", accountName: "POS Terminal Settlement Clearing", debitNgn: formatKobo(netPosClearing), creditNgn: "0.00", memo: `Net POS terminal receivable (${reference})` });
    }
    if (mdr > 0n) {
      lines.push({ accountCode: "5010", accountName: "POS & Merchant Charges", debitNgn: formatKobo(mdr), creditNgn: "0.00", memo: `POS terminal MDR merchant fee (${reference})` });
    }
    lines.push({ accountCode: "4020", accountName: "Retail POS Sales Revenue", debitNgn: "0.00", creditNgn: formatKobo(netRevenue), memo: `Retail POS sales net of VAT (${reference})` });
    if (vatAmount > 0n) {
      lines.push({ accountCode: "2010", accountName: "NRS Output VAT Payable (7.5%)", debitNgn: "0.00", creditNgn: formatKobo(vatAmount), memo: `NRS Output VAT 7.5% (${reference})` });
    }
    if (cogs > 0n) {
      lines.push({ accountCode: "5020", accountName: "Cost of Goods Sold (Merchandise)", debitNgn: formatKobo(cogs), creditNgn: "0.00", memo: `Cost of goods sold (${reference})` });
      lines.push({ accountCode: "1310", accountName: "Merchandise Inventory (IAS 2)", debitNgn: "0.00", creditNgn: formatKobo(cogs), memo: `SKU inventory drawdown (${reference})` });
    }

    return {
      status: 201,
      body: {
        operationType: "RETAIL_POS_CASHUP",
        reference,
        postingDate,
        summary: `POS cash-up ${reference}: net sales ₦${formatKobo(netRevenue)}, VAT ₦${formatKobo(vatAmount)}, gross margin ₦${formatKobo(grossMargin)}.`,
        metrics: {
          grossSalesNgn: formatKobo(gross),
          netRevenueNgn: formatKobo(netRevenue),
          vatAmountNgn: formatKobo(vatAmount),
          netPosClearingNgn: formatKobo(netPosClearing),
          mdrFeeNgn: formatKobo(mdr),
          cogsNgn: formatKobo(cogs),
          grossMarginNgn: formatKobo(grossMargin),
        },
        lines,
      },
    };
  }

  if (opType === "WHOLESALE_LANDED_RECEIPT") {
    const units = typeof payload.unitsReceived === "number" && Number.isInteger(payload.unitsReceived) ? payload.unitsReceived : 0;
    if (units <= 0) {
      return { status: 400, body: validationError("Units received must be a positive integer.", "unitsReceived") };
    }
    const supR = safeParseKobo(payload.supplierInvoiceNgn, "supplierInvoiceNgn");
    const frR = safeParseKobo(payload.freightAndClearingNgn, "freightAndClearingNgn", "0.00");
    const sellR = safeParseKobo(payload.sellingPricePerUnitNgn, "sellingPricePerUnitNgn");
    if (!supR.ok) return { status: 400, body: supR.error };
    if (!frR.ok) return { status: 400, body: frR.error };
    if (!sellR.ok) return { status: 400, body: sellR.error };

    if (supR.kobo <= 0n || sellR.kobo <= 0n) {
      return { status: 400, body: validationError("Supplier cost and selling price must be greater than zero.", "supplierInvoiceNgn") };
    }
    const totalLanded = supR.kobo + frR.kobo;
    const unitLanded = divRoundHalfUp(totalLanded, BigInt(units));
    const marginScaled = divRoundHalfUp((sellR.kobo - unitLanded) * 10_000n, sellR.kobo);

    const lines: PackPlannedLine[] = [
      { accountCode: "1320", accountName: "Goods-in-Transit & Warehouse Stock", debitNgn: formatKobo(supR.kobo), creditNgn: "0.00", memo: `Goods-in-transit supplier invoice (${reference})` },
    ];
    if (frR.kobo > 0n) {
      lines.push({ accountCode: "5030", accountName: "Clearing, Freight & Landed Duty", debitNgn: formatKobo(frR.kobo), creditNgn: "0.00", memo: `Freight, port clearing & haulage (${reference})` });
    }
    lines.push({ accountCode: "1010", accountName: "Zenith Bank Current (NGN)", debitNgn: "0.00", creditNgn: formatKobo(totalLanded), memo: `Settlement of wholesale stock & clearing (${reference})` });
    lines.push({ accountCode: "1310", accountName: "Merchandise Inventory (IAS 2)", debitNgn: formatKobo(totalLanded), creditNgn: "0.00", memo: `IAS 2 landed stock capitalization (${units} units, ${reference})` });
    lines.push({ accountCode: "1320", accountName: "Goods-in-Transit & Warehouse Stock", debitNgn: "0.00", creditNgn: formatKobo(supR.kobo), memo: `Transfer goods-in-transit into warehouse stock (${reference})` });
    if (frR.kobo > 0n) {
      lines.push({ accountCode: "5030", accountName: "Clearing, Freight & Landed Duty", debitNgn: "0.00", creditNgn: formatKobo(frR.kobo), memo: `Absorb landed clearing & freight into SKU cost (${reference})` });
    }

    return {
      status: 201,
      body: {
        operationType: "WHOLESALE_LANDED_RECEIPT",
        reference,
        postingDate,
        summary: `Wholesale receipt ${reference}: ${units} units landed at ₦${formatKobo(unitLanded)}/unit (margin ${formatBasisPct(marginScaled)}%).`,
        metrics: {
          unitsReceived: String(units),
          supplierInvoiceNgn: formatKobo(supR.kobo),
          freightAndClearingNgn: formatKobo(frR.kobo),
          totalLandedCostNgn: formatKobo(totalLanded),
          unitLandedCostNgn: formatKobo(unitLanded),
          projectedGrossMarginPct: formatBasisPct(marginScaled),
        },
        lines,
      },
    };
  }

  if (opType === "MANUFACTURING_BOM_RUN") {
    const units = typeof payload.unitsProduced === "number" && Number.isInteger(payload.unitsProduced) ? payload.unitsProduced : 0;
    if (units <= 0) {
      return { status: 400, body: validationError("Units produced must be a positive integer.", "unitsProduced") };
    }
    const rawR = safeParseKobo(payload.rawMaterialsIssuedNgn, "rawMaterialsIssuedNgn");
    const convR = safeParseKobo(payload.directConversionCostNgn, "directConversionCostNgn", "0.00");
    const scrapR = safeParseKobo(payload.scrapSpoilageNgn, "scrapSpoilageNgn", "0.00");
    if (!rawR.ok) return { status: 400, body: rawR.error };
    if (!convR.ok) return { status: 400, body: convR.error };
    if (!scrapR.ok) return { status: 400, body: scrapR.error };

    if (rawR.kobo <= 0n) {
      return { status: 400, body: validationError("Raw materials issued must be greater than zero.", "rawMaterialsIssuedNgn") };
    }
    const totalWip = rawR.kobo + convR.kobo;
    if (scrapR.kobo >= totalWip) {
      return { status: 400, body: validationError("Scrap/spoilage cannot consume 100% or more of total WIP cost.", "scrapSpoilageNgn") };
    }
    const finished = totalWip - scrapR.kobo;
    const unitCost = divRoundHalfUp(finished, BigInt(units));
    const yieldScaled = divRoundHalfUp(finished * 10_000n, totalWip);

    const lines: PackPlannedLine[] = [
      { accountCode: "1340", accountName: "Work-in-Progress (WIP) Production", debitNgn: formatKobo(totalWip), creditNgn: "0.00", memo: `Issue raw inputs & conversion to WIP (${reference})` },
      { accountCode: "1330", accountName: "Raw Materials Inventory", debitNgn: "0.00", creditNgn: formatKobo(rawR.kobo), memo: `Raw material store issue (${reference})` },
    ];
    if (convR.kobo > 0n) {
      lines.push({ accountCode: "1010", accountName: "Zenith Bank Current (NGN)", debitNgn: "0.00", creditNgn: formatKobo(convR.kobo), memo: `Direct factory labor/power absorbed (${reference})` });
    }
    lines.push({ accountCode: "1310", accountName: "Merchandise Inventory (IAS 2)", debitNgn: formatKobo(finished), creditNgn: "0.00", memo: `Completed finished goods to store (${units} units, ${reference})` });
    if (scrapR.kobo > 0n) {
      lines.push({ accountCode: "5040", accountName: "Production Scrap & Yield Variance", debitNgn: formatKobo(scrapR.kobo), creditNgn: "0.00", memo: `Production yield/scrap variance (${reference})` });
    }
    lines.push({ accountCode: "1340", accountName: "Work-in-Progress (WIP) Production", debitNgn: "0.00", creditNgn: formatKobo(totalWip), memo: `Clear WIP on BOM batch completion (${reference})` });

    return {
      status: 201,
      body: {
        operationType: "MANUFACTURING_BOM_RUN",
        reference,
        postingDate,
        summary: `BOM batch ${reference}: produced ${units} units at ₦${formatKobo(unitCost)}/unit (yield ${formatBasisPct(yieldScaled)}%).`,
        metrics: {
          unitsProduced: String(units),
          rawMaterialsIssuedNgn: formatKobo(rawR.kobo),
          directConversionCostNgn: formatKobo(convR.kobo),
          scrapSpoilageNgn: formatKobo(scrapR.kobo),
          finishedGoodsCostNgn: formatKobo(finished),
          unitCostNgn: formatKobo(unitCost),
          yieldPct: formatBasisPct(yieldScaled),
        },
        lines,
      },
    };
  }

  if (opType === "CONSTRUCTION_JOB_PROGRESS") {
    const projectSite = typeof payload.projectSite === "string" ? payload.projectSite.trim() : "";
    if (!projectSite) {
      return { status: 400, body: validationError("Project site is required.", "projectSite") };
    }
    const valR = safeParseKobo(payload.certifiedValuationNgn, "certifiedValuationNgn", "0.00");
    const cRetR = safeParseKobo(payload.clientRetentionPct, "clientRetentionPct", "5.00");
    const matR = safeParseKobo(payload.materialsIssuedNgn, "materialsIssuedNgn", "0.00");
    const subR = safeParseKobo(payload.subcontractorClaimNgn, "subcontractorClaimNgn", "0.00");
    const sRetR = safeParseKobo(payload.subcontractorRetentionPct, "subcontractorRetentionPct", "5.00");
    const sWhtR = safeParseKobo(payload.subcontractorWhtRatePct, "subcontractorWhtRatePct", "2.00");
    for (const r of [valR, cRetR, matR, subR, sRetR, sWhtR]) {
      if (!r.ok) return { status: 400, body: r.error };
    }
    if (!valR.ok || !cRetR.ok || !matR.ok || !subR.ok || !sRetR.ok || !sWhtR.ok) {
      return { status: 400, body: validationError("Invalid monetary amount.", "payload") };
    }
    if (valR.kobo < 0n || matR.kobo < 0n || subR.kobo < 0n) {
      return { status: 400, body: validationError("Construction amounts cannot be negative.", "certifiedValuationNgn") };
    }
    if (valR.kobo === 0n && matR.kobo === 0n && subR.kobo === 0n) {
      return { status: 400, body: validationError("Provide a certified valuation, site material issue, or subcontractor claim.", "certifiedValuationNgn") };
    }
    if (cRetR.kobo < 0n || cRetR.kobo > 5000n || sRetR.kobo < 0n || sRetR.kobo > 5000n) {
      return { status: 400, body: validationError("Retention percentage must be between 0% and 50%.", "clientRetentionPct") };
    }
    if (subR.kobo > 0n && sWhtR.kobo !== 200n && sWhtR.kobo !== 500n) {
      return { status: 400, body: validationError("Construction subcontractor WHT rate must be 2.00% or 5.00%.", "subcontractorWhtRatePct") };
    }

    const hasTin = typeof payload.subcontractorHasTin === "boolean" ? payload.subcontractorHasTin : true;
    const lines: PackPlannedLine[] = [];
    let clientRetention = 0n;
    if (valR.kobo > 0n) {
      clientRetention = pctOfKobo(valR.kobo, cRetR.kobo);
      const netClientCash = valR.kobo - clientRetention;
      if (netClientCash > 0n) {
        lines.push({ accountCode: "1010", accountName: "Zenith Bank Current (NGN)", debitNgn: formatKobo(netClientCash), creditNgn: "0.00", memo: `Certified progress receipt for ${projectSite} (${reference})` });
      }
      if (clientRetention > 0n) {
        lines.push({ accountCode: "1140", accountName: "Contract Retention Receivable", debitNgn: formatKobo(clientRetention), creditNgn: "0.00", memo: `Client retention receivable on ${projectSite} (${reference})` });
      }
      lines.push({ accountCode: "4070", accountName: "Construction Contract Valuation Revenue", debitNgn: "0.00", creditNgn: formatKobo(valR.kobo), memo: `Construction valuation revenue on ${projectSite} (${reference})` });
    }
    if (matR.kobo > 0n) {
      lines.push({ accountCode: "5050", accountName: "Subcontractor & Site Direct Costs", debitNgn: formatKobo(matR.kobo), creditNgn: "0.00", memo: `Direct materials issued to ${projectSite} (${reference})` });
      lines.push({ accountCode: "1010", accountName: "Zenith Bank Current (NGN)", debitNgn: "0.00", creditNgn: formatKobo(matR.kobo), memo: `Settlement for site materials on ${projectSite} (${reference})` });
    }
    let noTinDoubled = false;
    let effectiveWhtPct = sWhtR.kobo;
    let subWht = 0n;
    let subRetention = 0n;
    if (subR.kobo > 0n) {
      if (!hasTin) {
        noTinDoubled = true;
        effectiveWhtPct = sWhtR.kobo * 2n;
      }
      subWht = pctOfKobo(subR.kobo, effectiveWhtPct);
      subRetention = pctOfKobo(subR.kobo, sRetR.kobo);
      const netSubCash = subR.kobo - subWht - subRetention;
      if (netSubCash < 0n) {
        return { status: 400, body: validationError("Subcontractor WHT and retention exceed gross claim.", "subcontractorClaimNgn") };
      }
      lines.push({ accountCode: "5050", accountName: "Subcontractor & Site Direct Costs", debitNgn: formatKobo(subR.kobo), creditNgn: "0.00", memo: `Subcontractor certified work on ${projectSite} (${reference})` });
      if (subWht > 0n) {
        lines.push({ accountCode: "2120", accountName: "Withholding Tax Payable", debitNgn: "0.00", creditNgn: formatKobo(subWht), memo: `Subcontractor WHT payable (${formatBasisPct(effectiveWhtPct)}%, ${reference})` });
      }
      if (subRetention > 0n) {
        lines.push({ accountCode: "2150", accountName: "Subcontractor Retention Payable", debitNgn: "0.00", creditNgn: formatKobo(subRetention), memo: `Subcontractor retention withheld on ${projectSite} (${reference})` });
      }
      if (netSubCash > 0n) {
        lines.push({ accountCode: "1010", accountName: "Zenith Bank Current (NGN)", debitNgn: "0.00", creditNgn: formatKobo(netSubCash), memo: `Net subcontractor payment on ${projectSite} (${reference})` });
      }
    }

    const totalCost = matR.kobo + subR.kobo;
    const jobMargin = valR.kobo - totalCost;
    const marginScaled = valR.kobo > 0n
      ? (jobMargin >= 0n
          ? divRoundHalfUp(jobMargin * 10_000n, valR.kobo)
          : -divRoundHalfUp((-jobMargin) * 10_000n, valR.kobo))
      : 0n;

    return {
      status: 201,
      body: {
        operationType: "CONSTRUCTION_JOB_PROGRESS",
        reference,
        postingDate,
        summary: `Site ${projectSite} (${reference}): valuation ₦${formatKobo(valR.kobo)}, site cost ₦${formatKobo(totalCost)}, WHT ₦${formatKobo(subWht)} (${formatBasisPct(effectiveWhtPct)}%), job margin ₦${formatKobo(jobMargin)}.`,
        metrics: {
          projectSite,
          certifiedValuationNgn: formatKobo(valR.kobo),
          clientRetentionNgn: formatKobo(clientRetention),
          materialsIssuedNgn: formatKobo(matR.kobo),
          subcontractorClaimNgn: formatKobo(subR.kobo),
          subcontractorRetentionNgn: formatKobo(subRetention),
          subcontractorWhtNgn: formatKobo(subWht),
          effectiveWhtRatePct: formatBasisPct(effectiveWhtPct),
          noTinDoublingApplied: noTinDoubled ? "true" : "false",
          totalSiteCostNgn: formatKobo(totalCost),
          jobMarginNgn: formatKobo(jobMargin),
          jobMarginPct: formatBasisPct(marginScaled),
        },
        lines,
      },
    };
  }

  if (opType === "PROFESSIONAL_TIME_BILLING") {
    const engagementCode = typeof payload.engagementCode === "string" ? payload.engagementCode.trim() : "";
    if (!engagementCode) {
      return { status: 400, body: validationError("Engagement code is required.", "engagementCode") };
    }
    const hrsR = safeParseKobo(payload.billableHours, "billableHours");
    const rateR = safeParseKobo(payload.hourlyRateNgn, "hourlyRateNgn");
    const feeR = safeParseKobo(payload.billedFeeNgn, "billedFeeNgn");
    const retR = safeParseKobo(payload.retainerAppliedNgn, "retainerAppliedNgn", "0.00");
    const reimbR = safeParseKobo(payload.reimbursableExpenseNgn, "reimbursableExpenseNgn", "0.00");
    const whtR = safeParseKobo(payload.whtRatePct, "whtRatePct", "5.00");
    for (const r of [hrsR, rateR, feeR, retR, reimbR, whtR]) {
      if (!r.ok) return { status: 400, body: r.error };
    }
    if (!hrsR.ok || !rateR.ok || !feeR.ok || !retR.ok || !reimbR.ok || !whtR.ok) {
      return { status: 400, body: validationError("Invalid monetary amount.", "payload") };
    }
    if (hrsR.kobo <= 0n || rateR.kobo <= 0n || feeR.kobo <= 0n) {
      return { status: 400, body: validationError("Billable hours, hourly rate, and billed fee must be positive.", "billedFeeNgn") };
    }
    if (retR.kobo < 0n || reimbR.kobo < 0n) {
      return { status: 400, body: validationError("Retainer and reimbursable expenses cannot be negative.", "retainerAppliedNgn") };
    }
    if (whtR.kobo !== 0n && whtR.kobo !== 500n && whtR.kobo !== 1000n) {
      return { status: 400, body: validationError("Professional services WHT rate must be 0.00%, 5.00%, or 10.00%.", "whtRatePct") };
    }

    const vatApplicable = typeof payload.vatApplicable === "boolean" ? payload.vatApplicable : true;
    const standardValue = divRoundHalfUp(hrsR.kobo * rateR.kobo, 100n);
    const realizationScaled = divRoundHalfUp(feeR.kobo * 10_000n, standardValue);
    const vatAmount = vatApplicable ? pctOfKobo(feeR.kobo, 750n) : 0n;
    const whtCredit = pctOfKobo(feeR.kobo, whtR.kobo);
    const grossInvoice = feeR.kobo + vatAmount + reimbR.kobo;
    const netCash = grossInvoice - whtCredit - retR.kobo;
    if (netCash < 0n) {
      return { status: 400, body: validationError("Retainer applied and WHT credit cannot exceed total client invoice.", "retainerAppliedNgn") };
    }

    const lines: PackPlannedLine[] = [];
    if (reimbR.kobo > 0n) {
      lines.push({ accountCode: "1130", accountName: "Unbilled Work-in-Progress (Advisory)", debitNgn: formatKobo(reimbR.kobo), creditNgn: "0.00", memo: `Client reimbursable expense incurred for ${engagementCode} (${reference})` });
      lines.push({ accountCode: "1010", accountName: "Zenith Bank Current (NGN)", debitNgn: "0.00", creditNgn: formatKobo(reimbR.kobo), memo: `Out-of-pocket disbursement for ${engagementCode} (${reference})` });
    }
    if (netCash > 0n) {
      lines.push({ accountCode: "1010", accountName: "Zenith Bank Current (NGN)", debitNgn: formatKobo(netCash), creditNgn: "0.00", memo: `Net advisory settlement received for ${engagementCode} (${reference})` });
    }
    if (retR.kobo > 0n) {
      lines.push({ accountCode: "2160", accountName: "Client Retainer & Unearned Fees", debitNgn: formatKobo(retR.kobo), creditNgn: "0.00", memo: `Drawdown client retainer deposit on ${engagementCode} (${reference})` });
    }
    if (whtCredit > 0n) {
      lines.push({ accountCode: "1150", accountName: "WHT Credit Note Receivable", debitNgn: formatKobo(whtCredit), creditNgn: "0.00", memo: `Client WHT credit note receivable (${formatBasisPct(whtR.kobo)}%, ${reference})` });
    }
    lines.push({ accountCode: "4030", accountName: "Professional Fees & Retainer Income", debitNgn: "0.00", creditNgn: formatKobo(feeR.kobo), memo: `Advisory fee revenue for ${engagementCode} (${reference})` });
    if (vatAmount > 0n) {
      lines.push({ accountCode: "2010", accountName: "NRS Output VAT Payable (7.5%)", debitNgn: "0.00", creditNgn: formatKobo(vatAmount), memo: `NRS Output VAT 7.5% on ${engagementCode} (${reference})` });
    }
    if (reimbR.kobo > 0n) {
      lines.push({ accountCode: "1130", accountName: "Unbilled Work-in-Progress (Advisory)", debitNgn: "0.00", creditNgn: formatKobo(reimbR.kobo), memo: `Reimbursable expense recovered from client (${reference})` });
    }

    return {
      status: 201,
      body: {
        operationType: "PROFESSIONAL_TIME_BILLING",
        reference,
        postingDate,
        summary: `Engagement ${engagementCode} (${reference}): billed ₦${formatKobo(feeR.kobo)} (${formatBasisPct(realizationScaled)}% realization), WHT credit ₦${formatKobo(whtCredit)}; NTA 2025 non-exempt CIT applies.`,
        metrics: {
          engagementCode,
          standardTimeValueNgn: formatKobo(standardValue),
          billedFeeNgn: formatKobo(feeR.kobo),
          realizationRatePct: formatBasisPct(realizationScaled),
          retainerAppliedNgn: formatKobo(retR.kobo),
          reimbursableExpenseNgn: formatKobo(reimbR.kobo),
          vatAmountNgn: formatKobo(vatAmount),
          whtCreditNgn: formatKobo(whtCredit),
          netCashCollectedNgn: formatKobo(netCash),
          citStatusNotice: "NON_EXEMPT_NTA_2025_CIT_APPLIES",
        },
        lines,
      },
    };
  }

  if (opType === "NONPROFIT_GRANT_ACTIVITY") {
    const donorFundName = typeof payload.donorFundName === "string" ? payload.donorFundName.trim() : "";
    if (!donorFundName) {
      return { status: 400, body: validationError("Donor fund name is required.", "donorFundName") };
    }
    const restriction = typeof payload.fundRestriction === "string" ? payload.fundRestriction.trim().toUpperCase() : "";
    if (restriction !== "RESTRICTED" && restriction !== "UNRESTRICTED") {
      return { status: 400, body: validationError("Fund restriction must be 'RESTRICTED' or 'UNRESTRICTED'.", "fundRestriction") };
    }
    const budR = safeParseKobo(payload.approvedBudgetNgn, "approvedBudgetNgn");
    const trR = safeParseKobo(payload.trancheReceivedNgn, "trancheReceivedNgn", "0.00");
    const spR = safeParseKobo(payload.programSpendNgn, "programSpendNgn", "0.00");
    const prR = safeParseKobo(payload.priorSpendNgn, "priorSpendNgn", "0.00");
    for (const r of [budR, trR, spR, prR]) {
      if (!r.ok) return { status: 400, body: r.error };
    }
    if (!budR.ok || !trR.ok || !spR.ok || !prR.ok) {
      return { status: 400, body: validationError("Invalid monetary amount.", "payload") };
    }
    if (budR.kobo <= 0n || trR.kobo < 0n || spR.kobo < 0n || prR.kobo < 0n) {
      return { status: 400, body: validationError("Budget must be positive and grant amounts cannot be negative.", "approvedBudgetNgn") };
    }
    if (trR.kobo === 0n && spR.kobo === 0n) {
      return { status: 400, body: validationError("Provide either a donor tranche receipt or program expenditure.", "trancheReceivedNgn") };
    }

    const lines: PackPlannedLine[] = [];
    let restrictedDelta = 0n;
    if (restriction === "RESTRICTED") {
      if (trR.kobo > 0n) {
        lines.push({ accountCode: "1010", accountName: "Zenith Bank Current (NGN)", debitNgn: formatKobo(trR.kobo), creditNgn: "0.00", memo: `Restricted donor grant tranche for ${donorFundName} (${reference})` });
        lines.push({ accountCode: "3200", accountName: "Restricted Donor Grant Funds", debitNgn: "0.00", creditNgn: formatKobo(trR.kobo), memo: `Increase restricted net assets for ${donorFundName} (${reference})` });
      }
      if (spR.kobo > 0n) {
        lines.push({ accountCode: "5090", accountName: "Donor Program & Grant Disbursements", debitNgn: formatKobo(spR.kobo), creditNgn: "0.00", memo: `Restricted program disbursement for ${donorFundName} (${reference})` });
        lines.push({ accountCode: "1010", accountName: "Zenith Bank Current (NGN)", debitNgn: "0.00", creditNgn: formatKobo(spR.kobo), memo: `Cash disbursed for ${donorFundName} program (${reference})` });
        lines.push({ accountCode: "3200", accountName: "Restricted Donor Grant Funds", debitNgn: formatKobo(spR.kobo), creditNgn: "0.00", memo: `Release restricted fund on qualifying spend (${reference})` });
        lines.push({ accountCode: "4040", accountName: "Donor Grants & Contributions Income", debitNgn: "0.00", creditNgn: formatKobo(spR.kobo), memo: `Recognize restricted grant income earned (${reference})` });
      }
      restrictedDelta = trR.kobo - spR.kobo;
    } else {
      if (trR.kobo > 0n) {
        lines.push({ accountCode: "1010", accountName: "Zenith Bank Current (NGN)", debitNgn: formatKobo(trR.kobo), creditNgn: "0.00", memo: `Unrestricted donation received for ${donorFundName} (${reference})` });
        lines.push({ accountCode: "4045", accountName: "Unrestricted Donations & Operating Income", debitNgn: "0.00", creditNgn: formatKobo(trR.kobo), memo: `Unrestricted contribution income (${reference})` });
      }
      if (spR.kobo > 0n) {
        lines.push({ accountCode: "5090", accountName: "Donor Program & Grant Disbursements", debitNgn: formatKobo(spR.kobo), creditNgn: "0.00", memo: `Unrestricted program disbursement for ${donorFundName} (${reference})` });
        lines.push({ accountCode: "1010", accountName: "Zenith Bank Current (NGN)", debitNgn: "0.00", creditNgn: formatKobo(spR.kobo), memo: `Cash disbursed for ${donorFundName} (${reference})` });
      }
    }

    const totalActual = prR.kobo + spR.kobo;
    const remainingBudget = budR.kobo - totalActual;
    const burnScaled = divRoundHalfUp(totalActual * 10_000n, budR.kobo);
    const budgetStatus = totalActual > budR.kobo ? "OVER_BUDGET" : burnScaled >= 8000n ? "APPROACHING_CAP" : "ON_TRACK";

    return {
      status: 201,
      body: {
        operationType: "NONPROFIT_GRANT_ACTIVITY",
        reference,
        postingDate,
        summary: `${restriction === "RESTRICTED" ? "Restricted" : "Unrestricted"} fund ${donorFundName} (${reference}): budget burn ${formatBasisPct(burnScaled)}% (${budgetStatus}), remaining budget ₦${formatKobo(remainingBudget)}.`,
        metrics: {
          donorFundName,
          fundRestriction: restriction,
          approvedBudgetNgn: formatKobo(budR.kobo),
          trancheReceivedNgn: formatKobo(trR.kobo),
          programSpendNgn: formatKobo(spR.kobo),
          totalActualSpendNgn: formatKobo(totalActual),
          remainingBudgetNgn: formatKobo(remainingBudget),
          burnRatePct: formatBasisPct(burnScaled),
          budgetStatus,
          restrictedNetBalanceDeltaNgn: formatKobo(restrictedDelta),
          vatStatus: "VAT_EXEMPT_CHARITABLE_DEFAULT",
        },
        lines,
      },
    };
  }

  if (opType === "HOSPITALITY_FOLIO_SETTLEMENT") {
    const propertyWing = typeof payload.propertyWing === "string" ? payload.propertyWing.trim() : "";
    if (!propertyWing) {
      return { status: 400, body: validationError("Property wing is required.", "propertyWing") };
    }
    const roomsSold = typeof payload.roomsSold === "number" && Number.isInteger(payload.roomsSold) ? payload.roomsSold : -1;
    const availableRooms = typeof payload.availableRooms === "number" && Number.isInteger(payload.availableRooms) ? payload.availableRooms : 0;
    if (availableRooms <= 0 || roomsSold < 0 || roomsSold > availableRooms) {
      return { status: 400, body: validationError("Rooms sold must be between 0 and positive available rooms.", "roomsSold") };
    }
    const roomR = safeParseKobo(payload.roomRateBaseNgn, "roomRateBaseNgn");
    const scR = safeParseKobo(payload.serviceChargeRatePct, "serviceChargeRatePct", "10.00");
    if (!roomR.ok) return { status: 400, body: roomR.error };
    if (!scR.ok) return { status: 400, body: scR.error };
    if (roomR.kobo <= 0n || scR.kobo < 0n || scR.kobo > 2500n) {
      return { status: 400, body: validationError("Room base must be positive and service charge 0%..25%.", "roomRateBaseNgn") };
    }

    const applyState = typeof payload.applyLagosConsumptionTax === "boolean" ? payload.applyLagosConsumptionTax : true;
    const vatAmount = pctOfKobo(roomR.kobo, 750n);
    const stateTax = applyState ? pctOfKobo(roomR.kobo, 500n) : 0n;
    const serviceCharge = pctOfKobo(roomR.kobo, scR.kobo);
    const totalFolio = roomR.kobo + vatAmount + stateTax + serviceCharge;

    const occScaled = divRoundHalfUp(BigInt(roomsSold) * 10_000n, BigInt(availableRooms));
    const adr = roomsSold > 0 ? divRoundHalfUp(roomR.kobo, BigInt(roomsSold)) : 0n;
    const revpar = divRoundHalfUp(roomR.kobo, BigInt(availableRooms));

    const lines: PackPlannedLine[] = [
      { accountCode: "1010", accountName: "Zenith Bank Current (NGN)", debitNgn: formatKobo(totalFolio), creditNgn: "0.00", memo: `Guest folio settlement for ${propertyWing} (${reference})` },
      { accountCode: "4050", accountName: "Room & Accommodation Folio Revenue", debitNgn: "0.00", creditNgn: formatKobo(roomR.kobo), memo: `USALI room revenue for ${propertyWing} (${reference})` },
      { accountCode: "2010", accountName: "NRS Output VAT Payable (7.5%)", debitNgn: "0.00", creditNgn: formatKobo(vatAmount), memo: `NRS Output VAT 7.5% on guest folio (${reference})` },
    ];
    if (stateTax > 0n) {
      lines.push({ accountCode: "2130", accountName: "State Consumption Levy Payable", debitNgn: "0.00", creditNgn: formatKobo(stateTax), memo: `State 5% hospitality consumption levy (${reference})` });
    }
    if (serviceCharge > 0n) {
      lines.push({ accountCode: "2140", accountName: "Fiduciary Staff Service Charge Payable", debitNgn: "0.00", creditNgn: formatKobo(serviceCharge), memo: `Fiduciary staff service charge pool (${formatBasisPct(scR.kobo)}%, ${reference})` });
    }

    return {
      status: 201,
      body: {
        operationType: "HOSPITALITY_FOLIO_SETTLEMENT",
        reference,
        postingDate,
        summary: `USALI Folio ${reference} (${propertyWing}): occupancy ${formatBasisPct(occScaled)}%, RevPAR ₦${formatKobo(revpar)}, fiduciary service charge ₦${formatKobo(serviceCharge)}.`,
        metrics: {
          propertyWing,
          roomsSold: String(roomsSold),
          availableRooms: String(availableRooms),
          occupancyPct: formatBasisPct(occScaled),
          adrNgn: formatKobo(adr),
          revparNgn: formatKobo(revpar),
          roomRevenueNgn: formatKobo(roomR.kobo),
          vatAmountNgn: formatKobo(vatAmount),
          stateConsumptionTaxNgn: formatKobo(stateTax),
          serviceChargeFiduciaryNgn: formatKobo(serviceCharge),
          totalGuestFolioNgn: formatKobo(totalFolio),
        },
        lines,
      },
    };
  }

  if (opType === "DINER_SERVICE_SHIFT") {
    const diningOutlet = typeof payload.diningOutlet === "string" ? payload.diningOutlet.trim() : "";
    if (!diningOutlet) {
      return { status: 400, body: validationError("Dining outlet is required.", "diningOutlet") };
    }
    const covers = typeof payload.coversServed === "number" && Number.isInteger(payload.coversServed) ? payload.coversServed : 0;
    if (covers <= 0) {
      return { status: 400, body: validationError("Covers served must be positive.", "coversServed") };
    }
    const salesR = safeParseKobo(payload.foodBeverageSalesNgn, "foodBeverageSalesNgn");
    const cogsR = safeParseKobo(payload.ingredientCogsNgn, "ingredientCogsNgn", "0.00");
    const spoilR = safeParseKobo(payload.kitchenSpoilageNgn, "kitchenSpoilageNgn", "0.00");
    if (!salesR.ok) return { status: 400, body: salesR.error };
    if (!cogsR.ok) return { status: 400, body: cogsR.error };
    if (!spoilR.ok) return { status: 400, body: spoilR.error };
    if (salesR.kobo <= 0n || cogsR.kobo < 0n || spoilR.kobo < 0n) {
      return { status: 400, body: validationError("F&B sales must be positive and costs cannot be negative.", "foodBeverageSalesNgn") };
    }

    const applyState = typeof payload.applyStateConsumptionTax === "boolean" ? payload.applyStateConsumptionTax : true;
    const vatAmount = pctOfKobo(salesR.kobo, 750n);
    const stateTax = applyState ? pctOfKobo(salesR.kobo, 500n) : 0n;
    const grossChecks = salesR.kobo + vatAmount + stateTax;
    const avgCheck = divRoundHalfUp(salesR.kobo, BigInt(covers));
    const totalKitchenCost = cogsR.kobo + spoilR.kobo;
    const foodCostScaled = divRoundHalfUp(totalKitchenCost * 10_000n, salesR.kobo);
    const plateMargin = salesR.kobo - totalKitchenCost;

    const lines: PackPlannedLine[] = [
      { accountCode: "1010", accountName: "Zenith Bank Current (NGN)", debitNgn: formatKobo(grossChecks), creditNgn: "0.00", memo: `Diner table checks collected at ${diningOutlet} (${reference})` },
      { accountCode: "4060", accountName: "Kitchen & Beverage Sales Revenue", debitNgn: "0.00", creditNgn: formatKobo(salesR.kobo), memo: `Kitchen & beverage sales at ${diningOutlet} (${reference})` },
      { accountCode: "2010", accountName: "NRS Output VAT Payable (7.5%)", debitNgn: "0.00", creditNgn: formatKobo(vatAmount), memo: `NRS Output VAT 7.5% on diner checks (${reference})` },
    ];
    if (stateTax > 0n) {
      lines.push({ accountCode: "2130", accountName: "State Consumption Levy Payable", debitNgn: "0.00", creditNgn: formatKobo(stateTax), memo: `State 5% restaurant consumption levy (${reference})` });
    }
    if (cogsR.kobo > 0n) {
      lines.push({ accountCode: "5060", accountName: "Kitchen Ingredient Food Cost (COGS)", debitNgn: formatKobo(cogsR.kobo), creditNgn: "0.00", memo: `Recipe ingredient food cost (${reference})` });
      lines.push({ accountCode: "1310", accountName: "Merchandise Inventory (IAS 2)", debitNgn: "0.00", creditNgn: formatKobo(cogsR.kobo), memo: `Kitchen pantry stock drawdown (${reference})` });
    }
    if (spoilR.kobo > 0n) {
      lines.push({ accountCode: "5095", accountName: "Kitchen Spoilage & Waste Loss", debitNgn: formatKobo(spoilR.kobo), creditNgn: "0.00", memo: `Kitchen spoilage & waste loss (${reference})` });
      lines.push({ accountCode: "1310", accountName: "Merchandise Inventory (IAS 2)", debitNgn: "0.00", creditNgn: formatKobo(spoilR.kobo), memo: `Write off spoiled kitchen ingredients (${reference})` });
    }

    return {
      status: 201,
      body: {
        operationType: "DINER_SERVICE_SHIFT",
        reference,
        postingDate,
        summary: `Diner shift ${reference} (${diningOutlet}): ${covers} covers, avg check ₦${formatKobo(avgCheck)}, food cost ${formatBasisPct(foodCostScaled)}%, plate margin ₦${formatKobo(plateMargin)}.`,
        metrics: {
          diningOutlet,
          coversServed: String(covers),
          averageCheckNgn: formatKobo(avgCheck),
          foodBeverageSalesNgn: formatKobo(salesR.kobo),
          vatAmountNgn: formatKobo(vatAmount),
          stateConsumptionTaxNgn: formatKobo(stateTax),
          grossTableChecksNgn: formatKobo(grossChecks),
          ingredientCogsNgn: formatKobo(cogsR.kobo),
          kitchenSpoilageNgn: formatKobo(spoilR.kobo),
          foodCostPct: formatBasisPct(foodCostScaled),
          plateMarginNgn: formatKobo(plateMargin),
        },
        lines,
      },
    };
  }

  return {
    status: 400,
    body: validationError(`Unsupported operationType '${opType}'.`, "operationType"),
  };
}
