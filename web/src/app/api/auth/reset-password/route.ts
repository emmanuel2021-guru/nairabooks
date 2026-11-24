import { NextRequest, NextResponse } from "next/server";
import { resetPasswordViaBff } from "@/lib/auth-bff";
import { withPersistence } from "@/lib/persistence";

export const dynamic = "force-dynamic";

async function handlePOST(request: NextRequest): Promise<NextResponse> {
  const rawBody = await request.text();
  const result = resetPasswordViaBff(rawBody);
  return NextResponse.json(result.body, { status: result.status });
}

export const POST = withPersistence(handlePOST);
