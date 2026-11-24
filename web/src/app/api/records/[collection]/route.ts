import { NextRequest, NextResponse } from "next/server";
import { authorizeApiRequest } from "@/lib/auth-bff";
import { withPersistence } from "@/lib/persistence";
import { isRecordCollection, readRecordCollection, writeRecordCollection } from "@/lib/records-bff";

export const dynamic = "force-dynamic";

interface RouteContext {
  readonly params: Promise<{ collection: string }>;
}

function notFound(collection: string): NextResponse {
  return NextResponse.json(
    { __typename: "ValidationError", code: "NOT_FOUND", message: `Unknown records collection '${collection}'.`, field: "collection" },
    { status: 404 },
  );
}

async function handleGET(request: NextRequest, { params }: RouteContext): Promise<NextResponse> {
  const { collection } = await params;
  if (!isRecordCollection(collection)) return notFound(collection);
  const auth = await authorizeApiRequest(request, "LEDGER_READ");
  if (!auth.ok) {
    return NextResponse.json(auth.body, { status: auth.status });
  }
  return NextResponse.json(readRecordCollection(collection, auth.ctx.workspaceId), { status: 200 });
}

async function handlePUT(request: NextRequest, { params }: RouteContext): Promise<NextResponse> {
  const { collection } = await params;
  if (!isRecordCollection(collection)) return notFound(collection);
  const auth = await authorizeApiRequest(request, "LEDGER_POST");
  if (!auth.ok) {
    return NextResponse.json(auth.body, { status: auth.status });
  }
  const result = await writeRecordCollection(
    collection,
    auth.ctx.workspaceId,
    await request.text(),
    auth.ctx.userId,
  );
  return NextResponse.json(result.body, { status: result.status });
}

export const GET = withPersistence(handleGET);
export const PUT = withPersistence(handlePUT);
