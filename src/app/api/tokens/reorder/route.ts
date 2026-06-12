import { NextResponse, type NextRequest } from "next/server";
import {
  actorFromRequest,
  documentIdFromRequest,
  getTokenDocumentService,
  jsonError,
  readRevision,
} from "@/lib/collaboration/server";

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const document = await getTokenDocumentService(documentIdFromRequest(request)).reorderTokens({
      collectionId: String((body as { collectionId?: unknown }).collectionId ?? ""),
      tokenIds: Array.isArray((body as { tokenIds?: unknown }).tokenIds)
        ? ((body as { tokenIds: unknown[] }).tokenIds.map(String))
        : [],
      revision: readRevision(body),
      actor: actorFromRequest(request, body),
    });
    return NextResponse.json(document);
  } catch (error) {
    return jsonError(error);
  }
}
