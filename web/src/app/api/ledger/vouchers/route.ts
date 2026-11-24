import { NextRequest, NextResponse } from "next/server";
import { authorizeApiRequest, extractSessionToken, recordAuditTrailForMutation } from "@/lib/auth-bff";
import { fetchJournalVouchers, postJournalVoucherViaBff } from "@/lib/bff-client";
import { withPersistence } from "@/lib/persistence";

export const dynamic = "force-dynamic";

async function handleGET(request: NextRequest): Promise<NextResponse> {
  const auth = await authorizeApiRequest(request, "LEDGER_READ");
  if (!auth.ok) {
    return NextResponse.json(auth.body, { status: auth.status });
  }
  const firstParam = request.nextUrl.searchParams.get("first");
  const parsedFirst = firstParam ? Number.parseInt(firstParam, 10) : 25;
  const first = Number.isFinite(parsedFirst) ? parsedFirst : 25;
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
  const result = await postJournalVoucherViaBff(
    rawBody,
    auth.ctx.workspaceId,
    rawToken,
    auth.ctx.userId,
  );
  if (result.status === 201 && "id" in result.body) {
    recordAuditTrailForMutation({
      workspaceId: auth.ctx.workspaceId,
      actorUserId: auth.ctx.userId,
      actorRole: auth.ctx.role,
      action: "POST_JOURNAL_VOUCHER",
      entityType: "JournalVoucher",
      entityId: result.body.id,
      payload: { voucherNumber: result.body.voucherNumber, totalDebitNgn: result.body.totalDebitNgn },
    });
  }
  return NextResponse.json(result.body, { status: result.status });
}

export const GET = withPersistence(handleGET);
export const POST = withPersistence(handlePOST);
