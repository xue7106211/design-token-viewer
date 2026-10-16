---
name: sync-figma-tokens
description: 一键从 Figma（HyperOS-Design-Token）经 Figma MCP 同步 Variables + Text Styles 到网站种子、协作文档 API 和 Neon。参数可写目标，如 "seed api=http://localhost:3000 db"，默认只同步种子。
---

# 同步 Figma Token

用户参数：$ARGUMENTS

按下面步骤完整执行，不要跳步，也不要在中途报告完成。全部回复使用中文。

## 0. 解析目标

- Figma 文件：`5gZYD8i6JqBvsaS7yvnO9c`（HyperOS-Design-Token），只读。
- 从参数中识别目标，可组合：
  - `seed`：`src/data/sample-tokens-hyperos4.json`（未指定任何目标时默认只做这一项）
  - `api=<url>`：网站协作文档接口，例如 `http://localhost:3000`
  - `db`：`DATABASE_URL` 指向的 PostgreSQL（Neon）
  - `document=<id>`：默认 `hyperos4`
- 写 `db` 或非 localhost 的 `api` 属于修改共享数据：必须先预览，把差异摘要给用户，得到明确确认后才能正式写入。

## 1. 导出（只读）

1. 调用 `use_figma` 前先加载 figma-use skill。
2. 清空增量目录并生成 part 0 插件代码：
   ```bash
   rm -rf /tmp/figma-delta && mkdir -p /tmp/figma-delta
   npm run -s figma:plugin -- --part 0 --out /tmp/figma-export.js
   ```
3. 读取 `/tmp/figma-export.js`，把全部内容原样作为 `use_figma` 的 `code` 执行（fileKey 见上，`skillNames: "figma-use"`）。不要改动或删减代码，插件会校验 KNOWN 清单完整性。
4. 把返回的 JSON 原样写入 `/tmp/figma-delta/part-0.json`。
   - 返回中的 `unresolved` / `missingModes` / `unsupported` 非空时，停止并向用户列出问题（通常要在 Figma 中修复）。
5. 若返回 `pages` = N > 0，对 `k = 1..N` 依次执行：`npm run -s figma:plugin -- --part k --out /tmp/figma-export.js`，用 `use_figma` 执行，结果原样写入 `/tmp/figma-delta/part-k.json`。
6. 如果 `use_figma` 报错，先读错误信息并修正原因，不要原样重试。

## 2. 预览与写入

1. 先预览，不写入任何数据：
   ```bash
   npm run -s figma:preview -- --delta /tmp/figma-delta --seed [--api <url>] [--db] [--document <id>]
   ```
   只带用户要求的目标。还原后的校验和必须与 Figma 端一致，否则脚本会报错，此时停止并说明原因。
2. 向用户汇报：Figma 变量数与 Text Style 数，各目标的新增、删除、修改数量，以及列出的关键条目。
3. 正式写入：
   - 只有 `seed` 或 localhost `api`：直接执行
     `npm run -s figma:apply -- --delta /tmp/figma-delta <同样的目标参数>`
   - 含 `db` 或远程 `api`：先等用户确认，再执行同样的命令。`db` 需要环境中已有 `DATABASE_URL`，不要在回复里输出它的值。
   - 脚本会对 api/db 自动建快照、记录 `import_document` 日志，并在写入后回读做深度比较。

## 3. 验收

- 脚本输出必须包含“同步完成”。api 必须显示“导出 JSON 校验通过”，db 必须显示“回读校验通过”。
- 对 `seed` 运行 `npx vitest run scripts/lib` 确认同步逻辑测试仍通过。
- 用 `git status --short` 列出被修改的文件（通常是种子和 `figma-token/figma-variables.json` 基线）。不要自动提交。
- 删除 `/tmp/figma-export.js`。保留 `/tmp/figma-delta`，方便之后不带 `--delta` 重放到其他目标（`npm run -s figma:apply -- --db` 使用已更新的基线）。

## 汇报格式

先给结论：哪些目标已同步、revision 变化、快照 id。再列 Figma 侧数据规模和差异摘要。最后说明未执行的目标，以及需要用户决定的事项。
