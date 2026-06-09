# AGENT.md — Design Token Viewer

## 项目概述

Design Token Viewer 是一个 Figma 设计令牌可视化工具，用于浏览、编辑和导出设计令牌。主要面向 Xiaomi HyperOS 设计系统。

核心能力：
- 解析 Figma Variables 原生导出 JSON 和 Variables2CSS 插件格式
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
| 状态　　 | Zustand (persist middleware, localStorage)　|
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
│   ├── page.tsx            # 首页：无数据→FileUpload，有数据→AppShell
│   ├── providers.tsx       # ThemeProvider + TooltipProvider
│   ├── globals.css         # Tailwind + shadcn 主题变量 (oklch)
│   └── api/save-sample-tokens/  # DEV-only: 将编辑后的令牌写回 sample-tokens.json
│       └── route.ts
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
│       ├── file-upload.tsx         # 拖拽上传 / 加载示例数据
│       ├── file-upload.test.tsx
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
│   └── utils.ts                   # cn() (clsx + tailwind-merge)
├── stores/
│   ├── token-store.ts             # Zustand 全局状态 (persist to localStorage)
│   ├── changelog-store.ts         # 变更日志 Zustand 状态 (persist to localStorage)
│   └── changelog-store.test.ts
├── types/
│   ├── token.ts                   # 核心类型: DesignToken, TokenCollection, TokenTreeNode 等
│   └── changelog.ts               # 变更日志类型: LogEntry, ChangeType
└── data/
    └── sample-tokens.json         # 示例数据 (Xiaomi HyperOS4 Feature Token)
```

其他顶层目录：

```
scripts/                    # 辅助脚本
├── css-vars-to-sample.mjs
├── figma-flat-to-preset.mjs
└── figma-vars-to-sample.mjs

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
JSON 文件 (上传/示例)
  → parseTokenJSON (format-detector → figma-native / variables2css parser)
  → ParsedTokenData { collections, tokens (rawValues) }
  → resolveTokens (别名解析 → resolvedValues, referencedBy)
  → buildTokenTree (树形结构)
  → Zustand store (persist to localStorage)
  → UI 渲染
```

编辑流：
```
用户编辑 → updateTokenValue/Name/Description/CodeSyntax/Alias
  → resolveTokens (重新解析)
  → rebuildRawJSON (重建 Figma JSON)
  → store 更新 (rawJSON + tokens + tree)
  → useChangeLogStore.addLogEntry (记录变更日志: 类型 / 前后值 / IP / 时间戳)
  → syncSampleTokensToFile (DEV: 写回 sample-tokens.json)
```

## 核心类型 (src/types/token.ts)

- `DesignToken` — 统一令牌模型，包含 id, name, path, type, rawValues (per-mode), resolvedValues, isAlias, aliasOf, referencedBy, codeSyntax
- `TokenCollection` — 集合 (id, name, modes, tokenIds)
- `TokenTreeNode` — 树节点 (label, path, children, tokenId?, tokenCount)
- `TokenType` — "COLOR" | "NUMBER" | "STRING" | "BOOLEAN"
- `CodeFormat` — "css" | "android"
- `ViewMode` — "grid" | "list"

## Zustand Store (token-store.ts)

关键状态：
- `rawJSON` — 原始 JSON (用于持久化和导出)
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

持久化字段：rawJSON, collections, tokens, tree, activeCollectionId, activeModeId, activeCollection, filteredTokenIds, viewMode, codeFormat, inspectorWidth

## ChangeLog Store (changelog-store.ts)

独立的 Zustand store，记录所有令牌编辑操作，persist key 为 `design-token-changelog`。

关键状态：
- `entries` — 日志条目数组 (`LogEntry[]`，上限 500 条，超出后保留最新)
- `clientIP` — 客户端公网 IP (启动时由 providers.tsx 调用 `fetchAndCacheIP` 缓存)

关键 Actions：
- `addLogEntry` — 追加日志 (自动补全 id / timestamp / ip)，由 token-store 各编辑 action 调用
- `clearAll` — 清空所有日志
- `setClientIP` / `fetchAndCacheIP` — 设置 / 获取并缓存 IP

类型 (types/changelog.ts)：
- `LogEntry` — id, timestamp, ip, changeType, tokenId?, tokenName?, oldValue?, newValue?, meta?
- `ChangeType` — update_value | update_name | update_description | update_code_syntax | set_alias | delete_token | rename_group | reorder

工具 (lib/changelog.ts)：
- `fetchClientIP` — 调用 api.ipify.org 获取公网 IP (5s 超时，失败返回 "unknown")
- `getChangeTypeLabel` — ChangeType → 中文标签
- `formatTimestamp` — Unix 毫秒 → `YYYY-MM-DD HH:mm:ss`

UI：`changelog-dialog.tsx` 提供日志查看对话框 (sidebar 底部入口)，按时间倒序展示，颜色变更以色块高亮前后值对比。

## 支持的 JSON 格式

1. **Figma Native** — `{ collections: [...], variables: { [id]: { valuesByMode, codeSyntax, ... } } }`
2. **Variables2CSS** — `{ collections: [{ name, modes, variables: [{ name, type, values }] }] }`

检测逻辑在 `format-detector.ts`，通过结构特征自动判断。

## 命令

```bash
npm run dev          # 开发服务器
npm run build        # 生产构建
npm run test         # Vitest 单元测试
npm run test:watch   # Vitest watch 模式
npm run test:coverage # 测试覆盖率
npm run test:e2e     # Playwright E2E (需先 npx playwright install)
npm run lint         # ESLint
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
- 新代码导出格式 → `src/lib/code-generators/` 新增 generator + 更新 index.ts + `CodeFormat` 类型
- 新 UI 组件 → `src/components/features/` (业务) 或 `ui/` (通用)
- 新纯逻辑 → `src/lib/` + 同目录 `*.test.ts`
- 编辑功能修改后需调用 `syncSampleTokensToFile()` 以在开发时同步示例数据
- 新增 token-store 编辑 action 时，应同步调用 `useChangeLogStore.getState().addLogEntry(...)` 记录变更，并在 `ChangeType` 中补充对应类型
- Shiki 高亮新增语言 → 更新 `use-shiki.ts` 的 `FORMAT_LANG` 映射和 `langs` 数组
- shadcn/ui 组件通过 `npx shadcn@latest add <component>` 添加到 `src/components/ui/`
- 主题色使用 oklch 色彩空间，定义在 `globals.css` 的 `:root` 和 `.dark`

## 已知设计决策

- 默认自动加载示例数据（page.tsx 中 useEffect），用户无需手动上传即可看到界面
- Token 编辑弹窗使用 Portal + 可拖拽浮窗，而非内联表单
- Inspector 面板宽度可拖拽调整 (280-560px)，持久化到 localStorage
- Android XML 中 codeSyntax.ANDROID 优先于从 token name 派生的名称
- `stripCodeSyntaxPrefix` 会去除中文前缀（如 "文字_on_surface" → "on_surface"），这是 HyperOS 特有的命名约定
- rebuildRawJSON 始终输出 Figma Native 格式，即使原始输入是 Variables2CSS
- 导出对话框支持三种格式：Android XML、CSS、JSON (原始数据)
- 变更日志独立于 token-store 单独持久化 (key: `design-token-changelog`)，与令牌数据解耦，clearData 不会清空日志；日志上限 500 条，超出后丢弃最旧记录
