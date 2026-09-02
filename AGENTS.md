# AGENTS.md — Design Token Viewer

## 项目概述

Design Token Viewer 是一个 Figma 设计令牌可视化工具，用于浏览、编辑和导出设计令牌。主要面向 Xiaomi HyperOS 设计系统。

核心能力：
- 解析 Figma Variables 原生导出 JSON 和 Variables2CSS 插件格式
- 多套 Token 表切换（HyperOS3 / HyperOS4），各自数据/日志/快照独立
- 可视化浏览令牌（颜色色块、数值预览、树形导航）
- 多 Collection / 多 Mode 切换
- 令牌编辑（值、名称、描述、codeSyntax、别名引用）
- 变更日志（记录所有编辑操作，含 IP / 时间戳 / 前后值对比）
- 代码导出（CSS 自定义属性、Android XML resources）
- 亮色/暗色主题

## 技术栈

| 层面　　 | 技术　　　　　　　　　　　　　　　　　　　　|
| ----------| ---------------------------------------------|
| 框架　　 | Next.js 16 (App Router, Turbopack)　　　　　|
| UI　　　 | React 19, Tailwind CSS 4, shadcn/ui (Radix) |
| 状态　　 | Zustand（UI 偏好持久化）+ 服务端协作文档　　　　　|
| 动画　　 | Framer Motion　　　　　　　　　　　　　　　 |
| 语法高亮 | Shiki (github-light / github-dark 双主题)　 |
| 颜色处理 | colord　　　　　　　　　　　　　　　　　　　|
| 文件下载 | file-saver　　　　　　　　　　　　　　　　　|
| 单元测试 | Vitest + Testing Library + jsdom　　　　　　|
| E2E　　　| Playwright (Chromium)　　　　　　　　　　　 |
| 语言　　 | TypeScript (strict), 中文 UI　　　　　　　　|

## 目录结构

```
src/
├── app/                    # Next.js App Router
│   ├── layout.tsx          # 根布局 (Geist 字体, Providers)
│   ├── page.tsx            # 首页：加载共享文档；加载失败时显示错误状态
│   ├── providers.tsx       # ThemeProvider + TooltipProvider
│   ├── globals.css         # Tailwind + shadcn 主题变量 (oklch)
│   └── api/                     # Route Handlers：文档、Token 编辑、快照、日志、导出
│       ├── token-document/       # 读取 / 导入当前文档
│       ├── tokens/               # 值、名称、描述、Code Syntax、别名、删除、重排序
│       ├── groups/rename/        # 分组重命名
│       ├── snapshots/            # 快照创建、读取、恢复
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
│       ├── document-switcher.tsx   # HyperOS3 / HyperOS4 文档切换
│       ├── token-tree.tsx          # 侧边栏树形导航
│       ├── token-grid.tsx          # 网格视图
│       ├── token-list.tsx          # 列表视图
│       ├── token-card.tsx          # 单个令牌卡片
│       ├── token-inspector.tsx     # 右侧检查器面板 (可拖拽调宽)
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
│   ├── changelog-store.ts         # 服务端变更日志的前端缓存
│   └── changelog-store.test.ts
├── types/
│   ├── token.ts                   # 核心类型: DesignToken, TokenCollection, TokenTreeNode 等
│   └── changelog.ts               # 变更日志类型: LogEntry, ChangeType
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
└── PROJECT_STRUCTURE.md

e2e/                        # Playwright E2E 测试
└── app.spec.ts

public/                     # 静态资源
├── hyperos-logo.png
├── file.svg / globe.svg / next.svg / vercel.svg / window.svg
```

## 数据流

```
JSON 文件（服务器维护导入）
  → POST /api/token-document/import（携带当前 revision 与 actor）
  → 服务端 parseTokenJSON → resolveTokens → buildTokenTree
  → repository（PostgreSQL；开发且无 DATABASE_URL 时为 .data 文件）
  → TokenDocumentView（原始 JSON、collections、已解析 tokens）
  → Zustand store（仅持久化文档选择与 UI 偏好）
  → UI 渲染
```

编辑流：
```
用户编辑 → updateTokenValue/Name/Description/CodeSyntax/Alias
  → 对应 Route Handler（携带当前 revision 与 actor）
  → service 重新解析、重建 Figma Native JSON，并写入 repository
  → 记录服务端变更日志（类型 / 前后值 / actor / IP / 时间戳）
  → 返回最新 TokenDocumentView，前端更新 rawJSON + tokens + tree
```

## 核心类型 (src/types/token.ts)

- `DesignToken` — 统一令牌模型，包含 id, name, path, type, rawValues (per-mode), resolvedValues, isAlias, aliasOf, referencedBy, codeSyntax
- `TokenCollection` — 集合 (id, name, modes, tokenIds)
- `TokenTreeNode` — 树节点 (label, path, children, tokenId?, tokenCount)
- `TokenType` — "COLOR" | "NUMBER" | "STRING" | "BOOLEAN"
- `CodeFormat` — "css" | "android"
- `ViewMode` — "grid" | "list"

## Token Store（token-store.ts）

关键状态：
- `rawJSON` — 原始 JSON (用于持久化和导出)
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
- `renameGroup` — 重命名分组
- `exportRawJSON` — 导出原始 JSON
- `getTokensByGroup` / `getVisibleTokens` — 查询

浏览器持久化字段：activeDocumentId、activeCollectionId、activeModeId、expandedPaths、searchQuery、viewMode、codeFormat、inspectorWidth。Token 正文、日志和快照不写入 localStorage。

## ChangeLog Store（changelog-store.ts）

独立的 Zustand store，用于缓存当前文档从 `/api/change-logs` 读取的服务端日志；它不使用 persist middleware。

关键状态：
- `entries` — 当前文档的日志条目（UI 最多保留最新 500 条）
- `clientIP` — 兼容本地日志工具的 IP 缓存；实际服务端 actor 在 `providers.tsx` 通过 `/api/client-ip` 初始化

关键 Actions：
- `fetchEntries` — 从当前文档的服务端日志加载条目
- `clearAll` — 仅清空当前前端缓存，不删除服务端日志
- `setClientIP` / `fetchAndCacheIP` — 设置 / 获取兼容本地日志工具的 IP 缓存

类型 (types/changelog.ts)：
- `LogEntry` — id, timestamp, ip, changeType, tokenId?, tokenName?, oldValue?, newValue?, meta?
- `ChangeType` — update_value | update_name | update_description | update_code_syntax | set_alias | delete_token | rename_group | reorder

工具 (lib/changelog.ts)：
- `fetchClientIP` — 调用 api.ipify.org 获取公网 IP (5s 超时，失败返回 "unknown")
- `getChangeTypeLabel` — ChangeType → 中文标签
- `formatTimestamp` — Unix 毫秒 → `YYYY-MM-DD HH:mm:ss`

UI：`changelog-dialog.tsx` 提供日志查看对话框（sidebar 底部入口），按时间倒序展示，颜色变更以色块高亮前后值对比；`snapshot-dialog.tsx` 可创建、下载和恢复服务端快照。

## 支持的 JSON 格式

1. **Figma Native** — `{ collections: [...], variables: { [id]: { valuesByMode, codeSyntax, ... } } }`
2. **Variables2CSS** — `{ collections: [{ name, modes, variables: [{ name, type, values }] }] }`

检测逻辑在 `format-detector.ts`，通过结构特征自动判断。

> **W3C DTCG**（Figma 新版「导出变量」格式）**不被运行时解析器识别**，需离线转换：`$type/$value/$extensions` 结构，颜色为 `{ components:[r,g,b], alpha, hex }`，别名在 `$extensions["com.figma.aliasData"]` 中**按 `targetVariableName` + `targetVariableSetName`（名称，而非 variableId）** 引用。用 `scripts/figma-dtcg-to-sample.mjs` 转成 Figma Native 种子。

## 多套 Token 表（多文档架构）

应用支持多套独立 Token 表，顶部 `DocumentSwitcher`（main-view 工具栏左上）在 **HyperOS3 / HyperOS4** 间切换。数据库 schema 本就按 `document_id` 隔离，故无需改库。

关键点：
- **注册表** `src/lib/collaboration/server.ts` 的 `DOCUMENTS = { hyperos3: {name, seed}, hyperos4: {name, seed} }`；`getTokenDocumentService(documentId)` 按 id 选种子；`documentIdFromRequest(request)` 从 `x-document-id` 头解析（非法值回退 `hyperos4`）。
- **种子**：`src/data/sample-tokens.json`（HyperOS3）、`src/data/sample-tokens-hyperos4.json`（HyperOS4）。种子仅在该文档首次创建时灌入（`ensureDocument` 读不到才创建）。
- **前端**：`client.ts` 模块级 `activeDocumentId` + `TOKEN_DOCUMENTS` 清单，在 `apiRequest` 统一注入 `x-document-id` 头（所有调用点零改动）；`token-store` 的 `activeDocumentId`（持久化）+ `setActiveDocument(id)`（清状态后 `loadRemoteDocument`），水合时在 persist `merge` 里调 `setActiveDocumentId` 同步。
- **隔离**：每套表的编辑 / 变更日志 / 快照通过 `document_id` 外键彼此独立。

> 新增第三套表：① `client.ts` 的 `TOKEN_DOCUMENTS` 加一项；② `server.ts` 的 `DOCUMENTS` 加种子；③ 放置对应种子 JSON。无需改数据库或迁移。
> 替换已存在文档的种子不会自动生效（种子只首次灌入）。使用 `/api/token-document/import` 以当前 revision 导入新的 Figma Native JSON；不要通过删除 `.data/collaboration-store.json` 重置已有文档。

存储策略：开发环境未设置 `DATABASE_URL` 时使用 Git 忽略的 `.data/collaboration-store.json`；生产环境必须设置 PostgreSQL `DATABASE_URL` 并运行 `npm run db:migrate`。

## 命令

```bash
npm run dev          # 开发服务器
npm run build        # 生产构建
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
- HyperOS4 数据更新 → 替换 `figma-token/` 下 Component / Reference / Semantic 的 Light / Dark DTCG 导出，重跑 `node scripts/figma-dtcg-to-sample.mjs`；处理脚本报告的未解析别名后，再通过导入接口同步已有文档
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
- 导出对话框支持三种格式：Android XML、CSS、JSON (原始数据)
- 变更日志与快照保存在当前服务端文档中；ChangeLog Store 只缓存 UI 展示的最新 500 条，`clearData` 不会删除服务端记录
- Semantic Token 顶层树组固定为 `bg → fill → stroke → text → mask → margin → padding → gap → radius`；其他 Collection 和子组维持自然排序
