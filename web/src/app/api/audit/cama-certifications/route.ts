import { NextRequest, NextResponse } from "next/server";
import {
  authorizeApiRequest,
  certifyCamaSec405ViaBff,
  listCamaCertificationsViaBff,
} from "@/lib/auth-bff";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = await authorizeApiRequest(request, "AUDIT_READ");
  if (!auth.ok) {
    return NextResponse.json(auth.body, { status: auth.status });
  }
  const items = listCamaCertificationsViaBff(auth.ctx.workspaceId);
  return NextResponse.json({ items }, { status: 200 });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const auth = await authorizeApiRequest(request, "AUDIT_CAMA_CERTIFY");
  if (!auth.ok) {
    return NextResponse.json(auth.body, { status: auth.status });
  }
  const rawBody = await request.text();
  const result = await certifyCamaSec405ViaBff(auth.ctx, rawBody);
  return NextResponse.json(result.body, { status: result.status });
}
