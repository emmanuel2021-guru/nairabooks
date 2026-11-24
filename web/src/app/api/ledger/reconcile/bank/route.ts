import { NextRequest, NextResponse } from "next/server";
import { authorizeApiRequest, extractSessionToken, recordAuditTrailForMutation } from "@/lib/auth-bff";
import { reconcileBankStatementViaBff } from "@/lib/bff-client";
import { withPersistence } from "@/lib/persistence";

export const dynamic = "force-dynamic";

async function handlePOST(request: NextRequest): Promise<NextResponse> {
  const auth = await authorizeApiRequest(request, "LEDGER_POST");
  if (!auth.ok) {
    return NextResponse.json(auth.body, { status: auth.status });
  }
  const rawBody = await request.text();
  const rawToken = extractSessionToken(request) ?? undefined;
  const result = await reconcileBankStatementViaBff(
    rawBody,
    auth.ctx.workspaceId,
    rawToken,
    auth.ctx.userId,
  );
  if (result.status === 200 && "reconciliationDifferenceNgn" in result.body) {
    recordAuditTrailForMutation({
      workspaceId: auth.ctx.workspaceId,
      actorUserId: auth.ctx.userId,
      actorRole: auth.ctx.role,
      action: "BANK_RECONCILIATION_RUN",
      entityType: "BankReconciliation",
      entityId: result.body.accountId,
      payload: { differenceNgn: result.body.reconciliationDifferenceNgn },
    });
  }
  return NextResponse.json(result.body, { status: result.status });
}

export const POST = withPersistence(handlePOST);
