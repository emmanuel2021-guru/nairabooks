# NairaBooks Legal Terms, Privacy Policy & Regulatory Disclosures (`docs/LEGAL_TERMS_AND_PRIVACY.md`)

**Effective Date:** January 1, 2026  
**Applicable Jurisdictions:** Federal Republic of Nigeria (Principal), African Continental Free Trade Area (AfCFTA), and International (GDPR Harmonized)  
**Governing Laws:** Companies and Allied Matters Act (CAMA) 2020, Nigeria Data Protection Act (NDPA) 2023, Nigeria Tax Act 2025, and Financial Reporting Council of Nigeria (FRCN) Act 2011  
**Activated Wizard Skills:** `legal-advisor` (#101), `gdpr-data-handling` (#102), `security-compliance-compliance-check` (#103)

---

## 1. Terms of Service (Commercial SaaS Agreement)

### 1.1 Acceptance & Scope
By registering an organization workspace, accessing, or using NairaBooks ("the Platform"), you ("the Subscriber" or "Customer") enter into a legally binding agreement governed by the laws of the Federal Republic of Nigeria. NairaBooks provides an IFRS-compliant, cloud-based accounting and business operations infrastructure.

### 1.2 Enterprise Multi-Tenant Architecture & Tenant Isolation
1. **Workspace Boundary:** Each organization operates within a cryptographically isolated tenant boundary enforced by PostgreSQL Row-Level Security (`app.current_workspace_id`) and authenticated server sessions.
2. **Access Controls:** Cross-tenant access attempts or unauthorized header manipulation are strictly prohibited and trigger automated fail-closed isolation (`403 CrossTenantAccessError`) with audit event logging.
3. **Role-Based Access Control (RBAC):** Subscribers are responsible for configuring appropriate roles (`OWNER_MANAGING_DIRECTOR`, `CHARTERED_ACCOUNTANT_CFO`, `BOOKKEEPER`, `BRANCH_OUTLET_CASHIER`, `EXTERNAL_AUDITOR_READONLY`) and maintaining Segregation of Duties for statutory period certifications.

### 1.3 Immutable Double-Entry Accounting Invariants
NairaBooks enforces pure double-entry bookkeeping rules:
- **Balance Equilibrium:** Every posted `JournalVoucher` must mathematically satisfy `sum(debits) == sum(credits)` in Nigerian Naira (`₦`) to the exact minor unit (kobo).
- **No In-Place Deletions:** In accordance with standard accounting principles and CAMA 2020 Section 377, posted vouchers cannot be modified or deleted. Adjustments must be recorded via offsetting reversal vouchers (`REVERSED` status) or adjusting journal entries.

---

## 2. Privacy Policy & Data Protection (NDPA 2023 & GDPR)

### 2.1 Principles of Data Processing
NairaBooks adheres to the Nigeria Data Protection Act (NDPA) 2023 and the General Data Protection Regulation (GDPR) standards of **Lawfulness, Fairness, Transparency, Purpose Limitation, and Data Minimization**.

### 2.2 Categories of Personal Data Collected
- **Account Identification:** Full name, email address, telephone number, business role, and hashed authentication credentials (processed exclusively via memory-hard `scrypt` hashing).
- **Business Identity:** Corporate Registration Number (RC/BN/IT), Tax Identification Number (TIN), state of tax residency, and registered office address.
- **Transactional Metadata:** Audit events, IP connection traces, and user actions recorded in the immutable SHA-256 hash-chained `AuditEvent` store.

### 2.3 Data Subject Rights (DSR) & Request Fulfillment
Data subjects have recognized legal rights under NDPA 2023 Section 24 and GDPR Chapter III:
1. **Right to Access (DSAR):** Subscribers may request a complete, machine-readable JSON bundle (`DsarExportBundle`) of their personal profile, assigned permissions, and activity history.
2. **Right to Rectification:** Inaccurate contact details or role assignments can be updated via the `/security` governance workspace.
3. **Right to Erasure / Anonymization vs. Statutory Accounting Retention:**
   - Where a user exercises the right to erasure, NairaBooks executes **Pseudonymization / Anonymization** (`PrivacyComplianceManager.anonymize_user`), replacing personal names, emails, and phone numbers with cryptographic hashes.
   - **Statutory Retention Fence:** In accordance with **CAMA 2020 Section 374**, books of accounts, journal entries, and underlying vouchers must be preserved for a **minimum statutory period of six (6) years**. Financial entries cannot be deleted during this statutory lock window.

---

## 3. Statutory Financial & Tax Disclosures

### 3.1 CAMA 2020 Section 405 Statutory Certification
Financial period seals generated within NairaBooks require joint statutory certification by the Chief Executive Officer / Managing Director and Chief Financial Officer / Chartered Accountant. The platform programmatically rejects self-approvals where `preparedByUserId == certifiedByUserId` to preserve statutory Segregation of Duties.

### 3.2 Nigeria Tax Act 2025 Compliance
1. **Small Company Exemption Radar:** The platform dynamically monitors aggregate turnover against the statutory `₦100,000,000` / `₦250,000,000` thresholds, automatically issuing advisory radar warnings when turnover reaches 80% of threshold limits.
2. **Professional Services Exclusion:** Per statutory mandate, professional service providers (legal, consulting, accounting, engineering) are flagged as non-exempt from Companies Income Tax regardless of turnover volume.
3. **Withholding Tax (WHT) & VAT:** 7.5% Value Added Tax and applicable 2%/5%/10% WHT rates are isolated into distinct balance sheet liability accounts (`2010 Output VAT`, `2130 WHT Payable`, `1150 WHT Credit Notes Receivable`).

---

## 4. Security & Vulnerability Disclosure

NairaBooks operates under a strict Coordinated Vulnerability Disclosure framework:
- Security researchers and auditors discovering potential vulnerabilities are requested to notify security personnel at `security@nairabooks.ng` before public disclosure.
- Hardcoded credentials, plain-text private keys, and insecure URL schemes are strictly barred by automated Static Application Security Testing (SAST) in CI/CD gates.
