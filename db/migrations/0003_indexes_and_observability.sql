-- Migration 0003: Indexing Strategy, Keyset Pagination & Migration Observability Views
-- PostgreSQL does NOT auto-index foreign keys; every FK column is indexed manually below.

-- 1. Foreign Key Indexes
CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace ON workspace_members (workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_user ON workspace_members (user_id);
CREATE INDEX IF NOT EXISTS idx_tax_profiles_workspace ON nigerian_tax_profiles (workspace_id);
CREATE INDEX IF NOT EXISTS idx_pack_profiles_primary ON workspace_pack_profiles (primary_pack_id);
CREATE INDEX IF NOT EXISTS idx_fiscal_periods_workspace ON fiscal_periods (workspace_id);
CREATE INDEX IF NOT EXISTS idx_coa_workspace ON chart_of_accounts (workspace_id);

CREATE INDEX IF NOT EXISTS idx_vouchers_fiscal_period ON journal_vouchers (fiscal_period_id);
CREATE INDEX IF NOT EXISTS idx_vouchers_created_by ON journal_vouchers (created_by_user_id);
CREATE INDEX IF NOT EXISTS idx_vouchers_approved_by ON journal_vouchers (approved_by_user_id)
    WHERE approved_by_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_vouchers_reversed_by ON journal_vouchers (reversed_by_voucher_id)
    WHERE reversed_by_voucher_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_lines_voucher ON journal_lines (voucher_id);
CREATE INDEX IF NOT EXISTS idx_lines_account ON journal_lines (account_id);
CREATE INDEX IF NOT EXISTS idx_snapshots_workspace ON period_close_snapshots (workspace_id);
CREATE INDEX IF NOT EXISTS idx_snapshots_period ON period_close_snapshots (fiscal_period_id);
CREATE INDEX IF NOT EXISTS idx_snapshots_account ON period_close_snapshots (account_id);
CREATE INDEX IF NOT EXISTS idx_cama_cert_period ON cama_sec405_certifications (fiscal_period_id);
CREATE INDEX IF NOT EXISTS idx_cama_cert_user ON cama_sec405_certifications (certified_by_user_id);
CREATE INDEX IF NOT EXISTS idx_audit_actor ON audit_events (actor_user_id);
CREATE INDEX IF NOT EXISTS idx_outbox_workspace ON outbox_events (workspace_id);

-- 2. Access-Path Composite, Covering & Keyset Pagination Indexes
CREATE INDEX IF NOT EXISTS idx_vouchers_workspace_keyset
    ON journal_vouchers (workspace_id, posting_date DESC, id DESC)
    INCLUDE (voucher_number, status, total_debit_ngn, reference);

CREATE INDEX IF NOT EXISTS idx_lines_workspace_account_created
    ON journal_lines (workspace_id, account_id, created_at DESC)
    INCLUDE (debit_ngn, credit_ngn, fund_or_department_code, project_or_site_code);

CREATE INDEX IF NOT EXISTS idx_audit_workspace_keyset
    ON audit_events (workspace_id, sequence_number DESC)
    INCLUDE (action, entity_type, actor_user_id, occurred_at);

CREATE INDEX IF NOT EXISTS idx_tax_rule_lookup
    ON tax_rule_versions (regime, jurisdiction, supply_category_code);

-- 3. Partial Index for Transactional Outbox Worker Polling (SKIP LOCKED)
CREATE INDEX IF NOT EXISTS idx_outbox_pending
    ON outbox_events (created_at ASC, sequence_id ASC)
    WHERE processed_at IS NULL;

-- 4. GIN Indexes for Composable Industry Packs & Active Operational Primitives
CREATE INDEX IF NOT EXISTS idx_pack_profiles_primitives_gin
    ON workspace_pack_profiles USING GIN (active_primitives);

CREATE INDEX IF NOT EXISTS idx_pack_profiles_config_gin
    ON workspace_pack_profiles USING GIN (config jsonb_path_ops);

CREATE INDEX IF NOT EXISTS idx_outbox_payload_gin
    ON outbox_events USING GIN (payload jsonb_path_ops);

-- 5. Migration Observability View
CREATE OR REPLACE VIEW v_migration_observability AS
SELECT
    version,
    strategy,
    status,
    duration_ms,
    rows_affected,
    started_at,
    completed_at,
    EXTRACT(EPOCH FROM (COALESCE(completed_at, now()) - started_at)) AS elapsed_seconds
FROM schema_migration_runs
ORDER BY id DESC;
