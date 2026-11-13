# NairaBooks Code & Module Catalog (`docs/API_AND_MODULE_CATALOG.md`)

> Automatically extracted from source code AST by `scripts/generate_code_docs.py`.

**Total Modules Documented:** 48

## Table of Bounded Contexts
- [`ledger`](#ledger-domain--application)
- [`tax`](#tax-domain--rules)
- [`packs`](#industry-packs--composition)
- [`identity`](#identity-auth--audit)
- [`compliance`](#compliance-privacy--retention)
- [`diagnostics`](#diagnostics--error-tracing)

---

### `src/nairabooks/adapters/migrations.py`
**Purpose:** Zero-downtime SQL migration manifest, checksum verification, and observability.

**Key Classes & Data Structures:**
- **`MigrationSpec`**: Immutable descriptor for a versioned SQL migration and its paired rollback.
- **`MigrationRunRecord`**: Structured observability telemetry event emitted per SQL migration execution. (Methods: `to_json_log`)
- **`MigrationObserver`**: Tracks migration execution metrics, drift checks, and CDC configuration readiness. (Methods: `record_execution, detect_checksum_drift`)

**Key Domain Functions:**
- `compute_file_sha256()`: Compute SHA-256 hex digest using normalized LF bytes for cross-OS determinism.
- `discover_migrations()`: Load forward SQL migrations paired with `rollbacks/{prefix}_rollback.sql`.
- `audit_forward_migration_safety()`: Validate PostgreSQL column typing discipline and zero-downtime destructive DDL rules.
- `debezium_cdc_slot_config()`: Return baseline pgoutput CDC configuration for streaming outbox and audit events.

---

### `src/nairabooks/api/app.py`
**Purpose:** Transport-agnostic HTTP + GraphQL request dispatcher for NairaBooks Slice 1.

**Key Classes & Data Structures:**
- **`LedgerApiApplication`**: Executes REST BFF routes and GraphQL operations against the ledger bounded context. (Methods: `handle_request, handle_request_with_headers`)

---

### `src/nairabooks/api/graphql_guards.py`
**Purpose:** GraphQL query depth and cost guardrails matching docs/API_REFERENCE.md.

**Key Domain Functions:**
- `validate_graphql_query()`: No function description.
- `validate_graphql_query()`: No function description.
- `validate_graphql_query()`: Enforce selection-set depth <= 8 and estimated cost <= 500.

---

### `src/nairabooks/api/http_server.py`
**Purpose:** Stdlib ThreadingHTTPServer runner exposing LedgerApiApplication.

**Key Domain Functions:**
- `create_http_server()`: Create a configured ThreadingHTTPServer bound to LedgerApiApplication.

---

### `src/nairabooks/api/serializers.py`
**Purpose:** Strict JSON parsing and schema.graphql camelCase serializers.

**Key Domain Functions:**
- `strict_json_loads()`: Decode UTF-8 JSON object while prohibiting float literals.
- `format_decimal()`: Serialize Decimal cleanly as fixed-precision numeric string.
- `serialize_money()`: Serialize MoneyAmount matching api/graphql/schema.graphql.
- `serialize_account()`: Serialize ChartOfAccount matching api/graphql/schema.graphql.
- `serialize_period()`: Serialize FiscalPeriod matching api/graphql/schema.graphql.
- `serialize_line()`: Serialize JournalLine matching api/graphql/schema.graphql.
- `serialize_voucher()`: Serialize JournalVoucher matching api/graphql/schema.graphql.
- `serialize_voucher_connection()`: Serialize Relay JournalVoucherConnection.
- `serialize_frcn_package()`: Serialize FrcnFinancialStatementPackage matching schema.graphql.
- `serialize_bank_reconciliation()`: Serialize BankReconciliationReport to camelCase JSON.
- `serialize_fx_revaluation()`: Serialize FxRevaluationReport to camelCase JSON.
- `serialize_tax_profile()`: Serialize NigerianTaxProfile matching api/graphql/schema.graphql.
- `serialize_small_company_evaluation()`: Serialize SmallCompanyEvaluation for Tax Act 2025 threshold radar.
- `serialize_tax_rule_version()`: Serialize statutory TaxRuleVersion row cleanly.
- `serialize_nrs_subtotal()`: Serialize NRS e-invoice TaxSubtotal breakdown.
- `serialize_tax_preview()`: Serialize TaxComputationPreview matching schema.graphql.
- `serialize_multilayer_indirect_tax()`: Serialize MultiLayerIndirectTaxBreakdown for VAT + State + Service Charge + WHT.
- `serialize_primitive_capability()`: Serialize one of the 10 reusable OperationalPrimitive catalog descriptors.
- `serialize_workspace_industry_profile()`: Serialize WorkspaceIndustryProfile matching api/graphql/schema.graphql.
- `serialize_flagship_pack_preset()`: Serialize one of the 6 Nigerian Flagship Reference Pack presets.
- `serialize_auth_context()`: Serialize authenticated actor, active tenant workspace, and RBAC permissions.
- `serialize_auth_session()`: Serialize login/refresh/switch session response without exposing password hashes.
- `serialize_workspace_member()`: Serialize tenant-scoped workspace member & role.
- `serialize_audit_event()`: Serialize AuditEvent matching api/graphql/schema.graphql.
- `serialize_audit_event_connection()`: Serialize Relay AuditEventConnection matching api/graphql/schema.graphql.
- `serialize_audit_verification()`: Serialize SHA-256 hash chain integrity report.
- `serialize_cama_certification()`: Serialize CamaSec405Certification matching api/graphql/schema.graphql.
- `serialize_standard_transaction_result()`: Serialize the outcome of posting a standard operational transaction.
- `serialize_domain_error()`: Map domain errors to HTTP status codes and schema.graphql MutationError shapes.

---

### `src/nairabooks/audit/adapters/in_memory.py`
**Purpose:** Thread-safe append-only in-memory AuditStore & CAMA Sec 405 certification adapter.

**Key Classes & Data Structures:**
- **`InMemoryAuditStore`**: Thread-safe append-only audit store enforcing SHA-256 hash chaining (SEC-REQ-05). (Methods: `append_event, list_events, list_events_ascending, update_event, delete_event`)

---

### `src/nairabooks/audit/adapters/postgres.py`
**Purpose:** Parameterized PostgreSQL 18 SQL builders for audit_events & cama_sec405_certifications.

**Key Classes & Data Structures:**
- **`PostgresAuditSqlBuilder`**: Build parameterized SQL aligned with migrations 0001 and 0002 (zero interpolation). (Methods: `insert_audit_event, select_audit_events_keyset, insert_cama_certification`)

---

### `src/nairabooks/audit/application/ports.py`
**Purpose:** Hexagonal output ports for append-only audit events and CAMA Sec 405 certifications.

**Key Classes & Data Structures:**
- **`AuditStore`**: Append-only audit trail and statutory certification persistence port. (Methods: `append_event, list_events, list_events_ascending, update_event, delete_event`)

---

### `src/nairabooks/audit/application/use_cases.py`
**Purpose:** Application use cases for immutable hash-chained audit logs and CAMA Sec 405 sign-off.

**Key Classes & Data Structures:**
- **`RecordAuditEventCommand`**: Command to append an immutable hash-chained audit entry.
- **`AuditEventEdge`**: Relay GraphQL connection edge carrying an opaque keyset cursor.
- **`AuditEventConnection`**: Relay GraphQL paginated connection matching schema.graphql AuditEventConnection.
- **`CertifyCamaSec405Command`**: Command for CAMA 2020 Section 405 period sign-off and immutable lock.
- **`RecordAuditEventUseCase`**: Append an immutable SHA-256 hash-chained audit event. (Methods: `execute`)
- **`ListAuditEventsUseCase`**: Relay cursor-paginated query for workspace audit events (bounded 1..100). (Methods: `execute`)
- **`VerifyAuditChainUseCase`**: Verify cryptographic hash chain continuity for a workspace's audit trail. (Methods: `execute`)
- **`CertifyCamaSec405UseCase`**: Sign off and close a fiscal period under CAMA 2020 Section 405 with SoD + Audit Log. (Methods: `execute`)

---

### `src/nairabooks/audit/domain/errors.py`
**Purpose:** Domain errors for the NairaBooks immutable audit log and CAMA Sec 405 context.

**Key Classes & Data Structures:**
- **`ImmutableAuditLogError`**: Raised when any caller attempts to update or delete an append-only audit event.

---

### `src/nairabooks/audit/domain/models.py`
**Purpose:** Pure domain models for tamper-evident SHA-256 hash-chained audit logs & CAMA Sec 405.

**Key Classes & Data Structures:**
- **`ProfessionalBody`**: Nigerian statutory certification bodies matching SQL CHECK constraint.
- **`AuditEvent`**: Immutable append-only hash-chained audit event (SEC-REQ-05).
- **`AuditChainVerificationResult`**: Result of verifying per-workspace hash chain integrity.
- **`CamaSec405Certification`**: Statutory CAMA 2020 Section 405 period financial statement sign-off record.

**Key Domain Functions:**
- `compute_payload_hash()`: Compute canonical 64-char SHA-256 digest of an audit payload with secret redaction.
- `compute_event_hash()`: Compute deterministic SHA-256 chain hash linking this event to previous_event_hash.
- `verify_audit_chain()`: Verify sequence contiguity, previous_event_hash links, and SHA-256 digests.

---

### `src/nairabooks/auth/adapters/in_memory.py`
**Purpose:** Thread-safe in-memory AuthStore and seeded multi-tenant Nigerian persona fixture.

**Key Classes & Data Structures:**
- **`InMemoryAuthStore`**: Thread-safe in-memory AuthStore implementing tenant-scoped membership lookups. (Methods: `save_workspace, find_workspace, list_workspaces_for_user, save_user, find_user_by_id`)
- **`SeededAuthIds`**: Deterministic UUIDs for NairaBooks seeded Nigerian multi-tenant workspace personas.

**Key Domain Functions:**
- `create_seeded_demo_auth_store()`: Seed two workspaces and five Nigerian RBAC roles (Owner, CFO, Clerk, Cashier, Auditor).

---

### `src/nairabooks/auth/adapters/postgres.py`
**Purpose:** Parameterized PostgreSQL 18 SQL builders for workspaces, users, and RLS memberships.

**Key Classes & Data Structures:**
- **`PostgresAuthSqlBuilder`**: Build parameterized SQL aligned with migrations 0001 and 0002 (zero interpolation). (Methods: `select_user_by_email, select_member, upsert_member`)

---

### `src/nairabooks/auth/application/ports.py`
**Purpose:** Hexagonal output ports for NairaBooks multi-tenant auth & session storage.

**Key Classes & Data Structures:**
- **`AuthStore`**: Persistence port for workspaces, users, RBAC memberships, and rotating refresh tokens. (Methods: `save_workspace, find_workspace, list_workspaces_for_user, save_user, find_user_by_id`)

---

### `src/nairabooks/auth/application/use_cases.py`
**Purpose:** Application use cases for authentication, session rotation, RBAC & workspace switching.

**Key Classes & Data Structures:**
- **`LoginCommand`**: Credentials & metadata for workspace-scoped authentication.
- **`SessionResult`**: Authenticated session response carrying context, tokens, and workspace roster.
- **`AssignMemberRoleCommand`**: Owner command to add or update a member's RBAC role inside a workspace.
- **`LoginUseCase`**: Authenticate email + password with rate limiting and mint short-lived tokens. (Methods: `execute`)
- **`RefreshSessionUseCase`**: Rotate refresh token atomically with compromised-family reuse detection. (Methods: `execute`)
- **`LogoutUseCase`**: Revoke refresh token on explicit sign-out. (Methods: `execute`)
- **`ResolveAuthContextUseCase`**: Verify an access token and re-validate active tenant membership from AuthStore. (Methods: `execute`)
- **`SwitchWorkspaceUseCase`**: Switch active tenant context only when user holds active membership in target workspace. (Methods: `execute`)
- **`ManageWorkspaceMemberUseCase`**: List or assign RBAC roles within the active workspace (Owner only). (Methods: `list_members, assign_member`)

---

### `src/nairabooks/auth/domain/errors.py`
**Purpose:** Authentication, authorization, and rate-limiting domain errors.

**Key Classes & Data Structures:**
- **`AuthenticationError`**: Raised when credentials, session, or bearer token verification fails (HTTP 401).
- **`AuthorizationError`**: Raised when an authenticated actor lacks the required RBAC role/permission (HTTP 403).
- **`RateLimitExceededError`**: Raised when authentication attempts exceed the configured window ceiling (HTTP 429).

---

### `src/nairabooks/auth/domain/models.py`
**Purpose:** Pure domain models for NairaBooks multi-tenant identity, sessions, and RBAC.

**Key Classes & Data Structures:**
- **`ActorRole`**: Built-in Nigerian accounting & operational roles matching schema.graphql & SQL.
- **`Permission`**: Fine-grained RBAC capability permissions.
- **`Workspace`**: Tenant organization workspace.
- **`UserAccount`**: Registered user identity with scrypt/Argon2 password hash (never plaintext).
- **`WorkspaceMember`**: Tenant-scoped role assignment binding a user to a workspace.
- **`RefreshTokenRecord`**: Hashed refresh token record supporting rotation & reuse family revocation.
- **`AuthenticatedContext`**: Verified server-side actor + tenant execution context (SEC-REQ-01).
- **`IssuedTokenPair`**: Short-lived access token + opaque rotating refresh token.

---

### `src/nairabooks/auth/domain/rbac.py`
**Purpose:** RBAC role-permission matrix, tenant boundary guard, and Segregation of Duties.

**Key Domain Functions:**
- `permissions_for_role()`: Return immutable set of permissions granted to a Nigerian accounting role.
- `has_permission()`: Return True if role grants permission.
- `require_permission()`: Enforce fine-grained RBAC permission; raise AuthorizationError if denied.
- `require_roles()`: Enforce explicit GraphQL @requireRole role list.
- `enforce_tenant_isolation()`: Guarantee tenant boundary: reject spoofed or cross-tenant workspace references.
- `enforce_segregation_of_duties()`: Block unilateral self-approval/certification when dual-control applies (SEC-REQ-06).

---

### `src/nairabooks/auth/domain/security.py`
**Purpose:** Password strength, memory-hard scrypt KDF hashing, and HMAC token lifecycle.

**Key Classes & Data Structures:**
- **`PasswordHasher`**: Memory-hard scrypt password hasher using PHC-formatted salted digests. (Methods: `hash_password, verify_password`)
- **`AccessTokenClaims`**: Verified claims extracted from an access token.
- **`TokenService`**: Issues and verifies short-lived HMAC-SHA256 JWT-style tokens and rotating refresh tokens. (Methods: `now, issue_token_pair, verify_access_token`)

**Key Domain Functions:**
- `validate_password_strength()`: Enforce OWASP ASVS password length & complexity rules.
- `hash_refresh_token()`: Return 64-char SHA-256 hex digest of an opaque refresh token.
- `resolve_auth_secret()`: Resolve signing key strictly from explicit/env config; fail closed in production.

---

### `src/nairabooks/compliance/privacy.py`
**Purpose:** Privacy by Design, Data Subject Rights (DSR) & Statutory Retention Engine.

**Key Classes & Data Structures:**
- **`DataSubjectProfile`**: No class description.
- **`DsarExportBundle`**: No class description.
- **`PrivacyComplianceManager`**: Handles NDPA 2023 / GDPR DSR operations with CAMA 2020 retention reconciliation. (Methods: `export_dsar_bundle, anonymize_user, is_within_cama_statutory_retention`)

---

### `src/nairabooks/config.py`
**Purpose:** Environment-driven settings for NairaBooks with Decimal-safe monetary defaults.

**Key Classes & Data Structures:**
- **`NairaBooksSettings`**: Application settings loaded from ``NAIRABOOKS_`` environment variables.

**Key Domain Functions:**
- `get_settings()`: Return cached application settings instance.

---

### `src/nairabooks/diagnostics/error_tracer.py`
**Purpose:** Diagnostic and Trace Analysis Engine for NairaBooks.

**Key Classes & Data Structures:**
- **`DiagnosticFrame`**: No class description.
- **`DiagnosticTrace`**: No class description.
- **`DiagnosticErrorDetective`**: Root-cause analyzer and remediation counselor. (Methods: `analyze_exception`)

**Key Domain Functions:**
- `sanitize_trace_message()`: Mask credentials, bearer tokens, and sensitive secrets from trace logs.

---

### `src/nairabooks/ledger/adapters/in_memory.py`
**Purpose:** In-memory transactional LedgerStore adapter and default SME seed helper.

**Key Classes & Data Structures:**
- **`InMemoryLedgerStore`**: Thread-safe in-memory transactional adapter enforcing tenant RLS semantics. (Methods: `transaction, seed_account, seed_period, find_account, list_accounts`)

**Key Domain Functions:**
- `create_seeded_demo_store()`: Seed realistic Nigerian SME accounts, fiscal periods, and opening entry.

---

### `src/nairabooks/ledger/adapters/postgres.py`
**Purpose:** Parameterized PostgreSQL 18 SQL statement builders with RLS GUC scoping.

**Key Classes & Data Structures:**
- **`PostgresLedgerSqlBuilder`**: Build parameterized SQL aligned with migrations 0001 and 0002 (zero interpolation). (Methods: `set_workspace_context, select_accounts, select_vouchers_keyset, insert_voucher, mark_voucher_reversed`)

---

### `src/nairabooks/ledger/application/ports.py`
**Purpose:** Hexagonal output ports for the NairaBooks IFRS ledger application layer.

**Key Classes & Data Structures:**
- **`LedgerStore`**: Transactional persistence port scoped strictly by workspace_id. (Methods: `transaction, find_account, seed_account, list_accounts, find_period`)

**Key Domain Functions:**
- `iter_empty_context()`: Yield helper used by in-memory transaction helpers.

---

### `src/nairabooks/ledger/application/use_cases.py`
**Purpose:** Ledger application use cases orchestrating domain invariants and ports.

**Key Classes & Data Structures:**
- **`PostJournalVoucherCommand`**: Command payload for posting a balanced double-entry journal voucher.
- **`ReverseJournalVoucherCommand`**: Command payload for creating an immutable offsetting reversal voucher.
- **`JournalVoucherEdge`**: Relay GraphQL connection edge carrying an opaque keyset cursor.
- **`PageInfo`**: Relay GraphQL PageInfo pagination metadata.
- **`JournalVoucherConnection`**: Relay GraphQL paginated connection for JournalVoucher records.
- **`PostJournalVoucherUseCase`**: Validate fiscal period, accounts, idempotency, and double-entry balance before posting. (Methods: `execute`)
- **`ReverseJournalVoucherUseCase`**: Reverse a POSTED voucher cleanly via an offsetting entry within an OPEN period. (Methods: `execute`)
- **`ListChartOfAccountsUseCase`**: Query active or historical accounts scoped to the active workspace. (Methods: `execute`)
- **`ListFiscalPeriodsUseCase`**: Query fiscal periods and lock statuses for the active workspace. (Methods: `execute`)
- **`ListJournalVouchersUseCase`**: Relay cursor-paginated journal voucher query bounded to 1..100 items per page. (Methods: `execute`)
- **`GenerateTrialBalanceUseCase`**: Compute a workspace-scoped FRCN Trial Balance for a single fiscal period. (Methods: `execute`)
- **`GenerateProfitAndLossUseCase`**: Compute IFRS Statement of Profit or Loss for a single fiscal period. (Methods: `execute`)
- **`GenerateFinancialPositionUseCase`**: Compute cumulative IFRS Statement of Financial Position up to period end date. (Methods: `execute`)
- **`GenerateFrcnPackageUseCase`**: Assemble full FRCN IFRS + Other National Disclosures package for a workspace period. (Methods: `execute`)
- **`ReconcileBankStatementUseCase`**: Reconcile bank/POS settlement lines against workspace GL cash movements. (Methods: `execute`)
- **`CalculateFxRevaluationUseCase`**: Compute IAS 21 closing FX revaluation for a domiciliary/foreign monetary account. (Methods: `execute`)
- **`StandardTransactionLineItemInput`**: Operational line item passed from the Transactions Hub composer.
- **`PostStandardTransactionCommand`**: Command payload to post any of the 27 standard business transaction types.
- **`StandardTransactionPostingResult`**: Result returned after successfully posting a standard operational transaction.
- **`PostStandardTransactionUseCase`**: Plan double-entry lines for standard operational transactions and post to LedgerStore. (Methods: `execute`)

---

### `src/nairabooks/ledger/domain/errors.py`
**Purpose:** Typed domain errors for the NairaBooks IFRS ledger bounded context.

**Key Classes & Data Structures:**
- **`LedgerDomainError`**: Base error for all ledger invariant and boundary violations.
- **`ValidationError`**: Raised when an input value violates structural or domain validation.
- **`UnbalancedJournalError`**: Raised when a journal voucher's functional NGN debits and credits do not match.
- **`ClosedPeriodError`**: Raised when posting or reversing targets a soft-locked or closed fiscal period.
- **`CrossTenantAccessError`**: Raised when a workspace tenant boundary is violated.
- **`SegregationOfDutiesError`**: Raised when a voucher preparer attempts to self-approve or approve when disallowed.
- **`ImmutableVoucherError`**: Raised when attempting to modify, delete, or double-reverse an immutable voucher.

---

### `src/nairabooks/ledger/domain/models.py`
**Purpose:** Pure double-entry journal domain models and invariants.

**Key Classes & Data Structures:**
- **`AccountCategory`**: IFRS-aligned chart of accounts classifications.
- **`PeriodStatus`**: Fiscal period lock lifecycle matching SQL and GraphQL enums.
- **`ChartOfAccount`**: Tenant-scoped general ledger account tagged for IFRS statements.
- **`FiscalPeriod`**: Workspace fiscal period enforcing posting window and lock status. (Methods: `contains, ensure_accepts_posting, close_cama_certified`)
- **`VoucherStatus`**: Lifecycle status of a double-entry journal voucher.
- **`JournalLineInput`**: Validated single-sided journal entry line command prior to posting. (Methods: `to_line_money`)
- **`JournalLine`**: Immutable posted double-entry journal line.
- **`JournalVoucher`**: Immutable double-entry journal voucher guaranteeing Debits == Credits in NGN. (Methods: `post, build_reversal, mark_reversed`)

---

### `src/nairabooks/ledger/domain/money.py`
**Purpose:** Strict Decimal monetary primitives for NGN and approved FX currencies.

**Key Classes & Data Structures:**
- **`CurrencyCode`**: Supported transaction currencies aligned with the GraphQL and SQL enums.
- **`Money`**: Immutable monetary value paired with functional NGN equivalent. (Methods: `of, zero, is_positive`)

**Key Domain Functions:**
- `parse_decimal()`: Parse an exact numeric input without permitting binary floats.

---

### `src/nairabooks/ledger/domain/reconciliation.py`
**Purpose:** Pure Bank/POS reconciliation matching and closing FX revaluation calculations.

**Key Classes & Data Structures:**
- **`ReconciliationStatus`**: Status of a matched bank/POS statement line against GL cash movement.
- **`BankStatementLine`**: Imported Nigerian bank, NIP, or POS settlement statement line. (Methods: `gross_amount_ngn`)
- **`LedgerCashMovement`**: Flattened cash-side journal line eligible for bank reconciliation.
- **`ReconciliationMatch`**: Matched pairing between an external bank/POS line and a GL cash movement.
- **`BankReconciliationReport`**: Outcome summary of reconciling imported bank/POS lines against cash GL.
- **`FxRevaluationReport`**: Unrealized gain/loss calculation revaluing an FX monetary balance to CBN closing rate.

**Key Domain Functions:**
- `reconcile_bank_statement()`: Match imported Nigerian NIP/POS/bank statement lines 1-to-1 against GL movements.
- `compute_fx_revaluation()`: Compute IAS 21 closing FX revaluation against functional NGN carrying balance.

---

### `src/nairabooks/ledger/domain/statements.py`
**Purpose:** Pure FRCN IFRS financial statement builders (Trial Balance, P&L, Financial Position).

**Key Classes & Data Structures:**
- **`TrialBalanceRow`**: Normalized net debit/credit balance row per account matching schema.graphql.
- **`TrialBalanceReport`**: Balanced Trial Balance for a single fiscal period.
- **`StatementLineItem`**: Single IFRS statement account line expressed in normal presentation sign.
- **`StatementOfProfitOrLoss`**: IFRS Statement of Profit or Loss for a fiscal period.
- **`StatementOfFinancialPosition`**: Point-in-time IFRS Balance Sheet (cumulative up to period.end_date).
- **`ValueAddedStatementRow`**: FRCN Other National Disclosure: Statement of Value Added row.
- **`FiveYearMetricColumn`**: FRCN Other National Disclosure: Five-Year Financial Summary column.
- **`FrcnFinancialStatementPackage`**: Complete FRCN IFRS + Nigerian Other National Disclosures financial package. (Methods: `to_trial_balance_csv`)

**Key Domain Functions:**
- `build_trial_balance()`: Build a period Trial Balance matching debits == credits in NGN.
- `build_profit_and_loss()`: Build IFRS Statement of Profit or Loss strictly for period date window.
- `build_financial_position()`: Build cumulative IFRS Statement of Financial Position as at period.end_date.
- `build_value_added_statement()`: Compute Nigerian Statement of Value Added reconciling creation to distribution.
- `build_five_year_summary()`: Compute up to 5 chronological periods of Five-Year Financial Summary metrics.
- `build_frcn_statement_package()`: Assemble full FRCN IFRS + Other National Disclosures statement package with SHA-256.

---

### `src/nairabooks/ledger/domain/transaction_posting.py`
**Purpose:** Domain logic for translating standard Sage-inspired business transactions.

**Key Classes & Data Structures:**
- **`StandardPlannedLine`**: Balanced double-entry line targeting a ChartOfAccount code.
- **`StandardTransactionPostingPlanner`**: Helper service for planning and inspecting standard transaction postings. (Methods: `plan`)

**Key Domain Functions:**
- `plan_standard_transaction_lines()`: Translate a high-level operational transaction into balanced IFRS debit/credit lines.

---

### `src/nairabooks/main.py`
**Purpose:** Starter catalog & health check metadata for NairaBooks (Phase 2 scaffold).

**Key Classes & Data Structures:**
- **`FlagshipPackSummary`**: Metadata descriptor for a NairaBooks Flagship Reference Industry Pack.

**Key Domain Functions:**
- `get_pack_catalog()`: Return the initial Layer B Flagship Reference Packs plus Universal Custom Builder flag.
- `health_status()`: Return starter health & regulatory baseline status for diagnostics.

---

### `src/nairabooks/packs/adapters/in_memory.py`
**Purpose:** In-memory adapter for IndustryPackManifest and WorkspaceIndustryProfile storage.

**Key Classes & Data Structures:**
- **`InMemoryPackStore`**: In-memory persistence for declarative pack manifests and workspace profiles. (Methods: `seed_default_workspace, save_manifest, get_manifest, list_manifests, get_workspace_pack_profile`)

---

### `src/nairabooks/packs/adapters/postgres.py`
**Purpose:** Parameterized PostgreSQL 18 SQL query builders for industry_pack_manifests & profiles.

**Key Classes & Data Structures:**
- **`PostgresPackSqlBuilder`**: Build parameterized SQL aligned with migration 0001_initial_core_schema.sql. (Methods: `upsert_manifest, select_workspace_pack_profile, upsert_workspace_pack_profile`)

---

### `src/nairabooks/packs/application/ports.py`
**Purpose:** Application ports for declarative industry packs and workspace industry profiles.

**Key Classes & Data Structures:**
- **`IndustryPackStore`**: Repository abstraction for industry pack manifests and workspace profiles. (Methods: `save_manifest, get_manifest, list_manifests, get_workspace_pack_profile, save_workspace_pack_profile`)

---

### `src/nairabooks/packs/application/use_cases.py`
**Purpose:** Application use cases for composing, validating, and applying industry packs.

**Key Classes & Data Structures:**
- **`ComposeCustomPackCommand`**: Preview command for validating and assembling a custom/hybrid business pack.
- **`ConfigureIndustryPackCommand`**: Command aligned with ConfigureIndustryPackInput in api/graphql/schema.graphql.
- **`ListPrimitiveCapabilitiesUseCase`**: Return all 10 reusable operational capability primitives. (Methods: `execute`)
- **`GetWorkspacePackProfileUseCase`**: Return the active workspace's composed WorkspaceIndustryProfile. (Methods: `execute`)
- **`ComposeCustomPackPreviewUseCase`**: Validate and preview a custom or hybrid multi-unit pack without persisting. (Methods: `execute`)
- **`ConfigureIndustryPackUseCase`**: Compose, persist, and apply an Industry Pack's IFRS CoA onto the workspace ledger. (Methods: `execute`)
- **`ApplyFlagshipPackCommand`**: Apply one of the 6 Flagship Reference Packs onto a workspace.
- **`PostPackOperationCommand`**: Execute a Flagship operational workflow and post balanced IFRS entries.
- **`ListFlagshipPacksUseCase`**: Return all 6 Nigerian Flagship Reference Pack starter templates. (Methods: `execute`)
- **`ApplyFlagshipPackUseCase`**: Resolve a Flagship Pack preset, configure the workspace, and seed its IFRS accounts. (Methods: `execute`)
- **`PostPackOperationUseCase`**: Compute balanced operational accounting lines and post them to LedgerStore. (Methods: `execute_with_plan, execute`)

**Key Domain Functions:**
- `normalize_primitives()`: Parse and deduplicate GraphQL/REST OperationalPrimitive strings.

---

### `src/nairabooks/packs/domain/composer.py`
**Purpose:** Declarative primitive registry, conflict validator, and hybrid pack composer.

**Key Classes & Data Structures:**
- **`PrimitiveCapabilitySpec`**: Reusable operational building block supplying accounts, KPIs, and vocabulary.

**Key Domain Functions:**
- `validate_pack_manifest()`: Validate declarative 6-section pack integrity and fail loudly on gaps/conflicts.
- `merge_pack_coa()`: Merge Chart of Accounts across 1+ packs, failing loudly on incompatible account codes.
- `build_manifest_from_primitives()`: Assemble a validated declarative 6-section IndustryPackManifest from primitives.
- `compose_hybrid_pack()`: Merge multiple packs into one WorkspaceIndustryProfile without CoA/IFRS collisions.

---

### `src/nairabooks/packs/domain/flagship.py`
**Purpose:** Catalog of the 6 Flagship Nigerian Industry Pack reference presets.

**Key Classes & Data Structures:**
- **`FlagshipPackPreset`**: Opinionated starter template for one of the 6 core Nigerian industry verticals.

---

### `src/nairabooks/packs/domain/models.py`
**Purpose:** Pydantic declarative schemas and domain models for NairaBooks Industry Packs.

**Key Classes & Data Structures:**
- **`FlagshipPackCode`**: Supported Flagship Reference Packs + Custom Composable Builder aligned with GraphQL.
- **`OperationalPrimitive`**: Ten reusable operational capability primitives aligned with api/graphql/schema.graphql.
- **`PackAccountBlueprint`**: Section 1: Declarative IFRS Chart of Accounts entry contributed by a pack or primitive.
- **`PackTaxDefaults`**: Section 2: Declarative Nigerian tax defaults attached to an industry profile.
- **`PackDimensionSpec`**: Section 5: Analytical reporting dimension (Branch, Site, Donor Fund, Property Wing).
- **`PackKpiDefinition`**: Section 6: Industry KPI widget specification.
- **`IndustryPackManifest`**: 6-Section declarative IndustryPack blueprint validated before composition.
- **`PackModuleDescriptor`**: Enabled primitive descriptor matching GraphQL PackModuleDescriptor.
- **`WorkspaceIndustryProfile`**: Workspace-level composed Industry Profile aligned with schema.graphql.

---

### `src/nairabooks/packs/domain/operations.py`
**Purpose:** Deterministic operational posting planners for all Flagship & Template Packs.

**Key Classes & Data Structures:**
- **`PackOperationType`**: Supported Flagship & Template Pack operational posting workflows.
- **`PackPlannedLine`**: Balanced double-entry line targeting an account code in Workspace ChartOfAccounts.
- **`PackOperationPostingPlan`**: Computed KPI summary and kobo-balanced IFRS journal plan for a pack workflow.
- **`RetailPosCashupInput`**: Daily Z-report inputs for Retail & E-Commerce POS settlement + COGS.
- **`WholesaleLandedPurchaseInput`**: Vendor stock receipt + shipping/clearing capitalization inputs (IAS 2).
- **`ManufacturingBomRunInput`**: BOM batch completion inputs converting raw inputs + WIP -> Finished Goods.
- **`ConstructionJobProgressInput`**: Construction site progress billing, material issues, retention & 2%/5% WHT.
- **`ProfessionalTimeBillingInput`**: Advisory time realization, retainer drawdown, reimbursements & WHT credit.
- **`NonProfitGrantActivityInput`**: Restricted vs unrestricted donor grant tranche & budget-vs-actual spend.
- **`HospitalityFolioInput`**: USALI guest folio settlement with 7.5% VAT, 5% State Levy & Service Charge.
- **`DinerServiceShiftInput`**: Diner shift POS, recipe COGS, spoilage & state hospitality consumption levy.

**Key Domain Functions:**
- `build_retail_pos_cashup_plan()`: Compute kobo-balanced double-entry lines for daily POS cash/card settlement & COGS.
- `build_wholesale_landed_purchase_plan()`: Capitalize vendor stock + shipping/clearing into IAS 2 warehouse inventory.
- `build_manufacturing_bom_plan()`: Convert raw materials + direct conversion cost through WIP into finished goods + scrap.
- `build_construction_job_progress_plan()`: Compute site progress valuation, client/subcontractor retention, and 2%/5% WHT lines.
- `build_professional_time_billing_plan()`: Compute advisory time realization, retainer drawdown, reimbursements & WHT credit.
- `build_nonprofit_grant_activity_plan()`: Compute restricted vs unrestricted grant accounting & budget-vs-actual utilization.
- `build_hospitality_folio_plan()`: Compute USALI room metrics, 7.5% VAT, 5% State Levy & 10% Fiduciary Service Charge.
- `build_diner_service_shift_plan()`: Compute Diner table shift F&B sales, recipe COGS, kitchen spoilage & state levy.

---

### `src/nairabooks/tax/adapters/in_memory.py`
**Purpose:** In-memory adapter for workspace Nigerian tax profiles and effective-dated rule tables.

**Key Classes & Data Structures:**
- **`InMemoryTaxStore`**: Thread-safe/deterministic in-memory TaxProfileStore for tests and local API preview. (Methods: `seed_default_workspace, save_tax_profile, get_active_tax_profile, list_tax_rules`)

---

### `src/nairabooks/tax/adapters/postgres.py`
**Purpose:** Parameterized PostgreSQL 18 SQL query builders for nigerian_tax_profiles & tax_rule_versions.

**Key Classes & Data Structures:**
- **`PostgresTaxSqlBuilder`**: Build parameterized SQL aligned with migration 0001_initial_core_schema.sql. (Methods: `select_active_tax_profile, upsert_tax_profile, select_effective_tax_rule`)

---

### `src/nairabooks/tax/application/ports.py`
**Purpose:** Application ports for workspace tax profiles and statutory rule storage.

**Key Classes & Data Structures:**
- **`TaxProfileStore`**: Repository abstraction isolating tax rule storage from domain calculations. (Methods: `get_active_tax_profile, save_tax_profile, list_tax_rules`)

---

### `src/nairabooks/tax/application/use_cases.py`
**Purpose:** Application use cases for Nigeria Tax Act 2025, 2024 WHT, VAT, and NRS calculations.

**Key Classes & Data Structures:**
- **`UpdateTaxProfileCommand`**: Command to update and version a workspace's Nigerian entity tax profile.
- **`PreviewNigerianTaxCommand`**: Command aligned with PreviewNigerianTaxInput (SEC-REQ-04: no caller rate override).
- **`CalculateMultiLayerIndirectTaxCommand`**: Command for combined VAT + State Consumption + Fiduciary Service Charge + WHT computation.
- **`GetTaxProfileUseCase`**: Return active tax profile and Tax Act 2025 threshold evaluation. (Methods: `execute`)
- **`UpdateTaxProfileUseCase`**: Validate, persist, and evaluate a workspace Nigerian tax profile update. (Methods: `execute`)
- **`ListTaxRulesUseCase`**: List effective-dated statutory Nigerian tax rule versions. (Methods: `execute`)
- **`PreviewNigerianTaxUseCase`**: Compute a single Nigerian statutory tax preview from effective-dated rules. (Methods: `execute`)
- **`CalculateMultiLayerIndirectTaxUseCase`**: Compute concurrent Federal VAT, State Levy, Service Charge, WHT, & NRS subtotals. (Methods: `execute`)

---

### `src/nairabooks/tax/domain/calculator.py`
**Purpose:** Pure Nigerian VAT, 2024 WHT, State Consumption, Fiduciary Service Charge & NRS calculators.

**Key Classes & Data Structures:**
- **`TransactionDirection`**: Determines whether WHT is receivable credit (SALES) or payable deduction (PURCHASE).
- **`NrsTaxSubtotal`**: NRS e-invoice TaxSubtotal breakdown separating Federal VAT, WHT, and State levies.
- **`TaxAccountAllocation`**: Ledger liability or asset account allocation for balanced double-entry tax posting.
- **`TaxComputationPreview`**: Server-computed single-regime Nigerian tax computation aligned with schema.graphql.
- **`MultiLayerIndirectTaxBreakdown`**: Concurrent Federal VAT + State Consumption + Fiduciary Service Charge + WHT computation.

**Key Domain Functions:**
- `compute_tax_preview()`: Calculate Nigerian statutory tax strictly from effective-dated rules (SEC-REQ-04).
- `calculate_multi_layer_indirect_tax()`: Compute concurrent Federal VAT + State Consumption + Service Charge + WHT with GL splits.

---

### `src/nairabooks/tax/domain/models.py`
**Purpose:** Domain models for Nigerian tax profiles, statutory rule versions, and thresholds.

**Key Classes & Data Structures:**
- **`NigerianLegalForm`**: Statutory Nigerian entity legal structures aligned with GraphQL and SQL enums.
- **`TaxRegimeType`**: Effective-dated Nigerian tax regimes aligned with schema.graphql.
- **`ThresholdAlertLevel`**: Radar status relative to Nigeria Tax Act 2025 small-company caps.
- **`TaxRuleVersion`**: Immutable statutory Nigerian tax rule version bounded by effective dates. (Methods: `applies_on`)
- **`SmallCompanyEvaluation`**: Result of evaluating Nigeria Tax Act 2025 small-company CIT & radar thresholds.
- **`NigerianTaxProfile`**: Workspace-scoped Nigerian entity tax profile. (Methods: `create, has_valid_tin, is_professional_services_excluded_from_small_exempt, is_small_business_cit_exempt`)

**Key Domain Functions:**
- `pct_utilization()`: Compute percentage utilization against a statutory NGN cap rounded to 2dp.

---

### `src/nairabooks/tax/domain/rules.py`
**Purpose:** Effective-dated Nigerian tax rule tables and small-company eligibility engine.

**Key Classes & Data Structures:**
- **`TaxRuleSet`**: In-memory effective-dated Nigerian statutory rule catalog with non-overlap validation. (Methods: `rules, resolve_rule`)

**Key Domain Functions:**
- `evaluate_small_company_eligibility()`: Evaluate small-company 0% CIT eligibility & turnover threshold radar under statutory laws.

---
