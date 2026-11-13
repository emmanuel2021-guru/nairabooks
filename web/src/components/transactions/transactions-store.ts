"use client";

import {
  INITIAL_TRANSACTIONS,
  type TransactionRecord,
  type TransactionStatus,
} from "@/components/transactions/transactions-data";

const TRANSACTIONS_STORAGE_KEY = "nairabooks_transactions_v1";
export const TRANSACTIONS_STORE_EVENT = "nairabooks:transactions-store-updated";

let memoryTransactions: readonly TransactionRecord[] | null = null;

function notifyTransactionsChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(TRANSACTIONS_STORE_EVENT));
  }
}

export function loadTransactions(): readonly TransactionRecord[] {
  if (typeof window !== "undefined") {
    try {
      const raw = window.sessionStorage.getItem(TRANSACTIONS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as unknown;
        if (Array.isArray(parsed) && parsed.length > 0) {
          memoryTransactions = parsed as TransactionRecord[];
          return memoryTransactions;
        }
      }
    } catch {
      // Fall back safely to memory or initial seed
    }
  }
  if (memoryTransactions) {
    return memoryTransactions;
  }
  memoryTransactions = [...INITIAL_TRANSACTIONS];
  return memoryTransactions;
}

export function saveTransactions(
  nextList: readonly TransactionRecord[],
): readonly TransactionRecord[] {
  memoryTransactions = [...nextList];
  if (typeof window !== "undefined") {
    try {
      window.sessionStorage.setItem(
        TRANSACTIONS_STORAGE_KEY,
        JSON.stringify(memoryTransactions),
      );
    } catch {
      // Ignore storage quota errors in restricted environments
    }
  }
  notifyTransactionsChanged();
  return memoryTransactions;
}

export function upsertTransaction(
  record: TransactionRecord,
): readonly TransactionRecord[] {
  const current = loadTransactions();
  const exists = current.some((tx) => tx.id === record.id);
  const next = exists
    ? current.map((tx) => (tx.id === record.id ? record : tx))
    : [record, ...current];
  return saveTransactions(next);
}

export function deleteTransaction(id: string): readonly TransactionRecord[] {
  const current = loadTransactions();
  return saveTransactions(current.filter((tx) => tx.id !== id));
}

export function findTransactionById(id: string): TransactionRecord | undefined {
  return loadTransactions().find((tx) => tx.id === id);
}

export function updateTransactionStatusInStore(
  id: string,
  status: TransactionStatus,
): {
  readonly records: readonly TransactionRecord[];
  readonly updated: TransactionRecord | undefined;
} {
  const current = loadTransactions();
  let updated: TransactionRecord | undefined;
  const next = current.map((tx) => {
    if (tx.id !== id) return tx;
    updated = { ...tx, status };
    return updated;
  });
  return { records: saveTransactions(next), updated };
}

export function resetTransactionsStore(): void {
  memoryTransactions = [...INITIAL_TRANSACTIONS];
  if (typeof window !== "undefined") {
    try {
      window.sessionStorage.removeItem(TRANSACTIONS_STORAGE_KEY);
    } catch {
      // Ignore
    }
  }
  notifyTransactionsChanged();
}
