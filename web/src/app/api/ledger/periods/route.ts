import { NextRequest, NextResponse } from "next/server";
import { authorizeApiRequest } from "@/lib/auth-bff";
import { fetchFiscalPeriods } from "@/lib/bff-client";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = await authorizeApiRequest(request, "LEDGER_READ");
  if (!auth.ok) {
    return NextResponse.json(auth.body, { status: auth.status });
  }
  const items = await fetchFiscalPeriods();
  return NextResponse.json({ items }, { status: 200 });
}
