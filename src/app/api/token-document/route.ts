import { NextResponse, type NextRequest } from "next/server";
import {
  actorFromRequest,
  documentIdFromRequest,
  getTokenDocumentService,
  jsonError,
  readRevision,
} from "@/lib/collaboration/server";

export async function GET(request: NextRequest) {
  try {
    const document = await getTokenDocumentService(documentIdFromRequest(request)).getDocument();
    return NextResponse.json(document);
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const json = (body as { json?: unknown }).json;
    const document = await getTokenDocumentService(documentIdFromRequest(request)).importDocument({
      json,
      revision: readRevision(body),
      actor: actorFromRequest(request, body),
    });
    return NextResponse.json(document);
  } catch (error) {
    return jsonError(error);
  }
}
