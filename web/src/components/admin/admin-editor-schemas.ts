import type { RecordModuleId } from "@/components/admin/admin-maintain-data";

export type EditorFieldType =
  | "text"
  | "email"
  | "select"
  | "number"
  | "date"
  | "textarea"
  | "checkbox";

export interface EditorTabSpec {
  readonly id: string;
  readonly label: string;
  readonly hint: string;
  /** Optional rich visual widget rendered at top of tab */
  readonly widget?:
    | "customer-history"
    | "vendor-history"
    | "account-period-history"
    | "budget-12m-grid"
    | "inventory-stock-kpi"
    | "job-progress-kpi"
    | "employee-statutory-kpi"
    | "asset-depreciation-kpi"
    | "price-preview-kpi"
    | "journal-pair-preview";
}

export interface EditorFieldSpec {
  readonly key: string;
  readonly label: string;
  readonly tab: string;
  readonly type: EditorFieldType;
  readonly placeholder?: string;
  readonly options?: readonly string[];
  readonly width?: "half" | "full";
  readonly helperText?: string;
  readonly defaultValue?: string;
  /** Shown in Simple Creation mode as well as Full Mode */
  readonly includeInSimple?: boolean;
  /** Section heading inside tab */
  readonly section?: string;
}

export interface ModuleEditorBlueprint {
  readonly moduleId: RecordModuleId;
  readonly titleSingular: string;
  readonly idPrefix: string;
  readonly supportsDebitCreditBalance: boolean;
  readonly defaultBalanceSide: "DR" | "CR";
  readonly supportsProspectToggle?: boolean;
  readonly supportsSalesRepToggle?: boolean;
  readonly supportsCommissionToggle?: boolean;
  readonly supportsPhasesToggle?: boolean;
  readonly simpleIntro: string;
  readonly fullIntro: string;
  readonly tabs: readonly EditorTabSpec[];
  readonly fields: readonly EditorFieldSpec[];
}

export const MODULE_EDITOR_BLUEPRINTS: Record<RecordModuleId, ModuleEditorBlueprint> = {
  customers: {
    moduleId: "customers",
    titleSingular: "Customer",
    idPrefix: "CUS-",
    supportsDebitCreditBalance: true,
    defaultBalanceSide: "DR",
    supportsProspectToggle: true,
    simpleIntro:
      "Fast essentials to start invoicing this customer cleanly—add full addresses, shipping, and credit controls anytime.",
    fullIntro:
      "Full Customer Master: billing/shipping contacts, ledger history, sales GL routing, and credit limits.",
    tabs: [
      {
        id: "general",
        label: "General",
        hint: "Bill-to contact, TIN, addresses, and customizable Nigerian CRM fields.",
      },
      {
        id: "contacts",
        label: "Contacts",
        hint: "Finance, procurement, and secondary delivery contacts.",
      },
      {
        id: "history",
        label: "History",
        hint: "Running Debit/Credit receivable ledger and recent statement totals.",
        widget: "customer-history",
      },
      {
        id: "sales-info",
        label: "Sales Info",
        hint: "Assigned sales rep, GL revenue account, pricing tier, and tax exemption.",
      },
      {
        id: "payment-credit",
        label: "Payment & Credit",
        hint: "Net payment terms, credit ceiling, and approved settlement rails.",
      },
    ],
    fields: [
      {
        key: "billToContact",
        label: "Bill-To Contact",
        tab: "general",
        section: "Primary Contact & Billing Address",
        type: "text",
        placeholder: "e.g. Tunde Bakare",
        includeInSimple: true,
      },
      {
        key: "accountNumber",
        label: "Account Number",
        tab: "general",
        section: "Primary Contact & Billing Address",
        type: "text",
        placeholder: "e.g. AR-EKO-104",
      },
      {
        key: "billingAddress1",
        label: "Billing Address Line 1",
        tab: "general",
        section: "Primary Contact & Billing Address",
        type: "text",
        placeholder: "Street, plot, or estate",
        width: "full",
      },
      {
        key: "cityStateZip",
        label: "City / State / Postal Code",
        tab: "general",
        section: "Primary Contact & Billing Address",
        type: "text",
        placeholder: "e.g. Victoria Island, Lagos 106104",
      },
      {
        key: "country",
        label: "Country",
        tab: "general",
        section: "Primary Contact & Billing Address",
        type: "select",
        options: ["Nigeria", "Ghana", "Kenya", "United Kingdom", "United States"],
        defaultValue: "Nigeria",
      },
      {
        key: "salesTaxRule",
        label: "Sales Tax / VAT Rule",
        tab: "general",
        section: "Tax & Channels",
        type: "select",
        options: [
          "VAT 7.5% Standard",
          "VAT 0% Basic Food / Agro",
          "VAT Exempt (Diplomatic / NGO)",
          "Reverse Charge B2B",
        ],
        defaultValue: "VAT 7.5% Standard",
      },
      {
        key: "tinNumber",
        label: "FIRS / NRS TIN",
        tab: "general",
        section: "Tax & Channels",
        type: "text",
        placeholder: "e.g. 10948211-0001",
      },
      {
        key: "phone1",
        label: "Telephone 1",
        tab: "general",
        section: "Tax & Channels",
        type: "text",
        placeholder: "+234 803 000 0000",
      },
      {
        key: "email",
        label: "Billing E-mail",
        tab: "general",
        section: "Tax & Channels",
        type: "email",
        placeholder: "accounts@clientcompany.ng",
        includeInSimple: true,
      },
      {
        key: "website",
        label: "Website",
        tab: "general",
        section: "Tax & Channels",
        type: "text",
        placeholder: "https://clientcompany.ng",
      },
      {
        key: "customFieldZone",
        label: "Custom Field 1 · Delivery LGA / Zone",
        tab: "general",
        section: "Customizable Fields",
        type: "text",
        placeholder: "e.g. Lagos Island / Lekki Corridor",
      },
      {
        key: "customFieldSector",
        label: "Custom Field 2 · Industry Sector",
        tab: "general",
        section: "Customizable Fields",
        type: "text",
        placeholder: "e.g. Hospitality & Suites",
      },
      {
        key: "secondaryContactName",
        label: "Accounts Payable / Finance Contact",
        tab: "contacts",
        type: "text",
        placeholder: "Full name",
      },
      {
        key: "secondaryContactEmail",
        label: "Secondary Contact E-mail",
        tab: "contacts",
        type: "email",
        placeholder: "payables@client.ng",
      },
      {
        key: "shipToAddress",
        label: "Ship-To Address 1",
        tab: "contacts",
        type: "textarea",
        width: "full",
        placeholder: "Warehouse or branch receiving address (leave blank to copy billing address)",
      },
      {
        key: "salesRep",
        label: "Assigned Sales Rep",
        tab: "sales-info",
        type: "select",
        options: [
          "EMP-011 · Chinedu Okafor",
          "EMP-014 · Amina Bello",
          "House Direct Account",
        ],
        defaultValue: "EMP-011 · Chinedu Okafor",
      },
      {
        key: "salesGlAccount",
        label: "GL Sales Account",
        tab: "sales-info",
        type: "select",
        options: [
          "4100 — Product & Goods Sales",
          "4200 — Service & Retainer Revenue",
          "4300 — Export Revenue (Zero VAT)",
        ],
        defaultValue: "4100 — Product & Goods Sales",
      },
      {
        key: "pricingLevel",
        label: "Pricing Level",
        tab: "sales-info",
        type: "select",
        options: [
          "Standard Retail Price",
          "Corporate Tier A (-8%)",
          "Wholesale Bulk Tier B (-15%)",
        ],
        defaultValue: "Standard Retail Price",
      },
      {
        key: "paymentTerms",
        label: "Payment Terms",
        tab: "payment-credit",
        type: "select",
        options: [
          "Due on Receipt (COD)",
          "Net 7 Days",
          "Net 14 Days",
          "Net 30 Days",
          "Advance Retainer",
        ],
        defaultValue: "Net 30 Days",
      },
      {
        key: "creditLimit",
        label: "Credit Limit (₦)",
        tab: "payment-credit",
        type: "text",
        placeholder: "e.g. ₦5,000,000",
        defaultValue: "₦2,500,000",
        helperText: "Enforced cleanly before approving credit sales invoices.",
      },
      {
        key: "creditStatus",
        label: "Credit Control Status",
        tab: "payment-credit",
        type: "select",
        options: [
          "Good Standing",
          "Approved",
          "Notify Over Limit",
          "Hold — Cash Only",
        ],
        defaultValue: "Good Standing",
      },
      {
        key: "paymentMethod",
        label: "Preferred Payment Method",
        tab: "payment-credit",
        type: "select",
        options: [
          "Bank Transfer (NIP)",
          "Paystack / Card",
          "Direct Debit",
          "Cheque",
        ],
        defaultValue: "Bank Transfer (NIP)",
      },
    ],
  },

  vendors: {
    moduleId: "vendors",
    titleSingular: "Vendor",
    idPrefix: "VND-",
    supportsDebitCreditBalance: true,
    defaultBalanceSide: "CR",
    simpleIntro:
      "Quickly register a Nigerian supplier with default WHT rate and settlement balance.",
    fullIntro:
      "Full Vendor Master: mailing & NUBAN remit-to banking, NRS WHT rate classification, and expense GL routing.",
    tabs: [
      {
        id: "general",
        label: "General",
        hint: "Vendor identity, mailing address, NRS WHT rate, and default expense GL account.",
      },
      {
        id: "addresses",
        label: "Addresses & Remit",
        hint: "Remit-to address and Nigerian NUBAN bank account for transfers.",
      },
      {
        id: "history",
        label: "History",
        hint: "Payables ledger snapshot (DR/CR balance) and bill history.",
        widget: "vendor-history",
      },
      {
        id: "purchase-info",
        label: "Purchase Info",
        hint: "Default expense account, credit terms, and TIN verification.",
      },
    ],
    fields: [
      {
        key: "contactName",
        label: "Primary Contact",
        tab: "general",
        type: "text",
        placeholder: "e.g. Suleiman Adeyemi",
        includeInSimple: true,
      },
      {
        key: "accountNumber",
        label: "Vendor Account #",
        tab: "general",
        type: "text",
        placeholder: "e.g. AP-DIE-201",
      },
      {
        key: "whtType",
        label: "NRS Withholding Tax (WHT) Category",
        tab: "general",
        type: "select",
        options: [
          "2% Corporate Supply (NRS)",
          "5% General Supplies / Contracts",
          "10% Professional & Technical Services",
          "Exempt — Small Supplier Threshold",
        ],
        defaultValue: "2% Corporate Supply (NRS)",
        includeInSimple: true,
      },
      {
        key: "mailingAddress1",
        label: "Mailing Address",
        tab: "general",
        type: "text",
        width: "full",
        placeholder: "Street / Industrial Estate",
      },
      {
        key: "cityStateZip",
        label: "City / State",
        tab: "general",
        type: "text",
        placeholder: "e.g. Ikeja, Lagos",
      },
      {
        key: "email",
        label: "Supplier E-mail",
        tab: "general",
        type: "email",
        placeholder: "billing@vendor.ng",
        includeInSimple: true,
      },
      {
        key: "phone1",
        label: "Telephone",
        tab: "general",
        type: "text",
        placeholder: "+234 802 000 0000",
      },
      {
        key: "remitBank",
        label: "NUBAN Remittance Bank & Account",
        tab: "addresses",
        type: "text",
        width: "full",
        placeholder: "e.g. Zenith Bank PLC · 1018492011",
        includeInSimple: true,
      },
      {
        key: "remitAddress",
        label: "Remit-To Physical Address",
        tab: "addresses",
        type: "textarea",
        width: "full",
        placeholder: "Head office remittance address",
      },
      {
        key: "expenseAccount",
        label: "Default GL Expense Account",
        tab: "purchase-info",
        type: "select",
        options: [
          "5100 — Cost of Goods Sold (Inventory)",
          "6110 — Diesel, Power & Utilities",
          "6200 — Rent, Repairs & Professional Fees",
          "1530 — Motor Vehicles (CapEx)",
        ],
        defaultValue: "6110 — Diesel, Power & Utilities",
      },
      {
        key: "tinNumber",
        label: "FIRS / NRS Vendor TIN",
        tab: "purchase-info",
        type: "text",
        placeholder: "e.g. 00482910-0001",
      },
      {
        key: "paymentTerms",
        label: "Purchase Terms",
        tab: "purchase-info",
        type: "select",
        options: ["Net 14 Days", "Net 30 Days", "Cash on Delivery", "50% Deposit"],
        defaultValue: "Net 14 Days",
      },
    ],
  },

  accounts: {
    moduleId: "accounts",
    titleSingular: "GL Account",
    idPrefix: "",
    supportsDebitCreditBalance: true,
    defaultBalanceSide: "DR",
    simpleIntro:
      "Quickly add an IFRS Group Account (header) or Individual postable account under a parent group.",
    fullIntro:
      "Full IFRS Chart of Accounts Maintenance: Group/Individual hierarchy, beginning balances, and monthly Period History.",
    tabs: [
      {
        id: "general",
        label: "General & IFRS Hierarchy",
        hint: "IFRS Statement Element, Group vs Individual level, parent roll-up link, and IAS/IFRS reference.",
      },
      {
        id: "period-history",
        label: "Period History",
        hint: "Debits, Credits, Period Activity, and Running Balance across FY 2026.",
        widget: "account-period-history",
      },
      {
        id: "controls",
        label: "Beginning Balances & Controls",
        hint: "Opening balance migration, contra flags, and manual journal rules.",
      },
    ],
    fields: [
      {
        key: "normalBalanceType",
        label: "Normal Statement Balance",
        tab: "general",
        type: "select",
        options: [
          "Debit Normal (Assets / Expenses)",
          "Credit Normal (Liabilities / Equity / Revenue)",
        ],
        defaultValue: "Debit Normal (Assets / Expenses)",
        includeInSimple: true,
      },
      {
        key: "accountStatementMap",
        label: "FRCN / IFRS Statement Presentation",
        tab: "general",
        type: "select",
        options: [
          "Statement of Financial Position — Non-Current Asset (IAS 1.54a)",
          "Statement of Financial Position — Current Asset (IAS 1.66)",
          "Statement of Financial Position — Current Liability (IAS 1.69)",
          "Statement of Financial Position — Equity (IAS 1.54r)",
          "Statement of Profit or Loss — Revenue (IFRS 15)",
          "Statement of Profit or Loss — Operating Expense (IAS 1.99)",
        ],
        defaultValue: "Statement of Financial Position — Non-Current Asset (IAS 1.54a)",
      },
      {
        key: "notes",
        label: "IFRS Accounting Policy Note",
        tab: "general",
        type: "textarea",
        width: "full",
        placeholder: "Measurement basis (cost model, FIFO, amortized cost, ECL, etc.)",
      },
      {
        key: "openingBalanceDate",
        label: "Beginning Balance Cut-Off Date",
        tab: "controls",
        type: "date",
        defaultValue: "2026-01-01",
      },
      {
        key: "allowDirectPosting",
        label: "Direct Journal Posting Policy",
        tab: "controls",
        type: "select",
        options: [
          "Postable Individual Account",
          "Subledger Control Only (AR / AP / Stock)",
          "Summary Group Roll-Up Only (No Direct Posting)",
        ],
        defaultValue: "Postable Individual Account",
      },
    ],
  },

  budgets: {
    moduleId: "budgets",
    titleSingular: "Budget Cap",
    idPrefix: "BDG-",
    supportsDebitCreditBalance: false,
    defaultBalanceSide: "DR",
    simpleIntro:
      "Set a monthly budget limit and department owner quickly.",
    fullIntro:
      "Full 12-Month Budget Workbench: live monthly period columns, fiscal year filters, and variance guardrails.",
    tabs: [
      {
        id: "grid",
        label: "12-Month Budget Grid",
        hint: "Enter monthly allocations (Jan–Dec) and watch Annual Total & monthly burn update live.",
        widget: "budget-12m-grid",
      },
      {
        id: "filters",
        label: "Scope & Account Filters",
        hint: "Account type filter, department segment, fiscal year, and variance alert threshold.",
      },
      {
        id: "controls",
        label: "Approval & Notes",
        hint: "Cost center owner and auto-lock settings when threshold exceeds 90%.",
      },
    ],
    fields: [
      {
        key: "fiscalYear",
        label: "Fiscal Year",
        tab: "filters",
        type: "select",
        options: ["2026 (Jan–Dec)", "2027 (Jan–Dec)", "FY 2025/2026"],
        defaultValue: "2026 (Jan–Dec)",
        includeInSimple: true,
      },
      {
        key: "accountFilterType",
        label: "Account Filter Type",
        tab: "filters",
        type: "select",
        options: [
          "Income Statement Accounts (Revenue & Expenses)",
          "Operating Expenses Only (6000–6999)",
          "CapEx / Fixed Assets (1500 Group)",
        ],
        defaultValue: "Income Statement Accounts (Revenue & Expenses)",
      },
      {
        key: "budgetOwner",
        label: "Budget Owner",
        tab: "controls",
        type: "text",
        placeholder: "e.g. Facilities & Fleet Lead",
        includeInSimple: true,
      },
      {
        key: "alertThresholdPct",
        label: "Variance Alert Trigger (%)",
        tab: "controls",
        type: "number",
        defaultValue: "90",
      },
      {
        key: "notes",
        label: "Budget Assumptions",
        tab: "controls",
        type: "textarea",
        width: "full",
        placeholder: "e.g. Linked to 2% monthly diesel contingency cap",
      },
    ],
  },

  inventory: {
    moduleId: "inventory",
    titleSingular: "Stock Item",
    idPrefix: "SKU-",
    supportsDebitCreditBalance: false,
    defaultBalanceSide: "DR",
    supportsCommissionToggle: true,
    simpleIntro:
      "Add a product SKU, unit price, and warehouse reorder point fast.",
    fullIntro:
      "Full Stock Master: dual Sales/Purchase descriptions, IAS 2 FIFO costing, GL mappings, and live stock availability.",
    tabs: [
      {
        id: "general",
        label: "General & Descriptions",
        hint: "Item class, sales/purchase descriptions, price level 1, cost method (FIFO), and SKU/UPC.",
        widget: "inventory-stock-kpi",
      },
      {
        id: "gl-stock",
        label: "GL Accounts & Stock",
        hint: "GL Sales, Inventory Asset, Cost of Sales accounts, warehouse location, and reorder point.",
      },
      {
        id: "custom-fields",
        label: "Custom Fields & Attributes",
        hint: "Unit of measure, weight, NAFDAC/batch attributes, and preferred vendor.",
      },
    ],
    fields: [
      {
        key: "itemClass",
        label: "Item Class",
        tab: "general",
        type: "select",
        options: ["Stock Item", "Service Item", "Non-Stock Item", "Assembly / Kit"],
        defaultValue: "Stock Item",
        includeInSimple: true,
      },
      {
        key: "salesDescription",
        label: "Description for Sales (Invoices)",
        tab: "general",
        type: "text",
        width: "full",
        placeholder: "Shown on customer invoices",
        includeInSimple: true,
      },
      {
        key: "purchaseDescription",
        label: "Description for Purchases (POs)",
        tab: "general",
        type: "text",
        width: "full",
        placeholder: "Shown on supplier purchase orders",
      },
      {
        key: "priceLevel1",
        label: "Price Level 1 (₦)",
        tab: "general",
        type: "text",
        placeholder: "e.g. ₦45,000",
        includeInSimple: true,
      },
      {
        key: "lastUnitCost",
        label: "Last Unit Cost (₦)",
        tab: "general",
        type: "text",
        placeholder: "e.g. ₦31,500",
      },
      {
        key: "costMethod",
        label: "IAS 2 Cost Method",
        tab: "general",
        type: "select",
        options: ["FIFO (First-In, First-Out)", "Weighted Average Cost"],
        defaultValue: "FIFO (First-In, First-Out)",
      },
      {
        key: "glSalesAcct",
        label: "GL Sales Account",
        tab: "gl-stock",
        type: "text",
        defaultValue: "4100 — Product & Goods Sales",
      },
      {
        key: "glInventoryAcct",
        label: "GL Inventory Account",
        tab: "gl-stock",
        type: "text",
        defaultValue: "1310 — Merchandise & Finished Goods Inventory",
      },
      {
        key: "glCogsAcct",
        label: "GL Cost of Sales Account",
        tab: "gl-stock",
        type: "text",
        defaultValue: "5100 — Cost of Goods Sold (Inventory)",
      },
      {
        key: "qtyOnHand",
        label: "Quantity on Hand",
        tab: "gl-stock",
        type: "number",
        defaultValue: "42",
        includeInSimple: true,
      },
      {
        key: "qtyOnSo",
        label: "Quantity Committed on Sales Orders",
        tab: "gl-stock",
        type: "number",
        defaultValue: "6",
      },
      {
        key: "minStock",
        label: "Minimum Reorder Stock",
        tab: "gl-stock",
        type: "number",
        defaultValue: "15",
      },
      {
        key: "warehouseLocation",
        label: "Warehouse Location",
        tab: "custom-fields",
        type: "select",
        options: ["Ikeja Main Hub", "Lekki Showroom", "Abuja Depot"],
        defaultValue: "Ikeja Main Hub",
      },
      {
        key: "stockingUnit",
        label: "Stocking Unit of Measure",
        tab: "custom-fields",
        type: "select",
        options: ["Each / Unit", "Carton (12s)", "Litre", "Kilogram", "Bag"],
        defaultValue: "Each / Unit",
      },
      {
        key: "preferredVendor",
        label: "Preferred Vendor",
        tab: "custom-fields",
        type: "text",
        placeholder: "e.g. VND-209 · Ikeja Packaging Hub",
      },
    ],
  },

  jobs: {
    moduleId: "jobs",
    titleSingular: "Job",
    idPrefix: "JOB-",
    supportsDebitCreditBalance: false,
    defaultBalanceSide: "DR",
    supportsPhasesToggle: true,
    simpleIntro:
      "Create a tracked customer job or project with status and budget value.",
    fullIntro:
      "Full Job Costing Master: phase tracking, start/end timelines, percent-complete progress tracker, and estimated revenue vs cost.",
    tabs: [
      {
        id: "general",
        label: "General & Site",
        hint: "Supervisor, linked customer, job site address, PO number, and timeline dates.",
        widget: "job-progress-kpi",
      },
      {
        id: "estimates",
        label: "Estimated Expenses & Revenue",
        hint: "Target revenue, budgeted cost, and live projected margin.",
      },
      {
        id: "custom-fields",
        label: "Notes & Site Fields",
        hint: "Second contact, special site instructions, and phase notes.",
      },
    ],
    fields: [
      {
        key: "forCustomer",
        label: "For Customer",
        tab: "general",
        type: "text",
        placeholder: "e.g. Eko Atlantic Suites Ltd",
        includeInSimple: true,
      },
      {
        key: "supervisor",
        label: "Project Supervisor",
        tab: "general",
        type: "text",
        placeholder: "e.g. Engr. Femi Falana",
        includeInSimple: true,
      },
      {
        key: "jobStatus",
        label: "Job Status",
        tab: "general",
        type: "select",
        options: ["In Progress", "Pending Kickoff", "On Hold", "Completed"],
        defaultValue: "In Progress",
        includeInSimple: true,
      },
      {
        key: "startDate",
        label: "Start Date",
        tab: "general",
        type: "date",
        defaultValue: "2026-09-01",
      },
      {
        key: "projectedEndDate",
        label: "Projected End Date",
        tab: "general",
        type: "date",
        defaultValue: "2026-12-15",
      },
      {
        key: "percentComplete",
        label: "Percent Complete (%)",
        tab: "general",
        type: "number",
        defaultValue: "45",
      },
      {
        key: "estimatedRevenue",
        label: "Estimated Revenue (₦)",
        tab: "estimates",
        type: "number",
        defaultValue: "6500000",
        includeInSimple: true,
      },
      {
        key: "estimatedCost",
        label: "Estimated Cost (₦)",
        tab: "estimates",
        type: "number",
        defaultValue: "4100000",
      },
      {
        key: "poNumber",
        label: "Client PO Number",
        tab: "estimates",
        type: "text",
        placeholder: "PO-2026-881",
      },
      {
        key: "siteInstructions",
        label: "Site Access & Safety Notes",
        tab: "custom-fields",
        type: "textarea",
        width: "full",
        placeholder: "Security gate clearance, delivery windows, HSE requirements",
      },
    ],
  },

  // Comprehensive Nigerian IFRS blueprints for the remaining 7 modules
  employees: {
    moduleId: "employees",
    titleSingular: "Employee",
    idPrefix: "EMP-",
    supportsDebitCreditBalance: false,
    defaultBalanceSide: "DR",
    supportsSalesRepToggle: true,
    simpleIntro:
      "Add a staff member or sales rep with department and monthly gross pay cleanly.",
    fullIntro:
      "Complete Employee & Nigerian Statutory Profile: role, PAYE tax state (LIRS/FCT), PenCom PFA/RSA PIN, NHF relief, and salary bank details.",
    tabs: [
      {
        id: "general",
        label: "General & Role",
        hint: "Staff ID, department, sales rep flag, hire date, and contact info.",
      },
      {
        id: "statutory",
        label: "Pay & Statutory (PAYE / PenCom)",
        hint: "Monthly gross pay, PenCom 8%/10% split preview, LIRS Tax ID, and RSA PIN.",
        widget: "employee-statutory-kpi",
      },
      {
        id: "bank",
        label: "Salary Bank & Custom",
        hint: "NUBAN salary account, emergency contact, and employee notes.",
      },
    ],
    fields: [
      {
        key: "department",
        label: "Department / Team",
        tab: "general",
        type: "select",
        options: [
          "Sales & Retail",
          "Finance & Accounting",
          "Warehouse & Logistics",
          "Hospitality Operations",
          "Executive Management",
        ],
        defaultValue: "Sales & Retail",
        includeInSimple: true,
      },
      {
        key: "jobTitle",
        label: "Job Title",
        tab: "general",
        type: "text",
        placeholder: "e.g. Regional Sales Lead",
        includeInSimple: true,
      },
      {
        key: "email",
        label: "Work E-mail",
        tab: "general",
        type: "email",
        placeholder: "staff@company.ng",
        includeInSimple: true,
      },
      {
        key: "hireDate",
        label: "Hire Date",
        tab: "general",
        type: "date",
        defaultValue: "2025-03-01",
      },
      {
        key: "monthlyGross",
        label: "Monthly Gross Pay (₦)",
        tab: "statutory",
        type: "number",
        defaultValue: "680000",
        includeInSimple: true,
      },
      {
        key: "pfaName",
        label: "PenCom PFA Provider",
        tab: "statutory",
        type: "select",
        options: [
          "ARM Pension Managers",
          "Stanbic IBTC Pension",
          "Access Pensions",
          "Leadway Pensure",
        ],
        defaultValue: "ARM Pension Managers",
      },
      {
        key: "rsaPin",
        label: "PenCom RSA PIN",
        tab: "statutory",
        type: "text",
        placeholder: "PEN100482910422",
      },
      {
        key: "lirsTaxState",
        label: "PAYE State Tax Authority",
        tab: "statutory",
        type: "select",
        options: ["LIRS (Lagos State)", "FCT-IRS (Abuja)", "Ogun IRS", "Rivers IRS"],
        defaultValue: "LIRS (Lagos State)",
      },
      {
        key: "salaryBank",
        label: "Salary Bank & NUBAN Account",
        tab: "bank",
        type: "text",
        width: "full",
        placeholder: "e.g. Access Bank · 0048291820",
      },
    ],
  },

  payroll: {
    moduleId: "payroll",
    titleSingular: "Payroll Rule",
    idPrefix: "PR-",
    supportsDebitCreditBalance: false,
    defaultBalanceSide: "CR",
    simpleIntro: "Configure a Nigerian statutory payroll deduction rule quickly.",
    fullIntro:
      "Nigerian Statutory Payroll Configuration: Employer/Employee split percentages, liability GL mapping, and monthly filing deadlines.",
    tabs: [
      {
        id: "general",
        label: "General & Statutory Rates",
        hint: "Authority name, employer %, employee %, and wage cap.",
      },
      {
        id: "gl",
        label: "GL Mapping & Remittance",
        hint: "Expense & Liability GL accounts plus monthly due date.",
      },
    ],
    fields: [
      {
        key: "authority",
        label: "Statutory Body",
        tab: "general",
        type: "select",
        options: ["PenCom Nigeria", "LIRS / State IRS PAYE", "FMBN NHF (2.5%)", "NSITF ECA (1%)", "ITF"],
        defaultValue: "PenCom Nigeria",
        includeInSimple: true,
      },
      {
        key: "employerRatePct",
        label: "Employer Contribution (%)",
        tab: "general",
        type: "number",
        defaultValue: "10",
        includeInSimple: true,
      },
      {
        key: "employeeRatePct",
        label: "Employee Deduction (%)",
        tab: "general",
        type: "number",
        defaultValue: "8",
        includeInSimple: true,
      },
      {
        key: "expenseAcct",
        label: "Payroll Expense GL Account",
        tab: "gl",
        type: "text",
        defaultValue: "6310 — Staff Salaries & Employer Pension",
      },
      {
        key: "liabilityAcct",
        label: "Payable Liability GL Account",
        tab: "gl",
        type: "text",
        defaultValue: "2230 — Statutory PAYE & PenCom Payable",
      },
      {
        key: "dueDay",
        label: "Monthly Remittance Due Day",
        tab: "gl",
        type: "text",
        defaultValue: "7th of following month",
        includeInSimple: true,
      },
    ],
  },

  memorized: {
    moduleId: "memorized",
    titleSingular: "Recurring Entry",
    idPrefix: "MEM-",
    supportsDebitCreditBalance: false,
    defaultBalanceSide: "DR",
    simpleIntro: "Save a recurring rent, retainer, or utility voucher in seconds.",
    fullIntro:
      "Memorized Recurring Transaction Builder: cadence scheduler and balanced double-entry Debit/Credit pair preview.",
    tabs: [
      {
        id: "schedule",
        label: "Schedule & Trigger",
        hint: "Frequency, next run date, and auto-post reminder mode.",
      },
      {
        id: "lines",
        label: "Journal Lines (DR / CR)",
        hint: "Debit account, Credit account, amount (₦), and balanced entry verification.",
        widget: "journal-pair-preview",
      },
    ],
    fields: [
      {
        key: "frequency",
        label: "Recurrence Frequency",
        tab: "schedule",
        type: "select",
        options: ["Monthly", "Weekly", "Quarterly", "Annually"],
        defaultValue: "Monthly",
        includeInSimple: true,
      },
      {
        key: "nextRunDate",
        label: "Next Run Date",
        tab: "schedule",
        type: "date",
        defaultValue: "2026-12-01",
        includeInSimple: true,
      },
      {
        key: "debitAccount",
        label: "Debit Account (DR)",
        tab: "lines",
        type: "text",
        defaultValue: "6110 — Diesel, Power & Utilities",
        includeInSimple: true,
      },
      {
        key: "creditAccount",
        label: "Credit Account (CR)",
        tab: "lines",
        type: "text",
        defaultValue: "1110 — Zenith Bank Operating Account",
        includeInSimple: true,
      },
      {
        key: "amountNgn",
        label: "Amount per Run (₦)",
        tab: "lines",
        type: "number",
        defaultValue: "450000",
        includeInSimple: true,
      },
    ],
  },

  prices: {
    moduleId: "prices",
    titleSingular: "Price Level",
    idPrefix: "PRC-",
    supportsDebitCreditBalance: false,
    defaultBalanceSide: "DR",
    simpleIntro: "Define a wholesale or corporate pricing tier rule quickly.",
    fullIntro:
      "Dynamic Price Tier Studio: margin/discount adjustment percentages with interactive Naira selling-price simulator.",
    tabs: [
      {
        id: "rule",
        label: "Pricing Rule & Margin",
        hint: "Base calculation method, percentage adjustment, and minimum margin floor.",
        widget: "price-preview-kpi",
      },
      {
        id: "eligibility",
        label: "Eligible Tiers & Rounding",
        hint: "Which customer groups qualify and Naira rounding rules.",
      },
    ],
    fields: [
      {
        key: "adjustmentPct",
        label: "Discount / Markup Percentage (%)",
        tab: "rule",
        type: "number",
        defaultValue: "-8",
        includeInSimple: true,
        helperText: "Use negative values (e.g. -8) for discounts off Price Level 1.",
      },
      {
        key: "floorMarginPct",
        label: "Minimum Gross Margin Floor (%)",
        tab: "rule",
        type: "number",
        defaultValue: "18",
        includeInSimple: true,
      },
      {
        key: "roundingRule",
        label: "Naira Rounding Rule",
        tab: "eligibility",
        type: "select",
        options: ["Nearest ₦100", "Nearest ₦50", "Exact Kobo (.00)"],
        defaultValue: "Nearest ₦100",
      },
      {
        key: "eligibleSegment",
        label: "Eligible Customer Segment",
        tab: "eligibility",
        type: "select",
        options: ["Corporate Key Accounts", "Wholesale Distributors", "Walk-In Retail"],
        defaultValue: "Corporate Key Accounts",
        includeInSimple: true,
      },
    ],
  },

  assets: {
    moduleId: "assets",
    titleSingular: "Fixed Asset",
    idPrefix: "FA-",
    supportsDebitCreditBalance: false,
    defaultBalanceSide: "DR",
    simpleIntro: "Register a vehicle, generator, or equipment asset under IAS 16.",
    fullIntro:
      "IAS 16 Fixed Asset & Depreciation Register: Group Account link (1500 Fixed Assets), useful life, residual value, and live monthly depreciation formula.",
    tabs: [
      {
        id: "acquisition",
        label: "General & IAS 16 Class",
        hint: "Individual PPE GL account under Group 1500, acquisition date, and cost.",
      },
      {
        id: "depreciation",
        label: "Depreciation Schedule",
        hint: "Depreciation method, useful life years, residual value, and live monthly charge.",
        widget: "asset-depreciation-kpi",
      },
      {
        id: "custodian",
        label: "Custodian & Plate / Serial",
        hint: "Physical location, serial/registration plate, and insurance renewal.",
      },
    ],
    fields: [
      {
        key: "assetClassGl",
        label: "Individual PPE Account (Group 1500)",
        tab: "acquisition",
        type: "select",
        options: [
          "1530 — Motor Vehicles",
          "1510 — Plant, Machinery & Generators",
          "1540 — Office Equipment, POS & Furniture",
        ],
        defaultValue: "1530 — Motor Vehicles",
        includeInSimple: true,
      },
      {
        key: "acquisitionDate",
        label: "Acquisition Date",
        tab: "acquisition",
        type: "date",
        defaultValue: "2026-02-15",
      },
      {
        key: "acquisitionCost",
        label: "Acquisition Cost (₦)",
        tab: "depreciation",
        type: "number",
        defaultValue: "14500000",
        includeInSimple: true,
      },
      {
        key: "residualValue",
        label: "Residual / Salvage Value (₦)",
        tab: "depreciation",
        type: "number",
        defaultValue: "1500000",
      },
      {
        key: "usefulLifeYears",
        label: "Useful Life (Years)",
        tab: "depreciation",
        type: "number",
        defaultValue: "5",
        includeInSimple: true,
      },
      {
        key: "depreciationMethod",
        label: "IAS 16 Depreciation Method",
        tab: "depreciation",
        type: "select",
        options: ["Straight-Line", "Reducing Balance"],
        defaultValue: "Straight-Line",
      },
      {
        key: "custodian",
        label: "Asset Custodian / Branch",
        tab: "custodian",
        type: "text",
        placeholder: "e.g. Logistics Fleet — Ikeja",
        includeInSimple: true,
      },
      {
        key: "serialNumber",
        label: "Serial / Chassis / Plate #",
        tab: "custodian",
        type: "text",
        placeholder: "e.g. KJA-482-XZ",
      },
    ],
  },

  taxes: {
    moduleId: "taxes",
    titleSingular: "Tax Rule",
    idPrefix: "TAX-",
    supportsDebitCreditBalance: false,
    defaultBalanceSide: "CR",
    simpleIntro: "Create a VAT, LIRS hospitality, or WHT tax rate cleanly.",
    fullIntro:
      "Nigeria Tax Act 2025 Rule Engine: tax authority, effective rate, liability GL routing, and filing threshold notes.",
    tabs: [
      {
        id: "general",
        label: "General & Authority",
        hint: "Tax authority (NRS/FIRS/LIRS), tax rate %, and effective date.",
      },
      {
        id: "gl",
        label: "GL Liability & Exemptions",
        hint: "GL control account mapped on trial balance and tax-exempt notes.",
      },
    ],
    fields: [
      {
        key: "taxAuthority",
        label: "Tax Authority",
        tab: "general",
        type: "select",
        options: ["FIRS / NRS Federal", "LIRS (Lagos State)", "FCT-IRS", "Other State IRS"],
        defaultValue: "FIRS / NRS Federal",
        includeInSimple: true,
      },
      {
        key: "taxRatePct",
        label: "Statutory Rate (%)",
        tab: "general",
        type: "number",
        defaultValue: "7.5",
        includeInSimple: true,
      },
      {
        key: "effectiveDate",
        label: "Effective Date",
        tab: "general",
        type: "date",
        defaultValue: "2026-01-01",
      },
      {
        key: "liabilityAccount",
        label: "Tax Liability GL Account",
        tab: "gl",
        type: "text",
        defaultValue: "2210 — Value Added Tax (VAT 7.5%) Payable",
        includeInSimple: true,
      },
      {
        key: "filingSchedule",
        label: "Filing Cadence",
        tab: "gl",
        type: "text",
        defaultValue: "Monthly by 21st via TaxPro Max",
      },
    ],
  },

  users: {
    moduleId: "users",
    titleSingular: "Team User",
    idPrefix: "USR-",
    supportsDebitCreditBalance: false,
    defaultBalanceSide: "DR",
    simpleIntro: "Invite a teammate by email and assign their role cleanly.",
    fullIntro:
      "RBAC & CAMA Security Directory: role permissions, approval limits, and Multi-Factor Authentication enforcement.",
    tabs: [
      {
        id: "general",
        label: "General & RBAC Role",
        hint: "Work email, assigned RBAC role, department, and voucher approval limit.",
      },
      {
        id: "security",
        label: "Security & CAMA Controls",
        hint: "MFA enforcement, journal posting locks, and close-period sign-off.",
      },
    ],
    fields: [
      {
        key: "workEmail",
        label: "Work E-mail",
        tab: "general",
        type: "email",
        placeholder: "teammate@lagostrading.ng",
        includeInSimple: true,
      },
      {
        key: "rbacRole",
        label: "RBAC Role",
        tab: "general",
        type: "select",
        options: ["Owner / MD", "CFO / Controller", "Bookkeeper", "Cashier", "External Auditor (Read-Only)"],
        defaultValue: "Bookkeeper",
        includeInSimple: true,
      },
      {
        key: "approvalLimit",
        label: "Payment Approval Limit (₦)",
        tab: "general",
        type: "text",
        defaultValue: "₦2,000,000",
        includeInSimple: true,
      },
      {
        key: "mfaPolicy",
        label: "MFA Enforcement",
        tab: "security",
        type: "select",
        options: ["Authenticator / Passkey Required", "Email OTP + Passkey", "Pending Setup"],
        defaultValue: "Authenticator / Passkey Required",
      },
      {
        key: "camaClosePermission",
        label: "Period Lock & CAMA Close Sign-Off",
        tab: "security",
        type: "select",
        options: ["Allowed (Two-Person Control)", "Propose Only", "View Only"],
        defaultValue: "Propose Only",
      },
    ],
  },
};
