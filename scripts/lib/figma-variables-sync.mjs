/**
 * Figma Variables + Text Styles（经 Figma MCP use_figma 读取）↔ 应用 Figma Native JSON 的同步核心逻辑。
 *
 * 为什么需要“增量包”：Figma 远程 MCP 只能由 AI 客户端（OAuth）调用，插件沙箱里没有 fetch，
 * 数据只能经 use_figma 的返回值传回本机。为控制传输体积，插件只回传「内容哈希不在已知清单里」
 * 的条目，其余以哈希占位；本地用基线（figma-token/figma-variables.json）还原，并用整体校验和
 * 保证还原结果与 Figma 端完全一致（包括抄写/传输错误）。
 *
 * 变量规范条目（不含 id，别名按名称引用）：
 *   [name, type, values[], scopes[], description, codeSyntax]
 *   - type：Figma resolvedType —— COLOR | FLOAT | STRING | BOOLEAN
 *   - values：按 Collection modes 顺序
 *       COLOR → [r, g, b, a]（float32 最短十进制）
 *       FLOAT → number（float32 最短十进制）
 *       STRING / BOOLEAN → 原值
 *       别名 → ["@", 目标 Collection 名, 目标变量名]；无法解析的别名 → ["@?", Figma VariableID]
 *   - 哈希 = cyrb53(JSON.stringify([collectionName, ...entry]))
 *
 * Text Style 规范条目（一个 Figma Text Style = 一个 TYPOGRAPHY Token）：
 *   [name, description, [[field, value], ...]]
 *   - field 按 TEXT_STYLE_FIELDS 顺序；letterSpacing / paragraphSpacing 仅在绑定变量或非 0 时出现
 *   - value：绑定了 Variable 时为别名 ["@", Collection 名, 变量名]（保留引用链），否则为字面值
 *     （fontFamily / fontStyle 字符串；fontSize / lineHeight / letterSpacing / paragraphSpacing 像素数值）
 *   - 哈希 = cyrb53(JSON.stringify(["@textStyle", ...entry]))
 */

export const DELTA_FORMAT = "figma-variables-delta@2";
export const SNAPSHOT_FORMAT = "figma-variables@1";
export const TEXT_STYLE_KEY = "@textStyle";
export const TEXT_STYLE_GROUP = "text_style";
export const TEXT_STYLE_DEFAULT_COLLECTION = "Semantic Token";
export const TEXT_STYLE_FIELDS = ["fontFamily", "fontStyle", "fontSize", "lineHeight", "letterSpacing", "paragraphSpacing"];

/** 53-bit 字符串哈希（cyrb53），base36 输出。插件端通过 toString() 注入同一实现。 */
export function cyrb53(str) {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}

/** Figma 以 float32 存储数值；返回能无损还原为同一 float32 的最短十进制。 */
export function f32(x) {
  if (typeof x !== "number" || !Number.isFinite(x)) throw new Error(`非法数值 ${x}`);
  const target = Math.fround(x);
  for (let p = 1; p <= 9; p++) {
    const candidate = Number(x.toPrecision(p));
    if (Math.fround(candidate) === target) return candidate;
  }
  return target;
}

export function sortKeys(obj) {
  return Object.fromEntries(Object.keys(obj ?? {}).sort().map((key) => [key, obj[key]]));
}

export function entryHash(collectionName, entry) {
  return cyrb53(JSON.stringify([collectionName, ...entry]));
}

/**
 * 整体校验和：覆盖 Collection 名称、Mode 名称、所有条目哈希的顺序，以及 Text Style 哈希顺序。
 * textStyles 为 undefined 表示旧版基线（不含 Text Style），保持旧的计算方式以兼容。
 */
export function canonicalChecksum(collections, textStyles) {
  const parts = collections.map((c) => [c.name, c.modes, c.variables.map((entry) => entryHash(c.name, entry))]);
  if (textStyles) parts.push([TEXT_STYLE_KEY, textStyles.map((entry) => entryHash(TEXT_STYLE_KEY, entry))]);
  return cyrb53(JSON.stringify(parts));
}

function baseEntries(canonical) {
  const entries = [];
  for (const c of canonical.collections) for (const e of c.variables) entries.push([entryHash(c.name, e), e]);
  for (const e of canonical.textStyles ?? []) entries.push([entryHash(TEXT_STYLE_KEY, e), e]);
  return entries;
}

export function knownHashes(canonical) {
  return [...new Set(baseEntries(canonical).map(([h]) => h))].sort();
}

/** 已知哈希清单的校验和，用于确认 apply 使用的基线与生成插件代码时一致。 */
export function knownChecksum(hashes) {
  return cyrb53(JSON.stringify(hashes));
}

// ---------------------------------------------------------------------------
// 插件代码（在 Figma 中通过 use_figma 执行）
// ---------------------------------------------------------------------------

/* global figma, KNOWN, BASE, FORMAT, PART, PAGE_BYTES -- 仅在 Figma 插件沙箱中求值，由 buildPluginCode 注入 */
async function pluginBody() {
  if (cyrb53(JSON.stringify([...KNOWN])) !== BASE) throw new Error("KNOWN 清单与 BASE 不一致：插件代码被改动或粘贴不完整");
  const cols = await figma.variables.getLocalVariableCollectionsAsync();
  const vars = await figma.variables.getLocalVariablesAsync();
  const styles = await figma.getLocalTextStylesAsync();
  const byId = new Map(vars.map((v) => [v.id, v]));
  const colById = new Map(cols.map((c) => [c.id, c]));
  const unresolved = [];
  const missingModes = [];
  const unsupported = [];
  const alias = (owner, id) => {
    const t = byId.get(id);
    if (!t) {
      unresolved.push(owner);
      return ["@?", id];
    }
    return ["@", colById.get(t.variableCollectionId).name, t.name];
  };
  const enc = (v, val) => {
    if (val && typeof val === "object" && val.type === "VARIABLE_ALIAS") return alias(v.name, val.id);
    if (v.resolvedType === "COLOR") return [f32(val.r), f32(val.g), f32(val.b), f32(val.a ?? 1)];
    if (v.resolvedType === "FLOAT") return f32(val);
    return val;
  };
  const utf8 = (s) => {
    let n = 0;
    for (const ch of s) {
      const cp = ch.codePointAt(0);
      n += cp < 0x80 ? 1 : cp < 0x800 ? 2 : cp < 0x10000 ? 3 : 4;
    }
    return n;
  };
  const collections = [];
  const full = [];
  for (const c of cols) {
    const hashes = [];
    for (const id of c.variableIds) {
      const v = byId.get(id);
      if (!v) continue;
      const values = c.modes.map((m) => {
        const val = v.valuesByMode[m.modeId];
        if (val === undefined) {
          missingModes.push(`${c.name}/${v.name} [${m.name}]`);
          return null;
        }
        return enc(v, val);
      });
      const entry = [v.name, v.resolvedType, values, [...v.scopes], v.description || "", sortKeys(v.codeSyntax)];
      const h = cyrb53(JSON.stringify([c.name, ...entry]));
      hashes.push(h);
      if (!KNOWN.has(h)) full.push([h, entry]);
    }
    collections.push({ name: c.name, modes: c.modes.map((m) => m.name), hashes });
  }
  // Text Style：绑定了 Variable 的字段输出别名（保留引用链），否则输出像素字面值
  const textStyles = [];
  for (const s of styles) {
    const bound = s.boundVariables || {};
    const ref = (field) => (bound[field] ? alias(`text style ${s.name}.${field}`, bound[field].id) : undefined);
    const px = (value, field) => {
      if (value.unit === "PIXELS") return f32(value.value);
      if (value.unit === "PERCENT") return f32((value.value * s.fontSize) / 100);
      unsupported.push(`${s.name}.${field} = ${value.unit}`);
      return null;
    };
    const fields = [
      ["fontFamily", ref("fontFamily") ?? s.fontName.family],
      ["fontStyle", ref("fontStyle") ?? s.fontName.style],
      ["fontSize", ref("fontSize") ?? f32(s.fontSize)],
      ["lineHeight", ref("lineHeight") ?? px(s.lineHeight, "lineHeight")],
    ];
    const letterSpacing = ref("letterSpacing") ?? px(s.letterSpacing, "letterSpacing");
    if (Array.isArray(letterSpacing) || letterSpacing) fields.push(["letterSpacing", letterSpacing]);
    const paragraphSpacing = ref("paragraphSpacing") ?? f32(s.paragraphSpacing);
    if (Array.isArray(paragraphSpacing) || paragraphSpacing) fields.push(["paragraphSpacing", paragraphSpacing]);
    const entry = [s.name, s.description || "", fields];
    const h = cyrb53(JSON.stringify(["@textStyle", ...entry]));
    textStyles.push(h);
    if (!KNOWN.has(h)) full.push([h, entry]);
  }
  const checksum = cyrb53(
    JSON.stringify([...collections.map((c) => [c.name, c.modes, c.hashes]), ["@textStyle", textStyles]])
  );
  const pages = [];
  let page = [];
  let size = 0;
  for (const item of full) {
    const n = utf8(JSON.stringify(item)) + 1;
    if (page.length && size + n > PAGE_BYTES) {
      pages.push(page);
      page = [];
      size = 0;
    }
    page.push(item);
    size += n;
  }
  if (page.length) pages.push(page);
  const head = { format: FORMAT, base: BASE, checksum, pages: pages.length, part: PART };
  if (PART === 0) {
    return {
      ...head,
      exportedAt: new Date().toISOString(),
      changed: full.length,
      unresolved,
      missingModes,
      unsupported,
      collections,
      textStyles,
    };
  }
  if (!pages[PART - 1]) throw new Error(`PART 应在 0..${pages.length} 之间`);
  return { ...head, entries: pages[PART - 1] };
}

/**
 * 生成可直接粘贴到 use_figma 的插件代码（顶层 await + return）。
 * use_figma 返回值上限约 20KB，因此分页：part 0 返回哈希骨架与总页数，part 1..N 返回变化条目。
 */
export function buildPluginCode(hashes, part = 0, pageBytes = 16000) {
  const body = pluginBody
    .toString()
    .replace(/^async function pluginBody\(\) \{/, "")
    .replace(/\}$/, "");
  return [
    "// 由 scripts/sync-figma-variables.mjs plugin 生成；只读，不修改 Figma 文件",
    `const PART = ${Number(part)}; // 0 = 哈希骨架（含总页数 pages），1..pages = 变化条目分页`,
    `const PAGE_BYTES = ${Number(pageBytes)};`,
    `const FORMAT = ${JSON.stringify(DELTA_FORMAT)};`,
    `const BASE = ${JSON.stringify(knownChecksum(hashes))};`,
    `const KNOWN = new Set(${JSON.stringify(hashes)});`,
    cyrb53.toString(),
    f32.toString(),
    sortKeys.toString(),
    body.trim(),
  ].join("\n");
}

// ---------------------------------------------------------------------------
// 增量包（骨架 + 分页）→ 完整规范快照
// ---------------------------------------------------------------------------

export function applyDelta(base, parts) {
  const skeleton = parts.find((p) => p?.part === 0);
  if (!skeleton) throw new Error("缺少 part 0（哈希骨架）");
  for (const p of parts) {
    if (p?.format !== DELTA_FORMAT) throw new Error(`增量包格式应为 ${DELTA_FORMAT}，实际为 ${p?.format}（请用当前脚本重新生成插件代码）`);
    if (p.base !== skeleton.base || p.checksum !== skeleton.checksum || p.pages !== skeleton.pages) {
      throw new Error(`part ${p.part} 与骨架不属于同一次导出（base / checksum / pages 不一致）`);
    }
  }
  const pageParts = parts.filter((p) => p.part !== 0).map((p) => p.part).sort((a, b) => a - b);
  const expected = Array.from({ length: skeleton.pages }, (_, i) => i + 1);
  if (JSON.stringify(pageParts) !== JSON.stringify(expected)) {
    throw new Error(`分页不完整：需要 part ${expected.join(", ") || "（无）"}，实际为 ${pageParts.join(", ") || "（无）"}`);
  }
  if (skeleton.base !== knownChecksum(knownHashes(base))) {
    throw new Error("增量包与当前基线不匹配：请用当前基线重新执行 plugin 生成插件代码后再导出");
  }
  const problems = [
    ...(skeleton.unresolved ?? []).map((x) => `无法解析的别名（引用了非本地变量）：${x}`),
    ...(skeleton.missingModes ?? []).map((x) => `缺失的 Mode 值：${x}`),
    ...(skeleton.unsupported ?? []).map((x) => `不支持的 Text Style 取值：${x}`),
  ];
  if (problems.length) throw new Error(`Figma 端数据校验失败（${problems.length} 项）：\n  ${problems.slice(0, 20).join("\n  ")}`);

  const byHash = new Map(baseEntries(base));
  const sent = new Map();
  for (const p of parts) for (const [h, entry] of p.entries ?? []) sent.set(h, entry);

  const used = new Set();
  const resolve = (label) => (h) => {
    const entry = sent.get(h) ?? byHash.get(h);
    if (!entry) throw new Error(`找不到哈希 ${h}（${label}）对应的条目`);
    used.add(h);
    return entry;
  };
  const collections = skeleton.collections.map((c) => ({
    name: c.name,
    modes: c.modes,
    variables: c.hashes.map(resolve(c.name)),
  }));
  const textStyles = (skeleton.textStyles ?? []).map(resolve("Text Style"));
  const unused = [...sent.keys()].filter((h) => !used.has(h));
  if (unused.length) throw new Error(`分页中有 ${unused.length} 个条目不在骨架内：${unused.slice(0, 5).join(", ")}`);

  const checksum = canonicalChecksum(collections, textStyles);
  if (checksum !== skeleton.checksum) {
    throw new Error(`还原后校验和 ${checksum} ≠ Figma 端 ${skeleton.checksum}，增量包可能被截断或抄写有误`);
  }
  return {
    snapshot: { format: SNAPSHOT_FORMAT, exportedAt: skeleton.exportedAt, checksum, collections, textStyles },
    changed: sent.size,
  };
}

export function verifySnapshot(snapshot) {
  if (snapshot?.format !== SNAPSHOT_FORMAT) throw new Error(`快照格式应为 ${SNAPSHOT_FORMAT}`);
  const checksum = canonicalChecksum(snapshot.collections, snapshot.textStyles);
  if (checksum !== snapshot.checksum) throw new Error(`快照校验和不一致（${checksum} ≠ ${snapshot.checksum}）`);
  return snapshot;
}

// ---------------------------------------------------------------------------
// Figma Native ↔ 规范快照
// ---------------------------------------------------------------------------

const NATIVE_TYPE = { COLOR: "COLOR", FLOAT: "NUMBER", STRING: "STRING", BOOLEAN: "BOOLEAN" };
const FIGMA_TYPE = { COLOR: "COLOR", NUMBER: "FLOAT", STRING: "STRING", BOOLEAN: "BOOLEAN" };
const TEXT_STYLE_PREFIX = `${TEXT_STYLE_GROUP}/`;

/** 是否为由 Figma Text Style 管理的 TYPOGRAPHY Token（名称位于 text_style/ 分组下）。 */
export function isManagedTextStyle(variable) {
  return variable?.type === "TYPOGRAPHY" && variable.name.startsWith(TEXT_STYLE_PREFIX);
}

/** 从现有 Figma Native JSON（种子或 currentJson）推导规范快照，用作首次同步的基线。 */
export function nativeToCanonical(json) {
  const collectionOf = new Map();
  for (const c of json.collections) for (const id of c.variableIds) collectionOf.set(id, c);

  const aliasOf = (id) => {
    const target = json.variables[id];
    const targetCollection = collectionOf.get(id);
    if (!target || !targetCollection) return ["@?", id];
    return ["@", targetCollection.name, target.name];
  };
  const encodeValue = (raw) => {
    if (!raw) return null;
    if (raw.type === "ALIAS") return aliasOf(raw.id);
    if (raw.type === "COLOR") {
      const { r, g, b, a } = raw.value;
      return [f32(r), f32(g), f32(b), f32(a ?? 1)];
    }
    if (raw.type === "NUMBER") return f32(raw.value);
    return raw.value;
  };

  const collections = json.collections.map((c) => ({
    name: c.name,
    modes: c.modes.map((m) => m.name),
    variables: c.variableIds
      .map((id) => json.variables[id])
      .filter((v) => v && v.type in FIGMA_TYPE)
      .map((v) => [
        v.name,
        FIGMA_TYPE[v.type],
        c.modes.map((m) => encodeValue(v.valuesByMode[m.modeId])),
        [...(v.scopes ?? [])],
        v.description ?? "",
        sortKeys(v.codeSyntax),
      ]),
  }));

  // Text Style 没有 Mode：取 Collection 第一个 Mode 的值（整体别名的 TYPOGRAPHY 无法对应 Figma Text Style，跳过）
  const textStyles = [];
  for (const c of json.collections) {
    for (const id of c.variableIds) {
      const v = json.variables[id];
      if (!isManagedTextStyle(v)) continue;
      const raw = v.valuesByMode[c.modes[0]?.modeId];
      if (raw?.type !== "TYPOGRAPHY") continue;
      const fields = TEXT_STYLE_FIELDS.filter((field) => raw.value[field]).map((field) => {
        const f = raw.value[field];
        return [field, f.type === "ALIAS" ? aliasOf(f.id) : f.type === "NUMBER" ? f32(f.value) : f.value];
      });
      textStyles.push([v.name.slice(TEXT_STYLE_PREFIX.length), v.description ?? "", fields]);
    }
  }

  return {
    format: SNAPSHOT_FORMAT,
    exportedAt: null,
    checksum: canonicalChecksum(collections, textStyles),
    collections,
    textStyles,
  };
}

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "") || "x";
const key = (collectionName, name) => `${collectionName}\u0000${name}`;

/**
 * 把规范快照转换为 Figma Native JSON，并尽量复用目标文档已有的 id：
 * Collection 按名称、Mode 按名称、变量按「Collection 名 + 变量名」匹配；新增项分配新 id。
 *
 * Text Style：
 * - 快照含 textStyles 时，text_style/ 分组下的 TYPOGRAPHY Token 完全以 Figma 为准（新增 / 修改 / 删除），
 *   放在原所在 Collection（默认 Semantic Token）的末尾；绑定的 Variable 转为字段别名，保留引用链；
 *   codeSyntax 沿用目标文档已有值（Figma Text Style 无 codeSyntax），新增时默认为 { ANDROID: 样式名末段 }。
 * - 其他 TYPOGRAPHY Token（非 text_style/，或旧版基线不含 textStyles 时的全部 TYPOGRAPHY）原样保留。
 */
export function canonicalToNative(snapshot, target) {
  const manageTextStyles = Array.isArray(snapshot.textStyles);
  const targetCollectionByName = new Map(target.collections.map((c) => [c.name, c]));
  const targetCollectionOf = new Map();
  for (const c of target.collections) for (const id of c.variableIds) targetCollectionOf.set(id, c);

  const existingIds = new Map();
  const existingTextStyles = new Map();
  for (const [id, v] of Object.entries(target.variables)) {
    const c = targetCollectionOf.get(id);
    if (!c) continue;
    if (v.type !== "TYPOGRAPHY") existingIds.set(key(c.name, v.name), id);
    else if (manageTextStyles && isManagedTextStyle(v)) existingTextStyles.set(v.name, { id, variable: v, collection: c.name });
  }
  const isPreserved = (v) => v?.type === "TYPOGRAPHY" && !(manageTextStyles && isManagedTextStyle(v));

  let maxId = -1;
  for (const id of Object.keys(target.variables)) {
    const match = /^var_(\d+)$/.exec(id);
    if (match) maxId = Math.max(maxId, Number(match[1]));
  }
  // 保留的 TYPOGRAPHY 先占用 id，避免被新变量复用
  const usedIds = new Set(Object.entries(target.variables).filter(([, v]) => isPreserved(v)).map(([id]) => id));
  const claim = (existing) => {
    const id = existing && !usedIds.has(existing) ? existing : `var_${++maxId}`;
    usedIds.add(id);
    return id;
  };
  const idFor = new Map();
  for (const c of snapshot.collections) {
    for (const [name] of c.variables) {
      const k = key(c.name, name);
      if (idFor.has(k)) throw new Error(`Collection「${c.name}」中存在重名变量 ${name}`);
      idFor.set(k, claim(existingIds.get(k)));
    }
  }

  // Text Style 的目标 Collection：沿用已有 text_style Token 所在 Collection，否则默认 Semantic Token
  const textStyleCollection =
    [...existingTextStyles.values()][0]?.collection ?? TEXT_STYLE_DEFAULT_COLLECTION;
  const textStyleIds = new Map();
  if (manageTextStyles && snapshot.textStyles.length) {
    if (!snapshot.collections.some((c) => c.name === textStyleCollection)) {
      throw new Error(`Text Style 需要放入 Collection「${textStyleCollection}」，但 Figma 中不存在该 Collection`);
    }
    for (const [name] of snapshot.textStyles) {
      const fullName = `${TEXT_STYLE_PREFIX}${name}`;
      if (textStyleIds.has(fullName)) throw new Error(`存在重名 Text Style ${name}`);
      textStyleIds.set(fullName, claim(existingTextStyles.get(fullName)?.id));
    }
  }

  const unresolved = [];
  const resolveAlias = (owner, value) => {
    const id = value[0] === "@" ? idFor.get(key(value[1], value[2])) : undefined;
    if (!id) unresolved.push(`${owner} → ${value.slice(1).join("/")}`);
    return id;
  };
  const isAlias = (value) => Array.isArray(value) && (value[0] === "@" || value[0] === "@?");

  const variables = {};
  const collectionsOut = [];
  const usedCollectionIds = new Set(target.collections.map((c) => c.id));

  for (const c of snapshot.collections) {
    const existing = targetCollectionByName.get(c.name);
    let collectionId = existing?.id;
    if (!collectionId) {
      collectionId = `col_${slug(c.name)}`;
      while (usedCollectionIds.has(collectionId)) collectionId += "_";
      usedCollectionIds.add(collectionId);
    }
    const modes = c.modes.map((name) => ({
      modeId: existing?.modes.find((m) => m.name === name)?.modeId ?? `mode_${slug(name)}`,
      name,
    }));

    const decode = (ownerName, type, value) => {
      if (isAlias(value)) {
        const id = resolveAlias(`${c.name}/${ownerName}`, value);
        return id ? { type: "ALIAS", id } : null;
      }
      if (type === "COLOR") {
        const [r, g, b, a] = value.map(Math.fround);
        return { type: "COLOR", value: { r, g, b, a } };
      }
      if (type === "FLOAT") return { type: "NUMBER", value: Math.fround(value) };
      return { type, value };
    };

    const variableIds = [];
    for (const [name, type, values, scopes, description, codeSyntax] of c.variables) {
      if (!(type in NATIVE_TYPE)) throw new Error(`${c.name}/${name}: 不支持的类型 ${type}`);
      const id = idFor.get(key(c.name, name));
      const valuesByMode = {};
      modes.forEach((mode, index) => {
        const decoded = decode(name, type, values[index]);
        if (decoded) valuesByMode[mode.modeId] = decoded;
      });
      variables[id] = {
        id,
        name,
        type: NATIVE_TYPE[type],
        valuesByMode,
        ...(description ? { description } : {}),
        scopes: [...scopes],
        codeSyntax: { ...codeSyntax },
      };
      variableIds.push(id);
    }

    // Figma Text Style → TYPOGRAPHY（各 Mode 取相同值）
    if (manageTextStyles && c.name === textStyleCollection) {
      for (const [name, description, fields] of snapshot.textStyles) {
        const fullName = `${TEXT_STYLE_PREFIX}${name}`;
        const id = textStyleIds.get(fullName);
        const value = {};
        for (const [field, fieldValue] of fields) {
          if (isAlias(fieldValue)) {
            const refId = resolveAlias(`Text Style ${name}.${field}`, fieldValue);
            if (refId) value[field] = { type: "ALIAS", id: refId };
          } else {
            value[field] = { type: TYPOGRAPHY_FIELD_TYPES[field], value: fieldValue };
          }
        }
        const previous = existingTextStyles.get(fullName)?.variable;
        variables[id] = {
          id,
          name: fullName,
          type: "TYPOGRAPHY",
          valuesByMode: Object.fromEntries(
            modes.map((mode) => [mode.modeId, { type: "TYPOGRAPHY", value: structuredClone(value) }])
          ),
          ...(description ? { description } : {}),
          codeSyntax: previous?.codeSyntax ? { ...previous.codeSyntax } : { ANDROID: name.split("/").pop() },
        };
        variableIds.push(id);
      }
    }

    // 保留目标文档中不由 Figma Text Style 管理的 TYPOGRAPHY Token
    for (const id of existing?.variableIds ?? []) {
      const v = target.variables[id];
      if (!isPreserved(v)) continue;
      if (variables[id]) throw new Error(`TYPOGRAPHY Token ${v.name} 的 id ${id} 与新变量冲突`);
      variables[id] = structuredClone(v);
      variableIds.push(id);
    }

    collectionsOut.push({ id: collectionId, name: c.name, modes, variableIds });
  }

  // 目标文档中 Figma 已不存在、但仍有需保留 TYPOGRAPHY 的 Collection：保留
  for (const c of target.collections) {
    if (snapshot.collections.some((s) => s.name === c.name)) continue;
    const typography = c.variableIds.filter((id) => isPreserved(target.variables[id]));
    if (typography.length === 0) continue;
    for (const id of typography) variables[id] = structuredClone(target.variables[id]);
    collectionsOut.push({ ...structuredClone(c), variableIds: typography });
  }

  // Collection 顺序：沿用目标文档顺序，新增 Collection 追加在末尾
  const order = target.collections.map((c) => c.name);
  collectionsOut.sort((a, b) => {
    const ia = order.indexOf(a.name);
    const ib = order.indexOf(b.name);
    return (ia < 0 ? Infinity : ia) - (ib < 0 ? Infinity : ib);
  });

  const json = { collections: collectionsOut, variables };
  const errors = [...unresolved.map((u) => `未解析别名：${u}`), ...validateTypography(json)];
  if (errors.length) throw new Error(`转换校验失败，未写入任何数据：\n  ${errors.slice(0, 30).join("\n  ")}`);
  return json;
}

const TYPOGRAPHY_FIELD_TYPES = {
  fontFamily: "STRING",
  fontStyle: "STRING",
  fontSize: "NUMBER",
  lineHeight: "NUMBER",
  letterSpacing: "NUMBER",
  paragraphSpacing: "NUMBER",
};

/** TYPOGRAPHY Token 必须包含必填字段，字段别名必须指向类型正确的变量。 */
function validateTypography(json) {
  const errors = [];
  for (const v of Object.values(json.variables)) {
    if (v.type !== "TYPOGRAPHY") continue;
    for (const [modeId, raw] of Object.entries(v.valuesByMode)) {
      if (raw.type === "ALIAS") {
        if (json.variables[raw.id]?.type !== "TYPOGRAPHY") errors.push(`${v.name} [${modeId}] 整体别名 ${raw.id} 无效`);
        continue;
      }
      for (const field of ["fontFamily", "fontStyle", "fontSize", "lineHeight"]) {
        if (!raw.value?.[field]) errors.push(`${v.name} [${modeId}] 缺少字段 ${field}`);
      }
      for (const [field, fieldValue] of Object.entries(raw.value ?? {})) {
        if (fieldValue?.type !== "ALIAS") continue;
        const ref = json.variables[fieldValue.id];
        const expected = TYPOGRAPHY_FIELD_TYPES[field];
        if (!ref) errors.push(`${v.name}.${field} [${modeId}] 引用的 ${fieldValue.id} 已在 Figma 中删除`);
        else if (expected && ref.type !== expected) errors.push(`${v.name}.${field} 引用的 ${ref.name} 类型为 ${ref.type}，应为 ${expected}`);
      }
    }
  }
  return errors;
}

/** 两份 Native JSON 的差异摘要（按 Collection 名 + 变量名）。 */
export function diffNative(before, after) {
  const index = (json) => {
    const map = new Map();
    for (const c of json.collections) {
      for (const id of c.variableIds) {
        const v = json.variables[id];
        if (v) map.set(`${c.name}/${v.name}`, v);
      }
    }
    return map;
  };
  const a = index(before);
  const b = index(after);
  const added = [...b.keys()].filter((k) => !a.has(k));
  const removed = [...a.keys()].filter((k) => !b.has(k));
  const changed = [...b.keys()].filter((k) => a.has(k) && JSON.stringify(a.get(k)) !== JSON.stringify(b.get(k)));
  return { added, removed, changed };
}

export function summarize(json) {
  const typography = Object.values(json.variables).filter((v) => v.type === "TYPOGRAPHY").length;
  return {
    total: Object.keys(json.variables).length,
    typography,
    collections: json.collections.map((c) => `${c.name}: ${c.variableIds.length}`),
  };
}
