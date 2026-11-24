# App User Guide (`docs/USER_GUIDE.md`)

> Written for end-users and non-developers in everyday language. Updated automatically whenever new user-facing features ship.

## What We Are Building (`NairaBooks`)
**`NairaBooks`** is a **Nigerian-first accounting and business operations platform** built around **Nigerian tax laws (VAT, WHT, CIT, NRS e-invoicing, State levies) and IFRS / FRCN financial reporting**, while adapting its setup, terminology, workflows, and KPIs to match almost **any business type**:

### 6 Built-In Flagship Business Packs
1. **Retail & E-commerce:** Point-of-sale transactions, daily cash flows, VAT compliance, and live stock levels.
2. **Wholesale & Distribution:** Multi-tier inventory across warehouses, vendor purchase orders, shipping/landed costs, and profit margins.
3. **Manufacturing (Light / Small Scale):** Bill of Materials (BOM), assembly tracking, raw material costs, and production accounting.
4. **Construction & Trades:** Job costing to track project expenses, subcontractor payments (with WHT & retention), and materials per job site.
5. **Professional Services:** Client billing, time tracking, expense reimbursements, and full bookkeeping for agencies, consultancies, legal, and accounting firms.
6. **Non-Profit Organizations:** Fund accounting, donor/grant tracking, and budget-vs-actual reporting.

### Plus the Universal Custom / Composable Pack Builder
Need **Hotels/Hospitality**, **Diners/Restaurants**, Healthcare, Logistics, or a **Hybrid Business** (e.g., a retail store that also runs light manufacturing or a hotel with a diner)? Mix and match modules, accounts, tax defaults, and labels through the **Universal Custom/Composable Pack Builder** while keeping one clean Nigerian IFRS set of books.

## Getting Started
`NairaBooks` specifications, system architecture, GraphQL API, PostgreSQL 18 database protections, and the visual design system & accessibility blueprint are now complete and verified by automated checks. Next in **Phase 6**, we begin building live accounting and UI workflows slice-by-slice starting with the **Nigerian IFRS Core Double-Entry Ledger** track.

## Features Implemented
- **Foundation Ready (`src/nairabooks/`):** Initial application configuration (`NGN` currency, `7.5%` baseline VAT rate stored safely with fixed decimal precision) and registry of the **6 Flagship Reference Packs** plus the **Universal Custom/Composable Pack Builder** indicator verified by automated smoke tests (`uv run pytest -v`).
- **Safety & Privacy Architecture (`api/graphql/schema.graphql`, `docs/THREAT_MODEL.md`):** Locked multi-company isolation (`workspace_id` derived strictly from authenticated sessions), exact naira-and-kobo transfer rules (zero binary floats), Segregation of Duties for approvals/CAMA Sec 405 certification, and tamper-evident audit guarantees verified by automated contract tests (`tests/test_architecture_contracts.py`).
- **PostgreSQL Data Vault (`db/migrations/`):** Built database-level protections verifying every posted entry balances (`Debits == Credits`), blocking silent edits/deletions to posted books and audit trails, isolating each company's rows, and preventing overlapping Nigerian tax rules (`tests/test_database_schema.py`).
- **Complete Zero-Sidebar Bookkeeping Workflow & Live Interactive Preview (`design/`):** Built an uncluttered, clickable **8-screen end-to-end UI blueprint** navigated via a sleek floating **Top Navigation Capsule** (`Overview | Books | People & Stock | Reconcile | Reports` + `Simple | Pro` mode pill):
  1. **Setup:** Pick your business type (`Retail & Online Shop`, `Wholesale & Supply`, `Maker & Light Factory`, `Builder & Contractor`, `Services & Agency`, `Non-Profit / NGO`, or mix-and-match modules).
  2. **Financial Overview (`/overview`):**
     - **Clean, Bite-Sized Health Metrics:** Real-time financial vital signs without redundant button clutter: 4 high-contrast KPI cards (`Cash on Hand`, `Net Income`, `Total Receivables`, `Total Payables`), 6-month dual-bar Cash Flow Trend, Top Expense Categories, and one-click payment reminder queuing for overdue invoices.
  3. **All 10 Books (`Books`):** Step-by-step lanes for `Sales Order / Quotes`, `Sales Invoice`, `Receipt`, `Credit Note`, `Purchase Order`, `Purchase Invoice`, `Payment`, `Debit Note`, `Inventory Adjustment Journal`, and `Journal`.
  4. **The Streamlined 3-Action Transactions Hub (`/transactions`):**
     - An ultra-clean floating segmented island featuring 3 dedicated actions:
       - **`Create New` (27 Types):** Instant launch into any of the 27 pre-configured Nigerian business transaction templates with automated 7.5% VAT and WHT splits.
       - **`Transaction List`:** Complete operational register with 6 pillar tabs, summary metrics, and status filters.
       - **`Edit a Transaction`:** Dedicated edit and audit workspace with CAMA 2020 Section 374 audit protection.
  5. **People & Stock:** Create and manage `Customers`, `Vendors / Suppliers`, and `Inventory Items` from one sleek workspace.
  6. **PDF Bank Reconciliation (`Reconcile`):** Drag & drop your Nigerian bank PDF statement (`Zenith`, `GTBank`, `Access`, `UBA`) and match rows against existing NairaBooks invoices, payments, or bank charges.
  7. **Reports (`Reports`):** Interactive **Profit & Loss**, **Balance Sheet**, **Cash Flow**, and minor lists (`Customer Balances AR`, `Vendor Bills AP`, `Inventory Stock & Valuation`, `Sales & 7.5% VAT`, `WHT Schedule`, `Trial Balance`).
- *(Live end-user web workflows and runnable accounting pages begin shipping slice-by-slice in Phase 6.)*


---

## Using the Double-Entry Journal Composer (Slice 1)

1. **Start the Web App:**
   - Run the Next.js workspace directly inside `web/`:
     `cd web && npm run dev` (starts with built-in demo Nigerian SME accounts `1010..5010` and `FY2025` locked / `FY2026` open periods).
   - Your data is saved to `web/.data/documents/`, or to Postgres if `DATABASE_URL` is set in `web/.env.local`, so it survives restarts. See `docs/DEPLOYMENT_RENDER.md`.
2. **Navigate Without Sidebars (`ADR-012`):**
   - Use the floating top capsule (`Overview | Books | People & Stock | Reconcile | Reports | Admin`) or press `Tab` to activate the `Skip to main content` link (`A11Y-01`).
   - Switch between **`Simple`** (plain-English *Money In / Money Out* labels) and **`Pro`** (full FX currency rates and audit reversal controls) at any time.
3. **Post & Reverse Entries Safely:**
   - Open **`Books`** (`/books/journal`), select **Posting Date** (within an **Open** fiscal period such as `FY2026`), add balanced debit and credit lines, and watch the live **`Balanced` / `Out of balance`** status badge update automatically.
   - To correct a posted voucher without altering history, switch to **`Pro`**, enter an **Audit reason** beside the voucher in the register, and click **`Reverse`** to post an offsetting entry.

---

## Using the Reports & Analytics Studio (`/reports`) (Phase 5 Overhaul)

Click **`Reports`** in the top navigation bar to open the **Sage 50-inspired Reports & Analytics Studio**, designed with a minimalist Cupertino iOS aesthetic, lively squircle icons, and instant drill-downs:

1. **Browse 26+ Reports Across 10 Operational Pillars:**
   - **Financial Statements:** General Ledger Trial Balance, Income Statement (Profit & Loss), Statement of Financial Position (Balance Sheet), FRCN Statement of Value Added, and FRCN Five-Year Financial Summary.
   - **Accounts Receivable:** Aged Receivables Schedule (Current, 1-30, 31-60, 61-90, 90+ days), Customer Invoice Register, Cash Receipts Journal, and Items Sold.
   - **Accounts Payable:** Aged Payables Schedule, Vendor Purchase Journal, Check & NIP Register, and WHT Vendor Report.
   - **General Ledger:** General Journal Audit Register, Account Variance vs Budget, and Chart of Accounts Master.
   - **Inventory & Production:** IAS 2 Inventory Valuation, Stock Status & Reorder Alerts, and Bill of Materials (BOM).
   - **Payroll & PAYE:** Employee Payroll Register, State PAYE Remittance Schedule (Lagos LIRS, FCT, etc.), and PenCom (8% / 10%) Pension schedules.
   - **Banking & Reconciliation:** Bank Reconciliation Clearance, Deposits in Transit, and POS MDR Fees.
   - **Job Costing, Time & Expense, and Company Audit:** Job Profitability, Aged Unbilled Time Tickets, and CAMA 2020 Sec 405 Hash-Chain Verification.

2. **Five Comprehensive Interactive Controls on Every Single Report:**
   - **🔍 Real-Time Filters:** Filter by fiscal period (`FY2026`, `FY2025`), search text/accounts/parties in real-time, filter by minimum or maximum Naira amounts, and toggle **Hide Zero Balances** to focus on active ledger balances.
   - **📊 Add or Remove Columns:** Click **Columns** to tick or untick any column with instant live table updates, plus **Select All** and **Reset Defaults** shortcuts.
   - **📥 Flexible Export Options:** Export visible columns to **CSV** (for Microsoft Excel/Google Sheets), export **JSON** with metadata, **Copy to Clipboard** (tab-delimited for instant pasting), or **Print** with clean print styling.
   - **👁️ Display & Scale Options:** Toggle row density between **Comfortable** and **Compact Ledger** (great for dense audits), toggle currency scale between **Full Naira (₦0.00)** and **Short (₦k / ₦M)**, and toggle **Alternating Row Tints (Zebra)**.
   - **⚙️ Advanced Report-Specific Controls:** Each report features tailored options matching its accounting domain:
     - *Trial Balance & Financials:* Toggle CAMA 2020 SHA-256 Digest seal, IFRS category subtotals, and prior-year comparative mode.
     - *Aged Receivables / Payables:* Switch between 30-day and 15-day strict credit intervals, age by invoice date vs. due date, and highlight accounts overdue >60 days.
     - *General Ledger:* Include/exclude reversed audit offset pairs, and sort by chronological journal sequence.
     - *Inventory Valuation:* Switch between IAS 2 FIFO and Weighted Average Costing (AVCO).
     - *Payroll:* Filter by State of Tax Residence (Lagos LIRS, FCT) and apply Nigeria Tax Act 2025 Consolidated Relief.
     - *Reconciliation & Audit:* Include cleared items and verify parent hash linkages.
2. **Match Bank Statements & Calculate Month-End FX Revaluation (`/reconcile`):**
   - Click **`Reconcile`** in the top navigation bar to match bank/POS statement rows (`Zenith`, `GTBank`, `Paystack`/`NIBSS` settlements net of bank fees) against NairaBooks ledger cash movements with clear plain-English badges (`Matched`, `Matched after bank fee`, `Unmatched`, `Amount mismatch`).
   - Switch to **`Pro`** mode to run **FX Closing Revaluation** (`IAS 21`), converting foreign-currency monetary balances (`USD`/`GBP`/`EUR`) at the month-end closing rate to inspect unrealized FX gain or loss.

---

## Using the Nigerian Tax Rules, CIT Radar & NRS Calculator (`/tax`) (Slice 3)

1. **Open Tax Engine (`/tax`):**
   - Click **`Nigerian Tax Rules & NRS`** inside **`Reports`** or **`Tax Rules & NRS`** on **`Overview`**.
2. **Track Your Nigeria Tax Act 2025 Small-Company Status:**
   - Update your **Legal Form** (Limited Company, Business Name, or NGO), **State of Operation** (`Lagos`, `FCT Abuja`, etc.), **Annual Turnover**, **Fixed Assets**, and whether you run a **Professional Services Firm**.
   - **NairaBooks** automatically alerts you once turnover or assets reach **80%** (`APPROACHING_80_PCT`) of the **`₦100M` turnover / `₦250M` fixed asset** thresholds, flags Professional Services exclusions, and tracks NGO exemptions cleanly.
3. **Preview VAT (7.5%), 2024 WHT & State Consumption Levies:**
   - Enter an invoice base amount, choose VAT classification (`7.5% Standard`, `0% Zero-Rated`, `Exempt`), toggle **State Consumption Levy** or **10% Fiduciary Hospitality Service Charge**, and choose **2024 WHT Transaction Type** (`2%`/`5%`/`10%`).
   - Switch to **`Pro`** mode to inspect the exact statutory citations, balanced ledger liability split (`2110` VAT, `2130` State Levy, `2140` Service Charge, `1150`/`2120` WHT), and ready-to-export **NRS E-Invoice `TaxSubtotal` JSON**.

### Composing Single or Hybrid Business Packs (`/packs`)
1. From **`Overview`**, click **`Business Pack Composer`** (`/packs`) to open your modular business setup workspace.
2. Choose a **Primary Business Template** (or keep **Custom / Multi-Unit Hybrid Builder**) and tick **Hybrid multi-unit business** if you operate multiple divisions (for example, a Retail shop + Light Manufacturing workshop, or a Boutique Hotel + Bistro Diner).
3. Select the **Operational Capability Primitives** that match your operations (such as **POS Daily Cash-Up**, **SKU Inventory**, **Hospitality Room Folios**, **Diner Recipe & Table POS**, or **Fleet & Delivery Trip Costing**). NairaBooks previews the unified Chart of Accounts, analytical reporting dimensions, KPIs, and tax defaults immediately without saving until you apply.
4. Customize business vocabulary labels (**Who pays you?**, **Sales Document Name**, **Tracking Unit Label**—e.g., `Guest`, `Guest Folio / Table Check`, `Property Wing`) and click **`Apply Pack & Provision IFRS Accounts`**.
5. Switch to **`Pro`** mode to inspect the merged **Declarative IFRS CoA & JSON Manifest Preview** before posting vouchers.

### Running Flagship Pack Operations (`/operations` — People & Stock)
1. Click **`People & Stock`** in the top navigation capsule (or **`Flagship Packs & Stock`** on `Overview`) to open `/operations`.
2. Activate any of the **6 Nigerian Flagship Reference Packs** (**Retail & E-Commerce**, **Wholesale & Distribution**, **Manufacturing Light**, **Construction & Trades**, **Professional Services**, or **Non-Profit**).
3. Use the **Phase 1 Daily Commerce & Production Postings** tabs:
   - **Retail POS Cash-Up:** Enter gross daily sales, cash vs Paystack/Moniepoint POS card tenders, terminal MDR fee, and SKU cost of goods sold—NairaBooks automatically isolates `7.5%` Output VAT and computes gross profit margin.
   - **Wholesale Landed Cost PO:** Enter supplier invoice cost, shipping/port clearing fees, units received, and target unit price—NairaBooks calculates IAS 2 landed unit cost and wholesale margin percentage.
   - **Manufacturing BOM Batch:** Enter raw materials issued, direct factory conversion cost, scrap/spoilage, and finished units produced—NairaBooks rolls costs from WIP into finished stock and records yield percentage.
4. Toggle **`Pro`** mode to inspect exact balanced Debit/Credit IFRS account postings.
5. Use the **Phase 2 Services, Construction & Non-Profit** tabs (after activating the matching flagship pack):
   - **Construction Job & WHT:** Record client progress valuations or subcontractor certificates by project site, track retention holdbacks (`%`), materials issued, and let NairaBooks compute `2%`/`5%` WHT (automatically doubled `2x` if no contractor TIN is provided).
   - **Prof. Services Time & Retainer:** Log billable vs billed hours (realization rate %), apply client retainers held, add reimbursable expenses and client WHT credit notes—plus review the automatic **Nigeria Tax Act 2025** non-exempt CIT compliance notice.
   - **Non-Profit Grant & Burn:** Record restricted or unrestricted donor grants and program spending against grant budgets—NairaBooks automatically releases restricted funds (`3200`) as money is spent and shows budget-vs-actual burn rate and remaining grant balance.
6. Use the **Phase 3 Hotel USALI & Diner Operational Workbooks** (or load a one-click preset on **`/packs`** -> *Hotel / Hospitality (USALI)*, *Diner / Restaurant*, *Hybrid Hotel + Diner*, or *Logistics & Fleet*):
   - **Hotel USALI Folio:** Enter room nights sold vs available rooms, room revenue, `7.5%` VAT, `5%` State Consumption Levy, and `10%` guest service charge—NairaBooks posts taxes/service charge into liability accounts (never inflating revenue) and calculates Occupancy %, ADR, and RevPAR.
   - **Diner Service Shift:** Enter kitchen/beverage sales, `7.5%` VAT, `5%` State Consumption Levy, covers served, recipe COGS, and kitchen spoilage—NairaBooks computes average check per guest and food cost %.


## 8. Sign In, Create Business Account & Audit Trail (`/login`, `/signup`, `/security`)
Use **`Sign In`** (`/login`) or **`Create New Account`** (`/signup`) from the home Overview or top capsule bar to enter NairaBooks cleanly, and open **Access & Audit** (`/security`) to manage team permissions and statutory locks:
- **Create a New Business Workspace (`/signup`):** Choose your Nigerian sector (*Retail & Online Shop*, *Wholesale & Supply*, *Maker & Light Factory*, *Builder & Contractor*, *Services & Agency*, *Non-Profit / NGO*, or *Mix & match modules*), enter your owner account & company RC number, and NairaBooks creates an isolated multi-tenant workspace and signs you in immediately.
- **Sign In (`/login`):** Enter your email/password or click any of the 5 demo Nigerian role cards (`owner@lagostrading.ng`, `cfo@lagostrading.ng`, `clerk@lagostrading.ng`, `cashier@lagostrading.ng`, `auditor@icanaudit.ng`; demo password `NairaBooks#2026`) to preview scoped permissions.
- **Security & Governance (`/security`):**
- **Sign In & Role Personas:** Sign in as Owner / Managing Director (`owner@lagostrading.ng`), Chartered Accountant CFO (`cfo@lagostrading.ng`), Bookkeeper (`clerk@lagostrading.ng`), Branch Cashier (`cashier@lagostrading.ng`), or External Auditor (`auditor@icanaudit.ng`). Every login issues secure `HttpOnly` session cookies and enforces what each role can view or post.
- **Multi-Company Workspace Switcher:** Owners and staff assigned to multiple Nigerian businesses can switch between workspaces cleanly—NairaBooks rotates the session cookie so data never crosses between companies.
- **CAMA 2020 Section 405 Sign-Off:** A distinct Managing Director or Chartered Accountant CFO (with a valid `FRC/...` number and `ICAN`/`ANAN` membership) can certify and lock an open fiscal year prepared by a clerk. Self-certification is automatically blocked (`Segregation of Duties`).
- **Hash-Chained Audit Log:** Every journal posting, reversal, tax update, industry pack change, sign-in, and CAMA seal appends a SHA-256 hash-linked entry. Toggle **Pro** mode or click **Verify Hash Chain** to confirm zero tampering across all logged actions.

---

## 9. Maintain & Admin Studio (`/admin`) — Master Lists, Balances (`DR`/`CR`) & Dedicated Create/Edit Pages
Click **`Admin`** in the top navigation bar on any workspace page to manage all 17 Maintain & Admin controls in a compact, top-to-down outline layout:
- **Top-to-Down Outline Lists with `DR` / `CR` Balances:** View and manage **Customers**, **Vendors**, **Employees**, **Payroll Defaults**, **Budgets**, **Memorized Transactions**, **Inventory Items**, **Item Prices**, **Job Costs**, **Fixed Assets**, **Sales Taxes**, **Users & Roles**, and **Make Records Inactive** in clean vertical outline rows with instant search and Active/Inactive switches. Party lists show live **Balance (`Debit DR` or `Credit CR`)** instead of credit limits.
- **Dedicated Create & Edit Studio Pages (`/admin/[module]/new` & `/admin/[module]/[id]`):** Clicking **`+ New [Record]`** opens a full Cupertino creation page with a **`Simple Creation | Full Creation`** toggle (start fast with 4–5 essentials or expand into all Sage-inspired multi-tab controls). Clicking **`Edit`** on any record opens directly in **Full Ledger Mode** (locked to full details across every tab—such as **General**, **Contacts**, **History**, **Sales Info**, and **Payment & Credit** for Customers, **12-Month Allocation Grid** for Budgets, **Period History** for Accounts, **PAYE/PenCom** estimator for Employees, and **IAS 16 Depreciation Schedule** for Fixed Assets).
- **IFRS Group & Individual Chart of Accounts:** Inside **Books & Budgets -> Chart of Accounts**, accounts follow strict IFRS classification (`Assets — Current` `IAS 7 / IFRS 9 / IAS 2`, `Assets — Non-Current` `IAS 16 / IAS 38`, `Liabilities — Current` `IFRS 9 / IAS 12`, `Liabilities — Non-Current`, `Equity` `IAS 1`, `Revenue` `IFRS 15`, `Expenses` `IAS 1 / IAS 2 / IAS 19`). **Group Accounts** (such as `1500 · Property, Plant and Equipment (Fixed Assets)`) act as collapsible roll-up headers, while **Individual Accounts** (such as `1530 · Motor Vehicles`, `1510 · Plant, Machinery & Generators`, and `1590 · Accumulated Depreciation — PPE`) nest underneath for posting.

---

## 10. Transactions Hub (`/transactions`) — All 27 Operational Entry Types & Dedicated Create/Edit Pages
Click **`Transactions`** in the top navigation bar on any workspace page to record and manage day-to-day business entries in a calm, animated Cupertino interface:
- **6 Clear Pillars (27 Transaction Types):** Switch smoothly across **Money In** (*Quotes & Sales Orders*, *Sales & Invoicing*, *Invoice Time & Expenses*, *Receive Money*, *Finance Charges*, *Select for Deposit*, *Credit Memos*), **Money Out** (*Select for Purchase Orders*, *Purchase Orders*, *Purchases & Receive Inventory*, *Vendor Bills*, *Select for Payment*, *Vendor Payments*, *Write Checks*, *Vendor Credit Memos*), **Banking & Register** (*Account Register*, *Account Reconciliation*, *Void Checks*), **Time & Payroll** (*Time & Expense Tickets*, *Select for Payroll Entry*, *Payroll Entry*), **Ledger & Stock** (*General Journal Entry*, *Inventory Adjustments*, *Inventory Assemblies*), and **Follow-Ups & System** (*Customer & Vendor Letters*, *Action Items & Reminders*, *System & Period Tasks*).
- **Quick-Launch & Clean Outline Register:** Click **`All 27 Types`** to jump straight into any creation sheet, filter by type or status (`Posted`, `Open`, `Paid`, `Pending`, `Cleared`, `Draft`, `Voided`), update status in one tap, or click **`Edit`** to open its full transaction workspace.
- **Dedicated Create & Edit Pages (`/transactions/[type]/new` & `/transactions/[type]/[id]`):** Creation pages feature a **`Simple Creation | Full Creation`** toggle so beginners can enter fast essentials while accountants can inspect full **Tax & Accounting** (auto `7.5%` NRS VAT, `2%/5%/10%` WHT, and live Double-Entry DR/CR impact preview) and **Settlement & Notes** tabs. Edit pages always open in **Full Transaction Mode**, with tailored domain editors for line items, batch checklists, Nigerian PAYE/PenCom payroll slips, balanced Debit/Credit general journals, and IAS 2 stock counts.
- **Direct Items on Customer Receipts & Vendor Payments (No Invoice Required):** When recording **Receive Money** (`/transactions/receive-money/new`) or **Vendor Payments** (`/transactions/payments/new`), enter items paid or received directly in the **Direct Items Received / Paid** table (description, optional GL account in Full Mode, quantity, unit price, and optional 7.5% VAT)—no need to create a customer invoice or supplier bill first. You can still optionally tick or link open customer invoices or supplier bills on the same screen.
- **Slim Single-Line Top Navbar:** The floating top navigation capsule stays on one uncluttered line (`Overview | Transactions | Reconcile | Reports | Admin` + `Simple | Pro`) with legacy clutter (`Books`, `People & Stock`, `Sign In`, `Access & Audit`, `+ New Entry`) removed from the bar.


---

## 11. Reports & Analytics Studio (`/reports`) — 10 Pillars, 1-Click FRCN Annual Report & Multi-Sheet Excel Export
Click **`Reports`** in the top navigation bar to access the full statutory and operational reporting center:
- **All Reports Catalog Landing by Default:** Clicking `Reports` opens the catalog directory where you can search across all reports by keyword or filter across 10 operational pillars (*Financial Statements*, *Accounts Receivable*, *Accounts Payable*, *General Ledger*, *Inventory*, *Payroll*, *Banking & Reconciliation*, *Job Costing*, *Time & Expense*, *Company Audit*) before opening any specific statement.
- **1-Click FRCN Compliant Annual Report Generator:** Click **`✨ Generate FRCN Compliant Annual Report`** on the catalog banner or inside any report view to open the full statutory package modeled directly on official Financial Reporting Council of Nigeria (`FRCN`) audited statements. Pick any fiscal year (`FY2026`, `FY2025`, etc.) to view all 10 official sections:
  1. **Cover & Corporate Information:** Official branding, registered office address, bankers (Central Bank of Nigeria, Zenith Bank), and independent auditor credentials.
  2. **Management Report & Responsibilities:** Governance statements and going-concern assessments.
  3. **CAMA 2020 Section 405 Certification:** Statutory joint certification by the Chief Executive Officer and Chief Financial Officer with verified ICAN/FRCN license registration numbers.
  4. **Independent Auditor's Report:** PKF Professional Services audit opinion with ICAN practicing seal under International Standards on Auditing (ISAs).
  5. **Statement of Financial Position:** Balance sheet detailing Assets, Liabilities, and Equity.
  6. **Statement of Profit or Loss:** Revenue, operational expenses, and surplus for the year.
  7. **Statement of Changes in Equity:** General reserve and statutory reserve movements.
  8. **Statement of Cash Flows:** Operating, investing, and financing direct cash flows (IAS 7).
  9. **Notes 1–26:** Material accounting policies under IFRS and the Nigerian Tax Act 2025.
  10. **Other National Disclosures:** Statement of Value Added (OND Page 41) and Five-Year Financial Summary (OND Page 42).
- **Native Multi-Sheet Excel (.xlsx / .xls) Export:** Every report view includes an **`Export Excel (.xlsx)`** button next to CSV, JSON, Copy, and Print. The annual report modal exports a multi-sheet Excel workbook with Nigerian corporate green `#006838` styled headers, bold summary lines, and formatted currency (`₦#,##0.00`) cells.
- **Interactive Report Customization:** Every individual report includes 5 expandable drawers: **Filters** (text search, date ranges, zero-balance toggle), **Columns** (tick or untick visible columns in real-time), **Display & Scale** (Comfortable vs Compact row density, Full ₦ vs Short ₦M, Zebra striping), and **Advanced Options** (CAMA SHA-256 seal, aging bracket intervals, IAS 2 costing models).


---

## 12. Account Reconciliation Studio (`/reconcile`) — Bank Statement PDF Upload & Transaction Matching
Click **`Reconcile`** in the top navigation bar to reconcile your bank and POS accounts against your company books:
- **Upload Bank Statement PDF:** Generate an official bank statement PDF from your bank (Access Bank `*901#`, Zenith, GTBank, First Bank, etc.) and drag & drop it into the upload zone. You can also click **`Auto-Load Sample Statement (*901#)`** for an instant preloaded statement modeled on Access Bank statement `1858587600` (Emmanuel Oladimeji Ogunsola) with all 46 real transaction lines, NIP transfers, and fee debits.
- **Real-Time Double-Entry Balancing KPI Strip:** High-contrast Apple iOS cards display **Statement Ending Balance**, **Cleared Deposits (+₦)**, **Cleared Withdrawals (-₦)**, and **Reconciliation Status** with a live dynamic badge (`Balanced ₦0.00` 🟢 or `Variance ₦X.XX` 🟡) and a visual progress bar.
- **Side-by-Side Matching Feed:** Split two-pane interface displays bank statement lines on the left (with animated category badges for NIP Transfers, POS Web Payments, SMS Alert Fees, Card Maintenance, Credit Interest, and WHT) alongside your company ledger vouchers on the right.
- **⚡ 1-Click Auto-Match Feed:** Click **`⚡ 1-Click Auto-Match Feed`** to instantly match all transaction pairs where the amount and double-entry direction match.
- **+ Quick Post to Books:** When bank fees, card maintenance fees, or interest appear on the statement that have not yet been recorded in the company books, click **`+ Quick Post`** on that statement row. The dialog pre-fills the amount, date, and suggested Nigerian IFRS account (`5130 Bank Charges`, `4200 Interest Income`, `2130 WHT Payable`), posts the voucher, and marks the line reconciled immediately.
- **Foreign FX Revaluation (IAS 21):** Switch to the **Foreign FX Revaluation** tab to revalue foreign domiciliary accounts (USD, EUR, GBP) against Central Bank of Nigeria closing rates.

---

## 13. Live Transaction Posting & General Ledger Integration
When you save a transaction in **Transactions** (`/transactions/[type]/new`), NairaBooks posts it to your company's own ledger:
- **Correct double entry for every type, using your own chart of accounts.** For example:
  - **Sales invoice:** debits Receivables and credits Revenue and Output VAT.
  - **Bill:** debits the expense (or stock), and Input VAT. It credits Payables and WHT Payable.
  - **Payslip:** debits Salaries for gross pay plus the employer's 10% pension. It credits PAYE, pension (8% + 10%), NHF, and Bank for net pay.
  - **Stock count:** posts the shortage or gain against Inventory.
- **What does not post:** quotes, purchase orders, requisitions, deposit selections, reconciliations, letters, action items, system tasks, and anything saved as **Draft**.
- **Editing or deleting:** saving the same record again changes nothing; an edit reverses the old voucher and posts the new one; deleting reverses it. Nothing is ever double-counted.
- **If posting fails** (for example, a closed year or an unbalanced journal), the editor stays open and shows the reason.
- **Admin accounts:** new or renamed accounts in **Admin → Chart of Accounts** become postable straight away. Beginning balances you type there are posted as one "Opening Balances" entry against *Opening Balance Equity*.
- **Stock and payroll:** pick an item from the inventory list on a line to move its stock and post cost of sales automatically. Payslips appear in the **Payroll Register**.
- **Reports** (`/reports`) all read these postings:
  - Trial Balance, Profit & Loss, Balance Sheet, General Journal
  - Aged Receivables/Payables (payments settle the oldest invoices first)
  - Inventory Valuation, Payroll Register

---

## 14. Automated Quality Gate, Diagnostic Tools & Rollback Safety
For developers, controllers, and IT administrators verifying platform health and compliance:
- **1-Command Quality Gate (`python scripts/run_quality_gate.py`):** Runs the full verification pipeline:
  ```bash
  uv run python scripts/run_quality_gate.py
  ```
  Executes Python Pytest (`85` tests), Ruff code cleanliness, Mypy type-checking, TypeScript (`tsc --noEmit`), Vitest (`45` tests), and 100% wizard skill coverage.
- **Automated Unit Test Generator (`python scripts/generate_unit_tests.py`):** Scans domain classes using AST and generates boundary tests:
  ```bash
  uv run python scripts/generate_unit_tests.py --scan-file src/nairabooks/ledger/domain/money.py
  ```
- **Conductor Track Rollback Engine (`python scripts/conductor_revert.py`):** Safely plans track reverts with git awareness:
  ```bash
  uv run python scripts/conductor_revert.py auth-rbac-audit-trail_20261112
  ```
- **Diagnostic Error Detective (`src/nairabooks/diagnostics/`):** Automatically diagnoses accounting exceptions (unbalanced debits, locked CAMA periods, cross-tenant header tampering) and provides actionable remediation guidance while masking passwords, API keys, and bearer tokens.


---

## 15. Security Hardening, SAST Scanning & Privacy Management
For compliance officers, IT administrators, and security auditors:
- **Run Static Application Security Testing (SAST):**
  ```bash
  uv run python scripts/run_sast_scan.py
  ```
  Scans all Python and TypeScript source code for SQL injection, XSS risks, and leaked credentials.
- **Run Statutory & Regulatory Compliance Audit:**
  ```bash
  uv run python scripts/compliance_check.py
  ```
  Audits the system against the Nigeria Data Protection Act (NDPA) 2023, CAMA 2020 Sections 374/377/405, the Nigeria Tax Act 2025, and OWASP Top 10 standards.
- **Run Dependency Vulnerability & License Audit:**
  ```bash
  uv run python scripts/audit_dependencies.py
  ```
  Verifies license compliance (100% permissive licenses) and supply chain integrity.
- **Data Subject Rights & CAMA Retention:**
  Users can request their personal data via Data Subject Access Requests (DSAR). When a user exercises their Right to Erasure, personal identifying data (names, emails, phone numbers) is cryptographically anonymized, while financial transaction vouchers are safely preserved under CAMA 2020 Section 374 for the mandatory 6-year retention period.

---

## 16. Git CI/CD, Release Changelogs & Team Collaboration
For engineering teams, technical contributors, and release managers:
- **Continuous Integration (GitHub Actions):** Every commit and PR is automatically audited via `.github/workflows/ci.yml`, running unit tests, typechecks, Vitest suites, SAST scanners, and statutory compliance checks.
- **Generate Pull Request with Statutory Checklists:**
  ```bash
  uv run python scripts/generate_pr.py --type feat --title "feat(vat): update 7.5% schedule" --branch feat/vat-update
  ```
  Generates a PR description enforcing zero-float, CAMA 2020, and Tax Act 2025 verification.
- **Generate SemVer Release Notes & Changelog:**
  ```bash
  uv run python scripts/generate_changelog.py --version 1.0.0
  ```
  Produces structured Keep a Changelog compliant notes in `CHANGELOG.md`.
- **Triage Issues with Statutory Impact:**
  ```bash
  uv run python scripts/issue_triage.py --title "Discrepancy in VAT report" --description "Rounding on invoices"
  ```
- **Generate Daily Async Standup Notes:**
  ```bash
  uv run python scripts/generate_standup_notes.py --engineer "Dev Lead"
  ```


---

## 17. Authentic Nigerian Cultural Artwork Background & Theme Customization
NairaBooks is proudly Nigerian-themed with authentic cultural artwork woven into the application canvas. The background is rendered as a fine, executive watermark reminiscent of high-security central bank minted currency or luxury handwoven fabrics:

### Available Heritage Motifs
1. **Adire Eleko (Default):** Sacred Yoruba cassava-resist indigo geometry featuring *Olokun* wealth diamonds, *Ese Agba* footsteps of wisdom chevrons, and *Owo Ero* cowrie currency symbols in Nigerian Forest Emerald (`#006838`).
2. **Benin Royal Bronze:** 16th-century Edo court metallurgy with continuous interlocking sinusoidal guilloche braids representing eternal institutional integrity and four-petaled court sun rosettes in warm bronze (`#8A5A2B`).
3. **Igbo Uli & Aso-Oke:** Harmonious fusion of curvilinear Igbo Uli life spirals (*Agwolagwo*) and new moon crescents (*Onwa*) with the warp-and-weft combed lines of Yoruba Aso-Oke handlooms.

### How to Change or Adjust Your Cultural Background
1. Click the **Settings (Gear Icon)** in the top navigation capsule (operates like a desktop **File** menu) or navigate to `/settings`.
2. Select the **App Preferences** tab.
3. Under **Nigerian Cultural Artwork Theme**, click your preferred heritage motif card (Adire Eleko, Benin Royal Bronze, or Igbo Uli & Aso-Oke).
4. Select your preferred **Artwork Watermark Density**:
   - **Subtle (Recommended):** Fine banknote watermark; zero eye strain, optimal for daily bookkeeping.
   - **Artistic & Vibrant:** Richer decorative presence for board meetings and presentations.
   - **Minimalist Whisper:** Barely-there texture for high-density spreadsheet auditing.
5. Your choice is saved instantly to your device and applied live across all tabs and routes!
6. When printing A4 financial reports or exporting PDFs, the background pattern is automatically removed so documents print on clean, professional white paper with zero ink or toner waste.

---

## 18. New Organization Registration & Clean Zero-State Ledger
When you sign up as a new business owner or managing director:
- **Clean Slate Guarantee:** Your new organization starts in an immaculate zero-state. All dashboard cards (Cash on Hand, Total Receivables, Total Payables, Net Income) read strictly **₦0.00**, and the voucher count is **0**. There is zero data bleed from sample/demo companies.
- **Auto-Provisioned Chart of Accounts:** Your company is automatically provisioned with the standard Nigerian SME Chart of Accounts:
  - `1010` Zenith Bank Current Account (NGN)
  - `1020` Access Bank Domiciliary Account (USD)
  - `2010` NRS Output VAT Payable (7.5%)
  - `3010` Owner Share Capital
  - `4010` Trading & Operating Revenue
  - `5010` Logistics & Operating Expenses
- **Active Fiscal Period:** An open fiscal period (`FY2026`) is initialized automatically, allowing you to record transactions immediately without manual fiscal configuration.
- **Onboarding Banner:** A helpful green banner on `/overview` confirms your ledger is active and offers direct 1-click shortcuts to **Post First Voucher** or **Import Statement**. Once your first transaction is posted, the cards update dynamically to reflect live general ledger totals.

---

## 19. 1-Based Sequential Numbering, Searchable Pickers & Live Reports

### 1-Based Sequential Numbering
In every newly registered organization, all numbering starts cleanly from **1**:
- **Transactions:** Starts at `INV-2026-001` (Sales Invoices), `QUO-2026-001` (Quotes), `BIL-2026-001` (Bills), `JV-2026-001` (Journal Vouchers), `REC-2026-001` (Customer Receipts), `PAY-2026-001` (Vendor Payments), etc., and increments strictly by one (`002`, `003`...).
- **Admin Records:** Starts at `CUS-001` (Customers), `VND-001` (Vendors), `SKU-001` (Inventory Items), `JOB-001` (Jobs/Projects), `EMP-001` (Employees), `FA-001` (Fixed Assets), etc.

### Searchable Counterparties & Inventory Catalog Picker
- **Searchable Customer / Vendor / Staff Combobox:** When creating any transaction, click or type in the Customer/Vendor field. A popover opens showing your registered counterparties, lets you filter by typing part of the name or code, and displays quick-pick chips for 1-click selection. You can also type a new counterparty name directly.
- **Inventory Item Auto-Complete:** When adding line items to an invoice, quote, or bill, select an item from the **Inventory Item Picker** dropdown (`code — name (price)`). NairaBooks will automatically populate the item description, standard unit price, and general ledger account code.
- **Relational Pickers in Admin Studio:** When creating inventory items, fixed assets, or jobs in the Admin tab, relational dropdowns let you pick preferred vendors, client customers, sales reps, and ledger accounts directly from your live company records.

### Live Financial Reports & Zero-Balance Accounts Display
- **All 15 Reports Connected to Live Data:** Trial Balance, Balance Sheet, Income Statement, Statement of Value Added, 5-Year Financial Performance, Aged Receivables, Aged Payables, General Journal, Inventory Valuation, Payroll Register, and CAMA Audit Trail now compute directly from your live company transactions and Chart of Accounts.
- **Complete Chart of Accounts Visibility:** By default, financial statements display all related accounts from your company's Chart of Accounts even if they currently have a zero balance (`₦0.00`). This gives business owners and auditors complete visibility into the structure of their accounts before and after posting transactions.
- **Hide Zero Balances (Optional):** If you prefer a more compact document showing only accounts with non-zero activity, open the **Filters** drawer on any report and enable the **"Hide Zero-Balance Accounts"** toggle.
