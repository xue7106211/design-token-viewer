#!/usr/bin/env node
/**
 * 将 miuix Text Style（复合 TYPOGRAPHY Token）追加到 HyperOS4 Semantic Token。
 *
 * 一个 Figma Text Style = 一个 TYPOGRAPHY Token，名称为 `text_style/<style name>`；
 * fontFamily / fontStyle / fontSize / lineHeight 四个字段分别按名称别名到 Reference Token
 * （运行时解析为当前文档中的 var_* id）。Light / Dark 使用相同引用。
 *
 * 只追加不删除；已存在同名 Token 时跳过（幂等）。引用缺失、类型不符或与样式中的
 * 字面值不一致时整体中止，不写入任何数据。
 *
 * 用法：
 *   node scripts/merge-miuix-text-styles.mjs --seed
 *       就地更新 src/data/sample-tokens-hyperos4.json
 *   node scripts/merge-miuix-text-styles.mjs --api http://localhost:3000
 *       通过协作接口更新已有文档：读取 revision → 创建导入前快照 → POST /api/token-document/import
 *   node scripts/merge-miuix-text-styles.mjs --in current.json --out merged.json
 *       离线合并，产出可导入的 Figma Native JSON（例如供 Neon 环境使用）
 *   DATABASE_URL=... node scripts/merge-miuix-text-styles.mjs --db
 *       直接在 PostgreSQL（Neon）事务中：写快照 → 更新 current_json / revision → 写 import_document 日志
 *
 * 通用参数：--styles <path>（默认 scripts/data/miuix-text-styles.json）、--document <id>（默认 hyperos4）。
 * DRY_RUN=1 只打印不写入。
 */
import { randomUUID } from "crypto";
import { readFile, writeFile } from "fs/promises";
import path from "path";

const SEMANTIC_COLLECTION_NAME = "Semantic Token";
const GROUP = "text_style";
const SEED_PATH = path.join(process.cwd(), "src", "data", "sample-tokens-hyperos4.json");
const DEFAULT_STYLES_PATH = path.join(process.cwd(), "scripts", "data", "miuix-text-styles.json");
const ACTOR = { actorName: "merge-miuix-text-styles", actorClientId: "script:merge-miuix-text-styles" };
const DRY_RUN = process.env.DRY_RUN === "1";

/** fontFamily/fontStyle 引用 STRING，fontSize/lineHeight 引用 NUMBER */
const FIELDS = [
  ["fontFamily", "STRING"],
  ["fontStyle", "STRING"],
  ["fontSize", "NUMBER"],
  ["lineHeight", "NUMBER"],
];

function parseArgs(argv) {
  const args = { styles: DEFAULT_STYLES_PATH, document: "hyperos4" };
  for (let i = 0; i < argv.length; i++) {
    const key = argv[i];
    const next = () => {
      const value = argv[++i];
      if (!value) throw new Error(`${key} 需要参数`);
      return value;
    };
    if (key === "--seed") args.seed = true;
    else if (key === "--db") args.db = true;
    else if (key === "--api") args.api = next().replace(/\/$/, "");
    else if (key === "--in") args.in = next();
    else if (key === "--out") args.out = next();
    else if (key === "--styles") args.styles = next();
    else if (key === "--document") args.document = next();
    else throw new Error(`未知参数 ${key}`);
  }
  if (!args.seed && !args.db && !args.api && !args.out) {
    throw new Error("请指定 --seed、--api <url>、--out <file> 或 --db 之一");
  }
  return args;
}

function nextVariableIdFactory(variables) {
  let max = 0;
  for (const id of Object.keys(variables)) {
    const match = /^var_(\d+)$/.exec(id);
    if (match) max = Math.max(max, Number(match[1]));
  }
  return () => `var_${++max}`;
}

/** 返回新的 JSON（不修改入参）以及追加/跳过的明细。 */
export function mergeTextStyles(sourceJson, styles) {
  const json = structuredClone(sourceJson);
  const semantic = json.collections.find((c) => c.name === SEMANTIC_COLLECTION_NAME);
  if (!semantic) throw new Error(`未找到 Collection「${SEMANTIC_COLLECTION_NAME}」`);

  const byName = new Map(Object.values(json.variables).map((v) => [v.name, v]));
  const nextId = nextVariableIdFactory(json.variables);
  const added = [];
  const skipped = [];
  const errors = [];

  for (const style of styles) {
    const name = `${GROUP}/${style.name}`;
    if (byName.has(name)) {
      skipped.push(name);
      continue;
    }

    const value = {};
    for (const [field, kind] of FIELDS) {
      const refName = style.refs?.[field];
      const ref = refName && byName.get(refName);
      if (!ref) {
        errors.push(`${style.name}.${field}: 未找到引用 ${refName}`);
        continue;
      }
      if (ref.type !== kind) {
        errors.push(`${style.name}.${field}: ${refName} 类型为 ${ref.type}，应为 ${kind}`);
        continue;
      }
      for (const mode of semantic.modes) {
        const refValue = ref.valuesByMode[mode.modeId];
        if (refValue?.type !== kind || refValue.value !== style[field]) {
          errors.push(
            `${style.name}.${field}: ${refName} 在 ${mode.name} 为 ${JSON.stringify(refValue)}，样式期望 ${style[field]}`
          );
        }
      }
      value[field] = { type: "ALIAS", id: ref.id };
    }

    const id = nextId();
    const valuesByMode = Object.fromEntries(
      semantic.modes.map((mode) => [mode.modeId, { type: "TYPOGRAPHY", value: structuredClone(value) }])
    );
    const variable = {
      id,
      name,
      type: "TYPOGRAPHY",
      valuesByMode,
      ...(style.description ? { description: style.description } : {}),
      codeSyntax: { ANDROID: style.name },
    };
    json.variables[id] = variable;
    semantic.variableIds.push(id);
    byName.set(name, variable);
    added.push({ id, name });
  }

  if (errors.length > 0) {
    throw new Error(`引用校验失败，未写入任何数据：\n  ${errors.join("\n  ")}`);
  }
  return { json, added, skipped };
}

function report(label, { added, skipped }) {
  const prefix = DRY_RUN ? "[DRY_RUN] " : "";
  console.log(`${prefix}[${label}] 追加 ${added.length} 个，跳过已存在 ${skipped.length} 个`);
  for (const { id, name } of added) console.log(`${prefix}  + ${id} ${name}`);
}

async function readJson(file) {
  return JSON.parse(await readFile(file, "utf-8"));
}

async function runSeed(styles) {
  const source = await readJson(SEED_PATH);
  const result = mergeTextStyles(source, styles);
  report("seed", result);
  if (DRY_RUN || result.added.length === 0) return;
  await writeFile(SEED_PATH, `${JSON.stringify(result.json, null, 2)}\n`, "utf-8");
  console.log(`已写入 ${path.relative(process.cwd(), SEED_PATH)}，变量总数 ${Object.keys(result.json.variables).length}`);
}

async function runOffline(args, styles) {
  const source = await readJson(args.in ?? SEED_PATH);
  const result = mergeTextStyles(source, styles);
  report(args.in ?? "seed", result);
  if (DRY_RUN) return;
  await writeFile(args.out, `${JSON.stringify(result.json, null, 2)}\n`, "utf-8");
  console.log(`已写入 ${args.out}，变量总数 ${Object.keys(result.json.variables).length}`);
}

async function api(baseUrl, documentId, pathname, init = {}) {
  const response = await fetch(`${baseUrl}${pathname}`, {
    ...init,
    headers: { "content-type": "application/json", "x-document-id": documentId, ...(init.headers ?? {}) },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`${init.method ?? "GET"} ${pathname} → ${response.status} ${JSON.stringify(body)}`);
  return body;
}

async function runApi(args, styles) {
  const document = await api(args.api, args.document, "/api/token-document");
  const result = mergeTextStyles(document.currentJson, styles);
  report(`${args.document} @ revision ${document.revision}`, result);
  if (DRY_RUN || result.added.length === 0) return;

  const snapshot = await api(args.api, args.document, "/api/snapshots", {
    method: "POST",
    body: JSON.stringify({
      name: `导入 miuix Text Style 前 (r${document.revision})`,
      description: `追加 ${result.added.length} 个 TYPOGRAPHY Token 前自动创建`,
      actor: ACTOR,
    }),
  });
  console.log(`已创建快照 ${snapshot.id}`);

  const updated = await api(args.api, args.document, "/api/token-document/import", {
    method: "POST",
    body: JSON.stringify({ json: result.json, revision: document.revision, actor: ACTOR }),
  });
  console.log(`[${args.document}] revision ${document.revision} → ${updated.revision}`);
}

async function runDatabase(args, styles) {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("--db 需要 DATABASE_URL");
  const { default: postgres } = await import("postgres");
  const sql = postgres(databaseUrl, { max: 1 });

  try {
    await sql.begin(async (tx) => {
      const [row] = await tx`
        select id, current_json, revision from token_documents
        where id = ${args.document} for update`;
      if (!row) throw new Error(`未找到文档 ${args.document}`);
      const currentJson = typeof row.current_json === "string" ? JSON.parse(row.current_json) : row.current_json;
      const result = mergeTextStyles(currentJson, styles);
      report(`${row.id} @ revision ${row.revision}`, result);
      if (DRY_RUN || result.added.length === 0) return;

      const now = new Date();
      await tx`
        insert into snapshots (id, document_id, name, description, json, created_by, created_at)
        values (${randomUUID()}, ${row.id}, ${`导入 miuix Text Style 前 (r${row.revision})`},
                ${`追加 ${result.added.length} 个 TYPOGRAPHY Token 前自动创建`},
                ${tx.json(currentJson)}, ${ACTOR.actorName}, ${now})`;
      await tx`
        update token_documents
        set current_json = ${tx.json(result.json)}, revision = revision + 1,
            updated_at = ${now}, updated_by = ${ACTOR.actorName}
        where id = ${row.id}`;
      await tx`
        insert into change_logs (id, document_id, change_type, old_value, new_value, meta,
                                 actor_name, actor_client_id, ip, created_at)
        values (${randomUUID()}, ${row.id}, 'import_document',
                ${tx.json({ label: "原文档", collections: currentJson.collections.length, tokens: Object.keys(currentJson.variables).length })},
                ${tx.json({ label: "追加 miuix Text Style", collections: result.json.collections.length, tokens: Object.keys(result.json.variables).length })},
                ${tx.json({ added: result.added.map((item) => item.name) })},
                ${ACTOR.actorName}, ${ACTOR.actorClientId}, 'script', ${now})`;
      console.log(`[${row.id}] revision ${row.revision} → ${row.revision + 1}`);
    });
  } finally {
    await sql.end();
  }
}

try {
  const args = parseArgs(process.argv.slice(2));
  const styles = await readJson(args.styles);
  if (!Array.isArray(styles)) throw new Error(`${args.styles} 应为 Text Style 数组`);
  if (args.seed) await runSeed(styles);
  if (args.out) await runOffline(args, styles);
  if (args.api) await runApi(args, styles);
  if (args.db) await runDatabase(args, styles);
  console.log(DRY_RUN ? "DRY_RUN 完成，未写入任何数据" : "完成");
} catch (error) {
  console.error(`合并失败：${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
