import { describe, it, expect } from 'vitest';
import { securityHeaders } from '../../next.config';

describe('Security Hardening & HTTP Headers (`security-scanning-security-hardening`)', () => {
  it('configures strict Content-Security-Policy header blocking framing and restricting sources', () => {
    const csp = securityHeaders.find((h) => h.key === 'Content-Security-Policy');
    expect(csp).toBeDefined();
    expect(csp?.value).toContain("default-src 'self'");
    expect(csp?.value).toContain("frame-ancestors 'none'");
  });

  it('configures strict X-Frame-Options to DENY clickjacking', () => {
    const xfo = securityHeaders.find((h) => h.key === 'X-Frame-Options');
    expect(xfo).toBeDefined();
    expect(xfo?.value).toBe('DENY');
  });

  it('configures X-Content-Type-Options to nosniff', () => {
    const nosniff = securityHeaders.find((h) => h.key === 'X-Content-Type-Options');
    expect(nosniff).toBeDefined();
    expect(nosniff?.value).toBe('nosniff');
  });

  it('configures Strict-Transport-Security (HSTS) with 2-year duration and preload', () => {
    const hsts = securityHeaders.find((h) => h.key === 'Strict-Transport-Security');
    expect(hsts).toBeDefined();
    expect(hsts?.value).toContain('max-age=63072000');
    expect(hsts?.value).toContain('includeSubDomains');
    expect(hsts?.value).toContain('preload');
  });

  it('restricts browser hardware capabilities via Permissions-Policy', () => {
    const perm = securityHeaders.find((h) => h.key === 'Permissions-Policy');
    expect(perm).toBeDefined();
    expect(perm?.value).toContain('camera=()');
    expect(perm?.value).toContain('microphone=()');
    expect(perm?.value).toContain('geolocation=()');
  });
});
