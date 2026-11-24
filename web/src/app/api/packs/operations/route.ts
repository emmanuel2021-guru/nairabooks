import { NextRequest, NextResponse } from "next/server";
import { authorizeApiRequest, recordAuditTrailForMutation } from "@/lib/auth-bff";
import { postPackOperationViaBff } from "@/lib/packs-bff";
import { withPersistence } from "@/lib/persistence";

export const dynamic = "force-dynamic";

async function handlePOST(request: NextRequest): Promise<NextResponse> {
  const auth = await authorizeApiRequest(request, "PACKS_WRITE");
  if (!auth.ok) {
    return NextResponse.json(auth.body, { status: auth.status });
  }
  const rawBody = await request.text();
  const result = await postPackOperationViaBff(rawBody);
  if (result.status === 200 || result.status === 201) {
    recordAuditTrailForMutation({
      workspaceId: auth.ctx.workspaceId,
      actorUserId: auth.ctx.userId,
      actorRole: auth.ctx.role,
      action: "INDUSTRY_PACK_OPERATION_POSTED",
      entityType: "PackOperation",
      entityId: auth.ctx.workspaceId,
      payload: { postedBy: auth.ctx.email },
    });
  }
  return NextResponse.json(result.body, { status: result.status });
}

export const POST = withPersistence(handlePOST);
