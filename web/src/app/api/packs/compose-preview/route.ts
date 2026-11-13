import { NextRequest, NextResponse } from "next/server";
import { composePackPreviewViaBff } from "@/lib/packs-bff";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const rawBody = await request.text();
  const result = await composePackPreviewViaBff(rawBody);
  return NextResponse.json(result.body, { status: result.status });
}
