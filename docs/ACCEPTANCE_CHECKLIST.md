# Design Token Viewer — 验收清单

## 一、自动化测试

### 单元测试 (Vitest)

```bash
npm run test
```

- [ ] 解析器、别名解析、树构建和代码生成测试通过
- [ ] 协作文档、仓储选择、加载状态和 Zustand Store 测试通过
- [ ] 代码展示、变更日志等组件测试通过

**预期结果**：`npm run test` 退出码为 0，所有测试文件通过。测试数量会随覆盖范围调整，不在本文档中固定。

### 覆盖率

```bash
npm run test:coverage
```

- [ ] `src/lib/` 核心逻辑有测试覆盖

### E2E 测试 (Playwright)

首次运行需安装浏览器：

```bash
npx playwright install
```

```bash
npm run test:e2e
```

- [ ] 首页自动加载默认的 HyperOS 4 Token 文档并进入 Token 查看器
- [ ] 服务端文档不可用时，错误状态不会触发重复加载

---

## 二、功能验收（手动）

### 1. 文档加载与服务器导入

- [ ] 服务端文档不可用时显示加载错误，且不会触发重复加载
- [ ] 通过 `/api/token-document/import` 向已有文档导入 Figma Native 或 Variables2CSS JSON
- [ ] 导入携带当前 revision；旧 revision 返回冲突而不覆盖服务端数据
- [ ] 无效 JSON 返回解析错误
- [ ] DTCG JSON 先经 `node scripts/figma-dtcg-to-sample.mjs` 转为 Figma Native JSON 后再导入

> 产品不提供用户侧上传或重新导入控件。`/api/token-document/import` 仅供维护 HyperOS Token 数据的受控服务端流程调用。

### 2. 主界面布局

- [ ] 左侧边栏：HyperOS 文档切换、集合列表、搜索、Token 树
- [ ] 中间主区域：Token 网格/列表
- [ ] 右侧检查器（选中 Token 时显示）

### 3. 侧边栏

- [ ] Token 树可展开/收起
- [ ] 搜索框可筛选 Token
- [ ] Collection 与 Mode 可切换
- [ ] HyperOS 3 / HyperOS 4 文档互相隔离
- [ ] Semantic Token 顶层组按 `bg → fill → stroke → text → mask → margin → padding → gap → radius` 排列

### 4. Token 展示

- [ ] Grid/List 视图切换正常
- [ ] 颜色 Token 显示色块
- [ ] 数值 Token 显示预览
- [ ] 点击 Token 打开右侧检查器

### 5. 检查器

- [ ] 显示 Token 名称、类型、值
- [ ] 代码导出（CSS/Android 格式切换）
- [ ] 可调整宽度

### 6. 共享记录与快照

- [ ] 编辑、导入、重排序、分组重命名会产生服务端变更日志
- [ ] 可创建、下载和恢复版本快照
- [ ] 发生 revision 冲突时刷新到最新服务端文档

### 7. 主题

- [ ] 亮色/暗色切换正常

---

## 三、构建与运行

```bash
npm run build
npm run start
```

- [ ] 构建无报错
- [ ] 生产模式访问 `http://localhost:3000` 正常
- [ ] 生产环境已设置 `DATABASE_URL` 并完成数据库迁移

---

## 四、代码质量

```bash
npm run lint
```

- [ ] ESLint 无错误

---

## 验收结论

| 类别       | 状态   |
|------------|--------|
| 单元测试   | ☐ 通过 |
| E2E 测试   | ☐ 通过 |
| 功能验收   | ☐ 通过 |
| 构建与运行 | ☐ 通过 |
| 代码质量   | ☐ 通过 |
