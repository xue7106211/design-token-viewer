import { NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import path from "path";

/**
 * POST /api/save-sample-tokens
 * Writes the request body (Figma native JSON) to src/data/sample-tokens.json.
 * Only enabled in development so edits in the app can persist to the sample file.
 */
export async function POST(request: Request) {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json(
      { error: "Only available in development" },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const filePath = path.join(process.cwd(), "src/data/sample-tokens.json");
    const content = JSON.stringify(body, null, 2);
    await writeFile(filePath, content, "utf-8");
    return NextResponse.json({ ok: true, path: filePath });
  } catch (e) {
    console.error("[save-sample-tokens]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Write failed" },
      { status: 500 }
    );
  }
}
