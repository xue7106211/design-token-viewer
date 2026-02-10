# 项目目录结构说明

Design Token Viewer 的目录约定与职责说明，便于新人上手和日常维护。

## 根目录一览

```
design-token-viewer/
├── e2e/                 # E2E 测试（Playwright）
├── docs/                # 项目文档
├── public/              # 静态资源
├── scripts/             # 构建/转换脚本（非运行时）
├── src/                 # 应用源码
├── next.config.ts
├── playwright.config.ts
├── vitest.config.ts
├── vitest.setup.ts      # 单元测试全局 setup
└── package.json
```

## 各目录职责

### `src/` — 应用源码

| 路径 | 说明 |
|------|------|
| `src/app/` | Next.js App Router：页面、布局、全局样式、providers |
| `src/components/` | React 组件，按用途分子目录 |
| `src/components/ui/` | 基础 UI 组件（如 shadcn/ui），无业务逻辑 |
| `src/components/layout/` | 布局组件：AppShell、Sidebar、MainView |
| `src/components/features/` | 功能组件：上传、Token 树/网格/列表、检查器、导出等 |
| `src/lib/` | 纯逻辑：解析器、代码生成、解析树、对比度等，可单测 |
| `src/stores/` | 全局状态（Zustand） |
| `src/types/` | 共享 TypeScript 类型 |
| `src/data/` | 应用内使用的静态/示例数据（如示例 Token JSON） |

**测试约定**：单元测试与源码同目录，文件名形如 `*.test.ts` / `*.test.tsx` 或 `*.spec.ts`，由 Vitest 的 `src/**/*.{test,spec}.{ts,tsx}` 匹配。

### `e2e/` — E2E 测试

- 使用 Playwright，配置在根目录 `playwright.config.ts`
- `testDir: "./e2e"`，与 `src/` 分离，避免和单元测试混淆

### `docs/` — 文档

- `ACCEPTANCE_CHECKLIST.md`：功能与测试验收清单
- `PROJECT_STRUCTURE.md`：本文件，目录结构说明

### `scripts/` — 脚本与脚本用数据

- 仅用于本地/CI 的转换或生成，**不参与 Next 构建**。
- 例：`figma-vars-to-sample.mjs` 将 Figma 变量 JSON 转为应用可用的示例数据：
  - 输入：`scripts/figma-hyperos4-vars.json`
  - 输出：`src/data/sample-tokens.json`
- 运行示例：`node scripts/figma-vars-to-sample.mjs`

### `public/` — 静态资源

- Next 会从根路径提供，如 `/file.svg`。
- 仅放无需经构建处理的静态文件。

## 路径别名

- `@/*` → `src/*`（在 `tsconfig.json` 的 `paths` 中配置）
- 引用示例：`@/components/ui/button`、`@/lib/parsers`、`@/stores/token-store`、`@/types/token`、`@/data/sample-tokens.json`

## 测试与质量

- **单元测试**：`npm run test`（Vitest），入口与覆盖率见 `vitest.config.ts`，全局 setup 为根目录 `vitest.setup.ts`。
- **E2E**：`npm run test:e2e`（Playwright），用例在 `e2e/`。
- **验收清单**：见 `docs/ACCEPTANCE_CHECKLIST.md`。

## 新增文件时的建议

- 新页面/路由 → `src/app/`
- 新业务组件 → `src/components/features/` 或 `layout/`
- 新基础组件 → `src/components/ui/`
- 新纯逻辑/工具 → `src/lib/`（建议同目录增加 `*.test.ts`）
- 新类型 → `src/types/`
- 新状态 → `src/stores/`
- 新 E2E 用例 → `e2e/`
- 新脚本/脚本用数据 → `scripts/`
