# NairaBooks Content Refresh & Decay Prevention System (`docs/seo/CONTENT_REFRESH_SYSTEM.md`)

> **Automated Cadence, Decay Detection Triggers, and Content Maintenance Playbooks**  
> *Target: Preserving Search Rankings, Freshness Signals & Continuous Nigerian Statutory Updates*

---

## 1. Quarterly Content Maintenance Calendar

Search engines reward content freshness, especially in regulated industries where statutory tax gazettes evolve.

| Quarter | Focus Milestone | Trigger Event | Priority Content Pieces Refreshed |
| :--- | :--- | :--- | :--- |
| **Q1 (Jan – Mar)** | Annual Tax Law Alignment | Implementation of annual Federal Budget & FIRS Gazettes | *Ultimate Guide to Nigerian Tax*, *Small Company CIT Exemption Guide* |
| **Q2 (Apr – Jun)** | SME Mid-Year Filings | June 30 FIRS corporate annual return statutory deadline | *7.5% VAT Calculation*, *WHT Credit Note Offset Guide* |
| **Q3 (Jul – Sep)** | Bank Tech & API Updates | NIBSS / CBN bank statement format or EMTL fee revisions | *Access Bank Reconciliation*, *Zenith & GTBank PDF Parsers* |
| **Q4 (Oct – Dec)** | Year-End Audit & CAMA Prep | CAC annual return & financial period closing season | *CAMA 2020 Sec 405 Certification*, *Trial Balance Closing Guide* |

---

## 2. Content Decay Detection & Action Triggers

An article or guide is flagged for **Immediate Editorial Refresh** when:
1. **Impression Decay:** Google Search Console shows a $> 15\%$ drop in impressions over a rolling 60-day window.
2. **CTR Decay:** Click-through rate falls below $2.5\%$ for top 3 ranking keywords.
3. **Statutory Divergence:** FIRS, NRS, or the Federal Ministry of Finance publishes a new tax circular altering statutory rates or turnover thresholds.
4. **Product Evolution:** New transaction types or UI workflows ship in NairaBooks that supersede older tutorials.

---

## 3. The 6-Step Content Refresh Checklist

Whenever an article is refreshed:
1. **Update Temporal Hooks:** Ensure dates reflect the active statutory tax years (`2025/2026`).
2. **Expand Under-Covered Queries:** Extract rising queries from Google Search Console and add dedicated H3 sub-sections or FAQ items.
3. **Verify Statutory Invariants:** Double check that all VAT (7.5%), WHT (2%, 5%, 10%), and CIT thresholds (`₦100M`) reflect current legislation.
4. **Update Screenshots & Visuals:** Verify that interactive diagrams and product screenshots reflect the latest UI.
5. **Re-run Automated SEO Audit:**
   ```bash
   uv run python scripts/audit_seo.py
   ```
6. **Check Cannibalization Parity:**
   ```bash
   uv run python scripts/detect_seo_cannibalization.py
   ```
