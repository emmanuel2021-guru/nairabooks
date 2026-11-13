import { NextRequest, NextResponse } from "next/server";
import { formatClearSessionCookieHeader } from "@/lib/auth-bff";

export const dynamic = "force-dynamic";

export async function POST(_request: NextRequest): Promise<NextResponse> {
  const response = NextResponse.json({ signedOut: true }, { status: 200 });
  response.headers.set("Set-Cookie", formatClearSessionCookieHeader());
  return response;
}
