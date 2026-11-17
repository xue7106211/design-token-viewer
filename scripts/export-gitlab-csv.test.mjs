// @vitest-environment node
import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import { exportGitlabCsv, formatColor, formatNumber, renderGitlabCsv, roleFromName, snapshotFromDelta } from "./export-gitlab-csv.mjs";

function collection(name, variables) {
  return { name, modes: ["Light", "Dark"], variables };
}

const snapshot = {
  format: "figma-variables@1",
  exportedAt: null,
  checksum: "unused",
  collections: [
    collection("Reference Token", [
      ["opacity/red/miuix_ref_red_opacity_level_100", "COLOR", [[0.98039216, 0.21960784, 0.18039216, 0.1], [0.98039216, 0.25882354, 0.21960784, 0.1]], [], "", {}],
      ["solid/white/kit/miuix_ref_white_solid_kit_level_1000", "COLOR", [[1, 1, 1, 1], [1, 1, 1, 1]], [], "", {}],
      ["number/space/miuix_ref_space_6", "FLOAT", [6, 6], [], "间距, 含逗号", {}],
      ["font/family/miuix_ref_font_family_misans", "STRING", ["MiSans", "MiSans"], [], "", {}],
      ["font/style/miuix_ref_font_style_regular", "STRING", ["Regular", "Regular"], [], "", {}],
      ["number/font_size/miuix_ref_font_size_32", "FLOAT", [32, 32], [], "", {}],
      ["same/a/miuix_dup", "FLOAT", [1, 2], [], "", {}],
      ["same/b/miuix_dup", "FLOAT", [3, 4], [], "", {}],
    ]),
    collection("Semantic Token", [
      ["bg/layout/miuix_sys_color_bg_layout_white_page", "COLOR", [
        ["@", "Reference Token", "solid/white/kit/miuix_ref_white_solid_kit_level_1000"],
        ["@", "Reference Token", "missing/miuix_ref_missing"],
      ], [], "白底", {}],
      ["calendar/miuix_sys_calendar_color_fill_holiday_enabled", "COLOR", [
        [0.2, 0.4, 1, 0.08],
        ["@", "Reference Token", "opacity/red/miuix_ref_red_opacity_level_100"],
      ], [], "", {}],
    ]),
  ],
  textStyles: [
    ["sp/miuix_text_style_body_large_regular_sp", "正文", [
      ["fontFamily", ["@", "Reference Token", "font/family/miuix_ref_font_family_misans"]],
      ["fontStyle", ["@", "Reference Token", "font/style/miuix_ref_font_style_regular"]],
      ["fontSize", ["@", "Reference Token", "number/font_size/miuix_ref_font_size_32"]],
      ["lineHeight", ["@", "Reference Token", "number/line_height/miuix_ref_line_height_missing"]],
    ]],
    ["dp/clock/miuix_text_style_clock_digital_time_40_medium_dp", "", [
      ["fontFamily", "MiSans"],
      ["fontStyle", "Medium"],
      ["fontSize", 40],
      ["lineHeight", "AUTO"],
      ["letterSpacing", 2],
    ]],
  ],
};

describe("GitLab CSV", () => {
  it("按已交付 CSV 的列规则输出颜色、别名、重名和 Text Style", () => {
    const broken = structuredClone(snapshot);
    broken.collections[1].variables[0][2][1] = ["@", "Reference Token", "solid/white/kit/miuix_ref_white_solid_kit_level_1000"];
    const result = exportGitlabCsv(broken);
    expect(result.ok).toBe(true);
    expect(result.report.rows).toBe(12);
    expect(result.report.variableCount).toBe(10);
    expect(result.report.textStyleCount).toBe(2);

    const red = result.rows.find((row) => row.name === "miuix_ref_red_opacity_level_100");
    expect(red).toMatchObject({
      type: "color",
      layer: "Reference",
      role: "opacity",
      group: "opacity/red",
      Light: "#1AFA382E",
      Dark: "#1AFA4238",
      valueKind: "raw",
      lineHeight: "",
    });

    const page = result.rows.find((row) => row.name === "miuix_sys_color_bg_layout_white_page");
    expect(page).toMatchObject({
      role: "bg",
      group: "bg/layout",
      layer: "Semantic",
      Light: "miuix_ref_white_solid_kit_level_1000",
      Dark: "miuix_ref_white_solid_kit_level_1000",
      valueKind: "alias",
      description: "白底",
    });

    const mixed = result.rows.find((row) => row.name === "miuix_sys_calendar_color_fill_holiday_enabled");
    expect(mixed.valueKind).toBe("mixed");
    expect(mixed.Light.startsWith("#")).toBe(true);
    expect(mixed.Dark).toBe("miuix_ref_red_opacity_level_100");
    expect(mixed.role).toBe("fill");

    const space = result.rows.find((row) => row.name === "miuix_ref_space_6");
    expect(space).toMatchObject({ type: "number", role: "", Light: "6", Dark: "6", valueKind: "raw" });

    const style = result.rows.find((row) => row.name === "miuix_text_style_body_large_regular_sp");
    expect(style).toMatchObject({
      type: "typography",
      layer: "TextStyle",
      role: "text",
      group: "sp",
      valueKind: "style",
      fontFamily: "MiSans",
      fontStyle: "Regular",
      fontSize: "32",
      lineHeight: "Auto",
      letterSpacing: "0%",
      boundVariables: "fontFamily=miuix_ref_font_family_misans; fontStyle=miuix_ref_font_style_regular; fontSize=miuix_ref_font_size_32",
      unit: "sp",
    });
    expect(style.boundVariables).not.toContain("lineHeight");

    const clock = result.rows.find((row) => row.name === "miuix_text_style_clock_digital_time_40_medium_dp");
    expect(clock).toMatchObject({
      group: "dp/clock",
      fontFamily: "MiSans",
      fontSize: "40",
      lineHeight: "Auto",
      letterSpacing: "5%",
      boundVariables: "",
      unit: "dp",
    });

    expect(result.report.duplicates).toEqual([{ name: "miuix_dup", groups: ["same/a", "same/b"] }]);
    const csv = renderGitlabCsv(result.rows);
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv.includes("\r\n")).toBe(true);
    expect(csv.includes("\n") && !csv.includes("\r\n")).toBe(false);
    expect(result.csv).toContain('"间距, 含逗号"');
    expect(result.rows.every((row) => row.layer !== "TextStyle" || row.lineHeight === "Auto")).toBe(true);
  });

  it("未解析别名使导出失败", () => {
    const result = exportGitlabCsv(snapshot);
    expect(result.ok).toBe(false);
    expect(result.errors.some((error) => error.includes("miuix_ref_missing"))).toBe(true);
  });

  it("当前基线的颜色、别名和 Text Style 行与已交付格式一致", () => {
    const baseline = JSON.parse(readFileSync(path.join(process.cwd(), "figma-token", "figma-variables.json"), "utf8"));
    const result = exportGitlabCsv(baseline);
    expect(result.ok).toBe(true);
    expect(result.report.rows).toBe(result.report.variableCount + result.report.textStyleCount);
    expect(result.rows.filter((row) => row.layer === "TextStyle").every((row) => row.lineHeight === "Auto")).toBe(true);

    const red = result.rows.find((row) => row.name === "miuix_ref_red_opacity_level_100");
    expect(red.Light).toBe("#1AFA382E");
    const page = result.rows.find((row) => row.name === "miuix_sys_color_bg_layout_white_page");
    expect(page.Light).toBe("miuix_ref_white_solid_kit_level_1000");
    expect(page.Dark).toBe("miuix_ref_black_solid_kit_level_1000");
    const headline = result.rows.find((row) => row.name === "miuix_text_style_headline_large_regular_sp");
    expect(headline).toMatchObject({
      lineHeight: "Auto",
      letterSpacing: "0%",
      fontFamily: "MiSans",
      fontSize: "32",
      unit: "sp",
      boundVariables: "fontFamily=miuix_ref_font_family_misans; fontStyle=miuix_ref_font_style_regular; fontSize=miuix_ref_font_size_32",
    });
    expect(headline.boundVariables).not.toContain("lineHeight");
  });

  it("校验和相同的增量包不改写快照", () => {
    const baseline = JSON.parse(readFileSync(path.join(process.cwd(), "figma-token", "figma-variables.json"), "utf8"));
    expect(snapshotFromDelta(baseline, [{ part: 0, checksum: baseline.checksum }])).toBe(baseline);
  });

  it("角色取名字中最早的关键词", () => {
    expect(roleFromName("miuix_sys_color_stroke_divider")).toBe("stroke");
    expect(roleFromName("miuix_ref_font_size_32")).toBe("fontSize");
    expect(roleFromName("miuix_ref_space_6")).toBe("");
    expect(formatColor([0, 0, 0, 1])).toBe("#000000");
    expect(formatColor([0, 0, 0, 0.1])).toBe("#1A000000");
    expect(formatColor([0, 0, 0, 0.7])).toBe("#B2000000");
    expect(formatColor([0, 0, 0, 0.9])).toBe("#E5000000");
    expect(formatNumber(0.7)).toBe("0.699999988079071");
    expect(formatNumber(32)).toBe("32");
  });
});
