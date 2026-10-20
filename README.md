# Design Token Viewer

Figma 设计令牌可视化工具，支持 Figma Variables 原生导出与 Variables2CSS 格式的 JSON 文件浏览、编辑和代码导出。

## 功能

- 多套 Token 表切换：在侧边栏顶部切换 **HyperOS 3 / HyperOS 4**；文档、编辑、日志、快照读取与恢复均按文档 ID 隔离
- 服务端导入 Figma Variables JSON，自动检测格式（Figma Native / Variables2CSS）
- 树形导航 + 搜索过滤，Grid / List 双视图
- 多 Collection、多 Mode 切换
- 颜色令牌：色块预览、HEX/RGB/HSL 值、WCAG 对比度检查
- 数值 / 字符串 / 布尔令牌预览
- 复合文字样式 Token（`TYPOGRAPHY`，一个 Figma Text Style = 一个 Token）：字段可分别引用 Reference Token，以 `Ag` + `32/42` + 字体/字重展示，导出为 CSS `font` 简写和 Android `<style>`
- 别名引用链路可视化，反向引用查看
- 保留并展示 Figma description；Token Inspector 在 description 之后、COLOR 对比度之前展示 Token Scope，支持 COLOR、NUMBER、STRING、BOOLEAN 四种 Token 类型、多个 scope Badge，无 scope 时显示“未设置”
- 令牌编辑：值、名称、描述、Code Syntax、别名引用
- 令牌删除、批量移动分组、分组重命名、令牌重排序；拖放移动时可在同一次 revision 更新中同步重排序
- 变更日志：记录编辑、移动分组、导入、快照创建/恢复等操作，包含 actor、时间戳、客户端 IP 和前后值对比
- 代码导出：CSS 自定义属性、Android XML resources、原始 JSON；来源可选当前过滤结果、当前文档全部 Collection，或在确认请求成功后导出版本快照
- Shiki 语法高亮（支持 XML / CSS / JSON，亮色暗色双主题）
- 亮色 / 暗色主题切换
- Token 文档、变更日志和快照由服务端持久化；浏览器 localStorage 仅保存文档选择、UI 偏好和轻量 actor 标识

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
| `npm run figma:plugin` | 生成 Figma MCP 只读导出插件代码（`sync-figma-variables.mjs plugin`） |
| `npm run figma:preview` | 预览 Figma 增量同步结果，不写入（`DRY_RUN=1 … apply`） |
| `npm run figma:apply` | 执行 Figma 增量同步到 `--seed` / `--api` / `--db` |

## 项目结构

```text
src/
├── app/              # Next.js App Router
│   ├── layout.tsx / page.tsx / providers.tsx / globals.css
│   └── api/          # Route Handlers
│       ├── token-document/      # GET 读取、POST 导入；import/ 为 POST 别名
│       ├── tokens/              # 单 Token 编辑/删除；reorder/ 重排序；move-to-group/ 移动分组
│       ├── snapshots/           # GET/POST 列表与创建、[snapshotId]/restore 恢复
│       ├── change-logs/         # GET 变更日志
│       ├── groups/rename/       # PATCH 分组重命名
│       ├── client-ip/           # GET 请求来源 IP
│       ├── export/              # GET JSON/CSS/Android，可选 snapshotId/modeId
│       └── save-sample-tokens/  # DEV-only，写回 HyperOS3 示例数据
├── components/
│   ├── ui/           # shadcn/ui 基础组件
│   ├── layout/       # AppShell、Sidebar、MainView
│   └── features/     # Token 浏览、检查器、导出、日志、快照、文档切换等业务组件
├── lib/
│   ├── parsers/          # JSON 格式检测与解析
│   ├── code-generators/  # CSS / Android XML 生成
│   ├── collaboration/    # client / server / service / repository 与加载状态
│   ├── db/               # Drizzle PostgreSQL 连接与 schema
│   ├── token-resolver.ts
│   ├── tree-builder.ts
│   ├── token-rebuilder.ts
│   ├── typography.ts
│   └── contrast.ts
├── stores/           # Zustand UI 状态与前端日志缓存
├── types/            # TypeScript 类型
└── data/             # HyperOS3 / HyperOS4 种子

figma-token/          # HyperOS4 DTCG 源（3 Collection × Light/Dark）+ figma-variables.json 增量同步基线
drizzle/              # 数据库迁移 SQL
scripts/              # 数据转换、Figma 同步、Text Style 合并与数据库脚本
docs/                 # 验收、Figma 数据源和结构说明；superpowers/plans 为历史计划
e2e/                  # Playwright E2E 测试
```

详细目录说明见 [docs/PROJECT_STRUCTURE.md](./docs/PROJECT_STRUCTURE.md)，Figma 数据源格式见 [docs/FIGMA_PRESET_VARIABLES.md](./docs/FIGMA_PRESET_VARIABLES.md)，验收清单见 [docs/ACCEPTANCE_CHECKLIST.md](./docs/ACCEPTANCE_CHECKLIST.md)。

## 支持的 JSON 格式

- **Figma Native** — `collections` + `variables` + `valuesByMode`，可保留 `description`、`scopes` 和 `codeSyntax`
- **Variables2CSS** — `collections` + `variables[]`；不提供 Figma Native 的别名和元数据保真能力

服务端导入时自动检测格式，无需手动选择。

> Figma 新版“导出变量”的 **W3C DTCG** 格式（`$type/$value/$extensions`）不被运行时解析器直接识别，需先用 `scripts/figma-dtcg-to-sample.mjs` 转换成 Figma Native 种子。

## 数据持久化与数据库

- 非 production 环境未设置 `DATABASE_URL` 时，服务端把 Token 文档、日志和快照写入 Git 忽略的 `.data/collaboration-store.json`。
- 生产环境必须设置 PostgreSQL `DATABASE_URL` 并先执行 `npm run db:migrate`，否则共享文档接口返回配置错误。
- localStorage 保存当前文档、Collection/Mode、搜索、树展开状态、视图、代码格式、检查器宽度和轻量 actor 标识；不保存 Token 正文、日志或快照。

## 多套 Token 表（HyperOS3 / HyperOS4）

应用在侧边栏顶部切换 **HyperOS 3 / HyperOS 4**。

- 每套表对应一份服务端文档，编辑和变更日志按 `document_id` 隔离；快照列表、读取、导出和恢复也按文档隔离，恢复其他文档的快照返回 404。
- 注册表位于 `src/lib/collaboration/server.ts` 的 `DOCUMENTS`；种子分别为 `src/data/sample-tokens.json` 与 `src/data/sample-tokens-hyperos4.json`。
- `src/lib/collaboration/client.ts` 统一通过 `x-document-id` 请求头标识当前文档。

### 更新 HyperOS4 数据

必须完整执行以下流程，不能在只替换源文件或只生成种子后报告完成：

1. 以用户明确指定的目录或文件为权威输入，逐文件比较内容或 SHA-256，确认同步到 `figma-token/<Collection>/{Light,Dark}.tokens.json`。只能确认与本次指定输入一致，不能据此声称是 Figma 中的最新版本。
2. 运行 `node scripts/figma-dtcg-to-sample.mjs`，核对各 Collection 数量，并确保输出中的 `Aliases unresolved (fell back to raw value)` 计数为 `0`；非 0 时停止同步并先修复别名。
3. 区分 DTCG 源、`src/data/sample-tokens-hyperos4.json` 种子和 repository 中的 `hyperos4.currentJson`。种子只在首次建档时灌入，页面和导出读取已有协作文档。
4. 读取当前 revision，创建导入前快照，再调用 `POST /api/token-document/import`。请求头包含 `x-document-id: hyperos4`，请求体为 `{ json, revision, actor: { actorName, actorClientId } }`，其中 `json` 是种子对象。禁止删除或手改 `.data/collaboration-store.json`。
5. 重新读取文档并调用 `/api/export?format=json`。响应结构为 `{ format, code }`，需对 `JSON.parse(code)` 与种子做深度比较，同时核对 revision、总量、各 Collection、别名和 Light/Dark 完整性。

也可以直接从 Figma 文件同步（需要已 OAuth 的 Figma MCP 客户端执行 `use_figma`）。同步范围包括本地 Variables 和 Text Styles；Text Style 写为 Semantic Token 下的 `text_style/*` TYPOGRAPHY Token，绑定的 Variable 保留为字段别名：

```bash
node scripts/sync-figma-variables.mjs plugin --part 0 --out /tmp/figma-export.js   # 交给 use_figma 执行，结果存为 /tmp/figma-delta/part-0.json，按 pages 继续 --part 1..N
DRY_RUN=1 node scripts/sync-figma-variables.mjs apply --delta /tmp/figma-delta --seed --api http://localhost:3000
DATABASE_URL=... node scripts/sync-figma-variables.mjs apply --db                    # 用已校验的基线写 Neon/PostgreSQL
```

详细约束见 `AGENTS.md` 的“HyperOS4 数据更新强制流程”及“通过 Figma MCP 同步 HyperOS4”。

在 Kiro CLI 中可直接一键执行：`/sync-figma-tokens`（默认只同步种子），或 `/sync-figma-tokens seed api=http://localhost:3000 db`。定义见 `.kiro/skills/sync-figma-tokens/SKILL.md`；写 Neon 或远程接口前会先预览并等待确认。npm 快捷命令：`figma:plugin` / `figma:preview` / `figma:apply`。无法访问实际 repository 时，只能说明源和种子已更新，不能声称当前应用或线上数据已同步。

> 安全边界：导入路由当前没有内建认证或授权；`actor` 只是可由调用方填写的审计标签，revision 只提供乐观并发控制。公开部署必须在网络/网关层限制此接口，或补充真实鉴权后才能作为受信任的维护入口。

## 已知限制

- 导出对话框请求快照失败时，当前实现会保留快照来源标签并回退到本地代码。修复为 fail-closed 前，必须确认快照请求成功后再复制或下载，不能仅凭界面标签认定文件来自该快照。
- `move-to-group` 尚未严格拒绝缺失或非字符串的 `targetGroup`，也未校验目标名称冲突及 `tokenIds` 与可选 `collectionId` 的归属一致性。

## 路径别名

`@/*` → `src/*`

## License

Private
