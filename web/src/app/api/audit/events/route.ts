import { NextRequest, NextResponse } from "next/server";
import { authorizeApiRequest, listAuditEventsViaBff } from "@/lib/auth-bff";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = await authorizeApiRequest(request, "AUDIT_READ");
  if (!auth.ok) {
    return NextResponse.json(auth.body, { status: auth.status });
  }
  const firstParam = request.nextUrl.searchParams.get("first");
  const parsed = firstParam ? Number.parseInt(firstParam, 10) : 50;
  const first = Number.isFinite(parsed) ? parsed : 50;
  const items = listAuditEventsViaBff(auth.ctx.workspaceId, first);
  return NextResponse.json({ items }, { status: 200 });
}
