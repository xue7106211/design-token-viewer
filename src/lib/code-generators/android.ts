import type { DesignToken, TokenValue } from "@/types/token";

/**
 * Generate Android resource name from token name
 * e.g. "color/blue/500" -> "color_blue_500"
 */
function toAndroidName(name: string): string {
  return name.replace(/\//g, "_").replace(/-/g, "_").replace(/\s+/g, "_").toLowerCase();
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
 * Generate a single Android XML resource line
 */
export function generateAndroidToken(token: DesignToken, modeId?: string): string {
  const resolvedModeId = modeId ?? Object.keys(token.resolvedValues)[0];
  const value = token.resolvedValues[resolvedModeId];
  if (!value) return "";

  const name = toAndroidName(token.name);
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
  tokens: DesignToken[],
  modeId?: string
): string {
  const lines = tokens
    .map((t) => generateAndroidToken(t, modeId))
    .filter(Boolean)
    .map((line) => `    ${line}`);

  return `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n${lines.join("\n")}\n</resources>`;
}
