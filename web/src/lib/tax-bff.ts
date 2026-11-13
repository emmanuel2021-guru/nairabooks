import { formatKobo, parseMoneyToKobo, parseRateScaled } from "@/lib/decimal";
import type { MutationError } from "@/types/ledger";
import type {
  MultiLayerIndirectTaxBreakdown,
  NigerianLegalForm,
  NigerianTaxProfile,
  NrsTaxSubtotal,
  SmallCompanyEvaluation,
  TaxAccountAllocation,
  TaxComputationPreview,
  TaxProfilePayload,
  TaxRegimeType,
  ThresholdAlertLevel,
  TransactionDirection,
} from "@/types/tax";

const WORKSPACE_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0001";
const ACTOR_USER_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbb0001";

const SMALL_CO_TURNOVER_CAP_KOBO = 10_000_000_000n; // N100,000,000.00
const SMALL_CO_ASSETS_CAP_KOBO = 25_000_000_000n; // N250,000,000.00
const LEGACY_SMALL_CO_TURNOVER_CAP_KOBO = 2_500_000_000n; // N25,000,000.00
const WHT_SMALL_ENTITY_TURNOVER_CAP_KOBO = 2_500_000_000n; // N25,000,000.00
const WHT_SMALL_MONTHLY_TX_CAP_KOBO = 200_000_000n; // N2,000,000.00
const RATE_SCALE = 1_000_000n;
const HALF_RATE_SCALE = 500_000n;

interface TaxRuleDef {
  readonly ruleVersionCode: string;
  readonly regime: TaxRegimeType;
  readonly jurisdiction: string;
  readonly supplyCategoryCode: string;
  readonly standardRate: string;
  readonly noTinPenaltyRate: string | null;
  readonly effectiveFrom: string;
  readonly effectiveTo: string | null;
  readonly statutoryCitation: string;
  readonly vatNrsCategoryCode: string | null;
}

const STATUTORY_RULES: readonly TaxRuleDef[] = [
  {
    ruleVersionCode: "NG-CIT-FA2020-SMALL",
    regime: "CIT_NIGERIA_TAX_ACT_2025",
    jurisdiction: "FEDERAL",
    supplyCategoryCode: "CIT_SMALL_COMPANY",
    standardRate: "0.000000",
    noTinPenaltyRate: null,
    effectiveFrom: "2020-01-01",
    effectiveTo: "2025-12-31",
    statutoryCitation: "Finance Act 2019 (Turnover <= N25M)",
    vatNrsCategoryCode: null,
  },
  {
    ruleVersionCode: "NG-CIT-NTA2025-SMALL",
    regime: "CIT_NIGERIA_TAX_ACT_2025",
    jurisdiction: "FEDERAL",
    supplyCategoryCode: "CIT_SMALL_COMPANY",
    standardRate: "0.000000",
    noTinPenaltyRate: null,
    effectiveFrom: "2026-01-01",
    effectiveTo: null,
    statutoryCitation:
      "Nigeria Tax Act 2025 Sec 56 (Turnover <= N100M & Fixed Assets <= N250M, excl. Professional Services)",
    vatNrsCategoryCode: null,
  },
  {
    ruleVersionCode: "NG-CIT-NTA2025-STD",
    regime: "CIT_NIGERIA_TAX_ACT_2025",
    jurisdiction: "FEDERAL",
    supplyCategoryCode: "CIT_STANDARD_COMPANY",
    standardRate: "0.300000",
    noTinPenaltyRate: null,
    effectiveFrom: "2026-01-01",
    effectiveTo: null,
    statutoryCitation: "Nigeria Tax Act 2025 Sec 56 (Standard / Non-Exempt Company 30% CIT)",
    vatNrsCategoryCode: null,
  },
  {
    ruleVersionCode: "NG-CIT-NTA2025-NGO",
    regime: "CIT_NIGERIA_TAX_ACT_2025",
    jurisdiction: "FEDERAL",
    supplyCategoryCode: "CIT_NGO_EXEMPT",
    standardRate: "0.000000",
    noTinPenaltyRate: null,
    effectiveFrom: "2026-01-01",
    effectiveTo: null,
    statutoryCitation: "Nigeria Tax Act 2025 Sec 163 (Charitable / Non-Profit Activities)",
    vatNrsCategoryCode: null,
  },
  {
    ruleVersionCode: "NG-VAT-75-2020",
    regime: "VAT_STANDARD_7_5",
    jurisdiction: "FEDERAL",
    supplyCategoryCode: "STANDARD_TAXABLE_SUPPLY",
    standardRate: "0.075000",
    noTinPenaltyRate: null,
    effectiveFrom: "2020-02-01",
    effectiveTo: null,
    statutoryCitation: "Value Added Tax Act Sec 4 (Standard 7.5% Rate)",
    vatNrsCategoryCode: "S",
  },
  {
    ruleVersionCode: "NG-VAT-ZERO-2020",
    regime: "VAT_ZERO_RATED",
    jurisdiction: "FEDERAL",
    supplyCategoryCode: "ZERO_RATED_EXPORT_OR_BASIC",
    standardRate: "0.000000",
    noTinPenaltyRate: null,
    effectiveFrom: "2020-02-01",
    effectiveTo: null,
    statutoryCitation: "VAT Act First Schedule / Nigeria Tax Act 2025 Zero-Rated Supplies",
    vatNrsCategoryCode: "Z",
  },
  {
    ruleVersionCode: "NG-VAT-EXEMPT-2020",
    regime: "VAT_EXEMPT",
    jurisdiction: "FEDERAL",
    supplyCategoryCode: "VAT_EXEMPT_SUPPLY",
    standardRate: "0.000000",
    noTinPenaltyRate: null,
    effectiveFrom: "2020-02-01",
    effectiveTo: null,
    statutoryCitation: "VAT Act First Schedule Exempt Goods and Services",
    vatNrsCategoryCode: "E",
  },
  {
    ruleVersionCode: "NG-WHT-2024-GOODS",
    regime: "WHT_CORPORATE_AND_UNINCORPORATED",
    jurisdiction: "FEDERAL",
    supplyCategoryCode: "WHT_GOODS_SUPPLY",
    standardRate: "0.020000",
    noTinPenaltyRate: "0.040000",
    effectiveFrom: "2025-01-01",
    effectiveTo: null,
    statutoryCitation:
      "Deduction of Tax at Source (Withholding) Regulations 2024 First Schedule (2%)",
    vatNrsCategoryCode: null,
  },
  {
    ruleVersionCode: "NG-WHT-2024-CONST-RES",
    regime: "WHT_CORPORATE_AND_UNINCORPORATED",
    jurisdiction: "FEDERAL",
    supplyCategoryCode: "WHT_CONSTRUCTION_CIVIL",
    standardRate: "0.020000",
    noTinPenaltyRate: "0.040000",
    effectiveFrom: "2025-01-01",
    effectiveTo: null,
    statutoryCitation:
      "WHT Regulations 2024 First Schedule — Roads, Bridges & Buildings (2% Resident)",
    vatNrsCategoryCode: null,
  },
  {
    ruleVersionCode: "NG-WHT-2024-PROF",
    regime: "WHT_CORPORATE_AND_UNINCORPORATED",
    jurisdiction: "FEDERAL",
    supplyCategoryCode: "WHT_PROFESSIONAL_CONSULTING",
    standardRate: "0.050000",
    noTinPenaltyRate: "0.100000",
    effectiveFrom: "2025-01-01",
    effectiveTo: null,
    statutoryCitation:
      "WHT Regulations 2024 First Schedule — Consultancy & Professional Fees (5% Resident)",
    vatNrsCategoryCode: null,
  },
  {
    ruleVersionCode: "NG-WHT-2024-RENT-NR",
    regime: "WHT_CORPORATE_AND_UNINCORPORATED",
    jurisdiction: "FEDERAL",
    supplyCategoryCode: "WHT_RENT_OR_NON_RESIDENT",
    standardRate: "0.100000",
    noTinPenaltyRate: "0.200000",
    effectiveFrom: "2025-01-01",
    effectiveTo: null,
    statutoryCitation:
      "WHT Regulations 2024 First Schedule — Rent, Dividends & Non-Resident Services (10%)",
    vatNrsCategoryCode: null,
  },
  {
    ruleVersionCode: "NG-STATE-LAGOS-5",
    regime: "STATE_HOSPITALITY_CONSUMPTION",
    jurisdiction: "LAGOS",
    supplyCategoryCode: "HOSPITALITY_CONSUMPTION_TAX",
    standardRate: "0.050000",
    noTinPenaltyRate: null,
    effectiveFrom: "2019-01-01",
    effectiveTo: null,
    statutoryCitation: "Hotel Occupancy and Restaurant Consumption Law of Lagos State (5%)",
    vatNrsCategoryCode: null,
  },
  {
    ruleVersionCode: "NG-STATE-NONE-0",
    regime: "STATE_HOSPITALITY_CONSUMPTION",
    jurisdiction: "FEDERAL",
    supplyCategoryCode: "HOSPITALITY_CONSUMPTION_TAX",
    standardRate: "0.000000",
    noTinPenaltyRate: null,
    effectiveFrom: "2019-01-01",
    effectiveTo: null,
    statutoryCitation: "No state hospitality consumption levy applicable",
    vatNrsCategoryCode: null,
  },
];

interface LocalTaxState {
  profile: NigerianTaxProfile;
}

const globalForTax = globalThis as unknown as {
  __nairabooksTaxState?: LocalTaxState;
};

function getLocalTaxState(): LocalTaxState {
  if (!globalForTax.__nairabooksTaxState) {
    const initial = buildProfile({
      legalForm: "PRIVATE_LIMITED",
      tinNumber: "10459821-0001",
      vatRegistered: true,
      annualTurnoverNgn: "42000000.00",
      fixedAssetsNgn: "65000000.00",
      stateOfOperation: "LAGOS",
      isProfessionalServices: false,
      effectiveFrom: "2026-01-01",
    });
    globalForTax.__nairabooksTaxState = { profile: initial };
  }
  return globalForTax.__nairabooksTaxState;
}

function getUpstreamBaseUrl(): string | null {
  const url = process.env.NAIRABOOKS_API_URL?.trim();
  return url && url.length > 0 ? url.replace(/\/$/, "") : null;
}

function validationError(message: string, field: string | null = null): MutationError {
  return {
    __typename: "ValidationError",
    code: "VALIDATION_ERROR",
    message,
    field,
  };
}

function pctUtilization(valueKobo: bigint, capKobo: bigint): string {
  if (capKobo <= 0n) {
    return "0.00";
  }
  const scaledPct = (valueKobo * 10_000n + capKobo / 2n) / capKobo;
  return formatKobo(scaledPct);
}

function evaluateProfile(
  profile: NigerianTaxProfile,
  asOfDate = "2026-03-01",
): SmallCompanyEvaluation {
  const turnoverKobo = parseMoneyToKobo(profile.annualTurnoverNgn);
  const assetsKobo = parseMoneyToKobo(profile.fixedAssetsNgn);
  const capTurnover =
    asOfDate >= "2026-01-01" ? SMALL_CO_TURNOVER_CAP_KOBO : LEGACY_SMALL_CO_TURNOVER_CAP_KOBO;

  const turnoverPct = pctUtilization(turnoverKobo, capTurnover);
  const assetPct = pctUtilization(assetsKobo, SMALL_CO_ASSETS_CAP_KOBO);
  const turnoverPctKobo = parseMoneyToKobo(turnoverPct);
  const assetPctKobo = parseMoneyToKobo(assetPct);

  let alertLevel: ThresholdAlertLevel = "NORMAL";
  if (turnoverKobo > capTurnover || assetsKobo > SMALL_CO_ASSETS_CAP_KOBO) {
    alertLevel = "EXCEEDED";
  } else if (turnoverPctKobo >= 8000n || assetPctKobo >= 8000n) {
    alertLevel = "APPROACHING_80_PCT";
  }

  if (profile.legalForm === "INCORPORATED_TRUSTEE_NGO") {
    return {
      eligibleForZeroCit: true,
      applicableCitRate: "0.000000",
      ruleVersionCode: "NG-CIT-NTA2025-NGO",
      reason: "Incorporated Trustee NGO non-commercial charitable surplus is CIT-exempt.",
      statutoryCitation: "Nigeria Tax Act 2025 Sec 163 (Charitable / Non-Profit Activities)",
      thresholdAlertLevel: "NORMAL",
      turnoverUtilizationPct: turnoverPct,
      assetUtilizationPct: assetPct,
    };
  }

  if (
    profile.legalForm === "BUSINESS_NAME" ||
    profile.legalForm === "LIMITED_LIABILITY_PARTNERSHIP"
  ) {
    return {
      eligibleForZeroCit: false,
      applicableCitRate: "0.000000",
      ruleVersionCode: "NG-PIT-PASSTHROUGH",
      reason:
        "Business Name / LLP is assessed under Personal Income Tax rather than corporate CIT small-company exemption.",
      statutoryCitation: "Personal Income Tax Act (PITA) / Nigeria Tax Act 2025",
      thresholdAlertLevel: alertLevel,
      turnoverUtilizationPct: turnoverPct,
      assetUtilizationPct: assetPct,
    };
  }

  if (profile.isProfessionalServices) {
    return {
      eligibleForZeroCit: false,
      applicableCitRate: "0.300000",
      ruleVersionCode: "NG-CIT-NTA2025-STD",
      reason:
        "Professional services firms are statutorily excluded from the 0% small-company CIT exemption regardless of turnover.",
      statutoryCitation: "Nigeria Tax Act 2025 Sec 56 (Standard / Non-Exempt Company 30% CIT)",
      thresholdAlertLevel: alertLevel,
      turnoverUtilizationPct: turnoverPct,
      assetUtilizationPct: assetPct,
    };
  }

  if (turnoverKobo <= capTurnover && assetsKobo <= SMALL_CO_ASSETS_CAP_KOBO) {
    return {
      eligibleForZeroCit: true,
      applicableCitRate: "0.000000",
      ruleVersionCode: "NG-CIT-NTA2025-SMALL",
      reason:
        "Qualifies for 0% small-company CIT (turnover <= ₦100M and fixed assets <= ₦250M).",
      statutoryCitation:
        "Nigeria Tax Act 2025 Sec 56 (Turnover <= N100M & Fixed Assets <= N250M)",
      thresholdAlertLevel: alertLevel,
      turnoverUtilizationPct: turnoverPct,
      assetUtilizationPct: assetPct,
    };
  }

  return {
    eligibleForZeroCit: false,
    applicableCitRate: "0.300000",
    ruleVersionCode: "NG-CIT-NTA2025-STD",
    reason: "Annual turnover or fixed assets exceed statutory small-company threshold.",
    statutoryCitation: "Nigeria Tax Act 2025 Sec 56 (Standard / Non-Exempt Company 30% CIT)",
    thresholdAlertLevel: "EXCEEDED",
    turnoverUtilizationPct: turnoverPct,
    assetUtilizationPct: assetPct,
  };
}

function buildProfile(input: {
  legalForm: NigerianLegalForm;
  tinNumber: string | null;
  vatRegistered: boolean;
  annualTurnoverNgn: string;
  fixedAssetsNgn: string;
  stateOfOperation: string;
  isProfessionalServices: boolean;
  effectiveFrom: string;
}): NigerianTaxProfile {
  const draft: NigerianTaxProfile = {
    id: "33333333-3333-4333-8333-333333330001",
    workspaceId: WORKSPACE_ID,
    legalForm: input.legalForm,
    tinNumber: input.tinNumber?.trim() ? input.tinNumber.trim() : null,
    vatRegistered: input.vatRegistered,
    annualTurnoverNgn: formatKobo(parseMoneyToKobo(input.annualTurnoverNgn)),
    fixedAssetsNgn: formatKobo(parseMoneyToKobo(input.fixedAssetsNgn)),
    stateOfOperation: input.stateOfOperation.trim().toUpperCase(),
    isProfessionalServices: input.isProfessionalServices,
    isProfessionalServicesExcludedFromSmallExempt: input.isProfessionalServices,
    isSmallBusinessCitExempt: false,
    effectiveFrom: input.effectiveFrom,
  };
  const evalRes = evaluateProfile(draft, input.effectiveFrom);
  return {
    ...draft,
    isSmallBusinessCitExempt: evalRes.eligibleForZeroCit,
  };
}

function resolveRule(
  regime: TaxRegimeType,
  jurisdiction: string,
  supplyCategoryCode: string,
  transactionDate: string,
): TaxRuleDef {
  const normJur = jurisdiction.trim().toUpperCase();
  for (const cand of [normJur, "FEDERAL"]) {
    const found = STATUTORY_RULES.find(
      (r) =>
        r.regime === regime &&
        r.jurisdiction === cand &&
        r.supplyCategoryCode === supplyCategoryCode &&
        transactionDate >= r.effectiveFrom &&
        (r.effectiveTo === null || transactionDate <= r.effectiveTo),
    );
    if (found) {
      return found;
    }
  }
  throw validationError(
    `No active Nigerian tax rule found for ${regime} / ${normJur} / ${supplyCategoryCode}.`,
    "supplyCategoryCode",
  );
}

function computeScaledTax(baseKobo: bigint, rateStr: string): bigint {
  const rateScaled = parseRateScaled(rateStr);
  return (baseKobo * rateScaled + HALF_RATE_SCALE) / RATE_SCALE;
}

function parseStrictJsonObject(rawBody: string): Record<string, unknown> {
  if (/:\s*-?\d+\.\d+/.test(rawBody)) {
    throw validationError(
      "Float literals are prohibited for Naira/rate payloads; use fixed decimal strings.",
      "json",
    );
  }
  const parsed: unknown = JSON.parse(rawBody);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw validationError("JSON body must be an object.", "body");
  }
  return parsed as Record<string, unknown>;
}

function computeLocalTaxPreview(
  profile: NigerianTaxProfile,
  payload: Record<string, unknown>,
): TaxComputationPreview {
  if ("appliedRate" in payload || "taxRate" in payload) {
    throw validationError(
      "SEC-REQ-04: Callers may not supply or override statutory tax rates.",
      "supplyCategoryCode",
    );
  }
  const transactionDate = String(payload.transactionDate ?? "2026-03-01");
  const regime = String(payload.regime ?? "") as TaxRegimeType;
  const grossRaw = payload.grossAmountNgn;
  if (typeof grossRaw !== "string") {
    throw validationError("Field 'grossAmountNgn' must be a fixed decimal string.", "grossAmountNgn");
  }
  const baseKobo = parseMoneyToKobo(grossRaw);
  const monthlyRaw = payload.monthlyCumulativeWithSupplierNgn ?? "0.00";
  if (typeof monthlyRaw !== "string") {
    throw validationError(
      "Field 'monthlyCumulativeWithSupplierNgn' must be a fixed decimal string.",
      "monthlyCumulativeWithSupplierNgn",
    );
  }
  const priorMonthlyKobo = parseMoneyToKobo(monthlyRaw);
  const hasValidTin = Boolean(payload.counterpartyHasValidTin);
  const supplyCategoryCode = String(payload.supplyCategoryCode ?? "");

  if (regime === "CIT_NIGERIA_TAX_ACT_2025") {
    const citEval = evaluateProfile(profile, transactionDate);
    const computedKobo = computeScaledTax(baseKobo, citEval.applicableCitRate);
    return {
      effectiveDate: transactionDate,
      regime,
      ruleVersionCode: citEval.ruleVersionCode,
      supplyCategoryCode,
      taxableBaseNgn: formatKobo(baseKobo),
      appliedRate: citEval.applicableCitRate,
      computedTaxNgn: formatKobo(computedKobo),
      vatNrsCategoryCode: null,
      whtHigherNoTinApplied: false,
      whtExemptSmallEntityApplied: false,
      statutoryCitation: citEval.statutoryCitation,
      nrsSubtotals: [
        {
          taxSchemeId: "CIT",
          categoryCode: citEval.eligibleForZeroCit ? "EXEMPT" : "STANDARD",
          taxableAmountNgn: formatKobo(baseKobo),
          taxRate: citEval.applicableCitRate,
          taxAmountNgn: formatKobo(computedKobo),
          statutoryCitation: citEval.statutoryCitation,
          ruleVersionCode: citEval.ruleVersionCode,
        },
      ],
    };
  }

  const jur = regime === "STATE_HOSPITALITY_CONSUMPTION" ? profile.stateOfOperation : "FEDERAL";
  const rule = resolveRule(regime, jur, supplyCategoryCode, transactionDate);

  let appliedRate = rule.standardRate;
  let noTinApplied = false;
  let smallWhtExempt = false;

  if (regime === "WHT_CORPORATE_AND_UNINCORPORATED") {
    const profileTurnoverKobo = parseMoneyToKobo(profile.annualTurnoverNgn);
    if (!hasValidTin) {
      appliedRate = rule.noTinPenaltyRate ?? rule.standardRate;
      noTinApplied = true;
    } else if (
      profileTurnoverKobo <= WHT_SMALL_ENTITY_TURNOVER_CAP_KOBO &&
      priorMonthlyKobo + baseKobo <= WHT_SMALL_MONTHLY_TX_CAP_KOBO
    ) {
      appliedRate = "0.000000";
      smallWhtExempt = true;
    }
  }

  const computedKobo = computeScaledTax(baseKobo, appliedRate);
  let taxSchemeId: string = regime;
  let categoryCode = supplyCategoryCode;
  if (regime === "VAT_STANDARD_7_5" || regime === "VAT_ZERO_RATED" || regime === "VAT_EXEMPT") {
    taxSchemeId = "VAT";
    categoryCode = rule.vatNrsCategoryCode ?? "S";
  } else if (regime === "WHT_CORPORATE_AND_UNINCORPORATED") {
    taxSchemeId = "WHT";
    categoryCode = smallWhtExempt ? "EXEMPT_SMALL_ENTITY" : supplyCategoryCode;
  } else if (regime === "STATE_HOSPITALITY_CONSUMPTION") {
    taxSchemeId = "STATE_CONSUMPTION";
    categoryCode = rule.jurisdiction;
  }

  return {
    effectiveDate: transactionDate,
    regime,
    ruleVersionCode: rule.ruleVersionCode,
    supplyCategoryCode,
    taxableBaseNgn: formatKobo(baseKobo),
    appliedRate,
    computedTaxNgn: formatKobo(computedKobo),
    vatNrsCategoryCode: rule.vatNrsCategoryCode,
    whtHigherNoTinApplied: noTinApplied,
    whtExemptSmallEntityApplied: smallWhtExempt,
    statutoryCitation: rule.statutoryCitation,
    nrsSubtotals: [
      {
        taxSchemeId,
        categoryCode,
        taxableAmountNgn: formatKobo(baseKobo),
        taxRate: appliedRate,
        taxAmountNgn: formatKobo(computedKobo),
        statutoryCitation: rule.statutoryCitation,
        ruleVersionCode: rule.ruleVersionCode,
      },
    ],
  };
}

export async function fetchTaxProfile(
  asOfDate = "2026-03-01",
): Promise<{ status: number; body: TaxProfilePayload | MutationError }> {
  const baseUrl = getUpstreamBaseUrl();
  if (baseUrl) {
    const res = await fetch(
      `${baseUrl}/api/v1/tax/profile?asOfDate=${encodeURIComponent(asOfDate)}`,
      {
        headers: { "X-Workspace-Id": WORKSPACE_ID, "X-Actor-User-Id": ACTOR_USER_ID },
        cache: "no-store",
      },
    );
    const body = (await res.json()) as TaxProfilePayload | MutationError;
    return { status: res.status, body };
  }

  const state = getLocalTaxState();
  return {
    status: 200,
    body: {
      profile: state.profile,
      evaluation: evaluateProfile(state.profile, asOfDate),
    },
  };
}

export async function updateTaxProfileViaBff(
  rawBody: string,
): Promise<{ status: number; body: TaxProfilePayload | MutationError }> {
  const baseUrl = getUpstreamBaseUrl();
  if (baseUrl) {
    const res = await fetch(`${baseUrl}/api/v1/tax/profile`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Workspace-Id": WORKSPACE_ID,
        "X-Actor-User-Id": ACTOR_USER_ID,
      },
      body: rawBody,
      cache: "no-store",
    });
    const body = (await res.json()) as TaxProfilePayload | MutationError;
    return { status: res.status, body };
  }

  try {
    const payload = parseStrictJsonObject(rawBody);
    const annualTurnover = payload.annualTurnoverNgn;
    const fixedAssets = payload.fixedAssetsNgn;
    if (typeof annualTurnover !== "string" || typeof fixedAssets !== "string") {
      throw validationError(
        "Turnover and fixed assets must be fixed decimal strings.",
        "annualTurnoverNgn",
      );
    }
    const updated = buildProfile({
      legalForm: String(payload.legalForm ?? "PRIVATE_LIMITED") as NigerianLegalForm,
      tinNumber: typeof payload.tinNumber === "string" ? payload.tinNumber : null,
      vatRegistered: Boolean(payload.vatRegistered),
      annualTurnoverNgn: annualTurnover,
      fixedAssetsNgn: fixedAssets,
      stateOfOperation: String(payload.stateOfOperation ?? "LAGOS"),
      isProfessionalServices: Boolean(payload.isProfessionalServices),
      effectiveFrom: String(payload.effectiveFrom ?? "2026-01-01"),
    });
    const state = getLocalTaxState();
    state.profile = updated;
    return {
      status: 200,
      body: {
        profile: updated,
        evaluation: evaluateProfile(updated, "2026-03-01"),
      },
    };
  } catch (err) {
    if (err && typeof err === "object" && "__typename" in err) {
      return { status: 400, body: err as MutationError };
    }
    return {
      status: 400,
      body: validationError(err instanceof Error ? err.message : "Invalid tax profile payload."),
    };
  }
}

export async function previewNigerianTaxViaBff(
  rawBody: string,
): Promise<{ status: number; body: TaxComputationPreview | MutationError }> {
  const baseUrl = getUpstreamBaseUrl();
  if (baseUrl) {
    const res = await fetch(`${baseUrl}/api/v1/tax/preview`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Workspace-Id": WORKSPACE_ID,
        "X-Actor-User-Id": ACTOR_USER_ID,
      },
      body: rawBody,
      cache: "no-store",
    });
    const body = (await res.json()) as TaxComputationPreview | MutationError;
    return { status: res.status, body };
  }

  try {
    const payload = parseStrictJsonObject(rawBody);
    const { profile } = getLocalTaxState();
    return { status: 200, body: computeLocalTaxPreview(profile, payload) };
  } catch (err) {
    if (err && typeof err === "object" && "__typename" in err) {
      return { status: 400, body: err as MutationError };
    }
    return {
      status: 400,
      body: validationError(err instanceof Error ? err.message : "Invalid tax preview payload."),
    };
  }
}

export async function previewIndirectTaxViaBff(
  rawBody: string,
): Promise<{ status: number; body: MultiLayerIndirectTaxBreakdown | MutationError }> {
  const baseUrl = getUpstreamBaseUrl();
  if (baseUrl) {
    const res = await fetch(`${baseUrl}/api/v1/tax/nrs-indirect-preview`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Workspace-Id": WORKSPACE_ID,
        "X-Actor-User-Id": ACTOR_USER_ID,
      },
      body: rawBody,
      cache: "no-store",
    });
    const body = (await res.json()) as MultiLayerIndirectTaxBreakdown | MutationError;
    return { status: res.status, body };
  }

  try {
    const payload = parseStrictJsonObject(rawBody);
    if ("appliedRate" in payload || "vatRate" in payload || "whtRate" in payload) {
      throw validationError(
        "SEC-REQ-04: Callers may not supply or override statutory VAT/WHT/State rates.",
        "vatSupplyCategoryCode",
      );
    }
    const baseRaw = payload.baseAmountNgn;
    if (typeof baseRaw !== "string") {
      throw validationError("Field 'baseAmountNgn' must be a fixed decimal string.", "baseAmountNgn");
    }
    const baseKobo = parseMoneyToKobo(baseRaw);
    const transactionDate = String(payload.transactionDate ?? "2026-05-01");
    const vatRegime = String(payload.vatRegime ?? "VAT_STANDARD_7_5") as TaxRegimeType;
    const vatSupplyCategoryCode = String(
      payload.vatSupplyCategoryCode ?? "STANDARD_TAXABLE_SUPPLY",
    );
    const includeState = Boolean(payload.includeStateConsumptionTax);
    const serviceChargeRate = String(payload.serviceChargeRate ?? "0.000000");
    if (typeof (payload.serviceChargeRate ?? "0.000000") !== "string") {
      throw validationError(
        "Field 'serviceChargeRate' must be a fixed decimal string.",
        "serviceChargeRate",
      );
    }
    const hasValidTin =
      payload.counterpartyHasValidTin === undefined
        ? true
        : Boolean(payload.counterpartyHasValidTin);
    const whtCode =
      typeof payload.whtSupplyCategoryCode === "string" && payload.whtSupplyCategoryCode.length > 0
        ? payload.whtSupplyCategoryCode
        : null;
    const direction = String(payload.transactionDirection ?? "SALES") as TransactionDirection;
    const monthlyCumulative = String(payload.monthlyCumulativeWithSupplierNgn ?? "0.00");

    const { profile } = getLocalTaxState();

    const vatPreview = computeLocalTaxPreview(profile, {
      transactionDate,
      regime: vatRegime,
      grossAmountNgn: formatKobo(baseKobo),
      counterpartyHasValidTin: hasValidTin,
      supplyCategoryCode: vatSupplyCategoryCode,
    });
    const vatKobo = parseMoneyToKobo(vatPreview.computedTaxNgn);
    const subtotals: NrsTaxSubtotal[] = [...vatPreview.nrsSubtotals];
    const postings: TaxAccountAllocation[] = [];

    if (vatKobo > 0n) {
      postings.push({
        accountCode: "2110",
        accountName:
          direction === "SALES" ? "Output VAT Payable (7.5%)" : "Input VAT Recoverable (7.5%)",
        side: direction === "SALES" ? "CREDIT" : "DEBIT",
        taxSchemeId: "VAT",
        amountNgn: formatKobo(vatKobo),
      });
    }

    let stateKobo = 0n;
    if (includeState) {
      const statePreview = computeLocalTaxPreview(profile, {
        transactionDate,
        regime: "STATE_HOSPITALITY_CONSUMPTION",
        grossAmountNgn: formatKobo(baseKobo),
        counterpartyHasValidTin: hasValidTin,
        supplyCategoryCode: "HOSPITALITY_CONSUMPTION_TAX",
      });
      stateKobo = parseMoneyToKobo(statePreview.computedTaxNgn);
      subtotals.push(...statePreview.nrsSubtotals);
      if (stateKobo > 0n) {
        postings.push({
          accountCode: "2130",
          accountName: `${profile.stateOfOperation} Consumption Levy Payable`,
          side: direction === "SALES" ? "CREDIT" : "DEBIT",
          taxSchemeId: "STATE_CONSUMPTION",
          amountNgn: formatKobo(stateKobo),
        });
      }
    }

    const serviceChargeKobo = computeScaledTax(baseKobo, serviceChargeRate);
    if (serviceChargeKobo > 0n) {
      subtotals.push({
        taxSchemeId: "SERVICE_CHARGE",
        categoryCode: "FIDUCIARY",
        taxableAmountNgn: formatKobo(baseKobo),
        taxRate: serviceChargeRate,
        taxAmountNgn: formatKobo(serviceChargeKobo),
        statutoryCitation: "Fiduciary Hospitality Service Charge Pool (Non-Revenue Clearing)",
        ruleVersionCode: "NG-FIDUCIARY-SC",
      });
      postings.push({
        accountCode: "2140",
        accountName: "Fiduciary Staff Service Charge Payable",
        side: direction === "SALES" ? "CREDIT" : "DEBIT",
        taxSchemeId: "SERVICE_CHARGE",
        amountNgn: formatKobo(serviceChargeKobo),
      });
    }

    let whtKobo = 0n;
    let whtNoTin = false;
    let whtSmallExempt = false;
    if (whtCode) {
      const whtPreview = computeLocalTaxPreview(profile, {
        transactionDate,
        regime: "WHT_CORPORATE_AND_UNINCORPORATED",
        grossAmountNgn: formatKobo(baseKobo),
        counterpartyHasValidTin: hasValidTin,
        supplyCategoryCode: whtCode,
        monthlyCumulativeWithSupplierNgn: monthlyCumulative,
      });
      whtKobo = parseMoneyToKobo(whtPreview.computedTaxNgn);
      whtNoTin = whtPreview.whtHigherNoTinApplied;
      whtSmallExempt = whtPreview.whtExemptSmallEntityApplied;
      subtotals.push(...whtPreview.nrsSubtotals);
      if (whtKobo > 0n) {
        postings.push(
          direction === "SALES"
            ? {
                accountCode: "1150",
                accountName: "WHT Credit Note Receivable",
                side: "DEBIT",
                taxSchemeId: "WHT",
                amountNgn: formatKobo(whtKobo),
              }
            : {
                accountCode: "2120",
                accountName: "Withholding Tax Payable",
                side: "CREDIT",
                taxSchemeId: "WHT",
                amountNgn: formatKobo(whtKobo),
              },
        );
      }
    }

    const grossKobo = baseKobo + vatKobo + stateKobo + serviceChargeKobo;
    const netCashKobo = grossKobo - whtKobo;

    return {
      status: 200,
      body: {
        effectiveDate: transactionDate,
        jurisdiction: profile.stateOfOperation,
        baseAmountNgn: formatKobo(baseKobo),
        vatAmountNgn: formatKobo(vatKobo),
        stateConsumptionTaxNgn: formatKobo(stateKobo),
        serviceChargeNgn: formatKobo(serviceChargeKobo),
        whtDeductionNgn: formatKobo(whtKobo),
        grossCustomerInvoiceNgn: formatKobo(grossKobo),
        netCashPayableNgn: formatKobo(netCashKobo),
        vatNrsCategoryCode: vatPreview.vatNrsCategoryCode ?? "E",
        whtHigherNoTinApplied: whtNoTin,
        whtExemptSmallEntityApplied: whtSmallExempt,
        accountPostings: postings,
        nrsSubtotals: subtotals,
      },
    };
  } catch (err) {
    if (err && typeof err === "object" && "__typename" in err) {
      return { status: 400, body: err as MutationError };
    }
    return {
      status: 400,
      body: validationError(
        err instanceof Error ? err.message : "Invalid multi-layer tax payload.",
      ),
    };
  }
}
