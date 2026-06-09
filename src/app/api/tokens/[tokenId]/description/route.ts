import { NextResponse, type NextRequest } from "next/server";
import { actorFromRequest, getTokenDocumentService, jsonError, readRevision } from "@/lib/collaboration/server";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ tokenId: string }> }
) {
  try {
    const body = await request.json();
    const { tokenId } = await context.params;
    const document = await getTokenDocumentService().updateTokenDescription({
      tokenId,
      description: String((body as { description?: unknown }).description ?? ""),
      revision: readRevision(body),
      actor: actorFromRequest(request, body),
    });
    return NextResponse.json(document);
  } catch (error) {
    return jsonError(error);
  }
}
