export type TransactionPillarId =
  | "money-in"
  | "money-out"
  | "banking"
  | "time-payroll"
  | "ledger-stock"
  | "workflow-system";

export type TransactionTypeId =
  // Pillar 1: Money In (Sales & Customers)
  | "quotes-sales-orders"
  | "sales-invoicing"
  | "invoice-time-expenses"
  | "receive-money"
  | "finance-charge"
  | "select-for-deposit"
  | "credit-memos"
  // Pillar 2: Money Out (Purchases & Vendors)
  | "select-for-purchase-orders"
  | "purchase-orders"
  | "purchases-receive-inventory"
  | "bills"
  | "select-for-payment"
  | "payments"
  | "write-checks"
  | "vendor-credit-memos"
  // Pillar 3: Banking & Register
  | "account-register"
  | "account-reconciliation"
  | "void-checks"
  // Pillar 4: Time & Payroll
  | "time-expense"
  | "select-for-payroll"
  | "payroll-entry"
  // Pillar 5: Ledger & Stock
  | "general-journal"
  | "inventory-adjustments"
  | "assemblies"
  // Pillar 6: Follow-Ups & System
  | "write-letters"
  | "action-items"
  | "system-tasks";

export type TransactionStatus =
  | "Posted"
  | "Paid"
  | "Open"
  | "Cleared"
  | "Pending"
  | "Draft"
  | "Voided";

export type TransactionIconKey =
  | "file-text"
  | "receipt"
  | "clock-receipt"
  | "wallet-in"
  | "percent"
  | "piggy-bank"
  | "rotate-ccw"
  | "clipboard-check"
  | "shopping-cart"
  | "package-check"
  | "file-minus"
  | "list-checks"
  | "send"
  | "pen-tool"
  | "undo"
  | "book-open"
  | "landmark"
  | "ban"
  | "timer"
  | "users-check"
  | "banknote"
  | "scale"
  | "boxes"
  | "layers"
  | "mail"
  | "bell-ring"
  | "sliders";

export interface TransactionPillarMeta {
  readonly id: TransactionPillarId;
  readonly label: string;
  readonly shortLabel: string;
  readonly description: string;
  readonly proNote: string;
  readonly accentBg: string;
  readonly accentText: string;
  readonly iconKey: TransactionIconKey;
}

export interface TransactionTypeMeta {
  readonly id: TransactionTypeId;
  readonly pillar: TransactionPillarId;
  readonly label: string;
  readonly singularLabel: string;
  readonly sageReference: string;
  readonly simpleSummary: string;
  readonly proSummary: string;
  readonly iconKey: TransactionIconKey;
  readonly tintBg: string;
  readonly tintText: string;
  readonly direction: "IN" | "OUT" | "NEUTRAL";
  readonly refPrefix: string;
}

export interface TransactionLineItem {
  readonly id: string;
  readonly description: string;
  readonly accountCode: string;
  readonly quantity: number;
  readonly unitPriceNgn: number;
  readonly vatApplicable: boolean;
  readonly debitNgn?: number;
  readonly creditNgn?: number;
  readonly selected?: boolean;
  readonly entryKind?: "invoice-link" | "manual-item";
  /** Inventory item (Admin stock record id) when the line was picked from stock. */
  readonly itemId?: string;
}

export interface TransactionRecord {
  readonly id: string;
  readonly typeId: TransactionTypeId;
  readonly reference: string;
  readonly counterparty: string;
  readonly date: string;
  readonly dueDate?: string;
  readonly status: TransactionStatus;
  readonly amountNgn: number;
  readonly vatAmountNgn: number;
  readonly whtRatePct: 0 | 2 | 5 | 10;
  readonly whtAmountNgn: number;
  readonly paymentMethod: string;
  readonly bankOrGlAccount: string;
  readonly memo: string;
  readonly lineItems: readonly TransactionLineItem[];
  readonly details?: Readonly<Record<string, string>>;
  readonly voucherId?: string;
  readonly voucherNumber?: string;
  readonly isPostedToLedger?: boolean;
}

export const TRANSACTION_PILLARS: readonly TransactionPillarMeta[] = [
  {
    id: "money-in",
    label: "Money In",
    shortLabel: "Sales",
    description: "Quotes, customer invoices, receipts, deposits & credit memos",
    proNote: "AR Subledger · IFRS 15 Revenue · Output VAT 7.5%",
    accentBg: "bg-[#E6F5ED]",
    accentText: "text-[#00582E]",
    iconKey: "wallet-in",
  },
  {
    id: "money-out",
    label: "Money Out",
    shortLabel: "Purchases",
    description: "Purchase orders, supplier bills, batch payments & checks",
    proNote: "AP Subledger · WHT 2%/5%/10% · Input VAT",
    accentBg: "bg-[#EAF3FC]",
    accentText: "text-[#0F4C81]",
    iconKey: "shopping-cart",
  },
  {
    id: "banking",
    label: "Banking & Register",
    shortLabel: "Banking",
    description: "Account registers, bank reconciliations & voided checks",
    proNote: "Cash & Bank Clearing · IAS 7 · Audit Void Reversals",
    accentBg: "bg-[#ECFDF5]",
    accentText: "text-[#047857]",
    iconKey: "landmark",
  },
  {
    id: "time-payroll",
    label: "Time & Payroll",
    shortLabel: "Payroll",
    description: "Timesheets, expense claims & monthly PAYE / PenCom payroll",
    proNote: "IAS 19 Employee Benefits · PAYE · 8%/10% PenCom",
    accentBg: "bg-[#FEF9E6]",
    accentText: "text-[#784507]",
    iconKey: "banknote",
  },
  {
    id: "ledger-stock",
    label: "Ledger & Stock",
    shortLabel: "Journal & Stock",
    description: "Double-entry journals, stock counts & BOM assemblies",
    proNote: "General Ledger · IAS 2 Inventories · Balanced DR = CR",
    accentBg: "bg-[#F3E8FF]",
    accentText: "text-[#6B21A8]",
    iconKey: "scale",
  },
  {
    id: "workflow-system",
    label: "Follow-Ups & System",
    shortLabel: "Tasks",
    description: "Customer letters, action reminders & period system tasks",
    proNote: "Dunning Letters · Statutory Deadlines · Period Controls",
    accentBg: "bg-[#F2F2F7]",
    accentText: "text-[#1C1C1E]",
    iconKey: "sliders",
  },
];

export const TRANSACTION_TYPES: readonly TransactionTypeMeta[] = [
  // 1. Money In
  {
    id: "quotes-sales-orders",
    pillar: "money-in",
    label: "Quotes & Sales Orders",
    singularLabel: "Quote / Sales Order",
    sageReference: "Quotes/Sales Orders/Proposals",
    simpleSummary: "Send clean price quotes or lock confirmed customer orders before billing.",
    proSummary: "Non-posting sales commitments convertible to IFRS 15 Sales Invoices.",
    iconKey: "file-text",
    tintBg: "bg-[#E6F5ED]",
    tintText: "text-[#00582E]",
    direction: "IN",
    refPrefix: "QUO-",
  },
  {
    id: "sales-invoicing",
    pillar: "money-in",
    label: "Sales & Invoicing",
    singularLabel: "Sales Invoice",
    sageReference: "Sales/Invoicing",
    simpleSummary: "Bill customers in Naira with automatic 7.5% VAT and instant payment tracking.",
    proSummary: "Posts DR 1200 Trade Receivables, CR 4010 Revenue & CR 2210 Output VAT.",
    iconKey: "receipt",
    tintBg: "bg-[#E6F5ED]",
    tintText: "text-[#006838]",
    direction: "IN",
    refPrefix: "INV-",
  },
  {
    id: "invoice-time-expenses",
    pillar: "money-in",
    label: "Invoice Time & Expenses",
    singularLabel: "Time & Expense Invoice",
    sageReference: "Invoice Time and Expenses",
    simpleSummary: "Turn tracked project hours and reimbursable costs into a client invoice.",
    proSummary: "Converts unbilled WIP time & expense tickets into recognized AR revenue.",
    iconKey: "clock-receipt",
    tintBg: "bg-[#ECFDF5]",
    tintText: "text-[#047857]",
    direction: "IN",
    refPrefix: "ITE-",
  },
  {
    id: "receive-money",
    pillar: "money-in",
    label: "Receive Money",
    singularLabel: "Customer Receipt",
    sageReference: "Receive Money",
    simpleSummary: "Record incoming bank transfers, POS settlements, cards, or cash from customers.",
    proSummary: "Clears open AR invoices (DR Bank/POS Clearing, CR 1200 Trade Receivables).",
    iconKey: "wallet-in",
    tintBg: "bg-[#DCFCE7]",
    tintText: "text-[#166534]",
    direction: "IN",
    refPrefix: "REC-",
  },
  {
    id: "finance-charge",
    pillar: "money-in",
    label: "Finance Charges",
    singularLabel: "Finance Charge",
    sageReference: "Finance Charge",
    simpleSummary: "Apply agreed late-payment interest to overdue customer balances.",
    proSummary: "Assesses overdue AR interest (DR 1200 AR, CR 4090 Finance Income).",
    iconKey: "percent",
    tintBg: "bg-[#FEF9E6]",
    tintText: "text-[#784507]",
    direction: "IN",
    refPrefix: "FCH-",
  },
  {
    id: "select-for-deposit",
    pillar: "money-in",
    label: "Select for Deposit",
    singularLabel: "Bank Deposit Batch",
    sageReference: "Select for Deposit",
    simpleSummary: "Bundle POS batches, cash takings, and cheques into one bank deposit slip.",
    proSummary: "Sweeps 1040 Undeposited Funds into Zenith/GTBank Current Account.",
    iconKey: "piggy-bank",
    tintBg: "bg-[#E6F5ED]",
    tintText: "text-[#00582E]",
    direction: "IN",
    refPrefix: "DEP-",
  },
  {
    id: "credit-memos",
    pillar: "money-in",
    label: "Credit Memos",
    singularLabel: "Customer Credit Memo",
    sageReference: "Credit Memos",
    simpleSummary: "Issue refunds, sales returns, or VAT credit notes cleanly to customers.",
    proSummary: "Reduces AR & reverses Revenue + Output VAT 7.5% per NRS credit note rules.",
    iconKey: "rotate-ccw",
    tintBg: "bg-[#FEF2F2]",
    tintText: "text-[#B91C1C]",
    direction: "IN",
    refPrefix: "CRM-",
  },

  // 2. Money Out
  {
    id: "select-for-purchase-orders",
    pillar: "money-out",
    label: "Select for Purchase Orders",
    singularLabel: "PO Requisition Batch",
    sageReference: "Select for Purchase Orders",
    simpleSummary: "Pick low-stock items and turn them into supplier purchase orders in one click.",
    proSummary: "Generates consolidated vendor POs from reorder-point replenishment alerts.",
    iconKey: "clipboard-check",
    tintBg: "bg-[#EAF3FC]",
    tintText: "text-[#0F4C81]",
    direction: "OUT",
    refPrefix: "REQ-",
  },
  {
    id: "purchase-orders",
    pillar: "money-out",
    label: "Purchase Orders",
    singularLabel: "Purchase Order",
    sageReference: "Purchase Orders",
    simpleSummary: "Send formal orders to suppliers and track expected warehouse arrival dates.",
    proSummary: "Non-posting procurement commitment linked to vendor inventory SKUs.",
    iconKey: "shopping-cart",
    tintBg: "bg-[#EAF3FC]",
    tintText: "text-[#0F4C81]",
    direction: "OUT",
    refPrefix: "PO-",
  },
  {
    id: "purchases-receive-inventory",
    pillar: "money-out",
    label: "Purchases & Receive Inventory",
    singularLabel: "Purchase / Goods Receipt",
    sageReference: "Purchases/Receive Inventory",
    simpleSummary: "Log delivered stock or supplier invoices and update warehouse quantities live.",
    proSummary: "Posts DR 1300 Inventory / 5100 COGS + Input VAT, CR 2010 AP & WHT Payable.",
    iconKey: "package-check",
    tintBg: "bg-[#EFF6FF]",
    tintText: "text-[#1D4ED8]",
    direction: "OUT",
    refPrefix: "GRN-",
  },
  {
    id: "bills",
    pillar: "money-out",
    label: "Vendor Bills",
    singularLabel: "Vendor Bill",
    sageReference: "Bills",
    simpleSummary: "Record diesel, rent, internet, contractor, and supplier bills due later.",
    proSummary: "Accrues AP liabilities with Nigeria WHT 2%/5%/10% auto-deduction guard.",
    iconKey: "file-minus",
    tintBg: "bg-[#EAF3FC]",
    tintText: "text-[#0F4C81]",
    direction: "OUT",
    refPrefix: "BIL-",
  },
  {
    id: "select-for-payment",
    pillar: "money-out",
    label: "Select for Payment",
    singularLabel: "Payment Run Batch",
    sageReference: "Select for Payment",
    simpleSummary: "Tick due vendor bills and schedule one clean NIP bank transfer run.",
    proSummary: "Batch-settles AP invoices and splits net vendor payout vs WHT remittance.",
    iconKey: "list-checks",
    tintBg: "bg-[#E0F2FE]",
    tintText: "text-[#0369A1]",
    direction: "OUT",
    refPrefix: "RUN-",
  },
  {
    id: "payments",
    pillar: "money-out",
    label: "Vendor Payments",
    singularLabel: "Vendor Payment",
    sageReference: "Payments",
    simpleSummary: "Pay a supplier bill via bank transfer, card, or cash and clear what you owe.",
    proSummary: "Posts DR 2010 Trade Payables, CR Bank Account & tracks WHT credit notes.",
    iconKey: "send",
    tintBg: "bg-[#EAF3FC]",
    tintText: "text-[#0F4C81]",
    direction: "OUT",
    refPrefix: "PAY-",
  },
  {
    id: "write-checks",
    pillar: "money-out",
    label: "Write Checks",
    singularLabel: "Check / Direct Payout",
    sageReference: "Write Checks",
    simpleSummary: "Record an instant cheque or direct bank payout without creating a bill first.",
    proSummary: "Direct expense/asset disbursement (DR Expense/Asset, CR Bank Current).",
    iconKey: "pen-tool",
    tintBg: "bg-[#FEF9E6]",
    tintText: "text-[#784507]",
    direction: "OUT",
    refPrefix: "CHK-",
  },
  {
    id: "vendor-credit-memos",
    pillar: "money-out",
    label: "Vendor Credit Memos",
    singularLabel: "Vendor Credit Memo",
    sageReference: "Vendor Credit Memos",
    simpleSummary: "Record damaged-goods returns or rebates owed back to you by a supplier.",
    proSummary: "Debits 2010 AP and credits 1300 Inventory / 5100 Purchase Returns.",
    iconKey: "undo",
    tintBg: "bg-[#FEF2F2]",
    tintText: "text-[#B91C1C]",
    direction: "OUT",
    refPrefix: "VCM-",
  },

  // 3. Banking & Register
  {
    id: "account-register",
    pillar: "banking",
    label: "Account Register",
    singularLabel: "Register Entry",
    sageReference: "Account Register",
    simpleSummary: "Quickly add or inspect deposits and withdrawals in one bank or cash register.",
    proSummary: "Direct running-balance register posting for Cash, Bank, and Petty Cash GLs.",
    iconKey: "book-open",
    tintBg: "bg-[#ECFDF5]",
    tintText: "text-[#047857]",
    direction: "NEUTRAL",
    refPrefix: "REG-",
  },
  {
    id: "account-reconciliation",
    pillar: "banking",
    label: "Account Reconciliation",
    singularLabel: "Bank Reconciliation",
    sageReference: "Account Reconciliation",
    simpleSummary: "Tick off cleared items against your Zenith, GTBank, or Access statement.",
    proSummary: "Statement-to-GL clearing worksheet tracking uncleared cheques & bank charges.",
    iconKey: "landmark",
    tintBg: "bg-[#E6F5ED]",
    tintText: "text-[#00582E]",
    direction: "NEUTRAL",
    refPrefix: "REC-BNK-",
  },
  {
    id: "void-checks",
    pillar: "banking",
    label: "Void Checks",
    singularLabel: "Voided Check",
    sageReference: "Void Checks",
    simpleSummary: "Cancel an issued cheque safely while keeping a clear audit trail.",
    proSummary: "Generates equal-and-opposite audit reversal voucher preserving original #.",
    iconKey: "ban",
    tintBg: "bg-[#FEF2F2]",
    tintText: "text-[#B91C1C]",
    direction: "NEUTRAL",
    refPrefix: "VOID-",
  },

  // 4. Time & Payroll
  {
    id: "time-expense",
    pillar: "time-payroll",
    label: "Time & Expense Tickets",
    singularLabel: "Time / Expense Ticket",
    sageReference: "Time/Expense",
    simpleSummary: "Log staff field hours, travel, or diesel receipts for jobs and reimbursement.",
    proSummary: "Captures billable or internal cost tickets linked to Jobs, Employees & GL.",
    iconKey: "timer",
    tintBg: "bg-[#FEF9E6]",
    tintText: "text-[#784507]",
    direction: "OUT",
    refPrefix: "TKT-",
  },
  {
    id: "select-for-payroll",
    pillar: "time-payroll",
    label: "Select for Payroll Entry",
    singularLabel: "Payroll Batch Selection",
    sageReference: "Select for Payroll Entry",
    simpleSummary: "Choose active staff for this month's salary run and verify statutory deductions.",
    proSummary: "Prepares monthly payroll batch with PAYE, PenCom (8%/10%) & NHF checks.",
    iconKey: "users-check",
    tintBg: "bg-[#FEF9E6]",
    tintText: "text-[#784507]",
    direction: "OUT",
    refPrefix: "PRB-",
  },
  {
    id: "payroll-entry",
    pillar: "time-payroll",
    label: "Payroll Entry",
    singularLabel: "Payroll Slip",
    sageReference: "Payroll Entry",
    simpleSummary: "Calculate staff salary, PAYE tax, PenCom pension, and net take-home pay.",
    proSummary: "Posts IAS 19 Gross Pay, Employer PenCom (10%), PAYE & Net Salary Payable.",
    iconKey: "banknote",
    tintBg: "bg-[#FEF3C7]",
    tintText: "text-[#92400E]",
    direction: "OUT",
    refPrefix: "PAYSLIP-",
  },

  // 5. Ledger & Stock
  {
    id: "general-journal",
    pillar: "ledger-stock",
    label: "General Journal Entry",
    singularLabel: "General Journal",
    sageReference: "General Journal Entry",
    simpleSummary: "Record manual accounting adjustments, depreciation, accruals, or owner capital.",
    proSummary: "Strict balanced Debit = Credit voucher enforced before GL posting.",
    iconKey: "scale",
    tintBg: "bg-[#F3E8FF]",
    tintText: "text-[#6B21A8]",
    direction: "NEUTRAL",
    refPrefix: "JV-",
  },
  {
    id: "inventory-adjustments",
    pillar: "ledger-stock",
    label: "Inventory Adjustments",
    singularLabel: "Stock Adjustment",
    sageReference: "Inventory Adjustments",
    simpleSummary: "Correct warehouse stock quantities after physical counts, damage, or shrinkage.",
    proSummary: "IAS 2 physical count variance posting to 5190 Inventory Shrinkage / Gain.",
    iconKey: "boxes",
    tintBg: "bg-[#EDE9FE]",
    tintText: "text-[#5B21B6]",
    direction: "NEUTRAL",
    refPrefix: "ADJ-",
  },
  {
    id: "assemblies",
    pillar: "ledger-stock",
    label: "Inventory Assemblies",
    singularLabel: "Assembly Build",
    sageReference: "Assemblies",
    simpleSummary: "Combine raw materials or components into finished sellable products.",
    proSummary: "Consumes BOM raw-material SKUs and capitalizes finished goods at weighted cost.",
    iconKey: "layers",
    tintBg: "bg-[#F3E8FF]",
    tintText: "text-[#6B21A8]",
    direction: "NEUTRAL",
    refPrefix: "ASM-",
  },

  // 6. Follow-Ups & System
  {
    id: "write-letters",
    pillar: "workflow-system",
    label: "Customer & Vendor Letters",
    singularLabel: "Letter / Notice",
    sageReference: "Write Letters",
    simpleSummary: "Generate polite payment reminders, WHT notices, or welcome letters in seconds.",
    proSummary: "Mail-merge dunning notices & statutory WHT credit request letters.",
    iconKey: "mail",
    tintBg: "bg-[#F2F2F7]",
    tintText: "text-[#1C1C1E]",
    direction: "NEUTRAL",
    refPrefix: "LTR-",
  },
  {
    id: "action-items",
    pillar: "workflow-system",
    label: "Action Items & Reminders",
    singularLabel: "Action Item",
    sageReference: "Action Items",
    simpleSummary: "Track VAT filing dates, customer follow-ups, and team approval reminders.",
    proSummary: "Compliance & receivables workflow tasks assigned to workspace roles.",
    iconKey: "bell-ring",
    tintBg: "bg-[#FEF9E6]",
    tintText: "text-[#784507]",
    direction: "NEUTRAL",
    refPrefix: "ACT-",
  },
  {
    id: "system-tasks",
    pillar: "workflow-system",
    label: "System & Period Tasks",
    singularLabel: "System Task",
    sageReference: "System",
    simpleSummary: "Run batch posting, lock an accounting month, or verify ledger integrity.",
    proSummary: "Batch posting queue, period rollover & hash-chain pre-close checks.",
    iconKey: "sliders",
    tintBg: "bg-[#E5E5EA]",
    tintText: "text-[#1C1C1E]",
    direction: "NEUTRAL",
    refPrefix: "SYS-",
  },
];

export function isTransactionTypeId(value: string): value is TransactionTypeId {
  return TRANSACTION_TYPES.some((t) => t.id === value);
}

const DEFAULT_PILLAR_META: TransactionPillarMeta = {
  id: "money-in",
  label: "Money In",
  shortLabel: "Sales",
  description: "Quotes, customer invoices, receipts, deposits & credit memos",
  proNote: "AR Subledger · IFRS 15 Revenue · Output VAT 7.5%",
  accentBg: "bg-[#E6F5ED]",
  accentText: "text-[#00582E]",
  iconKey: "wallet-in",
};

const DEFAULT_TYPE_META: TransactionTypeMeta = {
  id: "sales-invoicing",
  pillar: "money-in",
  label: "Sales & Invoicing",
  singularLabel: "Sales Invoice",
  sageReference: "Sales/Invoicing",
  simpleSummary: "Bill customers in Naira with automatic 7.5% VAT and instant payment tracking.",
  proSummary: "Posts DR 1200 Trade Receivables, CR 4010 Revenue & CR 2210 Output VAT.",
  iconKey: "receipt",
  tintBg: "bg-[#E6F5ED]",
  tintText: "text-[#006838]",
  direction: "IN",
  refPrefix: "INV-",
};

export function getTransactionPillarMeta(
  pillarId: TransactionPillarId,
): TransactionPillarMeta {
  return TRANSACTION_PILLARS.find((p) => p.id === pillarId) ?? DEFAULT_PILLAR_META;
}

export function getTransactionTypeMeta(typeId: TransactionTypeId): TransactionTypeMeta {
  return TRANSACTION_TYPES.find((t) => t.id === typeId) ?? DEFAULT_TYPE_META;
}

export function formatNaira(amount: number, showDecimals = true): string {
  const abs = Math.abs(amount);
  const formatted = abs.toLocaleString("en-NG", {
    minimumFractionDigits: showDecimals ? 2 : 0,
    maximumFractionDigits: 2,
  });
  return amount < 0 ? `-₦${formatted}` : `₦${formatted}`;
}

export function parseAmountNumber(input: string): number {
  const cleaned = input.replace(/[^\d.-]/g, "");
  const num = Number.parseFloat(cleaned);
  return Number.isFinite(num) ? num : 0;
}

export const INITIAL_TRANSACTIONS: readonly TransactionRecord[] = [
  {
    id: "tx-inv-104",
    typeId: "sales-invoicing",
    reference: "INV-2026-104",
    counterparty: "Eko Atlantic Suites Ltd",
    date: "2026-10-18",
    dueDate: "2026-11-17",
    status: "Open",
    amountNgn: 1558750,
    vatAmountNgn: 108750,
    whtRatePct: 0,
    whtAmountNgn: 0,
    paymentMethod: "NIP Bank Transfer",
    bankOrGlAccount: "1200 Trade Receivables · 4010 Sales Revenue",
    memo: "Q4 Hospitality Linen & Room Amenities Supply (incl. 7.5% VAT)",
    lineItems: [
      {
        id: "l1",
        description: "Egyptian Cotton Suite Linen Bundle",
        accountCode: "4010 Sales Revenue",
        quantity: 25,
        unitPriceNgn: 48000,
        vatApplicable: true,
      },
      {
        id: "l2",
        description: "Hospitality Bath Amenity Kit",
        accountCode: "4010 Sales Revenue",
        quantity: 50,
        unitPriceNgn: 5000,
        vatApplicable: true,
      },
    ],
  },
  {
    id: "tx-quo-029",
    typeId: "quotes-sales-orders",
    reference: "QUO-2026-029",
    counterparty: "Lekki Phase 1 Bistro Group",
    date: "2026-10-19",
    dueDate: "2026-11-02",
    status: "Pending",
    amountNgn: 913750,
    vatAmountNgn: 63750,
    whtRatePct: 0,
    whtAmountNgn: 0,
    paymentMethod: "Quote — Convert to Invoice",
    bankOrGlAccount: "Non-Posting Sales Order",
    memo: "Catering kitchen stainless prep tables & POS thermal stock",
    lineItems: [
      {
        id: "l1",
        description: "Commercial Kitchen Prep Table",
        accountCode: "4010 Sales Revenue",
        quantity: 5,
        unitPriceNgn: 170000,
        vatApplicable: true,
      },
    ],
  },
  {
    id: "tx-ite-014",
    typeId: "invoice-time-expenses",
    reference: "ITE-2026-014",
    counterparty: "Victoria Island Fintech Hub",
    date: "2026-10-16",
    dueDate: "2026-10-30",
    status: "Posted",
    amountNgn: 645000,
    vatAmountNgn: 45000,
    whtRatePct: 5,
    whtAmountNgn: 30000,
    paymentMethod: "Bank Transfer (Net of 5% WHT)",
    bankOrGlAccount: "1200 Trade Receivables · 4020 Consulting Revenue",
    memo: "30 billable advisory hours + Lagos Island site transport",
    lineItems: [
      {
        id: "l1",
        description: "IFRS Transition Advisory (30 hrs @ ₦18,000)",
        accountCode: "4020 Consulting Revenue",
        quantity: 30,
        unitPriceNgn: 18000,
        vatApplicable: true,
      },
      {
        id: "l2",
        description: "Reimbursable Logistics & Site Audit",
        accountCode: "4025 Reimbursed Expenses",
        quantity: 1,
        unitPriceNgn: 60000,
        vatApplicable: true,
      },
    ],
  },
  {
    id: "tx-rec-088",
    typeId: "receive-money",
    reference: "REC-2026-088",
    counterparty: "Ikeja City Mall Pharmacy",
    date: "2026-10-17",
    status: "Paid",
    amountNgn: 820000,
    vatAmountNgn: 0,
    whtRatePct: 0,
    whtAmountNgn: 0,
    paymentMethod: "Paystack Instant Settlement",
    bankOrGlAccount: "1010 Zenith Bank Current (NGN)",
    memo: "Full settlement of INV-2026-091 via Paystack checkout",
    lineItems: [
      {
        id: "l1",
        description: "INV-2026-091 · October Pharmacy Restock",
        accountCode: "1200 Trade Receivables",
        quantity: 1,
        unitPriceNgn: 820000,
        vatApplicable: false,
        selected: true,
      },
    ],
  },
  {
    id: "tx-fch-007",
    typeId: "finance-charge",
    reference: "FCH-2026-007",
    counterparty: "Apapa Haulage & Ports Co.",
    date: "2026-10-15",
    status: "Posted",
    amountNgn: 42500,
    vatAmountNgn: 0,
    whtRatePct: 0,
    whtAmountNgn: 0,
    paymentMethod: "Overdue Balance Assessment (2.5%)",
    bankOrGlAccount: "1200 Trade Receivables · 4090 Finance Income",
    memo: "30-day overdue finance charge on ₦1,700,000 balance",
    lineItems: [
      {
        id: "l1",
        description: "2.5% Monthly Late Settlement Charge",
        accountCode: "4090 Finance Income",
        quantity: 1,
        unitPriceNgn: 42500,
        vatApplicable: false,
      },
    ],
  },
  {
    id: "tx-dep-019",
    typeId: "select-for-deposit",
    reference: "DEP-2026-019",
    counterparty: "POS & Cash Till Sweep -> Zenith Bank",
    date: "2026-10-18",
    status: "Cleared",
    amountNgn: 1245000,
    vatAmountNgn: 0,
    whtRatePct: 0,
    whtAmountNgn: 0,
    paymentMethod: "Batch Deposit Slip",
    bankOrGlAccount: "1010 Zenith Bank Current (NGN)",
    memo: "Combined Moniepoint POS batch + Victoria Island cash drawer",
    lineItems: [
      {
        id: "l1",
        description: "Moniepoint Terminal #02 Daily Batch",
        accountCode: "1040 Undeposited Funds",
        quantity: 1,
        unitPriceNgn: 895000,
        vatApplicable: false,
        selected: true,
      },
      {
        id: "l2",
        description: "Counter Cash Drawer Receipt #412",
        accountCode: "1040 Undeposited Funds",
        quantity: 1,
        unitPriceNgn: 350000,
        vatApplicable: false,
        selected: true,
      },
    ],
  },
  {
    id: "tx-crm-005",
    typeId: "credit-memos",
    reference: "CRM-2026-005",
    counterparty: "Eko Atlantic Suites Ltd",
    date: "2026-10-19",
    status: "Posted",
    amountNgn: 103200,
    vatAmountNgn: 7200,
    whtRatePct: 0,
    whtAmountNgn: 0,
    paymentMethod: "AR Credit Adjustment",
    bankOrGlAccount: "4015 Sales Returns · 1200 Trade Receivables",
    memo: "2 damaged linen cartons returned from INV-2026-104",
    lineItems: [
      {
        id: "l1",
        description: "Returned Egyptian Cotton Linen Bundle",
        accountCode: "4015 Sales Returns",
        quantity: 2,
        unitPriceNgn: 48000,
        vatApplicable: true,
      },
    ],
  },

  // Money Out
  {
    id: "tx-req-011",
    typeId: "select-for-purchase-orders",
    reference: "REQ-2026-011",
    counterparty: "Lagos Main Warehouse Reorder Batch",
    date: "2026-10-18",
    status: "Pending",
    amountNgn: 760000,
    vatAmountNgn: 0,
    whtRatePct: 0,
    whtAmountNgn: 0,
    paymentMethod: "Auto-Replenishment Queue",
    bankOrGlAccount: "1300 Inventory Asset (Pending PO)",
    memo: "3 SKUs below minimum safety stock threshold",
    lineItems: [
      {
        id: "l1",
        description: "Dangote 42.5N Cement (100 bags)",
        accountCode: "1300 Inventory Asset",
        quantity: 100,
        unitPriceNgn: 7600,
        vatApplicable: false,
        selected: true,
      },
    ],
  },
  {
    id: "tx-po-044",
    typeId: "purchase-orders",
    reference: "PO-2026-044",
    counterparty: "Dangote Cement Depot (Apapa)",
    date: "2026-10-15",
    dueDate: "2026-10-22",
    status: "Open",
    amountNgn: 1634000,
    vatAmountNgn: 114000,
    whtRatePct: 0,
    whtAmountNgn: 0,
    paymentMethod: "Supplier Credit 14 Days",
    bankOrGlAccount: "Non-Posting Purchase Order",
    memo: "200 bags 42.5N Portland Cement for Lekki site delivery",
    lineItems: [
      {
        id: "l1",
        description: "Dangote 42.5N Cement 50kg Bag",
        accountCode: "1300 Inventory Asset",
        quantity: 200,
        unitPriceNgn: 7600,
        vatApplicable: true,
      },
    ],
  },
  {
    id: "tx-grn-032",
    typeId: "purchases-receive-inventory",
    reference: "GRN-2026-032",
    counterparty: "Oando Lubricants & Diesel Ltd",
    date: "2026-10-17",
    status: "Posted",
    amountNgn: 1182500,
    vatAmountNgn: 82500,
    whtRatePct: 2,
    whtAmountNgn: 22000,
    paymentMethod: "Goods Received + Vendor Bill",
    bankOrGlAccount: "1300 Inventory Asset · 2010 Trade Payables",
    memo: "1,000L AGO Diesel drum stock received at Ikeja depot",
    lineItems: [
      {
        id: "l1",
        description: "Automotive Gas Oil (Diesel) Bulk Litres",
        accountCode: "1300 Inventory Asset",
        quantity: 1000,
        unitPriceNgn: 1100,
        vatApplicable: true,
      },
    ],
  },
  {
    id: "tx-bil-210",
    typeId: "bills",
    reference: "BIL-2026-210",
    counterparty: "MainOne Fiber & Cloud Services",
    date: "2026-10-14",
    dueDate: "2026-10-28",
    status: "Open",
    amountNgn: 483750,
    vatAmountNgn: 33750,
    whtRatePct: 5,
    whtAmountNgn: 22500,
    paymentMethod: "NIP Transfer on Due Date",
    bankOrGlAccount: "6145 Software & Fiber · 2010 Trade Payables",
    memo: "October enterprise dedicated fiber & backup hosting (5% WHT)",
    lineItems: [
      {
        id: "l1",
        description: "Dedicated Metro Fiber 200Mbps",
        accountCode: "6145 Software & Fiber",
        quantity: 1,
        unitPriceNgn: 450000,
        vatApplicable: true,
      },
    ],
  },
  {
    id: "tx-run-009",
    typeId: "select-for-payment",
    reference: "RUN-2026-009",
    counterparty: "Weekly Supplier NIP Settlement Run",
    date: "2026-10-18",
    status: "Pending",
    amountNgn: 940000,
    vatAmountNgn: 0,
    whtRatePct: 0,
    whtAmountNgn: 0,
    paymentMethod: "Batch NIP Payout",
    bankOrGlAccount: "1020 GTBank Operations (NGN)",
    memo: "2 approved vendor bills queued for Friday afternoon transfer",
    lineItems: [
      {
        id: "l1",
        description: "BIL-2026-205 · Eko Cold Chain Logistics",
        accountCode: "2010 Trade Payables",
        quantity: 1,
        unitPriceNgn: 560000,
        vatApplicable: false,
        selected: true,
      },
      {
        id: "l2",
        description: "BIL-2026-207 · Spectra Security Guard Services",
        accountCode: "2010 Trade Payables",
        quantity: 1,
        unitPriceNgn: 380000,
        vatApplicable: false,
        selected: true,
      },
    ],
  },
  {
    id: "tx-pay-061",
    typeId: "payments",
    reference: "PAY-2026-061",
    counterparty: "Eko Electricity Distribution (EKEDC)",
    date: "2026-10-16",
    status: "Paid",
    amountNgn: 385000,
    vatAmountNgn: 0,
    whtRatePct: 0,
    whtAmountNgn: 0,
    paymentMethod: "GTBank Instant NIP",
    bankOrGlAccount: "1020 GTBank Operations (NGN)",
    memo: "Cleared September Band-A Commercial Power Bill",
    lineItems: [
      {
        id: "l1",
        description: "BIL-2026-198 · September Power Tariff",
        accountCode: "2010 Trade Payables",
        quantity: 1,
        unitPriceNgn: 385000,
        vatApplicable: false,
        selected: true,
      },
    ],
  },
  {
    id: "tx-chk-108",
    typeId: "write-checks",
    reference: "CHK-004108",
    counterparty: "Lagos State Signage & Advertisement Agency",
    date: "2026-10-17",
    status: "Posted",
    amountNgn: 250000,
    vatAmountNgn: 0,
    whtRatePct: 0,
    whtAmountNgn: 0,
    paymentMethod: "Zenith Cheque #004108",
    bankOrGlAccount: "1010 Zenith Bank Current (NGN)",
    memo: "Annual showroom fascia signage permit renewal",
    lineItems: [
      {
        id: "l1",
        description: "Statutory Signage & Outdoor Permit",
        accountCode: "6220 Licenses & Permits",
        quantity: 1,
        unitPriceNgn: 250000,
        vatApplicable: false,
      },
    ],
  },
  {
    id: "tx-vcm-004",
    typeId: "vendor-credit-memos",
    reference: "VCM-2026-004",
    counterparty: "Oando Lubricants & Diesel Ltd",
    date: "2026-10-18",
    status: "Posted",
    amountNgn: 86000,
    vatAmountNgn: 6000,
    whtRatePct: 0,
    whtAmountNgn: 0,
    paymentMethod: "Supplier Debit Note",
    bankOrGlAccount: "2010 Trade Payables · 1300 Inventory Asset",
    memo: "Empty steel drum return credit note",
    lineItems: [
      {
        id: "l1",
        description: "Returned Steel Fuel Drums (8 units)",
        accountCode: "1300 Inventory Asset",
        quantity: 8,
        unitPriceNgn: 10000,
        vatApplicable: true,
      },
    ],
  },

  // Banking & Register
  {
    id: "tx-reg-501",
    typeId: "account-register",
    reference: "REG-2026-501",
    counterparty: "Victoria Island Petty Cash Imprest",
    date: "2026-10-18",
    status: "Cleared",
    amountNgn: 75000,
    vatAmountNgn: 0,
    whtRatePct: 0,
    whtAmountNgn: 0,
    paymentMethod: "Petty Cash Float Top-Up",
    bankOrGlAccount: "1030 Petty Cash Drawer (NGN)",
    memo: "Weekly dispatch riders & stationery imprest replenishment",
    lineItems: [
      {
        id: "l1",
        description: "Imprest replenishment from Zenith Bank",
        accountCode: "1030 Petty Cash Drawer",
        quantity: 1,
        unitPriceNgn: 75000,
        vatApplicable: false,
      },
    ],
  },
  {
    id: "tx-recbnk-10",
    typeId: "account-reconciliation",
    reference: "REC-BNK-2026-10",
    counterparty: "Zenith Bank Current (Acct •••• 4821)",
    date: "2026-10-18",
    status: "Cleared",
    amountNgn: 18420000,
    vatAmountNgn: 0,
    whtRatePct: 0,
    whtAmountNgn: 0,
    paymentMethod: "Statement Synced",
    bankOrGlAccount: "1010 Zenith Bank Current (NGN)",
    memo: "Mid-October bank statement matched · ₦0.00 variance",
    lineItems: [
      {
        id: "l1",
        description: "Cleared statement items (42 deposits, 29 payouts)",
        accountCode: "1010 Zenith Bank Current (NGN)",
        quantity: 1,
        unitPriceNgn: 18420000,
        vatApplicable: false,
        selected: true,
      },
    ],
  },
  {
    id: "tx-void-002",
    typeId: "void-checks",
    reference: "VOID-004099",
    counterparty: "Alpha Courier Services (Spoiled Cheque)",
    date: "2026-10-14",
    status: "Voided",
    amountNgn: 145000,
    vatAmountNgn: 0,
    whtRatePct: 0,
    whtAmountNgn: 0,
    paymentMethod: "Cheque Reversal",
    bankOrGlAccount: "1010 Zenith Bank Current (NGN)",
    memo: "Voided cheque #004099 due to payee spelling correction; reissued via NIP",
    lineItems: [
      {
        id: "l1",
        description: "Reversal of Cheque #004099",
        accountCode: "1010 Zenith Bank Current (NGN)",
        quantity: 1,
        unitPriceNgn: 145000,
        vatApplicable: false,
      },
    ],
  },

  // Time & Payroll
  {
    id: "tx-tkt-073",
    typeId: "time-expense",
    reference: "TKT-2026-073",
    counterparty: "Chidi Okafor (Field Engineer)",
    date: "2026-10-17",
    status: "Open",
    amountNgn: 115000,
    vatAmountNgn: 0,
    whtRatePct: 0,
    whtAmountNgn: 0,
    paymentMethod: "Staff Reimbursement Claim",
    bankOrGlAccount: "6180 Travel & Field Expenses",
    memo: "Abuja hotel & airport shuttle for client commissioning",
    lineItems: [
      {
        id: "l1",
        description: "Abuja Flight & Shuttle (2 days)",
        accountCode: "6180 Travel & Field Expenses",
        quantity: 1,
        unitPriceNgn: 115000,
        vatApplicable: false,
      },
    ],
  },
  {
    id: "tx-prb-10",
    typeId: "select-for-payroll",
    reference: "PRB-2026-10",
    counterparty: "October 2026 Full-Time Staff (14 Employees)",
    date: "2026-10-20",
    status: "Pending",
    amountNgn: 5420000,
    vatAmountNgn: 0,
    whtRatePct: 0,
    whtAmountNgn: 0,
    paymentMethod: "Monthly Salary Prep",
    bankOrGlAccount: "6110 Staff Salaries · 2240 PAYE & PenCom",
    memo: "Pre-approved attendance & overtime batch ready for payslip posting",
    lineItems: [
      {
        id: "l1",
        description: "Executive & Finance Team (5 staff)",
        accountCode: "6110 Staff Salaries",
        quantity: 1,
        unitPriceNgn: 2920000,
        vatApplicable: false,
        selected: true,
      },
      {
        id: "l2",
        description: "Operations & Retail Team (9 staff)",
        accountCode: "6110 Staff Salaries",
        quantity: 1,
        unitPriceNgn: 2500000,
        vatApplicable: false,
        selected: true,
      },
    ],
  },
  {
    id: "tx-payslip-104",
    typeId: "payroll-entry",
    reference: "PAYSLIP-2026-104",
    counterparty: "Amina Mohammed — Senior Accountant",
    date: "2026-10-25",
    status: "Posted",
    amountNgn: 650000,
    vatAmountNgn: 0,
    whtRatePct: 0,
    whtAmountNgn: 0,
    paymentMethod: "Zenith Payroll Direct Credit",
    bankOrGlAccount: "6110 Staff Salaries · 2240 Statutory Deductions",
    memo: "Gross ₦650k · PenCom 8% (₦52k) + Employer 10% (₦65k) · PAYE ₦68,400",
    lineItems: [
      {
        id: "l1",
        description: "Basic + Housing + Transport Gross Pay",
        accountCode: "6110 Staff Salaries",
        quantity: 1,
        unitPriceNgn: 650000,
        vatApplicable: false,
      },
    ],
    details: {
      basicSalary: "390000",
      housingAllowance: "160000",
      transportAllowance: "100000",
      payeTax: "68400",
      nhfRatePct: "2.5",
    },
  },

  // Ledger & Stock
  {
    id: "tx-jv-081",
    typeId: "general-journal",
    reference: "JV-2026-081",
    counterparty: "Monthly IAS 16 Motor Vehicle Depreciation",
    date: "2026-10-31",
    status: "Posted",
    amountNgn: 312500,
    vatAmountNgn: 0,
    whtRatePct: 0,
    whtAmountNgn: 0,
    paymentMethod: "Double-Entry Journal",
    bankOrGlAccount: "6510 Depreciation · 1539 Accum. Depreciation",
    memo: "Monthly straight-line depreciation on 2 Lagos delivery vans",
    lineItems: [
      {
        id: "l1",
        description: "Depreciation Expense — Delivery Fleet",
        accountCode: "6510 Depreciation Expense",
        quantity: 1,
        unitPriceNgn: 312500,
        vatApplicable: false,
        debitNgn: 312500,
        creditNgn: 0,
      },
      {
        id: "l2",
        description: "Accumulated Depreciation — Motor Vehicles",
        accountCode: "1539 Accum. Depreciation — Vehicles",
        quantity: 1,
        unitPriceNgn: 312500,
        vatApplicable: false,
        debitNgn: 0,
        creditNgn: 312500,
      },
    ],
  },
  {
    id: "tx-adj-015",
    typeId: "inventory-adjustments",
    reference: "ADJ-2026-015",
    counterparty: "Ikeja Main Store Physical Stock Count",
    date: "2026-10-18",
    status: "Posted",
    amountNgn: 45600,
    vatAmountNgn: 0,
    whtRatePct: 0,
    whtAmountNgn: 0,
    paymentMethod: "IAS 2 Count Adjustment",
    bankOrGlAccount: "5190 Inventory Shrinkage · 1300 Inventory",
    memo: "6 broken cement bags written off during quarterly warehouse count",
    lineItems: [
      {
        id: "l1",
        description: "Dangote 42.5N Cement (System 206 -> Actual 200)",
        accountCode: "1300 Inventory Asset",
        quantity: 6,
        unitPriceNgn: 7600,
        vatApplicable: false,
      },
    ],
    details: {
      systemQty: "206",
      actualQty: "200",
      unitCost: "7600",
      adjustmentReason: "Damaged in transit / moisture write-off",
    },
  },
  {
    id: "tx-asm-008",
    typeId: "assemblies",
    reference: "ASM-2026-008",
    counterparty: "Hospitality Welcome Kit Assembly (50 Sets)",
    date: "2026-10-17",
    status: "Posted",
    amountNgn: 175000,
    vatAmountNgn: 0,
    whtRatePct: 0,
    whtAmountNgn: 0,
    paymentMethod: "BOM Production Run",
    bankOrGlAccount: "1310 Finished Goods · 1300 Raw Components",
    memo: "Built 50 sealed hotel welcome packs from soap, towel & box stock",
    lineItems: [
      {
        id: "l1",
        description: "Microfiber Hand Towel + Botanical Soap + Box",
        accountCode: "1300 Raw Components",
        quantity: 50,
        unitPriceNgn: 3500,
        vatApplicable: false,
      },
    ],
    details: {
      finishedSku: "KIT-WELCOME-50",
      yieldQuantity: "50",
      unitCost: "3500",
    },
  },

  // Follow-Ups & System
  {
    id: "tx-ltr-012",
    typeId: "write-letters",
    reference: "LTR-2026-012",
    counterparty: "Apapa Haulage & Ports Co.",
    date: "2026-10-18",
    status: "Posted",
    amountNgn: 1742500,
    vatAmountNgn: 0,
    whtRatePct: 0,
    whtAmountNgn: 0,
    paymentMethod: "PDF Email + WhatsApp Notice",
    bankOrGlAccount: "AR Dunning Template · 30+ Days",
    memo: "Polite statement reminder sent with Paystack payment link",
    lineItems: [
      {
        id: "l1",
        description: "Outstanding Balance Reminder Notice",
        accountCode: "1200 Trade Receivables",
        quantity: 1,
        unitPriceNgn: 1742500,
        vatApplicable: false,
      },
    ],
  },
  {
    id: "tx-act-031",
    typeId: "action-items",
    reference: "ACT-2026-031",
    counterparty: "NRS Monthly VAT 7.5% & WHT Remittance",
    date: "2026-10-21",
    dueDate: "2026-10-21",
    status: "Pending",
    amountNgn: 486250,
    vatAmountNgn: 0,
    whtRatePct: 0,
    whtAmountNgn: 0,
    paymentMethod: "TaxPro-Max Filing Reminder",
    bankOrGlAccount: "2210 Output VAT · 2220 WHT Payable",
    memo: "File September VAT & WHT schedules before the 21st statutory deadline",
    lineItems: [
      {
        id: "l1",
        description: "Monthly NRS TaxPro-Max Return & Remittance",
        accountCode: "2210 Output VAT",
        quantity: 1,
        unitPriceNgn: 486250,
        vatApplicable: false,
      },
    ],
  },
  {
    id: "tx-sys-003",
    typeId: "system-tasks",
    reference: "SYS-2026-003",
    counterparty: "October Batch Verification & Period Health",
    date: "2026-10-19",
    status: "Cleared",
    amountNgn: 0,
    vatAmountNgn: 0,
    whtRatePct: 0,
    whtAmountNgn: 0,
    paymentMethod: "System Integrity Check",
    bankOrGlAccount: "FY2026 · Period 10 (Open)",
    memo: "Verified 0 unbalanced vouchers and SHA-256 audit log continuity",
    lineItems: [
      {
        id: "l1",
        description: "Period 10 Double-Entry & Audit Check",
        accountCode: "System Control",
        quantity: 1,
        unitPriceNgn: 0,
        vatApplicable: false,
      },
    ],
  },
];
