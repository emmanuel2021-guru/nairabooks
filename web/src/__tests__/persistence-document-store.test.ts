// @vitest-environment node
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import {
  FileDocumentStore,
  MemoryDocumentStore,
  PostgresDocumentStore,
  type DocumentStore,
  type Queryable,
} from "@/lib/persistence/document-store";
import {
  configureDocumentStoreForTesting,
  ensureHydrated,
  flushDocumentWrites,
  readDocument,
  withPersistence,
  writeDocument,
} from "@/lib/persistence";

let pg: PGlite;
const pgQueryable = (): Queryable => ({
  query: (text, params) => pg.query(text, params as unknown[]) as Promise<{ rows: Record<string, unknown>[] }>,
});

beforeAll(async () => {
  pg = new PGlite();
  await pg.waitReady;
}, 60_000);

afterEach(() => {
  configureDocumentStoreForTesting(new MemoryDocumentStore());
});

/** Simulate a server restart: new runtime over the same backing store. */
async function restart(store: DocumentStore): Promise<void> {
  configureDocumentStoreForTesting(store);
  await ensureHydrated();
}

describe("PostgresDocumentStore (real Postgres via PGlite)", () => {
  it("creates its table, upserts documents and bumps the version", async () => {
    const store = new PostgresDocumentStore(pgQueryable());
    await store.save("ledger:ws-1", { vouchers: [{ ref: "JV-1" }] });
    await store.save("ledger:ws-1", { vouchers: [{ ref: "JV-1" }, { ref: "JV-2" }] });
    const docs = await store.loadAll();
    expect(docs.get("ledger:ws-1")).toEqual({ vouchers: [{ ref: "JV-1" }, { ref: "JV-2" }] });
    const { rows } = await pg.query<{ version: number }>(
      "SELECT version FROM nb_documents WHERE key = 'ledger:ws-1'",
    );
    expect(Number(rows[0]!.version)).toBe(2);
  });

  it("keeps written documents across a simulated server restart", async () => {
    const store = new PostgresDocumentStore(pgQueryable());
    await restart(store);
    writeDocument("auth", { users: [{ email: "ada@restart.ng" }] });
    await flushDocumentWrites();

    await restart(new PostgresDocumentStore(pgQueryable()));
    expect(readDocument("auth")).toEqual({ users: [{ email: "ada@restart.ng" }] });
  });
});

describe("FileDocumentStore", () => {
  it("round-trips documents and imports the legacy auth-state.json once", async () => {
    const dir = mkdtempSync(join(tmpdir(), "nb-docs-"));
    try {
      writeFileSync(join(dir, "auth-state.json"), JSON.stringify({ users: [{ id: "legacy" }] }));
      const store = new FileDocumentStore(dir);
      await restart(store);
      expect(readDocument("auth")).toEqual({ users: [{ id: "legacy" }] });

      writeDocument("records:transactions:ws-9", [{ id: "tx-1" }]);
      await flushDocumentWrites();
      await restart(new FileDocumentStore(dir));
      expect(readDocument("records:transactions:ws-9")).toEqual([{ id: "tx-1" }]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("persistence runtime", () => {
  it("refuses to write before stored documents are loaded", () => {
    configureDocumentStoreForTesting(new PostgresDocumentStore(pgQueryable()));
    expect(() => writeDocument("auth", {})).toThrow(/before stored documents are loaded/);
  });

  it("withPersistence hydrates first and reports failed saves as 503", async () => {
    const failing: DocumentStore = {
      kind: "postgres",
      loadAll: async () => new Map([["auth", { seeded: true }]]),
      save: async () => {
        throw new Error("connection reset");
      },
    };
    configureDocumentStoreForTesting(failing);
    const handler = withPersistence(async () => {
      expect(readDocument("auth")).toEqual({ seeded: true });
      writeDocument("auth", { seeded: false });
      return new Response("ok", { status: 200 });
    });
    const res = await handler();
    expect(res.status).toBe(503);
  });

  it("withPersistence returns 503 when the database cannot be reached", async () => {
    configureDocumentStoreForTesting({
      kind: "postgres",
      loadAll: async () => {
        throw new Error("ECONNREFUSED");
      },
      save: async () => undefined,
    });
    const res = await withPersistence(async () => new Response("unreachable"))();
    expect(res.status).toBe(503);
  });
});
