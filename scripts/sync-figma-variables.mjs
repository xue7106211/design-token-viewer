#!/usr/bin/env node
/**
 * 通过 Figma MCP 同步 HyperOS Figma Variables 与 Text Styles → 网站种子 / 协作文档 / Neon(PostgreSQL)。
 *
 * Figma 远程 MCP 只能由已 OAuth 的 AI 客户端调用（不支持脚本自行注册客户端，插件沙箱也没有 fetch），
 * 因此分两步：
 *
 *   1) 生成只读插件代码，交给 AI 客户端用 use_figma 在 Figma 文件中执行
 *      （fileKey：5gZYD8i6JqBvsaS7yvnO9c，HyperOS-Design-Token）：
 *        node scripts/sync-figma-variables.mjs plugin --part 0 --out /tmp/figma-export.js
 *      插件只回传相对基线有变化的变量，其余以内容哈希占位。use_figma 返回值上限约 20KB，故分页：
 *      part 0 返回哈希骨架和总页数 pages，再依次以 --part 1..pages 生成并执行。
 *      每次的返回 JSON 原样保存到同一目录，例如 /tmp/figma-delta/part-0.json、part-1.json …
 *
 *   2) 还原、校验并写入目标（可组合）：
 *        node scripts/sync-figma-variables.mjs apply --delta /tmp/figma-delta --seed
 *        node scripts/sync-figma-variables.mjs apply --delta /tmp/figma-delta --api http://localhost:3000
 *        DATABASE_URL=... node scripts/sync-figma-variables.mjs apply --delta /tmp/figma-delta --db
 *      - 还原后整体校验和必须与 Figma 端一致，无未解析别名、Mode 值完整，否则不写入任何数据；
 *      - 成功后更新基线 figma-token/figma-variables.json（下次增量导出以它为准）；
 *        之后可省略 --delta，直接把基线推送到其他目标（如先 --seed，确认后再 --db）；
 *      - 变量 id 按「Collection 名 + 变量名」复用目标文档已有 id，新增变量分配新的 var_N；
 *      - Figma Text Style → Semantic Token 下 text_style/<样式名> 的 TYPOGRAPHY Token（新增/修改/删除均以 Figma 为准），
 *        字段绑定的 Variable 转为字段别名，保留「Text Style → Reference Token」引用链；
 *        其他 TYPOGRAPHY Token 原样保留，并校验字段引用仍有效；
 *      - --api / --db 写入前创建快照并记录 import_document 日志，写入后重新读取做深度比较。
 *
 * 通用参数：--document <id>（默认 hyperos4）。DRY_RUN=1 只校验并打印差异，不写入任何数据。
 * 注意：同步以 Figma 为准，会覆盖应用内对同名变量的编辑与排序。
 */
import { randomUUID } from "crypto";
import { existsSync, statSync } from "fs";
import { readdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { isDeepStrictEqual } from "util";
import {
  applyDelta,
  buildPluginCode,
  canonicalToNative,
  diffNative,
  knownHashes,
  nativeToCanonical,
  summarize,
  verifySnapshot,
} from "./lib/figma-variables-sync.mjs";

const SEED_PATH = path.join(process.cwd(), "src", "data", "sample-tokens-hyperos4.json");
const BASELINE_PATH = path.join(process.cwd(), "figma-token", "figma-variables.json");
const ACTOR = { actorName: "sync-figma-variables", actorClientId: "script:sync-figma-variables" };
const DRY_RUN = process.env.DRY_RUN === "1";
const P = DRY_RUN ? "[DRY_RUN] " : "";

function parseArgs(argv) {
  const [command, ...rest] = argv;
  const args = { command, document: "hyperos4" };
  for (let i = 0; i < rest.length; i++) {
    const flag = rest[i];
    const next = () => {
      const value = rest[++i];
      if (!value) throw new Error(`${flag} 需要参数`);
      return value;
    };
    if (flag === "--out") args.out = next();
    else if (flag === "--part") args.part = Number(next());
    else if (flag === "--delta") args.delta = next();
    else if (flag === "--seed") args.seed = true;
    else if (flag === "--db") args.db = true;
    else if (flag === "--api") args.api = next().replace(/\/$/, "");
    else if (flag === "--document") args.document = next();
    else throw new Error(`未知参数 ${flag}`);
  }
  if (command === "apply") {
    if (!args.seed && !args.api && !args.db) throw new Error("apply 需要至少一个目标：--seed、--api <url> 或 --db");
  } else if (command !== "plugin") {
    throw new Error("用法：sync-figma-variables.mjs plugin [--part n] [--out file] | apply [--delta <dir>] [--seed] [--api url] [--db]");
  }
  return args;
}

const readJson = async (file) => JSON.parse(await readFile(file, "utf-8"));

/** 基线：优先使用上次同步的规范快照，否则从种子推导（首次同步）。 */
async function loadBaseline() {
  if (existsSync(BASELINE_PATH)) {
    return { source: path.relative(process.cwd(), BASELINE_PATH), snapshot: verifySnapshot(await readJson(BASELINE_PATH)) };
  }
  return { source: `${path.relative(process.cwd(), SEED_PATH)}（首次同步，由种子推导）`, snapshot: nativeToCanonical(await readJson(SEED_PATH)) };
}

/** 每个变量一行，便于在 Git 中审阅差异。 */
function formatSnapshot(snapshot) {
  const collections = snapshot.collections.map((c) => {
    const variables = c.variables.map((e) => `        ${JSON.stringify(e)}`).join(",\n");
    return `    {\n      "name": ${JSON.stringify(c.name)},\n      "modes": ${JSON.stringify(c.modes)},\n      "variables": [\n${variables}\n      ]\n    }`;
  });
  const textStyles = (snapshot.textStyles ?? []).map((e) => `    ${JSON.stringify(e)}`).join(",\n");
  return `{\n  "format": ${JSON.stringify(snapshot.format)},\n  "exportedAt": ${JSON.stringify(snapshot.exportedAt)},\n  "checksum": ${JSON.stringify(snapshot.checksum)},\n  "collections": [\n${collections.join(",\n")}\n  ],\n  "textStyles": [\n${textStyles}\n  ]\n}\n`;
}

function reportDiff(label, before, after) {
  const { added, removed, changed } = diffNative(before, after);
  const { total, typography, collections } = summarize(after);
  console.log(`${P}[${label}] 新增 ${added.length}，删除 ${removed.length}，修改 ${changed.length}；同步后共 ${total} 个（${collections.join("，")}；其中 TYPOGRAPHY ${typography}）`);
  for (const [sign, list] of [["+", added], ["-", removed], ["~", changed]]) {
    list.slice(0, 30).forEach((name) => console.log(`${P}  ${sign} ${name}`));
    if (list.length > 30) console.log(`${P}  ${sign} …其余 ${list.length - 30} 个`);
  }
  return added.length + removed.length + changed.length;
}

async function runPlugin(args) {
  const { source, snapshot } = await loadBaseline();
  const hashes = knownHashes(snapshot);
  const part = args.part ?? 0;
  if (!Number.isInteger(part) || part < 0) throw new Error("--part 应为非负整数");
  const code = buildPluginCode(hashes, part);
  if (args.out) {
    await writeFile(args.out, code, "utf-8");
    console.error(`基线：${source}，已知 ${hashes.length} 个变量哈希；part ${part} 插件代码 ${code.length} 字符已写入 ${args.out}`);
  } else {
    process.stdout.write(code);
  }
}

async function syncSeed(snapshot) {
  const before = await readJson(SEED_PATH);
  const next = canonicalToNative(snapshot, before);
  if (reportDiff("seed", before, next) === 0 && isDeepStrictEqual(before, next)) return next;
  if (DRY_RUN) return next;
  await writeFile(SEED_PATH, `${JSON.stringify(next, null, 2)}\n`, "utf-8");
  if (!isDeepStrictEqual(await readJson(SEED_PATH), next)) throw new Error("种子写入后回读不一致");
  console.log(`已写入 ${path.relative(process.cwd(), SEED_PATH)}`);
  return next;
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

async function syncApi(args, snapshot) {
  const document = await api(args.api, args.document, "/api/token-document");
  const next = canonicalToNative(snapshot, document.currentJson);
  const label = `api ${args.document} @ r${document.revision}`;
  if (reportDiff(label, document.currentJson, next) === 0 && isDeepStrictEqual(document.currentJson, next)) {
    console.log(`[${label}] 已是最新，跳过`);
    return next;
  }
  if (DRY_RUN) return next;

  const backup = await api(args.api, args.document, "/api/snapshots", {
    method: "POST",
    body: JSON.stringify({
      name: `Figma Variables 同步前 (r${document.revision})`,
      description: `sync-figma-variables 导入前自动创建（Figma 校验和 ${snapshot.checksum}）`,
      actor: ACTOR,
    }),
  });
  console.log(`已创建快照 ${backup.id}`);

  const updated = await api(args.api, args.document, "/api/token-document/import", {
    method: "POST",
    body: JSON.stringify({ json: next, revision: document.revision, actor: ACTOR }),
  });
  const exported = await api(args.api, args.document, "/api/export?format=json");
  if (!(updated.revision > document.revision)) throw new Error(`revision 未增加（${document.revision} → ${updated.revision}）`);
  if (!isDeepStrictEqual(JSON.parse(exported.code), next)) throw new Error("导出 JSON 与同步结果不一致");
  console.log(`[api ${args.document}] revision ${document.revision} → ${updated.revision}，导出 JSON 校验通过`);
  return next;
}

async function syncDatabase(args, snapshot) {
  if (!process.env.DATABASE_URL) throw new Error("--db 需要 DATABASE_URL");
  const { default: postgres } = await import("postgres");
  const sql = postgres(process.env.DATABASE_URL, { max: 1 });
  const parse = (value) => (typeof value === "string" ? JSON.parse(value) : value);

  try {
    let next;
    let expectedRevision;
    await sql.begin(async (tx) => {
      const [row] = await tx`
        select id, current_json, revision from token_documents where id = ${args.document} for update`;
      if (!row) throw new Error(`数据库中未找到文档 ${args.document}`);
      const currentJson = parse(row.current_json);
      next = canonicalToNative(snapshot, currentJson);
      const label = `db ${row.id} @ r${row.revision}`;
      if (reportDiff(label, currentJson, next) === 0 && isDeepStrictEqual(currentJson, next)) {
        console.log(`[${label}] 已是最新，跳过`);
        return;
      }
      if (DRY_RUN) return;

      const now = new Date();
      await tx`
        insert into snapshots (id, document_id, name, description, json, created_by, created_at)
        values (${randomUUID()}, ${row.id}, ${`Figma Variables 同步前 (r${row.revision})`},
                ${`sync-figma-variables 导入前自动创建（Figma 校验和 ${snapshot.checksum}）`},
                ${tx.json(currentJson)}, ${ACTOR.actorName}, ${now})`;
      await tx`
        update token_documents
        set current_json = ${tx.json(next)}, revision = revision + 1, updated_at = ${now}, updated_by = ${ACTOR.actorName}
        where id = ${row.id}`;
      const count = (json) => ({ collections: json.collections.length, tokens: Object.keys(json.variables).length });
      await tx`
        insert into change_logs (id, document_id, change_type, old_value, new_value, meta,
                                 actor_name, actor_client_id, ip, created_at)
        values (${randomUUID()}, ${row.id}, 'import_document',
                ${tx.json({ label: "原文档", ...count(currentJson) })},
                ${tx.json({ label: "Figma Variables 同步", ...count(next) })},
                ${tx.json({ source: "figma-mcp", checksum: snapshot.checksum, ...diffNative(currentJson, next) })},
                ${ACTOR.actorName}, ${ACTOR.actorClientId}, 'script', ${now})`;
      expectedRevision = row.revision + 1;
    });

    if (expectedRevision) {
      const [row] = await sql`select current_json, revision from token_documents where id = ${args.document}`;
      if (row.revision !== expectedRevision) throw new Error(`revision 应为 ${expectedRevision}，实际为 ${row.revision}`);
      if (!isDeepStrictEqual(parse(row.current_json), next)) throw new Error("数据库回读 JSON 与同步结果不一致");
      console.log(`[db ${args.document}] revision → ${row.revision}，回读校验通过`);
    }
    return next;
  } finally {
    await sql.end();
  }
}

async function runApply(args) {
  const { source, snapshot: base } = await loadBaseline();
  let snapshot = base;
  let note = "未指定 --delta，直接使用基线";
  if (args.delta) {
    const files = statSync(args.delta).isDirectory()
      ? (await readdir(args.delta)).filter((name) => name.endsWith(".json")).sort().map((name) => path.join(args.delta, name))
      : [args.delta];
    const parts = await Promise.all(files.map(readJson));
    if (parts.find((p) => p.part === 0)?.checksum === base.checksum) {
      note = "增量包已并入基线";
    } else {
      const result = applyDelta(base, parts);
      snapshot = result.snapshot;
      note = `增量包携带 ${result.changed} 个完整条目`;
    }
  } else if (!existsSync(BASELINE_PATH)) {
    throw new Error(`未指定 --delta 时需要已有基线 ${path.relative(process.cwd(), BASELINE_PATH)}`);
  }
  const total = snapshot.collections.reduce((n, c) => n + c.variables.length, 0);
  console.log(`基线：${source}；Figma 共 ${total} 个变量、${snapshot.textStyles?.length ?? "?"} 个 Text Style（${note}），校验和 ${snapshot.checksum}`);
  snapshot.collections.forEach((c) => console.log(`  - ${c.name} [${c.modes.join("/")}]: ${c.variables.length}`));
  if (snapshot.textStyles) {
    const bound = snapshot.textStyles.reduce((n, [, , fields]) => n + fields.filter(([, v]) => Array.isArray(v)).length, 0);
    console.log(`  - Text Style: ${snapshot.textStyles.length}（绑定 Variable 的字段 ${bound} 个）`);
  } else {
    console.log("  - Text Style: 基线未包含，保留目标文档中已有的 TYPOGRAPHY Token");
  }

  // 基线最后写入：任一目标失败时保留旧基线，修复后可用同一增量包重试；之后也可省略 --delta 把基线推送到其他目标
  const results = {};
  if (args.seed) results.seed = await syncSeed(snapshot);
  if (args.api) results.api = await syncApi(args, snapshot);
  if (args.db) results.db = await syncDatabase(args, snapshot);

  if (results.seed) {
    for (const target of ["api", "db"]) {
      if (results[target] && !isDeepStrictEqual(results[target], results.seed)) {
        console.warn(`注意：${target} 文档与种子的 id 或 TYPOGRAPHY 不完全一致（两者已有历史分叉），内容均已与 Figma 同步`);
      }
    }
  }

  if (!DRY_RUN && snapshot !== base) {
    await writeFile(BASELINE_PATH, formatSnapshot(snapshot), "utf-8");
    console.log(`已更新基线 ${path.relative(process.cwd(), BASELINE_PATH)}`);
  }
}

try {
  const args = parseArgs(process.argv.slice(2));
  if (args.command === "plugin") await runPlugin(args);
  else await runApply(args);
  if (args.command === "apply") console.log(DRY_RUN ? "DRY_RUN 完成，未写入任何数据" : "同步完成");
} catch (error) {
  console.error(`同步失败：${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
