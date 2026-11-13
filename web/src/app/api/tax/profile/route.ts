import { NextRequest, NextResponse } from "next/server";
import { authorizeApiRequest, recordAuditTrailForMutation } from "@/lib/auth-bff";
import { fetchTaxProfile, updateTaxProfileViaBff } from "@/lib/tax-bff";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = await authorizeApiRequest(request, "TAX_READ");
  if (!auth.ok) {
    return NextResponse.json(auth.body, { status: auth.status });
  }
  const asOfDate = request.nextUrl.searchParams.get("asOfDate") ?? "2026-03-01";
  const result = await fetchTaxProfile(asOfDate);
  return NextResponse.json(result.body, { status: result.status });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const auth = await authorizeApiRequest(request, "TAX_WRITE");
  if (!auth.ok) {
    return NextResponse.json(auth.body, { status: auth.status });
  }
  const rawBody = await request.text();
  const result = await updateTaxProfileViaBff(rawBody);
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
