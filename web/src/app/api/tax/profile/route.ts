import { NextRequest, NextResponse } from "next/server";
import { authorizeApiRequest, recordAuditTrailForMutation } from "@/lib/auth-bff";
import { fetchTaxProfile, updateTaxProfileViaBff } from "@/lib/tax-bff";
import { withPersistence } from "@/lib/persistence";

export const dynamic = "force-dynamic";

async function handleGET(request: NextRequest): Promise<NextResponse> {
  const auth = await authorizeApiRequest(request, "TAX_READ");
  if (!auth.ok) {
    return NextResponse.json(auth.body, { status: auth.status });
  }
  const asOfDate = request.nextUrl.searchParams.get("asOfDate") ?? "2026-03-01";
  const result = await fetchTaxProfile(asOfDate, auth.ctx.workspaceId);
  return NextResponse.json(result.body, { status: result.status });
}

async function handlePOST(request: NextRequest): Promise<NextResponse> {
  const auth = await authorizeApiRequest(request, "TAX_WRITE");
  if (!auth.ok) {
    return NextResponse.json(auth.body, { status: auth.status });
  }
  const rawBody = await request.text();
  const result = await updateTaxProfileViaBff(rawBody, auth.ctx.workspaceId);
  if (result.status === 200) {
    recordAuditTrailForMutation({
      workspaceId: auth.ctx.workspaceId,
      actorUserId: auth.ctx.userId,
      actorRole: auth.ctx.role,
      action: "TAX_PROFILE_UPDATED",
      entityType: "TaxProfile",
      entityId: auth.ctx.workspaceId,
      payload: { updatedBy: auth.ctx.email },
    });
  }
  return NextResponse.json(result.body, { status: result.status });
}

export const GET = withPersistence(handleGET);
export const POST = withPersistence(handlePOST);
