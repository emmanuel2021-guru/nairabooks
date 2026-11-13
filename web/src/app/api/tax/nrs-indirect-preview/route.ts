import { NextRequest, NextResponse } from "next/server";
import { previewIndirectTaxViaBff } from "@/lib/tax-bff";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const rawBody = await request.text();
  const result = await previewIndirectTaxViaBff(rawBody);
  return NextResponse.json(result.body, { status: result.status });
}
