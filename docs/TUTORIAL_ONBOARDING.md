# NairaBooks Hands-On Tutorial Series (`docs/TUTORIAL_ONBOARDING.md`)

> **Step-by-Step Practical Guides for Business Owners, Bookkeepers, and Accountants**  
> *Estimated Completion Time: 15–20 minutes*

---

## Tutorial 1: Recording Your First Nigerian Sales Invoice with 7.5% VAT

### Learning Objective
Learn how to create an invoice for a customer, calculate 7.5% Output VAT accurately, and post it to the double-entry general ledger.

### Step-by-Step Instructions:
1. **Navigate to Invoicing:**
   - On the top navigation capsule, click **Transactions** (or **Books**).
   - In the **Money In** pillar, select **Sales Invoice** (`/transactions/sales-invoice/new`).
2. **Enter Customer & Transaction Details:**
   - **Customer:** Select an existing customer or type a new name (e.g., `Dangote Flour Mills Plc`).
   - **Invoice Date:** Pick today's date (e.g. `2026-11-13`).
   - **Payment Terms:** Select `Net 30 Days`.
3. **Add Line Items:**
   - Item: `Supply of Industrial Grain Bags`
   - Quantity: `100`
   - Unit Price (₦): `1,000.00`
   - Line Total: `₦100,000.00`
4. **Inspect the Automatic Nigerian Tax Breakdown:**
   - Subtotal: `₦100,000.00`
   - Output VAT (7.5%): `₦7,500.00`
   - Total Receivable: `₦107,500.00`
5. **Post to the General Ledger:**
   - Click **Post to Books**.
   - NairaBooks automatically validates that Debits equal Credits and assigns sequential voucher number `JV-2026-00001`.
   - Your customer balance now shows `₦107,500.00`, and Output VAT is staged for your monthly FIRS/NRS return!

---

## Tutorial 2: Reconciling an Access Bank PDF Statement in Under 2 Minutes

### Learning Objective
Upload a real Nigerian bank statement PDF (Access Bank, GTBank, Zenith, UBA), let NairaBooks parse the transactions, and automatically match them against your general ledger entries.

### Step-by-Step Instructions:
1. **Open the Reconciliation Workspace:**
   - Click **Reconcile** on the top capsule navigation (`/reconcile`).
2. **Upload Bank Statement:**
   - Drag and drop your downloaded Access Bank PDF statement into the upload zone.
   - The parser extracts closing balances, date ranges, and statement lines (credits, debits, stamp duties, SMS charges).
3. **Review Side-by-Side Matching Grid:**
   - **Left Column:** Bank Statement Feed (as recorded by Access Bank).
   - **Right Column:** General Ledger Feed (as recorded in NairaBooks).
4. **Trigger Auto-Match:**
   - Click the green **Auto-Match (₦)** button.
   - The algorithmic matcher compares exact amounts, reference numbers, and transaction dates. Matching pairs turn green with a `Matched` badge.
5. **Quick-Post Unmatched Bank Charges:**
   - For recurring bank fees (e.g. `₦50.00` Electronic Money Transfer Levy or `₦4.00` SMS alert), click **Quick-Post to Books**.
   - Select account `5020 Bank Charges & Fees` and click confirm.
6. **Complete Reconciliation:**
   - Once the variance reaches `₦0.00`, the celebratory reconciliation banner appears!

---

## Tutorial 3: Performing Month-End Close & CAMA 2020 Section 405 Sign-Off

### Learning Objective
Safely lock an accounting period to prevent retroactive tampering and execute the statutory Segregation of Duties certification mandated by CAMA 2020.

### Step-by-Step Instructions:
1. **Review Financial Statements:**
   - Navigate to **Reports** (`/reports`).
   - Run the **Trial Balance**, **Profit & Loss**, and **Balance Sheet** for the closing period (e.g. `FY2025`).
   - Confirm that Debits equal Credits to the exact kobo.
2. **Navigate to Security & Audit:**
   - Click **Settings & Security Audit** (`/security`).
3. **Review Audit Trail Hash Chain:**
   - Inspect the cryptographic SHA-256 hash chain verifying that no journal vouchers were altered out-of-band.
4. **Execute CAMA Section 405 Certification:**
   - Review Section 405 statutory attestations:
     - Internal financial controls are effective.
     - Books represent a true and fair view of corporate affairs.
   - *Segregation of Duties Enforcement:* The system ensures the certifying officer (`approved_by`) is different from the voucher creator (`created_by`).
   - Click **Certify & Sign Off Financial Period**.
   - The period status changes to `LOCKED`. No retroactive modifications can now occur without an authorized reversal journal voucher!
