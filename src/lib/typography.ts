import type {
  AliasReference,
  ConcreteRawTokenValue,
  RawTokenValue,
  RawTypographyValue,
  TokenValue,
  TypographyValue,
} from "@/types/token";

export type TypographyField = keyof RawTypographyValue;

/** Field metadata in display / serialization order */
export const TYPOGRAPHY_FIELDS: ReadonlyArray<{
  key: TypographyField;
  kind: "STRING" | "NUMBER";
  required: boolean;
  label: string;
}> = [
  { key: "fontFamily", kind: "STRING", required: true, label: "Font family" },
  { key: "fontStyle", kind: "STRING", required: true, label: "Font style" },
  { key: "fontSize", kind: "NUMBER", required: true, label: "Font size" },
  { key: "lineHeight", kind: "NUMBER", required: true, label: "Line height" },
  { key: "letterSpacing", kind: "NUMBER", required: false, label: "Letter spacing" },
  { key: "paragraphSpacing", kind: "NUMBER", required: false, label: "Paragraph spacing" },
];

/** All alias target ids referenced by a raw value, including per-field typography aliases */
export function collectAliasIds(raw: RawTokenValue): string[] {
  if (raw.type === "ALIAS") return [raw.id];
  if (raw.type !== "TYPOGRAPHY") return [];
  const ids: string[] = [];
  for (const { key } of TYPOGRAPHY_FIELDS) {
    const field = raw.value[key];
    if (field?.type === "ALIAS") ids.push(field.id);
  }
  return ids;
}

/** Per-field alias references of a raw typography value */
export function getTypographyFieldAliases(
  raw: RawTokenValue | undefined
): Partial<Record<TypographyField, AliasReference>> {
  if (!raw || raw.type !== "TYPOGRAPHY") return {};
  const result: Partial<Record<TypographyField, AliasReference>> = {};
  for (const { key } of TYPOGRAPHY_FIELDS) {
    const field = raw.value[key];
    if (field?.type === "ALIAS") result[key] = field;
  }
  return result;
}

/**
 * Convert a resolved value back to a concrete raw value.
 * Used when detaching an alias: TYPOGRAPHY fields become literal STRING / NUMBER entries.
 */
export function toConcreteRawValue(value: TokenValue): ConcreteRawTokenValue {
  if (value.type !== "TYPOGRAPHY") return value;
  const v = value.value;
  const raw: RawTypographyValue = {
    fontFamily: { type: "STRING", value: v.fontFamily },
    fontStyle: { type: "STRING", value: v.fontStyle },
    fontSize: { type: "NUMBER", value: v.fontSize },
    lineHeight: { type: "NUMBER", value: v.lineHeight },
  };
  if (v.letterSpacing !== undefined) raw.letterSpacing = { type: "NUMBER", value: v.letterSpacing };
  if (v.paragraphSpacing !== undefined) raw.paragraphSpacing = { type: "NUMBER", value: v.paragraphSpacing };
  return { type: "TYPOGRAPHY", value: raw };
}

/** Deep-copy a raw typography value, dropping unknown keys and malformed / undefined fields */
export function cloneRawTypography(value: RawTypographyValue): RawTypographyValue {
  const result: Partial<Record<TypographyField, RawTypographyValue[TypographyField]>> = {};
  if (!value || typeof value !== "object") return result as RawTypographyValue;
  for (const { key } of TYPOGRAPHY_FIELDS) {
    const field = value[key];
    if (field && typeof field === "object" && typeof field.type === "string") result[key] = { ...field };
  }
  return result as RawTypographyValue;
}

/** "32/42" — Figma-like size/line-height summary */
export function formatTypographySize(value: TypographyValue): string {
  return `${formatNumber(value.fontSize)}/${formatNumber(value.lineHeight)}`;
}

/** "MiSans Medium · 32/42" */
export function formatTypographySummary(value: TypographyValue): string {
  return `${value.fontFamily} ${value.fontStyle} · ${formatTypographySize(value)}`;
}

function formatNumber(n: number): string {
  return Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100);
}

const FONT_STYLE_WEIGHTS: Array<[RegExp, number]> = [
  [/^(thin|hairline)/, 100],
  [/^(extra|ultra)[\s-]?light/, 200],
  [/^light/, 300],
  [/^(regular|normal|book|roman)/, 400],
  [/^medium/, 500],
  [/^(semi|demi)[\s-]?bold/, 600],
  [/^(extra|ultra)[\s-]?bold/, 800],
  [/^bold/, 700],
  [/^(black|heavy)/, 900],
];

/** Map a Figma font style name (e.g. "Demibold") to a numeric CSS / Android weight */
export function fontStyleToWeight(fontStyle: string): number {
  const normalized = fontStyle.trim().toLowerCase();
  for (const [pattern, weight] of FONT_STYLE_WEIGHTS) {
    if (pattern.test(normalized)) return weight;
  }
  return 400;
}

/** Whether a font style name implies italic */
export function isItalicFontStyle(fontStyle: string): boolean {
  return /italic|oblique/i.test(fontStyle);
}
