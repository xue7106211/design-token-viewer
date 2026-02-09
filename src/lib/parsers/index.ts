import type { ParsedTokenData } from "@/types/token";
import { detectFormat } from "./format-detector";
import { parseFigmaNative } from "./figma-native";
import { parseVariables2CSS } from "./variables2css";
import type { FigmaNativeJSON, Variables2CSSJSON } from "./types";

export { detectFormat } from "./format-detector";

/**
 * Universal parser — detects format and delegates to the appropriate parser.
 * Returns null if format is unrecognized.
 */
export function parseTokenJSON(json: unknown): ParsedTokenData | null {
  const format = detectFormat(json);

  switch (format) {
    case "figma-native":
      return parseFigmaNative(json as FigmaNativeJSON);
    case "variables2css":
      return parseVariables2CSS(json as Variables2CSSJSON);
    default:
      return null;
  }
}
