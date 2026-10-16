import { describe, it, expect } from "vitest";
import { generateAndroidExportBlock, generateAndroidToken, generateAndroidBlock } from "@/lib/code-generators/android";
import type { DesignToken, TokenType } from "@/types/token";

/** Helper: create a DesignToken with sensible defaults, overridable via partial */
function makeToken(overrides: Partial<DesignToken> & { id: string; name: string }): DesignToken {
  return {
    path: overrides.name.split("/"),
    type: "COLOR" as TokenType,
    collection: "Test",
    group: overrides.name.split("/").slice(0, -1).join("/"),
    rawValues: {},
    resolvedValues: {},
    isAlias: false,
    referencedBy: [],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// 1. Alias tokens output Android resource references with miuix naming
// ---------------------------------------------------------------------------
describe("generateAndroidToken — alias references (miuix naming)", () => {
  it("alias COLOR token outputs @color/ with miuix_default_color_ prefix and mode suffix", () => {
    const target = makeToken({
      id: "target-color",
      name: "blue/color-blue-level1",
      type: "COLOR",
      resolvedValues: { mode_light: { type: "COLOR", value: { r: 0, g: 0, b: 1, a: 1 } } },
      rawValues: { mode_light: { type: "COLOR", value: { r: 0, g: 0, b: 1, a: 1 } } },
    });
    const alias = makeToken({
      id: "alias-color",
      name: "文字图标色/on_surface",
      type: "COLOR",
      isAlias: true,
      aliasOf: "target-color",
      rawValues: { mode_light: { type: "ALIAS", id: "target-color" } },
      resolvedValues: { mode_light: { type: "COLOR", value: { r: 0, g: 0, b: 1, a: 1 } } },
    });
    const tokens = { "target-color": target, "alias-color": alias };

    const result = generateAndroidToken(alias, "mode_light", tokens);
    // alias name: miuix_default_color_on_surface_light
    // ref name: miuix_color_color_blue_level1 (primitive, no mode suffix)
    expect(result).toBe('<color name="miuix_default_color_on_surface_light">@color/miuix_color_color_blue_level1</color>');
  });

  it("alias NUMBER token outputs @dimen/ with miuix naming", () => {
    const target = makeToken({
      id: "target-num",
      name: "spacing/base",
      type: "NUMBER",
      resolvedValues: { mode_light: { type: "NUMBER", value: 16 } },
      rawValues: { mode_light: { type: "NUMBER", value: 16 } },
    });
    const alias = makeToken({
      id: "alias-num",
      name: "间距/default",
      type: "NUMBER",
      isAlias: true,
      aliasOf: "target-num",
      rawValues: { mode_light: { type: "ALIAS", id: "target-num" } },
      resolvedValues: { mode_light: { type: "NUMBER", value: 16 } },
    });
    const tokens = { "target-num": target, "alias-num": alias };

    const result = generateAndroidToken(alias, "mode_light", tokens);
    expect(result).toBe('<dimen name="miuix_default_dimen_default_light">@dimen/miuix_dimen_base</dimen>');
  });

  it("alias STRING token outputs @string/ with miuix naming", () => {
    const target = makeToken({
      id: "target-str",
      name: "text/greeting",
      type: "STRING",
      resolvedValues: { mode_light: { type: "STRING", value: "Hello" } },
      rawValues: { mode_light: { type: "STRING", value: "Hello" } },
    });
    const alias = makeToken({
      id: "alias-str",
      name: "文本/welcome",
      type: "STRING",
      isAlias: true,
      aliasOf: "target-str",
      rawValues: { mode_light: { type: "ALIAS", id: "target-str" } },
      resolvedValues: { mode_light: { type: "STRING", value: "Hello" } },
    });
    const tokens = { "target-str": target, "alias-str": alias };

    const result = generateAndroidToken(alias, "mode_light", tokens);
    expect(result).toBe('<string name="miuix_default_string_welcome_light">@string/miuix_string_greeting</string>');
  });

  it("alias BOOLEAN token outputs @bool/ with miuix naming", () => {
    const target = makeToken({
      id: "target-bool",
      name: "feature/dark-mode",
      type: "BOOLEAN",
      resolvedValues: { mode_dark: { type: "BOOLEAN", value: true } },
      rawValues: { mode_dark: { type: "BOOLEAN", value: true } },
    });
    const alias = makeToken({
      id: "alias-bool",
      name: "开关/theme-dark",
      type: "BOOLEAN",
      isAlias: true,
      aliasOf: "target-bool",
      rawValues: { mode_dark: { type: "ALIAS", id: "target-bool" } },
      resolvedValues: { mode_dark: { type: "BOOLEAN", value: true } },
    });
    const tokens = { "target-bool": target, "alias-bool": alias };

    const result = generateAndroidToken(alias, "mode_dark", tokens);
    expect(result).toBe('<bool name="miuix_default_bool_theme_dark_dark">@bool/miuix_bool_dark_mode</bool>');
  });
});

// ---------------------------------------------------------------------------
// 2. Non-alias (primitive) token outputs concrete value with miuix_ prefix
// ---------------------------------------------------------------------------
describe("generateAndroidToken — non-alias tokens", () => {
  it("non-alias token outputs concrete value with miuix primitive name", () => {
    const token = makeToken({
      id: "t1",
      name: "blue/color-blue-500",
      type: "COLOR",
      rawValues: { mode_light: { type: "COLOR", value: { r: 0, g: 0, b: 1, a: 1 } } },
      resolvedValues: { mode_light: { type: "COLOR", value: { r: 0, g: 0, b: 1, a: 1 } } },
    });
    const tokens = { t1: token };

    const result = generateAndroidToken(token, "mode_light", tokens);
    expect(result).toBe('<color name="miuix_color_color_blue_500">#0000FF</color>');
  });
});

// ---------------------------------------------------------------------------
// 3. Fallback scenarios
// ---------------------------------------------------------------------------
describe("generateAndroidToken — fallback behavior", () => {
  it("when referenced target doesn't exist, falls back to resolved value", () => {
    const alias = makeToken({
      id: "alias-missing",
      name: "文字图标色/primary",
      type: "COLOR",
      isAlias: true,
      aliasOf: "nonexistent",
      rawValues: { mode_light: { type: "ALIAS", id: "nonexistent" } },
      resolvedValues: { mode_light: { type: "COLOR", value: { r: 1, g: 0, b: 0, a: 1 } } },
    });
    const tokens = { "alias-missing": alias };

    const result = generateAndroidToken(alias, "mode_light", tokens);
    // Falls back to resolved value, but name still uses miuix_default_ pattern
    expect(result).toBe('<color name="miuix_default_color_primary_light">#FF0000</color>');
  });

  it("when tokens parameter is not provided, falls back to resolved value", () => {
    const alias = makeToken({
      id: "alias-no-dict",
      name: "文字图标色/primary",
      type: "COLOR",
      isAlias: true,
      aliasOf: "some-target",
      rawValues: { mode_light: { type: "ALIAS", id: "some-target" } },
      resolvedValues: { mode_light: { type: "COLOR", value: { r: 0, g: 1, b: 0, a: 1 } } },
    });

    const result = generateAndroidToken(alias, "mode_light");
    expect(result).toBe('<color name="miuix_default_color_primary_light">#00FF00</color>');
  });
});

// ---------------------------------------------------------------------------
// 4. codeSyntax.ANDROID takes priority
// ---------------------------------------------------------------------------
describe("generateAndroidToken — codeSyntax.ANDROID priority", () => {
  it("token with codeSyntax.ANDROID uses it directly (no miuix prefix generation)", () => {
    const token = makeToken({
      id: "t-cs",
      name: "元素色/container_notice_bar",
      type: "COLOR",
      codeSyntax: { ANDROID: "miuix_default_color_container_notice_bar" },
      rawValues: { mode_light: { type: "COLOR", value: { r: 1, g: 0, b: 0, a: 1 } } },
      resolvedValues: { mode_light: { type: "COLOR", value: { r: 1, g: 0, b: 0, a: 1 } } },
    });

    const result = generateAndroidToken(token, "mode_light");
    expect(result).toBe('<color name="miuix_default_color_container_notice_bar">#FF0000</color>');
  });

  it("referenced target with codeSyntax.ANDROID uses it directly for ref name", () => {
    const target = makeToken({
      id: "target-cs",
      name: "blue/level1",
      type: "COLOR",
      codeSyntax: { ANDROID: "miuix_color_blue_light_level1" },
      resolvedValues: { mode_light: { type: "COLOR", value: { r: 0, g: 0, b: 1, a: 1 } } },
      rawValues: { mode_light: { type: "COLOR", value: { r: 0, g: 0, b: 1, a: 1 } } },
    });
    const alias = makeToken({
      id: "alias-cs",
      name: "文字图标色/on_surface",
      type: "COLOR",
      isAlias: true,
      aliasOf: "target-cs",
      rawValues: { mode_light: { type: "ALIAS", id: "target-cs" } },
      resolvedValues: { mode_light: { type: "COLOR", value: { r: 0, g: 0, b: 1, a: 1 } } },
    });
    const tokens = { "target-cs": target, "alias-cs": alias };

    const result = generateAndroidToken(alias, "mode_light", tokens);
    expect(result).toBe('<color name="miuix_default_color_on_surface_light">@color/miuix_color_blue_light_level1</color>');
  });
});

// ---------------------------------------------------------------------------
// 5. Mode suffix behavior
// ---------------------------------------------------------------------------
describe("generateAndroidToken — mode suffix", () => {
  it("mode_light adds _light suffix", () => {
    const target = makeToken({
      id: "t-target",
      name: "black/color-black-level1",
      type: "COLOR",
      resolvedValues: { mode_light: { type: "COLOR", value: { r: 0, g: 0, b: 0, a: 1 } } },
      rawValues: { mode_light: { type: "COLOR", value: { r: 0, g: 0, b: 0, a: 1 } } },
    });
    const alias = makeToken({
      id: "t-alias",
      name: "文字图标色/on_surface",
      type: "COLOR",
      isAlias: true,
      aliasOf: "t-target",
      rawValues: { mode_light: { type: "ALIAS", id: "t-target" } },
      resolvedValues: { mode_light: { type: "COLOR", value: { r: 0, g: 0, b: 0, a: 1 } } },
    });
    const tokens = { "t-target": target, "t-alias": alias };

    const result = generateAndroidToken(alias, "mode_light", tokens);
    expect(result).toBe('<color name="miuix_default_color_on_surface_light">@color/miuix_color_color_black_level1</color>');
  });

  it("mode_dark adds _dark suffix", () => {
    const alias = makeToken({
      id: "t-alias-dark",
      name: "文字图标色/on_surface",
      type: "COLOR",
      isAlias: false,
      rawValues: { mode_dark: { type: "COLOR", value: { r: 1, g: 1, b: 1, a: 0.95 } } },
      resolvedValues: { mode_dark: { type: "COLOR", value: { r: 1, g: 1, b: 1, a: 0.95 } } },
    });

    const result = generateAndroidToken(alias, "mode_dark");
    // non-alias → miuix_ primitive name (no mode suffix)
    expect(result).toBe('<color name="miuix_color_on_surface">#F2FFFFFF</color>');
  });

  it("non-standard modeId does not add suffix", () => {
    const alias = makeToken({
      id: "t-custom-mode",
      name: "文字图标色/primary",
      type: "COLOR",
      isAlias: true,
      rawValues: { custom123: { type: "ALIAS", id: "some-target" } },
      resolvedValues: { custom123: { type: "COLOR", value: { r: 1, g: 0, b: 0, a: 1 } } },
    });

    const result = generateAndroidToken(alias, "custom123");
    // No mode suffix since modeId doesn't match mode_* pattern
    expect(result).toBe('<color name="miuix_default_color_primary">#FF0000</color>');
  });
});

// ---------------------------------------------------------------------------
// 6. Multi-level alias chain: A → B → C, A only references B
// ---------------------------------------------------------------------------
describe("generateAndroidToken — multi-level alias chain", () => {
  it("A → B → C: A only references B (direct target), not C", () => {
    const tokenC = makeToken({
      id: "token-c",
      name: "raw/blue-base",
      type: "COLOR",
      rawValues: { mode_light: { type: "COLOR", value: { r: 0, g: 0, b: 1, a: 1 } } },
      resolvedValues: { mode_light: { type: "COLOR", value: { r: 0, g: 0, b: 1, a: 1 } } },
    });
    const tokenB = makeToken({
      id: "token-b",
      name: "semantic/blue",
      type: "COLOR",
      isAlias: true,
      aliasOf: "token-c",
      rawValues: { mode_light: { type: "ALIAS", id: "token-c" } },
      resolvedValues: { mode_light: { type: "COLOR", value: { r: 0, g: 0, b: 1, a: 1 } } },
    });
    const tokenA = makeToken({
      id: "token-a",
      name: "主题色/primary",
      type: "COLOR",
      isAlias: true,
      aliasOf: "token-b",
      rawValues: { mode_light: { type: "ALIAS", id: "token-b" } },
      resolvedValues: { mode_light: { type: "COLOR", value: { r: 0, g: 0, b: 1, a: 1 } } },
    });
    const tokens = { "token-a": tokenA, "token-b": tokenB, "token-c": tokenC };

    const resultA = generateAndroidToken(tokenA, "mode_light", tokens);
    // A references B (B is also alias, but getReferenceName treats it as primitive since it checks codeSyntax/name)
    // B.isAlias = true, but getReferenceName uses getMiuixPrimitiveName regardless
    expect(resultA).toBe('<color name="miuix_default_color_primary_light">@color/miuix_color_blue</color>');

    const resultB = generateAndroidToken(tokenB, "mode_light", tokens);
    // B references C
    expect(resultB).toBe('<color name="miuix_default_color_blue_light">@color/miuix_color_blue_base</color>');
  });
});

// ---------------------------------------------------------------------------
// 7. generateAndroidBlock
// ---------------------------------------------------------------------------
describe("generateAndroidBlock", () => {
  it("generates full XML block with alias references", () => {
    const target = makeToken({
      id: "target-blk",
      name: "blue/color-blue",
      type: "COLOR",
      rawValues: { mode_light: { type: "COLOR", value: { r: 0, g: 0, b: 1, a: 1 } } },
      resolvedValues: { mode_light: { type: "COLOR", value: { r: 0, g: 0, b: 1, a: 1 } } },
    });
    const alias = makeToken({
      id: "alias-blk",
      name: "文字图标色/primary",
      type: "COLOR",
      isAlias: true,
      aliasOf: "target-blk",
      rawValues: { mode_light: { type: "ALIAS", id: "target-blk" } },
      resolvedValues: { mode_light: { type: "COLOR", value: { r: 0, g: 0, b: 1, a: 1 } } },
    });
    const tokens = { "target-blk": target, "alias-blk": alias };

    const result = generateAndroidBlock([target, alias], "mode_light", tokens);
    expect(result).toContain('<?xml version="1.0" encoding="utf-8"?>');
    expect(result).toContain("<resources>");
    expect(result).toContain('<color name="miuix_color_color_blue">#0000FF</color>');
    expect(result).toContain('<color name="miuix_default_color_primary_light">@color/miuix_color_color_blue</color>');
  });
});

// ---------------------------------------------------------------------------
// 8. Real-world HyperOS case
// ---------------------------------------------------------------------------
describe("generateAndroidToken — HyperOS real-world case", () => {
  it("文字图标色/on_surface → black/color-black-level1 produces correct output", () => {
    const blackLevel1 = makeToken({
      id: "var_163",
      name: "black/color-black-level1",
      type: "COLOR",
      rawValues: { mode_light: { type: "COLOR", value: { r: 0, g: 0, b: 0, a: 1 } } },
      resolvedValues: { mode_light: { type: "COLOR", value: { r: 0, g: 0, b: 0, a: 1 } } },
    });
    const onSurface = makeToken({
      id: "var_31",
      name: "文字图标色/on_surface",
      type: "COLOR",
      isAlias: true,
      aliasOf: "var_163",
      rawValues: {
        mode_light: { type: "ALIAS", id: "var_163" },
        mode_dark: { type: "COLOR", value: { r: 1, g: 1, b: 1, a: 0.949 } },
      },
      resolvedValues: {
        mode_light: { type: "COLOR", value: { r: 0, g: 0, b: 0, a: 1 } },
        mode_dark: { type: "COLOR", value: { r: 1, g: 1, b: 1, a: 0.949 } },
      },
    });
    const tokens = { var_163: blackLevel1, var_31: onSurface };

    // Light mode: alias → reference
    const lightResult = generateAndroidToken(onSurface, "mode_light", tokens);
    expect(lightResult).toBe(
      '<color name="miuix_default_color_on_surface_light">@color/miuix_color_color_black_level1</color>'
    );

    // Dark mode: concrete value (not alias in dark mode)
    const darkResult = generateAndroidToken(onSurface, "mode_dark", tokens);
    expect(darkResult).toBe(
      '<color name="miuix_default_color_on_surface_dark">#F2FFFFFF</color>'
    );
  });
});

// ---------------------------------------------------------------------------
// 9. Leaf already is a HyperOS Android resource name (miuix_…)
// ---------------------------------------------------------------------------
describe("generateAndroidToken — explicit miuix resource names", () => {
  const whiteSolid = makeToken({
    id: "var_497",
    name: "solid/white/miuix_white_solid_level_1000",
    type: "COLOR",
    rawValues: {
      mode_light: { type: "COLOR", value: { r: 1, g: 1, b: 1, a: 1 } },
      mode_dark: { type: "COLOR", value: { r: 1, g: 1, b: 1, a: 1 } },
    },
    resolvedValues: {
      mode_light: { type: "COLOR", value: { r: 1, g: 1, b: 1, a: 1 } },
      mode_dark: { type: "COLOR", value: { r: 1, g: 1, b: 1, a: 1 } },
    },
  });
  const blackSolid = makeToken({
    id: "var_500",
    name: "solid/black/miuix_black_solid_level_300",
    type: "COLOR",
    rawValues: {
      mode_light: { type: "COLOR", value: { r: 0.95, g: 0.95, b: 0.95, a: 1 } },
    },
    resolvedValues: {
      mode_light: { type: "COLOR", value: { r: 0.95, g: 0.95, b: 0.95, a: 1 } },
    },
  });
  const whitePage = makeToken({
    id: "var_610",
    name: "bg/layout/miuix_color_bg_layout_white_page",
    type: "COLOR",
    isAlias: true,
    aliasOf: "var_497",
    rawValues: { mode_light: { type: "ALIAS", id: "var_497" } },
    resolvedValues: { mode_light: { type: "COLOR", value: { r: 1, g: 1, b: 1, a: 1 } } },
  });
  const greyPage = makeToken({
    id: "var_611",
    name: "bg/layout/miuix_color_bg_layout_grey_page",
    type: "COLOR",
    isAlias: true,
    aliasOf: "var_500",
    rawValues: { mode_light: { type: "ALIAS", id: "var_500" } },
    resolvedValues: { mode_light: { type: "COLOR", value: { r: 0.95, g: 0.95, b: 0.95, a: 1 } } },
  });
  const tokens = {
    var_497: whiteSolid,
    var_500: blackSolid,
    var_610: whitePage,
    var_611: greyPage,
  };

  it("drops miuix_default_color_ on the resource name and the extra miuix_color_ on the alias", () => {
    expect(generateAndroidToken(whitePage, "mode_light", tokens)).toBe(
      '<color name="miuix_color_bg_layout_white_page_light">@color/miuix_white_solid_level_1000</color>'
    );
    expect(generateAndroidToken(greyPage, "mode_light", tokens)).toBe(
      '<color name="miuix_color_bg_layout_grey_page_light">@color/miuix_black_solid_level_300</color>'
    );
  });

  it("exports the referenced primitive under its own Android name", () => {
    expect(generateAndroidToken(whiteSolid, "mode_light", tokens)).toBe(
      '<color name="miuix_white_solid_level_1000">#FFFFFF</color>'
    );
  });

  it("applies the same rule to non-color tokens whose leaf already starts with miuix_", () => {
    const space = makeToken({
      id: "space-8",
      name: "number/space/miuix_space_8",
      type: "NUMBER",
      rawValues: { mode_light: { type: "NUMBER", value: 8 } },
      resolvedValues: { mode_light: { type: "NUMBER", value: 8 } },
    });
    const gap = makeToken({
      id: "gap-default",
      name: "gap/miuix_space_gap_default",
      type: "NUMBER",
      isAlias: true,
      aliasOf: "space-8",
      rawValues: { mode_light: { type: "ALIAS", id: "space-8" } },
      resolvedValues: { mode_light: { type: "NUMBER", value: 8 } },
    });

    expect(generateAndroidToken(gap, "mode_light", { "space-8": space, "gap-default": gap })).toBe(
      '<dimen name="miuix_space_gap_default_light">@dimen/miuix_space_8</dimen>'
    );
  });

  it("strips a Chinese group prefix before deciding the leaf is already a miuix resource name", () => {
    const prefixed = makeToken({
      ...whitePage,
      name: "bg/layout/文字_miuix_color_bg_layout_white_page",
    });
    expect(generateAndroidToken(prefixed, "mode_light", { ...tokens, var_610: prefixed })).toBe(
      '<color name="miuix_color_bg_layout_white_page_light">@color/miuix_white_solid_level_1000</color>'
    );
  });

  it("strips a Chinese prefix from codeSyntax.ANDROID and does not add another miuix prefix", () => {
    const target = makeToken({
      ...whiteSolid,
      codeSyntax: { ANDROID: "颜色_miuix_white_solid_level_1000" },
    });
    const alias = makeToken({
      ...whitePage,
      codeSyntax: { ANDROID: "文字_miuix_color_bg_layout_white_page_light" },
    });
    const result = generateAndroidToken(alias, "mode_light", { var_497: target, var_610: alias });
    expect(result).toBe(
      '<color name="miuix_color_bg_layout_white_page_light">@color/miuix_white_solid_level_1000</color>'
    );
  });
});

describe("generateAndroidExportBlock — light and dark in one file", () => {
  const blue = makeToken({
    id: "blue",
    name: "solid/blue/miuix_ref_blue_solid_level_1900",
    type: "COLOR",
    rawValues: {
      mode_light: { type: "COLOR", value: { r: 0, g: 0, b: 1, a: 1 } },
      mode_dark: { type: "COLOR", value: { r: 0, g: 0, b: 0.5, a: 1 } },
    },
    resolvedValues: {
      mode_light: { type: "COLOR", value: { r: 0, g: 0, b: 1, a: 1 } },
      mode_dark: { type: "COLOR", value: { r: 0, g: 0, b: 0.5, a: 1 } },
    },
  });
  const onSurface = makeToken({
    id: "on-surface",
    name: "text/miuix_color_on_surface",
    type: "COLOR",
    isAlias: true,
    aliasOf: "blue",
    rawValues: {
      mode_light: { type: "ALIAS", id: "blue" },
      mode_dark: { type: "ALIAS", id: "blue" },
    },
    resolvedValues: {
      mode_light: { type: "COLOR", value: { r: 0, g: 0, b: 1, a: 1 } },
      mode_dark: { type: "COLOR", value: { r: 0, g: 0, b: 0.5, a: 1 } },
    },
  });
  const space = makeToken({
    id: "space-8",
    name: "number/space/miuix_space_8",
    type: "NUMBER",
    rawValues: {
      mode_light: { type: "NUMBER", value: 8 },
      mode_dark: { type: "NUMBER", value: 8 },
    },
    resolvedValues: {
      mode_light: { type: "NUMBER", value: 8 },
      mode_dark: { type: "NUMBER", value: 8 },
    },
  });
  const gap = makeToken({
    id: "gap",
    name: "gap/miuix_space_gap_default",
    type: "NUMBER",
    isAlias: true,
    aliasOf: "space-8",
    rawValues: {
      mode_light: { type: "ALIAS", id: "space-8" },
      mode_dark: { type: "ALIAS", id: "space-8" },
    },
    resolvedValues: {
      mode_light: { type: "NUMBER", value: 8 },
      mode_dark: { type: "NUMBER", value: 8 },
    },
  });
  const font = makeToken({
    id: "font",
    name: "font/family/miuix_ref_font_family_misans",
    type: "STRING",
    rawValues: {
      mode_light: { type: "STRING", value: "MiSans" },
      mode_dark: { type: "STRING", value: "MiSans" },
    },
    resolvedValues: {
      mode_light: { type: "STRING", value: "MiSans" },
      mode_dark: { type: "STRING", value: "MiSans" },
    },
  });
  const textStyle = makeToken({
    id: "text-style",
    name: "text_style/miuix_text_style_body_large_regular",
    type: "TYPOGRAPHY",
    codeSyntax: { ANDROID: "miuix_text_style_body_large_regular" },
    rawValues: {
      mode_light: {
        type: "TYPOGRAPHY",
        value: {
          fontFamily: { type: "STRING", value: "MiSans" },
          fontStyle: { type: "STRING", value: "Regular" },
          fontSize: { type: "NUMBER", value: 16 },
          lineHeight: { type: "NUMBER", value: 22 },
        },
      },
      mode_dark: {
        type: "TYPOGRAPHY",
        value: {
          fontFamily: { type: "STRING", value: "MiSans" },
          fontStyle: { type: "STRING", value: "Regular" },
          fontSize: { type: "NUMBER", value: 16 },
          lineHeight: { type: "NUMBER", value: 22 },
        },
      },
    },
    resolvedValues: {
      mode_light: {
        type: "TYPOGRAPHY",
        value: { fontFamily: "MiSans", fontStyle: "Regular", fontSize: 16, lineHeight: 22 },
      },
      mode_dark: {
        type: "TYPOGRAPHY",
        value: { fontFamily: "MiSans", fontStyle: "Regular", fontSize: 16, lineHeight: 22 },
      },
    },
  });
  const tokens = { blue, "on-surface": onSurface, "space-8": space, gap, font, "text-style": textStyle };

  it("groups light colors before dark colors, including second-level aliases", () => {
    const result = generateAndroidExportBlock([blue, onSurface, space], tokens);
    const lightPrimitive = result.indexOf('<color name="miuix_ref_blue_solid_level_1900_light">#0000FF</color>');
    const lightAlias = result.indexOf(
      '<color name="miuix_color_on_surface_light">@color/miuix_ref_blue_solid_level_1900_light</color>'
    );
    const darkPrimitive = result.indexOf('<color name="miuix_ref_blue_solid_level_1900_dark">#000080</color>');
    const darkAlias = result.indexOf(
      '<color name="miuix_color_on_surface_dark">@color/miuix_ref_blue_solid_level_1900_dark</color>'
    );
    const dimen = result.indexOf('<dimen name="miuix_space_8">8dp</dimen>');

    expect(result.indexOf("<!-- light -->")).toBeLessThan(lightPrimitive);
    expect(lightPrimitive).toBeLessThan(lightAlias);
    expect(lightAlias).toBeLessThan(result.indexOf("<!-- dark -->"));
    expect(result.indexOf("<!-- dark -->")).toBeLessThan(darkPrimitive);
    expect(darkPrimitive).toBeLessThan(darkAlias);
    expect(darkAlias).toBeLessThan(dimen);
    expect(result).not.toContain('name="miuix_ref_blue_solid_level_1900"');
  });

  it("emits dimen and string resources once, without a mode suffix", () => {
    const result = generateAndroidExportBlock([space, gap, font], tokens);

    expect(result.match(/<dimen name="miuix_space_8">/g)).toHaveLength(1);
    expect(result).toContain('<dimen name="miuix_space_8">8dp</dimen>');
    expect(result).toContain('<dimen name="miuix_space_gap_default">@dimen/miuix_space_8</dimen>');
    expect(result).not.toContain("miuix_space_gap_default_light");
    expect(result).not.toContain("miuix_space_gap_default_dark");
    expect(result).not.toContain("<!-- light -->");
    expect(result.match(/<string name="miuix_ref_font_family_misans">/g)).toHaveLength(1);
    expect(result).toContain('<string name="miuix_ref_font_family_misans">MiSans</string>');
  });

  it("emits a codeSyntax text style once", () => {
    const result = generateAndroidExportBlock([textStyle], tokens);
    expect(result.match(/<style name="miuix_text_style_body_large_regular">/g)).toHaveLength(1);
    expect(result).not.toContain("miuix_text_style_body_large_regular_light");
  });

  it("leaves single-mode preview names unsuffixed for first-level colors", () => {
    expect(generateAndroidToken(blue, "mode_light", tokens)).toBe(
      '<color name="miuix_ref_blue_solid_level_1900">#0000FF</color>'
    );
  });
});
