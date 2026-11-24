"use client";

import {
  INITIAL_ADMIN_RECORDS,
  createInitialCompanySettings,
  type AdminRecord,
  type CompanySettingsBundle,
  type IfrsElement,
} from "@/components/admin/admin-maintain-data";
import {
  SECTOR_TEMPLATES,
  getIfrsGroupForAccount,
} from "@/components/onboarding/company-wizard-data";
import { pullRecordCollection, scheduleRecordPush } from "@/components/records/records-sync";

const DEMO_WORKSPACE_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0001";
export const ADMIN_STORE_EVENT = "nairabooks:admin-store-updated";

const memoryRecordsByWorkspace = new Map<string, readonly AdminRecord[]>();
const memoryCompanyByWorkspace = new Map<string, CompanySettingsBundle>();

function toIfrsElement(section: string): IfrsElement {
  switch (section) {
    case "Current Assets":
      return "Assets — Current";
    case "Non-Current Assets":
      return "Assets — Non-Current";
    case "Current Liabilities":
      return "Liabilities — Current";
    case "Non-Current Liabilities":
      return "Liabilities — Non-Current";
    case "Equity":
      return "Equity";
    case "Revenue":
      return "Revenue";
    case "Expenses":
    default:
      return "Expenses";
  }
}

export function seedTailoredAccountsForWorkspace(
  targetWs: string,
  businessTypeHint?: string,
): readonly AdminRecord[] {
  let resolvedType = businessTypeHint;
  if (!resolvedType && typeof window !== "undefined") {
    try {
      resolvedType =
        window.localStorage.getItem(`nairabooks_workspace_business_type_${targetWs}`) ||
        window.sessionStorage.getItem(`nairabooks_workspace_business_type_${targetWs}`) ||
        undefined;
    } catch {
      // Ignore
    }
  }

  if (!resolvedType && typeof window === "undefined") {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const fs = require("fs");
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const path = require("path");
      const dataPath = path.resolve(process.cwd(), ".data/auth-state.json");
      if (fs.existsSync(dataPath)) {
        const raw = fs.readFileSync(dataPath, "utf8");
        const parsed = JSON.parse(raw);
        const found = parsed.workspaces?.find((w: { id: string; businessType?: string }) => w.id === targetWs);
        if (found?.businessType) {
          resolvedType = found.businessType;
        }
      }
    } catch {
      // Ignore
    }
  }

  const template =
    (resolvedType ? SECTOR_TEMPLATES.find((t) => t.code === resolvedType) : null) ??
    SECTOR_TEMPLATES[0]!;

  const groupsMap = new Map<string, AdminRecord>();
  const individualRecords: AdminRecord[] = [];

  for (const acc of template.accounts) {
    const groupMeta = getIfrsGroupForAccount(acc);
    const element = toIfrsElement(groupMeta.ifrsSection);
    if (!groupsMap.has(groupMeta.groupCode)) {
      groupsMap.set(groupMeta.groupCode, {
        id: `acc-grp-${groupMeta.groupCode}`,
        module: "accounts",
        name: groupMeta.groupName,
        code: groupMeta.groupCode,
        category: element,
        primaryMetricLabel: "Group Balance",
        primaryMetricValue: "₦0.00",
        contactOrNote: `${groupMeta.ifrsStandard} · Group`,
        isActive: true,
        accountLevel: "GROUP",
        ifrsElement: element,
        ifrsStandard: groupMeta.ifrsStandard,
      });
    }

    individualRecords.push({
      id: `acc-${acc.code}`,
      module: "accounts",
      name: acc.accountName,
      code: acc.code,
      category: element,
      primaryMetricLabel: "Current Balance",
      primaryMetricValue: "₦0.00",
      contactOrNote: `Individual · ${acc.simpleName}`,
      isActive: true,
      accountLevel: "INDIVIDUAL",
      parentGroupCode: groupMeta.groupCode,
      ifrsElement: element,
      ifrsStandard: groupMeta.ifrsStandard,
    });
  }

  return [...Array.from(groupsMap.values()), ...individualRecords];
}

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
      // Ignore
    }
  }
  return DEMO_WORKSPACE_ID;
}

function getRecordsStorageKey(targetWs: string): string {
  return `nairabooks_admin_records_${targetWs}`;
}

function getCompanyStorageKey(targetWs: string): string {
  return `nairabooks_admin_company_${targetWs}`;
}

function notifyStoreChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(ADMIN_STORE_EVENT));
  }
}

export function loadAdminRecords(
  workspaceId?: string,
  businessTypeHint?: string,
): readonly AdminRecord[] {
  const targetWs = resolveWorkspaceId(workspaceId);
  if (typeof window !== "undefined") {
    try {
      const raw = window.sessionStorage.getItem(getRecordsStorageKey(targetWs));
      if (raw) {
        const parsed = JSON.parse(raw) as unknown;
        if (Array.isArray(parsed)) {
          memoryRecordsByWorkspace.set(targetWs, parsed as AdminRecord[]);
          return parsed as AdminRecord[];
        }
      }
    } catch {
      // Fall back safely to memory/initial seed
    }
  }
  const cached = memoryRecordsByWorkspace.get(targetWs);
  if (cached) {
    return cached;
  }
  // Zero-state isolation with tailored Chart of Accounts:
  // Newly registered tenants start with their tailored IFRS Chart of Accounts at ₦0.00,
  // and zero customers, vendors, employees, or inventory (no mock bleed).
  const initial =
    targetWs === DEMO_WORKSPACE_ID
      ? [...INITIAL_ADMIN_RECORDS]
      : seedTailoredAccountsForWorkspace(targetWs, businessTypeHint);
  memoryRecordsByWorkspace.set(targetWs, initial);
  return initial;
}

export function saveAdminRecords(
  nextRecords: readonly AdminRecord[],
  workspaceId?: string,
): readonly AdminRecord[] {
  const targetWs = resolveWorkspaceId(workspaceId);
  const cloned = cacheAdminRecordsLocally(targetWs, nextRecords);
  scheduleRecordPush("admin-records", targetWs, cloned);
  notifyStoreChanged();
  return cloned;
}

function cacheAdminRecordsLocally(
  targetWs: string,
  records: readonly AdminRecord[],
): readonly AdminRecord[] {
  const cloned = [...records];
  memoryRecordsByWorkspace.set(targetWs, cloned);
  if (typeof window !== "undefined") {
    try {
      window.sessionStorage.setItem(getRecordsStorageKey(targetWs), JSON.stringify(cloned));
    } catch {
      // Ignore quota/storage errors in restricted contexts
    }
  }
  return cloned;
}

function cacheCompanySettingsLocally(targetWs: string, bundle: CompanySettingsBundle): void {
  memoryCompanyByWorkspace.set(targetWs, bundle);
  if (typeof window !== "undefined") {
    try {
      window.sessionStorage.setItem(getCompanyStorageKey(targetWs), JSON.stringify(bundle));
    } catch {
      // Ignore quota errors
    }
  }
}

/**
 * Replace the local cache with the signed-in workspace's saved Admin records and company
 * settings. A workspace that has never saved them uploads what this browser has.
 */
export async function hydrateAdminFromServer(): Promise<void> {
  const [records, company] = await Promise.all([
    pullRecordCollection("admin-records"),
    pullRecordCollection("company-settings"),
  ]);
  let changed = false;
  if (records) {
    if (Array.isArray(records.data)) {
      cacheAdminRecordsLocally(records.workspaceId, records.data as AdminRecord[]);
      changed = true;
    } else {
      scheduleRecordPush("admin-records", records.workspaceId, loadAdminRecords(records.workspaceId));
    }
  }
  if (company) {
    const bundle = company.data as CompanySettingsBundle | null;
    if (bundle && typeof bundle.legalName === "string") {
      cacheCompanySettingsLocally(company.workspaceId, bundle);
      changed = true;
    } else {
      const local = memoryCompanyByWorkspace.get(company.workspaceId);
      if (local) scheduleRecordPush("company-settings", company.workspaceId, local);
    }
  }
  if (changed) notifyStoreChanged();
}

export function upsertAdminRecord(
  record: AdminRecord,
  workspaceId?: string,
): readonly AdminRecord[] {
  const current = loadAdminRecords(workspaceId);
  const exists = current.some((r) => r.id === record.id);
  const next = exists
    ? current.map((r) => (r.id === record.id ? record : r))
    : [record, ...current];
  return saveAdminRecords(next, workspaceId);
}

export function deleteAdminRecord(
  recordId: string,
  workspaceId?: string,
): readonly AdminRecord[] {
  const current = loadAdminRecords(workspaceId);
  return saveAdminRecords(
    current.filter((r) => r.id !== recordId),
    workspaceId,
  );
}

export function toggleAdminRecordActiveInStore(
  recordId: string,
  workspaceId?: string,
): {
  readonly records: readonly AdminRecord[];
  readonly updated: AdminRecord | undefined;
} {
  const current = loadAdminRecords(workspaceId);
  let updated: AdminRecord | undefined;
  const next = current.map((r) => {
    if (r.id !== recordId) return r;
    updated = { ...r, isActive: !r.isActive };
    return updated;
  });
  return { records: saveAdminRecords(next, workspaceId), updated };
}

export function findAdminRecordById(
  recordId: string,
  workspaceId?: string,
): AdminRecord | undefined {
  return loadAdminRecords(workspaceId).find((r) => r.id === recordId);
}

export function loadCompanySettings(
  workspaceName: string,
  workspaceRc: string,
  workspaceId?: string,
): CompanySettingsBundle {
  const targetWs = resolveWorkspaceId(workspaceId);
  if (typeof window !== "undefined") {
    try {
      const raw = window.sessionStorage.getItem(getCompanyStorageKey(targetWs));
      if (raw) {
        const parsed = JSON.parse(raw) as CompanySettingsBundle;
        if (parsed && typeof parsed.legalName === "string") {
          memoryCompanyByWorkspace.set(targetWs, parsed);
          return parsed;
        }
      }
    } catch {
      // Fall back to default
    }
  }
  const cached = memoryCompanyByWorkspace.get(targetWs);
  if (cached) {
    return cached;
  }
  const initial = createInitialCompanySettings(workspaceName, workspaceRc);
  memoryCompanyByWorkspace.set(targetWs, initial);
  return initial;
}

export function saveCompanySettingsInStore(
  bundle: CompanySettingsBundle,
  workspaceId?: string,
): CompanySettingsBundle {
  const targetWs = resolveWorkspaceId(workspaceId);
  cacheCompanySettingsLocally(targetWs, bundle);
  scheduleRecordPush("company-settings", targetWs, bundle);
  notifyStoreChanged();
  return bundle;
}

export function resetAdminStore(workspaceId?: string): void {
  const targetWs = workspaceId ? workspaceId.trim() : DEMO_WORKSPACE_ID;
  const initial = targetWs === DEMO_WORKSPACE_ID ? [...INITIAL_ADMIN_RECORDS] : [];
  memoryRecordsByWorkspace.set(targetWs, initial);
  memoryCompanyByWorkspace.delete(targetWs);
  if (typeof window !== "undefined") {
    try {
      if (!workspaceId) {
        window.localStorage.removeItem("nairabooks_active_workspace");
      }
      window.sessionStorage.removeItem(getRecordsStorageKey(targetWs));
      window.sessionStorage.removeItem(getCompanyStorageKey(targetWs));
      window.sessionStorage.removeItem("nairabooks_admin_records_v1");
      window.sessionStorage.removeItem("nairabooks_admin_company_v1");
    } catch {
      // Ignore
    }
  }
  notifyStoreChanged();
}
