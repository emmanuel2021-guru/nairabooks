// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { PGlite } from "@electric-sql/pglite";
import { MemoryDocumentStore, PostgresDocumentStore, type Queryable } from "@/lib/persistence/document-store";
import { configureDocumentStoreForTesting } from "@/lib/persistence";
import { resetLocalAuthStateForTesting } from "@/lib/auth-bff";
import { resetLocalLedgerStateForTesting } from "@/lib/bff-client";
import { POST as registerPost } from "@/app/api/auth/register/route";
import { POST as loginPost } from "@/app/api/auth/login/route";
import { GET as listTransactions, POST as postTransaction } from "@/app/api/transactions/route";
import { GET as getTaxProfile, POST as updateTaxProfile } from "@/app/api/tax/profile/route";

let pg: PGlite;
const store = () =>
  new PostgresDocumentStore({
    query: (text, params) => pg.query(text, params as unknown[]),
  } as Queryable);

/** A new process: empty in-memory state over the same database. */
function restartServer(): void {
  configureDocumentStoreForTesting(store());
  resetLocalAuthStateForTesting();
  resetLocalLedgerStateForTesting();
}

function cookieFrom(res: Response): string {
  const raw = res.headers.get("set-cookie") ?? "";
  const match = /nb_session=[^;]+/.exec(raw);
  if (!match) throw new Error(`no session cookie in: ${raw}`);
  return match[0];
}

beforeAll(async () => {
  // Like production: a fixed secret, so sessions stay valid across restarts.
  vi.stubEnv("NAIRABOOKS_SESSION_SECRET", "r".repeat(48));
  pg = new PGlite();
  await pg.waitReady;
  restartServer();
}, 60_000);

afterAll(() => {
  vi.unstubAllEnvs();
  configureDocumentStoreForTesting(new MemoryDocumentStore());
  resetLocalAuthStateForTesting();
  resetLocalLedgerStateForTesting();
});

describe("data survives a server restart (Postgres)", () => {
  const email = `restart-${Date.now()}@survival.ng`;
  const password = "Survival#2026";
  const reference = `SURV-${Date.now()}`;

  it("keeps accounts, ledger entries and tax settings after restart", async () => {
    const reg = await registerPost(
      new NextRequest("http://localhost/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: "Restart Owner",
          email,
          password,
          workspaceName: "Survival Ltd",
          rcNumber: "RC 900900",
        }),
      }),
    );
    expect(reg.status).toBe(201);
    const cookie = cookieFrom(reg);

    const posted = await postTransaction(
      new NextRequest("http://localhost/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json", cookie },
        body: JSON.stringify({
          typeId: "receive-money",
          reference,
          counterparty: "Durable Customer",
          date: "2026-10-21",
          amountNgn: 12000,
        }),
      }),
    );
    expect(posted.status).toBe(201);

    const taxUpdate = await updateTaxProfile(
      new NextRequest("http://localhost/api/tax/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json", cookie },
        body: JSON.stringify({
          legalForm: "PRIVATE_LIMITED",
          tinNumber: "99999999-0001",
          vatRegistered: true,
          annualTurnoverNgn: "12000000.00",
          fixedAssetsNgn: "5000000.00",
          stateOfOperation: "LAGOS",
          isProfessionalServices: false,
          effectiveFrom: "2026-01-01",
        }),
      }),
    );
    expect(taxUpdate.status).toBe(200);

    restartServer();

    // The old cookie still works (same secret) and the books are intact.
    const listed = await listTransactions(
      new NextRequest("http://localhost/api/transactions?first=50", { headers: { cookie } }),
    );
    expect(listed.status).toBe(200);
    const body = (await listed.json()) as { edges: Array<{ node: { reference: string } }> };
    expect(body.edges.map((e) => e.node.reference)).toContain(reference);

    const tax = await getTaxProfile(
      new NextRequest("http://localhost/api/tax/profile", { headers: { cookie } }),
    );
    const taxBody = (await tax.json()) as { profile: { tinNumber: string } };
    expect(taxBody.profile.tinNumber).toBe("99999999-0001");

    // And the account can sign in again from scratch.
    const login = await loginPost(
      new NextRequest("http://localhost/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      }),
    );
    expect(login.status).toBe(200);
  });

  it("keeps each workspace's tax profile separate", async () => {
    restartServer();
    const demoTax = await getTaxProfile(new NextRequest("http://localhost/api/tax/profile"));
    const demoBody = (await demoTax.json()) as { profile: { tinNumber: string } };
    expect(demoBody.profile.tinNumber).not.toBe("99999999-0001");
  });
});
