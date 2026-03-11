import type { DesignToken, TokenValue } from "@/types/token";
import { colorToHex } from "@/lib/contrast";
import { stripCodeSyntaxPrefix } from "./utils";

/**
 * Generate CSS custom property name from token name
 * e.g. "color/blue/500" -> "--color-blue-500"
 */
export function toCSSVarName(name: string): string {
  return `--${name.replace(/\//g, "-").replace(/\s+/g, "-").toLowerCase()}`;
}

/**
 * Format a token value as CSS
 */
function formatCSSValue(value: TokenValue): string {
  switch (value.type) {
    case "COLOR":
      return colorToHex(value.value);
    case "NUMBER":
      return `${value.value}px`;
    case "STRING":
      return `"${value.value}"`;
    case "BOOLEAN":
      return value.value ? "1" : "0";
  }
}

/**
 * Generate CSS custom property for a single token
 */
export function generateCSSToken(token: DesignToken, modeId?: string): string {
  const resolvedModeId = modeId ?? Object.keys(token.resolvedValues)[0];
  const value = token.resolvedValues[resolvedModeId];
  if (!value) return "";

  const nameWithoutPrefix = stripCodeSyntaxPrefix(token.name);
  const varName = toCSSVarName(nameWithoutPrefix);
  return `${varName}: ${formatCSSValue(value)};`;
}

/**
 * Generate CSS custom properties for multiple tokens
 */
export function generateCSSBlock(
  tokens: DesignToken[],
  modeId?: string,
  selector: string = ":root"
): string {
  const lines = tokens
    .map((t) => generateCSSToken(t, modeId))
    .filter(Boolean)
    .map((line) => `  ${line}`);

  return `${selector} {\n${lines.join("\n")}\n}`;
}
