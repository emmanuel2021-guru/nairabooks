import { NextRequest, NextResponse } from "next/server";
import {
  authorizeApiRequest,
  certifyCamaSec405ViaBff,
  listCamaCertificationsViaBff,
} from "@/lib/auth-bff";
import { withPersistence } from "@/lib/persistence";

export const dynamic = "force-dynamic";

async function handleGET(request: NextRequest): Promise<NextResponse> {
  const auth = await authorizeApiRequest(request, "AUDIT_READ");
  if (!auth.ok) {
    return NextResponse.json(auth.body, { status: auth.status });
  }
  const items = listCamaCertificationsViaBff(auth.ctx.workspaceId);
  return NextResponse.json({ items }, { status: 200 });
}

async function handlePOST(request: NextRequest): Promise<NextResponse> {
  const auth = await authorizeApiRequest(request, "AUDIT_CAMA_CERTIFY");
  if (!auth.ok) {
    return NextResponse.json(auth.body, { status: auth.status });
  }
  const rawBody = await request.text();
  const result = await certifyCamaSec405ViaBff(auth.ctx, rawBody);
  return NextResponse.json(result.body, { status: result.status });
}

export const GET = withPersistence(handleGET);
export const POST = withPersistence(handlePOST);
