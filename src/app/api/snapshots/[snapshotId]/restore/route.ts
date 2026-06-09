import { NextResponse, type NextRequest } from "next/server";
import { actorFromRequest, getTokenDocumentService, jsonError, readRevision } from "@/lib/collaboration/server";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ snapshotId: string }> }
) {
  try {
    const body = await request.json();
    const { snapshotId } = await context.params;
    const document = await getTokenDocumentService().restoreSnapshot({
      snapshotId,
      revision: readRevision(body),
      actor: actorFromRequest(request, body),
    });
    return NextResponse.json(document);
  } catch (error) {
    return jsonError(error);
  }
}
