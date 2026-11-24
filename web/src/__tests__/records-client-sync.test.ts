import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  hydrateTransactionsFromServer,
  loadTransactions,
  resetTransactionsStore,
  saveTransactions,
} from "@/components/transactions/transactions-store";
import type { TransactionRecord } from "@/components/transactions/transactions-data";

const WS = "dddddddd-dddd-4ddd-8ddd-dddddddd0001";
const OTHER_WS = "eeeeeeee-eeee-4eee-8eee-eeeeeeee0001";

const tx = (id: string) => ({ id, reference: id }) as unknown as TransactionRecord;

type FetchCall = { url: string; init?: RequestInit };
let calls: FetchCall[];

function mockServer(saved: unknown): void {
  calls = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      calls.push({ url, init });
      if (!init?.method || init.method === "GET") {
        return new Response(JSON.stringify({ workspaceId: WS, collection: "transactions", data: saved }), {
          status: 200,
        });
      }
      return new Response("{}", { status: 200 });
    }),
  );
}

const puts = () => calls.filter((c) => c.init?.method === "PUT");

beforeEach(() => {
  vi.useFakeTimers();
  window.sessionStorage.clear();
  resetTransactionsStore(WS);
  resetTransactionsStore(OTHER_WS);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("transactions store ↔ server sync", () => {
  it("replaces the local cache with the server's saved records", async () => {
    mockServer([tx("SERVER-1"), tx("SERVER-2")]);
    await hydrateTransactionsFromServer();
    expect(loadTransactions(WS).map((t) => t.id)).toEqual(["SERVER-1", "SERVER-2"]);
    expect(window.localStorage.getItem("nairabooks_active_workspace")).toBe(WS);
  });

  it("uploads changes to the server after a short debounce, once", async () => {
    mockServer([]);
    await hydrateTransactionsFromServer();
    saveTransactions([tx("A")], WS);
    saveTransactions([tx("A"), tx("B")], WS);
    expect(puts()).toHaveLength(0);
    await vi.advanceTimersByTimeAsync(500);
    expect(puts()).toHaveLength(1);
    expect(puts()[0]!.url).toBe("/api/records/transactions");
    expect(JSON.parse(String(puts()[0]!.init!.body)).map((t: { id: string }) => t.id)).toEqual(["A", "B"]);
  });

  it("uploads this browser's records when the workspace has never saved any", async () => {
    mockServer(null);
    saveTransactions([tx("LOCAL-ONLY")], WS); // before the server is known: not uploaded
    await hydrateTransactionsFromServer();
    await vi.advanceTimersByTimeAsync(500);
    expect(puts()).toHaveLength(1);
    expect(JSON.parse(String(puts()[0]!.init!.body))[0].id).toBe("LOCAL-ONLY");
  });

  it("never uploads records cached for a different workspace", async () => {
    mockServer([]);
    await hydrateTransactionsFromServer();
    saveTransactions([tx("STALE")], OTHER_WS);
    await vi.advanceTimersByTimeAsync(500);
    expect(puts()).toHaveLength(0);
  });
});
