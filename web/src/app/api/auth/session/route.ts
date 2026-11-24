import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequestViaBff } from "@/lib/auth-bff";
import { withPersistence } from "@/lib/persistence";

export const dynamic = "force-dynamic";

async function handleGET(request: NextRequest): Promise<NextResponse> {
  const result = getSessionFromRequestViaBff(request);
  return NextResponse.json(result.body, { status: result.status });
}

export const GET = withPersistence(handleGET);
