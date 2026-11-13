import { NextRequest, NextResponse } from "next/server";
import { authorizeApiRequest, recordAuditTrailForMutation } from "@/lib/auth-bff";
import { applyFlagshipPackViaBff, fetchFlagshipsViaBff } from "@/lib/packs-bff";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = await authorizeApiRequest(request, "PACKS_READ");
  if (!auth.ok) {
    return NextResponse.json(auth.body, { status: auth.status });
  }
  const result = await fetchFlagshipsViaBff();
  return NextResponse.json(result.body, { status: result.status });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const auth = await authorizeApiRequest(request, "PACKS_WRITE");
  if (!auth.ok) {
    return NextResponse.json(auth.body, { status: auth.status });
  }
  const rawBody = await request.text();
  const result = await applyFlagshipPackViaBff(rawBody);
  if (result.status === 200 || result.status === 201) {
    recordAuditTrailForMutation({
      workspaceId: auth.ctx.workspaceId,
      actorUserId: auth.ctx.userId,
      actorRole: auth.ctx.role,
      action: "FLAGSHIP_PACK_APPLIED",
      entityType: "FlagshipPack",
      entityId: auth.ctx.workspaceId,
      payload: { appliedBy: auth.ctx.email },
    });
  }
  return NextResponse.json(result.body, { status: result.status });
}
