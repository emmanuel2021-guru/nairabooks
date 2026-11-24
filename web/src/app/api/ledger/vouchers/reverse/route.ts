import { NextRequest, NextResponse } from "next/server";
import { authorizeApiRequest, extractSessionToken, recordAuditTrailForMutation } from "@/lib/auth-bff";
import { reverseJournalVoucherViaBff } from "@/lib/bff-client";
import { withPersistence } from "@/lib/persistence";

export const dynamic = "force-dynamic";

async function handlePOST(request: NextRequest): Promise<NextResponse> {
  const auth = await authorizeApiRequest(request, "LEDGER_REVERSE");
  if (!auth.ok) {
    return NextResponse.json(auth.body, { status: auth.status });
  }
  const rawBody = await request.text();
  const rawToken = extractSessionToken(request) ?? undefined;
  const result = await reverseJournalVoucherViaBff(
    rawBody,
    auth.ctx.workspaceId,
    rawToken,
    auth.ctx.userId,
  );
  if ((result.status === 200 || result.status === 201) && "id" in result.body) {
    recordAuditTrailForMutation({
      workspaceId: auth.ctx.workspaceId,
      actorUserId: auth.ctx.userId,
      actorRole: auth.ctx.role,
      action: "REVERSE_JOURNAL_VOUCHER",
      entityType: "JournalVoucher",
      entityId: result.body.id,
      payload: { voucherNumber: result.body.voucherNumber },
    });
  }
  return NextResponse.json(result.body, { status: result.status });
}

export const POST = withPersistence(handlePOST);
