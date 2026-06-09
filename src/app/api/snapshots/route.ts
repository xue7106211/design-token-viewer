import { NextResponse, type NextRequest } from "next/server";
import { actorFromRequest, getTokenDocumentService, jsonError } from "@/lib/collaboration/server";

export async function GET() {
  try {
    const snapshots = await getTokenDocumentService().getSnapshots();
    return NextResponse.json({ snapshots });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const snapshot = await getTokenDocumentService().createSnapshot({
      name: String((body as { name?: unknown }).name ?? ""),
      description:
        typeof (body as { description?: unknown }).description === "string"
          ? (body as { description: string }).description
          : undefined,
      actor: actorFromRequest(request, body),
    });
    return NextResponse.json(snapshot);
  } catch (error) {
    return jsonError(error);
  }
}
