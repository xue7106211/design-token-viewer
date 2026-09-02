# Figma Token 源文件

## 当前 HyperOS4 流程：W3C DTCG 导出

HyperOS4 的权威源文件是 `figma-token/` 下三套 Collection 的 Light / Dark DTCG 导出：

- `Component Token/{Light,Dark}.tokens.json`
- `Reference Token/{Light,Dark}.tokens.json`
- `Semantic Token/{Light,Dark}.tokens.json`

每个叶子 Token 使用 `$type` 与 `$value`；别名位于 `$extensions["com.figma.aliasData"]`，以 `targetVariableSetName` 和 `targetVariableName` 指向目标。运行时解析器不直接读取 DTCG 文件，需执行：

```bash
node scripts/figma-dtcg-to-sample.mjs
```

脚本会生成 `src/data/sample-tokens-hyperos4.json`，并打印已解析与未解析的别名数。未解析别名会降级为 DTCG 中的原始值；应补齐目标 Collection 后重新生成。

生成的 Figma Native JSON 包含以下结构：

- **Collection**：`id`、`name`、`modes`、`variableIds`。
- **Mode**：每个 collection 的 `modes: [{ modeId, name }]`。
- **Value**：每个 variable 的 `valuesByMode: Record<modeId, VariableValue>`，支持 `COLOR`、`NUMBER`、`STRING`、`BOOLEAN` 及 `ALIAS`。
- **Code syntax**：可选 `codeSyntax?: { WEB?, ANDROID?, iOS? }`。

类型定义见 `src/lib/parsers/types.ts`（`FigmaVariable`、`FigmaCollection`、`FigmaCodeSyntax`）。

## 兼容旧的扁平变量脚本

`figma-flat-to-preset.mjs` 和 `figma-vars-to-sample.mjs` 只用于手动提供的扁平变量 JSON。它们需要先在 `scripts/figma-hyperos4-vars.json` 放入输入；当前仓库未提供该输入或输出预设文件。

- `node scripts/figma-flat-to-preset.mjs` 输出 `scripts/figma-hyperos4-preset.json`，用于格式检查。
- `node scripts/figma-vars-to-sample.mjs` 会覆盖 `src/data/sample-tokens.json`（HyperOS3 种子），不应用于当前 HyperOS4 DTCG 同步流程。
