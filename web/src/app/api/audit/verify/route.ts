import { NextRequest, NextResponse } from "next/server";
import { authorizeApiRequest, verifyAuditChainViaBff } from "@/lib/auth-bff";
import { withPersistence } from "@/lib/persistence";

export const dynamic = "force-dynamic";

async function handleGET(request: NextRequest): Promise<NextResponse> {
  const auth = await authorizeApiRequest(request, "AUDIT_READ");
  if (!auth.ok) {
    return NextResponse.json(auth.body, { status: auth.status });
  }
  const verification = verifyAuditChainViaBff(auth.ctx.workspaceId);
  return NextResponse.json(verification, { status: 200 });
}

export const GET = withPersistence(handleGET);
