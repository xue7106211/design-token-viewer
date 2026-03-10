# AGENT.md — Design Token Viewer

## 项目概述

Design Token Viewer 是一个 Figma 设计令牌可视化工具，用于浏览、编辑和导出设计令牌。主要面向 Xiaomi HyperOS 设计系统。

核心能力：
- 解析 Figma Variables 原生导出 JSON 和 Variables2CSS 插件格式
- 可视化浏览令牌（颜色色块、数值预览、树形导航）
- 多 Collection / 多 Mode 切换
- 令牌编辑（值、名称、描述、codeSyntax、别名引用）
- 代码导出（CSS 自定义属性、Android XML resources）
- 亮色/暗色主题

## 技术栈

| 层面 | 技术 |
|------|------|
| 框架 | Next.js 16 (App Router, Turbopack) |
| UI | React 19, Tailwind CSS 4, shadcn/ui (Radix) |
| 状态 | Zustand (persist middleware, localStorage) |
| 动画 | Framer Motion |
| 语法高亮 | Shiki (github-light / github-dark 双主题) |
| 颜色处理 | colord |
| 单元测试 | Vitest + Testing Library + jsdom |
| E2E | Playwright (Chromium) |
| 语言 | TypeScript (strict), 中文 UI |

## 目录结构

```
src/
├── app/                    # Next.js App Router
│   ├── layout.tsx          # 根布局 (Geist 字体, Providers)
│   ├── page.tsx            # 首页：无数据→FileUpload，有数据→AppShell
│   ├── providers.tsx       # ThemeProvider + TooltipProvider
│   ├── globals.css         # Tailwind + shadcn 主题变量 (oklch)
│   └── api/save-sample-tokens/  # DEV-only: 将编辑后的令牌写回 sample-tokens.json
├── components/
│   ├── ui/                 # shadcn/ui 基础组件 (无业务逻辑)
│   ├── layout/             # AppShell, Sidebar, MainView
│   └── features/           # 业务组件
│       ├── file-upload.tsx         # 拖拽上传 / 加载示例数据
│       ├── token-tree.tsx          # 侧边栏树形导航
│       ├── token-grid.tsx          # 网格视图
│       ├── token-list.tsx          # 列表视图
│       ├── token-card.tsx          # 单个令牌卡片
│       ├── token-inspector.tsx     # 右侧检查器面板 (可拖拽调宽)
│       ├── token-edit-popover.tsx  # 浮动编辑弹窗 (可拖拽)
│       ├── code-output.tsx         # 代码展示 (Shiki 高亮)
│       ├── export-dialog.tsx       # 导出对话框 (Android XML / CSS / JSON)
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
│   │   ├── figma-native.ts        # 解析 Figma 原生 JSON → ParsedTokenData
│   │   ├── variables2css.ts       # 解析 Variables2CSS JSON → ParsedTokenData
│   │   └── types.ts               # Figma/V2CSS 原始 JSON 类型定义
│   ├── code-generators/
│   │   ├── index.ts               # generateTokenCode / generateTokenBlock
│   │   ├── css.ts                 # CSS 自定义属性生成
│   │   ├── android.ts             # Android XML resources 生成
│   │   └── utils.ts               # stripCodeSyntaxPrefix (去中文前缀)
│   ├── token-resolver.ts          # 别名递归解析 + 循环检测 + referencedBy 反向引用
│   ├── tree-builder.ts            # 从扁平令牌构建树形结构
│   ├── token-rebuilder.ts         # 从内部模型重建 Figma Native JSON (用于导出和持久化)
│   ├── contrast.ts                # WCAG 对比度计算, colorToHex/RGB/HSL
│   ├── use-shiki.ts               # Shiki 语法高亮 hook (懒加载单例)
│   ├── sync-sample-tokens.ts      # DEV: POST 到 /api/save-sample-tokens
│   └── utils.ts                   # cn() (clsx + tailwind-merge)
├── stores/
│   └── token-store.ts             # Zustand 全局状态 (persist to localStorage)
├── types/
│   └── token.ts                   # 核心类型: DesignToken, TokenCollection, TokenTreeNode 等
└── data/
    └── sample-tokens.json         # 示例数据 (Xiaomi HyperOS4 Feature Token)
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
- `filteredTokenIds` — 搜索过滤后的令牌 ID 列表
- `selectedTokenId` — 选中的令牌 (打开 Inspector)
- `editingTokenId` / `editingPosition` — 编辑弹窗状态
- `viewMode` / `codeFormat` / `inspectorWidth` — UI 偏好

持久化字段：rawJSON, collections, tokens, tree, activeCollectionId, activeModeId, activeCollection, filteredTokenIds, viewMode, codeFormat, inspectorWidth

## 支持的 JSON 格式

1. **Figma Native** — `{ collections: [...], variables: { [id]: { valuesByMode, codeSyntax, ... } } }`
2. **Variables2CSS** — `{ collections: [{ name, modes, variables: [{ name, type, values }] }] }`

检测逻辑在 `format-detector.ts`，通过结构特征自动判断。

## 命令

```bash
npm run dev          # 开发服务器
npm run build        # 生产构建
npm run test         # Vitest 单元测试 (20 个用例)
npm run test:e2e     # Playwright E2E (需先 npx playwright install)
npm run lint         # ESLint
```

## 测试约定

- 单元测试与源码同目录：`*.test.ts` / `*.test.tsx`
- Vitest 配置：`vitest.config.ts`，环境 jsdom，覆盖 `src/lib/` 和 `src/stores/`
- E2E 在 `e2e/` 目录，Playwright 配置在 `playwright.config.ts`

## 路径别名

`@/*` → `src/*` (tsconfig.json paths)

## 新增功能时的注意事项

- 新解析格式 → `src/lib/parsers/` 新增 parser + 更新 format-detector + index.ts
- 新代码导出格式 → `src/lib/code-generators/` 新增 generator + 更新 index.ts + `CodeFormat` 类型
- 新 UI 组件 → `src/components/features/` (业务) 或 `ui/` (通用)
- 新纯逻辑 → `src/lib/` + 同目录 `*.test.ts`
- 编辑功能修改后需调用 `syncSampleTokensToFile()` 以在开发时同步示例数据
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
