import { join } from "node:path";
import { NextResponse } from "next/server";
import { Pool } from "pg";
import {
  FileDocumentStore,
  MemoryDocumentStore,
  PostgresDocumentStore,
  type DocumentStore,
} from "@/lib/persistence/document-store";

/**
 * Process-wide document cache with write-through persistence.
 *
 * Domain code stays synchronous: it reads documents from the cache (`readDocument`) and
 * queues saves (`writeDocument`). Every route handler is wrapped in `withPersistence`,
 * which loads all documents once before the first request and waits for queued saves to
 * reach the store before the response is sent. Server pages call `ensureHydrated()`.
 */

interface PersistenceRuntime {
  store: DocumentStore;
  cache: Map<string, unknown>;
  hydrated: boolean;
  hydration: Promise<void> | null;
  chains: Map<string, Promise<void>>;
  queued: Set<string>;
  errors: unknown[];
}

const globalRef = globalThis as typeof globalThis & { __nairabooksPersistence?: PersistenceRuntime };

function resolveDataDir(): string {
  const cwd = process.cwd();
  return join(cwd.endsWith("web") ? cwd : join(cwd, "web"), ".data");
}

function createDefaultStore(): DocumentStore {
  const url = process.env.DATABASE_URL?.trim();
  if (url) {
    return new PostgresDocumentStore(new Pool({ connectionString: url, max: 5 }));
  }
  if (process.env.VITEST || process.env.NODE_ENV === "test") {
    return new MemoryDocumentStore();
  }
  if (process.env.NODE_ENV === "production") {
    console.warn(
      "[nairabooks] DATABASE_URL is not set: data is saved to the local disk and is lost " +
        "whenever this host's filesystem is reset (e.g. every Render free-tier deploy).",
    );
  }
  return new FileDocumentStore(resolveDataDir());
}

function createRuntime(store: DocumentStore): PersistenceRuntime {
  return {
    store,
    cache: new Map(),
    // Memory stores have nothing to load, so they are usable immediately.
    hydrated: store.kind === "memory",
    hydration: null,
    chains: new Map(),
    queued: new Set(),
    errors: [],
  };
}

function runtime(): PersistenceRuntime {
  globalRef.__nairabooksPersistence ??= createRuntime(createDefaultStore());
  return globalRef.__nairabooksPersistence;
}

export function getDocumentStoreKind(): DocumentStore["kind"] {
  return runtime().store.kind;
}

/** Tests: swap the backing store (and start from an empty cache). */
export function configureDocumentStoreForTesting(store: DocumentStore): void {
  globalRef.__nairabooksPersistence = createRuntime(store);
}

export function isHydrated(): boolean {
  return runtime().hydrated;
}

/** Load every stored document into the cache once per process. Safe to call repeatedly. */
export function ensureHydrated(): Promise<void> {
  const rt = runtime();
  if (rt.hydrated) return Promise.resolve();
  rt.hydration ??= rt.store
    .loadAll()
    .then((docs) => {
      for (const [key, doc] of docs) {
        if (!rt.cache.has(key)) rt.cache.set(key, doc);
      }
      rt.hydrated = true;
    })
    .catch((err: unknown) => {
      rt.hydration = null; // allow a retry on the next request
      throw err;
    });
  return rt.hydration;
}

export function readDocument<T>(key: string): T | undefined {
  return runtime().cache.get(key) as T | undefined;
}

/** Cache the document and queue a save. Saves per key run in order; bursts coalesce. */
export function writeDocument(key: string, doc: unknown): void {
  const rt = runtime();
  if (!rt.hydrated) {
    // Writing before the stored copy is loaded would overwrite it with partial data.
    throw new Error(`Refusing to save '${key}' before stored documents are loaded.`);
  }
  rt.cache.set(key, doc);
  if (rt.queued.has(key)) return;
  rt.queued.add(key);
  const previous = rt.chains.get(key) ?? Promise.resolve();
  const next = previous.then(async () => {
    rt.queued.delete(key);
    try {
      await rt.store.save(key, rt.cache.get(key));
    } catch (err) {
      rt.errors.push(err);
      console.error(`[nairabooks] failed to save document '${key}':`, err);
    }
  });
  rt.chains.set(key, next);
}

/** Wait for every queued save; throws if any failed since the last flush. */
export async function flushDocumentWrites(): Promise<void> {
  const rt = runtime();
  while (rt.queued.size > 0 || rt.chains.size > 0) {
    const pending = [...rt.chains.values()];
    rt.chains.clear();
    await Promise.all(pending);
  }
  if (rt.errors.length > 0) {
    const [first] = rt.errors.splice(0);
    throw first instanceof Error ? first : new Error(String(first));
  }
}

function persistenceErrorResponse(message: string): NextResponse {
  return NextResponse.json(
    { __typename: "PersistenceError", code: "PERSISTENCE_UNAVAILABLE", message },
    { status: 503 },
  );
}

/** Wrap a route handler: load documents first, confirm saves before responding. */
export function withPersistence<A extends unknown[], R extends Response>(
  handler: (...args: A) => Promise<R>,
): (...args: A) => Promise<R | NextResponse> {
  return async (...args: A) => {
    try {
      await ensureHydrated();
    } catch (err) {
      console.error("[nairabooks] could not load stored documents:", err);
      return persistenceErrorResponse("The database is unavailable. Please try again shortly.");
    }
    const response = await handler(...args);
    try {
      await flushDocumentWrites();
    } catch {
      return persistenceErrorResponse(
        "Your change could not be saved to the database. Please try again.",
      );
    }
    return response;
  };
}
