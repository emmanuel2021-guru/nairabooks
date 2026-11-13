-- Rollback 0002: Remove RLS policies and accounting invariant triggers
DROP TRIGGER IF EXISTS trg_immutable_posted_lines ON journal_lines;
DROP FUNCTION IF EXISTS prevent_posted_line_tampering();
DROP TRIGGER IF EXISTS trg_immutable_posted_vouchers ON journal_vouchers;
DROP FUNCTION IF EXISTS prevent_posted_voucher_tampering();
DROP TRIGGER IF EXISTS trg_immutable_audit_events ON audit_events;
DROP FUNCTION IF EXISTS prevent_audit_event_mutation();
DROP TRIGGER IF EXISTS trg_verify_posted_voucher_balance ON journal_vouchers;
DROP FUNCTION IF EXISTS verify_posted_voucher_balance_from_voucher();

DROP POLICY IF EXISTS p_tenant_outbox_events ON outbox_events;
DROP POLICY IF EXISTS p_tenant_audit_events ON audit_events;
DROP POLICY IF EXISTS p_tenant_cama_certs ON cama_sec405_certifications;
DROP POLICY IF EXISTS p_tenant_period_snapshots ON period_close_snapshots;
DROP POLICY IF EXISTS p_tenant_journal_lines ON journal_lines;
DROP POLICY IF EXISTS p_tenant_journal_vouchers ON journal_vouchers;
DROP POLICY IF EXISTS p_tenant_chart_of_accounts ON chart_of_accounts;
DROP POLICY IF EXISTS p_tenant_fiscal_periods ON fiscal_periods;
DROP POLICY IF EXISTS p_tenant_pack_profiles ON workspace_pack_profiles;
DROP POLICY IF EXISTS p_tenant_tax_profiles ON nigerian_tax_profiles;
DROP POLICY IF EXISTS p_tenant_workspace_members ON workspace_members;

ALTER TABLE outbox_events DISABLE ROW LEVEL SECURITY;
ALTER TABLE audit_events DISABLE ROW LEVEL SECURITY;
ALTER TABLE cama_sec405_certifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE period_close_snapshots DISABLE ROW LEVEL SECURITY;
ALTER TABLE journal_lines DISABLE ROW LEVEL SECURITY;
ALTER TABLE journal_vouchers DISABLE ROW LEVEL SECURITY;
ALTER TABLE chart_of_accounts DISABLE ROW LEVEL SECURITY;
ALTER TABLE fiscal_periods DISABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_pack_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE nigerian_tax_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members DISABLE ROW LEVEL SECURITY;

DROP FUNCTION IF EXISTS current_workspace_uuid();
