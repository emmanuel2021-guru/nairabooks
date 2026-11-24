# What NairaBooks Can and Can't Do (as of 24 Nov 2026)

This is an honest status sheet for the web app in `web/`.
- **Working** means it is covered by automated tests, and the core flows were also checked in a running browser.
- **Not verified** means the feature exists but was not re-tested in the latest round.
- **Can't do yet** means it is missing or only for show.

---

## ✅ What it can do

### 1. Companies and sign-in
- **Create a company** at `/signup`. You pick an industry (retail, wholesale, manufacturing, construction, professional services, NGO, school, hospitality, …), and the company gets that industry's Nigerian IFRS chart of accounts. Its books start empty.
- **One login can own several companies.** Sign up again with the same email and that account's password, and the new company is added to your login. Switch companies on **Settings → Security**.
- **Each company's data is separate.** Ledgers, records, tax and pack settings are stored per company, and the server only serves the signed-in company's data.
- **Roles and audit trail.** You can invite team members with roles (Owner, Accountant, Bookkeeper, …). Important actions are written to a tamper-evident audit log (CAMA 2020 s.405 hash chain).

### 2. Ledgers (Admin)
- **Chart of accounts:**
  - You can add, rename or deactivate accounts.
  - A new account can be used in transactions straight away.
  - A beginning balance typed on an account is posted as one "Opening Balances" entry against *3900 Opening Balance Equity*, and it updates if you change the balances later.
- **Customers and vendors:** the balance shown is the opening balance you typed plus every posted invoice, receipt, bill, payment and credit for that party.
- **Inventory items:**
  - Each item has a quantity on hand, unit cost, selling price and GL accounts.
  - Buying, selling, returns, supplier credits and stock counts change the quantity.
  - Selling an item also posts its cost of goods sold.
- **Employees** with pay, pension and state tax details.

### 3. Transactions — all 26 types post correct double entry
Every type posts a balanced voucher to the company's **own** accounts. If your chart lacks a needed account (for example a pension payable), the standard one is added for you. VAT (7.5%) and withholding tax are calculated on each line.

| Group | Types | What hits the books |
| :--- | :--- | :--- |
| Money in | Sales invoice, time & expense invoice, finance charge | Dr Receivables (less WHT), Dr WHT credit; Cr Revenue, Cr Output VAT. Stock items also post cost of sales. |
| | Receive money | Dr Bank, Cr Receivables |
| | Credit memo | Dr Sales returns, Dr Output VAT; Cr Receivables. Returned stock goes back into inventory. |
| Money out | Bill, receive inventory, write cheque | Dr Expense or Inventory, Dr Input VAT; Cr Payables (or Bank for cheques), Cr WHT payable |
| | Payment, payment batch | Dr Payables, Cr Bank |
| | Vendor credit memo | Dr Payables; Cr Expense or Inventory, Cr Input VAT |
| Banking | Account register | Deposit: Dr Bank, Cr chosen account. Withdrawal: the reverse. |
| | Void cheque | Dr Bank, Cr Payables |
| Payroll | Payslip | Dr Salaries (gross + employer 10% pension); Cr PAYE, Cr PenCom (8% + 10%), Cr NHF (2.5% of basic), Cr Bank (net pay) |
| | Payroll batch | Dr Salaries, Cr Bank |
| | Time & expense ticket | Dr Expense, Cr Staff expense claims payable |
| Ledger & stock | General journal | Your own debit and credit lines; they must balance and use accounts in your chart |
| | Stock count adjustment | Shortage: Dr Shrinkage, Cr Inventory. A gain is the reverse. |
| | Assembly | Dr Finished goods, Cr Raw materials |

- **Never posted:** quotes, purchase orders, requisitions, deposit selections, reconciliations, letters, action items, system tasks, and any record saved as **Draft**.
- **Edit and delete are safe:**
  - Saving an unchanged record does nothing.
  - An edit reverses the old voucher and posts the new one.
  - Deleting reverses it.
  - Nothing is double-counted, and every change leaves an audit trail.
- **Posting errors are shown.** The editor stays open and explains why, for example a closed year, an unbalanced journal or a zero amount.

### 4. Reports (`/reports`) — all read the company's real books
- **From the ledger:**
  - Trial Balance
  - Income Statement (P&L)
  - Balance Sheet
  - Statement of Value Added
  - Five-Year Summary
  - General Journal register
- **From posted transactions:**
  - Aged Receivables and Aged Payables (payments settle the oldest invoices first)
  - Customer Invoice Register (Paid / Part-paid / Open)
  - Inventory Valuation (live quantity on hand)
  - Payroll Register (from posted payslips)
- **Hide zero balances:** one button, remembered per browser. It also applies to exports and printing.
- **Export** to Excel, CSV, JSON or PDF, or print.

### 5. Overview dashboard (`/overview`)
- **Figures:**
  - Cash on hand, receivables, payables
  - Net income for this month, quarter or year to date, with the change against the previous period
  - A six-month money in / money out chart
  - Top four expense accounts
  - The oldest overdue invoices
- **Source:** every figure comes from the company's own books. The demo company keeps its sample dashboard.

### 6. Storage and hosting
- **Data survives restarts and deploys** when `DATABASE_URL` points at Postgres (Neon free tier on Render).
- **Local storage:** in local development, data is saved under `web/.data/`.
- **Saving is confirmed:** the server only replies after a save has finished. If the database is down, you get an error instead of a false "saved".
- **Production safety:**
  - A session secret is required in production.
  - Demo accounts are off unless `NAIRABOOKS_DEMO_PASSWORD` is set.
  - There is no anonymous access.

---

## ⚠️ What it can't do yet

### Accounting limits
- **Only one open year (FY2026).** FY2025 is closed and there is no FY2027 yet, so dates outside 2026 are refused. The fiscal year and start month chosen at sign-up are ignored, and there is no year-end close or roll-forward.
- **The "custom composable" chart at sign-up is ignored.** Companies get the industry template, and extra modules picked in the wizard add no accounts.
- **Accounts the system adds automatically are hidden in Admin.** Examples are *2245 PenCom Payable* and *3900 Opening Balance Equity*. They appear in reports but not in the Admin chart of accounts or the transaction account pickers.
- **Customers and vendors are matched to transactions by name.** Renaming a customer after posting separates their old transactions from the new name.
- **Customer and vendor opening balances are not in the ledger.** They show on the Admin record only. The ledger's opening receivables come from the *1120 Receivables* account balance.
- **NGN only for transactions.** FX revaluation exists as a separate tool, but invoices and bills cannot be in another currency.

### Payroll and stock limits
- **PAYE is typed by hand on each payslip.** It is not worked out from the PITA tax bands.
- **The payroll register only shows posted payslips.** Payroll batches post to the books but aren't listed per employee.
- **One cost per stock item (the last unit cost).** The FIFO / weighted-average choice on the report does not change the figures.
- **Assemblies don't use up component stock**, and stock counts need you to pick the item.

### Features that are display-only or not built
- **"Send Reminder" on overdue invoices sends nothing.** No email or SMS is sent anywhere in the app.
- **Password reset is switched off in production**, because no email delivery exists.
- **No live bank feed.** Reconciliation works from uploaded bank statements. The dashboard's "unreconciled" count is always 0.
- **Printed statements show the demo company's details.** The address (Plot 18, Ozumba Mbadiwe Avenue), signatory names and TIN are the demo company's, not yours.
- **Not verified in the latest round:**
  - bank reconciliation and quick-post
  - tax engine
  - industry packs and operations
  - CAMA period certification
  - job costing, time-ticket and budget reports

### Scale and hosting limits
- **Run one server instance only.** Saves are "last writer wins", so two instances would overwrite each other.
- **Each company's transaction list is one stored document capped at 2 MB**, roughly a few thousand transactions. Larger companies need the move to the relational schema in `db/migrations`, which isn't wired up yet.
- **Records are entered in the browser first.** If the server can't be reached, a transaction is saved on that device and the editor says it was not posted.

---

## How this was checked
- **Automated tests:** `npm --prefix web test` runs 29 test files, all passing.
  - `accounting-end-to-end.test.ts` creates a company, adds accounts with opening balances, posts all 26 transaction types plus edits and deletes, and checks every core report against hand-calculated figures.
- **Type check:** `npx tsc --noEmit` (in `web/`) is clean.
- **Browser check:** sign-up → invoice → trial balance, customer balance, hide-zero balance sheet, and the live Overview.
