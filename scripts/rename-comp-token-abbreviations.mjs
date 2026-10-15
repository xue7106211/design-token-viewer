#!/usr/bin/env node
/**
 * 展开 Component Token 叶子名缩写（seg→segment、scr→scroll、men→menu，保留 comp）。
 *
 * PR #5 只更新了 DTCG 源与种子；本脚本同步已存在的协作文档：
 * - 无 DATABASE_URL：更新 .data/collaboration-store.json 中 hyperos4 文档的 currentJson.variables[*].name
 * - 有 DATABASE_URL：更新 token_documents.current_json（优先 hyperos4，不存在则扫描全部文档），
 *   并替换 change_logs.token_name 中的旧叶子名
 *
 * 只改 name，不动 Variable ID / 值 / 别名；不修改 snapshots 历史快照。
 * 幂等：已是新名则跳过。DRY_RUN=1 只打印不写入。
 *
 * 用法：
 *   node scripts/rename-comp-token-abbreviations.mjs
 *   DRY_RUN=1 node scripts/rename-comp-token-abbreviations.mjs
 *   DATABASE_URL=... node scripts/rename-comp-token-abbreviations.mjs
 */
import { readFile, writeFile } from "fs/promises";
import path from "path";

const RENAMES = [
  ["segment/miuix_comp_seg_color_fill_enabled", "segment/miuix_comp_segment_color_fill_enabled"],
  ["scroll/miuix_comp_scr_color_fill_enabled", "scroll/miuix_comp_scroll_color_fill_enabled"],
  ["scroll/miuix_comp_scr_color_fill_pressed", "scroll/miuix_comp_scroll_color_fill_pressed"],
  ["menu/miuix_comp_men_color_fill_mask", "menu/miuix_comp_menu_color_fill_mask"],
];
const TARGET_DOCUMENT_ID = "hyperos4";
const DRY_RUN = process.env.DRY_RUN === "1";
const STORE_PATH = path.join(process.cwd(), ".data", "collaboration-store.json");

const leaf = (name) => name.split("/").pop();
const prefix = DRY_RUN ? "[DRY_RUN] " : "";

/** 就地修改 currentJson.variables 中的 name，返回实际改动列表。 */
function renameVariables(currentJson, documentId) {
  const variables = currentJson?.variables;
  if (!variables || typeof variables !== "object") return [];
  const existingNames = new Set(Object.values(variables).map((v) => v?.name));
  const changes = [];

  for (const [oldName, newName] of RENAMES) {
    for (const [id, variable] of Object.entries(variables)) {
      if (variable?.name !== oldName) continue;
      if (existingNames.has(newName)) {
        throw new Error(`[${documentId}] ${id}: 目标名称 ${newName} 已被其他变量占用，停止迁移`);
      }
      variable.name = newName;
      existingNames.delete(oldName);
      existingNames.add(newName);
      changes.push({ id, oldName, newName });
    }
  }
  return changes;
}

function report(documentId, changes) {
  if (changes.length === 0) {
    console.log(`${prefix}[${documentId}] 无需修改（已是新名或不含这些 Token）`);
    return;
  }
  for (const { id, oldName, newName } of changes) {
    console.log(`${prefix}[${documentId}] ${id}: ${oldName} → ${newName}`);
  }
}

async function migrateFileStore() {
  console.log(`未设置 DATABASE_URL，使用文件库：${path.relative(process.cwd(), STORE_PATH)}`);
  const state = JSON.parse(await readFile(STORE_PATH, "utf-8"));
  const document = (state.documents ?? []).find((doc) => doc.id === TARGET_DOCUMENT_ID);
  if (!document) {
    console.log(`文件库中不存在文档 ${TARGET_DOCUMENT_ID}，无需修改`);
    return;
  }

  const changes = renameVariables(document.currentJson, document.id);
  report(document.id, changes);
  if (changes.length === 0 || DRY_RUN) return;

  const oldRevision = document.revision;
  document.revision = oldRevision + 1;
  document.updatedAt = Date.now();
  // 与 repository.ts 的 writeState 保持相同格式
  await writeFile(STORE_PATH, JSON.stringify(state, null, 2), "utf-8");
  console.log(`[${document.id}] revision ${oldRevision} → ${document.revision}，已写入文件库`);
}

async function migratePostgres(databaseUrl) {
  console.log("检测到 DATABASE_URL，使用 PostgreSQL");
  const { default: postgres } = await import("postgres");
  const sql = postgres(databaseUrl, { max: 1 });

  try {
    await sql.begin(async (tx) => {
      let rows = await tx`
        select id, current_json, revision from token_documents
        where id = ${TARGET_DOCUMENT_ID} for update`;
      if (rows.length === 0) {
        console.log(`未找到文档 ${TARGET_DOCUMENT_ID}，扫描全部文档`);
        rows = await tx`select id, current_json, revision from token_documents for update`;
      }

      for (const row of rows) {
        const currentJson = typeof row.current_json === "string"
          ? JSON.parse(row.current_json)
          : row.current_json;
        const changes = renameVariables(currentJson, row.id);
        report(row.id, changes);
        if (changes.length === 0 || DRY_RUN) continue;

        await tx`
          update token_documents
          set current_json = ${tx.json(currentJson)},
              revision = revision + 1,
              updated_at = now()
          where id = ${row.id}`;
        console.log(`[${row.id}] revision ${row.revision} → ${row.revision + 1}`);
      }

      // change_logs.token_name：替换旧叶子名（同时覆盖完整 path 与仅叶子名两种写法）
      const documentIds = rows.map((row) => row.id);
      if (documentIds.length === 0) return;
      for (const [oldName, newName] of RENAMES) {
        const oldLeaf = leaf(oldName);
        const newLeaf = leaf(newName);
        const matched = await tx`
          select id, token_name from change_logs
          where document_id in ${tx(documentIds)}
            and strpos(token_name, ${oldLeaf}) > 0`;
        for (const log of matched) {
          console.log(`${prefix}[change_logs] ${log.id}: ${log.token_name} → ${log.token_name.replaceAll(oldLeaf, newLeaf)}`);
        }
        if (matched.length === 0 || DRY_RUN) continue;
        await tx`
          update change_logs
          set token_name = replace(token_name, ${oldLeaf}, ${newLeaf})
          where document_id in ${tx(documentIds)}
            and strpos(token_name, ${oldLeaf}) > 0`;
      }
    });
  } finally {
    await sql.end();
  }
}

const databaseUrl = process.env.DATABASE_URL;
try {
  if (databaseUrl) await migratePostgres(databaseUrl);
  else await migrateFileStore();
  console.log(DRY_RUN ? "DRY_RUN 完成，未写入任何数据" : "完成");
} catch (error) {
  console.error(`迁移失败：${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
