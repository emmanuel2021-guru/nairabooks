"""Zero-downtime SQL migration manifest, checksum verification, and observability."""

from __future__ import annotations

import hashlib
import json
import re
from dataclasses import dataclass, field
from datetime import UTC, datetime
from pathlib import Path
from typing import Final, Literal

MigrationStrategy = Literal["expand", "backfill", "contract", "baseline"]
MigrationStatus = Literal["running", "succeeded", "failed", "rolled_back"]

DESTRUCTIVE_SQL_PATTERNS: Final[tuple[re.Pattern[str], ...]] = (
    re.compile(r"\bDROP\s+TABLE\b", re.IGNORECASE),
    re.compile(r"\bDROP\s+COLUMN\b", re.IGNORECASE),
    re.compile(r"\bTRUNCATE\s+TABLE\b", re.IGNORECASE),
)

BANNED_PG_TYPES: Final[tuple[tuple[str, re.Pattern[str]], ...]] = (
    ("FLOAT/REAL/DOUBLE PRECISION", re.compile(r"\b(?:FLOAT\d*|REAL|DOUBLE\s+PRECISION)\b", re.I)),
    ("MONEY type (use NUMERIC)", re.compile(r"\bMONEY\b", re.I)),
    ("SERIAL type (use IDENTITY)", re.compile(r"\b(?:SMALL|BIG)?SERIAL\b", re.I)),
    ("VARCHAR(n) (use TEXT + CHECK)", re.compile(r"\b(?:VAR)?CHAR\s*\(", re.I)),
    (
        "TIMESTAMP without time zone",
        re.compile(r"\bTIMESTAMP\b(?!\s+WITH\s+TIME\s+ZONE)", re.I),
    ),
)


@dataclass(frozen=True, slots=True)
class MigrationSpec:
    """Immutable descriptor for a versioned SQL migration and its paired rollback."""

    version: str
    strategy: MigrationStrategy
    up_path: Path
    rollback_path: Path
    checksum_sha256: str
    lock_timeout_ms: int = 3000
    statement_timeout_ms: int = 30000


@dataclass(frozen=True, slots=True)
class MigrationRunRecord:
    """Structured observability telemetry event emitted per SQL migration execution."""

    version: str
    strategy: MigrationStrategy
    status: MigrationStatus
    checksum_sha256: str
    duration_ms: int
    rows_affected: int
    recorded_at: str
    error_detail: str | None = None

    def to_json_log(self) -> str:
        """Render structured JSON telemetry suitable for observability log collectors."""
        return json.dumps(
            {
                "event": "db_migration_run",
                "version": self.version,
                "strategy": self.strategy,
                "status": self.status,
                "checksum_sha256": self.checksum_sha256,
                "duration_ms": self.duration_ms,
                "rows_affected": self.rows_affected,
                "recorded_at": self.recorded_at,
                "error_detail": self.error_detail,
            },
            sort_keys=True,
        )


@dataclass
class MigrationObserver:
    """Tracks migration execution metrics, drift checks, and CDC configuration readiness."""

    records: list[MigrationRunRecord] = field(default_factory=list)

    def record_execution(
        self,
        spec: MigrationSpec,
        *,
        status: MigrationStatus,
        duration_ms: int,
        rows_affected: int = 0,
        error_detail: str | None = None,
    ) -> MigrationRunRecord:
        """Append structured run record enforcing non-negative timings and counters."""
        if duration_ms < 0 or rows_affected < 0:
            raise ValueError("duration_ms and rows_affected must be non-negative")
        record = MigrationRunRecord(
            version=spec.version,
            strategy=spec.strategy,
            status=status,
            checksum_sha256=spec.checksum_sha256,
            duration_ms=duration_ms,
            rows_affected=rows_affected,
            recorded_at=datetime.now(UTC).isoformat(),
            error_detail=error_detail,
        )
        self.records.append(record)
        return record

    def detect_checksum_drift(
        self, spec: MigrationSpec, recorded_checksum: str
    ) -> str | None:
        """Return descriptive mismatch string if an applied migration was altered on disk."""
        if spec.checksum_sha256 != recorded_checksum:
            return (
                f"Checksum drift on migration {spec.version}: "
                f"disk={spec.checksum_sha256} != applied={recorded_checksum}"
            )
        return None


def compute_file_sha256(path: Path) -> str:
    """Compute SHA-256 hex digest using normalized LF bytes for cross-OS determinism."""
    raw = path.read_text(encoding="utf-8").replace("\r\n", "\n").encode("utf-8")
    return hashlib.sha256(raw).hexdigest()


def discover_migrations(migrations_dir: Path) -> list[MigrationSpec]:
    """Load forward SQL migrations paired with `rollbacks/{prefix}_rollback.sql`."""
    rollbacks_dir = migrations_dir / "rollbacks"
    specs: list[MigrationSpec] = []

    for sql_file in sorted(migrations_dir.glob("[0-9][0-9][0-9][0-9]_*.sql")):
        prefix = sql_file.name.split("_", 1)[0]
        rollback_file = rollbacks_dir / f"{prefix}_rollback.sql"
        if not rollback_file.is_file():
            raise FileNotFoundError(
                f"Missing rollback script for {sql_file.name}: expected {rollback_file}"
            )
        strategy: MigrationStrategy = "baseline" if prefix == "0001" else "expand"
        specs.append(
            MigrationSpec(
                version=prefix,
                strategy=strategy,
                up_path=sql_file,
                rollback_path=rollback_file,
                checksum_sha256=compute_file_sha256(sql_file),
            )
        )
    return specs


def audit_forward_migration_safety(sql_text: str, strategy: MigrationStrategy) -> list[str]:
    """Validate PostgreSQL column typing discipline and zero-downtime destructive DDL rules."""
    issues: list[str] = []
    # Strip SQL single-line comments before static rule matching
    uncommented = "\n".join(
        line for line in sql_text.splitlines() if not line.lstrip().startswith("--")
    )

    for label, pattern in BANNED_PG_TYPES:
        if pattern.search(uncommented):
            issues.append(f"Disallowed PostgreSQL type {label}")

    if strategy != "contract":
        for pat in DESTRUCTIVE_SQL_PATTERNS:
            if pat.search(uncommented):
                issues.append(
                    f"Destructive DDL '{pat.pattern}' only allowed in explicit 'contract' phase"
                )
    return issues


def debezium_cdc_slot_config(database_name: str = "nairabooks") -> dict[str, object]:
    """Return baseline pgoutput CDC configuration for streaming outbox and audit events."""
    return {
        "name": f"{database_name}-pgoutput-cdc",
        "plugin.name": "pgoutput",
        "database.dbname": database_name,
        "table.include.list": "public.outbox_events,public.audit_events,public.journal_vouchers",
        "slot.name": f"{database_name}_cdc_slot",
        "publication.autocreate.mode": "filtered",
        "decimal.handling.mode": "string",
        "heartbeat.interval.ms": 10000,
    }
