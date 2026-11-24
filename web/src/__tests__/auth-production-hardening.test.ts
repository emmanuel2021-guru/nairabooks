import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { resolveAuthRuntimeConfig } from "@/lib/auth-config";
import {
  assignWorkspaceMemberViaBff,
  authorizeApiRequest,
  fetchSecurityWorkspaceInitialData,
  getSessionFromRequestViaBff,
  loginWithCredentialsViaBff,
  registerWorkspaceAccountViaBff,
  resetLocalAuthStateForTesting,
  resetPasswordViaBff,
  ROLE_PERMISSIONS,
} from "@/lib/auth-bff";

const STRONG_SECRET = "s".repeat(48);
const DEV_DEMO_PASSWORD = "NairaBooks#2026";

function useEnv(vars: Record<string, string | undefined>): void {
  for (const [key, value] of Object.entries(vars)) {
    vi.stubEnv(key, value as string);
  }
  resetLocalAuthStateForTesting();
}

function registerPayload(): string {
  return JSON.stringify({
    fullName: "Prod Owner",
    email: `prod-${Date.now()}-${Math.random().toString(36).slice(2)}@hardening.ng`,
    password: "Hardened#2026",
    workspaceName: "Hardened Ltd",
    rcNumber: "RC 515151",
  });
}

afterEach(() => {
  vi.unstubAllEnvs();
  resetLocalAuthStateForTesting();
});

describe("resolveAuthRuntimeConfig", () => {
  it("in development falls back to a generated secret and the built-in demo password", () => {
    const cfg = resolveAuthRuntimeConfig({ NODE_ENV: "development" });
    expect(cfg.isProduction).toBe(false);
    expect(cfg.sessionSecret).toMatch(/^[0-9a-f]{64}$/);
    expect(cfg.demoPassword).toBe(DEV_DEMO_PASSWORD);
    expect(cfg.allowAnonymousDemoContext).toBe(true);
  });

  it("in production refuses a missing or short session secret", () => {
    expect(resolveAuthRuntimeConfig({ NODE_ENV: "production" }).sessionSecret).toBeNull();
    expect(
      resolveAuthRuntimeConfig({ NODE_ENV: "production", NAIRABOOKS_SESSION_SECRET: "short" })
        .sessionSecret,
    ).toBeNull();
    expect(
      resolveAuthRuntimeConfig({ NODE_ENV: "production", NAIRABOOKS_SESSION_SECRET: STRONG_SECRET })
        .sessionSecret,
    ).toBe(STRONG_SECRET);
  });

  it("in production disables demo accounts unless NAIRABOOKS_DEMO_PASSWORD is set", () => {
    const off = resolveAuthRuntimeConfig({ NODE_ENV: "production", NAIRABOOKS_SESSION_SECRET: STRONG_SECRET });
    expect(off.demoPassword).toBeNull();
    const on = resolveAuthRuntimeConfig({
      NODE_ENV: "production",
      NAIRABOOKS_SESSION_SECRET: STRONG_SECRET,
      NAIRABOOKS_DEMO_PASSWORD: "PublicDemo#2026",
    });
    expect(on.demoPassword).toBe("PublicDemo#2026");
    // Anonymous requests never act as the demo owner in production, even with demo on.
    expect(on.allowAnonymousDemoContext).toBe(false);
  });
});

describe("auth BFF in production", () => {
  it("refuses to issue sessions when the session secret is not configured", () => {
    useEnv({ NODE_ENV: "production", NAIRABOOKS_SESSION_SECRET: undefined });
    const res = registerWorkspaceAccountViaBff(registerPayload());
    expect(res.status).toBe(503);
    expect(res.setCookie).toBeUndefined();
  });

  it("does not seed or revive demo accounts when demo is not opted in", () => {
    // A dev run first persists the demo users to the local data file.
    useEnv({ NODE_ENV: "development" });
    expect(registerWorkspaceAccountViaBff(registerPayload()).status).toBe(201);

    useEnv({
      NODE_ENV: "production",
      NAIRABOOKS_SESSION_SECRET: STRONG_SECRET,
      NAIRABOOKS_DEMO_PASSWORD: undefined,
    });
    const login = loginWithCredentialsViaBff(
      JSON.stringify({ email: "owner@lagostrading.ng", password: DEV_DEMO_PASSWORD }),
    );
    expect(login.status).toBe(401);
  });

  it("lets demo accounts sign in only with the configured demo password", () => {
    useEnv({
      NODE_ENV: "production",
      NAIRABOOKS_SESSION_SECRET: STRONG_SECRET,
      NAIRABOOKS_DEMO_PASSWORD: "PublicDemo#2026",
    });
    const withDefault = loginWithCredentialsViaBff(
      JSON.stringify({ email: "cfo@lagostrading.ng", password: DEV_DEMO_PASSWORD }),
    );
    expect(withDefault.status).toBe(401);
    const withConfigured = loginWithCredentialsViaBff(
      JSON.stringify({ email: "cfo@lagostrading.ng", password: "PublicDemo#2026" }),
    );
    expect(withConfigured.status).toBe(200);
  });

  it("rejects requests without a session cookie instead of acting as the demo owner", async () => {
    useEnv({
      NODE_ENV: "production",
      NAIRABOOKS_SESSION_SECRET: STRONG_SECRET,
      NAIRABOOKS_DEMO_PASSWORD: "PublicDemo#2026",
    });
    const req = new NextRequest("http://localhost:3000/api/ledger/vouchers");
    const auth = await authorizeApiRequest(req, "LEDGER_READ");
    expect(auth.ok).toBe(false);
    if (!auth.ok) expect(auth.status).toBe(401);

    const session = getSessionFromRequestViaBff(new NextRequest("http://localhost:3000/api/auth/session"));
    expect(session.status).toBe(401);
  });

  it("does not let anyone reset a password by email alone", () => {
    useEnv({ NODE_ENV: "production", NAIRABOOKS_SESSION_SECRET: STRONG_SECRET });
    const payload = JSON.parse(registerPayload()) as { email: string };
    expect(registerWorkspaceAccountViaBff(JSON.stringify(payload)).status).toBe(201);
    const reset = resetPasswordViaBff(
      JSON.stringify({ email: payload.email, password: "Attacker#2026" }),
    );
    expect(reset.status).toBe(403);
    const login = loginWithCredentialsViaBff(
      JSON.stringify({ email: payload.email, password: "Attacker#2026" }),
    );
    expect(login.status).toBe(401);
  });

  it("gives invited members a one-time random password, not the shared demo password", () => {
    useEnv({ NODE_ENV: "production", NAIRABOOKS_SESSION_SECRET: STRONG_SECRET });
    const reg = registerWorkspaceAccountViaBff(registerPayload());
    const session = reg.body as { user: { id: string; email: string; fullName: string }; workspace: { id: string } };
    const inviteEmail = `invitee-${Date.now()}@hardening.ng`;
    const invite = assignWorkspaceMemberViaBff(
      {
        userId: session.user.id,
        email: session.user.email,
        fullName: session.user.fullName,
        workspaceId: session.workspace.id,
        role: "OWNER_MANAGING_DIRECTOR",
        permissions: ROLE_PERMISSIONS.OWNER_MANAGING_DIRECTOR,
        isAuthenticatedCookie: true,
      },
      JSON.stringify({ email: inviteEmail, fullName: "New Bookkeeper", role: "BOOKKEEPER" }),
    );
    expect(invite.status).toBe(201);
    const temp = (invite.body as { temporaryPassword?: string }).temporaryPassword;
    expect(temp).toBeDefined();
    expect(temp).not.toBe(DEV_DEMO_PASSWORD);
    expect(temp!.length).toBeGreaterThanOrEqual(16);

    expect(
      loginWithCredentialsViaBff(JSON.stringify({ email: inviteEmail, password: DEV_DEMO_PASSWORD }))
        .status,
    ).toBe(401);
    expect(
      loginWithCredentialsViaBff(JSON.stringify({ email: inviteEmail, password: temp })).status,
    ).toBe(200);
  });

  it("has no anonymous security dashboard data when demo accounts are off", async () => {
    useEnv({ NODE_ENV: "production", NAIRABOOKS_SESSION_SECRET: STRONG_SECRET });
    expect(await fetchSecurityWorkspaceInitialData()).toBeNull();
  });

  it("issues working sessions for registered users when correctly configured", async () => {
    useEnv({ NODE_ENV: "production", NAIRABOOKS_SESSION_SECRET: STRONG_SECRET });
    const reg = registerWorkspaceAccountViaBff(registerPayload());
    expect(reg.status).toBe(201);
    const cookie = reg.setCookie!.split(";")[0]!;
    const auth = await authorizeApiRequest(
      new NextRequest("http://localhost:3000/api/ledger/vouchers", { headers: { cookie } }),
      "LEDGER_READ",
    );
    expect(auth.ok).toBe(true);
  });
});
