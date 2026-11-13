"""Database schema, PostgreSQL RLS, FK index, and migration observability tests (Phase 4)."""

from __future__ import annotations

import json
import re
from pathlib import Path

import pytest

from nairabooks.adapters.migrations import (
    MigrationObserver,
    audit_forward_migration_safety,
    debezium_cdc_slot_config,
    discover_migrations,
)

ROOT = Path(__file__).resolve().parent.parent
MIGRATIONS_DIR = ROOT / "db" / "migrations"
QUERIES_PATH = ROOT / "db" / "queries" / "frcn_and_tax_analytics.sql"

TABLE_BLOCK_RE = re.compile(
    r"CREATE TABLE IF NOT EXISTS\s+(?P<table>[a-z0-9_]+)\s*\((?P<body>.*?)\n\);",
    re.DOTALL,
)
FK_COL_RE = re.compile(r"^\s*(?P<col>[a-z0-9_]+)\s+UUID\b[^,\n]*\bREFERENCES\b", re.MULTILINE)


def test_discover_migrations_pairs_rollbacks_and_passes_safety_audit() -> None:
    """All forward migrations have rollback pairs and follow strict PG18 + expand safety rules."""
    specs = discover_migrations(MIGRATIONS_DIR)

    assert [s.version for s in specs] == ["0001", "0002", "0003"]
    for spec in specs:
        assert spec.rollback_path.is_file()
        assert len(spec.checksum_sha256) == 64
        sql_text = spec.up_path.read_text(encoding="utf-8")
        issues = audit_forward_migration_safety(sql_text, spec.strategy)
        assert issues == [], f"{spec.up_path.name} failed audit: {issues}"


def test_destructive_ddl_blocked_outside_contract_strategy() -> None:
    """Zero-downtime safety check blocks unguarded DROP TABLE/COLUMN during expand."""
    issues = audit_forward_migration_safety("ALTER TABLE users DROP COLUMN legacy;", "expand")
    assert len(issues) == 1
    assert "contract" in issues[0]
    assert audit_forward_migration_safety("ALTER TABLE users DROP COLUMN legacy;", "contract") == []


def test_all_tenant_tables_have_rls_enabled_and_policies() -> None:
    """SEC-REQ-08: Every table carrying workspace_id must enable RLS and define a tenant policy."""
    sql_0001 = (MIGRATIONS_DIR / "0001_initial_core_schema.sql").read_text(encoding="utf-8")
    sql_0002 = (MIGRATIONS_DIR / "0002_rls_and_ledger_invariants.sql").read_text(encoding="utf-8")

    tenant_tables: list[str] = []
    for match in TABLE_BLOCK_RE.finditer(sql_0001):
        table = match.group("table")
        body = match.group("body")
        if re.search(r"^\s*workspace_id\s+UUID\s+NOT\s+NULL\b", body, re.MULTILINE):
            tenant_tables.append(table)

    assert len(tenant_tables) == 11
    for table in tenant_tables:
        assert f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY;" in sql_0002
        assert re.search(rf"CREATE POLICY \S+ ON {table}\b", sql_0002) is not None


def test_every_foreign_key_column_has_explicit_index_coverage() -> None:
    """PostgreSQL does not auto-index FKs; verify manual index or leading unique coverage."""
    sql_0001 = (MIGRATIONS_DIR / "0001_initial_core_schema.sql").read_text(encoding="utf-8")
    sql_0003 = (MIGRATIONS_DIR / "0003_indexes_and_observability.sql").read_text(encoding="utf-8")

    for match in TABLE_BLOCK_RE.finditer(sql_0001):
        table = match.group("table")
        body = match.group("body")
        for fk_match in FK_COL_RE.finditer(body):
            col = fk_match.group("col")
            has_idx_0003 = (
                re.search(
                    rf"CREATE INDEX IF NOT EXISTS \S+\s+ON\s+{table}\s*\(\s*{col}\b",
                    sql_0003,
                )
                is not None
            )
            has_leading_uq = (
                re.search(rf"UNIQUE\s+(?:NULLS\s+NOT\s+DISTINCT\s+)?\(\s*{col}\b", body) is not None
            )
            assert has_idx_0003 or has_leading_uq, f"Unindexed FK {table}.{col}"


def test_analytical_sql_patterns_and_invariants_present() -> None:
    """Verify ledger triggers, tax GiST exclusion, keyset queries, and SKIP LOCKED outbox."""
    sql_0001 = (MIGRATIONS_DIR / "0001_initial_core_schema.sql").read_text(encoding="utf-8")
    sql_0002 = (MIGRATIONS_DIR / "0002_rls_and_ledger_invariants.sql").read_text(encoding="utf-8")
    queries = QUERIES_PATH.read_text(encoding="utf-8")

    assert "EXCLUDE USING gist" in sql_0001
    assert "trg_verify_posted_voucher_balance" in sql_0002
    assert "trg_immutable_audit_events" in sql_0002
    assert "trg_immutable_posted_vouchers" in sql_0002

    assert "OVER (" in queries
    assert "FOR UPDATE SKIP LOCKED" in queries
    assert "effective_period @>" in queries
    assert re.search(r"\bOFFSET\s+\$?\d+", queries, re.IGNORECASE) is None


def test_migration_observer_telemetry_drift_and_cdc_config() -> None:
    """Observer logs valid JSON telemetry, detects checksum drift, and configures CDC strings."""
    specs = discover_migrations(MIGRATIONS_DIR)
    observer = MigrationObserver()

    rec = observer.record_execution(specs[0], status="succeeded", duration_ms=42, rows_affected=16)
    payload = json.loads(rec.to_json_log())
    assert payload["event"] == "db_migration_run"
    assert payload["version"] == "0001"
    assert payload["duration_ms"] == 42

    assert observer.detect_checksum_drift(specs[0], specs[0].checksum_sha256) is None
    drift = observer.detect_checksum_drift(specs[0], "0" * 64)
    assert drift is not None and "Checksum drift" in drift

    with pytest.raises(ValueError):
        observer.record_execution(specs[0], status="failed", duration_ms=-1)

    cdc = debezium_cdc_slot_config()
    assert cdc["plugin.name"] == "pgoutput"
    assert cdc["decimal.handling.mode"] == "string"
