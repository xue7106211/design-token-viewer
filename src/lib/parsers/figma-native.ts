import type { ParsedTokenData, DesignToken, TokenCollection, RawTokenValue, TokenValue, TokenType } from "@/types/token";
import type { FigmaNativeJSON, FigmaValue, FigmaConcreteValue } from "./types";

/**
 * Parse Figma native Variables export JSON into unified token model.
 */
export function parseFigmaNative(json: FigmaNativeJSON): ParsedTokenData {
  const tokens: Record<string, DesignToken> = {};
  const collections: TokenCollection[] = [];

  // Build collections
  for (const col of json.collections) {
    collections.push({
      id: col.id,
      name: col.name,
      modes: col.modes.map((m) => ({ modeId: m.modeId, name: m.name })),
      tokenIds: col.variableIds,
    });
  }

  // Build tokens
  for (const [varId, variable] of Object.entries(json.variables)) {
    const pathSegments = variable.name.split("/");
    const group = pathSegments.slice(0, -1).join("/");

    // Find which collection this variable belongs to
    const collection = collections.find((c) => c.tokenIds.includes(varId));

    const rawValues: Record<string, RawTokenValue> = {};
    for (const [modeId, fValue] of Object.entries(variable.valuesByMode)) {
      rawValues[modeId] = convertFigmaValue(fValue, variable.type as TokenType);
    }

    // Check if any mode value is an alias
    const isAlias = Object.values(variable.valuesByMode).some(
      (v) => v.type === "ALIAS"
    );

    // Find alias target from first mode (if alias)
    const firstModeValue = Object.values(variable.valuesByMode)[0];
    const aliasOf =
      firstModeValue?.type === "ALIAS" ? firstModeValue.id : undefined;

    tokens[varId] = {
      id: varId,
      name: variable.name,
      path: pathSegments,
      type: variable.type as TokenType,
      collection: collection?.name ?? "Unknown",
      group,
      rawValues,
      resolvedValues: {}, // Will be filled by resolver
      isAlias,
      aliasOf,
      referencedBy: [],
      description: variable.description,
    };
  }

  return { collections, tokens };
}

function convertFigmaValue(fv: FigmaValue, tokenType: TokenType): RawTokenValue {
  if (fv.type === "ALIAS") {
    return { type: "ALIAS", id: fv.id };
  }

  switch (fv.type) {
    case "COLOR": {
      const c = fv.value as { r: number; g: number; b: number; a: number };
      return { type: "COLOR", value: { r: c.r, g: c.g, b: c.b, a: c.a } };
    }
    case "NUMBER":
      return { type: "NUMBER", value: fv.value as number };
    case "STRING":
      return { type: "STRING", value: fv.value as string };
    case "BOOLEAN":
      return { type: "BOOLEAN", value: fv.value as boolean };
    default:
      return { type: tokenType, value: (fv as FigmaConcreteValue).value } as TokenValue;
  }
}
