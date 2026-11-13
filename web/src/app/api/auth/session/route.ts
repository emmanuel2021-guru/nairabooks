import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequestViaBff } from "@/lib/auth-bff";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const result = getSessionFromRequestViaBff(request);
  return NextResponse.json(result.body, { status: result.status });
}
