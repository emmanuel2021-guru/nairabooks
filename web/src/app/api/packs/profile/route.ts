import { NextRequest, NextResponse } from "next/server";
import { authorizeApiRequest, recordAuditTrailForMutation } from "@/lib/auth-bff";
import { configureIndustryPackViaBff, fetchPackWorkspace } from "@/lib/packs-bff";
import { withPersistence } from "@/lib/persistence";

export const dynamic = "force-dynamic";

async function handleGET(request: NextRequest): Promise<NextResponse> {
  const auth = await authorizeApiRequest(request, "PACKS_READ");
  if (!auth.ok) {
    return NextResponse.json(auth.body, { status: auth.status });
  }
  const result = await fetchPackWorkspace(auth.ctx.workspaceId);
  return NextResponse.json(result.body, { status: result.status });
}

async function handlePOST(request: NextRequest): Promise<NextResponse> {
  const auth = await authorizeApiRequest(request, "PACKS_WRITE");
  if (!auth.ok) {
    return NextResponse.json(auth.body, { status: auth.status });
  }
  const rawBody = await request.text();
  const result = await configureIndustryPackViaBff(rawBody, auth.ctx.workspaceId);
  if (result.status === 200) {
    recordAuditTrailForMutation({
      workspaceId: auth.ctx.workspaceId,
      actorUserId: auth.ctx.userId,
      actorRole: auth.ctx.role,
      action: "INDUSTRY_PACK_CONFIGURED",
      entityType: "PackProfile",
      entityId: auth.ctx.workspaceId,
      payload: { configuredBy: auth.ctx.email },
    });
  }
  return NextResponse.json(result.body, { status: result.status });
}

export const GET = withPersistence(handleGET);
export const POST = withPersistence(handlePOST);
