-- Migration 0002: Multi-Tenant Row-Level Security (RLS) & Accounting Invariant Triggers
-- Implements SEC-REQ-03 (immutable posted journals), SEC-REQ-05 (append-only audit log),
-- and SEC-REQ-08 (PostgreSQL RLS tenant isolation across all tenant-scoped tables).

-- Helper returning active workspace UUID bound in PgBouncer/transaction scope (`SET LOCAL`)
CREATE OR REPLACE FUNCTION current_workspace_uuid()
RETURNS UUID
LANGUAGE SQL
STABLE
AS $$
    SELECT NULLIF(current_setting('app.current_workspace_id', true), '')::UUID;
$$;

-- Enforce Row-Level Security on every tenant-scoped table
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE nigerian_tax_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_pack_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE fiscal_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE chart_of_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_vouchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE period_close_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE cama_sec405_certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE outbox_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY p_tenant_workspace_members ON workspace_members
    USING (workspace_id = current_workspace_uuid())
    WITH CHECK (workspace_id = current_workspace_uuid());

CREATE POLICY p_tenant_tax_profiles ON nigerian_tax_profiles
    USING (workspace_id = current_workspace_uuid())
    WITH CHECK (workspace_id = current_workspace_uuid());

CREATE POLICY p_tenant_pack_profiles ON workspace_pack_profiles
    USING (workspace_id = current_workspace_uuid())
    WITH CHECK (workspace_id = current_workspace_uuid());

CREATE POLICY p_tenant_fiscal_periods ON fiscal_periods
    USING (workspace_id = current_workspace_uuid())
    WITH CHECK (workspace_id = current_workspace_uuid());

CREATE POLICY p_tenant_chart_of_accounts ON chart_of_accounts
    USING (workspace_id = current_workspace_uuid())
    WITH CHECK (workspace_id = current_workspace_uuid());

CREATE POLICY p_tenant_journal_vouchers ON journal_vouchers
    USING (workspace_id = current_workspace_uuid())
    WITH CHECK (workspace_id = current_workspace_uuid());

CREATE POLICY p_tenant_journal_lines ON journal_lines
    USING (workspace_id = current_workspace_uuid())
    WITH CHECK (workspace_id = current_workspace_uuid());

CREATE POLICY p_tenant_period_snapshots ON period_close_snapshots
    USING (workspace_id = current_workspace_uuid())
    WITH CHECK (workspace_id = current_workspace_uuid());

CREATE POLICY p_tenant_cama_certs ON cama_sec405_certifications
    USING (workspace_id = current_workspace_uuid())
    WITH CHECK (workspace_id = current_workspace_uuid());

CREATE POLICY p_tenant_audit_events ON audit_events
    USING (workspace_id = current_workspace_uuid())
    WITH CHECK (workspace_id = current_workspace_uuid());

CREATE POLICY p_tenant_outbox_events ON outbox_events
    USING (workspace_id = current_workspace_uuid())
    WITH CHECK (workspace_id = current_workspace_uuid());

-- Deferred Constraint Trigger: guarantee every POSTED voucher balances exact lines == header totals
CREATE OR REPLACE FUNCTION enforce_balanced_posted_voucher()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    line_count INTEGER;
    sum_debit_ngn NUMERIC(20, 2);
    sum_credit_ngn NUMERIC(20, 2);
    sum_debit_txn NUMERIC(20, 2);
    sum_credit_txn NUMERIC(20, 2);
    target_voucher_id UUID;
BEGIN
    target_voucher_id := COALESCE(NEW.voucher_id, OLD.voucher_id);
    -- Trigger attached both to journal_vouchers (id) and journal_lines (voucher_id)
    RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION verify_posted_voucher_balance_from_voucher()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_count INTEGER;
    v_debit_ngn NUMERIC(20, 2);
    v_credit_ngn NUMERIC(20, 2);
    v_period_status TEXT;
BEGIN
    IF NEW.status = 'POSTED' THEN
        SELECT status INTO v_period_status
        FROM fiscal_periods
        WHERE id = NEW.fiscal_period_id AND workspace_id = NEW.workspace_id;

        IF v_period_status IS NULL OR v_period_status <> 'OPEN' THEN
            RAISE EXCEPTION 'Cannot post voucher % into non-OPEN fiscal period', NEW.id;
        END IF;

        SELECT COUNT(*), COALESCE(SUM(debit_ngn), 0), COALESCE(SUM(credit_ngn), 0)
        INTO v_count, v_debit_ngn, v_credit_ngn
        FROM journal_lines
        WHERE voucher_id = NEW.id AND workspace_id = NEW.workspace_id;

        IF v_count < 2 THEN
            RAISE EXCEPTION 'Posted voucher % requires at least 2 journal lines', NEW.id;
        END IF;
        IF v_debit_ngn <> v_credit_ngn OR v_debit_ngn <> NEW.total_debit_ngn THEN
            RAISE EXCEPTION 'Unbalanced posted voucher % (debit=%, credit=%, header=%)',
                NEW.id, v_debit_ngn, v_credit_ngn, NEW.total_debit_ngn;
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

DROP FUNCTION IF EXISTS enforce_balanced_posted_voucher();

CREATE CONSTRAINT TRIGGER trg_verify_posted_voucher_balance
    AFTER INSERT OR UPDATE ON journal_vouchers
    DEFERRABLE INITIALLY DEFERRED
    FOR EACH ROW
    EXECUTE FUNCTION verify_posted_voucher_balance_from_voucher();

-- Immutability Trigger: block UPDATE/DELETE on audit_events and financial mutations on POSTED vouchers
CREATE OR REPLACE FUNCTION prevent_audit_event_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION 'audit_events table is strictly append-only (SEC-REQ-05)';
END;
$$;

CREATE TRIGGER trg_immutable_audit_events
    BEFORE UPDATE OR DELETE ON audit_events
    FOR EACH ROW
    EXECUTE FUNCTION prevent_audit_event_mutation();

CREATE OR REPLACE FUNCTION prevent_posted_voucher_tampering()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        IF OLD.status IN ('POSTED', 'REVERSED') THEN
            RAISE EXCEPTION 'Cannot delete posted/reversed voucher % (SEC-REQ-03)', OLD.id;
        END IF;
        RETURN OLD;
    END IF;

    -- Allow marking a POSTED voucher as REVERSED via reversed_by_voucher_id only
    IF OLD.status = 'POSTED' THEN
        IF NOT (
            NEW.status = 'REVERSED'
            AND NEW.reversed_by_voucher_id IS NOT NULL
            AND NEW.total_debit_ngn = OLD.total_debit_ngn
            AND NEW.total_credit_ngn = OLD.total_credit_ngn
            AND NEW.posting_date = OLD.posting_date
        ) THEN
            RAISE EXCEPTION 'Cannot alter posted voucher % amounts or dates; post a reversal', OLD.id;
        END IF;
    ELSIF OLD.status = 'REVERSED' THEN
        RAISE EXCEPTION 'Reversed voucher % is permanently immutable', OLD.id;
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_immutable_posted_vouchers
    BEFORE UPDATE OR DELETE ON journal_vouchers
    FOR EACH ROW
    EXECUTE FUNCTION prevent_posted_voucher_tampering();

CREATE OR REPLACE FUNCTION prevent_posted_line_tampering()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_status TEXT;
BEGIN
    SELECT status INTO v_status FROM journal_vouchers WHERE id = OLD.voucher_id;
    IF v_status IN ('POSTED', 'REVERSED') THEN
        RAISE EXCEPTION 'Cannot modify or delete lines of % voucher %', v_status, OLD.voucher_id;
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_immutable_posted_lines
    BEFORE UPDATE OR DELETE ON journal_lines
    FOR EACH ROW
    EXECUTE FUNCTION prevent_posted_line_tampering();
