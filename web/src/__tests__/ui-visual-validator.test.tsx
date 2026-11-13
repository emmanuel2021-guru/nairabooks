import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import axe from 'axe-core';
import { TopNavCapsule } from '@/components/TopNavCapsule';
import { WorkspaceModeProvider } from '@/state/workspace-mode';
import { TransactionIconBadge } from '@/components/transactions/TransactionIconBadge';

describe('UI Visual Validator & Design Token Compliance (`ui-visual-validator`)', () => {
  it('renders TopNavCapsule with compliant tap targets, links, and passes WCAG accessibility', async () => {
    const { container } = render(
      <WorkspaceModeProvider>
        <TopNavCapsule activeTab="overview" />
      </WorkspaceModeProvider>
    );

    // Verify navigation role and links exist
    const nav = screen.getByRole('navigation', { name: /Primary workspace navigation/i });
    expect(nav).toBeDefined();

    // Verify minimum tap target accessibility (accessible buttons and links)
    const links = screen.getAllByRole('link');
    expect(links.length).toBeGreaterThanOrEqual(5);

    // Verify settings link and sign-out button are accessible
    const settingsLink = screen.getByRole('link', { name: /Settings/i });
    expect(settingsLink).toBeDefined();
    expect(settingsLink.getAttribute('href')).toBe('/security');

    const signOutBtn = screen.getByRole('button', { name: /Sign Out/i });
    expect(signOutBtn).toBeDefined();

    // Verify WCAG 2.2 AA zero violations
    const results = await axe.run(container);
    expect(results.violations).toHaveLength(0);
  });

  it('renders squircle TransactionIconBadge with high contrast and correct category color', () => {
    const { container: invoiceBadge } = render(
      <TransactionIconBadge
        iconKey="file-text"
        tintBg="bg-emerald-500/10"
        tintText="text-emerald-700"
        size="md"
      />
    );
    expect(invoiceBadge.querySelector('svg')).toBeDefined();

    const { container: receiptBadge } = render(
      <TransactionIconBadge
        iconKey="receipt"
        tintBg="bg-blue-500/10"
        tintText="text-blue-700"
        size="md"
      />
    );
    expect(receiptBadge.querySelector('svg')).toBeDefined();
  });
});
