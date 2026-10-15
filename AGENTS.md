# AGENTS.md — Design Token Viewer

## 项目概述

Design Token Viewer 是一个 Figma 设计令牌可视化工具，用于浏览、编辑和导出设计令牌。主要面向 Xiaomi HyperOS 设计系统。

核心能力：
- 解析 Figma Variables 原生导出 JSON 和 Variables2CSS 插件格式
- 多套 Token 表切换（HyperOS3 / HyperOS4），文档、编辑、日志和快照恢复按文档隔离
- 可视化浏览令牌（颜色色块、数值预览、树形导航）
- 多 Collection / 多 Mode 切换
- 保留并展示 Figma description；Token Inspector 对 COLOR、NUMBER、STRING、BOOLEAN 四种 Token 均展示 Token Scope，多个 scope 分别以 Badge 呈现，无 scope 时显示“未设置”
- 令牌编辑（值、名称、描述、codeSyntax、别名引用），以及删除、批量移动分组、重排序和分组重命名
- 变更日志（记录编辑、移动分组、导入和快照操作，含 actor / IP / 时间戳 / 前后值）
- 代码导出（CSS 自定义属性、Android XML resources、原始 JSON）
- 亮色/暗色主题

## 技术栈

| 层面 | 技术 |
|------|------|
| 框架 | Next.js 16（App Router, Turbopack） |
| UI | React 19、Tailwind CSS 4、shadcn/ui（Radix）、Lucide |
| 状态 | Zustand（UI 偏好持久化）+ 服务端协作文档 |
| 主题/动画 | next-themes、Framer Motion、unicode-animations |
| 语法高亮 | Shiki（github-light / github-dark 双主题） |
| 颜色处理 | colord |
| 文件下载 | file-saver |
| 数据/存储 | Drizzle ORM + postgres/PostgreSQL；非 production 无数据库时使用文件 repository |
| 单元测试 | Vitest + Testing Library + jsdom |
| E2E | Playwright（Chromium） |
| 语言 | TypeScript（strict）、中文 UI |

## 目录结构

```
src/
├── app/                    # Next.js App Router
│   ├── layout.tsx          # 根布局 (Geist 字体, Providers)
│   ├── page.tsx            # 首页：加载共享文档；加载失败时显示错误状态
│   ├── providers.tsx       # ThemeProvider + TooltipProvider
│   ├── globals.css         # Tailwind + shadcn 主题变量 (oklch)
│   └── api/                     # Route Handlers：文档、Token 编辑、快照、日志、导出
│       ├── token-document/       # GET/POST 读取与导入；import/ 为 POST 别名
│       ├── tokens/               # 单 Token 编辑/删除；reorder/ 重排序；move-to-group/ 原子移动分组并可选重排序
│       ├── groups/rename/        # PATCH 分组重命名
│       ├── snapshots/            # GET/POST 列表与创建；[snapshotId]/restore 恢复
│       ├── change-logs/          # 变更日志读取
│       ├── client-ip/            # 请求来源 IP
│       ├── export/               # 服务端导出
│       └── save-sample-tokens/   # DEV-only: 写回 HyperOS3 示例种子
├── components/
│   ├── ui/                 # shadcn/ui 基础组件 (无业务逻辑)
│   │   ├── badge.tsx
│   │   ├── button.tsx
│   │   ├── collapsible.tsx
│   │   ├── context-menu.tsx
│   │   ├── dialog.tsx
│   │   ├── dropdown-menu.tsx
│   │   ├── input.tsx
│   │   ├── scroll-area.tsx
│   │   ├── separator.tsx
│   │   ├── sheet.tsx
│   │   ├── tabs.tsx
│   │   └── tooltip.tsx
│   ├── layout/
│   │   ├── app-shell.tsx   # 主布局容器
│   │   ├── main-view.tsx   # 中间主内容区
│   │   └── sidebar.tsx     # 左侧边栏
│   └── features/           # 业务组件
│       ├── loading-screen.tsx      # 服务端文档加载状态
│       ├── loading-screen.test.tsx
│       ├── document-switcher.tsx   # HyperOS3 / HyperOS4 文档切换
│       ├── token-tree.tsx          # 侧边栏树形导航
│       ├── token-grid.tsx          # 网格视图
│       ├── token-list.tsx          # 列表视图
│       ├── token-card.tsx          # 单个令牌卡片
│       ├── token-inspector.tsx     # 右侧检查器面板 (可拖拽调宽；展示 description / Token Scope / 对比度)
│       ├── token-inspector.test.tsx # Token Scope 类型、顺序与空值回退测试
│       ├── token-edit-popover.tsx  # 浮动编辑弹窗 (可拖拽)
│       ├── code-output.tsx         # 代码展示 (Shiki 高亮)
│       ├── code-output.test.tsx
│       ├── export-dialog.tsx       # 导出对话框 (Android XML / CSS / JSON)
│       ├── changelog-dialog.tsx    # 变更日志对话框 (前后值对比 / 颜色色块)
│       ├── changelog-dialog.test.tsx
│       ├── snapshot-dialog.tsx     # 创建、下载、恢复版本快照
│       ├── color-swatch.tsx        # 颜色色块
│       ├── number-preview.tsx      # 数值预览
│       ├── spacing-preview.tsx     # 间距预览
│       ├── search-bar.tsx          # 搜索框
│       ├── view-toggle.tsx         # Grid/List 切换
│       ├── mode-switcher.tsx       # Mode 切换
│       └── theme-toggle.tsx        # 亮色/暗色切换
├── lib/
│   ├── parsers/
│   │   ├── index.ts               # parseTokenJSON — 统一入口，自动检测格式
│   │   ├── format-detector.ts     # detectFormat: figma-native | variables2css | unknown
│   │   ├── format-detector.test.ts
│   │   ├── figma-native.ts        # 解析 Figma 原生 JSON → ParsedTokenData
│   │   ├── variables2css.ts       # 解析 Variables2CSS JSON → ParsedTokenData
│   │   ├── parseTokenJSON.test.ts # parseTokenJSON 集成测试
│   │   └── types.ts               # Figma/V2CSS 原始 JSON 类型定义
│   ├── code-generators/
│   │   ├── index.ts               # generateTokenCode / generateTokenBlock
│   │   ├── css.ts                 # CSS 自定义属性生成
│   │   ├── android.ts             # Android XML resources 生成
│   │   ├── android.test.ts
│   │   └── utils.ts               # stripCodeSyntaxPrefix (去中文前缀)
│   ├── token-resolver.ts          # 别名递归解析 + 循环检测 + referencedBy 反向引用
│   ├── token-resolver.test.ts
│   ├── tree-builder.ts            # 从扁平令牌构建树形结构
│   ├── tree-builder.test.ts
│   ├── token-rebuilder.ts         # 从内部模型重建 Figma Native JSON (用于导出和持久化)
│   ├── token-rebuilder.test.ts    # 重建及 metadata 保真测试
│   ├── contrast.ts                # WCAG 对比度计算, colorToHex/RGB/HSL
│   ├── changelog.ts               # 变更日志工具: fetchClientIP / getChangeTypeLabel / formatTimestamp
│   ├── changelog.test.ts
│   ├── use-shiki.ts               # Shiki 语法高亮 hook (懒加载单例)
│   ├── sync-sample-tokens.ts      # DEV: POST 到 /api/save-sample-tokens
│   ├── collaboration/              # 文档、日志、快照的 client / server / service / repository
│   ├── db/                         # Drizzle PostgreSQL 连接和 schema
│   └── utils.ts                   # cn() (clsx + tailwind-merge)
├── stores/
│   ├── token-store.ts             # 服务端文档的 UI 状态与偏好持久化
│   ├── token-store.test.ts
│   ├── changelog-store.ts         # 服务端变更日志的前端缓存
│   └── changelog-store.test.ts
├── types/
│   ├── token.ts                   # 核心类型: DesignToken, TokenCollection, TokenTreeNode 等
│   ├── changelog.ts               # 变更日志类型: LogEntry, ChangeType
│   └── unicode-animations.d.ts    # 第三方模块声明
└── data/
    ├── sample-tokens.json          # HyperOS3 种子 (Figma Native 格式)
    └── sample-tokens-hyperos4.json # HyperOS4 种子 (由 DTCG 转换生成)
```

其他顶层目录：

```
figma-token/                # HyperOS4 Figma DTCG 导出源 (3 Collection × Light/Dark)
├── Component Token/{Light,Dark}.tokens.json
├── Reference Token/{Light,Dark}.tokens.json
└── Semantic Token/{Light,Dark}.tokens.json

scripts/                    # 辅助脚本
├── css-vars-to-sample.mjs
├── figma-flat-to-preset.mjs
├── figma-vars-to-sample.mjs
├── figma-dtcg-to-sample.mjs # W3C DTCG → Figma Native (合并多 Collection + 按名称解析别名)
└── init-db.mjs              # 用迁移 SQL 初始化数据库

docs/                       # 项目文档
├── ACCEPTANCE_CHECKLIST.md
├── FIGMA_PRESET_VARIABLES.md
├── PROJECT_STRUCTURE.md
└── superpowers/plans/       # 历史实现计划（不是当前功能承诺）

e2e/                        # Playwright E2E 测试
└── app.spec.ts

public/                     # 静态资源
├── hyperos-logo.png
├── file.svg / globe.svg / next.svg / vercel.svg / window.svg
```

## 数据流

读取流：
```text
GET /api/token-document（x-document-id）
  → ensureDocument：repository 中不存在时才从对应 seed 创建文档
  → parseTokenJSON → resolveTokens
  → 按 id + name + type 从 seed 补齐旧文档缺失的 description/scopes（仅返回视图）
  → TokenDocumentView（currentJson、collections、已解析 tokens）
  → Zustand applyDocument → 客户端 buildTokenTree / 搜索过滤
  → UI 渲染
```

导入流：
```text
POST /api/token-document 或 /api/token-document/import（当前 revision + actor）
  → parseTokenJSON / resolveTokens 校验输入
  → 原样保存输入为 repository currentJson，revision + 1
  → 记录 import_document 日志
  → 返回解析后的 TokenDocumentView
```

编辑流：
```text
用户编辑/组织 Token
  → updateTokenValue/Name/Description/CodeSyntax、setTokenAlias、deleteToken、
    reorderFilteredTokens、moveTokensToGroup、renameGroup
  → 对应 Route Handler（当前 revision + actor）
  → service 解析 currentJson、应用修改、rebuildRawJSON 为 Figma Native
  → repository 保存并记录服务端变更日志
  → 返回最新 TokenDocumentView，前端更新 rawJSON + tokens + tree
```

`PATCH /api/tokens/move-to-group` 接收 `tokenIds`、`targetGroup`，以及成对可选的 `collectionId` / `tokenOrder`；service 在一次 `updateDocument` 中完成批量改组和可选重排序，只增加一次 revision，并记录一条 `move_tokens_to_group` 日志。

repository 在配置 `DATABASE_URL` 时使用 PostgreSQL；非 production 且未配置时使用 `.data/collaboration-store.json`。seed metadata 补齐不会因 GET 自动写回 `currentJson`，但后续编辑 rebuild 时可能随文档一起持久化。

## 核心类型 (src/types/token.ts)

- `DesignToken` — 统一令牌模型，包含 id, name, path, type, rawValues (per-mode), resolvedValues, description?, scopes?, isAlias, aliasOf, referencedBy, codeSyntax
- `TokenCollection` — 集合 (id, name, modes, tokenIds)
- `TokenTreeNode` — 树节点 (label, path, children, tokenId?, tokenType?, tokenCount)
- `TokenType` — "COLOR" | "NUMBER" | "STRING" | "BOOLEAN" | "TYPOGRAPHY"
- `RawTypographyValue` / `TypographyValue` — TYPOGRAPHY 的原始值（每字段可为具体值或 ALIAS）与解析值（fontFamily、fontStyle、fontSize、lineHeight，可选 letterSpacing、paragraphSpacing；尺寸为像素）。工具函数在 `src/lib/typography.ts`
- `CodeFormat` — "css" | "android"
- `ViewMode` — "grid" | "list"

## Token Store（token-store.ts）

关键状态：
- `rawJSON` — 服务端 `currentJson` 的前端副本，主要用于当前文档的全量原始 JSON 导出；持久化写入由 API/service 完成
- `revision` / `updatedAt` / `updatedBy` — 服务端文档版本，用于乐观并发控制与展示
- `collections` / `tokens` / `tree` — 解析后的数据
- `activeCollectionId` / `activeModeId` — 当前选中的集合和模式
- `selectedTokenId` — 选中的令牌 (打开 Inspector)
- `scrollToTokenId` — 滚动到指定令牌
- `expandedPaths` — 树形导航展开状态
- `searchQuery` — 搜索关键词
- `filteredTokenIds` — 搜索过滤后的令牌 ID 列表
- `editingTokenId` / `editingPosition` — 编辑弹窗状态
- `viewMode` / `codeFormat` / `inspectorWidth` / `inspectorOpen` — UI 偏好

关键 Actions：
- `loadJSON` / `clearData` — 数据加载与清除
- `selectToken` / `scrollToGroup` — 导航
- `updateTokenValue` / `updateTokenName` / `updateTokenDescription` / `updateTokenCodeSyntax` — 编辑
- `setTokenAlias` — 设置/取消别名引用
- `deleteToken` — 删除令牌
- `reorderFilteredTokens` — 重排序
- `moveTokensToGroup` — 批量移动 Token 到目标分组；拖放时可同时提交 Collection 新顺序
- `renameGroup` — 重命名分组
- `exportRawJSON` — 导出原始 JSON
- `getTokensByGroup` / `getVisibleTokens` — 查询

浏览器持久化字段：activeDocumentId、activeCollectionId、activeModeId、expandedPaths、searchQuery、viewMode、codeFormat、inspectorWidth。Token 正文、日志和快照不写入 localStorage。

## ChangeLog Store（changelog-store.ts）

独立的 Zustand store，用于缓存当前文档从 `/api/change-logs` 读取的服务端日志；它不使用 persist middleware。

关键状态：
- `entries` / `total` — 当前文档最新一页日志，以及服务端总条数。接口按时间倒序最多返回 500 条；`total` 大于 `entries.length` 时界面标明只显示最新一页
- `clientIP` — 兼容本地日志工具的 IP 缓存；实际服务端 actor 在 `providers.tsx` 通过 `/api/client-ip` 初始化

关键 Actions：
- `fetchEntries` — 从当前文档的服务端日志加载条目
- `resetForDocument` — 切换文档时清空当前前端缓存并作废进行中的请求；不删除服务端日志
- `setClientIP` / `fetchAndCacheIP` — 设置 / 获取兼容本地日志工具的 IP 缓存

类型 (types/changelog.ts)：
- `LogEntry` — id, timestamp, ip, actorName, actorClientId, changeType, tokenId?, tokenName?, oldValue?, newValue?, meta?
- `ChangeType` — update_value | update_name | update_description | update_code_syntax | set_alias | delete_token | rename_group | move_tokens_to_group | reorder | restore_snapshot | create_snapshot | import_document

工具 (lib/changelog.ts)：
- `fetchClientIP` — 调用 api.ipify.org 获取公网 IP (5s 超时，失败返回 "unknown")
- `getChangeTypeLabel` — ChangeType → 中文标签
- `formatTimestamp` — Unix 毫秒 → `YYYY-MM-DD HH:mm:ss`

UI：`changelog-dialog.tsx` 提供日志查看对话框（sidebar 底部入口），按时间倒序展示，颜色变更以色块高亮前后值对比；`snapshot-dialog.tsx` 可创建、下载和恢复服务端快照。

## 支持的 JSON 格式

1. **Figma Native** — `{ collections: [...], variables: { [id]: { valuesByMode, description?, scopes?, codeSyntax?, ... } } }`
   - 扩展类型 `TYPOGRAPHY`（Figma 本身不导出）：一个 Figma Text Style = 一个 Token，不拆成多个变量。`valuesByMode[modeId]` 为整体 `ALIAS`（指向另一个 TYPOGRAPHY Token），或 `{ "type": "TYPOGRAPHY", "value": { "fontFamily": F, "fontStyle": F, "fontSize": F, "lineHeight": F, "letterSpacing"?: F, "paragraphSpacing"?: F } }`，其中每个 F 为 `{ "type": "STRING"|"NUMBER", "value": … }` 或 `{ "type": "ALIAS", "id": "var_…" }`
2. **Variables2CSS** — `{ collections: [{ name, modes, variables: [{ name, type, values }] }] }`

检测逻辑在 `format-detector.ts`，通过结构特征自动判断。Figma Native parser 与 `rebuildRawJSON` 保留 `description/scopes/codeSyntax`；Variables2CSS 不提供同等的别名与 Figma metadata 保真能力。

> **W3C DTCG**（Figma 新版「导出变量」格式）**不被运行时解析器识别**，需离线转换：`$type/$value/$extensions` 结构，颜色为 `{ components:[r,g,b], alpha, hex }`，别名在 `$extensions["com.figma.aliasData"]` 中**按 `targetVariableName` + `targetVariableSetName`（名称，而非 variableId）** 引用。`scripts/figma-dtcg-to-sample.mjs` 将其转成 Figma Native 种子，并保留受支持的 description/scopes。

## 多套 Token 表（多文档架构）

应用支持多套独立 Token 表，`DocumentSwitcher` 位于 Sidebar 顶部、Collection 列表上方，可在 **HyperOS3 / HyperOS4** 间切换。数据库 schema 按 `document_id` 隔离，故新增文档无需改库。

关键点：
- **注册表** `src/lib/collaboration/server.ts` 的 `DOCUMENTS = { hyperos3: {name, seed}, hyperos4: {name, seed} }`；`getTokenDocumentService(documentId)` 按 id 选种子；`documentIdFromRequest(request)` 从 `x-document-id` 头解析（非法值回退 `hyperos4`）。
- **种子**：`src/data/sample-tokens.json`（HyperOS3）、`src/data/sample-tokens-hyperos4.json`（HyperOS4）。种子仅在该文档首次创建时灌入（`ensureDocument` 读不到才创建）。
- **前端**：`client.ts` 模块级 `activeDocumentId` + `TOKEN_DOCUMENTS` 清单，在 `apiRequest` 统一注入 `x-document-id` 头；`token-store` 的 `activeDocumentId`（持久化）+ `setActiveDocument(id)`（清状态后 `loadRemoteDocument`），水合时在 persist `merge` 里调 `setActiveDocumentId` 同步。
- **隔离**：编辑、日志、快照列表/读取/导出和快照恢复按 `document_id` 隔离。恢复时要求 `snapshot.documentId === document.id`，否则返回 404，不改文档、不写恢复日志。

> 新增第三套表：① `client.ts` 的 `TOKEN_DOCUMENTS` 加一项；② `server.ts` 的 `DOCUMENTS` 加种子；③ 放置对应种子 JSON。无需改数据库或迁移。
> 替换已存在文档的种子不会自动生效（种子只首次灌入）。使用 `/api/token-document/import` 以当前 revision 导入新的 Figma Native JSON；不要通过删除 `.data/collaboration-store.json` 重置已有文档。

### HyperOS4 数据更新强制流程

更新 Component / Reference / Semantic 任一套 HyperOS4 DTCG 数据时，必须完整执行以下步骤，不得在只替换源文件或只生成种子后报告完成：

1. **确认输入版本**：以用户明确指定的目录或文件为本次权威输入，逐文件比较内容或 SHA-256，确认已同步到 `figma-token/<Collection>/{Light,Dark}.tokens.json`。只能确认“与本次指定输入一致”，不得在未核对其他来源时笼统声称是 Figma 中的最新版本。
2. **重新生成种子**：运行 `node scripts/figma-dtcg-to-sample.mjs`，检查各 Collection 的 Token 数量，并要求输出中的 `Aliases unresolved (fell back to raw value)` 计数为 `0`；否则先处理未解析别名，不得继续导入。
3. **识别真实运行数据**：明确区分 DTCG 源、`src/data/sample-tokens-hyperos4.json` 种子和 repository 中已有的 `hyperos4.currentJson`。页面读取协作文档，`/api/export` 未指定快照时也以该文档的 `currentJson` 为源；更新种子不会自动覆盖已有文档。service 对旧文档的 description/scopes 展示层补齐不等于 `currentJson` 已同步。
4. **同步已有文档**：读取当前 revision，导入前必须创建快照，再调用 `POST /api/token-document/import`。请求头必须包含 `x-document-id: hyperos4`，请求体必须为 `{ json, revision, actor: { actorName, actorClientId } }`，其中 `json` 是新种子对象。禁止直接删除或手改 `.data/collaboration-store.json`。
5. **最终验收**：重新读取文档并调用 `/api/export?format=json`。接口返回 `{ format, code }`，应比较 `JSON.parse(code)` 与 `src/data/sample-tokens-hyperos4.json`，并确认 revision 已增加、总变量数及各 Collection 数量符合转换报告、无悬空别名、Light/Dark 模式值完整。

只有第 5 步全部通过，才可对用户确认应用数据和导出结果已经更新。若无法访问正在使用的 repository（例如生产数据库），必须明确说明只更新了源和种子，不能声称线上或当前应用文档已同步。

安全边界：导入 API 当前没有内建认证或授权；`actor` 是调用方可填写的审计标签，revision 只提供乐观并发控制。公开部署必须通过网络/网关限制接口访问，或补充真实鉴权，不能把 actor、revision 或 `x-document-id` 当作身份校验。

存储策略：非 production 环境未设置 `DATABASE_URL` 时使用 Git 忽略的 `.data/collaboration-store.json`；生产环境必须设置 PostgreSQL `DATABASE_URL` 并运行 `npm run db:migrate`。

## 命令

```bash
npm run dev          # 开发服务器
npm run build        # 生产构建
npm run start        # 运行已完成的生产构建
npm run test         # Vitest 单元测试
npm run test:watch   # Vitest watch 模式
npm run test:coverage # 测试覆盖率
npm run test:e2e     # Playwright E2E (需先 npx playwright install)
npm run lint         # ESLint
npm run db:generate  # 生成 Drizzle 迁移
npm run db:migrate   # 执行 Drizzle 迁移（需要 DATABASE_URL）
npm run db:init      # 直接执行初始 SQL（需要 DATABASE_URL）
```

## 测试约定

- 单元测试与源码同目录：`*.test.ts` / `*.test.tsx`
- Vitest 配置：`vitest.config.ts`，环境 jsdom
- E2E 在 `e2e/` 目录，Playwright 配置在 `playwright.config.ts`
- 属性测试使用 fast-check

## 路径别名

`@/*` → `src/*` (tsconfig.json paths)

## 新增功能时的注意事项

- 新解析格式 → `src/lib/parsers/` 新增 parser + 更新 format-detector + index.ts
- 新增一套 Token 表 → 更新 `client.ts` 的 `TOKEN_DOCUMENTS` + `server.ts` 的 `DOCUMENTS` + 放置种子 JSON（无需改库）
- HyperOS4 数据更新 → 必须完整执行上文“HyperOS4 数据更新强制流程”；替换 DTCG、生成种子或导入文档中的任一步都不能单独视为完成，最终以导出 JSON 与种子深度一致为准
- 新代码导出格式 → `src/lib/code-generators/` 新增 generator + 更新 index.ts + `CodeFormat` 类型
- 新 UI 组件 → `src/components/features/` (业务) 或 `ui/` (通用)
- 新纯逻辑 → `src/lib/` + 同目录 `*.test.ts`
- `syncSampleTokensToFile()` 是仅写回 HyperOS3 种子的未接线开发辅助函数；不得把它当作共享文档持久化机制
- 新增服务端 Token 编辑操作时，应在 `src/lib/collaboration/service.ts` 中记录对应 ChangeType 和日志；前端 action 需要携带 revision 与 actor
- Shiki 高亮新增语言 → 更新 `use-shiki.ts` 的 `FORMAT_LANG` 映射和 `langs` 数组
- shadcn/ui 组件通过 `npx shadcn@latest add <component>` 添加到 `src/components/ui/`
- 主题色使用 oklch 色彩空间，定义在 `globals.css` 的 `:root` 和 `.dark`

## 已知设计决策

- 默认通过 `page.tsx` 自动加载服务端 HyperOS4 文档；没有可用文档时显示加载错误，不提供用户侧上传
- Token 编辑弹窗使用 Portal + 可拖拽浮窗，而非内联表单
- Inspector 面板宽度可拖拽调整 (280-560px)，持久化到 localStorage
- Android XML 中 codeSyntax.ANDROID 优先于从 token name 派生的名称
- `stripCodeSyntaxPrefix` 会去除中文前缀（如 "文字_on_surface" → "on_surface"），这是 HyperOS 特有的命名约定
- rebuildRawJSON 始终输出 Figma Native 格式，即使原始输入是 Variables2CSS
- DTCG converter、Figma Native parser 与 rebuildRawJSON 保留受支持的 description/scopes；Inspector 展示非空 description，并对 COLOR、NUMBER、STRING、BOOLEAN 四种 Token 固定展示 Token Scope。Scope 位于 description 之后、COLOR 对比度之前；多个 scope 按源顺序分别显示为 Badge，无 scope 或仅含空白值时显示“未设置”
- service 仅对 id/name/type 均匹配的旧 Token 从 seed 补齐缺失 metadata；GET 只影响返回视图、不改 currentJson，后续编辑 rebuild 时可能写回
- 导出支持 Android XML、CSS、JSON；来源可选当前过滤结果、当前文档全部 Collection 或版本快照。“全部”JSON 使用 currentJson，“当前”JSON 由可见 Token 重建
- 快照来源在导出对话框显示的 Token 数当前取自当前可见 Token，不代表快照内容的精确数量
- 变更日志与快照保存在当前服务端文档中。读取日志按文档倒序分页，最多返回最新 500 条，并带总条数。ChangeLog Store 只缓存这一页，`clearData` 和切换文档都不会删除服务端记录。文档保存和对应日志写入在同一次 `transact` 中提交，日志写入失败时文档修改会回滚
- TYPOGRAPHY 字段别名计入目标 Token 的 referencedBy；任一字段缺失、引用缺失或类型不符时整个 Token 解析为错误 STRING。`isAlias` 仅表示整体别名。导出：CSS 为 `font` 简写（`500 32px/42px "MiSans"`，不含 letterSpacing）；Android 为 `<style>`，字段别名暂输出解析后的字面值（textSize / lineHeight 用 sp，fontStyle → `android:textFontWeight`，letterSpacing px → em，不输出 paragraphSpacing），整体别名输出 `parent`。编辑弹窗暂不支持编辑 TYPOGRAPHY 字段值
- HyperOS4 的 24 个 miuix Text Style 位于 Semantic Token 的 `text_style/miuix_text_style_*`，由 `scripts/merge-miuix-text-styles.mjs` 按 Reference Token 名称追加（输入 `scripts/data/miuix-text-styles.json`；支持 `--seed` / `--api` / `--out` / `--db`，幂等）。DTCG 转换脚本不生成这些 Token，重新执行 HyperOS4 DTCG 更新流程后需再运行此脚本
- Semantic Token 顶层树组固定为 `bg → fill → stroke → text → mask → margin → padding → gap → radius → text_style`；其他 Collection 和子组维持自然排序


## 已知限制

- `export-dialog.tsx` 的快照请求失败路径当前会保留快照来源标签并回退到本地代码。修复为 fail-closed 前，必须确认远端请求成功后再允许复制或下载，不能只根据来源标签判断内容来自快照。
- `move-to-group` 当前尚未严格拒绝缺失或非字符串的 `targetGroup`，service 也未校验目标名称冲突及 `tokenIds` 与可选 `collectionId` 的归属一致性；List 的混合分组多选 no-op 判断以触发行所在分组为准。修复并补齐 Route / Store / List 边界测试前，不得将该能力描述为已覆盖所有异常输入。
