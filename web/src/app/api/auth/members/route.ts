import { NextRequest, NextResponse } from "next/server";
import {
  assignWorkspaceMemberViaBff,
  authorizeApiRequest,
  listWorkspaceMembersViaBff,
} from "@/lib/auth-bff";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = await authorizeApiRequest(request, "LEDGER_READ");
  if (!auth.ok) {
    return NextResponse.json(auth.body, { status: auth.status });
  }
  const members = listWorkspaceMembersViaBff(auth.ctx.workspaceId);
  return NextResponse.json({ items: members }, { status: 200 });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const auth = await authorizeApiRequest(request, "MEMBERS_MANAGE");
  if (!auth.ok) {
    return NextResponse.json(auth.body, { status: auth.status });
  }
  const rawBody = await request.text();
  const result = assignWorkspaceMemberViaBff(auth.ctx, rawBody);
  return NextResponse.json(result.body, { status: result.status });
}
