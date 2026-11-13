import type { DecimalMoneyString, DecimalRateString } from "@/types/ledger";

export type NigerianLegalForm =
  | "PRIVATE_LIMITED"
  | "PUBLIC_LIMITED"
  | "BUSINESS_NAME"
  | "LIMITED_LIABILITY_PARTNERSHIP"
  | "INCORPORATED_TRUSTEE_NGO";

export type TaxRegimeType =
  | "VAT_STANDARD_7_5"
  | "VAT_ZERO_RATED"
  | "VAT_EXEMPT"
  | "WHT_CORPORATE_AND_UNINCORPORATED"
  | "CIT_NIGERIA_TAX_ACT_2025"
  | "STATE_HOSPITALITY_CONSUMPTION";

export type ThresholdAlertLevel = "NORMAL" | "APPROACHING_80_PCT" | "EXCEEDED";

export type TransactionDirection = "SALES" | "PURCHASE";

export interface NigerianTaxProfile {
  readonly id: string;
  readonly workspaceId: string;
  readonly legalForm: NigerianLegalForm;
  readonly tinNumber: string | null;
  readonly vatRegistered: boolean;
  readonly annualTurnoverNgn: DecimalMoneyString;
  readonly fixedAssetsNgn: DecimalMoneyString;
  readonly stateOfOperation: string;
  readonly isProfessionalServices: boolean;
  readonly isProfessionalServicesExcludedFromSmallExempt: boolean;
  readonly isSmallBusinessCitExempt: boolean;
  readonly effectiveFrom: string;
}

export interface SmallCompanyEvaluation {
  readonly eligibleForZeroCit: boolean;
  readonly applicableCitRate: DecimalRateString;
  readonly ruleVersionCode: string;
  readonly reason: string;
  readonly statutoryCitation: string;
  readonly thresholdAlertLevel: ThresholdAlertLevel;
  readonly turnoverUtilizationPct: DecimalMoneyString;
  readonly assetUtilizationPct: DecimalMoneyString;
}

export interface TaxProfilePayload {
  readonly profile: NigerianTaxProfile;
  readonly evaluation: SmallCompanyEvaluation;
}

export interface NrsTaxSubtotal {
  readonly taxSchemeId: string;
  readonly categoryCode: string;
  readonly taxableAmountNgn: DecimalMoneyString;
  readonly taxRate: DecimalRateString;
  readonly taxAmountNgn: DecimalMoneyString;
  readonly statutoryCitation: string;
  readonly ruleVersionCode: string;
}

export interface TaxAccountAllocation {
  readonly accountCode: string;
  readonly accountName: string;
  readonly side: "DEBIT" | "CREDIT";
  readonly taxSchemeId: string;
  readonly amountNgn: DecimalMoneyString;
}

export interface TaxComputationPreview {
  readonly effectiveDate: string;
  readonly regime: TaxRegimeType;
  readonly ruleVersionCode: string;
  readonly supplyCategoryCode: string;
  readonly taxableBaseNgn: DecimalMoneyString;
  readonly appliedRate: DecimalRateString;
  readonly computedTaxNgn: DecimalMoneyString;
  readonly vatNrsCategoryCode: string | null;
  readonly whtHigherNoTinApplied: boolean;
  readonly whtExemptSmallEntityApplied: boolean;
  readonly statutoryCitation: string;
  readonly nrsSubtotals: readonly NrsTaxSubtotal[];
}

export interface MultiLayerIndirectTaxBreakdown {
  readonly effectiveDate: string;
  readonly jurisdiction: string;
  readonly baseAmountNgn: DecimalMoneyString;
  readonly vatAmountNgn: DecimalMoneyString;
  readonly stateConsumptionTaxNgn: DecimalMoneyString;
  readonly serviceChargeNgn: DecimalMoneyString;
  readonly whtDeductionNgn: DecimalMoneyString;
  readonly grossCustomerInvoiceNgn: DecimalMoneyString;
  readonly netCashPayableNgn: DecimalMoneyString;
  readonly vatNrsCategoryCode: string;
  readonly whtHigherNoTinApplied: boolean;
  readonly whtExemptSmallEntityApplied: boolean;
  readonly accountPostings: readonly TaxAccountAllocation[];
  readonly nrsSubtotals: readonly NrsTaxSubtotal[];
}
