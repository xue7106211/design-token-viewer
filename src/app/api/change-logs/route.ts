import { NextResponse, type NextRequest } from "next/server";
import { documentIdFromRequest, getTokenDocumentService, jsonError } from "@/lib/collaboration/server";

export async function GET(request: NextRequest) {
  try {
    const page = await getTokenDocumentService(documentIdFromRequest(request)).getChangeLogs();
    return NextResponse.json(page);
  } catch (error) {
    return jsonError(error);
  }
}
