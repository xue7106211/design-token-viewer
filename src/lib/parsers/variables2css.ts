import type { ParsedTokenData, DesignToken, TokenCollection, RawTokenValue, TokenType } from "@/types/token";
import type { Variables2CSSJSON } from "./types";

/**
 * Parse Variables2CSS plugin export JSON into unified token model.
 */
export function parseVariables2CSS(json: Variables2CSSJSON): ParsedTokenData {
  const tokens: Record<string, DesignToken> = {};
  const collections: TokenCollection[] = [];
  let tokenIdCounter = 0;

  for (const col of json.collections) {
    const collectionId = `col_${tokenIdCounter++}`;
    const modes = col.modes.map((modeName, idx) => ({
      modeId: `mode_${collectionId}_${idx}`,
      name: modeName,
    }));

    const tokenIds: string[] = [];

    for (const variable of col.variables) {
      const tokenId = `var_${tokenIdCounter++}`;
      tokenIds.push(tokenId);

      const pathSegments = variable.name.split("/");
      const group = pathSegments.slice(0, -1).join("/");
      const tokenType = mapV2CSSType(variable.type);

      const rawValues: Record<string, RawTokenValue> = {};
      for (let i = 0; i < col.modes.length; i++) {
        const modeName = col.modes[i];
        const modeId = modes[i].modeId;
        const val = variable.values[modeName];
        if (val) {
          rawValues[modeId] = convertV2CSSValue(val.value, val.rawValue, tokenType);
        }
      }

      tokens[tokenId] = {
        id: tokenId,
        name: variable.name,
        path: pathSegments,
        type: tokenType,
        collection: col.name,
        group,
        rawValues,
        resolvedValues: {},
        isAlias: false,
        referencedBy: [],
        description: variable.description,
      };
    }

    collections.push({
      id: collectionId,
      name: col.name,
      modes,
      tokenIds,
    });
  }

  return { collections, tokens };
}

function mapV2CSSType(type: string): TokenType {
  switch (type.toUpperCase()) {
    case "COLOR":
      return "COLOR";
    case "NUMBER":
    case "FLOAT":
      return "NUMBER";
    case "BOOLEAN":
      return "BOOLEAN";
    default:
      return "STRING";
  }
}

function convertV2CSSValue(
  value: string,
  rawValue: { r?: number; g?: number; b?: number; a?: number } | undefined,
  tokenType: TokenType
): RawTokenValue {
  switch (tokenType) {
    case "COLOR": {
      if (rawValue && rawValue.r !== undefined) {
        return {
          type: "COLOR",
          value: {
            r: rawValue.r ?? 0,
            g: rawValue.g ?? 0,
            b: rawValue.b ?? 0,
            a: rawValue.a ?? 1,
          },
        };
      }
      // Parse hex/rgb string
      const parsed = parseColorString(value);
      return { type: "COLOR", value: parsed };
    }
    case "NUMBER":
      return { type: "NUMBER", value: parseFloat(value) || 0 };
    case "BOOLEAN":
      return { type: "BOOLEAN", value: value === "true" };
    default:
      return { type: "STRING", value };
  }
}

function parseColorString(color: string): { r: number; g: number; b: number; a: number } {
  // Handle hex
  if (color.startsWith("#")) {
    const hex = color.replace("#", "");
    const r = parseInt(hex.substring(0, 2), 16) / 255;
    const g = parseInt(hex.substring(2, 4), 16) / 255;
    const b = parseInt(hex.substring(4, 6), 16) / 255;
    const a = hex.length === 8 ? parseInt(hex.substring(6, 8), 16) / 255 : 1;
    return { r, g, b, a };
  }
  return { r: 0, g: 0, b: 0, a: 1 };
}
