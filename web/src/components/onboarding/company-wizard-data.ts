export type AccountGroup = "Assets" | "Liabilities" | "Equity" | "Income" | "Expenses";

export interface AccountPreviewItem {
  readonly code: string;
  readonly simpleName: string;
  readonly accountName: string;
  readonly group: AccountGroup;
}

export interface SectorTemplateOption {
  readonly code: string;
  readonly title: string;
  readonly subtitle: string;
  readonly sampleCity: string;
  readonly iconKey: "store" | "truck" | "factory" | "hammer" | "briefcase" | "heart";
  readonly enabledBooks: readonly string[];
  readonly accounts: readonly AccountPreviewItem[];
}

export interface ComposableModuleOption {
  readonly id: string;
  readonly label: string;
  readonly subtitle: string;
  readonly extraAccounts: readonly AccountPreviewItem[];
}

/**
 * Standard Nigerian IFRS core GL accounts seeded for every registered business
 * (Assets 1xxx, Liabilities & Taxes 2xxx, Equity 3xxx, Operating Expenses 6xxx),
 * merged cleanly with each sector's operational & revenue accounts.
 */
const CORE_NIGERIAN_BACKBONE: readonly AccountPreviewItem[] = [
  { code: "1010", simpleName: "Cash on Hand / Petty Cash", accountName: "Cash in Hand & Till Float", group: "Assets" },
  { code: "1110", simpleName: "Cash in Zenith / GTBank", accountName: "Operating Bank Accounts (NGN)", group: "Assets" },
  { code: "1115", simpleName: "USD Domiciliary Account", accountName: "Foreign Currency Domiciliary Bank", group: "Assets" },
  { code: "1130", simpleName: "Rent Paid in Advance", accountName: "Prepaid Rent & Insurance", group: "Assets" },
  { code: "1510", simpleName: "Computers, POS & Fixtures", accountName: "Office Equipment & Shop Fixtures", group: "Assets" },
  { code: "1520", simpleName: "Generators, Solar & Vehicles", accountName: "Plant, Vehicles & Generators", group: "Assets" },
  { code: "1590", simpleName: "Accumulated Wear & Tear", accountName: "Accumulated Depreciation", group: "Assets" },
  { code: "2110", simpleName: "Bills Owed to Suppliers", accountName: "Trade Accounts Payable", group: "Liabilities" },
  { code: "2210", simpleName: "7.5% Output VAT Safe Pot", accountName: "Output VAT Payable (7.5% NRS)", group: "Liabilities" },
  { code: "2215", simpleName: "VAT Paid on Purchases (Input)", accountName: "Recoverable Input VAT", group: "Liabilities" },
  { code: "2220", simpleName: "WHT Deducted from Vendors", accountName: "Withholding Tax Payable (WHT)", group: "Liabilities" },
  { code: "2240", simpleName: "Staff PAYE & Pension Payable", accountName: "PAYE Tax & PENCOM Deductions", group: "Liabilities" },
  { code: "2260", simpleName: "Company Income Tax Provision", accountName: "Estimated CIT / Dev Levy Payable", group: "Liabilities" },
  { code: "3010", simpleName: "Owner Capital Put In", accountName: "Issued Share Capital / Owner Equity", group: "Equity" },
  { code: "3100", simpleName: "Profit Saved from Prior Years", accountName: "Retained Earnings", group: "Equity" },
  { code: "3200", simpleName: "Owner Drawings", accountName: "Owner Dividends & Drawings", group: "Equity" },
  { code: "6110", simpleName: "Staff Salaries & Allowances", accountName: "Payroll & Staff Welfare Expense", group: "Expenses" },
  { code: "6120", simpleName: "Rent & Estate Service Charge", accountName: "Occupancy & Rent Expense", group: "Expenses" },
  { code: "6130", simpleName: "Diesel, Fuel & NEPA / Solar", accountName: "Power, Diesel & Generator Maintenance", group: "Expenses" },
  { code: "6140", simpleName: "Data, Airtime & Software", accountName: "Telecoms, Internet & Subscriptions", group: "Expenses" },
  { code: "6150", simpleName: "Bank SMS, Stamp & POS Charges", accountName: "Bank & Electronic Transfer Charges", group: "Expenses" },
  { code: "6190", simpleName: "Depreciation Expense", accountName: "Depreciation on Property & Equipment", group: "Expenses" },
];

function mergeAccounts(
  sectorSpecific: readonly AccountPreviewItem[],
): readonly AccountPreviewItem[] {
  const byCode = new Map<string, AccountPreviewItem>();
  for (const item of CORE_NIGERIAN_BACKBONE) {
    byCode.set(item.code, item);
  }
  for (const item of sectorSpecific) {
    byCode.set(item.code, item);
  }
  return Array.from(byCode.values()).sort((a, b) => a.code.localeCompare(b.code));
}

export const SECTOR_TEMPLATES: readonly [SectorTemplateOption, ...SectorTemplateOption[]] = [
  {
    code: "RETAIL_ECOMMERCE",
    title: "Retail & Online Shop",
    subtitle: "Sell products in store or online",
    sampleCity: "Balogun · Wuse · Lekki",
    iconKey: "store",
    enabledBooks: ["Daily POS Close", "Sales Invoice", "7.5% VAT Pot", "Stock Count"],
    accounts: mergeAccounts([
      { code: "1120", simpleName: "Unpaid Credit Sales", accountName: "Trade Accounts Receivable", group: "Assets" },
      { code: "1125", simpleName: "Moniepoint & Paystack Clearing", accountName: "POS & PSP Clearing Receivable", group: "Assets" },
      { code: "1200", simpleName: "Goods Sitting in Store", accountName: "Retail Merchandise Inventory (IAS 2)", group: "Assets" },
      { code: "4010", simpleName: "Walk-in & Online Sales", accountName: "Retail Store & Online Revenue", group: "Income" },
      { code: "4050", simpleName: "Sales Discounts & Returns", accountName: "Discounts Allowed & Sales Returns", group: "Income" },
      { code: "5010", simpleName: "Cost of Stock Sold", accountName: "Cost of Goods Sold (COGS)", group: "Expenses" },
      { code: "5040", simpleName: "Packaging & Customer Delivery", accountName: "Store Packaging & Dispatch Fees", group: "Expenses" },
    ]),
  },
  {
    code: "WHOLESALE_DISTRIBUTION",
    title: "Wholesale & Supply",
    subtitle: "Buy in bulk and distribute",
    sampleCity: "Onitsha · Kano · Idumota",
    iconKey: "truck",
    enabledBooks: ["Customer Credit Aging", "Purchase Order", "Warehouse Transfer", "Lorry Freight Log"],
    accounts: mergeAccounts([
      { code: "1120", simpleName: "Money Distributors Owe", accountName: "Distributor Trade Receivables", group: "Assets" },
      { code: "1210", simpleName: "Depot Stock Valuation", accountName: "Wholesale Warehouse Inventory", group: "Assets" },
      { code: "1250", simpleName: "Goods in Transit / Port", accountName: "Imported Stock in Transit (IAS 21)", group: "Assets" },
      { code: "4100", simpleName: "Bulk Carton & Depot Sales", accountName: "Wholesale Distribution Revenue", group: "Income" },
      { code: "5010", simpleName: "Landed Cost of Stock Sold", accountName: "Wholesale Cost of Goods Sold", group: "Expenses" },
      { code: "5060", simpleName: "Waybill, Clearing & Haulage", accountName: "Inward Freight & Lorry Logistics", group: "Expenses" },
    ]),
  },
  {
    code: "MANUFACTURING_LIGHT",
    title: "Maker & Light Factory",
    subtitle: "Turn raw materials into goods",
    sampleCity: "Aba · Ogun · Kaduna",
    iconKey: "factory",
    enabledBooks: ["Bill of Materials", "Factory Production Run", "Diesel & Utility Cost", "Finished Goods"],
    accounts: mergeAccounts([
      { code: "1120", simpleName: "Trade Customer Balances", accountName: "Factory Trade Receivables", group: "Assets" },
      { code: "1215", simpleName: "Raw Materials in Store", accountName: "Raw Materials Inventory", group: "Assets" },
      { code: "1220", simpleName: "Unfinished Factory Batch", accountName: "Work-in-Progress (WIP)", group: "Assets" },
      { code: "1230", simpleName: "Finished Goods Ready to Sell", accountName: "Finished Goods Inventory", group: "Assets" },
      { code: "4200", simpleName: "Manufactured Goods Sales", accountName: "Factory Product Revenue", group: "Income" },
      { code: "5100", simpleName: "Cost per Produced Unit", accountName: "Cost of Goods Manufactured (COGM)", group: "Expenses" },
      { code: "5140", simpleName: "Factory Floor Wages & Direct Power", accountName: "Direct Labor & Factory Overheads", group: "Expenses" },
    ]),
  },
  {
    code: "CONSTRUCTION_CONTRACTING",
    title: "Builder & Contractor",
    subtitle: "Projects, sites, and subcontractors",
    sampleCity: "Abuja · Port Harcourt · Enugu",
    iconKey: "hammer",
    enabledBooks: ["Milestone Certificate", "Site Expense Log", "WHT 2%/5% Tracker", "Retention Pot"],
    accounts: mergeAccounts([
      { code: "1120", simpleName: "Client Progress Bills", accountName: "Contract Milestones Receivable", group: "Assets" },
      { code: "1140", simpleName: "Retention Held by Client", accountName: "Contract Retention Asset (IFRS 15)", group: "Assets" },
      { code: "1340", simpleName: "WHT Certificates Held", accountName: "Withholding Tax Credit Asset", group: "Assets" },
      { code: "2150", simpleName: "Client Advance Mobilization", accountName: "Unearned Mobilization Liability", group: "Liabilities" },
      { code: "4300", simpleName: "Certified Site Revenue", accountName: "Contract Revenue Recognized", group: "Income" },
      { code: "5210", simpleName: "Cement, Steel & Subcontractors", accountName: "Direct Project Site Costs", group: "Expenses" },
      { code: "5240", simpleName: "Site Artisans & Security", accountName: "Site Labor & Security Expense", group: "Expenses" },
    ]),
  },
  {
    code: "PROFESSIONAL_SERVICES",
    title: "Services & Agency",
    subtitle: "Clients, retainers, and hours",
    sampleCity: "Victoria Island · Yaba · Abuja",
    iconKey: "briefcase",
    enabledBooks: ["Client Retainer Invoice", "WHT 10% Credit Tracker", "Payroll & Pension", "Fee Notes"],
    accounts: mergeAccounts([
      { code: "1120", simpleName: "Unpaid Client Invoices", accountName: "Fee Notes Receivable", group: "Assets" },
      { code: "1340", simpleName: "10% WHT Tax Credits", accountName: "Recoverable WHT Asset (FIRS)", group: "Assets" },
      { code: "2155", simpleName: "Client Pre-Paid Retainers", accountName: "Deferred Retainer Revenue", group: "Liabilities" },
      { code: "4400", simpleName: "Consulting & Retainer Fees", accountName: "Professional Service Revenue", group: "Income" },
      { code: "5320", simpleName: "External Consultants & Freelancers", accountName: "Subcontracted Advisory Costs", group: "Expenses" },
      { code: "6160", simpleName: "Audit, Legal & CAC Renewals", accountName: "Professional & Regulatory Dues", group: "Expenses" },
    ]),
  },
  {
    code: "NONPROFIT_GRANT",
    title: "Non-Profit / NGO",
    subtitle: "Donations, grants, and programs",
    sampleCity: "Nationwide Grant Teams",
    iconKey: "heart",
    enabledBooks: ["Donor Grant Pots", "Program Spend Log", "WHT Vendor Check", "Donor Audit Export"],
    accounts: mergeAccounts([
      { code: "1112", simpleName: "Ring-Fenced Donor Bank", accountName: "Restricted Donor Bank Account", group: "Assets" },
      { code: "1135", simpleName: "Pledged Grant Tranches", accountName: "Grants & Pledges Receivable", group: "Assets" },
      { code: "3050", simpleName: "Restricted Donor Reserves", accountName: "Restricted Program Net Assets", group: "Equity" },
      { code: "4500", simpleName: "Grants & Donations Received", accountName: "Restricted & Unrestricted Grants", group: "Income" },
      { code: "5400", simpleName: "Direct Field Program Spend", accountName: "Program Delivery Expenses", group: "Expenses" },
      { code: "5430", simpleName: "Field Stipends & Community Logistics", accountName: "Field Operations & Beneficiary Aid", group: "Expenses" },
    ]),
  },
];

export const COMPOSABLE_MODULES: readonly ComposableModuleOption[] = [
  {
    id: "hotel",
    label: "Hotel & Short-Let Rooms",
    subtitle: "Nightly room revenue & USALI occupancy",
    extraAccounts: [
      { code: "2170", simpleName: "Guest Caution Deposits", accountName: "Refundable Guest Security Deposits", group: "Liabilities" },
      { code: "4610", simpleName: "Room Bookings & Short-Let Income", accountName: "Hospitality Room Revenue (USALI)", group: "Income" },
      { code: "5305", simpleName: "Laundry, Housekeeping & Amenities", accountName: "Rooms Dept Direct Expense", group: "Expenses" },
    ],
  },
  {
    id: "diner",
    label: "Restaurant & Kitchen",
    subtitle: "Food cost %, bar stock & consumption tax",
    extraAccounts: [
      { code: "1205", simpleName: "Kitchen Food & Bar Stock", accountName: "Perishable Food & Beverage Inventory", group: "Assets" },
      { code: "2218", simpleName: "State Consumption Tax (5%)", accountName: "Hotel & Restaurant Consumption Tax", group: "Liabilities" },
      { code: "4630", simpleName: "Diner, Takeout & Bar Sales", accountName: "Food & Beverage Sales Revenue", group: "Income" },
      { code: "5310", simpleName: "Kitchen Ingredients & Cooking Gas", accountName: "Kitchen COGS & Food Cost", group: "Expenses" },
    ],
  },
  {
    id: "retail_pos",
    label: "Shop & Moniepoint POS",
    subtitle: "Fast daily till & settlement matching",
    extraAccounts: [
      { code: "1125", simpleName: "POS & Transfer Clearing", accountName: "Merchant POS Clearing Asset", group: "Assets" },
      { code: "4010", simpleName: "Storefront Walk-In Sales", accountName: "Retail Storefront Revenue", group: "Income" },
    ],
  },
  {
    id: "logistics",
    label: "Delivery Riders & Fleet",
    subtitle: "Fuel, repairs & waybill margin per trip",
    extraAccounts: [
      { code: "4660", simpleName: "Dispatch & Waybill Income", accountName: "Delivery & Fleet Service Revenue", group: "Income" },
      { code: "5350", simpleName: "Fleet Fuel, Riders & Servicing", accountName: "Logistics Fleet Operating Cost", group: "Expenses" },
    ],
  },
];

export const LEGAL_STRUCTURES = [
  { id: "LIMITED_COMPANY", label: "Limited Company (Ltd)" },
  { id: "SOLE_PROPRIETOR", label: "Business Name / Enterprise" },
  { id: "PARTNERSHIP", label: "Partnership / LLP" },
  { id: "INCORPORATED_TRUSTEES", label: "NGO / Trustees" },
] as const;

export const NIGERIAN_STATES = [
  "Lagos",
  "Abuja (FCT)",
  "Rivers",
  "Oyo",
  "Kano",
  "Ogun",
  "Anambra",
  "Enugu",
  "Kaduna",
  "Abia",
  "Delta",
  "Edo",
] as const;

export const FISCAL_MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

export type SetupMethod = "INDUSTRY_TEMPLATE" | "CUSTOM_COMPOSABLE" | "CUSTOM_IMPORT";
export type AccountingMethod = "ACCRUAL" | "CASH";
export type PostingMethod = "REAL_TIME" | "BATCH";
export type PeriodStructure = "MONTHLY_12" | "QUARTERLY_13";
export type TurnoverBand = "UNDER_25M" | "BETWEEN_25M_100M" | "OVER_100M";

export interface IfrsGroupClassification {
  readonly groupCode: string;
  readonly groupName: string;
  readonly ifrsSection: string;
  readonly ifrsStandard: string;
}

const IFRS_GROUP_RULES: readonly {
  readonly match: (code: string) => boolean;
  readonly meta: IfrsGroupClassification;
}[] = [
  {
    match: (c) => c.startsWith("10") || c === "1110" || c === "1112" || c === "1115" || c === "1125",
    meta: {
      groupCode: "1100",
      groupName: "Cash and Cash Equivalents",
      ifrsSection: "Current Assets",
      ifrsStandard: "IAS 7",
    },
  },
  {
    match: (c) => c === "1120" || c === "1130" || c === "1135" || c === "1140" || c === "1340",
    meta: {
      groupCode: "1200",
      groupName: "Trade and Other Receivables",
      ifrsSection: "Current Assets",
      ifrsStandard: "IFRS 9 / IAS 1",
    },
  },
  {
    match: (c) => c.startsWith("12"),
    meta: {
      groupCode: "1300",
      groupName: "Inventories",
      ifrsSection: "Current Assets",
      ifrsStandard: "IAS 2",
    },
  },
  {
    match: (c) => c.startsWith("15"),
    meta: {
      groupCode: "1500",
      groupName: "Property, Plant and Equipment (Fixed Assets)",
      ifrsSection: "Non-Current Assets",
      ifrsStandard: "IAS 16",
    },
  },
  {
    match: (c) => c.startsWith("21"),
    meta: {
      groupCode: "2100",
      groupName: "Trade and Other Payables",
      ifrsSection: "Current Liabilities",
      ifrsStandard: "IFRS 9",
    },
  },
  {
    match: (c) => c.startsWith("22"),
    meta: {
      groupCode: "2200",
      groupName: "Current Tax & Statutory Liabilities",
      ifrsSection: "Current Liabilities",
      ifrsStandard: "IAS 12",
    },
  },
  {
    match: (c) => c.startsWith("3"),
    meta: {
      groupCode: "3000",
      groupName: "Share Capital and Reserves",
      ifrsSection: "Equity",
      ifrsStandard: "IAS 1",
    },
  },
  {
    match: (c) => c.startsWith("4"),
    meta: {
      groupCode: "4000",
      groupName: "Revenue from Contracts with Customers",
      ifrsSection: "Revenue",
      ifrsStandard: "IFRS 15",
    },
  },
  {
    match: (c) => c.startsWith("5"),
    meta: {
      groupCode: "5000",
      groupName: "Cost of Sales & Direct Costs",
      ifrsSection: "Expenses",
      ifrsStandard: "IAS 2 / IAS 1",
    },
  },
];

export function getIfrsGroupForAccount(acc: AccountPreviewItem): IfrsGroupClassification {
  const matched = IFRS_GROUP_RULES.find((rule) => rule.match(acc.code));
  if (matched) return matched.meta;
  return {
    groupCode: "6000",
    groupName: "Administrative & Operating Expenses",
    ifrsSection: "Expenses",
    ifrsStandard: "IAS 1",
  };
}

export function buildComposableAccounts(
  baseAccounts: readonly AccountPreviewItem[],
  extraModules: readonly ComposableModuleOption[],
): readonly AccountPreviewItem[] {
  const byCode = new Map<string, AccountPreviewItem>();
  for (const item of baseAccounts) {
    byCode.set(item.code, item);
  }
  for (const mod of extraModules) {
    for (const acc of mod.extraAccounts) {
      byCode.set(acc.code, acc);
    }
  }
  return Array.from(byCode.values()).sort((a, b) => a.code.localeCompare(b.code));
}

export function getShortMonthSequence(startMonth: string): readonly string[] {
  const shortNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const startIdx = Math.max(
    0,
    FISCAL_MONTHS.findIndex((m) => m === startMonth),
  );
  return Array.from({ length: 12 }, (_, offset) => shortNames[(startIdx + offset) % 12] ?? "Jan");
}

export function getTaxActSummary(band: TurnoverBand, businessType: string): {
  readonly citLabel: string;
  readonly vatLabel: string;
  readonly devLevyLabel: string;
  readonly note: string;
} {
  if (businessType === "NONPROFIT_GRANT") {
    return {
      citLabel: "CIT Exempt (Non-Profit)",
      vatLabel: "VAT on Commercial Supplies Only",
      devLevyLabel: "0% Dev Levy",
      note: "Charitable & educational activities remain CIT-exempt; PAYE & vendor WHT tracking stays active.",
    };
  }
  if (businessType === "PROFESSIONAL_SERVICES") {
    return {
      citLabel: "30% CIT (Professional Services)",
      vatLabel: band === "UNDER_25M" ? "VAT Optional (< ₦25M)" : "7.5% VAT Active",
      devLevyLabel: band === "OVER_100M" ? "4% Development Levy" : "Tiered Levy Check",
      note: "Under Nigeria Tax Act 2025, professional services firms are excluded from the small-company 0% CIT exemption.",
    };
  }
  if (band === "UNDER_25M") {
    return {
      citLabel: "0% Company Tax (Small Business)",
      vatLabel: "VAT Exempt (Under ₦25M)",
      devLevyLabel: "0% Development Levy",
      note: "Qualifies as a small Nigerian company under Tax Act 2025: 0% CIT and simplified filings.",
    };
  }
  if (band === "BETWEEN_25M_100M") {
    return {
      citLabel: "0% Company Tax (Under ₦100M Tier)",
      vatLabel: "7.5% VAT Monthly Pot Active",
      devLevyLabel: "0% Development Levy",
      note: "Turnover under ₦100M keeps you at 0% CIT while NairaBooks automatically rings off your 7.5% VAT.",
    };
  }
  return {
    citLabel: "30% Standard Company Tax",
    vatLabel: "7.5% VAT Monthly Return",
    devLevyLabel: "4% Development Levy",
    note: "Full Nigeria Tax Act 2025 corporate provisioning with automated WHT credit offsets and IFRS schedules.",
  };
}
