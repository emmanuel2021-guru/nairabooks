/**
 * Comprehensive NairaBooks API Mock Harness
 * Supports deterministic simulation of REST & GraphQL endpoints,
 * latency injection, tenant isolation testing, and error shapes.
 * 
 * Activated by: `api-testing-observability-api-mock` (#72) & `javascript-testing-patterns` (#69)
 */

export interface MockApiOptions {
  latencyMs?: number;
  failNextWithStatus?: number;
  failNextWithMessage?: string;
  enforceTenantHeader?: boolean;
}

export interface MockVoucherResponse {
  voucherId: string;
  voucherNumber: string;
  periodId: string;
  status: 'POSTED' | 'DRAFT' | 'REJECTED';
  currency: string;
  totalDebits: string;
  totalCredits: string;
  postedAt: string;
}

export interface MockTransactionPayload {
  transactionType: string;
  referenceNumber: string;
  date: string;
  contactName: string;
  subtotal: string;
  taxRate: number;
  whtRate?: number;
  details?: Record<string, unknown>;
}

export class NairaBooksApiMockHarness {
  private options: MockApiOptions;
  private voucherCounter = 1000;
  private postedVouchers: Map<string, MockVoucherResponse> = new Map();
  private auditLogs: Array<{ action: string; timestamp: string; details: unknown }> = [];

  constructor(options: MockApiOptions = {}) {
    this.options = {
      latencyMs: 0,
      enforceTenantHeader: true,
      ...options,
    };
  }

  public setOptions(newOptions: Partial<MockApiOptions>): void {
    this.options = { ...this.options, ...newOptions };
  }

  public getAuditLogs() {
    return [...this.auditLogs];
  }

  public clear(): void {
    this.postedVouchers.clear();
    this.auditLogs = [];
    this.options.failNextWithStatus = undefined;
    this.options.failNextWithMessage = undefined;
  }

  /**
   * Simulate POST /api/v1/ledger/transactions/post
   */
  public async handlePostTransaction(
    payload: MockTransactionPayload,
    headers: Record<string, string> = {}
  ): Promise<{ status: number; body: Record<string, unknown> }> {
    if (this.options.latencyMs && this.options.latencyMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, this.options.latencyMs));
    }

    // Check tenant isolation
    if (this.options.enforceTenantHeader) {
      const tenantId = headers['x-workspace-id'] || headers['X-Workspace-Id'];
      if (!tenantId) {
        return {
          status: 400,
          body: { error: 'MissingRequiredHeader', message: 'Missing X-Workspace-Id tenant header' },
        };
      }
      if (tenantId === 'malicious-foreign-tenant') {
        return {
          status: 403,
          body: { error: 'CrossTenantAccessError', message: 'Forbidden tenant cross-access attempt' },
        };
      }
    }

    // Check simulated failure injection
    if (this.options.failNextWithStatus) {
      const status = this.options.failNextWithStatus;
      const message = this.options.failNextWithMessage || 'Injected simulated failure';
      this.options.failNextWithStatus = undefined;
      this.options.failNextWithMessage = undefined;
      return {
        status,
        body: { error: 'SimulatedApiError', message },
      };
    }

    // Validate payload subtotal
    const subtotalNum = parseFloat(payload.subtotal);
    if (isNaN(subtotalNum) || subtotalNum <= 0) {
      return {
        status: 422,
        body: {
          error: 'UnprocessableEntity',
          message: 'Transaction subtotal must be a positive decimal number',
        },
      };
    }

    // Generate balanced double-entry voucher
    this.voucherCounter += 1;
    const voucherNumber = `JV-2026-${String(this.voucherCounter).padStart(5, '0')}`;
    const voucherId = `vch-mock-${Date.now()}-${this.voucherCounter}`;

    const vatAmount = subtotalNum * (payload.taxRate || 0);
    const totalGross = subtotalNum + vatAmount;

    const voucher: MockVoucherResponse = {
      voucherId,
      voucherNumber,
      periodId: 'fp-2026-10',
      status: 'POSTED',
      currency: 'NGN',
      totalDebits: totalGross.toFixed(2),
      totalCredits: totalGross.toFixed(2),
      postedAt: new Date().toISOString(),
    };

    this.postedVouchers.set(voucherId, voucher);
    this.auditLogs.push({
      action: 'LEDGER_POST_VOUCHER',
      timestamp: voucher.postedAt,
      details: { voucherNumber, payload },
    });

    return {
      status: 201,
      body: {
        success: true,
        voucher,
        auditRecorded: true,
      },
    };
  }

  /**
   * Simulate GET /api/v1/ledger/reports/trial-balance
   */
  public async handleGetTrialBalance(
    headers: Record<string, string> = {}
  ): Promise<{ status: number; body: Record<string, unknown> }> {
    if (this.options.enforceTenantHeader && !headers['x-workspace-id']) {
      return {
        status: 400,
        body: { error: 'MissingRequiredHeader', message: 'Missing X-Workspace-Id tenant header' },
      };
    }

    return {
      status: 200,
      body: {
        asOfDate: '2026-10-31',
        currency: 'NGN',
        isBalanced: true,
        totalDebits: '14520000.00',
        totalCredits: '14520000.00',
        accountsCount: 32,
      },
    };
  }
}
