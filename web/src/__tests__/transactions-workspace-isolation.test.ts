import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "@/app/api/transactions/route";
import { registerWorkspaceAccountViaBff } from "@/lib/auth-bff";

interface VoucherConnection {
  edges: Array<{ node: { id: string; reference: string } }>;
}

function registerTenant(label: string): { cookie: string; workspaceId: string } {
  const res = registerWorkspaceAccountViaBff(
    JSON.stringify({
      fullName: `${label} Owner`,
      email: `${label.toLowerCase()}-${Date.now()}-${Math.random().toString(36).slice(2)}@isolation.ng`,
      password: "Isolation#2026",
      workspaceName: `${label} Ventures Ltd`,
      rcNumber: "RC 424242",
    }),
  );
  expect(res.status).toBe(201);
  expect(res.setCookie).toBeDefined();
  const body = res.body as { workspace: { id: string } };
  return { cookie: res.setCookie!.split(";")[0]!, workspaceId: body.workspace.id };
}

function postTransaction(reference: string, cookie?: string): Promise<Response> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (cookie) headers.cookie = cookie;
  return POST(
    new NextRequest("http://localhost:3000/api/transactions", {
      method: "POST",
      headers,
      body: JSON.stringify({
        typeId: "receive-money",
        reference,
        counterparty: "Isolation Customer",
        date: "2026-10-20",
        amountNgn: 25000,
      }),
    }),
  );
}

async function listReferences(cookie?: string): Promise<string[]> {
  const res = await GET(
    new NextRequest("http://localhost:3000/api/transactions?first=100", {
      headers: cookie ? { cookie } : {},
    }),
  );
  expect(res.status).toBe(200);
  const body = (await res.json()) as VoucherConnection;
  return body.edges.map((e) => e.node.reference);
}

describe("/api/transactions workspace isolation", () => {
  it("posts a registered tenant's transaction into that tenant's own ledger only", async () => {
    const tenant = registerTenant("Isolated");
    const reference = `ISO-${Date.now()}`;

    const res = await postTransaction(reference, tenant.cookie);
    expect(res.status).toBe(201);

    expect(await listReferences(tenant.cookie)).toContain(reference);
    // The demo workspace (unauthenticated fallback) must not see it.
    expect(await listReferences()).not.toContain(reference);
  });

  it("keeps two registered tenants' transactions apart", async () => {
    const a = registerTenant("Alpha");
    const b = registerTenant("Bravo");
    const refA = `ALPHA-${Date.now()}`;
    const refB = `BRAVO-${Date.now()}`;

    expect((await postTransaction(refA, a.cookie)).status).toBe(201);
    expect((await postTransaction(refB, b.cookie)).status).toBe(201);

    const seenByA = await listReferences(a.cookie);
    const seenByB = await listReferences(b.cookie);
    expect(seenByA).toContain(refA);
    expect(seenByA).not.toContain(refB);
    expect(seenByB).toContain(refB);
    expect(seenByB).not.toContain(refA);
  });

  it("does not show the demo workspace's transactions to a new tenant", async () => {
    const demoRef = `DEMO-${Date.now()}`;
    expect((await postTransaction(demoRef)).status).toBe(201);

    const tenant = registerTenant("Fresh");
    expect(await listReferences(tenant.cookie)).not.toContain(demoRef);
  });
});
