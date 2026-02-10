# Design Token Viewer

设计令牌查看器，支持 Figma Variables 原生导出与 Variables2CSS 格式的 JSON 文件可视化浏览和代码导出。

## 项目结构

目录与职责说明见 [docs/PROJECT_STRUCTURE.md](./docs/PROJECT_STRUCTURE.md)。Figma 预设变量文件格式及 MCP 数据来源限制见 [docs/FIGMA_PRESET_VARIABLES.md](./docs/FIGMA_PRESET_VARIABLES.md)。

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Testing

```bash
# 单元测试
npm run test

# 覆盖率
npm run test:coverage

# E2E 测试（首次需安装浏览器：npx playwright install）
npm run test:e2e
```

完整验收清单见 [docs/ACCEPTANCE_CHECKLIST.md](./docs/ACCEPTANCE_CHECKLIST.md)。

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
