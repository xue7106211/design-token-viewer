import type {
  ParsedTokenData,
  DesignToken,
  TokenValue,
  RawTokenValue,
  RawTypographyValue,
  TypographyValue,
} from "@/types/token";
import { collectAliasIds, TYPOGRAPHY_FIELDS } from "@/lib/typography";

/**
 * Resolve all alias references in the token data.
 * Fills `resolvedValues` and `referencedBy` on every token.
 */
export function resolveTokens(data: ParsedTokenData): ParsedTokenData {
  const { tokens } = data;

  // Reset reverse references
  for (const token of Object.values(tokens)) {
    token.referencedBy = [];
    token.resolvedValues = {};
  }

  // Build reverse reference map (top-level aliases and per-field TYPOGRAPHY aliases)
  for (const token of Object.values(tokens)) {
    for (const rawValue of Object.values(token.rawValues)) {
      for (const targetId of collectAliasIds(rawValue)) {
        const target = tokens[targetId];
        if (target && !target.referencedBy.includes(token.id)) {
          target.referencedBy.push(token.id);
        }
      }
    }
  }

  // Resolve all values (with cycle detection)
  for (const token of Object.values(tokens)) {
    for (const [modeId, rawValue] of Object.entries(token.rawValues)) {
      token.resolvedValues[modeId] = resolveValue(rawValue, modeId, tokens, new Set([token.id]));
    }
  }

  return data;
}

/**
 * Recursively resolve a value, following alias chains.
 */
function resolveValue(
  rawValue: RawTokenValue,
  modeId: string,
  tokens: Record<string, DesignToken>,
  visited: Set<string>
): TokenValue {
  if (rawValue.type === "TYPOGRAPHY") {
    return resolveTypography(rawValue.value, modeId, tokens, visited);
  }
  if (rawValue.type !== "ALIAS") {
    return rawValue;
  }

  // Cycle detection
  if (visited.has(rawValue.id)) {
    return { type: "STRING", value: "[Circular Reference]" };
  }
  visited.add(rawValue.id);

  const target = tokens[rawValue.id];
  if (!target) {
    return { type: "STRING", value: "[Missing Reference]" };
  }

  // Try to resolve the target in the same mode first, fall back to first available
  const targetRaw = target.rawValues[modeId] ?? Object.values(target.rawValues)[0];
  if (!targetRaw) {
    return { type: "STRING", value: "[No Value]" };
  }

  return resolveValue(targetRaw, modeId, tokens, visited);
}

/**
 * Resolve every TYPOGRAPHY field independently. Each field must end at a value of its
 * declared kind (STRING / NUMBER); otherwise the whole token resolves to an error STRING,
 * consistent with how broken top-level aliases are reported.
 */
function resolveTypography(
  raw: RawTypographyValue,
  modeId: string,
  tokens: Record<string, DesignToken>,
  visited: Set<string>
): TokenValue {
  const result: Partial<Record<keyof TypographyValue, string | number>> = {};

  for (const { key, kind, required } of TYPOGRAPHY_FIELDS) {
    const field = raw[key];
    if (!field) {
      if (required) return { type: "STRING", value: `[Missing Typography Field: ${key}]` };
      continue;
    }
    // Each field follows its own chain, so sibling fields may share a target.
    const resolved = resolveValue(field, modeId, tokens, new Set(visited));
    if (resolved.type !== kind) {
      if (resolved.type === "STRING" && resolved.value.startsWith("[")) return resolved;
      return { type: "STRING", value: `[Invalid Typography Field: ${key}]` };
    }
    result[key] = resolved.value as string | number;
  }

  return { type: "TYPOGRAPHY", value: result as unknown as TypographyValue };
}

/**
 * Get the full alias resolution chain for a token in a given mode.
 * Returns array of [tokenId, tokenName] pairs from start to final value.
 */
export function getAliasChain(
  tokenId: string,
  modeId: string,
  tokens: Record<string, DesignToken>
): Array<{ id: string; name: string }> {
  const chain: Array<{ id: string; name: string }> = [];
  const visited = new Set<string>();
  let currentId = tokenId;

  while (currentId) {
    if (visited.has(currentId)) break;
    visited.add(currentId);

    const token = tokens[currentId];
    if (!token) break;

    chain.push({ id: token.id, name: token.name });

    const rawValue = token.rawValues[modeId] ?? Object.values(token.rawValues)[0];
    if (rawValue?.type === "ALIAS") {
      currentId = rawValue.id;
    } else {
      break;
    }
  }

  return chain;
}
