#!/usr/bin/env node
/**
 * Parses Figma-exported CSS variables (e.g. [data-theme="Light"] / [data-theme="Dark"])
 * and outputs Figma native JSON for Design Token Viewer (src/data/sample-tokens.json).
 * Usage: node scripts/css-vars-to-sample.mjs < path/to/vars.css
 *    or: paste CSS into CSS_VARS_INPUT below and run.
 */

import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const CSS_VARS_INPUT = `[data-theme="Light"] {
  /* color */
  --元素色-container-input: #ffffff;
  --元素色-container-list: #ffffff;
  --元素色-container-list-solid: #ffffff;
  --元素色-container-notice-bar: #0000000a;
  --元素色-surface-container: #0000000a;
  --元素色-surface-container-high: #0000001a;
  --元素色-surface-container-low: #0000000f;
  --元素色-surface-container-medium: #00000014;
  --全系统色板-apricot-orange: #ff9f05;
  --全系统色板-black: #000000;
  --全系统色板-blue: #3482ff;
  --全系统色板-chartreuse: #94e203;
  --全系统色板-cyan: #0fcaca;
  --全系统色板-deep-orange: #ff612e;
  --全系统色板-gray: #8c9db0;
  --全系统色板-green: #1dcd3a;
  --全系统色板-lemon-yellow: #ffd000;
  --全系统色板-magenta: #e74095;
  --全系统色板-orange: #ff6900;
  --全系统色板-purple: #7767f9;
  --全系统色板-red: #fa382e;
  --全系统色板-sky-blue: #29a9ff;
  --全系统色板-turquoise: #0cce94;
  --全系统色板-violet: #b74af7;
  --全系统色板-white: #ffffff;
  --全系统色板-yellow: #ffbb0f;
  --分割线色-outline: #0000001a;
  --文字图标色-on-surface-button-disable: #ffffff;
  --文字图标色-on-surface-empty-state: #00000033;
  --文字图标色-on-surface-right-button-bg: #0000000d;
  --文字图标色-on-surface-right-icon: #0000004d;
  --文字图标色-on-surface: #000000;
  --文字图标色-on-surface-octonary: #0000004d;
  --文字图标色-on-surface-quaternary: #00000066;
  --文字图标色-on-surface-secondary: #000000cc;
  --文字图标色-on-surface-tertiary: #00000099;
  --新增色彩变量-container-list-hover: #0000000f;
  --新增色彩变量-container-list-touch: #0000001f;
  --新增色彩变量-container-nav: #0000000d;
  --系统主色-on-primary: #ffffff;
  --系统主色-on-secondary: #3482ff;
  --系统主色-on-tertiary: #000000cc;
  --系统主色-primary: #3482ff;
  --系统主色-secondary: #3482ff14;
  --系统主色-tertiary: #0000000f;
  --系统功能色-caution: #ff9f05;
  --系统功能色-caution-container: #ff9f051a;
  --系统功能色-error: #fa382e;
  --系统功能色-error-container: #fa382e14;
  --系统功能色-error-disable: #fa382e4d;
  --线框插图色-container-illustration-primary: #bec3d8;
  --线框插图色-container-illustration-quaternary: #e9eaf0;
  --线框插图色-container-illustration-secondary: #ced2e0;
  --线框插图色-container-illustration-tertiary: #dfe1eb;
  --背景色-surface: #ffffff;
  --背景色-surface-high: #ffffff;
  --背景色-surface-highest: #ffffff;
  --背景色-surface-low: #f3f3f3;
  --背景色-surface-medium: #ffffff;
  --背景色-surface-menubar: #ffffff;
  --背景色-surface-pop-window: #f3f3f3;
  --遮罩色-mask: #00000033;
  --遮罩色-mask-menu: #00000033;
}
[data-theme="Dark"] {
  /* color */
  --元素色-container-input: #ffffff24;
  --元素色-container-list: #ffffff24;
  --元素色-container-list-solid: #4c4c4c;
  --元素色-container-notice-bar: #ffffff24;
  --元素色-surface-container: #ffffff14;
  --元素色-surface-container-high: #ffffff33;
  --元素色-surface-container-low: #ffffff24;
  --元素色-surface-container-medium: #ffffff24;
  --全系统色板-apricot-orange: #ffa30f;
  --全系统色板-black: #000000;
  --全系统色板-blue: #4788ff;
  --全系统色板-chartreuse: #9fe421;
  --全系统色板-cyan: #13cdcd;
  --全系统色板-deep-orange: #ff6a05;
  --全系统色板-gray: #92a1b4;
  --全系统色板-green: #28d244;
  --全系统色板-lemon-yellow: #ffdd33;
  --全系统色板-magenta: #ee4f9f;
  --全系统色板-orange: #f97a1f;
  --全系统色板-purple: #8370ff;
  --全系统色板-red: #fa4238;
  --全系统色板-sky-blue: #36acfc;
  --全系统色板-turquoise: #11d097;
  --全系统色板-violet: #bd57fa;
  --全系统色板-white: #ffffff;
  --全系统色板-yellow: #ffbf0f;
  --分割线色-outline: #ffffff33;
  --文字图标色-on-surface-button-disable: #ffffff4d;
  --文字图标色-on-surface-empty-state: #ffffff33;
  --文字图标色-on-surface-right-button-bg: #ffffff33;
  --文字图标色-on-surface-right-icon: #ffffff66;
  --文字图标色-on-surface: #fffffff2;
  --文字图标色-on-surface-octonary: #ffffff4d;
  --文字图标色-on-surface-quaternary: #ffffff80;
  --文字图标色-on-surface-secondary: #ffffffcc;
  --文字图标色-on-surface-tertiary: #ffffff80;
  --新增色彩变量-container-list-hover: #ffffff0f;
  --新增色彩变量-container-list-touch: #ffffff1f;
  --新增色彩变量-container-nav: #ffffff1f;
  --系统主色-on-primary: #ffffffe5;
  --系统主色-on-secondary: #4788ff;
  --系统主色-on-tertiary: #ffffffcc;
  --系统主色-primary: #4788ff;
  --系统主色-secondary: #4788ff40;
  --系统主色-tertiary: #ffffff24;
  --系统功能色-caution: #ffa30f;
  --系统功能色-caution-container: #ffa30f38;
  --系统功能色-error: #fa4238;
  --系统功能色-error-container: #fa423838;
  --系统功能色-error-disable: #fa42384d;
  --线框插图色-container-illustration-primary: #666666;
  --线框插图色-container-illustration-quaternary: #333333;
  --线框插图色-container-illustration-secondary: #565656;
  --线框插图色-container-illustration-tertiary: #424242;
  --背景色-surface: #000000;
  --背景色-surface-high: #242424;
  --背景色-surface-highest: #2c2c2c;
  --背景色-surface-low: #000000;
  --背景色-surface-medium: #242424;
  --背景色-surface-menubar: #666666;
  --背景色-surface-pop-window: #242424;
  --遮罩色-mask: #00000099;
  --遮罩色-mask-menu: #00000066;
}
`;

function hexToRgba(hex) {
  const h = hex.slice(1);
  if (h.length === 6) {
    return {
      r: parseInt(h.slice(0, 2), 16) / 255,
      g: parseInt(h.slice(2, 4), 16) / 255,
      b: parseInt(h.slice(4, 6), 16) / 255,
      a: 1,
    };
  }
  return {
    r: parseInt(h.slice(0, 2), 16) / 255,
    g: parseInt(h.slice(2, 4), 16) / 255,
    b: parseInt(h.slice(4, 6), 16) / 255,
    a: parseInt(h.slice(6, 8), 16) / 255,
  };
}

/** Parse CSS input: return { Light: { "--css-name": "#hex", ... }, Dark: { ... } } */
function parseCssThemes(css) {
  const themes = { Light: {}, Dark: {} };
  let current = null;
  const lineRe = /^\s*--([\u4e00-\u9fa5a-zA-Z0-9-]+):\s*(#[0-9a-fA-F]+)\s*;/;
  for (const line of css.split("\n")) {
    const themeMatch = line.match(/\[data-theme="(Light|Dark)"\]/);
    if (themeMatch) current = themeMatch[1];
    const varMatch = line.match(lineRe);
    if (varMatch && current) themes[current]["--" + varMatch[1]] = varMatch[2];
  }
  return themes;
}

/** Convert CSS var name to Figma-style path: --元素色-container-input → 元素色/container-input */
function cssVarToFigmaName(cssName) {
  const key = cssName.slice(2);
  const firstHyphen = key.indexOf("-");
  if (firstHyphen <= 0) return key.replace(/-/g, "/");
  return key.slice(0, firstHyphen) + "/" + key.slice(firstHyphen + 1).replace(/-/g, "/");
}

const themes = parseCssThemes(CSS_VARS_INPUT);

const lightVars = themes.Light ?? {};
const darkVars = themes.Dark ?? {};
const allKeys = [...new Set([...Object.keys(lightVars), ...Object.keys(darkVars)])];

const MODE_LIGHT = "mode_light";
const MODE_DARK = "mode_dark";
const COL_ID = "col_theme";
const COL_FEATURE_ID = "col_feature";

const variableIds = [];
const variables = {};
allKeys.forEach((cssKey, i) => {
  const id = `var_${i}`;
  variableIds.push(id);
  const name = cssVarToFigmaName(cssKey);
  const lightHex = lightVars[cssKey] || darkVars[cssKey] || "#000000";
  const darkHex = darkVars[cssKey] || lightVars[cssKey] || "#000000";
  variables[id] = {
    id,
    name,
    type: "COLOR",
    valuesByMode: {
      [MODE_LIGHT]: { type: "COLOR", value: hexToRgba(lightHex) },
      [MODE_DARK]: { type: "COLOR", value: hexToRgba(darkHex) },
    },
  };
});

const sharedModes = [
  { modeId: MODE_LIGHT, name: "Light" },
  { modeId: MODE_DARK, name: "Dark" },
];

const figmaNative = {
  collections: [
    {
      id: COL_ID,
      name: "Feature Token",
      modes: sharedModes,
      variableIds,
    },
  ],
  variables,
};

const outPath = join(root, "src", "data", "sample-tokens.json");
writeFileSync(outPath, JSON.stringify(figmaNative, null, 2), "utf-8");
console.log("Wrote", variableIds.length, "tokens (Light + Dark) to", outPath);
