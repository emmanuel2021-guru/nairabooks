import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { GET, PUT } from "@/app/api/records/[collection]/route";
import { loginWithCredentialsViaBff, registerWorkspaceAccountViaBff } from "@/lib/auth-bff";
import { readDocument } from "@/lib/persistence";

function registerTenant(): { cookie: string; workspaceId: string } {
  const res = registerWorkspaceAccountViaBff(
    JSON.stringify({
      fullName: "Records Owner",
      email: `records-${Date.now()}-${Math.random().toString(36).slice(2)}@records.ng`,
      password: "Records#2026",
      workspaceName: "Records Ltd",
      rcNumber: "RC 330033",
    }),
  );
  expect(res.status).toBe(201);
  return {
    cookie: res.setCookie!.split(";")[0]!,
    workspaceId: (res.body as { workspace: { id: string } }).workspace.id,
  };
}

const ctx = (collection: string) => ({ params: Promise.resolve({ collection }) });

function get(collection: string, cookie?: string) {
  return GET(
    new NextRequest(`http://localhost/api/records/${collection}`, {
      headers: cookie ? { cookie } : {},
    }),
    ctx(collection),
  );
}

function put(collection: string, body: unknown, cookie?: string) {
  return PUT(
    new NextRequest(`http://localhost/api/records/${collection}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...(cookie ? { cookie } : {}) },
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
    ctx(collection),
  );
}

describe("/api/records/[collection]", () => {
  it("returns null data for a collection that was never saved", async () => {
    const tenant = registerTenant();
    const res = await get("transactions", tenant.cookie);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      workspaceId: tenant.workspaceId,
      collection: "transactions",
      data: null,
    });
  });

  it("saves a collection to the document store under the caller's workspace", async () => {
    const tenant = registerTenant();
    const records = [{ id: "tx-1", reference: "INV-001" }];
    expect((await put("transactions", records, tenant.cookie)).status).toBe(200);

    expect(readDocument(`records:transactions:${tenant.workspaceId}`)).toEqual(records);
    const res = await get("transactions", tenant.cookie);
    expect(((await res.json()) as { data: unknown }).data).toEqual(records);
  });

  it("keeps workspaces' records apart", async () => {
    const a = registerTenant();
    const b = registerTenant();
    await put("admin-records", [{ id: "cust-a" }], a.cookie);
    const seenByB = (await (await get("admin-records", b.cookie)).json()) as { data: unknown };
    expect(seenByB.data).toBeNull();
  });

  it("validates collection names and payload shapes", async () => {
    const tenant = registerTenant();
    expect((await get("passwords", tenant.cookie)).status).toBe(404);
    expect((await put("transactions", { not: "a list" }, tenant.cookie)).status).toBe(400);
    expect((await put("company-settings", [1, 2], tenant.cookie)).status).toBe(400);
    expect((await put("transactions", "{broken", tenant.cookie)).status).toBe(400);
    expect((await put("company-settings", { companyName: "Records Ltd" }, tenant.cookie)).status).toBe(200);
  });

  it("rejects saves from read-only roles", async () => {
    const auditor = loginWithCredentialsViaBff(
      JSON.stringify({ email: "auditor@icanaudit.ng", password: "NairaBooks#2026" }),
    );
    expect(auditor.status).toBe(200);
    const cookie = auditor.setCookie!.split(";")[0]!;
    expect((await get("transactions", cookie)).status).toBe(200);
    expect((await put("transactions", [], cookie)).status).toBe(403);
  });
});
