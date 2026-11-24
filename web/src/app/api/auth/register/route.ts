import { NextRequest, NextResponse } from "next/server";
import { registerWorkspaceAccountViaBff } from "@/lib/auth-bff";
import { withPersistence } from "@/lib/persistence";

export const dynamic = "force-dynamic";

async function handlePOST(request: NextRequest): Promise<NextResponse> {
  const rawBody = await request.text();
  const result = registerWorkspaceAccountViaBff(rawBody);
  const response = NextResponse.json(result.body, { status: result.status });
  if (result.setCookie) {
    response.headers.set("Set-Cookie", result.setCookie);
  }
  return response;
}

export const POST = withPersistence(handlePOST);
