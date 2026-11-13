import { describe, it, expect, beforeEach } from 'vitest';
import { NairaBooksApiMockHarness } from './mocks/api-mock-harness';

describe('NairaBooks API Mock Harness & Edge Cases', () => {
  let harness: NairaBooksApiMockHarness;

  beforeEach(() => {
    harness = new NairaBooksApiMockHarness({ enforceTenantHeader: true });
  });

  it('posts a valid sales invoice and returns balanced JV voucher metadata', async () => {
    const res = await harness.handlePostTransaction(
      {
        transactionType: 'SALES_INVOICE',
        referenceNumber: 'INV-2026-001',
        date: '2026-10-15',
        contactName: 'Dangote Industries',
        subtotal: '1000000.00',
        taxRate: 0.075,
        whtRate: 0.05,
      },
      { 'x-workspace-id': 'ws-lagos-hq' }
    );

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    const voucher = res.body.voucher as Record<string, string>;
    expect(voucher.voucherNumber).toMatch(/^JV-2026-\d{5}$/);
    expect(voucher.totalDebits).toBe('1075000.00');
    expect(voucher.totalCredits).toBe('1075000.00');

    const logs = harness.getAuditLogs();
    expect(logs).toHaveLength(1);
    expect(logs[0]?.action).toBe('LEDGER_POST_VOUCHER');
  });

  it('rejects transaction without tenant header with 400 Bad Request', async () => {
    const res = await harness.handlePostTransaction({
      transactionType: 'SALES_INVOICE',
      referenceNumber: 'INV-2026-002',
      date: '2026-10-15',
      contactName: 'Access Bank',
      subtotal: '250000.00',
      taxRate: 0.075,
    });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('MissingRequiredHeader');
  });

  it('blocks cross-tenant access attempt with 403 Forbidden', async () => {
    const res = await harness.handlePostTransaction(
      {
        transactionType: 'SALES_INVOICE',
        referenceNumber: 'INV-2026-003',
        date: '2026-10-15',
        contactName: 'Access Bank',
        subtotal: '250000.00',
        taxRate: 0.075,
      },
      { 'x-workspace-id': 'malicious-foreign-tenant' }
    );

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('CrossTenantAccessError');
  });

  it('rejects invalid or negative subtotal with 422 Unprocessable Entity', async () => {
    const res = await harness.handlePostTransaction(
      {
        transactionType: 'SALES_INVOICE',
        referenceNumber: 'INV-2026-004',
        date: '2026-10-15',
        contactName: 'Access Bank',
        subtotal: '-50000.00',
        taxRate: 0.075,
      },
      { 'x-workspace-id': 'ws-lagos-hq' }
    );

    expect(res.status).toBe(422);
    expect(res.body.error).toBe('UnprocessableEntity');
  });

  it('simulates transient 503 service unavailable with recovery on retry', async () => {
    harness.setOptions({
      failNextWithStatus: 503,
      failNextWithMessage: 'Ledger database undergoing snapshot maintenance',
    });

    // First attempt fails
    const failRes = await harness.handlePostTransaction(
      {
        transactionType: 'CUSTOMER_RECEIPT',
        referenceNumber: 'REC-2026-001',
        date: '2026-10-16',
        contactName: 'Dangote Industries',
        subtotal: '1075000.00',
        taxRate: 0,
      },
      { 'x-workspace-id': 'ws-lagos-hq' }
    );

    expect(failRes.status).toBe(503);
    expect(failRes.body.error).toBe('SimulatedApiError');

    // Second attempt recovers cleanly
    const retryRes = await harness.handlePostTransaction(
      {
        transactionType: 'CUSTOMER_RECEIPT',
        referenceNumber: 'REC-2026-001',
        date: '2026-10-16',
        contactName: 'Dangote Industries',
        subtotal: '1075000.00',
        taxRate: 0,
      },
      { 'x-workspace-id': 'ws-lagos-hq' }
    );

    expect(retryRes.status).toBe(201);
    expect(retryRes.body.success).toBe(true);
  });
});
