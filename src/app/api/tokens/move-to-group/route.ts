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
    const payload = body as {
      tokenIds?: unknown;
      targetGroup?: unknown;
      collectionId?: unknown;
      tokenOrder?: unknown;
    };
    const document = await getTokenDocumentService(documentIdFromRequest(request)).moveTokensToGroup({
      tokenIds: Array.isArray(payload.tokenIds) ? payload.tokenIds.map(String) : [],
      targetGroup: typeof payload.targetGroup === "string" ? payload.targetGroup : "",
      collectionId: typeof payload.collectionId === "string" ? payload.collectionId : undefined,
      tokenOrder: Array.isArray(payload.tokenOrder) ? payload.tokenOrder.map(String) : undefined,
      revision: readRevision(body),
      actor: actorFromRequest(request, body),
    });
    return NextResponse.json(document);
  } catch (error) {
    return jsonError(error);
  }
}
