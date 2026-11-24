import type { MutationError } from "@/types/ledger";
import { readDocument, writeDocument } from "@/lib/persistence";
import { syncChartFromAdminRecords } from "@/lib/bff-client";

/**
 * Server copies of the Admin and Transactions workspace records (previously browser-only
 * sessionStorage). Each collection is one stored document per workspace.
 */
export const RECORD_COLLECTIONS = ["transactions", "admin-records", "company-settings"] as const;
export type RecordCollection = (typeof RECORD_COLLECTIONS)[number];

/** Which JSON shape each collection must have. */
const COLLECTION_SHAPE: Readonly<Record<RecordCollection, "list" | "object">> = {
  transactions: "list",
  "admin-records": "list",
  "company-settings": "object",
};

const MAX_COLLECTION_BYTES = 2_000_000;

export function isRecordCollection(value: string): value is RecordCollection {
  return (RECORD_COLLECTIONS as readonly string[]).includes(value);
}

function recordsDocumentKey(collection: RecordCollection, workspaceId: string): string {
  return `records:${collection}:${workspaceId}`;
}

export interface RecordCollectionPayload {
  readonly workspaceId: string;
  readonly collection: RecordCollection;
  /** `null` when this workspace has never saved the collection. */
  readonly data: unknown;
}

export function readRecordCollection(
  collection: RecordCollection,
  workspaceId: string,
): RecordCollectionPayload {
  return {
    workspaceId,
    collection,
    data: readDocument(recordsDocumentKey(collection, workspaceId)) ?? null,
  };
}

function validation(message: string): MutationError {
  return { __typename: "ValidationError", code: "VALIDATION_ERROR", message, field: "body" };
}

export async function writeRecordCollection(
  collection: RecordCollection,
  workspaceId: string,
  rawBody: string,
  actorUserId?: string,
): Promise<{ status: number; body: RecordCollectionPayload | MutationError }> {
  if (rawBody.length > MAX_COLLECTION_BYTES) {
    return { status: 413, body: validation("Records payload is too large.") };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    return { status: 400, body: validation("Malformed JSON payload.") };
  }
  const shape = COLLECTION_SHAPE[collection];
  const isList = Array.isArray(parsed);
  const isObject = typeof parsed === "object" && parsed !== null && !isList;
  if ((shape === "list" && !isList) || (shape === "object" && !isObject)) {
    return {
      status: 400,
      body: validation(`'${collection}' must be a JSON ${shape === "list" ? "array" : "object"}.`),
    };
  }
  if (collection === "admin-records") {
    // New / renamed accounts and beginning balances flow into the ledger's chart.
    const synced = await syncChartFromAdminRecords(workspaceId, parsed as unknown[], actorUserId);
    if (!synced.ok) {
      return { status: 422, body: synced.error };
    }
  }
  writeDocument(recordsDocumentKey(collection, workspaceId), parsed);
  return { status: 200, body: { workspaceId, collection, data: parsed } };
}
