import { NextRequest, NextResponse } from "next/server";
import {
  authorizeApiRequest,
  extractSessionToken,
  recordAuditTrailForMutation,
} from "@/lib/auth-bff";
import {
  fetchJournalVouchers,
  postStandardTransactionViaBff,
  removeStandardTransactionViaBff,
} from "@/lib/bff-client";
import { withPersistence } from "@/lib/persistence";

export const dynamic = "force-dynamic";

async function handleGET(request: NextRequest): Promise<NextResponse> {
  const auth = await authorizeApiRequest(request, "LEDGER_READ");
  if (!auth.ok) {
    return NextResponse.json(auth.body, { status: auth.status });
  }
  const firstParam = request.nextUrl.searchParams.get("first");
  const parsedFirst = firstParam ? Number.parseInt(firstParam, 10) : 50;
  const first = Number.isFinite(parsedFirst) ? parsedFirst : 50;
  const rawToken = extractSessionToken(request) ?? undefined;
  const connection = await fetchJournalVouchers(first, auth.ctx.workspaceId, rawToken);
  return NextResponse.json(connection, { status: 200 });
}

async function handlePOST(request: NextRequest): Promise<NextResponse> {
  const auth = await authorizeApiRequest(request, "LEDGER_POST");
  if (!auth.ok) {
    return NextResponse.json(auth.body, { status: auth.status });
  }
  const rawBody = await request.text();
  const rawToken = extractSessionToken(request) ?? undefined;
  const result = await postStandardTransactionViaBff(
    rawBody,
    auth.ctx.workspaceId,
    rawToken,
    auth.ctx.userId,
  );
  if (result.status === 201 && "voucherId" in result.body) {
    recordAuditTrailForMutation({
      workspaceId: auth.ctx.workspaceId,
      actorUserId: auth.ctx.userId,
      actorRole: auth.ctx.role,
      action: "POST_TRANSACTION",
      entityType: "TransactionRecord",
      entityId: result.body.voucherId,
      payload: {
        voucherNumber: result.body.voucherNumber,
        transactionType: result.body.transactionType,
        reference: result.body.reference,
        counterparty: result.body.counterparty,
        totalDebitNgn: result.body.totalDebitNgn,
      },
    });
  }
  return NextResponse.json(result.body, { status: result.status });
}

/** DELETE /api/transactions?id=<recordId>: reverse the deleted record's voucher. */
async function handleDELETE(request: NextRequest): Promise<NextResponse> {
  const auth = await authorizeApiRequest(request, "LEDGER_POST");
  if (!auth.ok) {
    return NextResponse.json(auth.body, { status: auth.status });
  }
  const recordId = request.nextUrl.searchParams.get("id")?.trim();
  if (!recordId) {
    return NextResponse.json(
      { __typename: "ValidationError", code: "VALIDATION_ERROR", message: "Query parameter 'id' is required.", field: "id" },
      { status: 400 },
    );
  }
  const result = await removeStandardTransactionViaBff(recordId, auth.ctx.workspaceId, auth.ctx.userId);
  if (result.status === 200 && "reversedVoucherId" in result.body && result.body.reversedVoucherId) {
    recordAuditTrailForMutation({
      workspaceId: auth.ctx.workspaceId,
      actorUserId: auth.ctx.userId,
      actorRole: auth.ctx.role,
      action: "DELETE_TRANSACTION",
      entityType: "TransactionRecord",
      entityId: recordId,
      payload: { reversedVoucherId: result.body.reversedVoucherId },
    });
  }
  return NextResponse.json(result.body, { status: result.status });
}

export const GET = withPersistence(handleGET);
export const POST = withPersistence(handlePOST);
export const DELETE = withPersistence(handleDELETE);
