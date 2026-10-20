# 项目目录结构说明

Design Token Viewer 的目录约定与职责说明，便于新人上手和日常维护。

## 根目录一览

```text
design-token-viewer/
├── drizzle/              # PostgreSQL 迁移 SQL
├── e2e/                  # Playwright E2E 测试
├── docs/                 # 项目文档与历史计划
├── figma-token/          # HyperOS4 DTCG 导出源与 Figma 增量同步基线
├── public/               # 静态资源
├── scripts/              # 本地转换/数据库脚本
├── src/                  # 应用源码
├── drizzle.config.ts     # Drizzle Kit 配置
├── next.config.ts
├── playwright.config.ts
├── vitest.config.ts
├── vitest.setup.ts       # Vitest 全局 setup
└── package.json
```

## 各目录职责

### `src/` — 应用源码

| 路径 | 说明 |
|------|------|
| `src/app/` | Next.js App Router：页面、布局、全局样式、providers 和 Route Handlers |
| `src/components/ui/` | shadcn/ui 基础组件，无业务逻辑 |
| `src/components/layout/` | AppShell、Sidebar、MainView 等布局组件 |
| `src/components/features/` | Token 树/网格/列表、检查器、导出、日志和快照等业务组件 |
| `src/lib/` | 解析、生成、树、对比度和其他可测试逻辑 |
| `src/lib/collaboration/` | 文档、日志、快照的 client / server / service / repository 与加载状态 |
| `src/lib/db/` | PostgreSQL Drizzle 连接与 schema |
| `src/stores/` | Zustand UI 状态；Token 正文从服务端加载 |
| `src/types/` | 共享 TypeScript 类型及第三方声明 |
| `src/data/` | HyperOS3 / HyperOS4 Figma Native 种子 |

单元测试与源码同目录，文件名为 `*.test.ts`、`*.test.tsx` 或 `*.spec.ts(x)`，由 Vitest 的 `src/**/*.{test,spec}.{ts,tsx}` 匹配；脚本测试 `scripts/**/*.test.mjs` 也由 Vitest 运行。

### `e2e/` — E2E 测试

- 使用 Playwright，配置位于 `playwright.config.ts`。
- `testDir: "./e2e"`，与单元测试分离。
- 当前用例覆盖默认 HyperOS4/Semantic 加载，以及导出来源从“当前”切换到“全部”。

### `docs/` — 文档

- `ACCEPTANCE_CHECKLIST.md`：功能与测试验收清单。
- `FIGMA_PRESET_VARIABLES.md`：Figma DTCG 与兼容脚本说明。
- `PROJECT_STRUCTURE.md`：本文件。
- `superpowers/plans/`：历史实现计划，不是当前功能承诺。

### `figma-token/` — HyperOS4 Figma 源

包含 Component、Reference、Semantic 三个 Collection 的 Light/Dark DTCG 导出。`node scripts/figma-dtcg-to-sample.mjs` 将它们合并为 `src/data/sample-tokens-hyperos4.json`，按名称解析跨 Collection 别名，并保留受支持的 description/scopes 元数据。

`figma-variables.json` 是 Figma MCP 增量同步（`scripts/sync-figma-variables.mjs`）的基线，记录上次同步时 Figma 端的 Variables 与 Text Style；同步成功后由脚本更新，不要手改。

### `scripts/` — 脚本与脚本用数据

这些脚本仅用于本地或 CI，不参与 Next 运行时：

- `sync-figma-variables.mjs` + `lib/figma-variables-sync.mjs`：经 Figma MCP（`use_figma`）增量同步 HyperOS4 Variables 与 Text Style，目标可选 `--seed` / `--api <url>` / `--db`；npm 快捷命令为 `figma:plugin` / `figma:preview` / `figma:apply`。
- `figma-dtcg-to-sample.mjs`：DTCG 同步脚本，输入 `figma-token/`，输出 `src/data/sample-tokens-hyperos4.json`。
- `merge-miuix-text-styles.mjs`：读取 `scripts/data/miuix-text-styles.json`，把 24 个 miuix Text Style 按 Reference Token 名称追加到 HyperOS4（DTCG 流程之后使用；Figma MCP 流程无需）。
- `rename-comp-token-abbreviations.mjs`：一次性迁移，展开已有协作文档中 Component Token 叶子名缩写；幂等，支持 `DRY_RUN=1`。
- `figma-flat-to-preset.mjs`：读取未纳入仓库的 `scripts/figma-hyperos4-vars.json`，输出格式检查用 preset。
- `figma-vars-to-sample.mjs`：读取相同扁平输入并覆盖 `src/data/sample-tokens.json`（HyperOS3 种子）。
- `css-vars-to-sample.mjs`：读取脚本内嵌 `CSS_VARS_INPUT` 并覆盖 HyperOS3 种子；当前实现不读取 stdin。
- `init-db.mjs`：需要 `DATABASE_URL`，读取 `drizzle/0000_lightweight_collaboration.sql` 初始化数据库。

运行兼容脚本前应确认输出目标，避免误覆盖 HyperOS3 种子。

### 数据持久化

- 非 production 环境没有 `DATABASE_URL` 时，协作数据写入 Git 忽略的 `.data/collaboration-store.json`。
- 生产环境必须设置 PostgreSQL `DATABASE_URL`；先执行 `npm run db:migrate`，再运行应用。
- localStorage 只保存 UI 偏好和轻量 actor 标识，不保存 Token 正文、日志或快照。

### `public/` — 静态资源

Next 从根路径提供此处资源，例如 `/file.svg`。

## 路径别名

- `@/*` → `src/*`，配置位于 `tsconfig.json`。
- 示例：`@/components/ui/button`、`@/lib/parsers`、`@/stores/token-store`、`@/types/token`。

## 测试与质量

- 单元测试：`npm run test`
- 覆盖率：`npm run test:coverage`
- E2E：`npm run test:e2e`
- ESLint：`npm run lint`
- 生产构建：`npm run build`
- 完整验收项见 `docs/ACCEPTANCE_CHECKLIST.md`。

## 新增文件时的建议

- 新页面/路由 → `src/app/`
- 新业务组件 → `src/components/features/` 或 `src/components/layout/`
- 新基础组件 → `src/components/ui/`
- 新纯逻辑/工具 → `src/lib/`，建议同目录增加测试
- 新类型/声明 → `src/types/`
- 新状态 → `src/stores/`
- 新 E2E 用例 → `e2e/`
- 新脚本/脚本用数据 → `scripts/`
