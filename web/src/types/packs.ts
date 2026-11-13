import type { AccountCategory } from "@/types/ledger";

export type FlagshipPackCode =
  | "RETAIL_ECOMMERCE"
  | "WHOLESALE_DISTRIBUTION"
  | "MANUFACTURING_LIGHT"
  | "CONSTRUCTION_TRADES"
  | "PROFESSIONAL_SERVICES"
  | "NON_PROFIT"
  | "CUSTOM_COMPOSABLE";

export type OperationalPrimitive =
  | "POS_DAILY_CASHUP"
  | "SKU_INVENTORY_COGS"
  | "MULTI_TIER_WAREHOUSE_PO"
  | "BILL_OF_MATERIALS_WIP"
  | "JOB_COSTING_RETENTION"
  | "TIME_RETAINER_BILLING"
  | "FUND_GRANT_ACCOUNTING"
  | "HOSPITALITY_FOLIO_USALI"
  | "DINER_RECIPE_TABLE"
  | "LOGISTICS_FLEET_TRIP";

export interface PackAccountBlueprint {
  code: string;
  name: string;
  category: AccountCategory;
  ifrsTag: string;
  sourcePrimitive: OperationalPrimitive;
  isSystemLocked: boolean;
}

export interface PackDimensionSpec {
  key: string;
  label: string;
  required: boolean;
}

export interface PackKpiDefinition {
  key: string;
  label: string;
  formulaPlainEnglish: string;
}

export interface PackTaxDefaults {
  vatRegistered: boolean;
  defaultVatRegime: string;
  isProfessionalServices: boolean;
  includeStateConsumptionTax: boolean;
  defaultServiceChargeRate: string;
  defaultWhtCategory: string | null;
}

export interface PrimitiveCapabilitySpec {
  primitive: OperationalPrimitive;
  displayName: string;
  plainEnglishSummary: string;
  accounts: PackAccountBlueprint[];
  dimensions: PackDimensionSpec[];
  kpis: PackKpiDefinition[];
  vocabularyDefaults: Record<string, string>;
  taxHints: PackTaxDefaults;
}

export interface PackModuleDescriptor {
  primitive: OperationalPrimitive;
  enabled: boolean;
  customLabels: Record<string, string>;
}

export interface WorkspaceIndustryProfile {
  id: string;
  workspaceId: string;
  primaryPack: FlagshipPackCode;
  isHybridMultiUnit: boolean;
  activePrimitives: PackModuleDescriptor[];
  kpiWidgets: string[];
  terminologyMap: Record<string, string>;
  dimensions: PackDimensionSpec[];
  taxDefaults: PackTaxDefaults;
  coaAccounts: PackAccountBlueprint[];
  updatedAt: string;
}

export interface PackWorkspacePayload {
  primitives: PrimitiveCapabilitySpec[];
  profile: WorkspaceIndustryProfile;
}

export type PackOperationType =
  | "RETAIL_POS_CASHUP"
  | "WHOLESALE_LANDED_RECEIPT"
  | "MANUFACTURING_BOM_RUN"
  | "CONSTRUCTION_JOB_PROGRESS"
  | "PROFESSIONAL_TIME_BILLING"
  | "NONPROFIT_GRANT_ACTIVITY"
  | "HOSPITALITY_FOLIO_SETTLEMENT"
  | "DINER_SERVICE_SHIFT";

export interface FlagshipPackPreset {
  packCode: FlagshipPackCode;
  title: string;
  plainEnglishSummary: string;
  targetSectors: string[];
  recommendedPrimitives: OperationalPrimitive[];
  terminologyDefaults: Record<string, string>;
  taxHighlights: string[];
  phaseStatus: string;
}

export interface PackPlannedLine {
  accountCode: string;
  accountName: string;
  debitNgn: string;
  creditNgn: string;
  memo: string;
}

export interface PackOperationPostResult {
  operationType: PackOperationType;
  reference: string;
  postingDate: string;
  summary: string;
  metrics: Record<string, string>;
  lines: PackPlannedLine[];
}
