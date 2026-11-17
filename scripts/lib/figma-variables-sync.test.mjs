// @vitest-environment node
import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import {
  applyDelta,
  buildPluginCode,
  canonicalToNative,
  diffNative,
  f32,
  knownHashes,
  nativeToCanonical,
} from "./figma-variables-sync.mjs";

// Figma 变量总有 scopes；旧种子部分变量缺省该字段，测试夹具统一补成 []
const seed = JSON.parse(
  readFileSync(path.join(process.cwd(), "src", "data", "sample-tokens-hyperos4.json"), "utf-8")
);
for (const v of Object.values(seed.variables)) {
  if (v.type !== "TYPOGRAPHY" && !v.scopes) {
    const { description, codeSyntax, ...rest } = v;
    seed.variables[v.id] = { ...rest, ...(description ? { description } : {}), scopes: [], codeSyntax };
  }
}

const toFigmaId = (id) => `VariableID:${id}`;

/**
 * 用 Native JSON 构造最小的 figma 模拟对象：Figma Variables + Text Styles。
 * text_style/ 下的 TYPOGRAPHY Token 转为 Text Style：字段别名 → boundVariables，字面值 → 样式属性。
 */
function fakeFigma(json, extraStyles = []) {
  const collections = json.collections.map((c) => ({
    id: `VariableCollectionId:${c.id}`,
    name: c.name,
    modes: c.modes.map((m) => ({ modeId: `m:${c.id}:${m.modeId}`, name: m.name })),
    variableIds: c.variableIds.filter((id) => json.variables[id].type !== "TYPOGRAPHY").map(toFigmaId),
    source: c,
  }));
  const variables = [];
  const styles = [];
  for (const c of collections) {
    for (const figmaId of c.variableIds) {
      const v = json.variables[figmaId.slice("VariableID:".length)];
      const valuesByMode = {};
      for (const m of c.source.modes) {
        const raw = v.valuesByMode[m.modeId];
        valuesByMode[`m:${c.source.id}:${m.modeId}`] =
          raw.type === "ALIAS" ? { type: "VARIABLE_ALIAS", id: toFigmaId(raw.id) } : raw.value;
      }
      variables.push({
        id: figmaId,
        name: v.name,
        variableCollectionId: c.id,
        resolvedType: v.type === "NUMBER" ? "FLOAT" : v.type,
        valuesByMode,
        scopes: v.scopes ?? [],
        description: v.description ?? "",
        codeSyntax: v.codeSyntax ?? {},
      });
    }
    for (const id of c.source.variableIds) {
      const v = json.variables[id];
      if (v.type !== "TYPOGRAPHY" || !v.name.startsWith("text_style/")) continue;
      const fields = v.valuesByMode[c.source.modes[0].modeId].value;
      const literal = (field) => {
        const f = fields[field];
        if (!f) return undefined;
        return f.type === "ALIAS" ? json.variables[f.id].valuesByMode[c.source.modes[0].modeId].value : f.value;
      };
      const boundVariables = {};
      for (const [field, f] of Object.entries(fields)) {
        if (f.type === "ALIAS") boundVariables[field] = { type: "VARIABLE_ALIAS", id: toFigmaId(f.id) };
      }
      styles.push({
        name: v.name.slice("text_style/".length),
        description: v.description ?? "",
        fontName: { family: literal("fontFamily"), style: literal("fontStyle") },
        fontSize: literal("fontSize"),
        lineHeight: { unit: "PIXELS", value: literal("lineHeight") },
        letterSpacing: { unit: "PIXELS", value: literal("letterSpacing") ?? 0 },
        paragraphSpacing: literal("paragraphSpacing") ?? 0,
        boundVariables,
      });
    }
  }
  return {
    variables: {
      getLocalVariableCollectionsAsync: async () => collections,
      getLocalVariablesAsync: async () => variables,
    },
    getLocalTextStylesAsync: async () => [...styles, ...extraStyles],
  };
}

async function runPlugin(figma, hashes, part) {
  const AsyncFunction = Object.getPrototypeOf(async () => {}).constructor;
  return JSON.parse(JSON.stringify(await new AsyncFunction("figma", buildPluginCode(hashes, part, 4000))(figma)));
}

async function exportAll(figma, hashes) {
  const skeleton = await runPlugin(figma, hashes, 0);
  const parts = [skeleton];
  for (let part = 1; part <= skeleton.pages; part++) parts.push(await runPlugin(figma, hashes, part));
  return parts;
}

const findVar = (json, name) => Object.values(json.variables).find((v) => v.name === name);

/**
 * 种子里的颜色通道不一定是 float32 的最短十进制，转换后会按 f32 对齐。
 * Text Style 的 lineHeight 也会收成 AUTO。比较同步结果时用这一轮往返，而不是原始种子。
 */
function roundTripped(json) {
  return canonicalToNative(nativeToCanonical(json), json);
}

describe("f32", () => {
  it("返回可无损还原为同一 float32 的最短十进制", () => {
    expect(f32(Math.fround(0.1))).toBe(0.1);
    expect(f32(Math.fround(250 / 255))).toBe(0.98039216);
    expect(Math.fround(f32(Math.fround(250 / 255)))).toBe(Math.fround(250 / 255));
    expect(f32(16)).toBe(16);
  });
});

describe("Figma MCP 增量同步", () => {
  const base = nativeToCanonical(seed);
  const hashes = knownHashes(base);

  it("Figma 与基线一致时只回传骨架，还原结果与种子深度一致（含 Text Style 引用链）", async () => {
    expect(base.textStyles.length).toBeGreaterThan(0);
    const parts = await exportAll(fakeFigma(seed), hashes);
    expect(parts).toHaveLength(1);
    expect(parts[0].changed).toBe(0);
    expect(parts[0].unsupported ?? []).toEqual([]);
    expect(parts[0].textStyles).toHaveLength(base.textStyles.length);
    const { snapshot } = applyDelta(base, parts);
    const next = canonicalToNative(snapshot, seed);
    expect(next).toEqual(roundTripped(seed));
    for (const variable of Object.values(next.variables)) {
      if (variable.type === "TYPOGRAPHY" && variable.name.startsWith("text_style/")) {
        for (const raw of Object.values(variable.valuesByMode)) {
          expect(raw.value.lineHeight).toEqual({ type: "AUTO" });
        }
      }
    }
  });

  it("变化条目分页回传；新增变量分配新 id，未变变量沿用原 id", async () => {
    const figmaJson = structuredClone(seed);
    const reference = figmaJson.collections.find((c) => c.name === "Reference Token");
    const colorId = reference.variableIds.find((id) => figmaJson.variables[id].type === "COLOR");
    figmaJson.variables[colorId].description = "改过的描述";
    for (let i = 0; i < 60; i++) {
      const id = `new_${i}`;
      figmaJson.variables[id] = {
        id,
        name: `number/test/miuix_ref_test_${i}`,
        type: "NUMBER",
        valuesByMode: { mode_light: { type: "NUMBER", value: i }, mode_dark: { type: "NUMBER", value: i } },
        scopes: ["GAP"],
        codeSyntax: {},
      };
      reference.variableIds.push(id);
    }

    const parts = await exportAll(fakeFigma(figmaJson), hashes);
    expect(parts[0].changed).toBe(61);
    expect(parts.length).toBeGreaterThan(2);

    const { snapshot, changed } = applyDelta(base, parts);
    expect(changed).toBe(61);
    const next = canonicalToNative(snapshot, seed);
    const diff = diffNative(roundTripped(seed), next);
    expect(diff.added).toHaveLength(60);
    expect(diff.removed).toHaveLength(0);
    expect(diff.changed).toEqual([`Reference Token/${figmaJson.variables[colorId].name}`]);
    expect(next.variables[colorId].description).toBe("改过的描述");
    expect(Object.keys(next.variables)).not.toContain("new_0");
    expect(Object.keys(next.variables)).toHaveLength(Object.keys(seed.variables).length + 60);
  });

  it("Text Style 改绑变量、新增与删除均以 Figma 为准，绑定字段保留为别名", async () => {
    const figmaJson = structuredClone(seed);
    const semantic = figmaJson.collections.find((c) => c.name === "Semantic Token");
    const styleIds = semantic.variableIds.filter((id) => figmaJson.variables[id].type === "TYPOGRAPHY");
    // 1) 删除一个样式
    const removedName = figmaJson.variables[styleIds[0]].name;
    semantic.variableIds = semantic.variableIds.filter((id) => id !== styleIds[0]);
    delete figmaJson.variables[styleIds[0]];
    // 2) 改绑一个样式的 fontSize 到另一个字号变量
    const changed = figmaJson.variables[styleIds[1]];
    const otherSize = findVar(figmaJson, "number/font_size/miuix_ref_font_size_14");
    for (const raw of Object.values(changed.valuesByMode)) raw.value.fontSize = { type: "ALIAS", id: otherSize.id };

    // 3) 新增一个样式：fontFamily 绑定变量，其余为字面值（含百分比字距）
    const family = findVar(figmaJson, "font/family/miuix_ref_font_family_misans");
    const extra = {
      name: "miuix_text_style_test_new",
      description: "新增样式",
      fontName: { family: "MiSans", style: "Bold" },
      fontSize: 20,
      lineHeight: { unit: "PIXELS", value: 26 },
      letterSpacing: { unit: "PERCENT", value: 5 },
      paragraphSpacing: 0,
      boundVariables: { fontFamily: { type: "VARIABLE_ALIAS", id: toFigmaId(family.id) } },
    };

    const { snapshot } = applyDelta(base, await exportAll(fakeFigma(figmaJson, [extra]), hashes));
    expect(snapshot.textStyles).toHaveLength(base.textStyles.length);
    const next = canonicalToNative(snapshot, seed);
    const diff = diffNative(roundTripped(seed), next);
    expect(diff.removed).toEqual([`Semantic Token/${removedName}`]);
    expect(diff.added).toEqual(["Semantic Token/text_style/miuix_text_style_test_new"]);
    expect(diff.changed).toEqual([`Semantic Token/${changed.name}`]);

    // 改绑后仍为别名，指向新的字号变量；id 与 codeSyntax 沿用
    expect(next.variables[changed.id].valuesByMode.mode_dark.value.fontSize).toEqual({ type: "ALIAS", id: otherSize.id });
    expect(next.variables[changed.id].codeSyntax).toEqual(seed.variables[changed.id].codeSyntax);

    // 新样式：绑定字段为别名，未绑定字段为字面值；百分比字距换算为像素
    const added = findVar(next, "text_style/miuix_text_style_test_new");
    expect(added.id).toMatch(/^var_\d+$/);
    expect(seed.variables[added.id]).toBeUndefined();
    expect(added.valuesByMode.mode_light.value).toEqual({
      fontFamily: { type: "ALIAS", id: family.id },
      fontStyle: { type: "STRING", value: "Bold" },
      fontSize: { type: "NUMBER", value: 20 },
      lineHeight: { type: "AUTO" },
      letterSpacing: { type: "NUMBER", value: 1 },
    });
    expect(added.valuesByMode.mode_dark).toEqual(added.valuesByMode.mode_light);
    expect(added.codeSyntax).toEqual({ ANDROID: "miuix_text_style_test_new" });

    // Text Style 位于 Semantic Token 末尾、Figma 顺序
    const outSemantic = next.collections.find((c) => c.name === "Semantic Token");
    expect(outSemantic.variableIds.at(-1)).toBe(added.id);
  });

  it("Text Style 绑定已删除的变量时拒绝还原，AUTO 行高不中止", async () => {
    const figmaJson = structuredClone(seed);
    const auto = {
      name: "auto_line_height",
      description: "",
      fontName: { family: "MiSans", style: "Regular" },
      fontSize: 14,
      lineHeight: { unit: "AUTO" },
      letterSpacing: { unit: "PIXELS", value: 0 },
      paragraphSpacing: 0,
      boundVariables: { fontSize: { type: "VARIABLE_ALIAS", id: "VariableID:missing" } },
    };
    const parts = await exportAll(fakeFigma(figmaJson, [auto]), hashes);
    expect(parts[0].unsupported ?? []).not.toEqual(expect.arrayContaining([expect.stringMatching(/lineHeight/)]));
    expect(() => applyDelta(base, parts)).toThrow(/auto_line_height\.fontSize/);
  });

  it("定高、百分比、AUTO 和行高变量绑定都输出 AUTO", async () => {
    const figmaJson = structuredClone(seed);
    const lineHeightVar = findVar(figmaJson, "number/line_height/miuix_ref_line_height_21");
    const extras = [
      ["lh_pixels", { unit: "PIXELS", value: 26 }, {}],
      ["lh_percent", { unit: "PERCENT", value: 140 }, {}],
      ["lh_auto", { unit: "AUTO" }, {}],
      ["lh_bound", { unit: "PIXELS", value: 21 }, { lineHeight: { type: "VARIABLE_ALIAS", id: toFigmaId(lineHeightVar.id) } }],
    ].map(([name, lineHeight, boundVariables]) => ({
      name,
      description: "",
      fontName: { family: "MiSans", style: "Regular" },
      fontSize: 16,
      lineHeight,
      letterSpacing: { unit: "PIXELS", value: 0 },
      paragraphSpacing: 0,
      boundVariables,
    }));

    const parts = await exportAll(fakeFigma(figmaJson, extras), hashes);
    expect(parts[0].unsupported ?? []).toEqual([]);
    const { snapshot } = applyDelta(base, parts);
    const next = canonicalToNative(snapshot, seed);
    for (const style of extras) {
      const entry = snapshot.textStyles.find(([styleName]) => styleName === style.name);
      expect(entry[2].find(([field]) => field === "lineHeight")[1]).toBe("AUTO");
      expect(findVar(next, `text_style/${style.name}`).valuesByMode.mode_light.value.lineHeight).toEqual({ type: "AUTO" });
    }
    const bound = snapshot.textStyles.find(([styleName]) => styleName === "lh_bound");
    expect(bound[2].some(([, value]) => Array.isArray(value) && value[2]?.includes("line_height"))).toBe(false);
  });

  it("缺页、抄写错误或基线不匹配时拒绝还原", async () => {
    const figmaJson = structuredClone(seed);
    const first = figmaJson.collections[0].variableIds[0];
    figmaJson.variables[first].description = "x".repeat(5000);
    const second = figmaJson.collections[0].variableIds[1];
    figmaJson.variables[second].description = "y".repeat(5000);
    const parts = await exportAll(fakeFigma(figmaJson), hashes);
    expect(parts[0].pages).toBe(2);

    expect(() => applyDelta(base, parts.slice(0, 2))).toThrow(/分页不完整/);

    const tampered = structuredClone(parts);
    tampered[1].entries[0][1][4] = "抄错了";
    expect(() => applyDelta(base, tampered)).toThrow(/校验和/);

    const otherBase = structuredClone(base);
    otherBase.collections[0].variables.pop();
    expect(() => applyDelta(otherBase, parts)).toThrow(/基线不匹配/);
  });

  it("旧版基线（不含 textStyles）时保留目标文档中的 TYPOGRAPHY，并在引用变量被删时中止", async () => {
    const typography = Object.values(seed.variables).find((v) => v.type === "TYPOGRAPHY");
    const raw = Object.values(typography.valuesByMode)[0];
    const refId = Object.values(raw.value).find((f) => f.type === "ALIAS").id;
    const legacy = structuredClone(base);
    delete legacy.textStyles;

    const preserved = canonicalToNative(legacy, seed);
    for (const [id, variable] of Object.entries(seed.variables)) {
      if (variable.type !== "TYPOGRAPHY") continue;
      expect(preserved.variables[id]).toEqual(variable);
    }
    expect(Object.keys(preserved.variables)).toHaveLength(Object.keys(seed.variables).length);

    const shrunk = structuredClone(legacy);
    const refName = seed.variables[refId].name;
    for (const c of shrunk.collections) c.variables = c.variables.filter(([name]) => name !== refName);
    for (const c of shrunk.collections) {
      for (const entry of c.variables) {
        entry[2] = entry[2].map((value) => (Array.isArray(value) && value[2] === refName ? 0 : value));
      }
    }
    expect(() => canonicalToNative(shrunk, seed)).toThrow(/已在 Figma 中删除/);
  });
});
