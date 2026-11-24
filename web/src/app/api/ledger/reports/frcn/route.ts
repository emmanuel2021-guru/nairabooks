import { NextRequest, NextResponse } from "next/server";
import { authorizeApiRequest, extractSessionToken } from "@/lib/auth-bff";
import { fetchFrcnPackage } from "@/lib/bff-client";
import { withPersistence } from "@/lib/persistence";

export const dynamic = "force-dynamic";

async function handleGET(request: NextRequest): Promise<NextResponse> {
  const auth = await authorizeApiRequest(request, "LEDGER_READ");
  if (!auth.ok) {
    return NextResponse.json(auth.body, { status: auth.status });
  }
  const periodId = request.nextUrl.searchParams.get("fiscalPeriodId");
  if (!periodId) {
    return NextResponse.json(
      {
        __typename: "ValidationError",
        code: "VALIDATION_ERROR",
        message: "Query parameter 'fiscalPeriodId' is required.",
        field: "fiscalPeriodId",
      },
      { status: 400 },
    );
  }
  const rawToken = extractSessionToken(request) ?? undefined;
  const result = await fetchFrcnPackage(periodId, auth.ctx.workspaceId, rawToken);
  return NextResponse.json(result.body, { status: result.status });
}

export const GET = withPersistence(handleGET);
