-- Migration 0001: Initial NairaBooks Relational Schema (PostgreSQL 18+)
-- Enforces strict PostgreSQL typing rules:
--   - UUID PKs generated with PostgreSQL 18 native uuidv7()
--   - BIGINT GENERATED ALWAYS AS IDENTITY for high-volume ordered event logs
--   - NUMERIC(20,2) for money, NUMERIC(10,6) for tax/FX rates (ZERO FLOAT/MONEY types)
--   - TEXT + CHECK(length(...)) (ZERO VARCHAR/CHAR types)
--   - TIMESTAMPTZ everywhere (ZERO timezone-naive TIMESTAMP)

CREATE EXTENSION IF NOT EXISTS btree_gist;

-- 1. Operational Migration Observability Log
CREATE TABLE IF NOT EXISTS schema_migration_runs (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    version TEXT NOT NULL,
    description TEXT NOT NULL,
    checksum_sha256 TEXT NOT NULL CHECK (length(checksum_sha256) = 64),
    strategy TEXT NOT NULL CHECK (strategy IN ('expand', 'backfill', 'contract', 'baseline')),
    status TEXT NOT NULL CHECK (status IN ('running', 'succeeded', 'failed', 'rolled_back')),
    rows_affected BIGINT NOT NULL DEFAULT 0 CHECK (rows_affected >= 0),
    duration_ms INTEGER NOT NULL DEFAULT 0 CHECK (duration_ms >= 0),
    executed_by TEXT NOT NULL DEFAULT current_user,
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ,
    error_detail TEXT,
    CONSTRAINT uq_schema_migration_version_status UNIQUE (version, checksum_sha256)
);

-- 2. Workspaces & Identity Context (Track: auth-rbac-audit-trail_20261112)
CREATE TABLE IF NOT EXISTS workspaces (
    id UUID PRIMARY KEY DEFAULT uuidv7(),
    name TEXT NOT NULL CHECK (length(name) BETWEEN 2 AND 160),
    slug TEXT NOT NULL UNIQUE CHECK (length(slug) BETWEEN 2 AND 80),
    base_currency TEXT NOT NULL DEFAULT 'NGN' CHECK (base_currency IN ('NGN', 'USD', 'GBP', 'EUR')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuidv7(),
    email TEXT NOT NULL UNIQUE CHECK (position('@' in email) > 1),
    full_name TEXT NOT NULL CHECK (length(full_name) BETWEEN 2 AND 160),
    password_hash TEXT NOT NULL CHECK (length(password_hash) >= 32),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS workspace_members (
    id UUID PRIMARY KEY DEFAULT uuidv7(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (
        role IN (
            'OWNER_MANAGING_DIRECTOR',
            'CHARTERED_ACCOUNTANT_CFO',
            'BOOKKEEPER',
            'BRANCH_OUTLET_CASHIER',
            'EXTERNAL_AUDITOR_READONLY'
        )
    ),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_workspace_member UNIQUE (workspace_id, user_id)
);

-- 3. Tax Context (Track: nigerian-tax-rule-engine_20261112)
CREATE TABLE IF NOT EXISTS nigerian_tax_profiles (
    id UUID PRIMARY KEY DEFAULT uuidv7(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    legal_form TEXT NOT NULL CHECK (
        legal_form IN (
            'PRIVATE_LIMITED',
            'PUBLIC_LIMITED',
            'BUSINESS_NAME',
            'LIMITED_LIABILITY_PARTNERSHIP',
            'INCORPORATED_TRUSTEE_NGO'
        )
    ),
    tin_number TEXT CHECK (tin_number IS NULL OR length(tin_number) BETWEEN 8 AND 20),
    vat_registered BOOLEAN NOT NULL DEFAULT FALSE,
    annual_turnover_ngn NUMERIC(20, 2) NOT NULL DEFAULT 0.00 CHECK (annual_turnover_ngn >= 0),
    fixed_assets_ngn NUMERIC(20, 2) NOT NULL DEFAULT 0.00 CHECK (fixed_assets_ngn >= 0),
    state_of_operation TEXT NOT NULL CHECK (length(state_of_operation) BETWEEN 2 AND 40),
    is_professional_services BOOLEAN NOT NULL DEFAULT FALSE,
    effective_from DATE NOT NULL,
    effective_to DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_tax_profile_dates CHECK (effective_to IS NULL OR effective_to > effective_from),
    CONSTRAINT uq_tax_profile_workspace_effective UNIQUE NULLS NOT DISTINCT (
        workspace_id, effective_from
    )
);

-- Global read-only effective-dated statutory Nigerian tax rule matrix
CREATE TABLE IF NOT EXISTS tax_rule_versions (
    id UUID PRIMARY KEY DEFAULT uuidv7(),
    rule_version_code TEXT NOT NULL UNIQUE CHECK (length(rule_version_code) BETWEEN 4 AND 40),
    regime TEXT NOT NULL CHECK (
        regime IN (
            'VAT_STANDARD_7_5',
            'VAT_ZERO_RATED',
            'VAT_EXEMPT',
            'WHT_CORPORATE_AND_UNINCORPORATED',
            'CIT_NIGERIA_TAX_ACT_2025',
            'STATE_HOSPITALITY_CONSUMPTION'
        )
    ),
    jurisdiction TEXT NOT NULL DEFAULT 'FEDERAL' CHECK (length(jurisdiction) BETWEEN 2 AND 40),
    supply_category_code TEXT NOT NULL CHECK (length(supply_category_code) BETWEEN 2 AND 60),
    standard_rate NUMERIC(10, 6) NOT NULL CHECK (standard_rate >= 0 AND standard_rate <= 1),
    no_tin_penalty_rate NUMERIC(10, 6) CHECK (
        no_tin_penalty_rate IS NULL
        OR (no_tin_penalty_rate >= standard_rate AND no_tin_penalty_rate <= 1)
    ),
    effective_period DATERANGE NOT NULL,
    statutory_citation TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT excl_tax_rule_no_overlap EXCLUDE USING gist (
        regime WITH =,
        jurisdiction WITH =,
        supply_category_code WITH =,
        effective_period WITH &&
    )
);

-- 4. Composable Industry Pack Context (Tracks: composable-pack-engine & flagship-industry-packs)
CREATE TABLE IF NOT EXISTS industry_pack_manifests (
    id UUID PRIMARY KEY DEFAULT uuidv7(),
    pack_code TEXT NOT NULL UNIQUE CHECK (
        pack_code IN (
            'RETAIL_ECOMMERCE',
            'WHOLESALE_DISTRIBUTION',
            'MANUFACTURING_LIGHT',
            'CONSTRUCTION_TRADES',
            'PROFESSIONAL_SERVICES',
            'NON_PROFIT',
            'CUSTOM_COMPOSABLE'
        )
    ),
    display_name TEXT NOT NULL CHECK (length(display_name) BETWEEN 3 AND 120),
    is_flagship BOOLEAN NOT NULL DEFAULT TRUE,
    manifest_version TEXT NOT NULL,
    manifest_payload JSONB NOT NULL CHECK (jsonb_typeof(manifest_payload) = 'object'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS workspace_pack_profiles (
    id UUID PRIMARY KEY DEFAULT uuidv7(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    primary_pack_id UUID NOT NULL REFERENCES industry_pack_manifests(id) ON DELETE RESTRICT,
    is_hybrid_multi_unit BOOLEAN NOT NULL DEFAULT FALSE,
    active_primitives TEXT[] NOT NULL CHECK (cardinality(active_primitives) >= 1),
    config JSONB NOT NULL DEFAULT '{}' CHECK (jsonb_typeof(config) = 'object'),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_workspace_pack_profile UNIQUE (workspace_id)
);

-- 5. Ledger Context (Track: nigerian-ifrs-core-ledger_20261112)
CREATE TABLE IF NOT EXISTS fiscal_periods (
    id UUID PRIMARY KEY DEFAULT uuidv7(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    label TEXT NOT NULL CHECK (length(label) BETWEEN 4 AND 40),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'OPEN' CHECK (
        status IN ('OPEN', 'SOFT_LOCKED', 'CLOSED_CAMA_CERTIFIED')
    ),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_fiscal_period_bounds CHECK (end_date >= start_date),
    CONSTRAINT uq_workspace_fiscal_label UNIQUE (workspace_id, label),
    CONSTRAINT excl_workspace_period_overlap EXCLUDE USING gist (
        workspace_id WITH =,
        daterange(start_date, end_date, '[]') WITH &&
    )
);

CREATE TABLE IF NOT EXISTS chart_of_accounts (
    id UUID PRIMARY KEY DEFAULT uuidv7(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    code TEXT NOT NULL CHECK (length(code) BETWEEN 3 AND 24),
    name TEXT NOT NULL CHECK (length(name) BETWEEN 2 AND 140),
    category TEXT NOT NULL CHECK (
        category IN ('ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE', 'RESTRICTED_FUND')
    ),
    ifrs_tag TEXT NOT NULL CHECK (length(ifrs_tag) BETWEEN 2 AND 80),
    source_primitive TEXT,
    is_system_locked BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_workspace_account_code UNIQUE (workspace_id, code)
);

CREATE TABLE IF NOT EXISTS journal_vouchers (
    id UUID PRIMARY KEY DEFAULT uuidv7(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    fiscal_period_id UUID NOT NULL REFERENCES fiscal_periods(id) ON DELETE RESTRICT,
    idempotency_key UUID NOT NULL,
    voucher_number TEXT NOT NULL CHECK (length(voucher_number) BETWEEN 3 AND 40),
    posting_date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'POSTED', 'REVERSED')),
    reference TEXT NOT NULL CHECK (length(reference) BETWEEN 1 AND 160),
    source_module TEXT NOT NULL CHECK (length(source_module) BETWEEN 2 AND 60),
    total_debit_ngn NUMERIC(20, 2) NOT NULL CHECK (total_debit_ngn >= 0),
    total_credit_ngn NUMERIC(20, 2) NOT NULL CHECK (total_credit_ngn >= 0),
    created_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    approved_by_user_id UUID REFERENCES users(id) ON DELETE RESTRICT,
    reversed_by_voucher_id UUID REFERENCES journal_vouchers(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    posted_at TIMESTAMPTZ,
    CONSTRAINT uq_voucher_idempotency UNIQUE (workspace_id, idempotency_key),
    CONSTRAINT uq_voucher_number UNIQUE (workspace_id, voucher_number),
    CONSTRAINT chk_voucher_posted_balanced CHECK (
        status <> 'POSTED' OR (total_debit_ngn = total_credit_ngn AND total_debit_ngn > 0)
    ),
    CONSTRAINT chk_voucher_sod_approval CHECK (
        approved_by_user_id IS NULL OR approved_by_user_id <> created_by_user_id
    )
);

CREATE TABLE IF NOT EXISTS journal_lines (
    id UUID PRIMARY KEY DEFAULT uuidv7(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    voucher_id UUID NOT NULL REFERENCES journal_vouchers(id) ON DELETE RESTRICT,
    account_id UUID NOT NULL REFERENCES chart_of_accounts(id) ON DELETE RESTRICT,
    line_number INTEGER NOT NULL CHECK (line_number >= 1),
    currency TEXT NOT NULL DEFAULT 'NGN' CHECK (currency IN ('NGN', 'USD', 'GBP', 'EUR')),
    exchange_rate_to_ngn NUMERIC(10, 6) NOT NULL DEFAULT 1.000000 CHECK (exchange_rate_to_ngn > 0),
    debit_txn NUMERIC(20, 2) NOT NULL DEFAULT 0.00 CHECK (debit_txn >= 0),
    credit_txn NUMERIC(20, 2) NOT NULL DEFAULT 0.00 CHECK (credit_txn >= 0),
    debit_ngn NUMERIC(20, 2) NOT NULL DEFAULT 0.00 CHECK (debit_ngn >= 0),
    credit_ngn NUMERIC(20, 2) NOT NULL DEFAULT 0.00 CHECK (credit_ngn >= 0),
    fund_or_department_code TEXT CHECK (
        fund_or_department_code IS NULL OR length(fund_or_department_code) <= 40
    ),
    project_or_site_code TEXT CHECK (
        project_or_site_code IS NULL OR length(project_or_site_code) <= 40
    ),
    memo TEXT CHECK (memo IS NULL OR length(memo) <= 280),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_voucher_line_number UNIQUE (voucher_id, line_number),
    CONSTRAINT chk_line_single_sided CHECK (
        (debit_ngn > 0 AND credit_ngn = 0 AND debit_txn > 0 AND credit_txn = 0)
        OR (credit_ngn > 0 AND debit_ngn = 0 AND credit_txn > 0 AND debit_txn = 0)
    )
);

-- Pre-aggregated snapshots for fast FRCN Five-Year Summary & Closed Period trial balances
CREATE TABLE IF NOT EXISTS period_close_snapshots (
    id UUID PRIMARY KEY DEFAULT uuidv7(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    fiscal_period_id UUID NOT NULL REFERENCES fiscal_periods(id) ON DELETE RESTRICT,
    account_id UUID NOT NULL REFERENCES chart_of_accounts(id) ON DELETE RESTRICT,
    closing_debit_ngn NUMERIC(20, 2) NOT NULL DEFAULT 0.00 CHECK (closing_debit_ngn >= 0),
    closing_credit_ngn NUMERIC(20, 2) NOT NULL DEFAULT 0.00 CHECK (closing_credit_ngn >= 0),
    snapshot_hash TEXT NOT NULL CHECK (length(snapshot_hash) = 64),
    generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_period_snapshot_account UNIQUE (fiscal_period_id, account_id)
);

-- 6. CAMA 2020 Section 405 Certification & Immutable Hash-Chained Audit Log
CREATE TABLE IF NOT EXISTS cama_sec405_certifications (
    id UUID PRIMARY KEY DEFAULT uuidv7(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    fiscal_period_id UUID NOT NULL REFERENCES fiscal_periods(id) ON DELETE RESTRICT,
    certified_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    certified_by_name TEXT NOT NULL CHECK (length(certified_by_name) BETWEEN 2 AND 160),
    professional_body TEXT NOT NULL CHECK (professional_body IN ('ICAN', 'ANAN', 'DIRECTOR_CAMA')),
    frc_reg_number TEXT NOT NULL CHECK (length(frc_reg_number) BETWEEN 3 AND 40),
    statement_snapshot_hash TEXT NOT NULL CHECK (length(statement_snapshot_hash) = 64),
    certified_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_cama_cert_period UNIQUE (workspace_id, fiscal_period_id)
);

CREATE TABLE IF NOT EXISTS audit_events (
    sequence_number BIGINT GENERATED ALWAYS AS IDENTITY,
    id UUID PRIMARY KEY DEFAULT uuidv7(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE RESTRICT,
    actor_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    actor_role TEXT NOT NULL,
    action TEXT NOT NULL CHECK (length(action) BETWEEN 3 AND 80),
    entity_type TEXT NOT NULL CHECK (length(entity_type) BETWEEN 2 AND 60),
    entity_id UUID NOT NULL,
    payload_hash TEXT NOT NULL CHECK (length(payload_hash) = 64),
    previous_event_hash TEXT NOT NULL CHECK (length(previous_event_hash) = 64),
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_audit_workspace_seq UNIQUE (workspace_id, sequence_number)
);

-- 7. Transactional Outbox for Asynchronous Exports & Future Microservice/CDC Extraction
CREATE TABLE IF NOT EXISTS outbox_events (
    sequence_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id UUID NOT NULL UNIQUE DEFAULT uuidv7(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    aggregate_type TEXT NOT NULL,
    aggregate_id UUID NOT NULL,
    event_type TEXT NOT NULL,
    payload JSONB NOT NULL CHECK (jsonb_typeof(payload) = 'object'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    processed_at TIMESTAMPTZ,
    retry_count INTEGER NOT NULL DEFAULT 0 CHECK (retry_count >= 0)
);
