import { NextResponse, type NextRequest } from "next/server";
import { actorFromRequest, getTokenDocumentService, jsonError, readRevision } from "@/lib/collaboration/server";
import type { TokenValue } from "@/types/token";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ tokenId: string }> }
) {
  try {
    const body = await request.json();
    const { tokenId } = await context.params;
    const document = await getTokenDocumentService().updateTokenValue({
      tokenId,
      modeId: String((body as { modeId?: unknown }).modeId ?? ""),
      value: (body as { value: TokenValue }).value,
      revision: readRevision(body),
      actor: actorFromRequest(request, body),
    });
    return NextResponse.json(document);
  } catch (error) {
    return jsonError(error);
  }
}
