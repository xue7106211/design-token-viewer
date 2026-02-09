import type { ParsedTokenData, DesignToken, TokenValue, RawTokenValue } from "@/types/token";

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

  // Build reverse reference map
  for (const token of Object.values(tokens)) {
    for (const rawValue of Object.values(token.rawValues)) {
      if (rawValue.type === "ALIAS") {
        const target = tokens[rawValue.id];
        if (target && !target.referencedBy.includes(token.id)) {
          target.referencedBy.push(token.id);
        }
      }
    }
  }

  // Resolve all values (with cycle detection)
  for (const token of Object.values(tokens)) {
    for (const [modeId, rawValue] of Object.entries(token.rawValues)) {
      token.resolvedValues[modeId] = resolveValue(rawValue, modeId, tokens, new Set());
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
  if (rawValue.type !== "ALIAS") {
    return rawValue as TokenValue;
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
