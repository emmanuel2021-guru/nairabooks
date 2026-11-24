"use client";

import {
  INITIAL_TRANSACTIONS,
  type TransactionRecord,
  type TransactionStatus,
} from "@/components/transactions/transactions-data";
import { pullRecordCollection, scheduleRecordPush } from "@/components/records/records-sync";

const DEMO_WORKSPACE_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0001";
export const TRANSACTIONS_STORE_EVENT = "nairabooks:transactions-store-updated";

const memoryByWorkspace = new Map<string, readonly TransactionRecord[]>();

function resolveWorkspaceId(workspaceId?: string): string {
  if (workspaceId && workspaceId.trim()) {
    return workspaceId.trim();
  }
  if (typeof window !== "undefined") {
    try {
      const stored = window.localStorage.getItem("nairabooks_active_workspace");
      if (stored && stored.trim()) {
        return stored.trim();
      }
    } catch {
      // Ignore in restricted environments
    }
  }
  return DEMO_WORKSPACE_ID;
}

function getStorageKey(targetWs: string): string {
  return `nairabooks_transactions_${targetWs}`;
}

function notifyTransactionsChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(TRANSACTIONS_STORE_EVENT));
  }
}

export function loadTransactions(workspaceId?: string): readonly TransactionRecord[] {
  const targetWs = resolveWorkspaceId(workspaceId);
  if (typeof window !== "undefined") {
    try {
      const key = getStorageKey(targetWs);
      const raw = window.sessionStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw) as unknown;
        if (Array.isArray(parsed)) {
          memoryByWorkspace.set(targetWs, parsed as TransactionRecord[]);
          return parsed as TransactionRecord[];
        }
      }
    } catch {
      // Fall back safely to memory or initial seed
    }
  }
  const cached = memoryByWorkspace.get(targetWs);
  if (cached) {
    return cached;
  }
  // Zero-state isolation: only the primary showcase demo workspace receives seed transactions.
  // Newly registered tenant accounts always default to a clean zero-state list.
  const initial = targetWs === DEMO_WORKSPACE_ID ? [...INITIAL_TRANSACTIONS] : [];
  memoryByWorkspace.set(targetWs, initial);
  return initial;
}

export function saveTransactions(
  nextList: readonly TransactionRecord[],
  workspaceId?: string,
): readonly TransactionRecord[] {
  const targetWs = resolveWorkspaceId(workspaceId);
  const cloned = cacheTransactionsLocally(targetWs, nextList);
  scheduleRecordPush("transactions", targetWs, cloned);
  notifyTransactionsChanged();
  return cloned;
}

function cacheTransactionsLocally(
  targetWs: string,
  list: readonly TransactionRecord[],
): readonly TransactionRecord[] {
  const cloned = [...list];
  memoryByWorkspace.set(targetWs, cloned);
  if (typeof window !== "undefined") {
    try {
      window.sessionStorage.setItem(getStorageKey(targetWs), JSON.stringify(cloned));
    } catch {
      // Ignore storage quota errors in restricted environments
    }
  }
  return cloned;
}

/**
 * Replace the local cache with the signed-in workspace's saved transactions. A workspace
 * that has never saved any uploads what this browser has (its seed or session edits).
 */
export async function hydrateTransactionsFromServer(): Promise<void> {
  const pulled = await pullRecordCollection("transactions");
  if (!pulled) return;
  if (Array.isArray(pulled.data)) {
    cacheTransactionsLocally(pulled.workspaceId, pulled.data as TransactionRecord[]);
    notifyTransactionsChanged();
  } else {
    scheduleRecordPush("transactions", pulled.workspaceId, loadTransactions(pulled.workspaceId));
  }
}

export function upsertTransaction(
  record: TransactionRecord,
  workspaceId?: string,
): readonly TransactionRecord[] {
  const current = loadTransactions(workspaceId);
  const exists = current.some((tx) => tx.id === record.id);
  const next = exists
    ? current.map((tx) => (tx.id === record.id ? record : tx))
    : [record, ...current];
  return saveTransactions(next, workspaceId);
}

export function deleteTransaction(
  id: string,
  workspaceId?: string,
): readonly TransactionRecord[] {
  const current = loadTransactions(workspaceId);
  return saveTransactions(
    current.filter((tx) => tx.id !== id),
    workspaceId,
  );
}

export function findTransactionById(
  id: string,
  workspaceId?: string,
): TransactionRecord | undefined {
  return loadTransactions(workspaceId).find((tx) => tx.id === id);
}

export function updateTransactionStatusInStore(
  id: string,
  status: TransactionStatus,
  workspaceId?: string,
): {
  readonly records: readonly TransactionRecord[];
  readonly updated: TransactionRecord | undefined;
} {
  const current = loadTransactions(workspaceId);
  let updated: TransactionRecord | undefined;
  const next = current.map((tx) => {
    if (tx.id !== id) return tx;
    updated = { ...tx, status };
    return updated;
  });
  return { records: saveTransactions(next, workspaceId), updated };
}

export function resetTransactionsStore(workspaceId?: string): void {
  const targetWs = workspaceId ? workspaceId.trim() : DEMO_WORKSPACE_ID;
  const initial = targetWs === DEMO_WORKSPACE_ID ? [...INITIAL_TRANSACTIONS] : [];
  memoryByWorkspace.set(targetWs, initial);
  if (typeof window !== "undefined") {
    try {
      if (!workspaceId) {
        window.localStorage.removeItem("nairabooks_active_workspace");
      }
      window.sessionStorage.removeItem(getStorageKey(targetWs));
      window.sessionStorage.removeItem("nairabooks_transactions_v1");
    } catch {
      // Ignore
    }
  }
  notifyTransactionsChanged();
}
