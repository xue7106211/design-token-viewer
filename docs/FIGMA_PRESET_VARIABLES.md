# Figma Token 源文件

HyperOS4 有两条更新路径：

- **Figma MCP 增量同步**（推荐）：`scripts/sync-figma-variables.mjs` 直接读取 Figma 文件的本地 Variables 与 Text Style，基线为 `figma-token/figma-variables.json`。步骤与约束见 `AGENTS.md` 的“通过 Figma MCP 同步 HyperOS4”。
- **W3C DTCG 导出**：见下文。

## HyperOS4 DTCG 流程

HyperOS4 的权威源文件是 `figma-token/` 下三套 Collection 的 Light / Dark DTCG 导出：

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

`sample-tokens-hyperos4.json` 只在 HyperOS4 文档首次创建时灌入。已有文档必须按 `AGENTS.md` 的“HyperOS4 数据更新强制流程”创建快照，再调用 `POST /api/token-document/import`：请求头为 `x-document-id: hyperos4`，请求体为 `{ json, revision, actor: { actorName, actorClientId } }`。随后调用 `/api/export?format=json`，从 `{ format, code }` 响应中取 `JSON.parse(code)` 与种子深度比较。只生成种子不会覆盖 repository 中的 `hyperos4.currentJson`。

## 兼容旧脚本

这些脚本不是 HyperOS4 DTCG 正式同步流程：

- `figma-flat-to-preset.mjs`：读取手动提供的 `scripts/figma-hyperos4-vars.json`，输出 `scripts/figma-hyperos4-preset.json` 做格式检查；当前仓库未提供输入或输出预设。
- `figma-vars-to-sample.mjs`：读取相同的扁平变量输入并覆盖 `src/data/sample-tokens.json`（HyperOS3 种子）。
- `css-vars-to-sample.mjs`：读取脚本内嵌的 `CSS_VARS_INPUT` 并覆盖 `src/data/sample-tokens.json`；当前实现不读取 stdin。

运行任何兼容脚本前都应确认输出目标，避免误覆盖 HyperOS3 种子。
