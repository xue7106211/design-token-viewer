#!/usr/bin/env node
/**
 * 从规范快照 figma-token/figma-variables.json 导出 GitLab OS5token 使用的 CSV。
 * 只读快照，不连接 Figma 或 Neon。Text Style 的 lineHeight 固定写 Auto。
 *
 *   node scripts/export-gitlab-csv.mjs \
 *     --snapshot figma-token/figma-variables.json \
 *     --out exports/HyperOS_Design_Token_YYYYMMDD.csv
 *
 * --delta 可选：预览时基线尚未写回，用增量包在内存里还原后再导出。
 */
import { statSync } from "fs";
import { mkdir, readdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { applyDelta, verifySnapshot } from "./lib/figma-variables-sync.mjs";

const COLUMNS = [
  "name",
  "type",
  "layer",
  "role",
  "group",
  "description",
  "Light",
  "Dark",
  "valueKind",
  "fontFamily",
  "fontStyle",
  "fontSize",
  "lineHeight",
  "letterSpacing",
  "boundVariables",
  "unit",
];

const LAYER_BY_COLLECTION = {
  "Reference Token": "Reference",
  "Semantic Token": "Semantic",
  "Component Token": "Component",
};

const TYPE_BY_FIGMA = {
  COLOR: "color",
  FLOAT: "number",
  STRING: "string",
  BOOLEAN: "boolean",
};

/** 名字里最早出现的关键词。同一位置取更长的词，避免 font_size 被更短的片段截走。 */
const ROLE_KEYWORDS = [
  ["font_family", "fontFamily"],
  ["font_style", "fontStyle"],
  ["font_size", "fontSize"],
  ["line_height", "lineHeight"],
  ["opacity", "opacity"],
  ["padding", "padding"],
  ["margin", "margin"],
  ["radius", "radius"],
  ["divider", "divider"],
  ["stroke", "stroke"],
  ["fill", "fill"],
  ["text", "text"],
  ["mask", "mask"],
  ["gap", "gap"],
  ["bg", "bg"],
];

export function leafName(fullName) {
  const parts = String(fullName).split("/");
  return parts[parts.length - 1] ?? "";
}

export function roleFromName(name) {
  const hits = [];
  for (const [keyword, role] of ROLE_KEYWORDS) {
    const index = name.indexOf(keyword);
    if (index >= 0) hits.push([index, keyword.length, role]);
  }
  hits.sort((a, b) => a[0] - b[0] || b[1] - a[1]);
  return hits[0]?.[2] ?? "";
}

function splitPath(fullName) {
  const parts = String(fullName).split("/");
  return { name: parts[parts.length - 1] ?? "", group: parts.slice(0, -1).join("/") };
}

/** 先还原成 Figma 的 float32，再四舍五入到字节。最短十进制（如 0.7）直接乘 255 会在 .5 处进位，和已交付 CSV 差 1。 */
function colorByte(channel) {
  return Math.round(Math.min(1, Math.max(0, Math.fround(channel))) * 255);
}

export function formatNumber(value) {
  return String(Math.fround(value));
}

export function formatColor(value) {
  if (!Array.isArray(value) || value.length < 3 || value.slice(0, 4).some((channel) => typeof channel !== "number")) {
    return null;
  }
  const hex = (n) => n.toString(16).toUpperCase().padStart(2, "0");
  const [r, g, b, a = 1] = value;
  const red = colorByte(r);
  const green = colorByte(g);
  const blue = colorByte(b);
  const alpha = colorByte(a);
  if (alpha === 255) return `#${hex(red)}${hex(green)}${hex(blue)}`;
  return `#${hex(alpha)}${hex(red)}${hex(green)}${hex(blue)}`;
}

function csvCell(value) {
  const text = value == null ? "" : String(value);
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

export function renderGitlabCsv(rows) {
  const lines = [COLUMNS.join(",")];
  for (const row of rows) lines.push(COLUMNS.map((column) => csvCell(row[column])).join(","));
  return `\uFEFF${lines.join("\r\n")}\r\n`;
}

function indexVariables(snapshot) {
  const index = new Map();
  for (const collection of snapshot.collections) {
    for (const entry of collection.variables) index.set(`${collection.name}\0${entry[0]}`, { collection, entry });
  }
  return index;
}

function modeIndex(modes, modeName) {
  return modes.findIndex((mode) => mode.toLowerCase() === modeName.toLowerCase());
}

function isAlias(value) {
  return Array.isArray(value) && (value[0] === "@" || value[0] === "@?");
}

/** 沿 Light 模式把别名解析成字面量，供 Text Style 的字体列展示。 */
function resolveConcrete(index, value, depth = 0) {
  if (depth > 12) return { error: "别名循环" };
  if (Array.isArray(value) && value[0] === "@?") return { error: `未解析别名 ${value[1]}` };
  if (Array.isArray(value) && value[0] === "@") {
    const hit = index.get(`${value[1]}\0${value[2]}`);
    if (!hit) return { error: `未解析别名 ${value[1]}/${value[2]}` };
    const light = modeIndex(hit.collection.modes, "Light");
    const raw = hit.entry[2][light >= 0 ? light : 0];
    return resolveConcrete(index, raw, depth + 1);
  }
  return { value };
}

function formatLetterSpacing(value, fontSize) {
  if (value == null || value === "" || value === 0) return "0%";
  if (typeof value === "number" && typeof fontSize === "number" && fontSize !== 0) {
    const percent = Math.round((value / fontSize) * 100000) / 1000;
    return `${percent}%`;
  }
  return String(value);
}

function textStyleUnit(name) {
  if (/_sp$/.test(name)) return "sp";
  if (/_dp$/.test(name)) return "dp";
  return "";
}

function emptyFontColumns() {
  return { fontFamily: "", fontStyle: "", fontSize: "", lineHeight: "", letterSpacing: "", boundVariables: "", unit: "" };
}

function formatModeValue(value, type, owner, errors) {
  if (value == null) {
    errors.push(`${owner} 缺少 Mode 值`);
    return "";
  }
  if (Array.isArray(value) && value[0] === "@?") {
    errors.push(`${owner} 未解析别名 ${value[1]}`);
    return "";
  }
  if (Array.isArray(value) && value[0] === "@") return leafName(value[2]);
  if (type === "COLOR") {
    const hex = formatColor(value);
    if (!hex) errors.push(`${owner} 的颜色值无法格式化`);
    return hex ?? "";
  }
  if (typeof value === "number") return formatNumber(value);
  return String(value);
}

function pushVariableRow(rows, errors, index, collection, entry) {
  const [fullName, figmaType, values, , description] = entry;
  const type = TYPE_BY_FIGMA[figmaType];
  const layer = LAYER_BY_COLLECTION[collection.name];
  if (!type) errors.push(`${collection.name}/${fullName} 不支持的类型 ${figmaType}`);
  if (!layer) errors.push(`${collection.name}/${fullName} 未知 Collection`);
  const lightAt = modeIndex(collection.modes, "Light");
  const darkAt = modeIndex(collection.modes, "Dark");
  if (lightAt < 0 || darkAt < 0) errors.push(`${collection.name} 缺少 Light / Dark 模式`);
  const light = lightAt < 0 ? undefined : values[lightAt];
  const dark = darkAt < 0 ? undefined : values[darkAt];
  const owner = `${collection.name}/${fullName}`;
  if (isAlias(light) && light[0] === "@" && !index.has(`${light[1]}\0${light[2]}`)) {
    errors.push(`${owner} Light 未解析别名 ${light[1]}/${light[2]}`);
  }
  if (isAlias(dark) && dark[0] === "@" && !index.has(`${dark[1]}\0${dark[2]}`)) {
    errors.push(`${owner} Dark 未解析别名 ${dark[1]}/${dark[2]}`);
  }
  const lightKind = isAlias(light) ? "alias" : "raw";
  const darkKind = isAlias(dark) ? "alias" : "raw";
  const { name, group } = splitPath(fullName);
  rows.push({
    name,
    type: type ?? "",
    layer: layer ?? collection.name,
    role: roleFromName(name),
    group,
    description: description ?? "",
    Light: formatModeValue(light, figmaType, `${owner} Light`, errors),
    Dark: formatModeValue(dark, figmaType, `${owner} Dark`, errors),
    valueKind: lightKind === darkKind ? lightKind : "mixed",
    ...emptyFontColumns(),
  });
}

function pushTextStyleRow(rows, errors, index, entry) {
  const [fullName, description, fields] = entry;
  const { name, group } = splitPath(fullName);
  const fieldMap = new Map(fields);
  const bindings = [];
  const display = {};
  for (const field of ["fontFamily", "fontStyle", "fontSize", "letterSpacing", "paragraphSpacing"]) {
    const fieldValue = fieldMap.get(field);
    if (fieldValue == null) continue;
    if (isAlias(fieldValue) && fieldValue[0] === "@" && index.has(`${fieldValue[1]}\0${fieldValue[2]}`)) {
      bindings.push(`${field}=${leafName(fieldValue[2])}`);
    }
    const concrete = resolveConcrete(index, fieldValue);
    if (concrete.error) errors.push(`Text Style ${fullName}.${field} ${concrete.error}`);
    else display[field] = concrete.value;
  }
  const fontSize = typeof display.fontSize === "number" ? display.fontSize : Number(display.fontSize);
  rows.push({
    name,
    type: "typography",
    layer: "TextStyle",
    role: roleFromName(name),
    group,
    description: description ?? "",
    Light: "",
    Dark: "",
    valueKind: "style",
    fontFamily: display.fontFamily == null ? "" : String(display.fontFamily),
    fontStyle: display.fontStyle == null ? "" : String(display.fontStyle),
    fontSize: display.fontSize == null ? "" : typeof display.fontSize === "number" ? formatNumber(display.fontSize) : String(display.fontSize),
    lineHeight: "Auto",
    letterSpacing: formatLetterSpacing(display.letterSpacing, Number.isFinite(fontSize) ? fontSize : undefined),
    boundVariables: bindings.join("; "),
    unit: textStyleUnit(name),
  });
}

export function exportGitlabCsv(snapshot) {
  const errors = [];
  const rows = [];
  const index = indexVariables(snapshot);
  for (const collection of snapshot.collections ?? []) {
    for (const entry of collection.variables) pushVariableRow(rows, errors, index, collection, entry);
  }
  for (const entry of snapshot.textStyles ?? []) pushTextStyleRow(rows, errors, index, entry);

  const variableCount = (snapshot.collections ?? []).reduce((count, collection) => count + collection.variables.length, 0);
  const textStyleCount = snapshot.textStyles?.length ?? 0;
  if (rows.length !== variableCount + textStyleCount) {
    errors.push(`数据行数 ${rows.length} ≠ 变量 ${variableCount} + Text Style ${textStyleCount}`);
  }
  const badLineHeight = rows.filter((row) => row.layer === "TextStyle" && row.lineHeight !== "Auto");
  if (badLineHeight.length) errors.push(`${badLineHeight.length} 个 TextStyle 行的 lineHeight 不是 Auto`);

  const byType = {};
  const byLayer = {};
  const groupsByName = new Map();
  for (const row of rows) {
    byType[row.type] = (byType[row.type] ?? 0) + 1;
    byLayer[row.layer] = (byLayer[row.layer] ?? 0) + 1;
    const groups = groupsByName.get(row.name) ?? [];
    groups.push(row.group);
    groupsByName.set(row.name, groups);
  }
  const duplicates = [...groupsByName.entries()]
    .filter(([, groups]) => groups.length > 1)
    .map(([name, groups]) => ({ name, groups }));

  return {
    ok: errors.length === 0,
    csv: renderGitlabCsv(rows),
    rows,
    errors,
    report: { rows: rows.length, variableCount, textStyleCount, byType, byLayer, duplicates },
  };
}

export function formatReport(report) {
  const types = Object.entries(report.byType).map(([name, count]) => `${name} ${count}`).join("，");
  const layers = Object.entries(report.byLayer).map(([name, count]) => `${name} ${count}`).join("，");
  const lines = [
    `CSV ${report.rows} 行 = 变量 ${report.variableCount} + Text Style ${report.textStyleCount}`,
    `type  ${types}`,
    `layer  ${layers}`,
    `去前缀后重名 ${report.duplicates.length} 组`,
  ];
  for (const duplicate of report.duplicates) {
    lines.push(`  ${duplicate.name}`);
    for (const group of duplicate.groups) lines.push(`    ${group}`);
  }
  return lines.join("\n");
}

/** 预览时基线还没写回：增量包校验和已一致则直接用基线，否则在内存里还原。 */
export function snapshotFromDelta(base, parts) {
  const verified = verifySnapshot(base);
  if (!parts?.length) return verified;
  const skeleton = parts.find((part) => part?.part === 0);
  if (skeleton?.checksum === verified.checksum) return verified;
  return applyDelta(verified, parts).snapshot;
}

function parseArgs(argv) {
  const args = {
    snapshot: path.join(process.cwd(), "figma-token", "figma-variables.json"),
    out: "",
    delta: "",
  };
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];
    const next = () => {
      const value = argv[++i];
      if (!value) throw new Error(`${flag} 需要参数`);
      return value;
    };
    if (flag === "--snapshot") args.snapshot = next();
    else if (flag === "--out") args.out = next();
    else if (flag === "--delta") args.delta = next();
    else throw new Error(`未知参数 ${flag}`);
  }
  if (!args.out) {
    const now = new Date();
    const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
    args.out = path.join(process.cwd(), "exports", `HyperOS_Design_Token_${stamp}.csv`);
  }
  return args;
}

async function readDelta(deltaPath) {
  if (statSync(deltaPath).isDirectory()) {
    const names = (await readdir(deltaPath)).filter((name) => name.endsWith(".json")).sort();
    return Promise.all(names.map(async (name) => JSON.parse(await readFile(path.join(deltaPath, name), "utf8"))));
  }
  return [JSON.parse(await readFile(deltaPath, "utf8"))];
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  let snapshot = verifySnapshot(JSON.parse(await readFile(args.snapshot, "utf8")));
  if (args.delta) snapshot = snapshotFromDelta(snapshot, await readDelta(args.delta));
  const result = exportGitlabCsv(snapshot);
  console.log(formatReport(result.report));
  if (!result.ok) {
    console.error(result.errors.slice(0, 30).join("\n"));
    process.exit(1);
  }
  await mkdir(path.dirname(args.out), { recursive: true });
  await writeFile(args.out, result.csv, "utf8");
  console.log(`已写入 ${path.relative(process.cwd(), args.out)}`);
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (isMain) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
