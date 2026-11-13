import { NextRequest, NextResponse } from "next/server";
import { authorizeApiRequest, verifyAuditChainViaBff } from "@/lib/auth-bff";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = await authorizeApiRequest(request, "AUDIT_READ");
  if (!auth.ok) {
    return NextResponse.json(auth.body, { status: auth.status });
  }
  const verification = verifyAuditChainViaBff(auth.ctx.workspaceId);
  return NextResponse.json(verification, { status: 200 });
}
