import type { TransactionTypeId } from "@/components/transactions/transactions-data";
import { getTransactionTypeMeta } from "@/components/transactions/transactions-data";
import { loadTransactions } from "@/components/transactions/transactions-store";
import type { RecordModuleId } from "@/components/admin/admin-maintain-data";
import { MODULE_EDITOR_BLUEPRINTS } from "@/components/admin/admin-editor-schemas";
import { loadAdminRecords } from "@/components/admin/admin-store";

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Returns the next sequential transaction reference for the active company, starting at 1.
 * Example for a new company:
 * - sales-invoicing -> INV-2026-001
 * - quotes-sales-orders -> QUO-2026-001
 * - general-journal -> JV-2026-001
 */
export function getNextTransactionReference(
  typeId: TransactionTypeId,
  workspaceId?: string,
  year = 2026,
): string {
  const meta = getTransactionTypeMeta(typeId);
  const prefix = meta.refPrefix || "TX-";
  const records = loadTransactions(workspaceId);

  // Match e.g. INV-2026-001 or INV-001
  const pattern = new RegExp(
    `^${escapeRegex(prefix)}(?:${year}-)?(\\d+)`,
    "i",
  );

  let maxSeq = 0;
  for (const tx of records) {
    if (tx.typeId === typeId || tx.reference.startsWith(prefix)) {
      const match = tx.reference.match(pattern);
      if (match && match[1]) {
        const val = Number.parseInt(match[1], 10);
        if (!Number.isNaN(val) && val > maxSeq) {
          maxSeq = val;
        }
      }
    }
  }

  const nextSeq = maxSeq + 1;
  const padded = String(nextSeq).padStart(3, "0");
  return `${prefix}${year}-${padded}`;
}

/**
 * Returns the next sequential admin record code for the active company, starting at 1.
 * Example for a new company:
 * - customers -> CUS-001
 * - vendors -> VND-001
 * - inventory -> SKU-001
 * - jobs -> JOB-001
 * - employees -> EMP-001
 */
export function getNextAdminRecordCode(
  moduleId: RecordModuleId,
  workspaceId?: string,
  parentGroupCode?: string,
): string {
  const blueprint = MODULE_EDITOR_BLUEPRINTS[moduleId] as
    | (typeof MODULE_EDITOR_BLUEPRINTS)[RecordModuleId]
    | undefined;
  const prefix = blueprint?.idPrefix || (moduleId === "assets" ? "FA-" : "REC-");
  const allRecords = loadAdminRecords(workspaceId);

  if (moduleId === "accounts") {
    const accountRecords = allRecords.filter((r) => r.module === "accounts");
    if (parentGroupCode) {
      const groupBase = Number.parseInt(parentGroupCode, 10);
      const accountsInGroup = accountRecords.filter((a) => {
        if (a.parentGroupCode === parentGroupCode) return true;
        const codeNum = Number.parseInt(a.code, 10);
        return !Number.isNaN(codeNum) && codeNum >= groupBase && codeNum < groupBase + 100;
      });

      let maxAccCode = groupBase;
      for (const a of accountsInGroup) {
        const num = Number.parseInt(a.code, 10);
        if (!Number.isNaN(num) && num > maxAccCode) {
          maxAccCode = num;
        }
      }
      return String(maxAccCode + 10);
    }

    return "1010";
  }

  const moduleRecords = allRecords.filter((r) => r.module === moduleId);
  const pattern = new RegExp(`^${escapeRegex(prefix)}(\\d+)`, "i");

  let maxSeq = 0;
  for (const rec of moduleRecords) {
    const match = rec.code.match(pattern);
    if (match && match[1]) {
      const val = Number.parseInt(match[1], 10);
      if (!Number.isNaN(val) && val > maxSeq) {
        maxSeq = val;
      }
    }
  }

  const nextSeq = maxSeq + 1;
  const padded = String(nextSeq).padStart(3, "0");
  return `${prefix}${padded}`;
}
