// @vitest-environment node
import { describe, expect, it } from "vitest";
import { assertTokenLint, lintTokenDocument } from "./token-lint.mjs";

function native(variables) {
  return {
    collections: [{ name: "Component Token", variableIds: variables.map((variable) => variable.id) }],
    variables: Object.fromEntries(variables.map((variable) => [variable.id, variable])),
  };
}

const clean = {
  id: "var_1",
  name: "bottomselectionbar/miuix_comp_bottomselection_bar_color_text_title_enabled",
  description: "用途：底部悬浮组件的标题色",
};

describe("token lint", () => {
  it("passes a snake_case name and a clean description", () => {
    expect(lintTokenDocument(native([clean]))).toEqual([]);
  });

  it("blocks a Figma duplicate suffix without also reporting whitespace", () => {
    const issues = lintTokenDocument(native([{
      ...clean,
      name: "bottomselectionbar/miuix_comp_bottomselection_bar_text_activated_static_white 2",
    }]));
    expect(issues.map((item) => item.code)).toEqual(["duplicate_suffix"]);
  });

  it("blocks a space inside a name", () => {
    const issues = lintTokenDocument(native([{
      ...clean,
      name: "menu/miuix_comp_menu_color_text_ primary_enabled",
    }]));
    expect(issues.map((item) => item.code)).toEqual(["whitespace"]);
  });

  it("blocks a leaf that is not snake_case", () => {
    const issues = lintTokenDocument(native([{ ...clean, name: "menu/MiuixComp" }]));
    expect(issues[0]).toMatchObject({ code: "not_snake_case" });
  });

  it("blocks a known mistake in the name and only warns on the description", () => {
    const issues = lintTokenDocument(native([{
      ...clean,
      name: "bottomselectionbar/miuix_comp_bottomselection_bar_color_text_tittle_enabled",
      description: "用途：系统通用悬浮这招色",
    }]));
    expect(issues.map((item) => `${item.severity}:${item.message}`)).toEqual([
      "error:名称含有「tittle」",
      "warning:描述含有「这招」",
    ]);
  });

  it("checks canonical variables and text styles", () => {
    const issues = lintTokenDocument({
      collections: [{
        name: "Semantic Token",
        variables: [["text/default/miuix_sys_color_text_tittle_enabled", "COLOR", [], [], ""]],
      }],
      textStyles: [["sp/miuix_text_style_body 2", "正文这招"]],
    });
    expect(issues.map((item) => `${item.severity}:${item.collection}/${item.code}`)).toEqual([
      "error:Semantic Token/known_mistake",
      "error:Text Style/duplicate_suffix",
      "warning:Text Style/known_mistake",
    ]);
  });

  it("lets a description warning through and still stops on a name error", () => {
    expect(() => assertTokenLint(native([{ ...clean, description: "这招" }]))).not.toThrow();
    expect(() => assertTokenLint(native([{
      ...clean,
      name: "bottomselectionbar/miuix_comp_bottomselection_bar_color_text_tittle_enabled",
      description: "这招",
    }]))).toThrow(/已停止写入（1 处）/);
  });
});
