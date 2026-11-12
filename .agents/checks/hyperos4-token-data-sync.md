---
files:
  - "figma-token/**"
  - "src/data/sample-tokens-hyperos4.json"
  - "scripts/*.mjs"
  - "scripts/lib/*.mjs"
  - "scripts/data/**"
  - "!scripts/**/*.test.mjs"
---

# HyperOS4 源、种子与已有文档保持一致

HyperOS4 数据有多层：权威输入可以是 **DTCG 导出**（`figma-token/<Collection>/{Light,Dark}.tokens.json`）或 **Figma MCP 基线**（`figma-token/figma-variables.json`）；`src/data/sample-tokens-hyperos4.json` 是由脚本生成的 Figma Native 种子；repository 中已存在的 `hyperos4` 文档 `currentJson` 才是应用实际读取与导出的数据。改动这些数据或生成它们的脚本时，必须满足：

1. **种子与本次使用的权威输入在同一个 PR 中同步**。两条受支持的工作流二选一，不可混用要求：
   - **DTCG 流程**：改 `figma-token/<Collection>/{Light,Dark}.tokens.json` 时，种子须由 `scripts/figma-dtcg-to-sample.mjs`（必要时再跑 `merge-miuix-text-styles.mjs`）重新生成；不得只手改源或只手改种子。
   - **Figma MCP 流程**：`scripts/sync-figma-variables.mjs apply --seed` 以基线 / delta 生成种子并更新 `figma-variables.json`。此流程**不要求**同步改 DTCG 文件；Text Style 会写成 Semantic Token 下的 `text_style/…` TYPOGRAPHY，没有 DTCG 对应项是正常的。
2. **走 DTCG 时 Light 与 Dark 成对修改**。同一 Collection 的 `Light.tokens.json` 与 `Dark.tokens.json` 应包含相同的 Token 名称集合；重命名、新增或删除只改了一个 Mode 文件是错误的。
3. **不引入悬空别名**。DTCG 别名按 `targetVariableName` + `targetVariableSetName` 引用；重命名或删除被引用的 Token 时，所有引用方必须一并更新。转换输出中的 `Aliases unresolved` 必须为 `0`。
4. **数值经 float32 最短十进制消毒**。Figma 以 float32 存储 NUMBER 与 COLOR 通道；`figma-dtcg-to-sample.mjs` 与 `scripts/lib/figma-variables-sync.mjs` 写入种子时必须经过 `f32()`（例如 `0.699999988079071` → `0.7`）。只改转换脚本却不更新种子中的对应脏值是错误的。
5. **重命名需要考虑已有文档**。种子只在文档首次创建时灌入，所以修改种子不会更新已部署的 `currentJson`。对已有 Token 的重命名或删除，PR 必须提供同步方式（例如 `scripts/rename-comp-token-abbreviations.mjs`，或按 AGENTS.md「HyperOS4 数据更新强制流程」先建快照、再走 `/api/token-document/import` / `--db`），或者在描述中明确说明只更新了源和种子；PR 描述不能声称线上或应用文档已同步。
6. **写库或调用 API 的脚本保留安全措施**：写入前创建快照、记录 `import_document` 日志、使 revision 增加、支持 `DRY_RUN=1`，写入后重新读取并校验。不得直接删除或手改 `.data/collaboration-store.json`。

漏掉任一条，都会让源、种子与应用中显示和导出的数据悄悄分叉；这类分叉很难通过界面发现，而导出的 Android XML / CSS 会直接交付给开发。

## 示例

错误——只改了 DTCG 源的一个 Mode，种子未更新：

```diff
 figma-token/Component Token/Light.tokens.json
-    "miuix_comp_seg_color_fill_enabled": {
+    "miuix_comp_segment_color_fill_enabled": {
```

正确（参考 PR #5 / #6）——`Light.tokens.json`、`Dark.tokens.json` 和 `sample-tokens-hyperos4.json` 中同一 Token 一起改名，并提供迁移脚本同步已有协作文档：

```diff
 figma-token/Component Token/Light.tokens.json
-    "miuix_comp_seg_color_fill_enabled": {
+    "miuix_comp_segment_color_fill_enabled": {
 figma-token/Component Token/Dark.tokens.json
-    "miuix_comp_seg_color_fill_enabled": {
+    "miuix_comp_segment_color_fill_enabled": {
 src/data/sample-tokens-hyperos4.json
-      "name": "segment/miuix_comp_seg_color_fill_enabled",
+      "name": "segment/miuix_comp_segment_color_fill_enabled",
 scripts/rename-comp-token-abbreviations.mjs   (新增：更新已有 hyperos4 文档)
```

正确——Figma MCP 同步只更新基线与种子，无需改 DTCG：

```diff
 figma-token/figma-variables.json
 src/data/sample-tokens-hyperos4.json
 # text_style/* TYPOGRAPHY 可仅存在于种子，无 DTCG 对应项
```
