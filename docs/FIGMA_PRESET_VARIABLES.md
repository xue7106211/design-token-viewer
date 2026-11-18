# Figma Token 源文件

HyperOS 5 的主路径是一次 Figma 读取、同时更新 Neon 和 GitLab CSV：

1. `npm run figma:plugin` 生成只读插件，由 `use_figma` 执行，增量包存到 `/tmp/figma-delta`。
2. `npm run token:preview` 预览 Neon 差异，并按增量包生成 `exports/HyperOS_Design_Token_YYYYMMDD.csv`（不写库）。
3. 确认后 `npm run token:sync` 写入 Neon，并生成当天 CSV。CSV 不提交，由人工放进 GitLab OS5token。

规范快照 `figma-token/figma-variables.json` 是唯一数据源。Text Style 的 `lineHeight` 一律是 `AUTO`：不读取 Figma 里的定高、百分比或行高变量绑定，也不修改 Figma。变量表里的 `miuix_ref_line_height_*` 保留。

`scripts/sync-figma-variables.mjs` 仍可单独写入种子、API 或数据库。步骤与约束见 `AGENTS.md` 的“通过 Figma MCP 同步 HyperOS 5”。W3C DTCG 导出保留为备用，见下文，不是主流程。

## HyperOS 5 DTCG 流程

仓库不再保存 DTCG 导出，`figma-token/` 里只有 Figma MCP 同步基线 `figma-variables.json`。要走这条备用流程，先从 Figma 重新导出三套 Collection 的 Light / Dark 文件，放到 `figma-token/` 下：

- `Component Token/{Light,Dark}.tokens.json`
- `Reference Token/{Light,Dark}.tokens.json`
- `Semantic Token/{Light,Dark}.tokens.json`

每个叶子 Token 使用 `$type` 与 `$value`；别名位于 `$extensions["com.figma.aliasData"]`，以 `targetVariableSetName` 和 `targetVariableName` 指向目标。运行时解析器不直接读取 DTCG 文件，需执行：

```bash
node scripts/figma-dtcg-to-sample.mjs
```

脚本生成 `src/data/sample-tokens-hyperos4.json`，并打印各 Collection 数量及别名解析结果。脚本虽然会把未解析别名降级为 DTCG 原始值，但正式同步要求输出中的 `Aliases unresolved (fell back to raw value)` 计数为 `0`；非 0 时必须停止，不得导入或报告完成。

生成的 Figma Native JSON 包含：

- **Collection**：`id`、`name`、`modes`、`variableIds`。
- **Mode**：每个 Collection 的 `modes: [{ modeId, name }]`。
- **Value**：每个 Variable 的 `valuesByMode: Record<modeId, VariableValue>`。当前 DTCG converter 专门保真转换 `color` 和 `number`，别名转为 `ALIAS`；其他具体 DTCG 类型统一降级为 `STRING`。Figma Native 运行时模型本身支持 `COLOR`、`NUMBER`、`STRING`、`BOOLEAN` 和 `ALIAS`。
- **Metadata**：从代表 Token 保留 `description` 与 `scopes`；优先取 Light，Light 缺失时取 Dark。
- **Code syntax**：当前转换器初始化为空对象 `codeSyntax: {}`；Figma Native parser/rebuilder 支持 `{ WEB?, ANDROID?, iOS? }`。

转换器会重新生成位置型 `var_n` ID，而不是沿用 DTCG 的 Figma variable ID；别名按 Collection 名与 Token 名重新关联。颜色输出保留 RGBA 数值，不保留 DTCG 的 `hex`、`colorSpace` 或其他未显式处理的扩展字段。

相关实现：

- `src/lib/parsers/types.ts`：`FigmaVariable`、`FigmaCollection`、`FigmaCodeSyntax`
- `src/types/token.ts`：`DesignToken`（含 `description`、`scopes`）
- `src/lib/token-rebuilder.ts`：从内部模型重建 Figma Native JSON

### 种子不等于运行数据

`sample-tokens-hyperos4.json` 只在 HyperOS 5 文档首次创建时灌入。已有文档必须按 `AGENTS.md` 的“HyperOS 5 数据更新强制流程”创建快照，再调用 `POST /api/token-document/import`：请求头为 `x-document-id: hyperos4`，请求体为 `{ json, revision, actor: { actorName, actorClientId } }`。随后调用 `/api/export?format=json`，从 `{ format, code }` 响应中取 `JSON.parse(code)` 与种子深度比较。只生成种子不会覆盖 repository 中的 `hyperos4.currentJson`。
