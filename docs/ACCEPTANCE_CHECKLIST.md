# Design Token Viewer — 验收清单

## 一、自动化测试

### 单元测试 (Vitest)

```bash
npm run test
```

- [ ] 格式检测 (format-detector): 7 个用例通过
- [ ] JSON 解析 (parseTokenJSON): 3 个用例通过
- [ ] 别名解析 (token-resolver): 4 个用例通过
- [ ] 树构建 (tree-builder): 3 个用例通过
- [ ] 文件上传组件 (file-upload): 3 个用例通过

**预期结果**：20 个测试全部通过

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

- [ ] 首页展示上传界面
- [ ] 点击「加载示例数据」后进入 Token 查看器

---

## 二、功能验收（手动）

### 1. 上传流程

- [ ] 首页显示「Design Token Viewer」标题和拖拽区域
- [ ] 拖拽 JSON 文件到区域可上传
- [ ] 点击区域选择文件可上传
- [ ] 上传 Figma 原生导出格式 JSON → 解析成功
- [ ] 上传 Variables2CSS 格式 JSON → 解析成功
- [ ] 上传无效 JSON → 显示错误提示
- [ ] 点击「加载示例数据」→ 加载 Xiaomi Hyper OS4 数据并进入主界面

### 2. 主界面布局

- [ ] 左侧边栏：集合列表、搜索、Token 树
- [ ] 中间主区域：Token 网格/列表
- [ ] 右侧检查器（选中 Token 时显示）

### 3. 侧边栏

- [ ] Token 树可展开/收起
- [ ] 搜索框可筛选 Token
- [ ] 多集合时可切换
- [ ] 「清除数据」可返回上传界面

### 4. Token 展示

- [ ] Grid/List 视图切换正常
- [ ] 颜色 Token 显示色块
- [ ] 数值 Token 显示预览
- [ ] 点击 Token 打开右侧检查器

### 5. 检查器

- [ ] 显示 Token 名称、类型、值
- [ ] 代码导出（CSS/Android 格式切换）
- [ ] 可调整宽度

### 6. 主题

- [ ] 亮色/暗色切换正常

---

## 三、构建与运行

```bash
npm run build
npm run start
```

- [ ] 构建无报错
- [ ] 生产模式访问 `http://localhost:3000` 正常

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
