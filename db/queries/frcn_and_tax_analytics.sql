-- NairaBooks Canonical Analytical & Operational SQL Queries (sql-pro / sql-optimization-patterns)

-- 1. Keyset Cursor Pagination for Journal Vouchers (zero OFFSET overhead; uses idx_vouchers_workspace_keyset)
-- Parameters: $1 = workspace_id, $2 = last_posting_date, $3 = last_id, $4 = page_size (<= 100)
SELECT
    jv.id,
    jv.voucher_number,
    jv.posting_date,
    jv.status,
    jv.total_debit_ngn,
    jv.reference
FROM journal_vouchers AS jv
WHERE jv.workspace_id = $1
  AND ($2::DATE IS NULL OR (jv.posting_date, jv.id) < ($2::DATE, $3::UUID))
ORDER BY jv.posting_date DESC, jv.id DESC
LIMIT LEAST(GREATEST($4::INTEGER, 1), 100);

-- 2. Running Account Ledger Balance via SQL Window Function
-- Parameters: $1 = workspace_id, $2 = account_id, $3 = start_date, $4 = end_date
SELECT
    jv.posting_date,
    jv.voucher_number,
    jl.line_number,
    jl.debit_ngn,
    jl.credit_ngn,
    SUM(jl.debit_ngn - jl.credit_ngn) OVER (
        PARTITION BY jl.account_id
        ORDER BY jv.posting_date ASC, jv.id ASC, jl.line_number ASC
        ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    ) AS running_net_balance_ngn
FROM journal_lines AS jl
INNER JOIN journal_vouchers AS jv
    ON jv.id = jl.voucher_id
   AND jv.workspace_id = jl.workspace_id
WHERE jl.workspace_id = $1
  AND jl.account_id = $2
  AND jv.status = 'POSTED'
  AND jv.posting_date BETWEEN $3::DATE AND $4::DATE
ORDER BY jv.posting_date ASC, jv.id ASC, jl.line_number ASC;

-- 3. Effective-Dated Nigerian Tax Rule Lookup (GiST / composite lookup)
-- Parameters: $1 = regime, $2 = jurisdiction, $3 = supply_category_code, $4 = transaction_date
SELECT
    rule_version_code,
    standard_rate,
    no_tin_penalty_rate,
    statutory_citation
FROM tax_rule_versions
WHERE regime = $1
  AND jurisdiction = $2
  AND supply_category_code = $3
  AND effective_period @> $4::DATE
LIMIT 1;

-- 4. FRCN Trial Balance & Statement of Value Added Summary from Closed Period Snapshots + Open Vouchers
-- Parameters: $1 = workspace_id, $2 = fiscal_period_id
WITH period_lines AS (
    SELECT
        coa.id AS account_id,
        coa.code AS account_code,
        coa.name AS account_name,
        coa.category,
        coa.ifrs_tag,
        COALESCE(SUM(jl.debit_ngn), 0.00) AS total_debit_ngn,
        COALESCE(SUM(jl.credit_ngn), 0.00) AS total_credit_ngn
    FROM chart_of_accounts AS coa
    LEFT JOIN journal_lines AS jl
        ON jl.account_id = coa.id
       AND jl.workspace_id = coa.workspace_id
    LEFT JOIN journal_vouchers AS jv
        ON jv.id = jl.voucher_id
       AND jv.workspace_id = jl.workspace_id
       AND jv.fiscal_period_id = $2
       AND jv.status = 'POSTED'
    WHERE coa.workspace_id = $1
    GROUP BY coa.id, coa.code, coa.name, coa.category, coa.ifrs_tag
)
SELECT
    account_code,
    account_name,
    category,
    ifrs_tag,
    total_debit_ngn,
    total_credit_ngn,
    (total_debit_ngn - total_credit_ngn) AS net_balance_ngn
FROM period_lines
WHERE total_debit_ngn <> 0.00 OR total_credit_ngn <> 0.00
ORDER BY account_code ASC;

-- 5. Transactional Outbox Polling (concurrent safe SKIP LOCKED batch; uses idx_outbox_pending)
-- Parameters: $1 = batch_limit
SELECT
    sequence_id,
    id,
    workspace_id,
    aggregate_type,
    aggregate_id,
    event_type,
    payload
FROM outbox_events
WHERE processed_at IS NULL
ORDER BY created_at ASC, sequence_id ASC
LIMIT $1
FOR UPDATE SKIP LOCKED;
