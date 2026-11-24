import { NextRequest, NextResponse } from "next/server";
import { formatClearSessionCookieHeader } from "@/lib/auth-bff";
import { withPersistence } from "@/lib/persistence";

export const dynamic = "force-dynamic";

async function handlePOST(_request: NextRequest): Promise<NextResponse> {
  const response = NextResponse.json({ signedOut: true }, { status: 200 });
  response.headers.set("Set-Cookie", formatClearSessionCookieHeader());
  return response;
}

export const POST = withPersistence(handlePOST);
