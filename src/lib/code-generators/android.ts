import type { DesignToken, TokenType, TokenValue } from "@/types/token";

/**
 * Extract the leaf segment from a token name (last path segment).
 * e.g. "文字图标色/on_surface" -> "on_surface", "black/color-black-level1" -> "color-black-level1"
 */
function getLeafName(name: string): string {
  const segments = name.split("/").filter(Boolean);
  return (segments[segments.length - 1] ?? name).replace(/-/g, "_").replace(/\s+/g, "_").toLowerCase();
}

/**
 * Extract mode suffix from modeId.
 * e.g. "mode_light" -> "_light", "mode_dark" -> "_dark"
 * Returns empty string if modeId doesn't match "mode_*" pattern.
 */
function getModeSuffix(modeId: string): string {
  const match = modeId.match(/^mode_(.+)$/);
  return match ? `_${match[1]}` : "";
}

/**
 * Map TokenType to HyperOS miuix resource type segment.
 */
function getMiuixTypeSegment(type: TokenType): string {
  switch (type) {
    case "COLOR": return "color";
    case "NUMBER": return "dimen";
    case "STRING": return "string";
    case "BOOLEAN": return "bool";
  }
}

/**
 * Generate HyperOS miuix Android resource name for a Feature Token (alias / 2nd-level).
 * Pattern: miuix_default_{type}_{leaf}_{modeSuffix}
 * e.g. "miuix_default_color_on_surface_light"
 */
export function getMiuixFeatureName(token: DesignToken, modeId: string): string {
  const typeSeg = getMiuixTypeSegment(token.type);
  const leaf = getLeafName(token.name);
  const suffix = getModeSuffix(modeId);
  return `miuix_default_${typeSeg}_${leaf}${suffix}`;
}

/**
 * Generate HyperOS miuix Android resource name for a Primitive Token (1st-level, no mode suffix).
 * Pattern: miuix_{type}_{leaf}
 * e.g. "miuix_color_black_level1"
 */
export function getMiuixPrimitiveName(token: DesignToken): string {
  const typeSeg = getMiuixTypeSegment(token.type);
  const leaf = getLeafName(token.name);
  return `miuix_${typeSeg}_${leaf}`;
}

/**
 * Format a color value as Android hex (with alpha first: #AARRGGBB or #RRGGBB)
 */
function formatAndroidColor(color: { r: number; g: number; b: number; a: number }): string {
  const r = Math.round(color.r * 255).toString(16).padStart(2, "0");
  const g = Math.round(color.g * 255).toString(16).padStart(2, "0");
  const b = Math.round(color.b * 255).toString(16).padStart(2, "0");
  if (color.a < 1) {
    const a = Math.round(color.a * 255).toString(16).padStart(2, "0");
    return `#${a}${r}${g}${b}`.toUpperCase();
  }
  return `#${r}${g}${b}`.toUpperCase();
}

/**
 * Map TokenType to Android resource prefix for alias references.
 */
function getAndroidResourcePrefix(type: TokenType): string {
  switch (type) {
    case "COLOR":
      return "color";
    case "NUMBER":
      return "dimen";
    case "STRING":
      return "string";
    case "BOOLEAN":
      return "bool";
  }
}

/**
 * Get the Android resource name for a referenced (target) token.
 * Uses codeSyntax.ANDROID if available, otherwise generates HyperOS miuix primitive name.
 */
function getReferenceName(targetToken: DesignToken): string {
  if (targetToken.codeSyntax?.ANDROID) {
    return targetToken.codeSyntax.ANDROID;
  }
  return getMiuixPrimitiveName(targetToken);
}

/**
 * Get the XML tag name for a given token type.
 */
function getXmlTag(type: TokenType): string {
  switch (type) {
    case "COLOR":
      return "color";
    case "NUMBER":
      return "dimen";
    case "STRING":
      return "string";
    case "BOOLEAN":
      return "bool";
  }
}

/**
 * Generate a single Android XML resource line.
 * Uses token.codeSyntax.ANDROID when present, otherwise generates HyperOS miuix name.
 * When tokens dictionary is provided, alias tokens output @prefix/refName references.
 */
export function generateAndroidToken(
  token: DesignToken,
  modeId?: string,
  tokens?: Record<string, DesignToken>
): string {
  const resolvedModeId = modeId ?? Object.keys(token.resolvedValues)[0];
  const value = token.resolvedValues[resolvedModeId];
  if (!value) return "";

  // Determine the Android resource name for this token
  let name: string;
  if (token.codeSyntax?.ANDROID) {
    name = token.codeSyntax.ANDROID;
  } else if (token.isAlias) {
    name = getMiuixFeatureName(token, resolvedModeId);
  } else {
    name = getMiuixPrimitiveName(token);
  }

  // Check if this token is an alias in the current mode and tokens dict is available
  if (tokens) {
    const rawValue = token.rawValues[resolvedModeId];
    if (rawValue && rawValue.type === "ALIAS") {
      const targetToken = tokens[rawValue.id];
      if (targetToken) {
        const prefix = getAndroidResourcePrefix(token.type);
        const refName = getReferenceName(targetToken);
        const tag = getXmlTag(token.type);
        return `<${tag} name="${name}">@${prefix}/${refName}</${tag}>`;
      }
    }
  }

  return formatAndroidXML(name, value);
}

function formatAndroidXML(name: string, value: TokenValue): string {
  switch (value.type) {
    case "COLOR":
      return `<color name="${name}">${formatAndroidColor(value.value)}</color>`;
    case "NUMBER":
      return `<dimen name="${name}">${value.value}dp</dimen>`;
    case "STRING":
      return `<string name="${name}">${value.value}</string>`;
    case "BOOLEAN":
      return `<bool name="${name}">${value.value}</bool>`;
  }
}

/**
 * Generate full Android XML resource file
 */
export function generateAndroidBlock(
  tokenList: DesignToken[],
  modeId?: string,
  tokens?: Record<string, DesignToken>
): string {
  const lines = tokenList
    .map((t) => generateAndroidToken(t, modeId, tokens))
    .filter(Boolean)
    .map((line) => `    ${line}`);

  return `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n${lines.join("\n")}\n</resources>`;
}

/**
 * Get the Android resource name for a token (without XML wrapping).
 * Returns codeSyntax.ANDROID if set, otherwise generates HyperOS miuix name.
 */
export function getAndroidResourceName(token: DesignToken, modeId?: string): string {
  if (token.codeSyntax?.ANDROID) return token.codeSyntax.ANDROID;
  const resolvedModeId = modeId ?? Object.keys(token.rawValues)[0];
  if (token.isAlias) return getMiuixFeatureName(token, resolvedModeId);
  return getMiuixPrimitiveName(token);
}
