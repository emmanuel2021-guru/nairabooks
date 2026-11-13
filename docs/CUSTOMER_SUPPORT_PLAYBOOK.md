# NairaBooks Customer Support & Operations Playbook (`docs/CUSTOMER_SUPPORT_PLAYBOOK.md`)

> **Customer Success Procedures, Support SLAs, Troubleshooting FAQs, and Escalation Runbooks**  
> *Target: Customer Support Agents, Technical Support Engineers, Account Managers*

---

## 1. Support SLAs & Incident Severity Matrix

| Severity Tier | Definition | Response Target | Resolution Target | Escalation Contact |
| :--- | :--- | :--- | :--- | :--- |
| **P1 - Critical** | Platform unavailable, data integrity failure, or inability to post financial vouchers | `< 15 minutes` | `< 2 hours` | Head of Engineering |
| **P2 - High** | Bank statement parsing error, tax schedule calculation blocker, or login failure | `< 1 hour` | `< 6 hours` | Senior Backend Engineer |
| **P3 - Medium** | UI display anomaly, report formatting question, or user invitation issue | `< 4 hours` | `< 24 hours` | Tier 2 Support Lead |
| **P4 - Low** | General "How-to" inquiry, feature feedback, or documentation clarification | `< 8 hours` | `< 48 hours` | Tier 1 Support Specialist |

---

## 2. Top 25 Troubleshooting FAQs & Response Macros

### Category A: Nigerian Tax & Compliance
1. **Q: How does NairaBooks calculate the 7.5% VAT?**  
   *A:* NairaBooks calculates 7.5% Output VAT on taxable goods and services with exact kobo decimal rounding (`ROUND_HALF_UP`). When an invoice is posted, VAT is isolated to liability account `2010 Output VAT Payable` and automatically reflected on your monthly VAT report.
2. **Q: A customer deducted 5% WHT from my invoice payment. How do I record this?**  
   *A:* When recording a **Customer Receipt** against the invoice, enter the cash received in the Bank field and the 5% deducted amount in the **WHT Deducted** field. NairaBooks debits `1150 WHT Credit Notes Receivable` (an asset) so you can claim it as tax credit with the FIRS/NRS!
3. **Q: Why does the Tax Act 2025 radar show my consulting firm as non-exempt even though our turnover is under ₦100M?**  
   *A:* Under the Nigeria Tax Act 2025, professional services (lawyers, doctors, accountants, engineers, consultants) are statutorily excluded from the 0% small-company CIT exemption, regardless of revenue. NairaBooks accurately flags this to prevent tax penalties during FIRS audits.
4. **Q: Can I edit an invoice after it has been posted?**  
   *A:* Under CAMA 2020 Section 374, accounting records must remain immutable. To modify a posted invoice, click **Reverse** to post an offsetting entry, then issue a corrected invoice.

### Category B: Bank Reconciliation & Statements
5. **Q: Which Nigerian banks are supported for PDF statement upload?**  
   *A:* NairaBooks currently parses statements natively from Access Bank, Guaranty Trust Bank (GTBank), Zenith Bank, United Bank for Africa (UBA), First Bank, and Stanbic IBTC.
6. **Q: Why are some transactions unmatched after clicking Auto-Match?**  
   *A:* Auto-Match requires exact kobo amount matches within a reasonable date window. If bank fees (e.g. ₦50 EMTL levy or SMS charges) appear on your statement but were not previously entered in your books, click **Quick-Post to Books** to record them immediately.
7. **Q: What is the ₦50 EMTL charge on my bank statement?**  
   *A:* The Electronic Money Transfer Levy (EMTL) is a statutory levy of ₦50 imposed by the Federal Government on inward bank transfers of ₦10,000 and above. In NairaBooks, map this to account `5020 Bank Charges & Fees`.

### Category C: Account Security & Data Privacy
8. **Q: Can an employee access invoices from other client accounts?**  
   *A:* No. NairaBooks enforces PostgreSQL 18 Row-Level Security (`SET LOCAL app.current_workspace_id`). Each company's data is strictly fenced at the database level.
9. **Q: What happens if an employee leaves and asks for their data to be deleted?**  
   *A:* Under NDPA 2023, you can trigger an **Account Anonymization** request. Personal info (name, email, phone) is permanently wiped, while financial vouchers are legally retained for 6 years under CAMA 2020 Section 374.
10. **Q: How does Segregation of Duties work under CAMA Section 405?**  
    *A:* The user certifying financial periods cannot be the same user who created or posted vouchers during that period.

---

## 3. Escalation SOP & Contact Matrix

1. **Initial Ticket Triage:** Support receives incoming ticket via in-app messenger or email (`support@nairabooks.ng`).
2. **Tagging:** Apply tags (`[Tax]`, `[Reconcile]`, `[Security]`, `[Billing]`).
3. **Run Diagnostic Helper:** For complex financial errors, run:
   ```bash
   uv run python scripts/issue_triage.py --title "<Issue Title>" --description "<Details>"
   ```
4. **Engineering Escalation:** If correlation ID reveals an unhandled exception, attach the sanitized error trace to a GitHub issue using `.github/ISSUE_TEMPLATE/01_bug_report.yml`.
