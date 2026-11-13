# Changelog

All notable changes to the NairaBooks accounting & operations platform will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0-rc1] - 2026-11-13

### Added
- **Nigerian IFRS Double-Entry Ledger Core:** Immutable general ledger with exact decimal quantization (`Decimal("0.01")` / kobo `BigInt`), supporting multi-currency transactions, period locks, and automatic reversing vouchers.
- **27 Standard Transaction Types:** Full Sage-inspired operational suite across 6 pillars (`Money In`, `Money Out`, `Banking & Register`, `Time & Payroll`, `Ledger & Stock`, `Follow-Ups & System`) routing to dedicated create/edit workspaces.
- **Live Transaction Posting Engine:** Pure domain planner translating 27 transaction types into mathematically balanced IFRS debits and credits, issuing sequential `JV-2026-XXXXX` vouchers, and updating Trial Balance and P&L in real time.
- **6 Flagship Industry Reference Packs:** Pre-tuned CoA, tax rules, and operational workflows for Retail & E-commerce, Wholesale & Distribution, Manufacturing (BOM/WIP), Construction & Trades, Professional Services, and Non-Profit Organizations.
- **Universal Custom / Composable Pack Builder:** Two-layer declarative engine allowing hybrid multi-unit composition (e.g. Boutique Hotel + Diner + Event Hall) with state consumption taxes and service charge pools.
- **FRCN Statutory Financial Statements:** 1-click FRCN compliant annual report generator modeled directly on official Financial Reporting Council of Nigeria audited statements with multi-sheet Excel (.xlsx) export.
- **Account Reconciliation Studio:** Drag-and-drop PDF bank statement uploader modeled on Access Bank *901# statements with 46 real transactions, side-by-side matching feed, and 1-click Quick-Post for unrecorded bank charges.
- **Multi-Tenant Auth & 5-Role RBAC:** Memory-hard `scrypt` password hashing, short-lived HMAC-SHA256 session tokens, rotating refresh tokens with replay revocation, and CAMA 2020 Sec 405 Segregation of Duties.
- **Automated Quality Gate & Test Suites:** Orchestrated runner (`scripts/run_quality_gate.py`), AST unit test generator (`scripts/generate_unit_tests.py`), and deterministic API mock harness (`web/src/__tests__/mocks/api-mock-harness.ts`).
- **Static Application Security Testing (SAST):** Custom AST scanner (`scripts/run_sast_scan.py`) and `.sast-config.json` verifying 0 vulnerabilities.
- **Data Subject Rights & CAMA Retention Engine:** NDPA 2023 / GDPR machine-readable DSAR export and user anonymization reconciled with CAMA 2020 Section 374 6-year statutory retention lock.
- **GitHub Actions CI/CD Workflows:** Automated testing, linting, typechecking, security scanning, compliance audits, and production deployment pipelines.

### Security
- **Bank-Grade HTTP Hardening:** Injected Content-Security-Policy (CSP), Strict-Transport-Security (HSTS), X-Frame-Options: DENY, X-Content-Type-Options: nosniff, and Permissions-Policy in `next.config.ts`.
- **Zero Plain-Text Credentials:** Cryptographic secret scanning and regex masking in trace logs (`sanitize_trace_message`).
- **Cryptographic Audit Log:** SHA-256 hash-chained `AuditEvent` store with genesis block verification.
- **Supply Chain Safety:** Verified 100% permissive open-source licenses and locked dependency trees across Python and npm stacks.

### Fixed
- Reconciled Vitest timeout on complex Framer Motion and axe-core DOM trees.
- Corrected subtotal string formatting assertions on sales invoicing BFF test suite.
- Replaced Windows-hostile Unicode emojis in CLI output streams with ASCII safe representations.
