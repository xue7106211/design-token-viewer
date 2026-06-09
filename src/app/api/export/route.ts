import { NextResponse, type NextRequest } from "next/server";
import { generateTokenBlock } from "@/lib/code-generators";
import { parseTokenJSON } from "@/lib/parsers";
import { resolveTokens } from "@/lib/token-resolver";
import { getTokenDocumentService, jsonError } from "@/lib/collaboration/server";
import type { CodeFormat, ParsedTokenData } from "@/types/token";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const format = searchParams.get("format") ?? "json";
    const snapshotId = searchParams.get("snapshotId");
    const modeId = searchParams.get("modeId") ?? undefined;

    const service = getTokenDocumentService();
    const sourceJson = snapshotId
      ? (await service.getSnapshot(snapshotId)).json
      : (await service.getDocument()).currentJson;

    if (format === "json") {
      return NextResponse.json({ format, code: JSON.stringify(sourceJson, null, 2) });
    }

    if (format !== "css" && format !== "android") {
      return NextResponse.json({ error: "Unsupported export format" }, { status: 400 });
    }

    const parsed = parseExportSource(sourceJson);
    const firstModeId = parsed.collections[0]?.modes[0]?.modeId;
    const activeModeId = modeId ?? firstModeId;
    const code = generateTokenBlock(
      Object.values(parsed.tokens),
      format as CodeFormat,
      activeModeId,
      parsed.tokens
    );

    return NextResponse.json({ format, code });
  } catch (error) {
    return jsonError(error);
  }
}

function parseExportSource(json: unknown): ParsedTokenData {
  const parsed = parseTokenJSON(json);
  if (!parsed) throw new Error("Token JSON 格式无法识别。");
  return resolveTokens(parsed);
}
