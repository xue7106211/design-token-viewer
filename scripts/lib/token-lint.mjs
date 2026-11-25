/**
 * 同步写入前的规范检查。只拦名称上的机械问题和已知错误词，不套用命名工具的完整句式。
 * 描述里的已知错误词只提醒，不阻止写入。名称问题未通过时，调用方必须停止写入种子、快照、Neon 和 CSV。
 */

const SNAKE_CASE = /^[a-z0-9]+(?:_[a-z0-9]+)*$/;

/** 名称里出现则阻止写入；描述里出现则只提醒。追加时保持小写英文或原文。 */
export const KNOWN_MISTAKES = ["tittle", "这招"];

function issue(code, collection, name, message, severity = "error") {
  return { code, collection, name, message, severity };
}

function inspectName(issues, collection, name) {
  const segments = String(name ?? "").split("/").filter((segment) => segment.length > 0);
  const leaf = segments[segments.length - 1] ?? "";
  if (/ \d+$/.test(leaf)) {
    issues.push(issue("duplicate_suffix", collection, name, `名称带有 Figma 重名后缀「${leaf.match(/ \d+$/)[0]}」`));
  } else if (segments.some((segment) => /\s/.test(segment)) || /\s/.test(String(name ?? ""))) {
    issues.push(issue("whitespace", collection, name, "名称含空白"));
  } else if (segments.length === 0 || segments.some((segment) => !SNAKE_CASE.test(segment))) {
    issues.push(issue("not_snake_case", collection, name, "名称必须是小写 snake_case（路径每段仅 a-z、0-9 与下划线）"));
  }
  inspectMistakes(issues, collection, name, String(name ?? ""), "名称", "error");
}

function inspectMistakes(issues, collection, name, text, field, severity) {
  if (typeof text !== "string" || text.length === 0) return;
  for (const word of KNOWN_MISTAKES) {
    if (text.includes(word)) {
      issues.push(issue("known_mistake", collection, name, `${field}含有「${word}」`, severity));
    }
  }
}

function lintNative(json) {
  const issues = [];
  for (const collection of json.collections ?? []) {
    for (const id of collection.variableIds ?? []) {
      const variable = json.variables?.[id];
      if (!variable) continue;
      inspectName(issues, collection.name, variable.name);
      inspectMistakes(issues, collection.name, variable.name, variable.description ?? "", "描述", "warning");
    }
  }
  return issues;
}

function lintCanonical(json) {
  const issues = [];
  for (const collection of json.collections ?? []) {
    for (const entry of collection.variables ?? []) {
      const [name, , , , description] = entry;
      inspectName(issues, collection.name, name);
      inspectMistakes(issues, collection.name, name, description ?? "", "描述", "warning");
    }
  }
  for (const entry of json.textStyles ?? []) {
    const [name, description] = entry;
    inspectName(issues, "Text Style", name);
    inspectMistakes(issues, "Text Style", name, description ?? "", "描述", "warning");
  }
  return issues;
}

export function lintTokenDocument(json) {
  if (json?.variables && Array.isArray(json?.collections)) return lintNative(json);
  if (Array.isArray(json?.collections)) return lintCanonical(json);
  throw new Error("无法识别的 Token 文档");
}

export function formatTokenLint(issues) {
  return issues
    .map((item) => `${item.severity === "warning" ? "提醒" : "阻止"}  ${item.code}  ${item.collection}/${item.name}  ${item.message}`)
    .join("\n");
}

export function partitionTokenLint(issues) {
  return {
    errors: issues.filter((item) => item.severity !== "warning"),
    warnings: issues.filter((item) => item.severity === "warning"),
  };
}

export function assertTokenLint(json) {
  const { errors, warnings } = partitionTokenLint(lintTokenDocument(json));
  if (warnings.length > 0) {
    console.warn(`规范提醒（${warnings.length} 处，不阻止写入）\n${formatTokenLint(warnings)}`);
  }
  if (errors.length === 0) return;
  const error = new Error(`规范检查未通过，已停止写入（${errors.length} 处）\n${formatTokenLint(errors)}`);
  error.issues = errors;
  error.warnings = warnings;
  throw error;
}
