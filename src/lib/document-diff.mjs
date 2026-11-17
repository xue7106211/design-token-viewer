/**
 * 比较两份 Figma Native 文档，生成导入日志用的变化明细。
 * 同时被服务端 import（service.ts）和 sync-figma-variables.mjs 的 --db 写入使用，
 * 因此写成无依赖的 .mjs。
 *
 * Token 以「Collection 名/变量名」为键，不依赖变量 id。
 */

export const DIFF_LIST_LIMIT = 300;

function index(json) {
  const map = new Map();
  for (const collection of json?.collections ?? []) {
    const modeNames = new Map((collection.modes ?? []).map((m) => [m.modeId, m.name]));
    for (const id of collection.variableIds ?? []) {
      const variable = json.variables?.[id];
      if (variable) map.set(`${collection.name}/${variable.name}`, { variable, modeNames });
    }
  }
  return map;
}

function keysById(json) {
  const map = new Map();
  for (const collection of json?.collections ?? []) {
    for (const id of collection.variableIds ?? []) {
      const variable = json.variables?.[id];
      if (variable) map.set(id, `${collection.name}/${variable.name}`);
    }
  }
  return map;
}

/** 别名的 id 在两份文档里可能不同，改成可读的目标名再比较和展示 */
function displayValue(keys, value) {
  if (value && typeof value === "object" && value.type === "ALIAS" && typeof value.id === "string") {
    return { type: "ALIAS", name: keys.get(value.id) ?? value.id };
  }
  if (value && typeof value === "object" && value.type === "TYPOGRAPHY" && value.value) {
    const fields = {};
    for (const [field, fieldValue] of Object.entries(value.value)) fields[field] = displayValue(keys, fieldValue);
    return { ...value, value: fields };
  }
  return value;
}

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/**
 * @param {unknown} before
 * @param {unknown} after
 * @param {{ limit?: number }} [options]
 * @returns {{
 *   counts: { added: number, removed: number, changed: number },
 *   added: string[],
 *   removed: string[],
 *   changed: { name: string, values: { mode: string, before: unknown, after: unknown }[], fields: string[] }[],
 * }}
 */
export function diffDocuments(before, after, options = {}) {
  const limit = options.limit ?? DIFF_LIST_LIMIT;
  const a = index(before);
  const b = index(after);

  const added = [...b.keys()].filter((key) => !a.has(key));
  const removed = [...a.keys()].filter((key) => !b.has(key));
  const changed = [];
  const keysBefore = keysById(before);
  const keysAfter = keysById(after);

  for (const [key, next] of b) {
    const prev = a.get(key);
    if (!prev) continue;
    const values = [];
    const modeIds = new Set([...Object.keys(prev.variable.valuesByMode ?? {}), ...Object.keys(next.variable.valuesByMode ?? {})]);
    for (const modeId of modeIds) {
      const oldValue = displayValue(keysBefore, prev.variable.valuesByMode?.[modeId]);
      const newValue = displayValue(keysAfter, next.variable.valuesByMode?.[modeId]);
      if (!same(oldValue, newValue)) {
        values.push({
          mode: next.modeNames.get(modeId) ?? prev.modeNames.get(modeId) ?? modeId,
          before: oldValue ?? null,
          after: newValue ?? null,
        });
      }
    }
    const fields = ["type", "description", "scopes", "codeSyntax"].filter(
      (field) => !same(prev.variable[field] ?? null, next.variable[field] ?? null),
    );
    if (values.length > 0 || fields.length > 0) changed.push({ name: key, values, fields });
  }

  return {
    counts: { added: added.length, removed: removed.length, changed: changed.length },
    added: added.slice(0, limit),
    removed: removed.slice(0, limit),
    changed: changed.slice(0, limit),
  };
}
