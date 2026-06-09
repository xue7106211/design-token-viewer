import { NextResponse } from "next/server";
import { getTokenDocumentService, jsonError } from "@/lib/collaboration/server";

export async function GET() {
  try {
    const entries = await getTokenDocumentService().getChangeLogs();
    return NextResponse.json({ entries });
  } catch (error) {
    return jsonError(error);
  }
}
