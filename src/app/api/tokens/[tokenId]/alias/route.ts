import { NextResponse, type NextRequest } from "next/server";
import { actorFromRequest, getTokenDocumentService, jsonError, readRevision } from "@/lib/collaboration/server";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ tokenId: string }> }
) {
  try {
    const body = await request.json();
    const { tokenId } = await context.params;
    const targetTokenId = (body as { targetTokenId?: unknown }).targetTokenId;
    const document = await getTokenDocumentService().setTokenAlias({
      tokenId,
      modeId: String((body as { modeId?: unknown }).modeId ?? ""),
      targetTokenId: typeof targetTokenId === "string" ? targetTokenId : null,
      revision: readRevision(body),
      actor: actorFromRequest(request, body),
    });
    return NextResponse.json(document);
  } catch (error) {
    return jsonError(error);
  }
}
