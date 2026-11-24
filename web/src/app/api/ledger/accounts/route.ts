import { NextRequest, NextResponse } from "next/server";
import { authorizeApiRequest, extractSessionToken } from "@/lib/auth-bff";
import { fetchChartOfAccounts } from "@/lib/bff-client";
import { withPersistence } from "@/lib/persistence";

export const dynamic = "force-dynamic";

async function handleGET(request: NextRequest): Promise<NextResponse> {
  const auth = await authorizeApiRequest(request, "LEDGER_READ");
  if (!auth.ok) {
    return NextResponse.json(auth.body, { status: auth.status });
  }
  const rawToken = extractSessionToken(request) ?? undefined;
  const items = await fetchChartOfAccounts(auth.ctx.workspaceId, rawToken);
  return NextResponse.json({ items }, { status: 200 });
}

export const GET = withPersistence(handleGET);
