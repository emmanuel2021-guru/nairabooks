import { describe, expect, it } from "vitest";
import { getLocalAuthState, registerWorkspaceAccountViaBff } from "@/lib/auth-bff";

type Session = { workspace: { id: string; legalName: string }; user: { id: string } };

function register(email: string, password: string, workspaceName: string) {
  return registerWorkspaceAccountViaBff(
    JSON.stringify({ fullName: "Ada Owner", email, password, workspaceName }),
  );
}

describe("creating another company with an existing login", () => {
  it("adds the new company to the account when the password matches", () => {
    const email = `multi-${Date.now()}@co.ng`;
    const first = register(email, "Owner#2026pass", "First Company Ltd");
    expect(first.status).toBe(201);

    const second = register(email.toUpperCase(), "Owner#2026pass", "Second Company Ltd");
    expect(second.status).toBe(201);
    expect(second.setCookie).toBeTruthy();
    const a = first.body as Session;
    const b = second.body as Session;
    expect(b.workspace.legalName).toBe("Second Company Ltd");
    expect(b.workspace.id).not.toBe(a.workspace.id);

    const state = getLocalAuthState();
    expect(state.users.filter((u) => u.email === email)).toHaveLength(1);
    const owned = state.memberships.filter((m) => m.userId === a.user.id).map((m) => m.workspaceId);
    expect(owned).toEqual(expect.arrayContaining([a.workspace.id, b.workspace.id]));
  });

  it("refuses with a clear message when the password is wrong, and does not create a company", () => {
    const email = `taken-${Date.now()}@co.ng`;
    expect(register(email, "Owner#2026pass", "Taken Ltd").status).toBe(201);
    const before = getLocalAuthState().workspaces.length;

    const res = register(email, "Wrong#password1", "Intruder Ltd");
    expect(res.status).toBe(409);
    expect((res.body as { field: string; message: string }).field).toBe("email");
    expect((res.body as { message: string }).message).toMatch(/password to add this company/);
    expect(getLocalAuthState().workspaces.length).toBe(before);
  });

  it("rate-limits repeated wrong passwords", () => {
    const email = `limit-${Date.now()}@co.ng`;
    register(email, "Owner#2026pass", "Limit Ltd");
    for (let i = 0; i < 5; i++) register(email, `Wrong#pass${i}x`, "X Ltd");
    expect(register(email, "Owner#2026pass", "Y Ltd").status).toBe(429);
  });
});
