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
    const document = await getTokenDocumentService(documentIdFromRequest(request)).renameGroup({
      oldPath: String((body as { oldPath?: unknown }).oldPath ?? ""),
      newPath: String((body as { newPath?: unknown }).newPath ?? ""),
      revision: readRevision(body),
      actor: actorFromRequest(request, body),
    });
    return NextResponse.json(document);
  } catch (error) {
    return jsonError(error);
  }
}
