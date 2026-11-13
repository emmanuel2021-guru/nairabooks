# Product Guidelines (`conductor/product-guidelines.md`)

## Voice and Tone
- **Dual-Audience Clarity:** Operational screens and user guides speak **plain everyday Nigerian business English** (e.g., `"Record Sale"`, `"Supplier Bill"`, `"Tax Held Back (WHT)"`, `"Money In / Money Out"`), while accountant views, ledger exports, and IFRS statements use **exact FRCN / ICAN / IFRS terminology** (*Statement of Financial Position*, *Statement of Profit or Loss and Other Comprehensive Income*, *Statement of Value Added*).
- **Transparent Numbers:** Always show currency (`₦` / `NGN` or foreign currency + exchange rate), tax breakdown (`Net + VAT + State Levy - WHT = Net Payable`), and effective law/rule version.

## Design Principles
1. **Accounting Integrity Above Convenience:** Never mutate or delete posted journal entries; reversals use explicit counter-journal entries with full audit trail (`who`, `when`, `reason`).
2. **Adaptable Workflows, Immutable Core:** Industry Packs customize labels, accounts, tax defaults, and operational workflows—never bypassing double-entry balance checks.
3. **Rule-Driven Nigerian Compliance:** Effective-dated rule tables govern VAT (`7.5%`), WHT (`2%/5%/10%`), `₦100M`/`₦250M` small-company thresholds, professional-services exclusions, and state levies—never magic constants scattered in UI code.
4. **Fail Loudly with Helpful Guidance:** Validation errors must explain *why* in plain English and *how to fix it* (e.g., `"Supplier TIN missing: under 2024 WHT rules, missing TIN triggers double-rate WHT or blocks exemption."`).

## Canonical Glossary
- **Pack / Industry Profile:** Composable bundle of Chart of Accounts template + Tax Rules + Operational Primitives + UI Vocabulary + KPIs.
- **Flagship Reference Pack:** One of the 6 pre-built primary templates (*Retail & E-commerce*, *Wholesale & Distribution*, *Manufacturing Light/Small Scale*, *Construction & Trades*, *Professional Services*, *Non-Profit Organizations*).
- **Composable Builder:** Tooling enabling users to mix primitives for custom or hybrid industries (e.g., Hotel + Diner, Logistics, Healthcare).
- **Other National Disclosures:** Mandatory Nigerian FRCN financial statement schedules (*Statement of Value Added* and *Five-Year Financial Summary*).
