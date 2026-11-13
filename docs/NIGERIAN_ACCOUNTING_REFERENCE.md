# Nigerian Accounting, Tax & Regulatory Reference Manual (`docs/NIGERIAN_ACCOUNTING_REFERENCE.md`)

> **The Definitive Practical Reference for Nigerian Bookkeepers, Accountants, and Auditors**  
> *Governing Regimes: CAMA 2020, Nigeria Tax Act 2025, FIRS/NRS Gazettes, FRCN IFRS for SMEs*

---

## 1. Standard Nigerian Chart of Accounts (COA)

| Account Code | Account Name | Category | Normal Balance | Statutory Purpose / Notes |
| :--- | :--- | :--- | :--- | :--- |
| `1010` | Main Bank Account (NGN) | Asset | Debit | Liquid operational bank funds (Zenith, Access, GTB) |
| `1020` | Domiciliary Bank Account (USD/FX) | Asset | Debit | FX cash reserves valued at CBN / NAFEM closing rates |
| `1050` | Petty Cash / Register Till | Asset | Debit | Physical cash for minor office disbursements |
| `1110` | Accounts Receivable (Trade Debtors) | Asset | Debit | Unpaid sales invoices owed by customers |
| `1140` | Input VAT Receivable | Asset | Debit | 7.5% VAT paid to registered Nigerian vendors |
| `1150` | WHT Credit Notes Receivable | Asset | Debit | Withholding tax deducted at source by corporate clients |
| `1200` | Inventory - Finished Goods | Asset | Debit | Commercial trading goods on hand |
| `1210` | Inventory - Raw Materials & Packaging | Asset | Debit | Manufacturing raw inputs |
| `1510` | Office Furniture & Equipment | Asset | Debit | Fixed assets subject to CAMA depreciation |
| `2010` | Output VAT Payable | Liability | Credit | 7.5% VAT collected from customers, remitted monthly |
| `2110` | Accounts Payable (Trade Creditors) | Liability | Credit | Amounts owed to suppliers for goods & services |
| `2130` | Withholding Tax (WHT) Payable | Liability | Credit | WHT deducted from vendors, remitted to FIRS/SIRS |
| `2140` | PAYE / Employee Tax Payable | Liability | Credit | Personal income tax remitted to State IRS (e.g. LIRS) |
| `2150` | Pension Contribution Payable | Liability | Credit | 10% employer + 8% employee statutory pension (PenCom) |
| `3010` | Share Capital | Equity | Credit | Paid-up corporate capital registered with CAC |
| `3020` | Retained Earnings | Equity | Credit | Accumulated corporate profits |
| `4010` | Operating Sales Revenue | Revenue | Credit | Primary business trading & services revenue |
| `4050` | Other Income | Revenue | Credit | Incidental income, interest, or scrap sales |
| `5010` | Cost of Goods Sold (COGS) | Expense | Debit | Direct materials and acquisition costs |
| `5020` | Bank Charges & Electronic Levy | Expense | Debit | EMTL (₦50), transfer charges, and bank fees |
| `5110` | Salaries & Staff Wages | Expense | Debit | Gross employee compensation |
| `5120` | Office Rent & Rates | Expense | Debit | Rent subject to 10% WHT |
| `5150` | Utilities, Power & Generator Fuel | Expense | Debit | Electricity, diesel, and maintenance |
| `5200` | Professional & Legal Fees | Expense | Debit | Consulting fees subject to 5% or 10% WHT |

---

## 2. All 27 Supported Transaction Types & Accounting Rules

| # | Transaction Type | Category | Primary Debit | Primary Credit | Tax Split Triggered |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | Sales Invoice | Money In | `1110 AR` | `4010 Revenue` | `2010 Output VAT (7.5%)` |
| 2 | Customer Receipt | Money In | `1010 Bank` | `1110 AR` | `1150 WHT Credit` if deducted |
| 3 | Cash Sale | Money In | `1010 Bank` | `4010 Revenue` | `2010 Output VAT (7.5%)` |
| 4 | Sales Return / Credit Note | Money In | `4010 / 2010` | `1110 AR` | Reverses Output VAT |
| 5 | Customer Deposit | Money In | `1010 Bank` | `2190 Customer Advances` | Deferred VAT |
| 6 | Recurring Invoice | Money In | `1110 AR` | `4010 Revenue` | Scheduled 7.5% VAT |
| 7 | Vendor Bill | Money Out | `5010 / Expense` | `2110 AP` | `1140 Input VAT (7.5%)` |
| 8 | Vendor Payment | Money Out | `2110 AP` | `1010 Bank` | `2130 WHT Payable` deduction |
| 9 | Direct Cash Expense | Money Out | `5xxx Expense` | `1010 Bank` | Direct expense booking |
| 10 | Purchase Return / Debit Note | Money Out | `2110 AP` | `5010 / 1140` | Reverses Input VAT |
| 11 | Vendor Prepayment | Money Out | `1190 Prepayments` | `1010 Bank` | Deferred expense |
| 12 | Expense Claim Reimbursement | Money Out | `5xxx Expense` | `1010 Bank` | Staff claim reimbursement |
| 13 | Bank Deposit | Banking | `1010 Bank` | `1050 Petty Cash` | Cash transit |
| 14 | Bank Transfer | Banking | `1020 Target Bank` | `1010 Source Bank` | Inter-bank clearing |
| 15 | Check / Cheque Issue | Banking | `2110 AP` | `1010 Bank` | Outstanding check register |
| 16 | Bank Fee / EMTL Charge | Banking | `5020 Bank Charges` | `1010 Bank` | Non-VAT exempt stamp levy |
| 17 | Salary Payroll Slip | Payroll | `5110 Wages` | `1010 Bank` | `2140 PAYE`, `2150 Pension` |
| 18 | Contractor Payment | Payroll | `5200 Fees` | `1010 Bank` | `2130 WHT Payable (5%/10%)` |
| 19 | Staff Advance | Payroll | `1160 Staff Loans` | `1010 Bank` | Payroll deduction asset |
| 20 | Staff Advance Recovery | Payroll | `1010 Bank / 5110` | `1160 Staff Loans` | Offset against monthly salary |
| 21 | General Journal Entry | Ledger | Custom DR | Custom CR | Balanced debits and credits |
| 22 | Inventory Adjustment | Ledger | `5010 COGS / Loss` | `1200 Inventory` | Stock write-off / count sync |
| 23 | Fixed Asset Depreciation | Ledger | `5300 Depreciation` | `1590 Acc. Depr.` | Monthly CAMA asset write-down |
| 24 | FX Revaluation Journal | Ledger | `1020 / 5400 FX Loss` | `4090 FX Gain` | NAFEM balance realignment |
| 25 | Customer Note / Reminder | Follow-Up | None (Memo) | None (Memo) | Operational tracking |
| 26 | Vendor Dispute Note | Follow-Up | None (Memo) | None (Memo) | Hold on payment voucher |
| 27 | Year-End Retained Earnings Close | System | `4xxx / 5xxx P&L` | `3020 Retained Earn` | Annual P&L equity close |

---

## 3. Statutory Withholding Tax (WHT) Rates (FIRS/NRS Guidelines)

| Transaction Nature | Corporate Beneficiary Rate | Individual Beneficiary Rate | Remittance Statutory Deadline |
| :--- | :--- | :--- | :--- |
| Contracts of Supply / Goods | `2.0%` | `2.0%` | 21st day of subsequent month |
| Construction & Civil Works | `2.5%` | `2.5%` | 21st day of subsequent month |
| Professional, Management & Technical Consultancy | `10.0%` (or `5.0%` for small firms) | `5.0%` | 21st day of subsequent month |
| Commercial Rent & Leases | `10.0%` | `10.0%` | 21st day of subsequent month |
| Dividends, Interest & Royalties | `10.0%` | `10.0%` | 21st day of subsequent month |
| Directors' Fees & Remuneration | `10.0%` | `10.0%` | 21st day of subsequent month |
