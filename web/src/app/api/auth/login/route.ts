import { NextRequest, NextResponse } from "next/server";
import { loginWithCredentialsViaBff } from "@/lib/auth-bff";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const rawBody = await request.text();
  const result = loginWithCredentialsViaBff(rawBody);
  const response = NextResponse.json(result.body, { status: result.status });
  if (result.setCookie) {
    response.headers.set("Set-Cookie", result.setCookie);
  }
  return response;
}
