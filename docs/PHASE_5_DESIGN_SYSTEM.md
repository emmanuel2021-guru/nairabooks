# Phase 5: NairaBooks Visual Design System, KPI Dashboards & WCAG 2.2 AA Audit

> **Phase Scope:** Visual design system architecture, Google Stitch MCP prototyping, industry-tailored KPI hierarchy, Grav documentation illustrations, WCAG 2.2 AA accessibility compliance, and screen-reader test verification for **NairaBooks**.

---

## 1. UX Information Architecture & Core Navigation Flows (`ui-ux-designer`)

NairaBooks separates **statutory financial certainty** (Layer A: Nigerian IFRS, Tax Act 2025, CAMA 2020 Sec 405, FRCN disclosures) from **modular operational workflows** (Layer B: 6 Flagship Reference Packs + Universal Custom/Composable Pack Builder).

### 1.1 Complete Zero-Sidebar Top-Capsule Progressive Workflow (`ADR-012`)
NairaBooks replaces traditional sidebars with a centered `#F8FAFC` daylight workspace anchored by a single-line **Floating Top Navigation Capsule** containing 5 plain-English tabs (`Overview`, `Books`, `People & Stock`, `Reconcile`, `Reports`) alongside a `Simple | Pro` density toggle and `+ New Entry` quick action:

1. **Setup Business Type (`screen-1-setup-business`):** Single centered question (*"What kind of business do you run?"*), 6 plain sector cards (*Retail & Online Shop*, *Wholesale & Supply*, *Maker & Light Factory*, *Builder & Contractor*, *Services & Agency*, *Non-Profit / NGO*) mapping 1:1 to NairaBooks's **6 Flagship Reference Packs**, plus a toggleable `Mix and match modules (e.g. Hotel + Diner)` composer preview (**Universal Custom / Composable Pack Builder**) and `Continue ->`.
2. **Tab 1 — Overview (`screen-2-overview-top-nav`):** Zero-sidebar top capsule navigation, clickable **3-step beginner guide** (*1. Add Customers & Stock -> 2. Record Sales & Purchases -> 3. Drop Bank PDF to Match*), strictly **3 plain money cards** (*Money in Bank*, *Waiting from Customers*, *Bills Due Soon*), and **1 Money In vs. Out 6-month bar chart**.
3. **Tab 2 — Books Hub (`screen-3-books-hub`):** Groups ALL **10 Bookkeeping Books** into clear left-to-right operational lanes so beginners understand workflow order effortlessly:
   - *Money In:* `Sales Order / Quotes` -> `Sales Invoice` -> `Receipt` -> `Credit Note`
   - *Money Out:* `Purchase Order` -> `Purchase Invoice` -> `Payment` -> `Debit Note`
   - *Adjustments:* `Inventory Adjustment Journal` & `Journal` (`Pro Mode`)
4. **Book Entry Sheet (`screen-4-book-entry-form`):** Interactive book switcher dropdown (`<select>`) across all operational Money In/Out forms with clean paper-receipt fields, `7.5% VAT` checkbox, and a collapsed `Preview automatic Debit & Credit entries v` panel.
5. **Inventory Adjustment & Journal (`screen-5-journal-adjustments`):** 3-pill sub-switcher (`Inventory Adjustment Journal`, `Credit / Debit Note`, `Double-Entry Journal`) pairing IAS 2 physical stock counts (`System Qty` vs `Actual Count`) with an automatic balanced IFRS ledger (`Debits == Credits`).
6. **Tab 3 — People & Stock (`screen-6-directory-create`):** Unified directory tabs (`Customers (48)`, `Vendors / Suppliers (19)`, `Inventory Items (124)`) paired with a live **`Create New Record`** card to add new Customers, Vendors, or Inventory SKUs seamlessly.
7. **Tab 4 — PDF Bank Reconciliation (`screen-7-pdf-bank-reconcile`):** Step 1 **Upload Bank Statement PDF** dropzone (`Zenith, GTBank, Access, UBA`) extracting statement lines, followed by Step 2 split matching cards to **`Confirm Match ✓`** against existing NairaBooks invoices/payments or create unrecorded bank charges.
8. **Tab 5 — Financial Reports & Lists (`screen-8-reports-center`):** Interactive switcher across **Profit & Loss**, **Balance Sheet**, **Cash Flow**, plus **6 Minor Reports & Quick Lists** (*Customer Balances AR Aging*, *Vendor Bills Due AP*, *Inventory Stock & Valuation*, *Sales & 7.5% VAT Summary*, *WHT Deducted Schedule*, *Trial Balance & General Ledger*).

### 1.2 Google Stitch MCP Prototypes (`projects/9422961334487487882`)
| Artifact | Stitch Resource ID | Local HTML Export | Local Screenshot |
| :--- | :--- | :--- | :--- |
| Design System (`NairaBooks Ledger Daylight AA`) | `assets/8475106491343804798` | `design/tokens/nairabooks.tokens.json` | — |
| Screen 1 — Setup Business Type (Simple Onboarding) | `projects/9422961334487487882/screens/da6808cc891e463b98f66c59278cc59a` | `design/stitch/screen-1-setup-business.html` | `design/stitch/screen-1-setup-business.png` |
| Screen 2 — Overview (Zero-Sidebar Top Capsule Nav) | `projects/9422961334487487882/screens/110af3e0c9ed4921b0a640dc624ca6ab` | `design/stitch/screen-2-overview-top-nav.html` | `design/stitch/screen-2-overview-top-nav.png` |
| Screen 3 — Books Hub (All 10 Bookkeeping Books) | `projects/9422961334487487882/screens/eb3aafee39d64e35a12a3e32f2535294` | `design/stitch/screen-3-books-hub.html` | `design/stitch/screen-3-books-hub.png` |
| Screen 4 — Book Entry Sheet (Sales Invoice & Forms) | `projects/9422961334487487882/screens/b7b93e46a12a407abbf703b8c185bc6c` | `design/stitch/screen-4-book-entry-form.html` | `design/stitch/screen-4-book-entry-form.png` |
| Screen 5 — Inventory Adjustment, Notes & Journal | `projects/9422961334487487882/screens/49436549d06249dc9419b9db462a61d0` | `design/stitch/screen-5-journal-adjustments.html` | `design/stitch/screen-5-journal-adjustments.png` |
| Screen 6 — People & Stock (Customers, Vendors, Inventory) | `projects/9422961334487487882/screens/e725aff1d9b14874a68a0a432fe79480` | `design/stitch/screen-6-directory-create.html` | `design/stitch/screen-6-directory-create.png` |
| Screen 7 — Reconcile (PDF Bank Statement Upload & Match) | `projects/9422961334487487882/screens/ed85bfae27554b7b9698e938439c68c6` | `design/stitch/screen-7-pdf-bank-reconcile.html` | `design/stitch/screen-7-pdf-bank-reconcile.png` |
| Screen 8 — Reports (P&L, Balance Sheet, Cash Flow & Lists) | `projects/9422961334487487882/screens/41102921b37e4ac3868946722d583403` | `design/stitch/screen-8-reports-center.html` | `design/stitch/screen-8-reports-center.png` |

---

## 2. Tailwind Design Token Taxonomy (`tailwind-design-system`)

Tokens are structured in three strict layers inside [`design/tokens/nairabooks.tokens.json`](file:///c:/Users/Czernoxx/Documents/emmanuel/ac/design/tokens/nairabooks.tokens.json) and wired into [`design/tailwind.config.ts`](file:///c:/Users/Czernoxx/Documents/emmanuel/ac/design/tailwind.config.ts) + [`design/globals.css`](file:///c:/Users/Czernoxx/Documents/emmanuel/ac/design/globals.css):

1. **Brand Primitives (`brand.*`):**
   - Deep Nigerian Emerald (`#005E34`, `#004424`, `#ECFDF5`), Sovereign Indigo (`#0F4C81`, `#1E3A8A`, `#EFF6FF`), Terracotta Amber (`#B45309`, `#78350F`, `#FEF3C7`), Crimson Alert (`#B91C1C`, `#991B1B`, `#FEF2F2`), Daylight Slate (`#F8FAFC`, `#FFFFFF`, `#0F172A`, `#475569`, `#64748B`).
2. **Semantic Tokens (`semantic.light.*` / `semantic.dark.*` via CSS Variables `--nb-*`):**
   - Light mode (`#F8FAFC` canvas, `#FFFFFF` card surface, `#0F172A` body ink, `#005E34` balanced primary action) and optional `darkMode: 'class'` high-contrast dark surfaces (`#0B1120` canvas, `#111827` surface, `#34D399` emerald CTA with `#022C22` ink).
3. **Typography & Financial Numerals:**
   - Headings: `Plus Jakarta Sans` (`display-lg`, `headline-md`, `headline-sm`).
   - UI / Narrative Copy: `Inter` (`body-md`, `body-sm`).
   - Monetary & Tax Data: `JetBrains Mono` with `font-variant-numeric: tabular-nums` and right alignment (`.nb-money-cell`), preventing vertical misalignment across stacked Naira (`₦`) columns.

---

## 3. Multi-Industry KPI Dashboard Specifications (`kpi-dashboard-design`)

Every NairaBooks KPI screen organizes metrics across a 3-tier decision hierarchy: **Strategic** (Executive Cash, Margin & Tax Compliance), **Tactical** (Industry Pack Margins & Variance), and **Operational** (Daily Reconciliations, Vouchers & Statutory Remittances). All KPI badges pair an icon with explicit text and directional cue (never color alone).

| Reference Pack / Builder | Strategic KPIs (Executive Row) | Tactical KPIs (Pack Telemetry) | Operational Alerts & Drilldown |
| :--- | :--- | :--- | :--- |
| **1. Retail & E-commerce** | Net Cash (`₦`), Gross Margin `%`, Monthly VAT `7.5%` Net Payable | POS vs Bank Settlement Variance (`₦`), Inventory Turnover Days, Card/Transfer Fee Ratio | Unreconciled Paystack/Flutterwave settlements, low-stock SKU alerts, POS Z-report mismatches |
| **2. Wholesale & Distribution** | Working Capital Ratio, Landed Cost Margin `%`, Trade Receivables Aging | Warehouse Margin by Depot, FX Landed Cost Variance (`IAS 21`), Supplier Fill Rate | Overdue distributor credit limits, un-invoiced Goods Received Notes, expiring batch lots |
| **3. Manufacturing (Light / Small Scale)** | COGM per Unit (`₦`), Manufacturing Gross Profit, Capital Allowance Tax Shield | BOM Yield vs Scrap `%`, Work-in-Progress (`WIP`) Cycle Days, Raw Material Variance | Raw material stockouts blocking assembly orders, overhead absorption imbalance |
| **4. Construction & Trades** | Recognized Project Revenue (`IFRS 15`), Job Gross Profit, Unremitted WHT (`2%/5%/10%`) | Budget-vs-Actual Cost by Job Site, Subcontractor Retention (`₦`), Mobilization Balance | Milestones pending Engineer Certificate, unverified subcontractor TIN triggering `2x` WHT alert |
| **5. Professional Services** | Billed Utilization `%`, Realization Rate, CIT Tier (`30%` Standard regardless of `< ₦100M`) | Retainer Burn Rate, WHT Credit Note Offset Balance (`₦`), WIP Unbilled Hours | Unbilled partner/consultant timesheets > 14 days, uncollected WHT credit certificates from FIRS |
| **6. Non-Profit Organizations** | Restricted vs Unrestricted Net Assets, Program Expense Ratio `%`, CIT Exempt Audit Readiness | Grant Budget-vs-Actual Variance by Donor, Donor Tranche Utilization `%` | Expiring donor grant covenants, commingled restricted-fund posting attempts (blocked) |
| **7. Universal Custom / Composable Builder** | Consolidated Multi-Unit EBITDA (`₦`), Aggregate VAT/LIRS Consumption Liability | Domain-composed metrics: **Hotel USALI** (`RevPAR`, `Occupancy %`, `GOP %`), **Diner/Restaurant** (`Food Cost %`, `Table Turn`), **Logistics/Health** | Cross-pack transfer reconciliation (e.g., Central Store BOM -> Hotel Kitchen -> Diner POS) |

---

## 4. Grav Educational Article Illustrations (`article-illustrations`)

Documentation and in-app onboarding tooltips use custom 16:9 **Grav whiteboard marker illustrations** built cleanly with crisp black wobble ink on `#FFFFFF` ground, orange flow arrows (`#F97316`), crimson warning accents (`#DC2626`), cobalt compliance notes (`#2563EB`), zero gradients, and `>= 35%` breathing room:

1. **Illustration 1 — Double-Entry & Effective-Dated Tax Flow:**
   [`design/illustrations/nairabooks-double-entry-flow.jpg`](file:///c:/Users/Czernoxx/Documents/emmanuel/ac/design/illustrations/nairabooks-double-entry-flow.jpg)
   - *Teaches:* How a journal voucher passes through the PostgreSQL `DEBITS = CREDITS` balance guard (blocking unbalanced entries in crimson) before routing cleanly to `WHT 2%/5%/10%`, `VAT 7.5%`, and `FRCN SoVA Report` with `Tax Act 2025 Date Lock`.
   - *Verified Prompt Template (Grav):* `"16:9 pure flat #FFFFFF whiteboard illustration, crisp black hand-drawn wobble marker line art, floating white round character 'Grav' with dot eyes, curved U mouth, bent antenna and hover shadow holding key next to padlock, guarding a balance scale labeled 'DEBITS = CREDITS' between left 'Voucher Input' box and three right output buckets ('WHT 2%/5%/10%', 'VAT 7.5%', 'FRCN SoVA Report') connected by #F97316 orange arrows, with #DC2626 red tilted lever 'UNBALANCED -> BLOCKED' and #2563EB cobalt note 'Tax Act 2025 Date Lock', >=40% white negative space, zero green/purple/yellow, zero gradients or borders."`

2. **Illustration 2 — Composable Layer A + Layer B Industry Pack Architecture:**
   [`design/illustrations/nairabooks-composable-packs.jpg`](file:///c:/Users/Czernoxx/Documents/emmanuel/ac/design/illustrations/nairabooks-composable-packs.jpg)
   - *Teaches:* Why NairaBooks never forks the core Nigerian IFRS & Tax database when a business expands across industries (or operates a hybrid Hotel + Diner + Retail business).
   - *Verified Prompt Template (Grav):* `"16:9 pure flat #FFFFFF whiteboard illustration, clean black hand-drawn marker line art, foundation slab at bottom labeled 'LAYER A: NIGERIAN IFRS & TAX CORE', orange vertical connectors linking modular upper cards 'HOTEL ROOMS (USALI)', 'DINER POS & KITCHEN', and 'RETAIL & WHT JOB PACK', floating 'Grav' character on right snapping in a fourth block labeled 'CUSTOM CAPABILITY' with #2563EB cobalt note 'NO REWRITES', zero green/purple/yellow, >=35% white breathing room."`

---

## 5. WCAG 2.2 Level AA Accessibility Audit (`wcag-audit-patterns` & `accessibility-compliance-accessibility-audit`)

### 5.1 Programmatic Contrast & Token Verification
All `18` light and dark semantic token pairs defined in `design/tokens/nairabooks.tokens.json` are mathematically verified on every test run via `tests/test_design_system.py` against W3C WCAG 2.2 luminance contrast thresholds (`>= 4.5:1` for text, `>= 3.0:1` for interactive input borders and `:focus-visible` outlines). Key daylight anchors:
- `#FFFFFF` on `#005E34` (`primary` CTA): **`7.92:1`** (passes AA & AAA)
- `#FFFFFF` on `#0F4C81` (`secondary` compliance badge): **`8.86:1`**
- `#78350F` on `#FEF3C7` (`warningSoft` statutory banner): **`~9.1:1`**
- `#005E34` (`focusRing`) & `#64748B` (`borderInteractive`) on `#FFFFFF`: both **`>= 4.7:1`** (exceeds WCAG 1.4.11 Non-Text Contrast `3.0:1`).

### 5.2 Audit of Raw Stitch Prototypes & Zero-Sidebar Workflow Resolution Status
Direct DOM and PNG visual inspection across all 8 Stitch prototypes verified zero `<aside>` sidebars, single `<h1>` landmarks, and accessibility controls (`A11Y-01`..`A11Y-05`). Noticeably, raw exports for Screens 3–8 initially wrapped `People & Stock` onto 3 lines and `+ New Entry` onto 2 lines inside the top pill bar and crowded date/select icons (`Screen 4`, `Screen 5`); those HTML templates were hardened in-place with a unified single-line `whitespace-nowrap` capsule header and `pr-9/pr-10` padding, leaving dynamic React cell bindings tracked cleanly for Phase 6:

| Finding ID | Screen Observed | Defect Description & Overhaul Resolution | WCAG / UX Criterion | Phase 6 Production Component Guard |
| :--- | :--- | :--- | :--- | :--- |
| `A11Y-01` | Screens 1–8 | Initial HTML lacked skip link; **resolved across all 8 active screens** (`skip=True` verified). | `2.4.1 Bypass Blocks` | Render `.nb-skip-link` (`<a href="#main-content">Skip to main content</a>`) inside root Next.js layout. |
| `A11Y-02` | Screens 1–8 | Initial exports lacked `<h1>`; **resolved across all 8 active screens** (`h1=1`, zero `<aside>` sidebars verified). | `1.3.1` / `2.4.6` | Enforce single `<h1>` per page inside `<main id="main-content">` and zero-sidebar floating top capsule nav. |
| `A11Y-03` | Screens 4, 5, 6, 8 | **Partially resolved:** semantic `scope="col"` / `scope="row"` headers exist across tabular sheets (`5, 6, 8`), while dynamic line inputs in live React need unique per-row `aria-label` bindings (`Line 2 Debit amount NGN`). | `1.3.1` / `3.3.2` | Bind every dynamic form row input (`Book Entry`, `Inventory Adj`, `Journal`, `Quick Create`) with explicit `<label>` / `aria-label` attributes. |
| `A11Y-04` | Screens 1–8 | Floating `fixed bottom-0` overlays removed, top pill navigation wrapped items fixed with `whitespace-nowrap`, mobile pill strip added below `md`, and icon inputs given `pr-9/pr-10` clearance (`Screen 4`, `Screen 5`). | `1.4.10` / `2.4.11` | Preserve `whitespace-nowrap` on pill dock links, natural flow action footers, and responsive `overflow-x-auto` tables. |
| `A11Y-05` | Screens 4, 5, 6, 8 | Interactive `<select>` Book Switcher, 3-pill adjustment switcher, Customers/Vendors/Inventory live directory tabs, PDF file picker, and Statement cards (`P&L` / `Balance Sheet` / `Cash Flow`) verified interactively with `aria-live="polite"` balance announcements in Phase 6. | `1.4.10` / `4.1.3` | Wire `aria-live="polite"` updates on balance totals, PDF parse status, and report statement switches. |

---

## 6. Screen Reader Testing Protocol (`screen-reader-testing`)

All Phase 6–8 interactive templates (Onboarding Stepper, KPI Command Center, Balanced Voucher Grid, and Tax Vault) must pass scripted manual & Playwright accessibility-tree checks across the priority Assistive Technology matrix before release:

| Priority | Screen Reader + Browser | OS Platform | Critical NairaBooks Scenarios Verified |
| :--- | :--- | :--- | :--- |
| **P0** | **NVDA + Firefox** | Windows | Table navigation (`Ctrl+Alt+Arrows`) across multi-row Naira (`₦`) ledger with `scope="col"` announcement; Voucher `aria-live="polite"` balance variance changes (`Out of balance ₦50,000` -> `Balanced ₦0.00`). |
| **P0** | **VoiceOver + Safari** | macOS | Landmark rotor (`Cmd+Opt+U` Headings & Landmarks): verify single `<h1>`, `Skip to main` focus jump, Pack Builder capability toggle state (`pressed` / `checked`), and TIN unverified `2x WHT` error description via `aria-describedby`. |
| **P1** | **JAWS + Chrome** | Windows | Forms mode inside Voucher inline table: every Debit, Credit, WHT pill, and Account `<select>` announces row context (`Line 2, Credit Naira amount`) cleanly. |
| **P1** | **VoiceOver + Safari / TalkBack + Chrome** | iOS / Android | Responsive Reflow (`375px` mobile): horizontal swipe through scrollable voucher table without trap, minimum `44×44px` tap targets on Pack selection cards & POS/voucher controls. |

---

## 7. Complete App Page-by-Page Design Roadmap (Phase 5 Re-Entry — All 10 Pages)

To ensure every screen matches the Google Stitch **Daylight AA** craftsmanship, Nigerian business identity, accessibility rules, and smooth interactivity sequentially (`one page at a time`), all **10** NairaBooks pages are tracked below:

| Order | Page / Screen Group | Route(s) | Status | Stitch / Phase 5 Spec Highlights |
| :--- | :--- | :--- | :--- | :--- |
| **1** | **Public Landing Page** | `/` | **[x] Complete (Custom `shadcn/ui` Editorial Fintech + Plain-English Copy)** | [`LandingPageClient.tsx`](file:///c:/Users/Czernoxx/Documents/emmanuel/ac/web/src/components/LandingPageClient.tsx), [`web/src/components/landing/`](file:///c:/Users/Czernoxx/Documents/emmanuel/ac/web/src/components/landing/ProductPreviewWindow.tsx) (`ProductPreviewWindow`, `CashflowStorySection`, `SectorAndFaqSections`), customized [`web/src/components/ui/`](file:///c:/Users/Czernoxx/Documents/emmanuel/ac/web/src/components/ui/button.tsx), [`app/page.tsx`](file:///c:/Users/Czernoxx/Documents/emmanuel/ac/web/src/app/page.tsx) (clear Nigerian SEO + `FAQPage` JSON-LD), & [`design/DESIGN.md`](file:///c:/Users/Czernoxx/Documents/emmanuel/ac/design/DESIGN.md) v3: Warm Cream (`#FAF9F6`) + Porcelain White (`#FFFFFF`) + Nigerian Emerald (`#006838`); interactive App Window (`Plain English` ↔ `Accountant View` toggle, 3D depth tilt, animated `₦` counter, Receipt `Dialog`), animated sale-split proportion bar & Q1–Q4 chart, 6 Nigerian sector tabs, comparison table, 4 concise FAQs, `0` `axe-core` violations. |
| **2** | **Overview Workspace** | `/overview` | **[x] Complete (Minimalist Cupertino Financial Health Dashboard)** | Streamlined [`OverviewLandingClient.tsx`](file:///c:/Users/Czernoxx/Documents/emmanuel/ac/web/src/components/OverviewLandingClient.tsx) around 4 top KPIs (`Cash on Hand`, `Net Income` + trend badge, `Total Receivables`, `Total Payables`), 2 center visuals (`Cash Flow Trend` + `Top Expense Categories`), bottom actionable alerts (`Unreconciled Transactions` + 3 oldest `Overdue Invoices` with reminder trigger), and a unified global date filter (`This Month` \| `This Quarter` \| `Year to Date`). |
| **3** | **Auth & Onboarding** | `/login`, `/signup` | **[x] Complete (Cupertino iOS Minimalist Sign-In + 4-Step Company Wizard)** | Minimalist centered `/login` ([`web/src/app/login/page.tsx`](file:///c:/Users/Czernoxx/Documents/emmanuel/ac/web/src/app/login/page.tsx), [`LoginWorkspace.tsx`](file:///c:/Users/Czernoxx/Documents/emmanuel/ac/web/src/components/LoginWorkspace.tsx)) with password reveal, collapsible 5-role demo drawer, and full-screen sign-in handoff + 4-step `/signup` wizard ([`SignupWorkspace.tsx`](file:///c:/Users/Czernoxx/Documents/emmanuel/ac/web/src/components/SignupWorkspace.tsx)) with 28–33 IFRS Chart of Accounts & Nigeria Tax Act 2025 classifier. |
| **3B** | **Transactions Hub & Create/Edit Sheets** | `/transactions`, `/transactions/[type]/new`, `/transactions/[type]/[id]` | **[x] Complete (6 Pillars, 27 Sage-Inspired Types, Animated Cupertino Forms)** | [`TransactionsHubWorkspace.tsx`](file:///c:/Users/Czernoxx/Documents/emmanuel/ac/web/src/components/TransactionsHubWorkspace.tsx), [`TransactionRecordEditorWorkspace.tsx`](file:///c:/Users/Czernoxx/Documents/emmanuel/ac/web/src/components/transactions/TransactionRecordEditorWorkspace.tsx), [`TransactionEditorLayouts.tsx`](file:///c:/Users/Czernoxx/Documents/emmanuel/ac/web/src/components/transactions/TransactionEditorLayouts.tsx), & [`TransactionIconBadge.tsx`](file:///c:/Users/Czernoxx/Documents/emmanuel/ac/web/src/components/transactions/TransactionIconBadge.tsx): top-navbar `Transactions` tab, animated squircle icons, `All 27 Types` quick launcher, outline register, creation-only `Simple Creation \| Full Creation` toggle, and edit-locked Full Mode with tailored line-item, settlement, payroll, journal & IAS 2 stock editors (`0` `axe-core` violations). |
| **4** | **Books & Journal Composer** | `/books/journal` | `[ ] Pending` | Stitch Screens 3, 4 & 5: Books Hub selector, Sales/Expense entry sheet, and Inventory/Journal Voucher composer polish. |
| **5** | **People, Stock & Sector Operations** | `/operations` | `[ ] Pending` | Stitch Screen 6: Customer/Vendor/Inventory directories + 6 Flagship Industry Workbooks (`Retail`, `Wholesale`, `Manufacturing`, `Construction`, `Services`, `NGO`). |
| **6** | **Nigeria Tax Act 2025 Center** | `/tax` | `[ ] Pending` | `0%` Small-Company CIT (`<= ₦100M`), WHT `2%/5%/10%` & No-TIN `2x` guard, NRS VAT `7.5%`, and Lagos hospitality levies. |
| **7** | **Composable Industry Pack Store** | `/packs` | `[ ] Pending` | Stitch Screen 1 extension: snap modules (Hotel USALI + Diner POS + Retail) onto immutable Layer A ledger. |
| **8** | **Bank PDF & FX Reconciliation** | `/reconcile` | `[ ] Pending` | Stitch Screen 7: Zenith/GTBank/Access PDF parsing, Paystack Net-of-MDR matching, and IAS 21 FX revaluation. |
| **9** | **FRCN IFRS Reports Center** | `/reports` | `[ ] Pending` | Stitch Screen 8: Statement of Financial Position, P&L, Cash Flows, Statement of Value Added & 5-Year Financial Summary. |
| **10** | **CAMA Sec 405 & RBAC Security** | `/security` | `[ ] Pending` | 5-role matrix, Segregation of Duties fiscal period certification, and tamper-evident SHA-256 audit log viewer. |
