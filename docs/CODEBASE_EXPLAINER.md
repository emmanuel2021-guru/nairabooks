# NairaBooks Codebase & Invariant Explainer (`docs/CODEBASE_EXPLAINER.md`)

> **Plain-English Deep Dive into Core Algorithms, Invariants, and Architectural Decisions**  
> *Target Audience: Developers, System Auditors, Financial Controllers*

---

## 1. How the Double-Entry Invariant Is Enforced Mathematically

### The Problem
In double-entry accounting (codified in Nigerian law by CAMA 2020 Section 377), every business transaction must record balanced debit and credit entries:
$$\sum \text{Debits} = \sum \text{Credits}$$

If a software system uses floating-point numbers (`0.1 + 0.2 = 0.30000000000000004`), accumulated round-off errors cause a 1-kobo discrepancy over hundreds of transactions, causing the Trial Balance to fall out of balance.

### The NairaBooks Implementation (`src/nairabooks/ledger/domain/money.py`)
NairaBooks enforces fixed-point decimal arithmetic using Python's standard library `Decimal`:
```python
MONEY_QUANTUM = Decimal("0.01")

def quantize_money(value: Decimal) -> Decimal:
    return value.quantize(MONEY_QUANTUM, rounding=ROUND_HALF_UP)
```
When an operational transaction (e.g. Sales Invoice) is posted:
1. The subtotal is calculated as $\text{Quantity} \times \text{Unit Price}$.
2. The 7.5% VAT is calculated as $\text{quantize}(\text{Subtotal} \times 0.075)$.
3. Total Invoice Amount is strictly $\text{Subtotal} + \text{VAT}$.
4. Lines are generated:
   - `DR 1110 Accounts Receivable`: Total Amount
   - `CR 4010 Operating Revenue`: Subtotal
   - `CR 2010 Output VAT Payable`: VAT Amount
5. `assert sum(line.debit for line in lines) == sum(line.credit for line in lines)` validates exact mathematical equality before any record is committed.

---

## 2. Nigerian Tax Engine & WHT Deduction at Source

### Withholding Tax (WHT) Credit Notes Receivable (`GL 1150`)
In Nigeria, corporate clients often deduct Withholding Tax (e.g. 5% or 10% on contracts/consultancy) at the point of payment under the Federal Inland Revenue Service (FIRS) / Nigeria Revenue Service (NRS) regulations.

Most foreign accounting packages treat this as an unallocated discount or bad debt. NairaBooks handles this as a statutory asset:
```python
# Customer pays invoice of ₦100,000 with 10% WHT deducted:
net_cash_received = Decimal("90000.00")
wht_deducted_at_source = Decimal("10000.00")

# Posting:
# DR 1010 Bank / Cash Account:         ₦90,000.00
# DR 1150 WHT Credit Notes Receivable: ₦10,000.00
# CR 1110 Accounts Receivable:        ₦100,000.00
```
This preserves the WHT credit note balance so the Nigerian business can legally offset it against future Company Income Tax (CIT) liability!

---

## 3. Nigeria Tax Act 2025 CIT Exemption Radar

Under the Nigeria Tax Act 2025:
- **Small Companies (Turnover $\le$ ₦100,000,000):** 0% Company Income Tax (CIT).
- **Medium Companies (₦100,000,000 $<$ Turnover $\le$ ₦250,000,000):** Graduated CIT.
- **Large Companies (Turnover $>$ ₦250,000,000):** Standard CIT.
- **The Statutory Caveat:** Professional service companies (legal practitioners, medical doctors, engineers, management consultants, accountants) are explicitly **excluded** from the small company 0% exemption, regardless of turnover!

### Implementation (`src/nairabooks/tax/domain/cit_radar.py`)
```python
def evaluate_cit_exemption(annual_turnover: Decimal, is_professional_services: bool) -> CITClassification:
    if is_professional_services:
        return CITClassification(is_exempt=False, rate=Decimal("0.30"), reason="Professional services statutory exclusion")
    if annual_turnover <= Decimal("100000000.00"):
        return CITClassification(is_exempt=True, rate=Decimal("0.00"), reason="Small company threshold under Tax Act 2025")
    ...
```

---

## 4. Privacy by Design vs. CAMA 2020 6-Year Retention

### The Legal Conflict
- **NDPA 2023 / GDPR Right to Erasure:** A user has the legal right to request complete deletion of their personal data.
- **CAMA 2020 Section 374:** Nigerian corporate law mandates that every company must preserve accounting books, vouchers, and audit trails for a minimum of **6 years** from the date they are made. Deleting financial vouchers is an offence punishable by law.

### The Resolution (`src/nairabooks/compliance/privacy.py`)
NairaBooks solves this through **Cryptographic Pseudonymization & Anonymization**:
1. When a user requests erasure, `anonymize_user(user_id)` scrubs names, phone numbers, email addresses, and contact info, replacing them with irreversible hashes (`ANON-USER-XXXXX`).
2. Historical journal vouchers, sequential voucher IDs, and transaction amounts remain intact for the 6-year statutory retention window.
3. Both NDPA privacy rights and CAMA corporate accounting obligations are 100% satisfied.
