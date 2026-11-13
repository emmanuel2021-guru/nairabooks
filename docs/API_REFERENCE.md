# GraphQL API Reference & Contract Guide (`docs/API_REFERENCE.md`)

> Covers `phase-3-architecture` Block 2 (`N3_D2`): `api-design-principles`, `graphql-architect`, `api-documenter`.
> Canonical Schema Source: [`api/graphql/schema.graphql`](../api/graphql/schema.graphql)

## 1. Design Principles & Conventions
1. **Schema-First Contract:** `api/graphql/schema.graphql` is the single source of truth shared between the Python GraphQL server (`Strawberry` ASGI planned in Phase 6) and the TypeScript/Next.js frontend via GraphQL Code Generator.
2. **Exact Monetary Serialization (`DecimalMoney` & `DecimalRate`):**
   - Built-in GraphQL `Float` MUST NEVER represent money, tax rates, quantities, or FX rates.
   - All financial amounts serialize as exact decimal strings (`"245000.50"`, `"0.0750"`) so IEEE-754 rounding errors never occur in transit or in TypeScript UI clients.
3. **Relay Cursor Pagination (`*Connection`):**
   - High-volume lists (`journalVouchers`, `auditEvents`) return `edges { cursor node }` + `pageInfo` + `totalCount` with bounded `first` (`1 <= first <= 100`, default `25`/`50`).
4. **Typed Domain Union Errors (`MutationError`):**
   - Domain rule rejections (`UnbalancedJournalError`, `ClosedPeriodError`, `SegregationOfDutiesError`, `CrossTenantAccessError`, `ValidationError`) return explicit typed GraphQL union variants alongside HTTP 200 GraphQL data, preserving unexpected 500s strictly for infrastructure faults.
5. **Idempotency Keys:**
   - Financial mutations (`postJournalVoucher`, `reverseJournalVoucher`) require client-generated UUID `idempotencyKey` values so network retries in Nigerian mobile/POS connectivity conditions never double-post transactions.

---

## 2. Authentication, Authorization & Query Cost Governance
- **Browser -> Next.js BFF -> Python GraphQL:** Browsers authenticate via HTTP-only `SameSite=Lax`/`Strict` secure session cookies handled by Next.js BFF; Next.js attaches a short-lived signed service/user assertion (`workspaceId`, `userId`, `role`) when calling the Python GraphQL runtime.
- **Role Enforcement (`@requireRole`):**
  - `EXTERNAL_AUDITOR_READONLY` can query `frcnFinancialPackage` and `auditEvents` but is denied all posting, tax-profile, and pack-configuration mutations.
  - `BRANCH_OUTLET_CASHIER` can submit POS-originated vouchers (`postJournalVoucher`), cannot reverse vouchers, certify CAMA Sec 405, or alter tax/pack configurations.
  - `OWNER_MANAGING_DIRECTOR` and `CHARTERED_ACCOUNTANT_CFO` hold administrative + certification permissions, subject to Segregation of Duties (`createdByUserId != approvedByUserId` for dual-control workflows).
- **DoS Protections (`graphql-architect`):**
  - **Max Query Depth:** `8` levels.
  - **Complexity Cap (`@cost`):** `500` cost units per request; heavy multi-year reports (`frcnFinancialPackage`) carry `complexity: 25`.
  - **Production Hardening:** GraphQL introspection and Playground/GraphiQL disabled when `NAIRABOOKS_ENV=production`; persisted queries allowlisted in production builds.
  - **DataLoader Batching:** Resolver fields (`JournalVoucher.lines`, `JournalLine` account metadata, `FiscalPeriod.camaCertification`) use request-scoped DataLoaders to eliminate N+1 queries.

---

## 3. Working Operation Examples

### Example 1: Configure Hybrid Industry Pack (Layer B)
```graphql
mutation ConfigureHotelAndDinerHybrid($input: ConfigureIndustryPackInput!) {
  configureIndustryPack(input: $input) {
    __typename
    ... on WorkspaceIndustryProfile {
      id
      primaryPack
      isHybridMultiUnit
      activePrimitives {
        primitive
        enabled
      }
      kpiWidgets
    }
    ... on ValidationError {
      code
      message
      field
    }
  }
}
```
Variables:
```json
{
  "input": {
    "primaryPack": "CUSTOM_COMPOSABLE",
    "isHybridMultiUnit": true,
    "primitives": [
      "HOSPITALITY_FOLIO_USALI",
      "DINER_RECIPE_TABLE",
      "POS_DAILY_CASHUP"
    ],
    "terminologyOverrides": {
      "customer": "Guest",
      "invoice": "Folio Bill"
    }
  }
}
```

### Example 2: Preview Effective-Dated Nigerian Tax (`7.5%` VAT / `2024 WHT`)
```graphql
query PreviewSubcontractorWht {
  previewNigerianTax(
    input: {
      transactionDate: "2026-11-12"
      regime: WHT_CORPORATE_AND_UNINCORPORATED
      grossAmountNgn: "1500000.00"
      counterpartyHasValidTin: false
      supplyCategoryCode: "CONSTRUCTION_SUBCONTRACT"
    }
  ) {
    ruleVersionCode
    taxableBaseNgn
    appliedRate
    computedTaxNgn
    whtHigherNoTinApplied
  }
}
```
Sample Response:
```json
{
  "data": {
    "previewNigerianTax": {
      "ruleVersionCode": "NG-WHT-2024-V1",
      "taxableBaseNgn": "1500000.00",
      "appliedRate": "0.0400",
      "computedTaxNgn": "60000.00",
      "whtHigherNoTinApplied": true
    }
  }
}
```

### Example 3: Post Balanced Double-Entry Journal Voucher
```graphql
mutation PostBalancedVoucher($input: PostJournalVoucherInput!) {
  postJournalVoucher(input: $input) {
    __typename
    ... on JournalVoucher {
      id
      voucherNumber
      status
      totalDebitNgn
      totalCreditNgn
    }
    ... on UnbalancedJournalError {
      code
      message
      debitTotal
      creditTotal
    }
    ... on ClosedPeriodError {
      code
      message
      periodStatus
    }
  }
}
```

---

## 4. Versioning, Evolution & Contract Testing Policy
- **Expand-and-Contract Evolution:** GraphQL uses continuous field evolution with `@deprecated(reason: "...")` rather than breaking `/v2` endpoints. Existing non-null fields and enum members are never removed without a deprecation window and client usage audit.
- **Contract Testing (`Phase 3` & `Phase 8`):**
  - `tests/test_architecture_contracts.py` statically verifies `schema.graphql` enforces `DecimalMoney`/`DecimalRate` on all monetary/rate fields, zero `Float` leakage, Relay connection pagination, and required operations for `F-01`..`F-10`.
  - Phase 6–8 integration tests run live GraphQL execution & breaking-change schema diffs before merge.
