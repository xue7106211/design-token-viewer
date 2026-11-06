---
files:
  - "figma-token/**"
  - "src/data/sample-tokens-hyperos4.json"
  - "scripts/*.mjs"
  - "scripts/lib/*.mjs"
  - "scripts/data/**"
  - "!scripts/**/*.test.mjs"
---

# HyperOS4 DTCG 源、种子与已有文档保持一致

HyperOS4 数据有三层：`figma-token/<Collection>/{Light,Dark}.tokens.json`（DTCG 源）、`src/data/sample-tokens-hyperos4.json`（由脚本生成的 Figma Native 种子）、以及 repository 中已存在的 `hyperos4` 文档 `currentJson`。改动这些数据或生成它们的脚本时，必须满足：

1. **源与种子在同一个 PR 中同步变化**。修改 `figma-token/` 下任一 Token 的名称、值、别名、description 或 scopes，种子中必须有对应变化，反之亦然；种子应由 `scripts/figma-dtcg-to-sample.mjs`（或 `sync-figma-variables.mjs` / `merge-miuix-text-styles.mjs`）重新生成，而不是只手改其中一边。修改转换脚本（如 `940c1c4` 的 float32 修正）时，也要随之提交重新生成的种子。
2. **Light 与 Dark 成对修改**。同一 Collection 的 `Light.tokens.json` 与 `Dark.tokens.json` 应包含相同的 Token 名称集合；重命名、新增或删除只改了一个 Mode 文件是错误的。
3. **不引入悬空别名**。别名按 `targetVariableName` + `targetVariableSetName` 引用；重命名或删除被引用的 Token 时，所有引用方必须一并更新，否则转换时会回退为原始值。
4. **重命名需要考虑已有文档**。种子只在文档首次创建时灌入，所以修改种子不会更新已部署的 `currentJson`。对已有 Token 的重命名或删除，PR 必须提供同步方式（例如 `scripts/rename-comp-token-abbreviations.mjs`，或按 AGENTS.md「HyperOS4 数据更新强制流程」先建快照、再走 `/api/token-document/import`），或者在描述中明确说明只更新了源和种子；PR 描述不能声称线上或应用文档已同步。
5. **写库或调用 API 的脚本保留安全措施**：写入前创建快照、记录 `import_document` 日志、使 revision 增加、支持 `DRY_RUN=1`，写入后重新读取并校验。不得直接删除或手改 `.data/collaboration-store.json`。

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
