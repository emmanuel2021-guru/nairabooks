import { NextRequest, NextResponse } from "next/server";
import { authorizeApiRequest } from "@/lib/auth-bff";
import { previewIndirectTaxViaBff } from "@/lib/tax-bff";
import { withPersistence } from "@/lib/persistence";

export const dynamic = "force-dynamic";

async function handlePOST(request: NextRequest): Promise<NextResponse> {
  const auth = await authorizeApiRequest(request, "TAX_READ");
  if (!auth.ok) {
    return NextResponse.json(auth.body, { status: auth.status });
  }
  const rawBody = await request.text();
  const result = await previewIndirectTaxViaBff(rawBody, auth.ctx.workspaceId);
  return NextResponse.json(result.body, { status: result.status });
}

export const POST = withPersistence(handlePOST);
