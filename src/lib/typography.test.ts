import { describe, expect, it } from "vitest";
import { parseTokenJSON } from "@/lib/parsers";
import { resolveTokens } from "@/lib/token-resolver";
import { rebuildRawJSON } from "@/lib/token-rebuilder";
import { generateAndroidBlock, generateAndroidToken } from "@/lib/code-generators/android";
import { generateCSSToken } from "@/lib/code-generators/css";
import type { FigmaNativeJSON } from "@/lib/parsers/types";
import {
  collectAliasIds,
  fontStyleToWeight,
  formatTypographySummary,
  toConcreteRawValue,
} from "./typography";

const MODES = [
  { modeId: "mode_light", name: "Light" },
  { modeId: "mode_dark", name: "Dark" },
];

function both<T>(value: T) {
  return { mode_light: value, mode_dark: value };
}

const typographyValue = {
  type: "TYPOGRAPHY" as const,
  value: {
    fontFamily: { type: "ALIAS" as const, id: "ref_family" },
    fontStyle: { type: "ALIAS" as const, id: "ref_style" },
    fontSize: { type: "ALIAS" as const, id: "ref_size" },
    lineHeight: { type: "NUMBER" as const, value: 42 },
  },
};

function makeDocument(): FigmaNativeJSON {
  return {
    collections: [
      { id: "col_ref", name: "Reference Token", modes: MODES, variableIds: ["ref_family", "ref_style", "ref_size"] },
      { id: "col_sem", name: "Semantic Token", modes: MODES, variableIds: ["ts_1", "ts_alias"] },
    ],
    variables: {
      ref_family: {
        id: "ref_family",
        name: "font/family/miuix_ref_font_family_misans",
        type: "STRING",
        valuesByMode: both({ type: "STRING" as const, value: "MiSans" }),
      },
      ref_style: {
        id: "ref_style",
        name: "font/style/miuix_ref_font_style_medium",
        type: "STRING",
        valuesByMode: both({ type: "STRING" as const, value: "Medium" }),
      },
      ref_size: {
        id: "ref_size",
        name: "number/font_size/miuix_ref_font_size_32",
        type: "NUMBER",
        valuesByMode: both({ type: "NUMBER" as const, value: 32 }),
      },
      ts_1: {
        id: "ts_1",
        name: "text_style/miuix_text_style_headline_large_medium",
        type: "TYPOGRAPHY",
        description: "页面级大标题（未上滑）",
        valuesByMode: both(typographyValue),
        codeSyntax: { ANDROID: "miuix_text_style_headline_large_medium" },
      },
      ts_alias: {
        id: "ts_alias",
        name: "text_style/title_alias",
        type: "TYPOGRAPHY",
        valuesByMode: both({ type: "ALIAS" as const, id: "ts_1" }),
      },
    },
  };
}

function load(json: FigmaNativeJSON = makeDocument()) {
  const parsed = parseTokenJSON(json);
  if (!parsed) throw new Error("parse failed");
  return resolveTokens(parsed);
}

describe("TYPOGRAPHY tokens", () => {
  it("parses nested per-field aliases", () => {
    const { tokens } = load();
    const token = tokens.ts_1;
    expect(token.type).toBe("TYPOGRAPHY");
    expect(token.isAlias).toBe(false);
    expect(token.rawValues.mode_light).toEqual(typographyValue);
    expect(token.description).toBe("页面级大标题（未上滑）");
  });

  it("resolves every field and registers reverse references", () => {
    const { tokens } = load();
    const expected = {
      type: "TYPOGRAPHY",
      value: { fontFamily: "MiSans", fontStyle: "Medium", fontSize: 32, lineHeight: 42 },
    };
    expect(tokens.ts_1.resolvedValues.mode_light).toEqual(expected);
    expect(tokens.ts_1.resolvedValues.mode_dark).toEqual(expected);
    // Whole-token alias to another text style
    expect(tokens.ts_alias.resolvedValues.mode_light).toEqual(expected);
    expect(tokens.ref_family.referencedBy).toEqual(["ts_1"]);
    expect(tokens.ref_size.referencedBy).toEqual(["ts_1"]);
    expect(tokens.ts_1.referencedBy).toEqual(["ts_alias"]);
  });

  it("reports missing references and wrong field kinds", () => {
    const json = makeDocument();
    json.variables.ts_1.valuesByMode.mode_light = {
      ...typographyValue,
      value: { ...typographyValue.value, fontSize: { type: "ALIAS", id: "nope" } },
    };
    json.variables.ts_1.valuesByMode.mode_dark = {
      ...typographyValue,
      // fontSize pointing at a STRING token is invalid
      value: { ...typographyValue.value, fontSize: { type: "ALIAS", id: "ref_family" } },
    };
    const { tokens } = load(json);
    expect(tokens.ts_1.resolvedValues.mode_light).toEqual({ type: "STRING", value: "[Missing Reference]" });
    expect(tokens.ts_1.resolvedValues.mode_dark).toEqual({
      type: "STRING",
      value: "[Invalid Typography Field: fontSize]",
    });
  });

  it("round-trips through rebuildRawJSON", () => {
    const json = makeDocument();
    const { collections, tokens } = load(json);
    const rebuilt = rebuildRawJSON(collections, tokens);
    expect(rebuilt.variables.ts_1.type).toBe("TYPOGRAPHY");
    expect(rebuilt.variables.ts_1.valuesByMode).toEqual(json.variables.ts_1.valuesByMode);
    expect(rebuilt.variables.ts_1.codeSyntax).toEqual({ ANDROID: "miuix_text_style_headline_large_medium" });
    expect(rebuilt.variables.ts_alias.valuesByMode).toEqual(json.variables.ts_alias.valuesByMode);

    // Rebuilt JSON must parse back to identical resolved values
    const again = load(rebuilt);
    expect(again.tokens.ts_1.resolvedValues).toEqual(tokens.ts_1.resolvedValues);
  });

  it("exports Android <style> and parent styles for aliases", () => {
    const { tokens } = load();
    expect(generateAndroidToken(tokens.ts_1, "mode_light", tokens)).toBe(
      [
        '<style name="miuix_text_style_headline_large_medium">',
        '    <item name="android:fontFamily">MiSans</item>',
        '    <item name="android:textFontWeight">500</item>',
        '    <item name="android:textSize">32sp</item>',
        '    <item name="android:lineHeight">42sp</item>',
        "</style>",
      ].join("\n")
    );
    expect(generateAndroidToken(tokens.ts_alias, "mode_light", tokens)).toBe(
      '<style name="miuix_default_text_style_title_alias_light" parent="miuix_text_style_headline_large_medium" />'
    );

    const block = generateAndroidBlock([tokens.ts_1], "mode_light", tokens);
    expect(block).toContain('\n    <style name="miuix_text_style_headline_large_medium">\n        <item name="android:fontFamily">');
    expect(block).toContain("\n    </style>\n</resources>");
  });

  it("exports a CSS font shorthand", () => {
    const { tokens } = load();
    expect(generateCSSToken(tokens.ts_1, "mode_light")).toBe(
      '--text_style-miuix_text_style_headline_large_medium: 500 32px/42px "MiSans";'
    );
  });
});

describe("typography helpers", () => {
  it("maps Figma font styles to weights", () => {
    expect(fontStyleToWeight("Regular")).toBe(400);
    expect(fontStyleToWeight("Medium")).toBe(500);
    expect(fontStyleToWeight("Demibold")).toBe(600);
    expect(fontStyleToWeight("Semi Bold")).toBe(600);
    expect(fontStyleToWeight("Bold")).toBe(700);
    expect(fontStyleToWeight("ExtraBold")).toBe(800);
    expect(fontStyleToWeight("Unknown")).toBe(400);
  });

  it("collects nested alias ids and detaches to literal fields", () => {
    expect(collectAliasIds(typographyValue)).toEqual(["ref_family", "ref_style", "ref_size"]);
    const resolved = {
      type: "TYPOGRAPHY" as const,
      value: { fontFamily: "MiSans", fontStyle: "Regular", fontSize: 16, lineHeight: 21 },
    };
    expect(toConcreteRawValue(resolved)).toEqual({
      type: "TYPOGRAPHY",
      value: {
        fontFamily: { type: "STRING", value: "MiSans" },
        fontStyle: { type: "STRING", value: "Regular" },
        fontSize: { type: "NUMBER", value: 16 },
        lineHeight: { type: "NUMBER", value: 21 },
      },
    });
    expect(formatTypographySummary(resolved.value)).toBe("MiSans Regular · 16/21");
  });
});
