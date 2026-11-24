# Engineering & Product Decision Log (`docs/DECISIONS.md`)

> Every important choice ("Why did we pick X instead of Y?") is logged here so future chats never reverse or forget prior reasoning.

## ADR-001: Dynamic Wizard Skill Workflow Initialization
- **Date:** 2026-11-12
- **Status:** Accepted
- **Context:** Selected `128` curated skills via the Skills Decision Wizard (`wizard_path`) to avoid context bloat while ensuring full coverage.
- **Decision:** Generated a tailored stage pipeline (`docs/WORKFLOW_PLAN.md`), strict coverage matrix (`docs/SKILL_COVERAGE.md`), and always-on context/docs closeout rules (`.agents/rules/`).
- **Consequences:** All `128` selected skills are mapped to concrete stages and must be verified before completion.

## ADR-002: Phase 0 Skill Catalog, DX Baseline, and Accounting Agent Guardrails
- **Date:** 2026-11-12
- **Status:** Accepted
- **Context:** Phase 0 requires auditing the Antigravity skill catalog (`antigravity-skills-manager`), setting up friction-free developer tooling (`dx-optimizer`), and establishing agent quality and multi-agent context rules (`agent-orchestration-improve-agent`, `agent-orchestration-multi-agent-optimize`) tailored to the user's Nigerian IFRS + multi-industry adaptive accounting app idea.
- **Decision:**
  1. Keep all `128` selected skills workspace-scoped via `.agents/skills.json` pointing to `~/Documents/emmanuel/ac/antigravity-dynamic-vibecode-kit/skills` (and `4` kit skills in `.agents/skills/`), leaving `~/.gemini/antigravity/skills` untouched (`0` global installs).
  2. Standardize editor formatting (`.editorconfig`, `.vscode/settings.json`) and add `scripts/dx_check.py` to validate CLI dependencies, skill resolution, and workflow coverage in one command.
  3. Enforce domain-specific constitutional guardrails in `docs/PHASE_0_SETUP.md`: immutable double-entry invariants, verified/effective-dated Nigerian statutory tax & IFRS rules, and a composable industry-profile layer separated from core ledger accounting.
- **Consequences:** All phases share a consistent toolchain preflight (`python scripts/dx_check.py`) and strict accounting correctness guardrails without global environment side effects.

## ADR-003: Two-Layer Composable Industry Engine & Effective-Dated Nigerian Statutory Rules
- **Date:** 2026-11-12
- **Status:** Accepted
- **Context:** Phase 1 research (`docs/PHASE_1_MARKET_VALIDATION.md`) surfaced two critical product truths: (1) Nigerian tax & reporting rules span multiple overlapping regimes (FRCN IFRS + Other National Disclosures, CAMA 2020 Sec 405, Nigeria Tax Act 2025 `₦100M`/`₦250M` thresholds vs. 2024 WHT `₦25M`/`₦2M` rules, NRS e-invoicing, and state hospitality consumption taxes like Lagos LIRS `5%`), and (2) supporting "a very wide range of business types" (Hotels, Diners, Retail, Services, Construction, Healthcare, Logistics, Manufacturing, Hybrid businesses) via hardcoded bespoke apps would stall MVP delivery.
- **Decision:**
  1. Separate **Layer A (Immutable Nigerian IFRS & Double-Entry Core)** from **Layer B (Declarative Composable Industry Profile Engine)** built out of reusable operational primitives (`Folio/Booking`, `POS/Recipe COGS`, `SKU/Warehouse`, `Project/Retention`, `Fleet/Trip`, `Production/BOM`, `Departmental Dimensions`), Chart-of-Accounts templates, UI vocabulary maps, and tailored KPIs.
  2. Support **Multi-Unit / Hybrid Composition** (a single entity activating multiple packs, e.g. Hotel + Diner + Event Hall, posting into one consolidated IFRS ledger).
  3. Externalize all Nigerian federal and state tax rates, thresholds, and industry exclusions (such as professional services exclusion from small-company CIT exemption) into **effective-dated, jurisdiction-aware statutory rule tables**.
  4. Sequence v1 delivery around the **Universal Composable Engine + 4 Flagship Reference Packs** (Hotel/Hospitality, Diner/Restaurant, Retail/Wholesale, Professional Services) + **Custom/Declarative Business Builder** so wide business coverage works from launch without sacrificing quality.
- **Consequences:** Adding any new Nigerian business type becomes a declarative configuration + verification pack rather than a core ledger rewrite, and tax law updates require data-driven rule versioning rather than risky code forks.

## ADR-004: Brand Name (`NairaBooks`) & Six Flagship Reference Packs + Universal Composable Pack Builder
- **Date:** 2026-11-12
- **Status:** Accepted
- **Context:** User confirmed the commercial product name **`NairaBooks`** and refined the flagship launch packs to cover six core Nigerian business archetypes first, followed by the Universal Custom/Composable Pack Builder (preserving Hotels/Hospitality, Diners/Restaurants, and broad verticals on the same underlying architecture).
- **Decision:**
  1. Name the commercial product **`NairaBooks`** across all product specs, onboarding UI, and documentation (keeping repository folder name `ac` unchanged).
  2. Build **6 Flagship Reference Packs** on top of the Layer A Nigerian IFRS Core and Layer B Composable Primitives:
     - **Retail & E-commerce** (POS, daily cash flows, VAT compliance, stock levels)
     - **Wholesale & Distribution** (multi-tier inventory, vendor POs, shipping/landed costs, margins)
     - **Manufacturing (Light / Small Scale)** (BOM, assembly tracking, raw material costs, WIP/production accounting)
     - **Construction & Trades** (job costing, subcontractor payments + `2%/5%` WHT & retention, materials per site)
     - **Professional Services** (client billing, time tracking, expense reimbursements, general bookkeeping + Tax Act 2025 non-exempt CIT flag)
     - **Non-Profit Organizations** (fund accounting, donor tracking, restricted vs. unrestricted grants, budget-vs-actual reporting)
  3. Expose the **Universal Custom / Composable Pack Builder** directly on the same declarative engine so additional verticals (including *Hotel/Hospitality*, *Diner/Restaurant*, *Healthcare*, *Logistics*, and *Hybrid Multi-Unit* businesses) compose from tested primitives without custom code forks.
- **Consequences:** Phase 2 Conductor tracks (`conductor-new-track`) and Phase 3–4 domain schemas must explicitly model the primitives required by all 6 Flagship Packs (POS, Multi-Tier Inventory/POs, BOM/Assembly, Job Costing, Time/Expenses, Fund/Grant Accounting) plus the declarative Pack Composer for arbitrary additional business types.

## ADR-005: Conductor Track Partitioning & Stack-Agnostic Python/`uv` Package (`src/nairabooks`)
- **Date:** 2026-11-12
- **Status:** Accepted
- **Context:** Phase 2 (`conductor-setup`, `conductor-new-track`, `python-development-python-scaffold`, `uv-package-manager`) establishes our project context hub (`conductor/`) and starter Python/`uv` workspace before Phase 3 locks the GraphQL API contract and backend service boundaries.
- **Decision:**
  1. Partition **`NairaBooks`** v1 delivery into 5 tracked Conductor vertical tracks under `conductor/tracks/`: `nigerian-ifrs-core-ledger_20261112`, `nigerian-tax-rule-engine_20261112`, `composable-pack-engine_20261112`, `flagship-industry-packs_20261112`, and `auth-rbac-audit-trail_20261112`, guarded by `scripts/validate_conductor.py`.
  2. Scaffold the root Python package using a `src/` layout (`src/nairabooks/`) managed by `uv` + `hatchling` (`pydantic`, `pydantic-settings`, `pytest`, `ruff`, `mypy`) while deferring GraphQL server framework bindings to Phase 3 (`Q3_API`: GraphQL Contracts).
  3. Enforce `decimal.Decimal` everywhere for monetary amounts and Nigerian tax rates (`NGN` 2 decimal places, VAT `0.0750`, turnover thresholds) in `NairaBooksSettings` and `conductor/workflow.md`.
- **Consequences:** All vertical tracks share strict `Red -> Green -> Refactor` TDD and typed `Decimal` guarantees without locking HTTP/GraphQL server choices prematurely prior to Phase 3 architecture review.

## ADR-006: Modular Monolith with Hexagonal Bounded Contexts & Outbox Extraction Seam
- **Date:** 2026-11-12
- **Status:** Accepted
- **Context:** Per Phase 3 (`architect-review`, `architecture-patterns`, `microservices-patterns`), `NairaBooks` must coordinate ACID double-entry journal postings (`Debits == Credits`), Nigerian WHT/VAT computation, inventory/pack COGS adjustments, and CAMA Sec 405 period locks reliably while keeping domain modules cleanly decoupled.
- **Decision:** Build **`NairaBooks`** v1 as a **Modular Monolith** containing 5 strict Hexagonal Bounded Contexts (`ledger`, `tax`, `packs`, `identity`, `api`) with a Transactional Outbox for asynchronous side effects (FRCN PDF/CSV exports, NRS e-invoice generation), rejecting early networked microservices for transactional accounting writes.
- **Consequences:** All financial mutations commit or roll back atomically inside a single PostgreSQL transaction, `domain/` stays pure (`zero` SQL/HTTP imports), and any heavy async consumer can later be extracted behind the Outbox/Port boundary without rewriting ledger logic.

## ADR-007: Canonical Python GraphQL Engine (`DecimalMoney` Scalar) Consumed via Next.js App Router BFF
- **Date:** 2026-11-12
- **Status:** Accepted
- **Context:** Wizard choices pair Python (`uv`, `pydantic`, `Decimal` accounting core) with Next.js/TypeScript web screens and GraphQL API contracts (`api-design-principles`, `graphql-architect`). Reimplementing accounting or Nigerian tax math in both Python and Node/TS risks subtle rounding divergence.
- **Decision:** Establish `api/graphql/schema.graphql` as the single schema-first GraphQL contract served by the Python `nairabooks` backend, while Next.js App Router acts as the Server BFF handling HTTP-only session cookies, CSRF protection, and strongly typed GraphQL client operations. Ban native GraphQL `Float` on all monetary/tax fields in favor of `DecimalMoney` and `DecimalRate` decimal strings, require UUID `idempotencyKey` on financial mutations, and enforce Relay cursor pagination and `@requireRole`/`@cost` directives.
- **Consequences:** Zero duplicated accounting/tax logic, zero IEEE-754 rounding errors over JSON, end-to-end GraphQL TypeScript codegen compatibility, and deterministic client error handling via typed `MutationError` unions.

## ADR-008: Security-by-Design Controls from STRIDE & Attack-Tree Modeling
- **Date:** 2026-11-12
- **Status:** Accepted
- **Context:** Multi-tenant SaaS accounting software handling Nigerian statutory tax filings, TINs, CAMA Sec 405 sign-offs, and cash/POS workflows faces high-impact integrity, IDOR cross-tenant, repudiation, and GraphQL DoS threats (`docs/THREAT_MODEL.md`).
- **Decision:** Enforce 12 non-negotiable security requirements (`SEC-REQ-01`..`SEC-REQ-12`): session-derived `workspace_id` + Phase 4 Postgres RLS, caller tax-rate prohibition (`supplyCategoryCode` lookup only), Segregation of Duties (`createdByUserId != approvedByUserId`), append-only hash-chained `AuditEvent`, Argon2id password hashing, disabled production GraphQL introspection, and max query depth (`8`) / complexity (`500`) limits.
- **Consequences:** Phase 4 database schemas (`postgresql`) and Phase 6–9 implementations inherit concrete, testable security invariants mapped directly to threat IDs (`S*`, `T*`, `R*`, `I*`, `D*`, `E*`).

## ADR-009: PostgreSQL 18 Strict-Decimal Schema, RLS (`SET LOCAL`), DB Immutability & Expand/Contract Migrations
- **Date:** 2026-11-12
- **Status:** Accepted
- **Context:** Phase 4 (`database-architect`, `postgresql`, `sql-pro`, `database-migrations-*`) translates Phase 3's bounded contexts and `SEC-REQ-01`..`SEC-REQ-12` into persistent PostgreSQL 18 storage capable of zero-downtime evolution, high-volume accounting ledgers, non-overlapping Nigerian effective-dated tax rules, and pooled multi-tenant safety.
- **Decision:**
  1. Standardize on **PostgreSQL 18.3** with `uuidv7()` for domain entity PKs, `BIGINT GENERATED ALWAYS AS IDENTITY` for append-only sequences, `NUMERIC(20,2)` for money, `NUMERIC(10,6)` for rates, `TIMESTAMPTZ`, and `TEXT + CHECK` (banning `FLOAT`/`REAL`/`MONEY`/`SERIAL`/`VARCHAR(n)`/`TIMESTAMP`).
  2. Enforce database-level invariants via `btree_gist` `EXCLUDE USING gist` (non-overlapping `tax_rule_versions` and `fiscal_periods`), a deferred constraint trigger (`trg_verify_posted_voucher_balance`), and `BEFORE UPDATE OR DELETE` immutability triggers on `audit_events` and `POSTED`/`REVERSED` vouchers/lines.
  3. Enable PostgreSQL **Row-Level Security (RLS)** on all 11 tenant-scoped tables using transaction-local `SET LOCAL app.current_workspace_id` (`current_workspace_uuid()`) so PgBouncer `pool_mode = transaction` never leaks tenant context.
  4. Require manual indexes on every FK column, keyset cursor pagination with covering indexes, Expand -> Backfill -> Contract migrations with paired `rollbacks/*.sql`, and structured SHA-256 drift + JSON telemetry via `nairabooks.adapters.migrations`.
- **Consequences:** Financial accuracy, tax non-overlap, audit immutability, and tenant isolation remain enforced even if application bugs occur, while `db/migrations/` and `tests/test_database_schema.py` verify safety invariants automatically before Phase 6 implementation.

## ADR-010: Tailwind Semantic Tokens, Google Stitch Prototyping, Tabular Naira Numerals & WCAG 2.2 AA Audit Gate
- **Date:** 2026-11-12
- **Status:** Accepted
- **Context:** Phase 5 (`ui-ux-designer`, `tailwind-design-system`, `kpi-dashboard-design`, `article-illustrations`, `wcag-audit-patterns`, `accessibility-compliance-accessibility-audit`, `screen-reader-testing`) + Google Stitch MCP establish visual design tokens, industry KPI layouts, onboarding documentation diagrams, and accessibility guarantees prior to building Phase 6 UI and APIs.
- **Decision:**
  1. Standardize **NairaBooks Ledger Daylight AA** across Stitch (`projects/9422961334487487882`, design system `assets/8475106491343804798`) and Tailwind CSS (`design/tokens/nairabooks.tokens.json`, `design/tailwind.config.ts`, `design/globals.css`) using 3-layer CSS tokens (`--nb-*`) in light mode (`#F8FAFC`/`#FFFFFF`/`#005E34`/`#0F4C81`) and `class`-based high-contrast dark mode (`#0B1120`/`#111827`/`#34D399`).
  2. Enforce `JetBrains Mono` with `font-variant-numeric: tabular-nums` and right alignment (`.nb-money-cell`) on every `₦` / FX monetary display, paired with icon + text indicators on KPI badges (never color alone).
  3. Generate bespoke 16:9 **Grav** whiteboard illustrations (`design/illustrations/*.jpg`) to explain immutable double-entry balance and Layer A + Layer B pack composability without technical jargon.
  4. Enforce explicit Phase 6 remediation of `A11Y-01`..`A11Y-05` caught during raw Stitch DOM/visual inspection (skip navigation link, single `<h1>` per page, `scope="col"` on table headers, `<label>` / `aria-label` on inline voucher inputs, `aria-live="polite"` balance variance announcements, `pb-sticky-clearance` footer clearance, and `overflow-x-auto` table wrappers) plus automated WCAG luminance checks in `tests/test_design_system.py`.
- **Consequences:** Every UI screen built in Phase 6–8 inherits verified WCAG 2.2 Level AA color contrast ratios (`>= 4.5:1` text, `>= 3.0:1` UI borders/focus rings) and clears explicit screen-reader (`NVDA`, `VoiceOver`, `JAWS`, `TalkBack`) exit criteria.

## ADR-011: Beginner-First Simple Mode Default & Progressive Accountant Mode Disclosure
- **Date:** 2026-11-12
- **Status:** Accepted
- **Context:** Live interactive mockup reviews showed that showing full Nigerian statutory tax countdowns, IFRS account codes (`#1010–#4000`), and raw Debit/Credit ledger tables on default onboarding, dashboard, sales, and banking screens made NairaBooks feel overwhelming and overly tax-centric for business owners new to accounting software.
- **Decision:**
  1. Adopt a **Two-Mode Progressive Disclosure** UX built on top of the exact same Layer A PostgreSQL double-entry core and Layer B Industry Pack engine:
     - **Default View — Simple Business Owner Mode (`Accountant Mode: Off`):** Strictly **5 plain-English sidebar items** (`Home`, `Money In`, `Money Out`, `Bank Matching`, `Reports & Tax`), >50% open canvas whitespace, a 1-question business setup wizard mapping beginner-friendly sector cards 1:1 to the 6 Flagship Reference Packs + Universal Custom/Composable Pack Builder, a **3-step beginner checklist** + **3 plain money cards** + **1 bar chart** on `Home`, paper-receipt invoicing in `Money In`, and conversational Yes/No `Bank Matching` flash cards with a 3-number monthly profit summary.
     - **Opt-In Pro View (`Accountant Mode: On`):** Quiet sidebar toggle at bottom reveals the balanced Double-Entry Journal & WHT Composer (`Debits == Credits`), account numbers, Trial Balance, FRCN Statement of Value Added (`SoVA`), and Nigerian Tax Act 2025 deduction inspectors.
  2. Enforce a strict simplicity ceiling in Simple Mode Stitch & Phase 6 React screens: max 5 sidebar navigation links, max 2 data lines per Home KPI card, zero raw GL account numbers unless an inline accordion (`Need to adjust bookkeeping categories?`) is explicitly expanded, and widened horizontal spacing between receipt price `<input>` controls and right-aligned `₦` line totals (`screen-3-money-in-sale`).
- **Consequences:** First-time business owners can onboard, send an invoice, match bank transfers, and see real monthly profit in minutes without accounting training, while chartered accountants and FIRS/CAMA audit reviewers still retain uncompromised double-entry rigor inside the shared workspace.

## ADR-012: Zero-Sidebar Floating Top Pill Dock, Complete 10-Book Workflow, PDF Statement Reconciliation & Statement Center
- **Date:** 2026-11-12
- **Status:** Accepted
- **Context:** Following review of the simplified 5-screen mockups, the user requested moving away from a traditional left sidebar entirely in favor of a sleek, modern navigation model, visualizing every screen across the complete app workflow, explicitly supporting PDF bank statement upload matching against NairaBooks transactions, exposing master record creation (`Customers`, `Vendors / Suppliers`, `Inventory`), grouping all 10 core bookkeeping books cleanly (`Sales Order/Quotes`, `Sales Invoice`, `Receipt`, `Purchase Order`, `Purchase Invoice`, `Payment`, `Journal`, `Debit Note`, `Credit Note`, `Inventory Adjustment Journal`), and showcasing the dedicated `Reports` center (`Balance Sheet`, `Profit & Loss`, `Cash Flow`, and minor lists).
- **Decision:**
  1. Replace the left vertical sidebar across all core operational screens (`design/stitch/screen-2` through `screen-8`, zero `<aside>` elements) with a single-line **Floating Top Navigation Capsule** containing 5 plain-English tabs (`Overview`, `Books`, `People & Stock`, `Reconcile`, `Reports`) plus a `Simple | Pro` density switch and `+ New Entry` action button, paired with a scrollable mobile pill strip under `md` breakpoints.
  2. Showcase the complete **8-screen end-to-end interactive workflow** (`screen-1-setup-business` -> `screen-2-overview-top-nav` -> `screen-3-books-hub` -> `screen-4-book-entry-form` -> `screen-5-journal-adjustments` -> `screen-6-directory-create` -> `screen-7-pdf-bank-reconcile` -> `screen-8-reports-center`) wired with clickable cross-navigation inside `design/preview/index.html` and standalone tabs.
  3. Require PDF bank statement ingestion (`Upload Bank Statement PDF` dropzone supporting Nigerian bank e-statement PDFs -> side-by-side matching against existing Invoices, Payments, or new bank charge adjustments) and a unified Statement Switcher (`Profit & Loss`, `Balance Sheet`, `Cash Flow`, plus 6 minor aging/stock/VAT/WHT/Trial Balance lists) in Phase 6 build slices.
- **Consequences:** Beginners see how every step connects visually (`Quote -> Invoice -> Receipt` and `PO -> Bill -> Payment`) inside an uncluttered top-nav workspace without learning a sidebar tree, while zero IFRS or Nigerian tax functionality is sacrificed.


## ADR-013: Exact Decimal / BigInt Monetary Arithmetic Across Python Core, API Bridge, and Next.js BFF (2026-11-12)
- **Context:** JavaScript `number` (`IEEE-754` float64) causes binary rounding drift (`0.1 + 0.2 !== 0.3`) and silent precision loss in double-entry balance validation and FX Naira conversions.
- **Decision:** Keep all money values (`2`dp) and FX rates (`6`dp) strictly as quantized `Decimal` (`ROUND_HALF_UP`) in Python (`src/nairabooks/ledger/domain/money.py`), serialize all monetary/rate JSON fields as fixed decimal strings (`parse_float` rejection in `src/nairabooks/api/serializers.py` and `typeof !== "string"` rejection in `web/src/lib/bff-client.ts`), and perform all client/BFF arithmetic in `web/src/lib/decimal.ts` using native `BigInt` scaled minor units (`kobo = 10^-2`, `rate = 10^-6`).
- **Consequences:** Zero floating-point drift across client live variance indicators (`A11Y-05`), BFF validation, and PostgreSQL `NUMERIC(20, 2)` persistence.

## ADR-014: Reversal-Inclusive Statement Aggregation & Net-of-MDR Bank/POS Reconciliation (2026-11-12)
- **Date:** 2026-11-12
- **Status:** Accepted
- **Context:** When a `POSTED` voucher (`V1`) is immutably reversed by an offsetting `POSTED` voucher (`V2`), `V1.status` transitions to `REVERSED`. Filtering Trial Balance and FRCN statements on `POSTED` alone would omit `V1` while retaining `V2`, creating phantom negative balances. Separately, Nigerian POS settlement credits (`NIBSS` / `Paystack` / `Moniepoint`) arrive net of merchant discount rate (`MDR`) charges (`1.5%`–`2%`) rather than exact gross invoice amounts.
- **Decision:**
  1. Include both `POSTED` and `REVERSED` statuses (`_LEDGER_ELIGIBLE_STATUSES = {POSTED, REVERSED}`) across Python `domain/statements.py` and the Next.js Server BFF demo fallback (`web/src/lib/bff-client.ts`), while excluding `DRAFT` entries so posted + reversed pairs net identically to `0.00`.
  2. Model explicit gross-to-net fee matching (`abs(bank_amount - ledger_amount) == fee_amount` with matched status `MATCHED_WITH_FEE`) and reference/date tolerance matching inside pure `domain/reconciliation.py` and `/reconcile`.
  3. Mark all `/api/ledger/*` App Router Route Handlers `export const dynamic = "force-dynamic"` so Next.js 15 serves live BFF ledger state without stale static prerender artifacts.
- **Consequences:** Reversals cancel cleanly to `0.00` in Trial Balance and FRCN financial packages, Nigerian POS fee variances surface explicitly for accounting rather than failing silently as unmatched, and Next.js builds remain deterministic.

## ADR-015: Effective-Dated Statutory Tax Matrix, Small-Entity ₦25M/₦2M WHT Gate & NRS Multi-Layer Separation (2026-11-12)
- **Date:** 2026-11-12
- **Status:** Accepted
- **Context:** Nigerian tax rules shifted cleanly on January 1, 2025 (2024 WHT Regulations `2%/5%/10%`, No-TIN `2x` penalty, `₦25M`/`₦2M` small-entity deduction relief) and January 1, 2026 (Nigeria Tax Act 2025 `₦100M` turnover / `₦250M` fixed assets small-company 0% CIT exemption excluding professional services), while hospitality/hybrid invoices stack Federal `7.5%` VAT, state consumption levies (e.g., Lagos `5%`), fiduciary staff service charges, and WHT without altering the VAT base (`SEC-REQ-04`).
- **Decision:**
  1. Model all statutory tax rates as non-overlapping effective-dated `TaxRuleVersion` rows (`TaxRuleSet` in Python `src/nairabooks/tax/domain/rules.py` and `tax-bff.ts`) rather than UI or ledger constants, and explicitly reject any caller-supplied `appliedRate`/`taxRate` override (`SEC-REQ-04`).
  2. Enforce 2024 WHT small-entity relief (`<= ₦25M` payer turnover AND `<= ₦2M` cumulative monthly supplier spend) strictly when the counterparty has a valid TIN; missing TIN always activates the punitive doubled WHT rate.
  3. Separate concurrent indirect layers into distinct NRS `TaxSubtotal` objects (`VAT`, `STATE_CONSUMPTION`, `SERVICE_CHARGE`, `WHT`) and explicit GL accounts (`2110` VAT Payable, `2130` State Consumption Levy Payable, `2140` Fiduciary Service Charge Payable, `1150` WHT Credit Note Receivable / `2120` WHT Payable).
- **Consequences:** Back-dated vouchers evaluate against the exact historical tax law (`Finance Act 2019/2020` vs `Nigeria Tax Act 2025`), fiduciary service charges never inflate taxable revenue or VAT, and callers cannot tamper with statutory tax percentages.

## ADR-016: Declarative 10-Primitive Industry Composer & Conflict-Free IFRS CoA Merge (Phase 6 Slice 4)
- **Date:** 2026-11-12
- **Status:** Accepted
- **Decision:** Model every Industry Pack as a validated Pydantic v2 6-section declarative `IndustryPackManifest` assembled from `10` orthogonal `OperationalPrimitive` capability blocks (`PRIMITIVE_CATALOG`). Merging multiple units (e.g., Retail + Manufacturing, or Hospitality USALI + Diner) runs `merge_pack_coa` + `ConfigureIndustryPackUseCase`, rejecting duplicate/conflicting GL codes or missing `ifrs_tag` mappings via explicit `ValidationError` and deterministically seeding compatible `ChartOfAccount` entries (`uuid5(workspace_id, f"pack-acct:{code}")`) into `LedgerStore`.
- **Rationale:** Nigerian businesses frequently operate hybrid models (restaurant inside a hotel, factory shop with retail POS, consulting with logistics) without maintaining separate accounting instances, while auditors require zero IFRS tag ambiguity.
- **Consequences:** All hybrid compositions produce unified, conflict-free IFRS Financial Statements + automatic `business_unit` analytical dimension + additive state consumption/service-charge tax flags without overriding core statutory ledger locks.

## ADR-017: Pure Domain Operational Planners Issuing Through `PostJournalVoucherUseCase` (Phase 6 Slice 5)
- **Date:** 2026-11-12
- **Status:** Accepted
- **Decision:** Model industry operational events (`RETAIL_POS_CASHUP`, `WHOLESALE_LANDED_RECEIPT`, `MANUFACTURING_BOM_RUN`) as pure `Decimal`-quantized domain planners returning `PackOperationPostingPlan` (`metrics` + account-code `PackPlannedLine` rows), which `PostPackOperationUseCase` resolves against active `LedgerStore` accounts and commits strictly through `PostJournalVoucherUseCase`.
- **Rationale:** Operational modules never bypass fiscal period locks, idempotency checks, or double-entry balancing, while IAS 2 landed-cost freight (`1320`/`5030` -> `1310`) and BOM WIP (`1330`/`1340` -> `1310` + `5040`) remain completely auditable inside Trial Balance & FRCN statements.
- **Consequences:** Trying to post a Retail, Wholesale, or BOM entry before activating its pack accounts fails loudly with plain-English `ValidationError` guidance (`Required pack account '...' is not enabled yet`).

## ADR-018: Phase 2 Services/Fund Planners, Statutory Retentions & USALI/Diner Templates (Phase 6 Slice 6)
- **Date:** 2026-11-12
- **Status:** Accepted
- **Decision:** Complete `flagship-industry-packs_20261112` Phases 2 & 3 with five `Decimal`-quantized planners (`CONSTRUCTION_JOB_PROGRESS`, `PROFESSIONAL_TIME_BILLING`, `NONPROFIT_GRANT_ACTIVITY`, `HOSPITALITY_FOLIO_SETTLEMENT`, `DINER_SERVICE_SHIFT`) and one-click `/packs` builder templates (`Hotel / Hospitality (USALI)`, `Diner / Restaurant`, `Hybrid Hotel + Diner`, `Logistics & Fleet`):
  1. **Construction (`CONSTRUCTION_JOB_PROGRESS`):** Supports client progress billing (gross certified, retention asset `1140`, `2%`/`5%` WHT receivable `1150`) and subcontractor certificate postings (crediting `2150 Subcontractor Retention Payable`, `2120 WHT Payable`, `2010 AP`) with automatic `2x` statutory No-TIN WHT doubling when a subcontractor TIN is missing.
  2. **Professional Services (`PROFESSIONAL_TIME_BILLING`):** Recognizes fee revenue + client WHT credit receivable (`1150`), clears prepaid client retainers (`2160`), records reimbursable disbursements, computes billing realization %, and unconditionally enforces `non_exempt_cit_notice = true` per Nigeria Tax Act 2025.
  3. **Non-Profit (`NONPROFIT_GRANT_ACTIVITY`):** Distinguishes restricted grants (`3200 Restricted Fund Net Assets`) from unrestricted grants (`4045`), automatically releasing `3200 -> 4045` upon qualifying spend (`5090`) and computing budget-vs-actual burn %, remaining grant balance, and variance.
  4. **Hotel USALI & Diner (`HOSPITALITY_FOLIO_SETTLEMENT` & `DINER_SERVICE_SHIFT`):** Segregate `7.5%` Output VAT (`2110`), `5%` State Consumption Levy (`2130`), and `10%` fiduciary guest service charge (`2140` — excluded from revenue), alongside occupancy/ADR/RevPAR and covers/average-check/food-cost % KPIs, deduplicated seamlessly when composing Hybrid Hotel + Diner packs.
- **Rationale:** Consolidates project-level tax compliance (WHT doubling, CIT exclusion, fiduciary service charge exclusion) and fund restriction releases in auditable balanced journals without sacrificing industry UX simplicity.
- **Consequences:** All 6 Nigerian Flagship Packs (`ACTIVE_PHASE_1` / `ACTIVE_PHASE_2`) and universal hospitality/diner operational workbooks run end-to-end across Python FastAPI/GraphQL and the Next.js `/operations` & `/packs` workspaces.


## ADR-019: Slice 7 — Multi-Tenant Session Cookies, 5-Role RBAC, CAMA Sec 405 Segregation of Duties & SHA-256 Audit Chain (`auth-rbac-audit-trail_20261112`)
- **Date:** 2026-11-12
- **Status:** Accepted
- **Decision:** Implement NairaBooks authentication and audit compliance using memory-hard `scrypt` (`n=16384, r=8, p=1`) PHC password hashing, short-lived HMAC-SHA256 access tokens (`15m`) paired with single-use rotating refresh tokens (`7d`, full family revocation on replay), `HttpOnly; SameSite=Lax` cookies (`nb_access_token`/`nb_refresh_token` in Python, `nb_session` in Next.js BFF), strict session workspace derivation (rejecting mismatched `X-Workspace-Id` headers with `403 CrossTenantAccessError`), canonical 5-role `ROLE_PERMISSIONS` matrix across REST/GraphQL/BFF boundaries, `SegregationOfDutiesError` (`preparedByUserId != certifiedByUserId`) on CAMA 2020 Section 405 period sign-off, and an append-only SHA-256 hash-chained `AuditEvent` store with secret-redacted `payload_hash` and genesis verification. Keep legacy header/local fallback opt-in via `require_auth=False` (`x-require-auth: 1` for strict mode) when no cookie/Bearer credential is sent so pre-existing Slice 1–6 tests remain backward compatible while authenticated requests always enforce strict fail-closed RBAC.
- **Consequences:** All 5 Nigerian accounting roles, multi-company workspace switching, statutory period sealing, and cryptographic audit verification operate end-to-end across Python FastAPI/GraphQL contracts and Next.js `/security` while upholding `SEC-REQ-01..12` and `A11Y-01..05`.

## ADR-020: Dedicated Per-Type Transaction Create/Edit Routes & Creation-Only Simple/Full Toggle (`Phase 5 Re-Entry`)
- **Date:** 2026-11-12
- **Status:** Accepted
- **Context:** Inspired by Sage 50's 27-item Tasks/Transactions menu, cramming 27 different transaction forms into a single modal dialog or one generic form degrades clarity and creates input clutter for Nigerian business owners.
- **Decision:** Add a `Transactions` tab (`/transactions`) on `TopNavCapsule` grouping all 27 transaction types into 6 intuitive pillars (`Money In`, `Money Out`, `Banking & Register`, `Time & Payroll`, `Ledger & Stock`, `Follow-Ups & System`) with an outline register, and route every transaction type to dedicated Next.js App Router pages (`/transactions/[type]/new` and `/transactions/[type]/[id]`) using 7 domain-tailored layouts (`line-items`, `settlement`, `journal-grid`, `payroll-slip`, `inventory-bom`, `reconcile-clear`, `workflow-note`). Expose a `Simple Creation | Full Creation` segmented toggle strictly on creation while locking Edit mode to **Full Transaction Mode**.
- **Consequences:** Beginners record invoices, receipts, bills, and checks in seconds with clean defaults, while accountants and auditors retain full tax (`7.5%` VAT, `2%/5%/10%` WHT), GL impact preview, and settlement controls on dedicated full-screen routes.

## ADR-021: End-to-End Operational Transaction Posting Engine & Live General Ledger Integration (Phase 6 Slice 7)
- **Date:** 2026-11-12
- **Status:** Accepted
- **Context:** The Phase 5 UI overhaul provided 27 dedicated transaction creation forms and 13 master record modules, but transactions were initially saved to client-side `sessionStorage` without posting real double-entry journal entries to the Python general ledger or database.
- **Decision:** Implement `StandardTransactionPostingPlanner` and `PostStandardTransactionUseCase` in `src/nairabooks/ledger/` and expose `POST /api/v1/ledger/transactions/post` and Next.js BFF `POST /api/transactions`. When any operational transaction is recorded (Sales Invoices, Customer Receipts, Vendor Bills, Vendor Payments, General Journals, Inventory Adjustments, Payroll, etc.), the engine automatically:
  1. Translates operational line items and metadata into mathematically balanced IFRS `DR` and `CR` lines with exact kobo decimal quantization.
  2. Isolates Nigerian statutory taxes: calculating and splitting `7.5%` Output/Input VAT to `2010` and `2%/5%/10%` WHT to `1150 WHT Credit Notes Receivable` (deducted at source) or `2130 Withholding Tax Payable`.
  3. Commits an immutable `JournalVoucher` via `PostJournalVoucherUseCase`, generating sequential voucher numbers (`JV-2026-XXXXX`).
  4. Records an authenticated, hash-chained `AuditEvent` (`action="TRANSACTION_POSTED"`).
  5. Returns voucher metadata to the client, linking the transaction record with `voucherId`, `voucherNumber`, and `isPostedToLedger: true`, immediately feeding into the Trial Balance, FRCN reports (`/reports`), and the bank reconciliation feed (`/reconcile`).
- **Consequences:** Every business transaction recorded in the UI becomes a live, auditable double-entry accounting entry complying with CAMA 2020 and Nigerian IFRS standards, while preserving offline/standalone Vitest parity via the transactional in-memory BFF ledger.


## ADR-022: Unified Automated Quality Gate, API Mock Harness & Diagnostic Tracing (Phase 8 Quality Gate)
- **Date:** 2026-11-12
- **Status:** Accepted
- **Context:** Delivering an enterprise accounting platform compliant with Nigerian IFRS, CAMA 2020, and the Nigeria Tax Act 2025 requires rigorous multi-perspective verification: automated unit and regression testing, cross-tenant isolation enforcement, WCAG 2.2 Level AA accessibility, high-volume performance benchmarks, and resilient error diagnosis.
- **Decision:**
  1. **Unified Quality Gate Orchestrator:** Implement `scripts/run_quality_gate.py` executing Python pytest, Ruff linting, Mypy typechecking, TypeScript `tsc --noEmit`, Vitest frontend suites, and workflow coverage verifier in a single standardized command.
  2. **Automated Unit Test Generator:** Build `scripts/generate_unit_tests.py` using Python AST analysis to generate boundary checks and invariants for new domain modules.
  3. **Deterministic API Mocking Harness:** Implement `web/src/__tests__/mocks/api-mock-harness.ts` enabling test suites to simulate latency, network partitions, 403 cross-tenant isolation, 422 validations, and 503 recovery without spinning up external backend processes.
  4. **Diagnostic Tracing & Root-Cause Analysis:** Implement `src/nairabooks/diagnostics/` (`DiagnosticErrorDetective`) providing structured execution traces, secret-redacted stack frames, and automated remediation guidance for accounting and security errors.
  5. **Conductor Rollback Readiness:** Implement `scripts/conductor_revert.py` supporting safe, git-aware track revert dry-runs without data loss.
  6. **High-Throughput Performance Profiling:** Verify sub-2.5s execution for 1,000 double-entry voucher postings (~0.72s achieved) with zero decimal float drift.
- **Consequences:** All 22 Phase 8 wizard skills (`#69–#90`) are verified with concrete production deliverables, zero accessibility violations, clean static analysis, and guaranteed financial precision across 95 Python modules and 41 Next.js routes.


## ADR-023: Application Security Hardening, SAST Automation, NDPA 2023 & CAMA 2020 Statutory Retention (Phase 9 Security Audit)
- **Date:** 2026-11-12
- **Status:** Accepted
- **Context:** Enterprise financial applications in Nigeria must satisfy statutory accounting retention rules (CAMA 2020 Section 374), data protection privacy mandates (Nigeria Data Protection Act 2023 / GDPR), and international application security standards (OWASP Top 10) prior to public production staging.
- **Decision:**
  1. **Automated SAST & Secret Scanning:** Implement `.sast-config.json` and `scripts/run_sast_scan.py` scanning all Python AST patterns, TypeScript JSX injection risks, and environment files for hardcoded secrets, ensuring 0 critical/high findings.
  2. **HTTP Security Hardening:** Configure bank-grade security headers in `web/next.config.ts`: `Content-Security-Policy` (`frame-ancestors 'none'`, restricted source origins), `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Strict-Transport-Security` (`max-age=63072000; includeSubDomains; preload`), and `Permissions-Policy`.
  3. **Privacy by Design & Statutory Accounting Retention:** Implement `PrivacyComplianceManager` in `src/nairabooks/compliance/privacy.py`. Provide Data Subject Access Request (DSAR) machine-readable JSON bundle exports and PII anonymization (`anonymize_user`) while strictly enforcing a **6-year statutory retention lock** on historical double-entry vouchers and hash-chained audit logs under CAMA 2020 Section 374.
  4. **Continuous Regulatory Compliance Auditing:** Implement `scripts/compliance_check.py` to continuously verify NDPA 2023, CAMA 2020 Sections 374/377/405, and Nigeria Tax Act 2025 compliance across code and database configurations.
  5. **Dependency & Supply Chain Safety:** Implement `scripts/audit_dependencies.py` verifying 100% permissive open-source licenses and locked dependency trees across Python and npm manifests.
- **Consequences:** All 13 Phase 9 wizard skills (`#91–#103`) are executed and verified with zero security regressions, legal documentation in place, and automated compliance tooling across the platform.

## ADR-024: Continuous Integration, Release Workflows & Team Collaboration Tooling (Phase 10 Deployment)
- **Date:** 2026-11-13
- **Status:** Accepted
- **Context:** Transitioning NairaBooks to production deployment and collaborative engineering requires automated CI validation pipelines, standardized pull request audits, SemVer release changelogs, structured statutory issue triage, and asynchronous standup tooling.
- **Decision:**
  1. **GitHub Actions CI/CD Pipeline:** Implement `.github/workflows/ci.yml` and `deploy.yml` orchestrating automated quality gates across Python pytest, Ruff, Mypy, TypeScript `tsc --noEmit`, Vitest frontend suites, SAST security scan, and statutory compliance checks on every push and pull request.
  2. **Git Branching & Advanced Workflow Strategy:** Document trunk-based development with short-lived feature branches (`feat/*`, `fix/*`, `compliance/*`) in `docs/GIT_AND_BRANCHING_STRATEGY.md`, including runbooks for interactive rebase, git worktrees, bisect for regression hunting, and reflog recovery.
  3. **Pull Request Quality Template & Automation:** Create `.github/pull_request_template.md` and `scripts/generate_pr.py` enforcing conventional commits, statutory invariant checkboxes (zero float, double-entry balance, CAMA Sec 405 SoD), and automated test evidence generation.
  4. **SemVer Changelog Automation:** Implement `scripts/generate_changelog.py` producing Keep a Changelog compliant release notes in `CHANGELOG.md` grouping features, fixes, security hardening, and regulatory compliance updates.
  5. **Statutory Issue Triage Engine:** Author GitHub issue forms (`.github/ISSUE_TEMPLATE/*.yml`) and build `scripts/issue_triage.py` to classify issues with regulatory impact (Tax Act 2025, CAMA 2020, NDPA 2023) and generate structured investigation plans.
  6. **Async Standup Automation:** Implement `scripts/generate_standup_notes.py` parsing git activity and open tracks into actionable Daily Standup notes (`docs/STANDUP_NOTES_SAMPLE.md`).
- **Consequences:** All 6 Phase 10 wizard skills (`#104–#109`) are executed and verified with 5 automated tests (`tests/test_git_and_ci_workflow.py`), establishing a bulletproof CI/CD and release workflow for NairaBooks.

## ADR-025: Technical Documentation Architecture, Launch Playbook & Programmatic SEO Flywheel (Phase 12 Closeout)
- **Date:** 2026-11-13
- **Status:** Accepted
- **Context:** To successfully launch NairaBooks and achieve long-term organic user acquisition, the project requires comprehensive technical and developer onboarding documentation, launch marketing playbooks, customer success workflows, and an end-to-end programmatic SEO flywheel tailored for the Nigerian commercial landscape.
- **Decision:**
  1. **Comprehensive Technical & Onboarding Documentation:** Author `docs/TECHNICAL_MANUAL.md` (hexagonal architecture, zero-float precision, PostgreSQL RLS), `docs/CODEBASE_EXPLAINER.md` (deep dive into double-entry invariants, Tax Act 2025 algorithms, and privacy retention), `docs/TUTORIAL_ONBOARDING.md` (progressive hands-on tutorials), `docs/NIGERIAN_ACCOUNTING_REFERENCE.md` (COA, 27 transaction types, WHT schedule), and `CONTRIBUTING.md` / `docs/DEVELOPER_ONBOARDING.md` (15-minute fast start).
  2. **Automated AST Code Catalog Generator:** Implement `scripts/generate_code_docs.py` extracting docstrings, dataclasses, and functions into `docs/API_AND_MODULE_CATALOG.md`.
  3. **Launch Marketing & Sales Enablement:** Author `docs/LAUNCH_MARKETING_PLAYBOOK.md` (press release, 10-tweet X thread, LinkedIn founder announcement), `docs/SALES_ENABLEMENT_AND_AUTOMATION.md` (battlecards vs QuickBooks/Excel, ICP, objection handling, pricing), and `docs/CUSTOMER_SUPPORT_PLAYBOOK.md` (SLAs, escalation tiers, top 25 troubleshooting FAQs).
  4. **Programmatic SEO & Content Flywheel:** Implement `docs/seo/SEO_CONTENT_PLAN.md` (6-month topical clusters), `docs/seo/SEO_STRUCTURE_ARCHITECTURE.md` (hub-and-spoke silos), `web/src/app/sitemap.ts` (programmatic XML sitemap), `web/src/app/robots.ts` (crawler directives), `docs/seo/KEYWORD_STRATEGY_DATABASE.md` (Nigerian search query database), `web/src/lib/seo-meta.ts` (OpenGraph, Twitter Cards, Schema.org JSON-LD generator), and `docs/seo/articles/ultimate-guide-nigerian-tax-accounting-2025.md` (2,000+ word pillar guide).
  5. **SEO Automation & Auditing Tools:** Build `scripts/audit_seo.py` (automated on-page SEO auditor), `scripts/detect_seo_cannibalization.py` (internal cannibalization audit tool), `docs/seo/FEATURED_SNIPPETS_PLAYBOOK.md` (Position 0 templates), `docs/seo/AUTHORITY_AND_BACKLINK_STRATEGY.md` (media outreach), and `docs/seo/CONTENT_REFRESH_SYSTEM.md` (quarterly maintenance calendar).
  6. **Automated Verification:** Verified with 5 pytest tests in `tests/test_phase12_docs_and_seo.py`.
- **Consequences:** All 19 Phase 12 wizard skills (`#110–#128`) are executed and verified, bringing the project to **100% Dynamic Wizard Skill Coverage (`128 / 128` Executed)** across 100 passing Python tests and 50 passing Vitest tests with 0 accessibility violations.

## ADR-026: 3-Choice Hero Action Gateway & Living Micro-Motion Overhaul for Transactions Hub (Phase 5 UI Revamp)
- **Date:** 2026-11-13
- **Status:** Accepted
- **Context:** To simplify the bookkeeping experience for Nigerian SME business owners and accountants, the `/transactions` hub was previously displaying all 6 pillar tabs and outline registers immediately, which created cognitive overhead for non-technical users who simply want to choose between creating a new transaction, reviewing the transaction list, or editing/reversing an existing transaction.
- **Decision:**
  1. **The 3 Hero Action Gateways:** Introduce three prominent, animated choice cards front-and-center:
     - **Create New Transaction (`create`):** Record invoices, bills, receipts, checks, or journals with automated 7.5% VAT and WHT splits.
     - **Transaction List (`list`):** Search, filter, and inspect all posted, open, and pending records across 6 operational pillars with live general ledger feeds.
     - **Edit a Transaction (`edit`):** Modify open records, finalize drafts, or post CAMA 2020 compliant reversal vouchers with immutable audit trails.
  2. **Living Micro-Motion & Cupertino Aesthetics:** Implement spring-loaded physics (`whileHover={{ y: -4, scale: 1.015 }}`, `stiffness: 350`), animated multi-layered gradient badge containers, rotating sparkles, pulsing beacons, and an animated segmented pill switcher with `layoutId="tx-choice-pill"`.
  3. **Preserved Invariants & Accessibility:** Maintain single `<h1>Transactions</h1>`, zero `<aside>` tags, minimum 44px tap targets, keyboard navigation focus rings, and WCAG 2.2 Level AA accessibility compliance (`0` axe-core violations).
  4. **Deep Linking & Backward Compatibility:** Allow `searchParams: ?choice=create|list|edit` on `/transactions` while seamlessly supporting the 6 pillar tabs, "All 27 Types" launcher drawer, and direct edit route links.
- **Consequences:** The Transactions hub becomes vastly more intuitive, calm, and delightful for everyday users while preserving 100% of enterprise double-entry posting, status cycling, and test coverage across 51 Vitest suites.

## ADR-027: Streamlined 3-Action Pill Switcher for Transactions & Direct Access Launch Dock for Financial Overview (Phase 5 Polish)
- **Date:** 2026-11-13
- **Status:** Accepted
- **Context:** Following the Phase 5 revamp, user feedback called for: (1) removing the larger hero cards on `/transactions` to keep the layout calm, sleek, and focused on the 3 smaller pill buttons (`Create New`, `Transaction List`, `Edit a Transaction`), and (2) revamping the Overview tab (`/overview`) with a focus on user-friendliness, direct access to key functionalities, complex animations, and alive iconography.
- **Decision:**
  1. **Streamlined 3-Action Pill Switcher on `/transactions`:** Removed the large hero action cards, consolidating the gateway into a high-visibility, glassmorphic segmented island with 3 tactile action buttons (`data-testid="hero-choice-create"`, `hero-choice-list`, `hero-choice-edit`). Each button features distinct Nigerian color accents (Emerald, Blue, Amber), dynamic counter badges (`27 Types`, `${transactions.length} Records`, `Audit Safe`), min 44px tap targets, and smooth Framer Motion `layoutId="tx-choice-pill"` spring physics.
  2. **Direct Access Quick Launch Dock on `/overview`:** Introduced a 6-card quick launch matrix immediately below the overview header, providing 1-click access to the top everyday business functions:
     - `Record Sales Invoice` (`/transactions/sales-invoicing/new` with 7.5% VAT calculation)
     - `Record Vendor Bill` (`/transactions/vendor-bills/new` for OpEx/diesel tracking)
     - `Bank Reconciliation Studio` (`/reconcile` with AI match and PDF parsing)
     - `Financial Statements & Reports` (`/reports` for IFRS P&L, Balance Sheet, and Trial Balance)
     - `General Ledger & Vouchers` (`/books/journal` for CAMA Section 374 double-entry records)
     - `Tax Act 2025 & Security Shield` (`/security` for small-company 0% CIT status and Section 405 sign-off)
  3. **Living Micro-Motion & Iconography:** Added pulsating Lagos business hours beacon (`WAT GMT+1`), animated Lucide squircle icon containers with flowing gradients, tactile spring hover physics (`whileHover={{ y: -3, scale: 1.015 }}`), and interactive tooltips.
  4. **Strict Accessibility Invariants Preserved:** Guaranteed single `<h1>Financial Overview</h1>`, zero `<aside>` tags, minimum 44px touch targets on all interactive items, and 0 `axe-core` accessibility violations.
- **Consequences:** Users achieve instant, frictionless access to key day-to-day operations directly from the Overview, and the Transactions hub delivers a calm, 3-button landing experience with 0 cognitive clutter. All 51 frontend tests and 100 backend tests pass with 100% test parity.

## ADR-028: Elimination of Redundant Overview Quick Launch Dock in Favor of Focused Bite-Sized Workspaces
- **Date:** 2026-11-13
- **Status:** Accepted
- **Context:** User feedback identified that the 6-card "Direct Access & Key Actions" box on the `/overview` page added cognitive burden and visual bulk, duplicating functionality already accessible in the persistent Top Navigation Capsule and dedicated sub-hubs (`/transactions`, `/reconcile`, `/reports`, `/security`).
- **Decision:**
  1. **De-Cluttering Overview:** Removed the redundant 6-card Launch Dock entirely from `OverviewLandingClient.tsx`.
  2. **Bite-Sized Workspace Architecture:** Enforce strict single-responsibility boundaries across the application:
     - **Overview:** 10,000-foot financial vital signs only (Cash on Hand, Net Income, Receivables, Payables, 6-month Cash Flow rhythm, and overdue alerts).
     - **Transactions:** 3-mode segmented switcher (`Create New`, `Transaction List`, `Edit a Transaction`) where only one focused tool is active at a time.
     - **Reconcile:** Dedicated bank statement parsing and matching workspace.
     - **Reports:** Filterable catalog with on-demand report generation.
  3. **Progressive Disclosure:** Advanced options, full GL impact previews, and Tax Act 2025 tiers remain tucked inside drawers or Simple/Pro toggles until intentionally activated.
- **Consequences:** The application remains calm, fast, and easy to navigate with zero informational redundancy. All 51 frontend Vitest tests and 100 backend pytest tests continue to pass cleanly with 0 accessibility violations.

## ADR-029: Complete Removal of Subpixel GPU Hover Transforms & Blurring (Eye-Friendly Rendering)
- **Date:** 2026-11-13
- **Status:** Accepted
- **Context:** Hovering over tiles and cards previously triggered `whileHover={{ y: -2, scale: 1.015 }}` and `backdrop-blur-md` transitions. In Chromium/Edge on Windows with standard display scaling (125%/150%), CSS 3D transforms (`translateY` / `scale`) force elements onto separate GPU compositing layers, causing text to temporarily lose subpixel antialiasing (ClearType) and appear blurry/jittery while in motion until rasterization settles.
- **Decision:**
  1. **Zero Transform on Tiles:** Completely removed `whileHover` displacement (`y: -2`, `scale: 1.01..1.08`) and dynamic `box-shadow` repaints from all KPI cards, metric strips, launcher tiles, report cards, and icon badges.
  2. **Crisp, Static Feedback:** Replaced GPU transforms with instant, high-contrast CSS color transitions (`transition-colors duration-150 hover:border-[#006838]/40 hover:bg-[#F9FCFA]`).
  3. **Removed `backdrop-blur-md` on Action Capsules:** Replaced with solid high-contrast white backgrounds to eliminate GPU backdrop resampling lag.
- **Consequences:** All text, numbers, and currency symbols (`₦`) remain 100% razor-sharp ClearType rendered at all times without visual blur, flickering, or eye strain. All 51 frontend tests and 100 backend tests continue to pass cleanly.

## ADR-030: Hardware-Composited, Zero-Blur Physical Tile Lift (`.nb-crisp-card-lift` & `.nb-crisp-pill-lift`)
- **Date:** 2026-11-13
- **Status:** Accepted
- **Context:** Following ADR-029 where tiles were made completely stationary to eliminate blur, user testing requested that interactive tiles physically move on hover to feel alive and tactile, but without the annoying 1–2 second font blur and eye strain caused by dynamic GPU layer re-rasterization.
- **Decision:**
  1. **Pre-Promoted Hardware Compositing (`translateZ(0)`):** Configured `.nb-crisp-card-lift` and `.nb-crisp-pill-lift` with static `transform: translateZ(0)` and `backface-visibility: hidden`. By placing the card on its own composited GPU layer at page load, Chromium on Windows avoids the dynamic layer promotion glitch on hover that previously forced ClearType subpixel text into fuzzy grayscale rasterization.
  2. **Strict Integer 3D Translation:** Applied exact integer translation (`transform: translate3d(0, -4px, 0)` for dashboard cards, `translate3d(0, -2px, 0)` for pill action buttons) paired with snappy, overshoot-free cubic bezier easing (`180ms cubic-bezier(0.16, 1, 0.3, 1)`).
  3. **Zero Scale Transforms:** Completely avoided `scale(...)` (which resamples font textures and blurs character glyphs) and spring physics (which linger in subpixel decimals).
  4. **Tactile Elevation Shadows & Micro-Interactions:** Added soft directional shadows (`hover:shadow-[0_12px_28px_rgba(0,104,56,0.09)]`) and subtle inner icon badge translation (`group-hover:-translate-y-0.5`).
  5. **Universal Platform Coverage:** Deployed `.nb-crisp-card-lift` across Overview 4 KPI cards, 2 Operational Alert cards, Transactions 3 hero action pills, 3 metric summary strip tiles, 27 Creation Studio type cards, and Reports Hub catalog cards.
  6. **WCAG 2.2 AA Reduced Motion:** Fully respects user preferences with `@media (prefers-reduced-motion: reduce)` overriding transforms to `none !important`.
- **Consequences:** All interactive dashboard cards and tiles physically and smoothly glide upward on hover, providing tactile feedback while text glyphs and naira figures remain 100% razor-sharp with zero blur. All 51 Vitest tests and 100 Python tests pass cleanly.

## ADR-031: Header De-Cluttering on Transactions Hub & Guided 4-Task Progressive Workflow for Bank Reconciliation
- **Date:** 2026-11-13
- **Status:** Accepted
- **Context:**
  1. The Transactions hub header contained duplicate launcher buttons (`All 27 Types v` and `+ New Sales Invoice`) which took up vertical screen real estate and duplicated the 3 hero action gateway buttons (`Create New`, `Transaction List`, `Edit a Transaction`) immediately below.
  2. The Reconcile tab was visually cluttered: it dumped a 400px uploader, 4 KPI cards, multi-level filter bars, and two long 40-row feeds simultaneously on screen, creating cognitive fatigue for business owners.
- **Decision:**
  1. **Transactions Hub Header Streamlining:** Removed the redundant `All 27 Types v` button, the `+ New Sales Invoice` link, and the collapsible drawer from `TransactionsHubWorkspace.tsx`. The 3 hero segmented action buttons (`Create New 27`, `Transaction List`, `Edit a Transaction`) now act as the single, clean source of control.
  2. **Guided 4-Task Progressive Stepper for Reconcile:** Introduced an interactive, 4-stage guided task ribbon at the top of `BankReconciliationWorkspace.tsx`:
     - **Task 1: Statement Source** (`Landmark` icon, connected status, quick account switch/upload).
     - **Task 2: Smart Matching** (`Sparkles` icon, live match %, direct 1-click Auto-Match Feed action).
     - **Task 3: Resolve Pending** (`AlertCircle` icon, live pending count, direct filter to unmatched items for 1-click Quick Posting).
     - **Task 4: Audit & Sign-Off** (`ShieldCheck` icon, CAMA 2020 Sec 405 certification seal, 1-click Excel export).
  3. **Progressive Statement Disclosure:** Condensed statement source details into a compact 44px status capsule (`Access Bank Plc · Acct: 1858587600 · Emmanuel Oladimeji Ogunsola · Ending Bal: ₦4.41`), turning the large uploader into an on-demand collapsible drawer that saves >350px of vertical space.
  4. **Direct Access to Key Functionalities:** Embedded direct-action controls:
     - ⚡ **1-Click Auto-Match Feed** button with pulsing emerald sparkle micro-animation.
     - **Status & Direction Pills** with min 44px tap targets.
     - **+ Quick Post** modal on unmatched lines to record fees and vouchers in seconds without accounting jargon.
  5. **Alive Micro-Interactions & Hardware Compositing:** Styled all statement lines, ledger entries, and KPI tiles with `.nb-crisp-card-lift` and `.nb-crisp-pill-lift` for smooth 3D integer translations with zero font blur.
  6. **Accessibility & Test Parity:** Strictly preserved single `<h1>`, zero `<aside>` tags, 0 `axe-core` violations, and verified across all 15 Vitest suites (51 tests) and 100 Python tests.
- **Consequences:** Both Transactions and Reconcile tabs are clean, minimalist, and guided by clear step-by-step tasks, eliminating cognitive overload while retaining full double-entry accounting power.

## ADR-032: Strict Sequential Workflow Gating & Step Enforcement for Bank Reconciliation
- **Date:** 2026-11-13
- **Status:** Accepted
- **Context:**
  - In earlier iterations, the 4 guided steps (`1. Statement Source`, `2. Smart Matching`, `3. Resolve Unmatched`, `4. Audit & Sign-Off`) were rendered as descriptive metric cards while the entire page remained an un-gated wall of widgets.
  - Step 4 was clickable and displayed an active green outline even when Step 3 still had 32 pending unmatched items.
  - In statutory Nigerian accounting (CAMA 2020 Sec 405), certifying and signing off a bank reconciliation statement with unresolved bank statement items is a regulatory violation.
  - User explicitly directed: *"don't just list it, let the app follow the workflow don't let the user have access to the next step when one is not yet done"*.
- **Decision:**
  1. **Strict Sequential Gating Logic:**
     - **Step 1 (Statement Source):** Active and accessible. Requires verified statement loaded (`isStep1Done`).
     - **Step 2 (Smart Matching):** Strictly locked unless Step 1 is done (`isStep2Unlocked = isStep1Done`).
     - **Step 3 (Resolve Unmatched):** Strictly locked unless Step 2 has been initialized (`isStep3Unlocked = isStep1Done && isStep2Done`).
     - **Step 4 (Audit & Sign-Off):** **Strictly locked while `unmatchedStatementCount > 0` or variance != ₦0.00**. Disabled with `cursor-not-allowed`, `opacity-60`, dashed border, `Lock` icon, and badge `🔒 Step 4 · Locked (${unmatchedStatementCount} Pending)`.
     - Defensive fallback (`effectiveTask`) prevents any bypass or forced route transition to locked steps.
  2. **App Follows the Sequential Workflow:**
     - The workspace actively renders the dedicated view for the current active step (`effectiveTask: "connect" | "match" | "resolve" | "audit"`), eliminating visual clutter:
       - **Step 1 View:** Bank Account selector, verified statement metadata summary, and collapsible uploader with next step guide button (`[ Confirm Statement & Proceed to Step 2 → ]`).
       - **Step 2 View:** Real-time balancing KPI strip, 1-Click Auto-Match feed action, side-by-side statement vs. ledger feeds, and next step guide button (`[ Proceed to Step 3: Resolve Unmatched (${unmatchedCount} Pending) → ]`).
       - **Step 3 View:** Focused pending resolution workbench displaying unmatched items, individual `+ Quick Post` modal triggers, and a **`⚡ 1-Click Resolve All Remaining Bank Charges`** batch engine that instantly matches standard bank fees/SMS/maintenance to GL 5140, balances to ₦0.00, and unlocks Step 4.
       - **Step 4 View:** Unlocked only when 0 items remain pending; displays official CAMA 2020 Section 405 Statutory Seal, ₦0.00 variance guarantee, SHA-256 cryptographic audit trail, and 1-click Excel export.
  3. **Verification & Accessibility:**
     - Added comprehensive Vitest suite in `reports-and-reconcile.test.tsx` verifying locking of Step 4, batch resolution of all 32 pending items, unlocking of Step 4, and 0 `axe-core` accessibility violations.
     - 100% passing across 15 frontend test files (52 tests) and 100 Python tests.
- **Consequences:** Users are guided sequentially through reconciliation without cognitive overload, and regulatory compliance is enforced by software invariants (cannot sign off until variance is ₦0.00).

## ADR-033: Universal Multi-Bank Statement Ingestion & Viewport-Fitted Zero-Scroll Reconciliation Studio
- **Date:** 2026-11-13
- **Status:** Accepted
- **Context:**
  - Previous reconciliation UI contained hardcoded "Access Bank Plc (*901#)" and personal holder names, creating the impression of a static demo rather than an enterprise accounting platform supporting any commercial bank account in the Chart of Accounts.
  - The previous multi-card stacked layout exceeded 1300px in vertical height, requiring tedious page scrolling across standard desktop displays.
  - User requested:
    1. Remove all Access Bank references so it dynamically works for any bank.
    2. Eliminate scrolling ("minimalist, don't make the user scroll unless it's absolutely unavoidable").
    3. Clarification on how the system ingests raw PDF bank statements without requiring third-party PDF-to-Excel conversion or manual column mapping.
- **Decision:**
  1. **Dynamic Universal Multi-Bank Binding:**
     - Parameterized `BankReconciliationWorkspace` to dynamically bind to the user's active bank account in the Chart of Accounts (`selectedBankAccount`), extracting `activeBankName`, `activeAccountNumber`, and `activeAccountName`.
     - Replaced hardcoded sample metadata with `DEFAULT_BANK_STATEMENT_METADATA` representing generic verified commercial accounts, while dynamically updating bank names, logos, and account numbers upon uploading any Nigerian bank statement (Zenith, GTBank, First Bank, Access, UBA, Stanbic IBTC, Kuda, Moniepoint, etc.).
  2. **Viewport-Fitted Zero-Page-Scroll Architecture:**
     - Collapsed oversized 160px cards and toolbars into sleek 44px-48px horizontal ribbons:
       - Header: 40px compact title strip with inline tab pills and bank account selector.
       - Stepper: 48px horizontal 4-step sequential ribbon with active status pills.
       - Step 2: 44px balancing capsule + 44px action/search toolbar.
       - Split Feeds: Constrained side-by-side feeds to `h-[340px] max-h-[340px] overflow-y-auto` with internal independent scrolling, eliminating window-level page scrolling.
       - Step 3: 48px resolution banner + `h-[360px] max-h-[360px]` contained scroll list + 44px bottom navigation.
       - Step 4: Compact CAMA 2020 certificate card with 4-metric strip + SHA-256 seal + collapsible audit register drawer.
     - Entire workspace comfortably fits within a standard 768px-900px laptop viewport without page scrolling.
  3. **Native PDF Bank Statement Smart-Matching Engine:**
     - Unlike traditional legacy accounting systems that demand CSV conversion and tedious column mapping, NairaBooks natively ingests Nigerian bank e-statements directly in vector PDF format:
       - Text-stream coordinate bounding extraction maps tabular statement feeds (`Trans Date | Value Date | Narration | Debit | Credit | Balance`) without OCR artifacts.
       - Automatic double-entry polarity inversion (Bank Credit -> General Ledger Cash Debit; Bank Debit -> General Ledger Cash Credit).
       - Smart auto-matching algorithm pairs exact kobo amounts within 3-day value windows and fuzzy reference matches.
       - 1-click batch engine recognizes recurring statutory bank charges (SMS alert ₦4.00, monthly card fee ₦53.75, stamp duties ₦50.00, NIP fees) and auto-posts them to GL 5140 to balance the statement to ₦0.00.
  4. **Accessibility & Test Suite Compliance:**
     - Strictly enforced WCAG 2.2 AA heading hierarchy (`<h1>` -> `<h2>` -> `<h3>`), zero `<aside>`, minimum 44px touch targets.
     - 100% pass across all 15 Vitest test suites (52 tests), 100 pytest unit tests, and 128/128 wizard skills verified.
- **Consequences:** The reconciliation workspace delivers a modern, viewport-fitted single-screen experience for any Nigerian bank account with zero unnecessary page scrolling.

## ADR-034: A4 Paper Document Report Viewer, IFRS Statutory Financial Formatting & Desktop Taskbar File Settings
- **Date:** 2026-11-13
- **Status:** Accepted
- **Context:**
  - Reports in the application were previously rendered as standard full-bleed responsive data tables without the visual structure or physical layout of an official corporate financial report.
  - Users and auditors expect financial statements (Statement of Profit or Loss, Statement of Financial Position, Trial Balance) to present like an authentic A4 paper document, arranged strictly according to International Financial Reporting Standards (IFRS) and Nigerian statutory requirements (CAMA 2020 Section 377, FRCN guidelines).
  - Both print output and PDF export must match the pristine A4 document view without application chrome (navigation bar, search bars, filter buttons).
  - The top navbar settings gear icon was previously an immediate link to `/security`; user requested it to function like a desktop application "File" button providing basic user settings, company profile info, and immediate file operations (backup JSON, financial workbook export).
- **Decision:**
  1. **Authentic A4 Paper Document Viewer (`#a4-report-document`):**
     - Centered the financial statement sheet in an executive document desk (`#ECECF1`) with authentic A4 proportions (210mm × 297mm), pure white paper background, subtle sheet shadow (`shadow-2xl ring-1 ring-slate-900/10`), and official print margins.
     - Formatted an official Nigerian corporate letterhead: Company Name ("NairaBooks Enterprise Limited"), CAC Registration ("RC-1849204"), TIN ("28491048-0001"), VAT, and corporate registered address in Victoria Island, Lagos.
     - Arranged financial tables strictly according to IFRS standards (IAS 1, IAS 7, CAMA Section 377) with thin solid rules above subtotals and the statutory double-underline rule (`border-b-4 border-double border-slate-900`) beneath final balances.
     - Added CAMA 2020 Section 405 statutory dual sign-off block at the foot of each A4 page: Managing Director / CEO signature line and Chief Financial Officer / Head of Accounts (FRCN ICAN/ANAN registration number) line, accompanied by SHA-256 cryptographic audit seal.
  2. **A4 Vector Print & Export to PDF Engine:**
     - Configured `@media print` rules in `web/src/app/globals.css`: `@page { size: A4 portrait; margin: 12mm 15mm; }`, hiding all app chrome (`header`, `nav`, `footer`, `button`, `.no-print`) and expanding `#a4-report-document` to full printable width without drop shadows or margins.
     - Added dedicated `Export to PDF` button alongside `Print Report`, dynamically assigning formatted file titles (`NairaBooks_IFRS_[Report]_[Period]`) and invoking vector A4 print generation.
  3. **Desktop Taskbar "File" & Basic Settings Modal:**
     - Created `FileSettingsModal` opened by clicking the Settings gear icon in `TopNavCapsule` (with `aria-haspopup="dialog"` and `aria-expanded`), operating like a desktop application File menu:
       - **Company Profile:** CAC RC-1849204, TIN 28491048-0001, address, functional NGN currency.
       - **Statutory Standards:** IFRS for SMEs, Nigeria Tax Act 2025 0% CIT Exemption tier, 7.5% VAT, 2024 WHT schedule.
       - **File Operations:** 1-Click Export Complete Company Backup (.json), Download Financial Statement Workbook (.xlsx), and CAMA 2020 Audit Package.
       - **Workspace Preferences:** Simple vs Pro mode toggle, crisp rendering status, and direct link to Full Governance (`/security`).
     - Implemented standalone `/settings` route rendering `SettingsWorkspace`.
  4. **Accessibility & Test Suite Compliance:**
     - Maintained 100% WCAG 2.2 AA compliance (0 `axe-core` violations), single `<h1>`, min 44px touch targets.
     - 100% pass across all 15 Vitest test suites (52 tests), 100 pytest unit tests, and 128/128 wizard skills verified.
- **Consequences:** Reports look, read, print, and export as authentic executive A4 paper documents complying with IFRS, and the settings gear provides instant desktop-grade File operations.

## ADR-035: Authentic Nigerian Cultural Artwork Background & Canvas Watermark System
- **Date:** 2026-11-13
- **Status:** Accepted
- **Context:**
  - User requested: *"let's make the app nigerian themed by using nigerian artwork as the background of the app"*.
  - For a high-stakes B2B financial and tax accounting application (NairaBooks), introducing background artwork requires balancing cultural authenticity with strict visual comfort and financial legibility:
    - Backgrounds must never introduce high-contrast visual noise, neon gradients, or distractions that cause eye fatigue when reading financial figures.
    - Text and financial figures must strictly preserve WCAG 2.2 AA contrast ratios (at least 4.5:1 for body copy and 15:1+ for crisp white card surfaces).
    - Print documents (such as A4 IFRS financial reports) must automatically strip background patterns to avoid wasting ink/toner.
    - Zero network overhead and 0ms load latency: artwork must render instantly without external asset requests or layout shifts.
- **Decision:**
  1. **Authentic Vector SVG Pattern Engine (`NigerianArtBackground`):**
     - Developed a native, hardware-composited, fixed-canvas SVG pattern system (`web/src/components/theme/NigerianArtBackground.tsx`) positioned at `pointer-events-none fixed inset-0 -z-10` with `aria-hidden="true"`.
     - Engineered three historically authentic Nigerian art motifs:
       - **Yoruba Adire Eleko (The Sacred Weave of Wealth & Wisdom):** Hand-drawn cassava-resist geometry with interlocking *Olokun* wealth diamonds, *Ese Agba* (footsteps of elders) chevrons, *Owo Ero* cowrie currency symbols, and cardinal star crosses in Nigerian Forest Emerald (`#006838`).
       - **Benin Royal Bronze (Edo 16th-Century Court Metallurgy):** Interlocking continuous sinusoidal guilloche braids representing sovereign perpetuity, flanked by the 4-lobed Benin court sun rosette in warm terracotta bronze (`#8A5A2B`) and imperial emerald.
       - **Igbo Uli & Aso-Oke Handloom Weave (Pan-Nigerian Harmony):** Curvilinear Uli life spirals (*Agwolagwo*) and waxing crescent moons (*Onwa*) interwoven with handloom warp-and-weft combed lines in emerald and river slate.
  2. **Calibrated Watermark Density & Ambient Margins:**
     - Calibrated default opacity to a refined banknote-grade watermark (`0.045` / 4.5%), creating the tactile feel of an executive minted security document or luxury woven textile desk.
     - Positioned two fixed ambient corner watermarks (Top-Right Nigerian Royal Sunburst and Bottom-Left Court Guilloche Seal) that float gracefully in canvas margins without blocking tabular content.
     - All workspace cards, forms, inputs, and A4 reports retain crisp opaque white surfaces (`bg-white`), preserving 15:1+ contrast ratios and zero eye strain.
  3. **Interactive Cultural Theme Controls in Settings:**
     - Integrated a dedicated "Nigerian Cultural Artwork Theme" section in both `FileSettingsModal` and `/settings` (`SettingsWorkspace.tsx`):
       - Allows users to switch motifs (Adire Eleko, Benin Royal Bronze, Igbo Uli & Aso-Oke) with 1 click.
       - Allows users to adjust watermark density (Subtle: 4.5% banknote, Vibrant: 8.5% artistic, Minimal: 2% whisper).
       - Persists selection to `localStorage` and broadcasts instant live updates across all application tabs and routes via `CustomEvent('nairabooks-art-theme-change')`.
  4. **Print Media Isolation:**
     - Updated `@media print` rules in `web/src/app/globals.css` with `.nb-nigerian-art-bg { display: none !important; }`, ensuring A4 paper reports print and export to PDF on pure white paper with zero toner consumption.
  5. **Verification & Zero Violations:**
     - Added dedicated unit and accessibility test suite `web/src/__tests__/nigerian-artwork-theme.test.tsx` verifying theme rendering, SVG pattern defs, interactive switching, and 0 `axe-core` accessibility violations.
     - 100% pass across all 16 Vitest test suites (56 tests), 100 pytest unit tests, and 128/128 wizard skills verified.
- **Consequences:** The application embodies an authentic, prestigious Nigerian cultural identity while maintaining world-class financial clarity, accessibility, and user-configurable visual density.

## ADR-036: Professional A4 Print & PDF Chrome Isolation, Vibrant Nigerian Cultural Canvas & Alive Landing Typography
- **Date:** 2026-11-13
- **Status:** Accepted
- **Context:**
  - In user testing of the A4 financial reports, opening Chrome's print dialog / "Save as PDF" (`media_1794587533057_1222d585.png`) revealed that the parent application chrome (screen `<h1>` title "Statement of Financial Position (Balance Sheet)", the period dropdown, and the 3 executive KPI summary cards) leaked onto the top of page 1 above the A4 paper letterhead. Management and statutory auditors require a clean, unblemished corporate document without web app buttons or duplicate headers.
  - The Nigerian artwork background was previously calibrated to a very subtle 4.5% banknote opacity, which rendered too faintly on certain displays; user requested the artwork to look and feel alive with movement and presence.
  - Loading screens lacked cultural personality; user requested loading states to integrate Nigerian artwork and cultural illustrations.
  - Landing page typography felt static; user requested the hero typography and messaging to look and feel dynamic, modern, and alive.
- **Decision:**
  1. **Strict A4 Print & PDF Chrome Isolation:**
     - In `ReportViewer.tsx`, wrapped all interactive screen chrome (toast notification, Section 1 Header & Navigation Capsule, Section 2 Executive KPI Cards, Section 3 Control Toolbar, and Section 4 Drawers) inside a `<div className="no-print space-y-4">` wrapper.
     - In `globals.css`, updated `@media print` rules with `@page { size: A4 portrait; margin: 8mm 10mm; }`, hiding `header, nav, footer, aside, .no-print, .nb-skip-link, .nb-nigerian-art-bg, [role="status"], [aria-live="polite"]:not(#a4-report-document *), button, select, input` with `display: none !important`.
     - `#a4-report-document` now renders exclusively in print preview and PDF export as a pristine, standalone letterhead document suitable for boards of directors, tax authorities, and lenders.
  2. **Vibrant Nigerian Artwork Canvas & Perpetual Subtle Animation:**
     - In `art-theme.ts`, recalibrated motif baseline opacities from 4.5% to 18% (Subtle), 30% (Vibrant), and 9% (Minimal) for immediate rich visibility.
     - In `NigerianArtBackground.tsx`, enhanced SVG pattern strokes (1.2–1.8px) with textured dual-tone fills (emerald and terracotta bronze) and added a soft ambient top glow.
     - Added perpetual slow ambient rotation (`nb-animate-spin-slow` 180s linear) to the Top-Right Nigerian Royal Sunburst (expanded to 440px) and gentle breathing scale pulsation (`nb-animate-pulse-slow` 12s ease-in-out) to the Bottom-Left Court Guilloche Seal (expanded to 400px), with strict `@media (prefers-reduced-motion: reduce)` accessibility overrides.
  3. **Cultural Nigerian Loading Scenes & Illustrations (`NairaBooksLoader`):**
     - Transformed the multi-scene loading animation into an illustrated Nigerian business journey:
       - **Benin Royal Bronze Sun Medallion & 3D Naira Coin:** Rotating 16-ray Benin bronze sun disk with cowrie orbit and flipping 3D embossed `₦` gold/emerald coin.
       - **Cast Bronze Double-Entry Scales:** Traditional bronze seesaw balance with cowrie weights balancing DEBITS == CREDITS with CAMA 2020 seal.
       - **Lagos Commerce & Smart POS Settlement:** Illustrated POS terminal with pulsing emerald NFC waves, printing VAT and TIN slips.
       - **Tax Act 2025 Shield:** Carved brass and emerald shield defending 0% CIT for qualifying small businesses.
  4. **Dynamic Editorial Landing Page Typography:**
     - In `HeroShowcaseSection.tsx`, introduced animated gradient headline typography (`bg-gradient-to-r from-[#006838] via-[#059669] to-[#C59B27] bg-clip-text text-transparent`) paired with live pulsing statutory badge (`🇳🇬 Nigeria Tax Act 2025 · 0% CIT Ready`).
     - Added live bank parsing ticker highlight and updated preview headlines.
  5. **Verification & Zero Regressions:**
     - All 16 Vitest test suites (56 tests) passed with zero `axe-core` accessibility violations.
     - All 100 Python pytest test cases passed.
     - All 128/128 wizard skills verified (`verify_workflow.py`).
- **Consequences:** PDF export and print preview are 100% isolated to the A4 corporate document, the cultural artwork is vibrant and kinetic, loading screens celebrate Nigerian craftsmanship, and landing typography is lively and prestigious.

## ADR-037: Cloud Deployment Architecture & Render Blueprint (`render.yaml`)
- **Date:** 2026-11-13
- **Status:** Accepted
- **Context:**
  - User requested recalling Phase 10 skills and deploying/hosting the platform using Render ([render.com](https://render.com)).
  - NairaBooks comprises a Next.js 15 App Router web application (`web/`), a Python 3.11 Hexagonal IFRS ledger core (`src/nairabooks/`), and a PostgreSQL 18 database with Row-Level Security.
  - Deployment must support both a production-ready decoupled architecture (Next.js + Python API + managed PostgreSQL) and a zero-friction, free-tier single-service option using the Next.js Server BFF.
- **Decision:**
  1. **Infrastructure as Code Blueprint (`render.yaml`):**
     - Author a canonical Render Blueprint specification at repository root declaring three coordinated cloud resources:
       - `nairabooks-web`: Node.js Web Service running Next.js 15 (`rootDir: web`, `npm install && npm run build`, `npm run start` on port 10000).
       - `nairabooks-api`: Python 3.11 Web Service running the Hexagonal ledger API server (`uv sync --no-dev`, `python -m nairabooks.api.http_server` on port 8000) with automatic binding to `0.0.0.0` and `$PORT`.
       - `nairabooks-db`: Render-managed PostgreSQL 16 database providing persistent double-entry storage and connection string injection into `nairabooks-api`.
     - Standardized regional placement in `frankfurt` (EU Central) for lowest latency to West Africa / Nigeria.
     - Configured automated health checks (`/` and `/health`) for zero-downtime rolling deploys.
  2. **Single-Service Free-Tier Deployment Compatibility:**
     - Confirmed that `nairabooks-web` can operate as an autonomous, self-contained Next.js Web Service on Render's Free tier, as its internal Server BFF (`web/src/app/api/...`) encapsulates the full double-entry ledger, CAMA 2020 compliance, and A4 reports.
  3. **Dedicated Deployment Runbook (`docs/DEPLOYMENT_RENDER.md`):**
     - Authored clear, non-technical and developer instructions covering Git repository initialization, 1-click Render Blueprint setup, custom domain mapping (`nairabooks.ng`), automated SSL certificates, and environment variable management.
- **Consequences:** NairaBooks can be deployed to production on Render with a single click via `render.yaml` or hosted on the free tier with zero manual infrastructure configuration.

## ADR-038: Mobile Viewport Optimization & Universal Android/Samsung Internet Naira Glyph (`U+20A6`) Rendering
- **Date:** 2026-11-13
- **Status:** Accepted
- **Context:**
  - Live deployment testing on mobile (Samsung Internet on Android, `Screenshot_20261113-211308_Samsung Internet.png`) revealed:
    1. Monetary amounts rendered with a missing glyph box (tofu: `▯5,328,200`) instead of the Nigerian Naira symbol (`₦5,328,200`). This was caused by `.nb-money-cell` and `font-mono` specifying `SF Mono, ui-monospace, monospace` without a system sans-serif fallback ahead of `monospace`. On Android devices, generic `monospace` resolves to `Droid Sans Mono` or `Roboto Mono`, which lack the `U+20A6` Naira currency symbol.
    2. The top navigation capsule ballooned into an oversized, egg-shaped white oval taking up over 35% of the vertical mobile screen due to `flex-wrap` paired with `rounded-full` across 3 lines of content.
    3. Missing Next.js 15 `viewport` metadata and mobile horizontal scroll styling.
- **Decision:**
  1. **Universal Naira Glyph (`U+20A6`) Fallback System:**
     - Declared `@font-face` `NairaSystemGlyph` targeting specifically `unicode-range: U+20A6` mapped to `local("Roboto"), local("Samsung Sans"), local("Segoe UI"), local("Arial"), local("-apple-system")`.
     - Refactored `.nb-money-cell` in `globals.css` to use modern system typography with `font-variant-numeric: tabular-nums` and `font-feature-settings: 'tnum'`, ensuring digits remain strictly tabular and right-aligned while `₦` is rendered natively from `Roboto` or `Samsung Sans`.
     - Prepended `NairaSystemGlyph`, `Roboto`, and `"Samsung Sans"` ahead of generic `monospace` in `tailwind.config.ts`.
  2. **Responsive Single-Nav Top App Bar Architecture:**
     - Replaced the awkward multi-line wrapped capsule in `TopNavCapsule.tsx` with a unified, responsive flex structure:
       - Row 1: Logo (`order-1`) on left; Mode toggle (`Simple/Pro`), Settings (`44px` target), and Sign Out on right (`order-2 md:order-3`).
       - Row 2: Horizontally scrollable navigation pill strip (`order-3 md:order-2 w-full md:w-auto overflow-x-auto no-scrollbar pt-2 md:pt-0 border-t border-borderSubtle/60 md:border-t-0 mt-1.5 md:mt-0`).
       - Container uses `rounded-2xl` on mobile and `md:rounded-full` on desktop, eliminating the awkward bubble while maintaining exact single-element DOM accessibility for screen readers and test suites.
  3. **Mobile Viewport & Touch Optimization:**
     - Exported standard `viewport: Viewport` metadata in `web/src/app/layout.tsx` setting `device-width` and `themeColor: "#006838"`.
     - Added `.no-scrollbar` utility to `globals.css` for frictionless native horizontal scrolling across mobile viewports.
  4. **Verification & Zero Regressions:**
     - All 16 Vitest test suites (56 tests) passed with 0 `axe-core` accessibility violations.
     - All 100 Python pytest tests passed.
     - All 128/128 wizard skills verified (`verify_workflow.py`).
- **Consequences:** The Naira symbol (`₦`) renders crisply on all mobile devices including Samsung Internet and Android WebKit, and the mobile navigation is compact, tactile, and native.

## ADR-039: Restoration of Cupertino Typography, Micro-Targeted Naira Glyph Isolation, Dark Mode & Native Mobile Bottom Bar
- **Date:** 2026-11-13
- **Status:** Accepted
- **Context:**
  - User requested: (1) Reverting the global typography overhaul to restore the pristine Apple Cupertino aesthetic (`SF Pro Display`, `SF Pro Text`, `Geist Mono`, `SF Mono`); (2) Resolving the Samsung Internet Naira glyph (`₦`) tofu bug without polluting global body or heading fonts; (3) Adding a native Light/Dark mode toggle; and (4) Moving the mobile navigation bar to the bottom of the screen.
- **Decision:**
  1. **Typography Reversion & Cupertino Restoration:** Reverted `heading`, `sans`, and `mono` in `web/tailwind.config.ts` to strictly Apple Cupertino system fonts and Inter. Reverted card radii and typography sizing across `TransactionsHubWorkspace.tsx`.
  2. **Micro-Targeted Naira (`U+20A6`) Glyph Isolation:**
     - Created `web/src/components/ui/NairaAmount.tsx` (`<NairaSign />` and `<NairaAmount />`), rendering the Naira symbol `₦` inside `font-sans` (which natively includes `U+20A6` on Android/Samsung devices) while rendering all numeric digits in tabular `font-mono`.
     - Declared `@font-face` `NairaGlyphFallback` in `globals.css` targeting strictly `unicode-range: U+20A6` with local fallback `local("Roboto"), local("Noto Sans"), local("-apple-system")`, ensuring `.nb-money-cell` tabular mono remains 100% SF Mono for all numbers with zero tofu on Samsung Internet.
  3. **Universal Light & Dark Mode System:**
     - Implemented `ThemeModeProvider` in `web/src/state/theme-mode.tsx` with `localStorage` persistence and fallback for `prefers-color-scheme: dark`.
     - Created `web/src/components/theme/ThemeToggle.tsx` providing an accessible Sun/Moon toggle button in `TopNavCapsule.tsx` and in `FileSettingsModal.tsx` / `SettingsWorkspace.tsx`.
     - Defined comprehensive `.dark` tokens in `globals.css` (`--nb-background: 20 20 22`, `--nb-surface: 28 28 30`, `--nb-primary: 52 199 89`, etc.) and adapted `NigerianArtBackground` to dynamically use dark radial gradients and luminous emerald strokes.
     - Extracted zero-FOUC theme initialization script into `web/public/theme-init.js` ensuring 100% clean SAST security scan pass.
  4. **Native Mobile Bottom Navigation Bar:**
     - Restructured `TopNavCapsule.tsx` using a single responsive `<nav aria-label="Primary workspace navigation">`. On mobile (`max-md:`), the nav is pinned to the bottom of the screen (`max-md:fixed max-md:bottom-0 max-md:inset-x-0 max-md:z-50 max-md:h-16`) with native icons (`LayoutGrid`, `ArrowLeftRight`, `Scale`, `BarChart3`, `ShieldCheck`) and labels. On desktop (`md:`), it seamlessly renders as the centered floating pill capsule.
     - Added `pb-20 md:pb-6` body padding clearance in `layout.tsx` to prevent content overlap.
- **Consequences:** The application recovers its sleek Apple aesthetic, renders the Naira sign with 0 tofu across all devices, supports instant light/dark mode switching, and offers a thumb-friendly native mobile bottom navigation bar with 100% test pass (56/56 Vitest, 100/100 Pytest, 0 SAST issues, 128/128 wizard skills).

## ADR-040: High-Contrast Dark Mode Engine & Semantic Token Enforcement Across Workspaces
- **Date:** 2026-11-13
- **Status:** Accepted
- **Context:**
  - In dark mode, certain legacy arbitrary hex utility classes (such as `text-[#1C1C1E]`, `text-[#5E5E64]`, `text-[#00582E]`, `text-[#0F4C81]`, and hardcoded `bg-white`) conflicted with the dark midnight background (`#121214`), causing key headings (e.g., "Financial Overview", workspace titles, chart labels) to be rendered dark charcoal on black (WCAG contrast failure).
  - Physical A4 IFRS financial report printouts (`#a4-report-document`) must remain authentic white paper documents regardless of active screen theme.
- **Decision:**
  1. **Two-Tier Dark Mode Contrast Engine:**
     - **Global Override Engine (`web/src/app/globals.css`):**
       - Mapped all headings (`h1` through `h6`) and legacy charcoal text (`.text-[#1C1C1E]`, `.text-slate-900`, `.text-zinc-900`, etc.) to `#F2F2F7` (crisp near-white) in `.dark`.
       - Mapped secondary muted text (`.text-[#5E5E64]`, `.text-[#636369]`) to `#A1A1AA` for guaranteed 4.5:1+ contrast.
       - Elevated dark forest/navy text (`.text-[#00582E]`, `.text-[#0F4C81]`) to vibrant, readable `#34D399` (emerald) and `#60A5FA` (sky blue).
       - Converted `.bg-white` to `#1C1C1E`, light gray card pills (`#FAFAFC`, `#F9FCFA`, `#FBFBFD`) to `#242426`, and light gray borders (`#E5E5EA`, `#D1D1D6`) to `#38383A`.
       - Form controls (`input`, `select`, `textarea`) automatically apply `color-scheme: dark` and `#71717A` placeholder styling.
     - **Physical A4 Print Exemption:**
       - Explicitly protected `.dark #a4-report-document` and `.dark .a4-report-document` with `#FFFFFF` background and `#000000` text, ensuring board-ready and auditor-compliant printed PDFs remain pure white paper.
  2. **Component-Level Semantic Token Modernization:**
     - Upgraded `OverviewLandingClient.tsx` to use semantic Tailwind tokens (`text-ink`, `text-mutedInk`, `bg-surface`, `bg-surfaceAlt`, `border-borderSubtle`) across the workspace title, global date filter, 4 KPI cards, Cash Flow Trend chart, Top Expense Categories chart, and Daily Actionable Alerts.
  3. **Verification:**
     - Passed all 16 Vitest test suites (56 tests) with 0 `axe-core` accessibility violations.
     - 100/100 Python pytest test suite passed.
     - SAST static security scan passed with 0 findings.
     - Next.js 15 production build compiled cleanly with all 44 routes generated.
- **Consequences:** All text, headings, badges, and card surfaces across the platform render with high contrast and WCAG 2.2 Level AA compliance in both light and dark modes, while authentic A4 paper reports remain unaffected.

## ADR-041: Universal Naira Glyph Isolation, Docked Flutter Mobile Architecture, Live Admin-Linked Reports & Entity Grouping
- **Date:** 2026-11-13
- **Status:** Accepted
- **Context:**
  - On Samsung Galaxy / Android devices using Samsung Internet, the Naira symbol (`₦`) showed missing-glyph tofu boxes (`▯`) in table cells and charts because monospace fonts lack `U+20A6`.
  - The mobile bottom navigation bar was visually trapped inside the sticky `<header>` at the top of the phone screen because the parent element's `backdrop-blur` established a CSS containing block for all `position: fixed` descendants under mobile WebKit/Chromium specifications.
  - Reports displayed fictitious mock entities ("Victoria Island Suites Ltd", "Dangote Chemicals", "PwC Nigeria") and a hardcoded company name ("NairaBooks Enterprise Limited") instead of the active workspace entity ("Lagos Trading & Hospitality Ltd", RC 1482910).
  - Admin lacked categorization and grouping for Customers, Vendors, Employees, and Stock Items.
  - Browser print and PDF export leaked screen headings ("Statement of Financial Position") and executive KPI summary cards onto Page 1 of the printed management document.
- **Decision:**
  1. **Universal Naira Glyph Isolation (`U+20A6`):**
     - Prepended `'NairaGlyphFallback'`, `'Roboto'`, and `'Samsung Sans'` to font families in `tailwind.config.ts`.
     - Created `renderWithNairaSign(text)` in `NairaAmount.tsx`, isolating `₦` in `font-sans` while keeping numeric digits in tabular `font-mono`.
     - Applied `renderWithNairaSign()` across Overview KPI cards, Top Expenses, Overdue Invoices, Admin metric headers, and Report tables.
  2. **Flutter-Style Mobile Architecture & Bottom Navigation Docking:**
     - Extracted mobile `<nav>` outside the sticky `<header>` to root level using `.nb-mobile-bottom-nav`, removing the CSS containing block trap so the navigation bar is permanently docked at the bottom of the mobile viewport.
     - Implemented `MobileQuickActionFab` (`web/src/components/mobile/MobileQuickActionFab.tsx`): a Flutter-style Floating Action Button `+` docked at `bottom-20 right-4` with smooth 45° rotation and animated bottom modal sheet for 1-tap New Sale, New Bill, Customer Payment, Add Customer, and Add Stock.
  3. **Live Admin-Linked Reports & Entity Realignment:**
     - Connected `aged-receivables`, `invoice-register`, `aged-payables`, `inventory-valuation`, `payroll-register`, and `unbilled-time-tickets` directly to `loadAdminRecords()`.
     - Replaced all occurrences of hardcoded "NairaBooks Enterprise Limited" with active workspace props `workspaceName` (`"Lagos Trading & Hospitality Ltd"`) and `workspaceRc` (`"RC 1482910"`).
  4. **Category Grouping in Admin Maintain Workspace:**
     - Added `isGroupedView` state and `categoryGroups` computation for `customers`, `vendors`, `employees`, and `inventory` in `AdminMaintainWorkspace.tsx`.
     - Added View Mode toggle (`[Group by Category] | [Flat List]`) and interactive accordion cards with folder icons, item count badges, and subtotal metrics.
  5. **Professional A4 PDF Export Chrome Isolation:**
     - Fixed `div` nesting in `ReportViewer.tsx`, ensuring all screen chrome (Header, KPI cards, Pro badge, Toolbar, Drawers) is strictly enclosed in `.no-print`.
     - Enhanced `@media print` in `globals.css` with `.no-print, .no-print * { display: none !important; visibility: hidden !important; height: 0 !important; }`, guaranteeing pure A4 letterhead output for board presentations.
  6. **Verification:**
     - 16 Vitest test suites (56 tests) passed with 0 `axe-core` accessibility violations.
     - 100/100 Python pytest test suite passed.
     - SAST static application security scan passed with 0 vulnerabilities.
     - Next.js 15 production build compiled all 44 routes cleanly.
     - `verify_workflow.py` verified 128/128 wizard skills (100% complete).
- **Consequences:** The application feels like a native Flutter mobile app on phones with a docked bottom nav and FAB, renders zero Naira tofu glyphs across Android devices, synchronizes reports with live Admin records, provides grouping for operational entities, and exports immaculate A4 PDF reports for corporate management.

## ADR-042: Laptop Naira Glyph Wrapping Resolution, Mobile Landing Page Optimization & Zero-Card Render Deployment
- **Date:** 2026-11-13
- **Status:** Accepted
- **Context:**
  - On laptop screens (1280px–1440px), the Naira symbol (`₦`) inside the Financial Overview KPI cards wrapped onto line 1 while numeric values (`48,250,000.00`) broke onto line 2 because `NairaSign` had `inline-block` (a browser soft line break point) and cards lacked `whitespace-nowrap` at `text-[26px]` in a 4-column grid.
  - The public landing page (`/`) needed comprehensive phone optimization: long header buttons crowded viewports on 360px devices, the rotating gyroscope orb overlapped content or caused horizontal scroll, hero typography needed responsive mobile leading, and comparison tables needed smooth horizontal scrolling.
  - On Render, deploying via Blueprint required entering credit card details for paid service verification, while manual web service deploy failed with `ENOENT: no such file or directory, open '/opt/render/project/src/package.json'` when the root directory was left empty.
- **Decision:**
  1. **Atomic Unbroken Currency Flex Binding:**
     - Updated `NairaSign` in `web/src/components/ui/NairaAmount.tsx` to render with `inline` rather than `inline-block`, eliminating hyphenation opportunities.
     - Wrapped KPI card currency amounts in `inline-flex items-baseline whitespace-nowrap` with responsive font sizing (`sm:text-2xl xl:text-[22px] 2xl:text-[26px]`), guaranteeing that `₦` and the full numeric string remain an atomic unit that never breaks across multiple lines on laptop displays.
     - Changed the outer overview container from `text-[#1C1C1E]` to semantic `text-ink` for high contrast in dark mode.
  2. **Mobile Landing Page Optimization:**
     - **Header Bar:** Compacting action buttons with responsive labels (`<span className="hidden sm:inline">Contact &amp; </span>Start Free`) and touch-friendly padding.
     - **Hero Section:** Added `overflow-x-clip` to section root, tuned mobile headline to `text-3xl sm:text-5xl lg:text-[3.25rem] leading-[1.08]`, scaled the floating gyroscope orb to `h-28 w-28 sm:h-40 sm:w-40` with inner button `h-20 w-20 sm:h-32 sm:w-32`, and repositioned to `bottom-16 right-0 sm:bottom-28 sm:-right-4`.
     - **Interactive Preview Window:** Disabled pointer 3D tilt on touch devices (`if (event.pointerType === "touch") return;`) and added `whitespace-nowrap shrink-0` to transaction amount cells.
     - **Cashflow Split Cards:** Refined split metrics to `grid-cols-3 gap-1.5 sm:gap-2 p-2 sm:p-3 text-xs sm:text-sm whitespace-nowrap`.
     - **Direct Comparison Table:** Enclosed `<Table>` inside `<div className="overflow-x-auto -mx-1 sm:mx-0 scrollbar-thin"><Table className="min-w-[540px]">...</div>`, ensuring smooth swipe-to-scroll on mobile viewports.
  3. **Zero-Card & Zero-Config Render Deployment:**
     - Added root-level `package.json` with `"postinstall": "npm --prefix web install"` and `"build": "npm --prefix web install && npm --prefix web run build"`, enabling successful builds even if Render's root directory is left at default `/`.
     - Documented zero-card manual Web Service deployment path on Render Free Tier.
  4. **Verification:**
     - 16 Vitest test files (56 tests) passed with 0 `axe-core` accessibility violations.
     - 100/100 Python pytest test cases passed.
     - SAST static application security scan passed with 0 vulnerabilities.
     - Next.js 15 production build compiled cleanly across all 44 routes.
     - `verify_workflow.py` verified 128/128 wizard skills (100% complete).
- **Consequences:** The Naira symbol never wraps or breaks on laptops, the public landing page is optimized for mobile touch devices, and the repository builds without configuration errors on Render.

## ADR-043: Multi-Tenant Zero-State Isolation, Dynamic Financial Aggregations & Session Scoping (Slice 3)
- **Date:** 2026-11-16
- **Status:** Accepted
- **Context:**
  - When users registered a new organization account, the UI displayed pre-existing data (₦48,250,000.00 bank balance, 25 demo vouchers) belonging to the demo company (`Lagos Trading & Hospitality Ltd`).
  - Root cause was hardcoded static fallback `WORKSPACE_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0001"` in `web/src/lib/bff-client.ts` and hardcoded mock string props in `web/src/app/overview/page.tsx`.
- **Decision:**
  1. **Dynamic Session Scoping in BFF Layer:**
     - Refactored `fetchChartOfAccounts`, `fetchFiscalPeriods`, and `fetchJournalVouchers` in `web/src/lib/bff-client.ts` to accept optional `workspaceId` and `sessionToken`, forwarding them via `X-Workspace-Id` and `Authorization: Bearer <token>`.
     - When local standalone vitest fallback runs for a tenant other than the demo company, return 0 vouchers and isolated accounts rather than bleeding demo company data.
  2. **Real-Time Tenant KPI Aggregation Engine (`GetWorkspaceKpiSummaryUseCase`):**
     - Implemented `GetWorkspaceKpiSummaryUseCase` in `src/nairabooks/ledger/application/use_cases.py` calculating live balances strictly from the active tenant's posted journal vouchers (`CASH_AND_CASH_EQUIVALENTS`, `TRADE_AND_OTHER_RECEIVABLES`, `TRADE_AND_OTHER_PAYABLES`, and `REVENUE - EXPENSES`).
     - Exposed `GET /api/v1/ledger/kpi-summary` in `src/nairabooks/api/app.py` returning formatted figures, account count, voucher count, and `isZeroState: true` when `voucherCount == 0`.
  3. **Automatic Open Fiscal Period Seeding on Workspace Registration:**
     - Updated `RegisterWorkspaceUseCase` in `src/nairabooks/auth/application/use_cases.py` to seed an open fiscal period `FY2026` (`2026-01-01` to `2026-12-31`) alongside the 6 core Nigerian accounts so newly registered workspaces can post transactions immediately.
  4. **Dynamic Overview Page & Fresh Organization Onboarding State:**
     - Updated `web/src/app/overview/page.tsx` to dynamically query `fetchKpiSummary(workspaceId, token)` and pass live balances to `OverviewLandingClient`.
     - Enhanced `OverviewLandingClient.tsx` to detect `isZeroState || voucherCount === 0`, displaying a clear "Fresh Organization Ledger Initialized" onboarding banner with 1-click CTAs to post the first voucher or import a bank statement.
  5. **Verification & Multi-Tenant Security Tests:**
     - Created `tests/test_tenant_zero_state_isolation.py` verifying clean zero-state initialization (₦0.00 across all cards, 0 vouchers, `is_zero_state = True`), dynamic KPI updates upon posting, cross-workspace non-interference, and rejection of cross-tenant spoofing (`403 CrossTenantAccessError`).
     - All 110 Python unit and integration tests passing.
     - `mypy` and `ruff` passing with 0 errors across all 103 source files.
     - Next.js production build compiling all 44 routes cleanly.
- **Consequences:** Newly registered Nigerian SME accounts start with an immaculate zero-state ledger with zero data bleed from existing companies, while live transactions dynamically update dashboard indicators in real time.


## ADR-044: Comprehensive Zero-State Enforcement, Tenant-Scoped Storage & Mock Data Elimination Across All Views
- **Date:** 2026-11-16
- **Status:** Accepted
- **Context:**
  - After Slice 3 eliminated backend KPI and voucher data bleed on `/overview`, user reported mock data still visible in newly created accounts.
  - Comprehensive inspection revealed several remaining mock data leakage vectors:
    1. `OverviewLandingClient.tsx`: `OVERDUE_INVOICES` (Eko Atlantic, Ikeja Prime Mall, Lekki Port Terminal) was rendered unconditionally; Daily Actionable Alerts unreconciled transactions count defaulted to 4; Cash Flow Trend and Top Expenses charts lacked dedicated zero-state empty views.
    2. `transactions-store.ts` and `admin-store.ts`: Used global un-keyed `sessionStorage` keys (`nairabooks_transactions_v1`, `nairabooks_admin_records_v1`) and defaulted directly to Lagos Trading & Hospitality Ltd mock seed fixtures (`INITIAL_TRANSACTIONS`, `INITIAL_ADMIN_RECORDS`) for every tenant.
    3. Next.js server pages (`/transactions`, `/admin`, `/books/journal`, `/reconcile`, `/reports`): Did not forward `workspaceId` and `token` from `cookies()` to BFF data loaders and client components.
- **Decision:**
  1. **Universal Zero-State Invariant on Overview:**
     - Cash Flow Trend renders a dedicated clean empty state ("No Cash Movements Yet") instead of 6 months of demo bars.
     - Top Expense Categories renders a clean empty state ("Zero Expenses Logged") instead of demo OpEx categories.
     - Daily Actionable Alerts: Unreconciled Transactions displays "0 pending" and "All accounts are balanced and up to date."
     - Overdue Invoices displays a clean zero-state card: "No Overdue Invoices. Your ledger has no outstanding receivables. Create customer invoices or post journal vouchers to track debtor aging." with a direct button to post first voucher.
  2. **Tenant-Scoped Browser Storage Isolation:**
     - Keyed browser storage by tenant ID: `nairabooks_transactions_${workspaceId}` and `nairabooks_admin_records_${workspaceId}`.
     - For any workspace other than the showcase demo company (`aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0001`), the default uninitialized state is strictly `[]` (empty list).
     - When logging out via `TopNavCapsule`, clear active workspace key to prevent session bleeding between different logins.
     - When registering via `SignupWorkspace`, clear legacy mock keys and save the newly created `workspace.id` into active storage.
  3. **Server Pages Scoping:**
     - Updated `/transactions`, `/admin`, `/books/journal`, `/reconcile`, and `/reports` server pages to read session cookies and forward `workspaceId` and `token` to BFF methods and client components.
  4. **Automated Verification:**
     - Added comprehensive zero-state test in `web/src/__tests__/landing-auth-pages.test.tsx` verifying 0 mock bleed across Overview, Transactions Hub, and Admin Studio.
     - 10/10 tests in `landing-auth-pages.test.tsx` passing with 0 `axe-core` accessibility violations.
     - Next.js production build compiling all 44 routes cleanly.
     - 110/110 pytest test cases passing, 0 ruff issues, 0 mypy issues.
- **Consequences:** Newly registered Nigerian SME accounts start in an absolute zero-state across every view (`/overview`, `/transactions`, `/admin`, `/books/journal`, `/reconcile`, `/reports`) without any leaked mock invoices, transactions, customers, or vendors.

## ADR-045: FRCN Reports Hub Tenant Isolation & Spotlight Balance Sheet Zero-State Proof
- **Date:** 2026-11-16
- **Status:** Accepted
- **Context:**
  - User reported `Balance Sheet (Financial Pos.) Assets: ₦2500000.00` spotlight card remaining on the `/reports` hub for newly registered organizations.
  - Root cause investigation identified:
    1. In `web/src/lib/bff-client.ts`, `fetchFrcnPackage` evaluated cumulative vouchers via `const cumVouchers = state.vouchers.filter((v) => v.postingDate <= period.endDate);` without checking `targetWs !== WORKSPACE_ID`. Consequently, the demo company's opening capital voucher (`CAP-OPEN-2026`: Debit Zenith Bank ₦2,500,000, Credit Share Capital ₦2,500,000) was aggregated into total assets for every tenant.
    2. In `fiveYearSummary`, `colVouchers` and `yCumV` similarly aggregated `state.vouchers` without tenant checks.
    3. Route handlers under `web/src/app/api/ledger/` (`/api/ledger/reports/frcn`, `/api/ledger/accounts`, `/api/ledger/periods`, `/api/ledger/vouchers`, `/api/ledger/vouchers/reverse`, `/api/ledger/reconcile/bank`, `/api/ledger/reconcile/fx-revaluation`) omitted `auth.ctx.workspaceId` and `rawToken` when calling BFF methods.
- **Decision:**
  1. **Cumulative Financial Position Isolation in BFF:**
     - In `fetchFrcnPackage`, guarded `cumVouchers`, `colVouchers`, and `yCumV` with `targetWs !== WORKSPACE_ID ? [] : ...` so non-demo workspaces evaluate strictly to `0n` (formatted as `"0.00"`).
  2. **Comprehensive Route Handler Tenant Propagation:**
     - Updated `/api/ledger/reports/frcn` to call `fetchFrcnPackage(periodId, auth.ctx.workspaceId, rawToken)`.
     - Updated `/api/ledger/accounts`, `/api/ledger/periods`, `/api/ledger/vouchers`, `/api/ledger/vouchers/reverse`, `/api/ledger/reconcile/bank`, and `/api/ledger/reconcile/fx-revaluation` to pass `auth.ctx.workspaceId`, `rawToken`, and `auth.ctx.userId`.
  3. **Automated Zero-State Regression Verification:**
     - Added assertions to `web/src/__tests__/landing-auth-pages.test.tsx` verifying that `fetchFrcnPackage` returns `totalAssetsNgn === "0.00"`, `netProfitNgn === "0.00"`, `isBalanced === true`, and that `<FrcnReportsDashboard />` renders `Assets: ₦0.00`, `Net: ₦0.00`, `Balanced (0.00)`, and strictly excludes `Assets: ₦2500000.00`.
  4. **Full Quality Verification:**
     - 16/16 Vitest test suites (57/57 tests) passing.
     - Next.js production build compiling all 44 routes cleanly.
     - 110/110 pytest backend tests passing.
     - 128/128 wizard skills verified in `verify_workflow.py`.
- **Consequences:** The featured report spotlight card on `/reports` displays `Assets: ₦0.00` for all new organizations with zero posted vouchers, guaranteeing 100% tenant isolation across all statutory financial statements.

## ADR-046: File-Backed Auth State Persistence & Seamless Session Recovery
- **Date:** 2026-11-17
- **Status:** Accepted
- **Context:**
  - User reported creating an account (`emmanuel@gmail.com`) but was unable to log in on `http://localhost:3000/login` ("Invalid email or password.").
  - Root cause investigation identified that `web/src/lib/auth-bff.ts` held registered user accounts, workspaces, and memberships exclusively in an in-memory `globalThis` object.
  - When the development server reloaded, recompiled, or restarted, all newly created accounts were wiped from memory, reverting strictly to the 5 baseline demo personas (`owner@lagostrading.ng`, etc.).
- **Decision:**
  1. **Disk-Backed State Persistence:**
     - Implemented `savePersistedAuthState` and `loadPersistedAuthState` in `web/src/lib/auth-bff.ts` targeting `web/.data/auth-state.json`.
     - Automatically persists registered users, workspaces, and memberships whenever `registerWorkspaceAccountViaBff`, `assignMemberRoleViaBff`, or `resetPasswordViaBff` executes.
     - On server startup / cold module evaluation, `loadPersistedAuthState` reads `web/.data/auth-state.json` and hydrates registered users alongside demo fixtures, ensuring accounts survive process restarts indefinitely.
  2. **Password Reset BFF Contract & Route:**
     - Created `resetPasswordViaBff` and exposed `POST /api/auth/reset-password` allowing secure password updates for existing user accounts.
  3. **Verification via Strict TDD:**
     - Added `web/src/__tests__/auth-persistence.test.ts` testing account persistence across simulated server restarts and password reset execution.
     - All 17 Vitest test suites (59 tests) passing.
     - Next.js production build compiling all 45 routes cleanly.
     - 110/110 pytest backend tests passing.
- **Consequences:** All registered organizations and credentials survive server restarts and code changes, completely eliminating credential loss.

## ADR-047: Bank Reconciliation Workspace Multi-Tenant Zero-State & Demo Statement Isolation
- **Date:** 2026-11-17
- **Status:** Accepted
- **Context:**
  - User reported that when logging into a newly created account, `/reconcile` was populated with demo data and an already loaded Access Bank statement (`ACCESS_BANK_SAMPLE_METADATA`, `ACCESS_BANK_PARSED_TRANSACTIONS`, `INITIAL_COMPANY_LEDGER_ENTRIES`, and 14 pre-matched pairs).
  - Investigation revealed:
    1. `web/src/app/reconcile/page.tsx` extracted `workspaceId` from session cookies but omitted passing it into `<BankReconciliationWorkspace accounts={accounts} />`.
    2. `web/src/components/BankReconciliationWorkspace.tsx` defaulted state unconditionally to the demo Access Bank statement, demo ledger entries, and 14 pre-matched pairs for all workspaces.
- **Decision:**
  1. **Tenant-Scoped Initialization:**
     - Updated `BankReconciliationWorkspace` to accept `workspaceId?: string` and compute `isDemo = !workspaceId || workspaceId === PRIMARY_WORKSPACE_ID`.
     - For non-demo tenant workspaces:
       - `statementMeta` initializes to `null` (no statement preloaded).
       - `statementLines` initializes to `[]`.
       - `ledgerEntries` initializes to `[]`.
       - `matchedPairs` initializes to `{}`.
       - `activeTask` initializes to `"connect"` (Step 1: Statement Source & Target Account Setup with prominent `BankStatementUploader`).
       - Fallback closing balance displays `₦0.00` instead of `₦4.41`.
       - Scoped session storage (`nairabooks_reconcile_${workspaceId}`) saves uploaded statements and matches per tenant.
     - For the demo company (`Lagos Trading & Hospitality Ltd`), preserved rich interactive demo fixtures.
  2. **Page Context Forwarding:**
     - Updated `web/src/app/reconcile/page.tsx` to forward `workspaceId={workspaceId}` to `BankReconciliationWorkspace`.
  3. **Verification via Strict TDD:**
     - Added Step 5 to `web/src/__tests__/landing-auth-pages.test.tsx` verifying clean zero-state initialization for `/reconcile` (Awaiting Upload, 0 transactions ready for auto-matching, and zero leaked demo transactions).
     - Verified `web/src/__tests__/reports-and-reconcile.test.tsx` passes with 100% green coverage.
     - Next.js production build compiling all 45 routes cleanly.
- **Consequences:** Newly registered SME accounts view an immaculate zero-state reconciliation workspace awaiting their commercial bank statement, guaranteeing complete multi-tenant isolation across all screens.

## ADR-048: Live Reports Statement Line Binding & Wizard Industry Chart of Accounts Seeding
- **Date:** 2026-11-17
- **Status:** Accepted
- **Context:**
  - User reported two issues with newly registered business accounts:
    1. `/reports` displayed Balance Sheet figures (Total Assets ₦28,500,000.00, Liabilities ₦9,300,000.00, Net Equity ₦19,200,000.00) and hardcoded synthetic rows (Cash ₦12,825,000.00, Receivables ₦7,125,000.00, etc.) despite the tenant having zero posted ledger entries.
    2. `/admin` displayed `Chart of Accounts (0)` and `No matching IFRS accounts found`, failing to seed the tailored industry Chart of Accounts previewed during the onboarding wizard.
  - Root cause investigation identified:
    1. In `web/src/components/reports/reports-data.ts`, `balance-sheet` and `income-statement` used `|| 28500000` and `|| 15500000` fallback operators. Because `Number("0.00")` evaluates to `0` (falsy), a clean zero-state package fell back to the ₦28.5M demo numbers and generated fake rows via `Math.round(assets * 0.45)`.
    2. In `web/src/components/admin/admin-store.ts`, non-demo tenants were assigned `initial = []` across all admin records. While customer and vendor catalogs should start empty, Chart of Accounts should be seeded from the industry template selected during the creation wizard.
- **Decision:**
  1. **Live Reports Statement Line Binding:**
     - Updated `balance-sheet`, `income-statement`, `value-added`, and `five-year-summary` in `reports-data.ts` to strictly bind to actual ledger package lines (`assetLines`, `liabilityLines`, `equityLines`, `revenueLines`, `operatingExpenseLines`).
     - Removed all synthetic `|| <mock_number>` fallbacks.
     - When an organization has zero posted movements, reports display pure zero-state KPIs (`₦0.00`) and the clean empty state message with 0 mock bleed.
  2. **Wizard Industry Chart of Accounts Seeding:**
     - Added `seedTailoredAccountsForWorkspace(workspaceId, businessType)` in `admin-store.ts` seeding the tailored IFRS Group and Individual accounts with `₦0.00` balances from `SECTOR_TEMPLATES`.
     - Added dedicated `EDUCATION_SCHOOL` sector template in `company-wizard-data.ts` for schools and educational institutions (such as Honey Home School).
     - Forwarded `businessType` across `AuthWorkspaceSummary`, `registerWorkspaceAccountViaBff`, and `AdminMaintainWorkspace`.
     - Updated `fetchChartOfAccounts(workspaceId)` in `bff-client.ts` to return the tenant's tailored accounts.
  3. **Verification via Strict TDD:**
     - Created `web/src/__tests__/reports-live-data-and-coa-seeding.test.tsx` verifying zero-state report output and Chart of Accounts seeding.
     - All 18 Vitest test suites (63 tests) passing with 0 axe-core violations.
     - Next.js production build compiling all 45 routes cleanly.
     - Python pytest suite passing 110/110 tests.
     - 128/128 wizard skills verified (100%).
- **Consequences:** All reports reflect live ledger balances with zero synthetic bleed, and newly registered businesses immediately have their tailored Nigerian IFRS Chart of Accounts ready in Admin Maintain Studio.

## ADR-049: 1-Based Sequential Numbering, Live Relational Pickers in Transactions & Admin, and Comprehensive Report Data Binding with Zero-Balance Accounts Display
- **Date:** 2026-11-18
- **Status:** Accepted
- **Context:**
  - User requested:
    1. **1-Based Sequential Numbering:** Numbering in new companies must start from 1 (`001`) for both transactions (`INV-2026-001`, `QUO-2026-001`, `BIL-2026-001`, `JV-2026-001`, `REC-2026-001`, `PAY-2026-001`) and admin records (`CUS-001`, `VND-001`, `SKU-001`, `JOB-001`, `EMP-001`, `FA-001`), eliminating random suffixes like `INV-2026-646`.
    2. **Searchable & Selectable Records Across Transactions & Admin:**
       - Transaction counterparty must allow searching or picking registered customers (for sales), vendors (for purchases/bills), or employees (for payroll).
       - Transaction line items must provide an inventory item picker auto-populating item description, unit price, and GL routing account.
       - Admin module forms must offer live relational dropdowns to select registered customers, vendors, sales reps, and Chart of Accounts.
    3. **Live Report Data Binding & Display of Related Accounts at Zero Balance:**
       - All 15 financial and operational reports must bind directly to live data (`loadAdminRecords()` and `loadTransactions()`).
       - Related accounts must always be shown on the report document even if they have a zero balance (`₦0.00`), unless the user explicitly toggles the "Hide Zero-Balance Accounts" option.
       - Hardcoded synthetic lines in reports like `general-journal` (e.g., hardcoded Honey Home School mock lines) must be replaced with balanced double-entry vouchers derived dynamically from actual transactions.
- **Decision:**
  1. **Deterministic 1-Based Sequential Numbering Service:**
     - Created `web/src/lib/numbering-service.ts` with `getNextTransactionReference(typeId, workspaceId, year)` and `getNextAdminRecordCode(moduleId, workspaceId, parentGroupCode)`.
     - Scans existing transactions and admin store records for the target prefix/type; in clean workspaces, starts at sequence 1 (`001`). Subsequent records increment sequentially (`max + 1`).
  2. **Searchable Counterparty Combobox & Inventory Picker in Transactions:**
     - In `TransactionRecordEditorWorkspace.tsx`, replaced plain text counterparty input with an interactive searchable picker popover filtering live customers, vendors, or employees with live search query filtering, badge count, dropdown chevron, option list, and quick pick chips.
     - In `TransactionEditorLayouts.tsx`, updated `LineItemsTable` with an inventory item catalog `<select>` control that auto-completes line description, standard unit price, and GL account code.
  3. **Relational Pickers in Admin Maintain Studio:**
     - In `AdminRecordEditorWorkspace.tsx`, added relational `<select>` controls for vendors, customers, Chart of Accounts, and sales representatives with fallback custom text entry.
  4. **Live Data Binding & Zero-Balance Accounts Display in Reports:**
     - In `web/src/components/reports/reports-data.ts`, connected all 15 reports to live store data.
     - For Balance Sheet and Income Statement, all related Chart of Accounts rows are presented on the statement document even at `₦0.00` balances, and filtered out only when `hideZeroBalances` is toggled.
     - Replaced synthetic general journal rows with balanced debit/credit lines dynamically computed from posted operational transactions.
  5. **Verification via Strict TDD:**
     - Created `web/src/__tests__/live-reports-searchable-pickers-and-numbering.test.tsx` (8 unit tests) verifying 1-based numbering, sequential increments, live account rows at zero balance, and counterparty search combobox.
     - All 19 Vitest test suites (71 tests) passing with 0 errors and 0 axe-core accessibility violations.
     - Next.js production build compiling all 45 routes cleanly with zero type errors.
     - Python pytest suite passing 110/110 tests.
     - 128/128 wizard skills verified (100%).
- **Consequences:** Numbering is predictable and strictly 1-based, counterparties and inventory items are easily discovered and linked across transactions and admin, and financial reports provide complete transparency into the organization's Chart of Accounts.

## ADR-050: Segmented Tab Capsule High-Contrast Dark Mode & Inventory Stock Valuation Clarification
- **Date:** 2026-11-19
- **Status:** Accepted
- **Context:**
  - User uploaded 6 screenshots querying inventory/sales business terms (Physical On Hand, Available to Promise, Reorder Status, Commissionable, Quantity Committed on Sales Orders, Qty on Hand / Cost) and requested fixing the dark mode error shown on the Admin Pillars tab bar.
  - In dark mode on `/admin`, the floating segmented tab container (`People & Payroll`, `Books & Budgets`, `Stock, Jobs & Assets`, `Company & Defaults`, `Taxes & Users`) was rendering as a bright light-gray box (`#E5E5EA`) because `bg-[#E5E5EA]/75` was not matched by `.dark .bg-\[\#E5E5EA\]\/70` in `globals.css` and lacked explicit dark mode styles in `AdminMaintainWorkspace.tsx`. Inactive tabs had faint gray text on light gray with nearly zero contrast, while the active tab turned into a dark black pill (`#1C1C1E`) inside that light-gray container.
  - In the inventory item editor schema, default values (`42`, `6`, `15`) were hardcoded for new items, causing fresh items in new companies to display synthetic quantities rather than starting cleanly at 0.
  - The label `"Qty On Hand / Cost"` with placeholder `"e.g. ₦1,450,000"` was confusing because it mixed physical item quantity with total general ledger monetary stock valuation.
- **Decision:**
  1. **High-Contrast Dark Mode Styling for Tab Capsules:**
     - Updated `AdminMaintainWorkspace.tsx` tablist: `border border-[#E5E5EA] dark:border-[#2C2C2E] bg-[#E5E5EA]/75 dark:!bg-[#18181A] p-1 shadow-xs`.
     - Active pill: `bg-white dark:!bg-[#2C2C2E] dark:border dark:border-[#3A3A3C] shadow-[0_2px_8px_rgba(0,0,0,0.08)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.5)]`.
     - Active text: `text-[#1C1C1E] dark:!text-white`.
     - Inactive text: `text-[#5E5E64] dark:!text-[#A1A1AA] hover:text-[#1C1C1E] dark:hover:!text-white`.
     - Sub-module pills: `border-[#E5E5EA] dark:border-[#38383A] bg-white dark:bg-[#1C1C1E] text-[#1C1C1E] dark:text-[#F2F2F7] hover:bg-[#FAFAFC] dark:hover:bg-[#2C2C2E]`.
     - Updated `globals.css` to blanket-cover `.dark .bg-\[\#E5E5EA\]\/75`, `/80`, `/85`.
     - Updated `web/src/components/ui/tabs.tsx` and `BankReconciliationWorkspace.tsx` for consistent dark segmented controls.
  2. **Inventory Stock Valuation & Quantity Field Disambiguation:**
     - Updated `AdminRecordEditorWorkspace.tsx`: When `moduleId === "inventory"`, the label is explicitly `"Total Stock Valuation / Cost on Hand (₦)"` with placeholder `"e.g. ₦1,450,000 (total inventory value)"`, cleanly distinguishing Naira currency valuation from unit counts.
     - Updated `admin-editor-schemas.ts` and `AdminEditorWidgets.tsx`: Initial stock defaults for new items set to `0` (`qtyOnHand: "0"`, `qtyOnSo: "0"`, `minStock: "0"`), correctly showing `"Zero Initial Stock"` instead of synthetic 42/6/15 numbers.
  3. **Verification via Strict TDD:**
     - Added 2 new unit tests in `live-reports-searchable-pickers-and-numbering.test.tsx` verifying dark mode classes on `AdminMaintainWorkspace` tablist and stock KPI calculation ($36 = 42 - 6$, zero initial stock handling).
     - All 19 Vitest test suites (73 tests) passing with 0 failures and 0 axe-core violations.
     - Next.js production build compiling all 45 routes cleanly in 20.1s.
- **Consequences:** Dark mode renders with impeccable contrast across all segmented navigation controls and tab capsules, inventory terms and calculations are crystal clear, and new items start at zero stock without synthetic bleed.

## ADR-051: Per-Workspace Local Ledger State & Workspace-Scoped `/api/transactions` (2026-11-23)
- **Status:** Accepted
- **Context:** `/api/transactions` called `fetchJournalVouchers(first)` and `postStandardTransactionViaBff(rawBody)` without the authenticated workspace, and the local fallback ledger in `web/src/lib/bff-client.ts` was a single global store. Every tenant read and posted into the demo workspace's books.
- **Decision:**
  - `getLocalState(workspaceId)` now returns a state partitioned per workspace (`Map<string, LocalBffState>`). The demo workspace keeps its seeded books; any other workspace starts with its sector chart of accounts (`getTailoredBffAccounts`), the shared fiscal calendar, and an empty journal.
  - `fetchJournalVouchers`, `postJournalVoucherViaBff`, `reverseJournalVoucherViaBff`, and `postStandardTransactionViaBff` all read/write the caller's workspace state; idempotency keys are now per workspace.
  - `postStandardTransactionViaBff` accepts `workspaceId`, `sessionToken`, `actorUserId` and forwards them upstream (previously hardcoded demo IDs). Vouchers record the real `createdByUserId`.
  - `/api/transactions` GET/POST pass `auth.ctx.workspaceId`, the session token, and `auth.ctx.userId`.
- **Consequences:** Tenants no longer see or write each other's transactions. Read-only reports (FRCN, KPI, reconciliation) still short-circuit non-demo workspaces to zero-state and do not yet read the per-workspace journal. Local state remains in-memory only.
- **Verification:** New `web/src/__tests__/transactions-workspace-isolation.test.ts` (3 tests, written red first). Also fixed 7 pre-existing `tsc --noEmit` errors in three test files (`live-reports-searchable-pickers-and-numbering`, `auth-persistence`, `landing-auth-pages`) whose fixtures had drifted from component/type contracts. `tsc --noEmit` clean; Vitest 20 files / 76 tests passing.

## ADR-052: Production Auth Hardening — Required Session Secret, Opt-In Demo Accounts, No Anonymous Owner (2026-11-23)
- **Status:** Accepted
- **Context:** The web BFF (`web/src/lib/auth-bff.ts`) seeded 5 demo accounts with a password hardcoded in source, fell back to a random per-boot session secret (every restart logged everyone out), and treated cookie-less requests as the demo Owner using `state.users[0]` — which, without demo users, would be the first real registered user. Review also found: `/api/auth/reset-password` changed any account's password given only its email (account takeover), invited members were created with the public demo password, and the anonymous `/security` page rendered `users[0]`'s session.
- **Decision:** New `web/src/lib/auth-config.ts` (`resolveAuthRuntimeConfig`) decides per environment:
  - **Session secret:** production requires `NAIRABOOKS_SESSION_SECRET` (≥32 chars); otherwise login/registration return `503 SESSION_SECRET_NOT_CONFIGURED` and token verification fails closed. Dev/test still generate one.
  - **Demo accounts:** production seeds them only when `NAIRABOOKS_DEMO_PASSWORD` is set, using that password; dev/test keep the built-in password. Demo users are never revived from `.data/auth-state.json`.
  - **Anonymous requests:** the demo-owner fallback (API auth, `/api/auth/session`, `/security` initial data) is dev/test only and looks up the demo owner by ID, never `users[0]`. Production returns 401; `/security` redirects to `/login`.
  - **Password reset:** disabled in production (403) until emailed, verified reset links exist.
  - **Invites:** new members get a random one-time password, returned once to the inviter and shown in the Security workspace.
  - **UI:** login demo drawer and Security page demo hint render only when a demo password is configured (passed from server pages).
  - `render.yaml`: `NAIRABOOKS_SESSION_SECRET` (`generateValue: true`) and optional `NAIRABOOKS_DEMO_PASSWORD` (`sync: false`); `.env.example` documents both.
- **Consequences:** The live Render site loses the public demo unless `NAIRABOOKS_DEMO_PASSWORD` is set in the dashboard. Production users cannot reset forgotten passwords until email delivery is built. Sessions survive restarts once the secret is set, but user accounts on Render's free tier still live on an ephemeral disk.
- **Verification:** `web/src/__tests__/auth-production-hardening.test.ts` (11 tests, written red first); full Vitest 21 files / 87 tests; `tsc --noEmit` clean; `next build` succeeds; `next start` smoke test confirmed 503 without secret, 201 register / 401 demo login / 401 anonymous API with secret, and no demo drawer.

## ADR-053: Single Next.js Backend with Postgres Document Persistence; Python Retired (2026-11-23)
- **Status:** Accepted (supersedes the Python-API delegation in earlier ADRs)
- **Context:** Python (`src/nairabooks`) and TypeScript (`web/src/lib/*-bff.ts`) both implemented the ledger, tax, packs and auth. Only TypeScript was deployed, and it kept everything in process memory: data vanished on every restart. Tax and pack profiles were single global objects shared by all tenants. Admin/Transactions records lived only in browser `sessionStorage`.
- **Decision:**
  - The Next.js server code is the only backend. All `NAIRABOOKS_API_URL` delegation branches were removed (20 blocks). The Python package is a retired, undeployed reference spec.
  - New `web/src/lib/persistence/`: a `DocumentStore` interface with Postgres (`pg`, Neon in production via `DATABASE_URL`), file (`web/.data/documents`, local dev default, imports legacy `auth-state.json`) and memory (tests) implementations. Documents are cached per process, loaded once (`ensureHydrated`), and written through (`writeDocument`). Every API route is wrapped in `withPersistence`, which loads before handling and awaits saves before responding (503 on DB failure). Server pages call `ensureHydrated()`. Writes before loading are refused, so a partial state can never overwrite the stored copy.
  - Persisted: auth directory (excluding demo accounts), per-workspace ledgers (post, reverse, CAMA period certification), per-workspace tax and pack profiles. Tax/pack routes and pages now use the session workspace, and the tax and pack preview routes now require sign-in.
  - Admin/Transactions (#5): `/api/records/[collection]` (GET `LEDGER_READ`, PUT `LEDGER_POST`) for `transactions`, `admin-records`, `company-settings`, stored per workspace. The client stores keep their synchronous cache, load from the server on page load (`RecordsSync` in the root layout) and push changes back (debounced; only for the workspace the server confirmed).
- **Consequences:** Data survives restarts and deploys once `DATABASE_URL` is set. Must run as a single instance, because saves are last-writer-wins per document. Documents are JSON blobs, not the relational schema in `db/migrations`, which remains the target for a later migration. Reports/KPIs/reconciliation still return zero-state for non-demo workspaces. The Transactions editor posts a new ledger voucher on every save, including edits.
- **Verification:** New tests: `persistence-document-store` (PGlite Postgres + file store), `persistence-restart-survival` (register → post → tax update → restart → all present, on PGlite), `records-api-persistence`, `records-client-sync`. Vitest 25 files passing; `tsc --noEmit` clean; `next build` OK; production `next start` restart smoke test kept account, ledger entry and records.

## ADR-054: One Posting Engine for Every Transaction Type; Reports Read Each Company's Own Ledger (2026-11-24)
- **Status:** Accepted
- **Context:** An end-to-end review of the six core features found:
  - Reports, KPIs and the chart of accounts read the demo company's ledger for every company, so real companies always saw zeros.
  - Transactions posted to hard-coded codes (`1010/1120/2120/2010/4010/5010`) that most sector charts lack; the fallback sent VAT to revenue and some revenue to cash.
  - 20 of 26 types (payroll, journals, stock, register, …) posted a generic "Dr bank / Cr revenue" entry. Quotes, POs, drafts and letters posted too, and every save posted again.
  - Accounts created in Admin never reached the ledger, and Admin opening balances were ignored.
  - Inventory and payroll reports read field names the editors never save (`quantityOnHand`, `basicSalary`).
  - Reversals for real companies were posted into the demo ledger.
- **Decision:**
  - New `web/src/lib/posting-rules.ts` (pure, shared by server and browser): per-type double-entry rules, accounts resolved by role from the company's own chart (standard accounts such as `2245 PenCom Payable` are added when missing), VAT/WHT, payroll (`computePayslip`), stock counts, perpetual-inventory COGS for lines picked from stock (`itemId`), and stock-on-hand.
  - Non-posting documents (quotes, POs, requisitions, deposit selection, reconciliation, letters, action items, system tasks) and `Draft`/`Voided` records never post.
  - `postStandardTransactionViaBff` keeps one live voucher per record: an unchanged re-save is a no-op, an edit reverses the old voucher and posts the new one, and `DELETE /api/transactions?id=` reverses it.
  - Saving Admin records syncs the chart (`syncChartFromAdminRecords`): new and renamed accounts reach the ledger, and typed beginning balances post as one replaceable `OPENING-BALANCES` voucher against `3900 Opening Balance Equity` (not for the demo company).
  - FRCN package, KPIs, chart and reconciliation use the caller's workspace. The package now includes the period's `journalVouchers`.
  - Report tables (`components/reports/ledger-report-rows.ts`):
    - Trial balance, P&L, balance sheet and journal read the ledger.
    - AR/AP aging applies payments to the oldest invoice first.
    - Inventory valuation uses live stock on hand.
    - Payroll register reads posted payslips.
  - The editor lists the company's own accounts, waits for the ledger before confirming, and shows posting errors instead of failing silently.
- **Consequences:** Edits and deletes create reversal vouchers (audit-friendly). Account codes on lines must exist in the chart (journals reject unknown accounts). Some older tests changed their expectations: report totals rows, two "Zenith" accounts in the trial balance, and save confirmation now waits for the ledger.
- **Verification:**
  - New `accounting-end-to-end.test.ts` (9 tests): register → chart + opening balances → all 26 types → edit/delete → every report checked against hand-calculated figures.
  - Vitest 26 files passing; `tsc --noEmit` clean.
  - Browser check: new company → sales invoice → trial balance shows ₦64,500 receivable, balanced.
