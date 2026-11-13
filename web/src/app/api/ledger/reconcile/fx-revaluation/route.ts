import { NextRequest, NextResponse } from "next/server";
import { authorizeApiRequest, recordAuditTrailForMutation } from "@/lib/auth-bff";
import { calculateFxRevaluationViaBff } from "@/lib/bff-client";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const auth = await authorizeApiRequest(request, "LEDGER_POST");
  if (!auth.ok) {
    return NextResponse.json(auth.body, { status: auth.status });
  }
  const rawBody = await request.text();
  const result = await calculateFxRevaluationViaBff(rawBody);
  if (result.status === 200 && "accountId" in result.body) {
    recordAuditTrailForMutation({
      workspaceId: auth.ctx.workspaceId,
      actorUserId: auth.ctx.userId,
      actorRole: auth.ctx.role,
      action: "FX_REVALUATION_COMPUTED",
      entityType: "ChartOfAccount",
      entityId: result.body.accountId,
      payload: { currency: result.body.currency, unrealizedGainLossNgn: result.body.unrealizedGainLossNgn },
    });
  }
  return NextResponse.json(result.body, { status: result.status });
}
