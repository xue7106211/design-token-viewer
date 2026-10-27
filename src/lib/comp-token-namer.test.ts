import { describe, it, expect } from "vitest";
import {
  buildCompTokenName,
  buildCompTokenPath,
  formatCompTokenDisplay,
  validateCompTokenName,
  loadCompTokenHistory,
  pushCompTokenHistory,
  type CompTokenNameParts,
} from "./comp-token-namer";

const validExample: CompTokenNameParts = {
  component: "menu",
  part: "secondary_tab",
  type: "color",
  role: "fill",
  state: "selected",
};

describe("buildCompTokenName", () => {
  it("正例：拼接 miuix_comp_menu_secondary_tab_color_fill_selected", () => {
    expect(buildCompTokenName(validExample)).toBe(
      "miuix_comp_menu_secondary_tab_color_fill_selected"
    );
  });

  it("无部件时跳过该段", () => {
    expect(
      buildCompTokenName({
        component: "button",
        type: "color",
        role: "bg",
        state: "enabled",
      })
    ).toBe("miuix_comp_button_color_bg_enabled");
  });

  it("正例：含变体 miuix_comp_button_color_fill_primary_enabled", () => {
    expect(
      buildCompTokenName({
        component: "button",
        type: "color",
        role: "fill",
        variant: "primary",
        state: "enabled",
      })
    ).toBe("miuix_comp_button_color_fill_primary_enabled");
  });

  it("变体留空时与无变体结果一致", () => {
    const withoutVariant = buildCompTokenName({
      component: "button",
      type: "color",
      role: "fill",
      state: "enabled",
    });
    const withEmptyVariant = buildCompTokenName({
      component: "button",
      type: "color",
      role: "fill",
      variant: "",
      state: "enabled",
    });
    expect(withoutVariant).toBe("miuix_comp_button_color_fill_enabled");
    expect(withEmptyVariant).toBe(withoutVariant);
  });

  it("radius 可配任意角色", () => {
    expect(
      buildCompTokenName({
        component: "card",
        type: "radius",
        role: "stroke",
        state: "hovered",
      })
    ).toBe("miuix_comp_card_radius_stroke_hovered");
  });
});

describe("buildCompTokenPath / formatCompTokenDisplay", () => {
  it("分组路径为 {组件}/miuix_comp_…", () => {
    expect(buildCompTokenPath(validExample)).toBe(
      "menu/miuix_comp_menu_secondary_tab_color_fill_selected"
    );
  });

  it("开关控制是否带分组前缀", () => {
    expect(formatCompTokenDisplay(validExample, false)).toBe(
      "miuix_comp_menu_secondary_tab_color_fill_selected"
    );
    expect(formatCompTokenDisplay(validExample, true)).toBe(
      "menu/miuix_comp_menu_secondary_tab_color_fill_selected"
    );
  });
});

describe("validateCompTokenName", () => {
  it("正例通过，无提示", () => {
    expect(validateCompTokenName(validExample)).toEqual([]);
  });

  it("正例含变体 primary 通过，无提示", () => {
    expect(
      validateCompTokenName({
        component: "button",
        type: "color",
        role: "fill",
        variant: "primary",
        state: "enabled",
      })
    ).toEqual([]);
  });

  it("变体含颜色词 white → variant_contains_color_or_state", () => {
    const issues = validateCompTokenName({
      component: "button",
      type: "color",
      role: "fill",
      variant: "white",
      state: "enabled",
    });
    expect(issues.map((i) => i.code)).toContain("variant_contains_color_or_state");
    expect(
      issues.find((i) => i.code === "variant_contains_color_or_state")?.message
    ).toMatch(/white/);
  });

  it("变体含状态词 pressed → variant_contains_color_or_state", () => {
    const issues = validateCompTokenName({
      component: "button",
      type: "color",
      role: "fill",
      variant: "pressed",
      state: "enabled",
    });
    expect(issues.map((i) => i.code)).toContain("variant_contains_color_or_state");
    expect(
      issues.find((i) => i.code === "variant_contains_color_or_state")?.message
    ).toMatch(/pressed/);
  });

  it("缺状态 → missing_state", () => {
    const issues = validateCompTokenName({
      component: "menu",
      type: "color",
      role: "fill",
      state: "",
    });
    expect(issues.map((i) => i.code)).toContain("missing_state");
    expect(issues.find((i) => i.code === "missing_state")?.message).toMatch(
      /状态.*不能省略|必须放在最后/
    );
  });

  it("状态没放在最后 → state_not_last", () => {
    const issues = validateCompTokenName({
      component: "menu",
      part: "pressed",
      type: "color",
      role: "fill",
      state: "selected",
    });
    expect(issues.map((i) => i.code)).toContain("state_not_last");
    expect(issues.find((i) => i.code === "state_not_last")?.message).toMatch(
      /状态必须放在名称最后/
    );
  });

  it("出现大写 → not_snake_case", () => {
    const issues = validateCompTokenName({
      component: "Menu",
      type: "color",
      role: "fill",
      state: "enabled",
    });
    expect(issues.map((i) => i.code)).toContain("not_snake_case");
    expect(issues.find((i) => i.code === "not_snake_case")?.message).toMatch(
      /snake_case|大写|连字符/
    );
  });

  it("出现连字符 → not_snake_case", () => {
    const issues = validateCompTokenName({
      component: "action-bar",
      type: "color",
      role: "fill",
      state: "enabled",
    });
    expect(issues.map((i) => i.code)).toContain("not_snake_case");
  });

  it("部件里含 fill → part_contains_role", () => {
    const issues = validateCompTokenName({
      component: "menu",
      part: "icon_fill",
      type: "color",
      role: "bg",
      state: "enabled",
    });
    expect(issues.map((i) => i.code)).toContain("part_contains_role");
    expect(issues.find((i) => i.code === "part_contains_role")?.message).toMatch(
      /fill/
    );
  });

  it("部件里含 enabled → part_contains_state", () => {
    const issues = validateCompTokenName({
      component: "menu",
      part: "title_enabled",
      type: "color",
      role: "text",
      state: "selected",
    });
    expect(issues.map((i) => i.code)).toContain("part_contains_state");
    expect(issues.find((i) => i.code === "part_contains_state")?.message).toMatch(
      /enabled/
    );
  });
});

describe("history helpers", () => {
  it("loadCompTokenHistory 解析并截断", () => {
    const raw = JSON.stringify([
      { name: "a", path: "m/a", createdAt: 1 },
      { name: "b", path: "m/b", createdAt: 2 },
      { bad: true },
    ]);
    expect(loadCompTokenHistory(raw)).toEqual([
      { name: "a", path: "m/a", createdAt: 1 },
      { name: "b", path: "m/b", createdAt: 2 },
    ]);
    expect(loadCompTokenHistory("not-json")).toEqual([]);
    expect(loadCompTokenHistory(null)).toEqual([]);
  });

  it("pushCompTokenHistory 去重并保留最近 20 条", () => {
    const base = Array.from({ length: 20 }, (_, i) => ({
      name: `n${i}`,
      path: `c/n${i}`,
      createdAt: i,
    }));
    const next = pushCompTokenHistory(base, {
      name: "fresh",
      path: "menu/fresh",
      createdAt: 100,
    });
    expect(next).toHaveLength(20);
    expect(next[0]).toEqual({
      name: "fresh",
      path: "menu/fresh",
      createdAt: 100,
    });
    expect(next.find((e) => e.name === "n19")).toBeUndefined();

    const deduped = pushCompTokenHistory(next, {
      name: "fresh",
      path: "menu/fresh",
      createdAt: 101,
    });
    expect(deduped.filter((e) => e.name === "fresh")).toHaveLength(1);
    expect(deduped[0]?.createdAt).toBe(101);
  });
});
