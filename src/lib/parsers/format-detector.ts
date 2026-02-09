import type { FigmaNativeJSON } from "./types";
import type { Variables2CSSJSON } from "./types";

export type DetectedFormat = "figma-native" | "variables2css" | "unknown";

/**
 * Auto-detect JSON format based on structure heuristics.
 */
export function detectFormat(json: unknown): DetectedFormat {
  if (!json || typeof json !== "object") return "unknown";

  const obj = json as Record<string, unknown>;

  // Figma native: has `collections` array and `variables` object with ids
  if (
    Array.isArray(obj.collections) &&
    obj.variables &&
    typeof obj.variables === "object" &&
    !Array.isArray(obj.variables)
  ) {
    // Check if variables have `valuesByMode` (Figma native)
    const firstVar = Object.values(obj.variables as Record<string, unknown>)[0];
    if (firstVar && typeof firstVar === "object" && "valuesByMode" in (firstVar as Record<string, unknown>)) {
      return "figma-native";
    }
  }

  // Variables2CSS: has `collections` array where each collection has `variables` array
  if (Array.isArray(obj.collections)) {
    const firstCol = obj.collections[0] as Record<string, unknown> | undefined;
    if (firstCol && Array.isArray(firstCol.variables) && Array.isArray(firstCol.modes)) {
      return "variables2css";
    }
  }

  return "unknown";
}

export function isFigmaNative(json: unknown): json is FigmaNativeJSON {
  return detectFormat(json) === "figma-native";
}

export function isVariables2CSS(json: unknown): json is Variables2CSSJSON {
  return detectFormat(json) === "variables2css";
}
