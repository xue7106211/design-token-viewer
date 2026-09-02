# Design Token Viewer

Figma 设计令牌可视化工具，支持 Figma Variables 原生导出与 Variables2CSS 格式的 JSON 文件浏览、编辑和代码导出。

## 功能

- 多套 Token 表切换：顶部一键切换 **HyperOS 3 / HyperOS 4**，两套数据、变更日志、快照完全独立
- 服务端导入 Figma Variables JSON，自动检测格式（Figma Native / Variables2CSS）
- 树形导航 + 搜索过滤，Grid / List 双视图
- 多 Collection、多 Mode 切换
- 颜色令牌：色块预览、HEX/RGB/HSL 值、WCAG 对比度检查
- 数值 / 字符串 / 布尔令牌预览
- 别名引用链路可视化，反向引用查看
- 令牌编辑：值、名称、描述、Code Syntax、别名引用
- 令牌删除、分组重命名、令牌重排序
- 变更日志：自动记录所有编辑操作（值、名称、描述、Code Syntax、别名、删除、重命名、重排序），含时间戳、客户端 IP、前后值对比（颜色色块高亮）
- 代码导出：CSS 自定义属性、Android XML resources、原始 JSON
- Shiki 语法高亮（支持 XML / CSS / JSON，亮色暗色双主题）
- 亮色 / 暗色主题切换
- Token 文档、变更日志和快照由服务端持久化；浏览器 localStorage 仅保存当前文档、视图和面板偏好

## 技术栈

Next.js 16 · React 19 · TypeScript · Tailwind CSS 4 · shadcn/ui · Zustand · Shiki · Framer Motion · file-saver · colord · Drizzle ORM · PostgreSQL · Vitest · Playwright

## 快速开始

```bash
npm install
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000)，默认会加载服务端的 HyperOS 4 Token 文档。

## 命令

| 命令 | 说明 |
|------|------|
| `npm run dev` | 开发服务器 |
| `npm run build` | 生产构建 |
| `npm run start` | 生产模式运行（先执行 `npm run build`） |
| `npm run lint` | ESLint 检查 |
| `npm run test` | 单元测试 (Vitest) |
| `npm run test:watch` | 单元测试 watch 模式 |
| `npm run test:coverage` | 测试覆盖率 |
| `npm run test:e2e` | E2E 测试 (Playwright，首次需 `npx playwright install`) |
| `npm run db:generate` | 生成 Drizzle 迁移 |
| `npm run db:migrate` | 执行数据库迁移 |
| `npm run db:init` | 初始化数据库 |

## 项目结构

```
src/
├── app/              # Next.js App Router
│   ├── layout.tsx / page.tsx / providers.tsx / globals.css
│   └── api/          # 后端路由 (Route Handlers)
│       ├── token-document/      # 令牌文档读取 / 导入
│       ├── tokens/[tokenId]/    # 单令牌编辑 (value / name / description / code-syntax / alias)
│       ├── snapshots/           # 快照列表 / 创建 / [snapshotId]/restore 恢复
│       ├── change-logs/         # 变更日志读取
│       ├── groups/rename/       # 分组重命名
│       ├── client-ip/           # 请求来源 IP
│       ├── export/              # 服务端导出
│       └── save-sample-tokens/  # DEV: 写回示例数据
├── components/
│   ├── ui/           # shadcn/ui 基础组件 (12 个)
│   ├── layout/       # AppShell, Sidebar, MainView
│   └── features/     # 业务组件 (树、网格、列表、检查器、导出、变更日志、快照、协作者署名、文档切换器等)
├── lib/
│   ├── parsers/      # JSON 格式检测与解析 (7 个文件含测试)
│   ├── code-generators/  # CSS / Android XML 代码生成 (5 个文件含测试)
│   ├── collaboration/    # 协作层 (client / server / service / repository + 测试)
│   ├── db/               # Drizzle ORM (index 连接 + schema 表结构)
│   ├── token-resolver.ts # 别名递归解析
│   ├── tree-builder.ts   # 树形结构构建
│   ├── token-rebuilder.ts # 重建 Figma Native JSON
│   ├── contrast.ts       # WCAG 对比度计算
│   ├── changelog.ts      # 变更日志工具 (IP 获取、时间格式化、类型标签)
│   ├── sync-sample-tokens.ts # DEV: 同步示例数据到文件
│   └── use-shiki.ts      # Shiki 语法高亮 hook
├── stores/           # Zustand 全局状态 (令牌 store + 变更日志 store)
├── types/            # TypeScript 类型定义
└── data/             # 种子数据 (sample-tokens.json = HyperOS3, sample-tokens-hyperos4.json = HyperOS4)

figma-token/          # HyperOS4 Figma DTCG 导出源 (Component / Reference / Semantic，各含 Light/Dark)
drizzle/              # Drizzle 数据库迁移 SQL
drizzle.config.ts     # Drizzle Kit 配置 (postgresql)
scripts/              # 辅助脚本 (Figma 数据转换、DTCG 转换、数据库初始化)
docs/                 # 项目文档 (验收清单、预设变量、结构说明)
e2e/                  # Playwright E2E 测试
```

详细目录说明见 [docs/PROJECT_STRUCTURE.md](./docs/PROJECT_STRUCTURE.md)，Figma 预设变量格式见 [docs/FIGMA_PRESET_VARIABLES.md](./docs/FIGMA_PRESET_VARIABLES.md)，验收清单见 [docs/ACCEPTANCE_CHECKLIST.md](./docs/ACCEPTANCE_CHECKLIST.md)。

## 支持的 JSON 格式

- **Figma Native** — Figma Variables 原生导出 (`collections` + `variables` with `valuesByMode`)
- **Variables2CSS** — Variables2CSS 插件导出 (`collections` with `variables` array)

服务端导入时自动检测格式，无需手动选择。

> 注：Figma 新版「导出变量」的 **W3C DTCG** 格式（`$type/$value/$extensions`，颜色为 `components+alpha`，别名在 `$extensions["com.figma.aliasData"]`）不被运行时解析器直接识别，需先用 `scripts/figma-dtcg-to-sample.mjs` 转换成 Figma Native 种子。

## 数据持久化与数据库

- 开发环境未设置 `DATABASE_URL` 时，服务端会把 Token 文档、日志和快照写入被 Git 忽略的 `.data/collaboration-store.json`。
- 生产环境必须设置 PostgreSQL `DATABASE_URL`，并先执行 `npm run db:migrate`；否则共享 Token 文档接口会返回配置错误。
- 浏览器 localStorage 只保存当前文档、当前 Collection/Mode、搜索、树展开状态、视图、代码格式和检查器宽度，以及协作者标识；不保存 Token 正文。

## 多套 Token 表（HyperOS3 / HyperOS4）

应用支持多套独立的 Token 表，顶部切换器可在 **HyperOS 3 / HyperOS 4** 间切换。

- 每套表对应服务端一份独立文档（`token_documents` 表的一行），各自的编辑、变更日志、快照互不影响。
- 文档注册表在 `src/lib/collaboration/server.ts` 的 `DOCUMENTS`，种子分别为 `src/data/sample-tokens.json`（HyperOS3）与 `src/data/sample-tokens-hyperos4.json`（HyperOS4）。
- 前端通过 `x-document-id` 请求头标识当前文档（由 `src/lib/collaboration/client.ts` 在 `apiRequest` 统一注入），id 清单见 `TOKEN_DOCUMENTS`。

### 更新 HyperOS4 数据

1. 从 Figma「导出变量」得到 DTCG 文件，分别替换 `figma-token/Component Token`、`figma-token/Reference Token`、`figma-token/Semantic Token` 中的 `Light.tokens.json` 和 `Dark.tokens.json`。
2. 运行转换脚本；它合并三组，并按 `targetVariableSetName` 与 `targetVariableName` 解析跨 Collection 别名：
   ```bash
   node scripts/figma-dtcg-to-sample.mjs
   ```
   输出 `src/data/sample-tokens-hyperos4.json`。脚本会报告无法解析的别名，并以该 Token 的原始值降级；发布前应处理这类报告。
3. 种子仅在文档首次创建时灌入。已存在的 HyperOS 4 文档需要通过 `POST /api/token-document/import`（请求头 `x-document-id: hyperos4`，携带当前 `revision`）导入生成的 Figma Native JSON；不要通过删除 `.data` 文件重置已有数据。

## 路径别名

`@/*` → `src/*`

## License

Private
