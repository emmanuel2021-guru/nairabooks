import { NextRequest, NextResponse } from "next/server";
import { authorizeApiRequest, recordAuditTrailForMutation } from "@/lib/auth-bff";
import { fetchJournalVouchers, postJournalVoucherViaBff } from "@/lib/bff-client";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = await authorizeApiRequest(request, "LEDGER_READ");
  if (!auth.ok) {
    return NextResponse.json(auth.body, { status: auth.status });
  }
  const firstParam = request.nextUrl.searchParams.get("first");
  const parsedFirst = firstParam ? Number.parseInt(firstParam, 10) : 25;
  const first = Number.isFinite(parsedFirst) ? parsedFirst : 25;
  const connection = await fetchJournalVouchers(first);
  return NextResponse.json(connection, { status: 200 });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const auth = await authorizeApiRequest(request, "LEDGER_POST");
  if (!auth.ok) {
    return NextResponse.json(auth.body, { status: auth.status });
  }
  const rawBody = await request.text();
  const result = await postJournalVoucherViaBff(rawBody);
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
