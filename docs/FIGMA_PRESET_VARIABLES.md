# Figma 预设变量文件

## 格式说明

预设变量文件（如 `scripts/figma-hyperos4-preset.json`）采用与 Figma 原生 / Plugin API 对齐的结构，便于检查格式并与后续插件导出对接。

- **Collection**：`id`、`name`、`modes`、`variableIds`；可选 `defaultModeId`、`key`。
- **Mode**：每个 collection 的 `modes: [{ modeId, name }]`。
- **Value**：每个 variable 的 `valuesByMode: Record<modeId, VariableValue>`，支持 `COLOR`、`NUMBER`、`STRING`、`BOOLEAN` 及 `ALIAS`。
- **Code syntax**：每个 variable 可选字段 `codeSyntax?: { WEB?, ANDROID?, iOS? }`，与 [Figma Variable.codeSyntax](https://www.figma.com/plugin-docs/api/Variable/#codesyntax) 一致。

类型定义见 `src/lib/parsers/types.ts`（`FigmaVariable`、`FigmaCollection`、`FigmaCodeSyntax`）。

## 数据来源与限制

- **Figma MCP `get_variable_defs`** 仅返回扁平键值（如 `"CollectionName/VarName": "#hex"`），不包含 Collection 列表、多 Mode、Code syntax、变量的 `key` 等。
- 若要获得完整的 **codeSyntax** 与多 **Mode** 数据，需要通过 **Figma 插件** 或 **REST API** 从文件中导出，再替换或合并本仓库中的预设文件。

## 生成预设文件

从扁平变量 JSON（如通过 MCP 获取并保存的 `figma-hyperos4-vars.json`）生成完整预设结构（含 Code syntax 占位）：

```bash
node scripts/figma-flat-to-preset.mjs
```

输出路径：`scripts/figma-hyperos4-preset.json`。
