"use client";

import {
  INITIAL_ADMIN_RECORDS,
  createInitialCompanySettings,
  type AdminRecord,
  type CompanySettingsBundle,
} from "@/components/admin/admin-maintain-data";

const RECORDS_STORAGE_KEY = "nairabooks_admin_records_v1";
const COMPANY_STORAGE_KEY = "nairabooks_admin_company_v1";
export const ADMIN_STORE_EVENT = "nairabooks:admin-store-updated";

let memoryRecords: readonly AdminRecord[] | null = null;
let memoryCompany: CompanySettingsBundle | null = null;

function notifyStoreChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(ADMIN_STORE_EVENT));
  }
}

export function loadAdminRecords(): readonly AdminRecord[] {
  if (typeof window !== "undefined") {
    try {
      const raw = window.sessionStorage.getItem(RECORDS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as unknown;
        if (Array.isArray(parsed) && parsed.length > 0) {
          memoryRecords = parsed as AdminRecord[];
          return memoryRecords;
        }
      }
    } catch {
      // Fall back safely to memory/initial seed
    }
  }
  if (memoryRecords) {
    return memoryRecords;
  }
  memoryRecords = [...INITIAL_ADMIN_RECORDS];
  return memoryRecords;
}

export function saveAdminRecords(nextRecords: readonly AdminRecord[]): readonly AdminRecord[] {
  memoryRecords = [...nextRecords];
  if (typeof window !== "undefined") {
    try {
      window.sessionStorage.setItem(RECORDS_STORAGE_KEY, JSON.stringify(memoryRecords));
    } catch {
      // Ignore quota/storage errors in restricted contexts
    }
  }
  notifyStoreChanged();
  return memoryRecords;
}

export function upsertAdminRecord(record: AdminRecord): readonly AdminRecord[] {
  const current = loadAdminRecords();
  const exists = current.some((r) => r.id === record.id);
  const next = exists
    ? current.map((r) => (r.id === record.id ? record : r))
    : [record, ...current];
  return saveAdminRecords(next);
}

export function deleteAdminRecord(recordId: string): readonly AdminRecord[] {
  const current = loadAdminRecords();
  return saveAdminRecords(current.filter((r) => r.id !== recordId));
}

export function toggleAdminRecordActiveInStore(recordId: string): {
  readonly records: readonly AdminRecord[];
  readonly updated: AdminRecord | undefined;
} {
  const current = loadAdminRecords();
  let updated: AdminRecord | undefined;
  const next = current.map((r) => {
    if (r.id !== recordId) return r;
    updated = { ...r, isActive: !r.isActive };
    return updated;
  });
  return { records: saveAdminRecords(next), updated };
}

export function findAdminRecordById(recordId: string): AdminRecord | undefined {
  return loadAdminRecords().find((r) => r.id === recordId);
}

export function loadCompanySettings(
  workspaceName: string,
  workspaceRc: string,
): CompanySettingsBundle {
  if (typeof window !== "undefined") {
    try {
      const raw = window.sessionStorage.getItem(COMPANY_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as CompanySettingsBundle;
        if (parsed && typeof parsed.legalName === "string") {
          memoryCompany = parsed;
          return parsed;
        }
      }
    } catch {
      // Fall back to default
    }
  }
  if (memoryCompany) {
    return memoryCompany;
  }
  return createInitialCompanySettings(workspaceName, workspaceRc);
}

export function saveCompanySettingsInStore(
  bundle: CompanySettingsBundle,
): CompanySettingsBundle {
  memoryCompany = bundle;
  if (typeof window !== "undefined") {
    try {
      window.sessionStorage.setItem(COMPANY_STORAGE_KEY, JSON.stringify(bundle));
    } catch {
      // Ignore quota errors
    }
  }
  notifyStoreChanged();
  return bundle;
}

export function resetAdminStore(): void {
  memoryRecords = [...INITIAL_ADMIN_RECORDS];
  memoryCompany = null;
  if (typeof window !== "undefined") {
    try {
      window.sessionStorage.removeItem(RECORDS_STORAGE_KEY);
      window.sessionStorage.removeItem(COMPANY_STORAGE_KEY);
    } catch {
      // Ignore
    }
  }
  notifyStoreChanged();
}
