import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Durable storage for the BFF's state documents (auth directory, per-workspace ledgers,
 * tax/pack profiles, Admin/Transactions records). Each document is one JSON value under a
 * string key, e.g. `auth` or `ledger:<workspaceId>`.
 */
export interface DocumentStore {
  readonly kind: "memory" | "file" | "postgres";
  loadAll(): Promise<Map<string, unknown>>;
  save(key: string, doc: unknown): Promise<void>;
}

/** Unit tests: documents live only in the process-wide cache. */
export class MemoryDocumentStore implements DocumentStore {
  readonly kind = "memory" as const;
  async loadAll(): Promise<Map<string, unknown>> {
    return new Map();
  }
  async save(): Promise<void> {
    // The shared cache is the storage.
  }
}

/** Local development without a database: one JSON file per document under `.data/documents`. */
export class FileDocumentStore implements DocumentStore {
  readonly kind = "file" as const;
  constructor(private readonly dataDir: string) {}

  private get documentsDir(): string {
    return join(this.dataDir, "documents");
  }

  async loadAll(): Promise<Map<string, unknown>> {
    const docs = new Map<string, unknown>();
    if (existsSync(this.documentsDir)) {
      for (const file of readdirSync(this.documentsDir)) {
        if (!file.endsWith(".json")) continue;
        const key = decodeURIComponent(file.slice(0, -".json".length));
        docs.set(key, JSON.parse(readFileSync(join(this.documentsDir, file), "utf-8")));
      }
    }
    // One-time import of the pre-database auth file so existing local accounts survive.
    const legacyAuth = join(this.dataDir, "auth-state.json");
    if (!docs.has("auth") && existsSync(legacyAuth)) {
      docs.set("auth", JSON.parse(readFileSync(legacyAuth, "utf-8")));
    }
    return docs;
  }

  async save(key: string, doc: unknown): Promise<void> {
    mkdirSync(this.documentsDir, { recursive: true });
    const target = join(this.documentsDir, `${encodeURIComponent(key)}.json`);
    const temp = `${target}.tmp`;
    writeFileSync(temp, JSON.stringify(doc), "utf-8");
    renameSync(temp, target); // atomic replace: a crash never leaves half a document
  }
}

/** Minimal query surface shared by `pg.Pool` (Neon, local Postgres) and PGlite (tests). */
export interface Queryable {
  query(text: string, params?: unknown[]): Promise<{ rows: Record<string, unknown>[] }>;
}

export const DOCUMENTS_TABLE_DDL = `CREATE TABLE IF NOT EXISTS nb_documents (
  key text PRIMARY KEY,
  doc jsonb NOT NULL,
  version bigint NOT NULL DEFAULT 1,
  updated_at timestamptz NOT NULL DEFAULT now()
)`;

/** Production: documents in a Postgres table (Neon), one row per key. */
export class PostgresDocumentStore implements DocumentStore {
  readonly kind = "postgres" as const;
  private ready: Promise<void> | null = null;

  constructor(private readonly db: Queryable) {}

  private ensureTable(): Promise<void> {
    this.ready ??= this.db.query(DOCUMENTS_TABLE_DDL).then(() => undefined);
    return this.ready;
  }

  async loadAll(): Promise<Map<string, unknown>> {
    await this.ensureTable();
    const { rows } = await this.db.query("SELECT key, doc FROM nb_documents");
    const docs = new Map<string, unknown>();
    for (const row of rows) {
      const raw = row.doc;
      docs.set(String(row.key), typeof raw === "string" ? JSON.parse(raw) : raw);
    }
    return docs;
  }

  async save(key: string, doc: unknown): Promise<void> {
    await this.ensureTable();
    await this.db.query(
      `INSERT INTO nb_documents (key, doc) VALUES ($1, $2::jsonb)
       ON CONFLICT (key) DO UPDATE
         SET doc = EXCLUDED.doc, version = nb_documents.version + 1, updated_at = now()`,
      [key, JSON.stringify(doc)],
    );
  }
}
