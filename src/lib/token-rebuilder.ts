import type { TokenCollection, DesignToken, RawTokenValue } from "@/types/token";
import type { FigmaNativeJSON, FigmaCollection, FigmaVariable, FigmaValue } from "@/lib/parsers/types";
import { cloneRawTypography } from "@/lib/typography";

/**
 * Rebuild Figma Native JSON from internal token/collection state.
 * Used to sync rawJSON after updateTokenValue/deleteToken and for export.
 */
export function rebuildRawJSON(
  collections: TokenCollection[],
  tokens: Record<string, DesignToken>
): FigmaNativeJSON {
  const variables: Record<string, FigmaVariable> = {};

  for (const token of Object.values(tokens)) {
    const valuesByMode: Record<string, FigmaValue> = {};
    for (const [modeId, raw] of Object.entries(token.rawValues)) {
      valuesByMode[modeId] = rawValueToFigma(raw);
    }
    variables[token.id] = {
      id: token.id,
      name: token.name,
      type: token.type,
      valuesByMode,
      description: token.description,
      scopes: token.scopes,
      codeSyntax: token.codeSyntax,
    };
  }

  const figmaCollections: FigmaCollection[] = collections.map((col) => ({
    id: col.id,
    name: col.name,
    modes: col.modes.map((m) => ({ modeId: m.modeId, name: m.name })),
    variableIds: col.tokenIds.filter((id) => tokens[id] != null),
  }));

  return {
    collections: figmaCollections,
    variables,
  };
}

function rawValueToFigma(raw: RawTokenValue): FigmaValue {
  if (raw.type === "ALIAS") {
    return { type: "ALIAS", id: raw.id };
  }
  switch (raw.type) {
    case "COLOR":
    case "NUMBER":
    case "STRING":
    case "BOOLEAN":
      return { type: raw.type, value: raw.value };
    case "TYPOGRAPHY":
      return { type: "TYPOGRAPHY", value: cloneRawTypography(raw.value) };
    default:
      return raw as FigmaValue;
  }
}
