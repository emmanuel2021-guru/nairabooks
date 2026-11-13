-- Rollback 0001: Tear down initial NairaBooks schema (staging/dev reset only)
DROP TABLE IF EXISTS outbox_events CASCADE;
DROP TABLE IF EXISTS audit_events CASCADE;
DROP TABLE IF EXISTS cama_sec405_certifications CASCADE;
DROP TABLE IF EXISTS period_close_snapshots CASCADE;
DROP TABLE IF EXISTS journal_lines CASCADE;
DROP TABLE IF EXISTS journal_vouchers CASCADE;
DROP TABLE IF EXISTS chart_of_accounts CASCADE;
DROP TABLE IF EXISTS fiscal_periods CASCADE;
DROP TABLE IF EXISTS workspace_pack_profiles CASCADE;
DROP TABLE IF EXISTS industry_pack_manifests CASCADE;
DROP TABLE IF EXISTS tax_rule_versions CASCADE;
DROP TABLE IF EXISTS nigerian_tax_profiles CASCADE;
DROP TABLE IF EXISTS workspace_members CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS workspaces CASCADE;
DROP TABLE IF EXISTS schema_migration_runs CASCADE;
