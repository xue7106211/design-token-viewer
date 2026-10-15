import type { DesignToken, TokenType, TokenValue, TypographyValue } from "@/types/token";
import { fontStyleToWeight, isItalicFontStyle } from "@/lib/typography";
import { stripCodeSyntaxPrefix } from "./utils";

/**
 * Extract the leaf segment from a token name (last path segment).
 * e.g. "文字图标色/on_surface" -> "on_surface", "black/color-black-level1" -> "color_black_level1"
 * A leading Chinese group prefix on the leaf (HyperOS: "文字_on_surface") is removed.
 */
function getLeafName(name: string): string {
  const segments = name.split("/").filter(Boolean);
  const leaf = (segments[segments.length - 1] ?? name).replace(/-/g, "_").replace(/\s+/g, "_").toLowerCase();
  return stripCodeSyntaxPrefix(leaf);
}

/**
 * codeSyntax.ANDROID is the resource name when present.
 * Strip a leading Chinese group prefix; do not add another miuix_ prefix or mode suffix.
 */
function explicitAndroidName(token: DesignToken): string | undefined {
  const raw = token.codeSyntax?.ANDROID?.trim();
  if (!raw) return undefined;
  const stripped = stripCodeSyntaxPrefix(raw).trim();
  return stripped || undefined;
}

/**
 * Token leaf is already a HyperOS Android resource name (miuix_color_…, miuix_white_…, miuix_space_…).
 * Those names must not be wrapped in another miuix_default_{type}_ or miuix_{type}_ prefix.
 */
function isExplicitMiuixResourceName(leaf: string): boolean {
  return leaf.startsWith("miuix_");
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
    case "TYPOGRAPHY": return "text_style";
  }
}

/**
 * Generate HyperOS miuix Android resource name for a Feature Token (alias / 2nd-level).
 * Short leaves: miuix_default_{type}_{leaf}{modeSuffix}, e.g. "miuix_default_color_on_surface_light".
 * Leaves that already start with miuix_ are the resource name; only the mode suffix is appended.
 * e.g. "miuix_color_bg_layout_white_page" + mode_light -> "miuix_color_bg_layout_white_page_light".
 */
export function getMiuixFeatureName(token: DesignToken, modeId: string): string {
  const typeSeg = getMiuixTypeSegment(token.type);
  const leaf = getLeafName(token.name);
  const suffix = getModeSuffix(modeId);
  if (isExplicitMiuixResourceName(leaf)) return `${leaf}${suffix}`;
  return `miuix_default_${typeSeg}_${leaf}${suffix}`;
}

/**
 * Generate HyperOS miuix Android resource name for a Primitive Token (1st-level, no mode suffix).
 * Short leaves: miuix_{type}_{leaf}, e.g. "miuix_color_black_level1".
 * Leaves that already start with miuix_ are used as-is, e.g. "miuix_white_solid_level_1000".
 */
export function getMiuixPrimitiveName(token: DesignToken): string {
  const typeSeg = getMiuixTypeSegment(token.type);
  const leaf = getLeafName(token.name);
  if (isExplicitMiuixResourceName(leaf)) return leaf;
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
    case "TYPOGRAPHY":
      return "style";
  }
}

/**
 * Get the Android resource name for a referenced (target) token.
 * Uses codeSyntax.ANDROID (Chinese prefix stripped) when set, otherwise the
 * target's primitive Android name — the name that token exports as itself.
 */
function getReferenceName(targetToken: DesignToken): string {
  return explicitAndroidName(targetToken) ?? getMiuixPrimitiveName(targetToken);
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
    case "TYPOGRAPHY":
      return "style";
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
  const explicitName = explicitAndroidName(token);
  let name: string;
  if (explicitName) {
    name = explicitName;
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
        const refName = getReferenceName(targetToken);
        if (token.type === "TYPOGRAPHY") {
          // A text style aliasing another text style inherits it as the parent style.
          return `<style name="${name}" parent="${refName}" />`;
        }
        const prefix = getAndroidResourcePrefix(token.type);
        const tag = getXmlTag(token.type);
        return `<${tag} name="${name}">@${prefix}/${refName}</${tag}>`;
      }
    }
  }

  return formatAndroidXML(name, value);
}

/**
 * TYPOGRAPHY → `<style>` with resolved literal values.
 * Interim behavior: per-field Reference aliases are emitted as their resolved values
 * (sizes in sp) instead of `@dimen/…`, because NUMBER references export as dp dimens.
 * fontStyle maps to android:textFontWeight (API 28+); letterSpacing px → em.
 * paragraphSpacing has no TextView attribute and is not emitted.
 */
function formatAndroidTextStyle(name: string, value: TypographyValue): string {
  const items: Array<[string, string]> = [
    ["android:fontFamily", value.fontFamily],
    ["android:textFontWeight", String(fontStyleToWeight(value.fontStyle))],
  ];
  if (isItalicFontStyle(value.fontStyle)) items.push(["android:textStyle", "italic"]);
  items.push(["android:textSize", `${value.fontSize}sp`]);
  items.push(["android:lineHeight", `${value.lineHeight}sp`]);
  if (value.letterSpacing !== undefined && value.fontSize > 0) {
    const em = Math.round((value.letterSpacing / value.fontSize) * 10000) / 10000;
    items.push(["android:letterSpacing", String(em)]);
  }
  const body = items.map(([attr, v]) => `    <item name="${attr}">${v}</item>`).join("\n");
  return `<style name="${name}">\n${body}\n</style>`;
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
    case "TYPOGRAPHY":
      return formatAndroidTextStyle(name, value.value);
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
    // Multi-line entries (e.g. <style>) are indented line by line.
    .flatMap((entry) => entry.split("\n"))
    .map((line) => `    ${line}`);

  return `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n${lines.join("\n")}\n</resources>`;
}

/**
 * Get the Android resource name for a token (without XML wrapping).
 * Returns codeSyntax.ANDROID if set, otherwise generates HyperOS miuix name.
 */
export function getAndroidResourceName(token: DesignToken, modeId?: string): string {
  const explicitName = explicitAndroidName(token);
  if (explicitName) return explicitName;
  const resolvedModeId = modeId ?? Object.keys(token.rawValues)[0];
  if (token.isAlias) return getMiuixFeatureName(token, resolvedModeId);
  return getMiuixPrimitiveName(token);
}
