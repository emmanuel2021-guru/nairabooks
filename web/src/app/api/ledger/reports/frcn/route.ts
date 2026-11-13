import { NextRequest, NextResponse } from "next/server";
import { authorizeApiRequest } from "@/lib/auth-bff";
import { fetchFrcnPackage } from "@/lib/bff-client";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest): Promise<NextResponse> {
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
  const result = await fetchFrcnPackage(periodId);
  return NextResponse.json(result.body, { status: result.status });
}
