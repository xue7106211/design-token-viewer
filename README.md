# Design Token Viewer

Figma 设计令牌可视化工具，支持 Figma Variables 原生导出与 Variables2CSS 格式的 JSON 文件浏览、编辑和代码导出。

## 功能

- 拖拽上传 Figma Variables JSON，自动检测格式（Figma Native / Variables2CSS）
- 树形导航 + 搜索过滤，Grid / List 双视图
- 多 Collection、多 Mode 切换
- 颜色令牌：色块预览、HEX/RGB/HSL 值、WCAG 对比度检查
- 数值 / 字符串 / 布尔令牌预览
- 别名引用链路可视化，反向引用查看
- 令牌编辑：值、名称、描述、Code Syntax、别名引用
- 令牌删除、分组重命名、令牌重排序
- 代码导出：CSS 自定义属性、Android XML resources、原始 JSON
- Shiki 语法高亮（支持 XML / CSS / JSON，亮色暗色双主题）
- 亮色 / 暗色主题切换
- 数据持久化到 localStorage，刷新不丢失

## 技术栈

Next.js 16 · React 19 · TypeScript · Tailwind CSS 4 · shadcn/ui · Zustand · Shiki · Framer Motion · file-saver · colord · Vitest · Playwright

## 快速开始

```bash
npm install
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000)，默认会加载 HyperOS Feature Token 示例数据。

## 命令

| 命令 | 说明 |
|------|------|
| `npm run dev` | 开发服务器 |
| `npm run build` | 生产构建 |
| `npm run start` | 生产模式运行 |
| `npm run lint` | ESLint 检查 |
| `npm run test` | 单元测试 (Vitest) |
| `npm run test:watch` | 单元测试 watch 模式 |
| `npm run test:coverage` | 测试覆盖率 |
| `npm run test:e2e` | E2E 测试 (Playwright，首次需 `npx playwright install`) |

## 项目结构

```
src/
├── app/              # Next.js App Router (页面、布局、API)
├── components/
│   ├── ui/           # shadcn/ui 基础组件 (12 个)
│   ├── layout/       # AppShell, Sidebar, MainView
│   └── features/     # 业务组件 (上传、树、网格、列表、检查器、导出等，18 个)
├── lib/
│   ├── parsers/      # JSON 格式检测与解析 (7 个文件含测试)
│   ├── code-generators/  # CSS / Android XML 代码生成 (5 个文件含测试)
│   ├── token-resolver.ts # 别名递归解析
│   ├── tree-builder.ts   # 树形结构构建
│   ├── token-rebuilder.ts # 重建 Figma Native JSON
│   ├── contrast.ts       # WCAG 对比度计算
│   └── use-shiki.ts      # Shiki 语法高亮 hook
├── stores/           # Zustand 全局状态
├── types/            # TypeScript 类型定义
└── data/             # 示例数据

scripts/              # 辅助脚本 (Figma 数据转换)
docs/                 # 项目文档 (验收清单、预设变量、结构说明)
e2e/                  # Playwright E2E 测试
```

详细目录说明见 [docs/PROJECT_STRUCTURE.md](./docs/PROJECT_STRUCTURE.md)，Figma 预设变量格式见 [docs/FIGMA_PRESET_VARIABLES.md](./docs/FIGMA_PRESET_VARIABLES.md)，验收清单见 [docs/ACCEPTANCE_CHECKLIST.md](./docs/ACCEPTANCE_CHECKLIST.md)。

## 支持的 JSON 格式

- **Figma Native** — Figma Variables 原生导出 (`collections` + `variables` with `valuesByMode`)
- **Variables2CSS** — Variables2CSS 插件导出 (`collections` with `variables` array)

上传时自动检测格式，无需手动选择。

## 路径别名

`@/*` → `src/*`

## License

Private
