"use client";

/**
 * Keeps the browser's Admin/Transactions record caches in step with the server copy
 * (`/api/records/<collection>`, stored in Postgres in production).
 *
 * - `pullRecordCollection` loads the signed-in workspace's saved collection.
 * - `scheduleRecordPush` uploads a changed collection (debounced, last write wins).
 *   Uploads only happen for the workspace the server confirmed in a pull, so a stale
 *   browser cache can never be written into another company's records.
 */

export type RecordCollection = "transactions" | "admin-records" | "company-settings";

export interface PulledCollection {
  readonly workspaceId: string;
  readonly data: unknown;
}

const PUSH_DELAY_MS = 400;
const ACTIVE_WORKSPACE_KEY = "nairabooks_active_workspace";

let serverWorkspaceId: string | null = null;
const timers = new Map<RecordCollection, ReturnType<typeof setTimeout>>();
const pending = new Map<RecordCollection, { workspaceId: string; data: unknown }>();

export function getServerWorkspaceId(): string | null {
  return serverWorkspaceId;
}

export async function pullRecordCollection(
  collection: RecordCollection,
): Promise<PulledCollection | null> {
  try {
    const res = await fetch(`/api/records/${collection}`, { cache: "no-store" });
    if (!res.ok) return null;
    const body = (await res.json()) as { workspaceId?: unknown; data?: unknown };
    if (typeof body.workspaceId !== "string") return null;
    serverWorkspaceId = body.workspaceId;
    try {
      window.localStorage.setItem(ACTIVE_WORKSPACE_KEY, body.workspaceId);
    } catch {
      // Storage may be unavailable (private mode); the server copy still applies.
    }
    return { workspaceId: body.workspaceId, data: body.data ?? null };
  } catch {
    return null; // offline or signed out: keep working from the local cache
  }
}

async function pushNow(collection: RecordCollection, keepalive = false): Promise<void> {
  const item = pending.get(collection);
  pending.delete(collection);
  if (!item || item.workspaceId !== serverWorkspaceId) return;
  try {
    const res = await fetch(`/api/records/${collection}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(item.data),
      keepalive,
    });
    if (!res.ok) {
      console.warn(`[nairabooks] saving ${collection} failed with HTTP ${res.status}`);
    }
  } catch (err) {
    console.warn(`[nairabooks] saving ${collection} failed:`, err);
  }
}

export function scheduleRecordPush(
  collection: RecordCollection,
  workspaceId: string,
  data: unknown,
): void {
  if (typeof window === "undefined" || !serverWorkspaceId || workspaceId !== serverWorkspaceId) {
    return;
  }
  pending.set(collection, { workspaceId, data });
  clearTimeout(timers.get(collection));
  timers.set(
    collection,
    setTimeout(() => {
      timers.delete(collection);
      void pushNow(collection);
    }, PUSH_DELAY_MS),
  );
}

/** Send any not-yet-uploaded changes immediately (used when the page is being hidden). */
export function flushRecordPushes(): void {
  for (const [collection, timer] of timers) {
    clearTimeout(timer);
    timers.delete(collection);
    void pushNow(collection, true);
  }
}

if (typeof window !== "undefined") {
  window.addEventListener("pagehide", flushRecordPushes);
}
