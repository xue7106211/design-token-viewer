import { NextResponse, type NextRequest } from "next/server";
import { actorFromRequest, getTokenDocumentService, jsonError, readRevision } from "@/lib/collaboration/server";

type CodeSyntax = { WEB?: string; ANDROID?: string; iOS?: string };

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ tokenId: string }> }
) {
  try {
    const body = await request.json();
    const { tokenId } = await context.params;
    const document = await getTokenDocumentService().updateTokenCodeSyntax({
      tokenId,
      codeSyntax: ((body as { codeSyntax?: CodeSyntax }).codeSyntax ?? {}) as CodeSyntax,
      revision: readRevision(body),
      actor: actorFromRequest(request, body),
    });
    return NextResponse.json(document);
  } catch (error) {
    return jsonError(error);
  }
}
