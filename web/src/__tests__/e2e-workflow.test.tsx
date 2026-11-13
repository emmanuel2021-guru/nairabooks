import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import axe from 'axe-core';
import { WorkspaceModeProvider } from '@/state/workspace-mode';
import { TopNavCapsule } from '@/components/TopNavCapsule';
import { BankReconciliationWorkspace } from '@/components/BankReconciliationWorkspace';
import { TransactionsHubWorkspace } from '@/components/TransactionsHubWorkspace';
import type { ChartOfAccount } from '@/types/ledger';

const DEMO_ACCOUNTS: readonly ChartOfAccount[] = [
  {
    id: "11111111-1111-4111-8111-111111110101",
    code: "1010",
    name: "Zenith Bank Current Account (NGN)",
    category: "ASSET",
    ifrsTag: "CASH_AND_CASH_EQUIVALENTS",
    sourcePrimitive: "BOOKKEEPING_AND_LEDGER",
    isSystemLocked: true,
    isActive: true,
  },
  {
    id: "11111111-1111-4111-8111-111111110102",
    code: "1020",
    name: "Access Bank Domiciliary (USD)",
    category: "ASSET",
    ifrsTag: "CASH_AND_CASH_EQUIVALENTS",
    sourcePrimitive: "MULTI_CURRENCY_AND_FX",
    isSystemLocked: false,
    isActive: true,
  },
];

describe('End-to-End Business Operations Workflow (`e2e-testing-patterns`)', () => {
  it('executes full bank statement reconciliation journey with zero axe violations', async () => {
    const { container } = render(
      <WorkspaceModeProvider>
        <TopNavCapsule activeTab="reconcile" />
        <main id="main-content">
          <BankReconciliationWorkspace accounts={DEMO_ACCOUNTS} />
        </main>
      </WorkspaceModeProvider>
    );

    // Initial state: verify heading
    expect(screen.getByRole('heading', { name: /Account Reconciliation/i })).toBeDefined();

    // Verify commercial bank statement is present
    expect(screen.getAllByText(/Commercial Bank/i).length).toBeGreaterThanOrEqual(1);

    // Auto-match statement feed against General Ledger
    const autoMatchBtn = screen.getByRole('button', { name: /Auto-Match Feed/i });
    expect(autoMatchBtn).toBeDefined();
    fireEvent.click(autoMatchBtn);

    // Verify zero WCAG accessibility violations on the full reconciliation studio
    const axeResults = await axe.run(container);
    expect(axeResults.violations).toHaveLength(0);
  });

  it('renders transactions hub and navigates between operational pillars', async () => {
    const { container } = render(
      <WorkspaceModeProvider>
        <TopNavCapsule activeTab="transactions" />
        <main id="main-content">
          <TransactionsHubWorkspace />
        </main>
      </WorkspaceModeProvider>
    );

    // Check heading
    expect(screen.getByRole('heading', { name: /^Transactions$/i })).toBeDefined();

    // Switch between Money In and Money Out pillars
    const moneyOutTab = screen.getByRole('tab', { name: /Money Out/i });
    fireEvent.click(moneyOutTab);
    expect(moneyOutTab.getAttribute('aria-selected')).toBe('true');

    // Verify zero WCAG violations
    const axeResults = await axe.run(container);
    expect(axeResults.violations).toHaveLength(0);
  });
});
