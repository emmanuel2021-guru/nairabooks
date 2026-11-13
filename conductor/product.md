# Product Definition (`conductor/product.md`)

## Product Overview
- **Name:** `NairaBooks` *(workspace directory: `ac`)*
- **One-Sentence Description:** A Nigerian-first, IFRS-compliant accounting and business operations platform (built to surpass QuickBooks, ERPNext, Sage, and TallyPrime) that dynamically tailors its chart of accounts, tax matrix, operational workflows, terminology, and KPIs to fit a very wide range of Nigerian businesses.

## Problem Statement
Nigerian SMEs, mid-market firms, and non-profits currently face a false choice:
1. **Foreign Accounting Tools (QuickBooks, Sage, TallyPrime):** Expose buyers to USD/FX pricing spikes, lack native Nigerian multi-rate Withholding Tax (`2%`/`5%`/`10%` + TIN checks), miss FRCN "Other National Disclosures" (*Statement of Value Added* and *Five-Year Financial Summary*), ignore Nigeria Tax Act 2025 small-company thresholds (`₦100M` turnover / `₦250M` fixed assets + professional services exclusions) and state levies (such as Lagos LIRS `5%` consumption tax), and force all industries into one generic invoice/expense layout.
2. **Heavyweight ERPs (ERPNext):** Offer deep power but overwhelm Nigerian teams with consultant-heavy setup and lack turnkey Nigerian statutory/FRCN packs out of the box.

## Target Users & Personas
1. **Nigerian Business Owners & Founders:** Want plain-English daily controls (cash flow, profit margin, stock/job/fund health) without accounting jargon or surprise FX subscription bills.
2. **ICAN / ANAN Accountants, Finance Controllers & NGO Treasurers:** Require immutable double-entry books (`Debits == Credits`), IFRS / IFRS for SMEs compliance, CAMA 2020 Section 405 certification readiness, NRS e-invoice tax structures, and clean audit trails.
3. **Frontline Operations Staff:** POS cashiers, warehouse officers, manufacturing/assembly supervisors, construction site engineers, consultants, and hotel/restaurant staff using industry-specific workflows.

## Core Capabilities & Flagship Scope
1. **Layer A — Immutable Nigerian IFRS & Tax Core:** Double-entry General Ledger, NGN + FX revaluation, bank/POS reconciliation, fixed assets, FRCN IFRS + Other National Disclosures, and effective-dated Nigerian statutory tax engine (Tax Act 2025, 2024 WHT Regulations, `7.5%` VAT / NRS e-invoice readiness, State Consumption Taxes).
2. **Layer B — Six Flagship Reference Packs:**
   - **Retail & E-commerce:** POS transactions, daily cash flows, VAT compliance, real-time stock/inventory levels.
   - **Wholesale & Distribution:** Multi-tier inventory, vendor POs, shipping/landed costs, profit margins.
   - **Manufacturing (Light / Small Scale):** Bill of Materials (BOM), assembly tracking, raw material costs, WIP & production accounting.
   - **Construction & Trades:** Job costing per site, subcontractor payments (`2%`/`5%` WHT & retention), site materials.
   - **Professional Services:** Client billing, time tracking, expense reimbursements, bookkeeping + automatic Tax Act 2025 non-exempt CIT flag.
   - **Non-Profit Organizations:** Fund accounting (restricted vs. unrestricted), donor/grant tracking, budget-vs-actual reporting.
3. **Universal Custom / Composable Pack Builder:** Lets any business—including *Hotels/Hospitality (USALI)*, *Diners/Restaurants*, *Healthcare*, *Logistics*, and *Hybrid Multi-Unit* entities—compose custom profiles from reusable operational primitives without rewriting core accounting logic.

## Success Metrics (Phase 1 Baseline)
- **North Star:** Monthly Compliant Books Closed (balanced ledger + Nigerian IFRS or statutory tax report exported).
- **Onboarding Speed:** Industry Pack selection to tailored Chart of Accounts + tax profile in `< 60 seconds`; first balanced posting in `< 15 minutes`.
- **Correctness Invariant:** `0` unbalanced journal entries (`Total Debits == Total Credits` enforced at domain + DB boundaries).
