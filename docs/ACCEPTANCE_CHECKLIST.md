# Design Token Viewer — 验收清单

## 一、自动化测试

### 单元测试（Vitest）

```bash
npm run test
```

- [ ] 解析器、别名解析、树构建和代码生成测试通过
- [ ] Figma Native `description/scopes` 解析及 rebuild 元数据保真测试通过
- [ ] 协作文档、仓储选择、加载状态和 Zustand Store 测试通过
- [ ] 旧文档按 id/name/type 从种子补齐 metadata 的测试通过
- [ ] 服务端加载失败后不重复请求的 loading-state 测试通过
- [ ] 代码展示、变更日志和 Token Inspector Scope 等组件测试通过
- [ ] `token-inspector.test.tsx` 覆盖四种 Token 类型、多个 scope 顺序，以及 undefined、空数组和空白 scope 的“未设置”回退

**预期结果**：`npm run test` 退出码为 0，所有测试文件通过。测试数量会随覆盖范围调整，不固定在文档中。

### 覆盖率

```bash
npm run test:coverage
```

- [ ] `src/lib/` 核心逻辑有测试覆盖

### E2E 测试（Playwright）

首次运行需安装浏览器：

```bash
npx playwright install
npm run test:e2e
```

- [ ] 首页自动加载默认 HyperOS4 文档并显示 Semantic Token
- [ ] 导出弹窗从“当前”切换到“全部”后，来源标签和 Token 数发生对应变化

---

## 二、功能验收（手动）

### 1. 文档加载与服务器导入

- [ ] 服务端文档不可用时显示加载错误，且不会触发重复加载
- [ ] `POST /api/token-document` 与 `POST /api/token-document/import` 均可按维护流程导入 Figma Native 或 Variables2CSS JSON
- [ ] 导入请求体使用 `{ json, revision, actor: { actorName, actorClientId } }`，并通过 `x-document-id` 选择文档
- [ ] 导入携带当前 revision；旧 revision 返回冲突且不覆盖服务端数据
- [ ] 无效 JSON 返回解析错误
- [ ] DTCG JSON 先经 `node scripts/figma-dtcg-to-sample.mjs` 转为 Figma Native，再按 AGENTS 的强制流程同步
- [ ] 导入原样保存输入 `currentJson`；后续编辑统一通过 rebuild 写回 Figma Native

> 产品不提供用户侧上传控件。导入 API 仅供维护 HyperOS Token 数据，但当前路由没有内建认证或授权；`actor` 是可伪造的审计标签，revision 只防并发覆盖。公开部署必须在网络/网关层限制访问，或补充真实鉴权。

### 2. 主界面布局

- [ ] 左侧边栏：HyperOS 文档切换、Collection 列表、搜索、Token 树
- [ ] 中间主区域：Token 网格/列表
- [ ] 右侧检查器：选中 Token 时显示

### 3. 侧边栏

- [ ] Token 树可展开/收起
- [ ] 搜索框可筛选 Token
- [ ] Collection 与 Mode 可切换
- [ ] HyperOS3 / HyperOS4 文档、编辑和日志互相隔离
- [ ] Semantic Token 顶层组按 `bg → fill → stroke → text → mask → margin → padding → gap → radius → text_style` 排列

### 4. Token 展示

- [ ] Grid/List 视图切换正常
- [ ] 颜色 Token 显示色块
- [ ] 数值 Token 显示预览
- [ ] 点击 Token 打开右侧检查器

### 5. 检查器与导出

- [ ] 显示 Token 名称、类型、值和非空 description
- [ ] COLOR、NUMBER、STRING、BOOLEAN 四种 Token 均在 description 之后展示 Token Scope；COLOR 的 Scope 位于对比度之前
- [ ] 多个 scope 按源顺序分别显示为 Badge；无 scope、空数组或仅空白 scope 时显示“未设置”
- [ ] 颜色值提供 HEX/RGB/HSL 和 WCAG 对比度信息
- [ ] Alias Token 显示引用链和反向引用
- [ ] List 视图支持将单个或批量 Token 移动到目标分组；拖放移动及可选重排序在一次 revision 更新中完成
- [ ] 移动分组接口拒绝缺失或非字符串的 `targetGroup`，并阻止目标名称冲突及跨 Collection 的移动/重排组合
- [ ] 混合分组多选仅在全部 Token 已位于目标分组时判定为 no-op；Route、Store 和 List 边界行为均有测试覆盖
- [ ] 检查器宽度可调整
- [ ] CSS、Android XML 和 JSON 格式可导出
- [ ] 导出来源支持当前过滤结果、当前文档全部 Collection；版本快照仅在远端请求成功后可复制或下载
- [ ] “当前”来源随搜索过滤变化；“全部”只包含当前 HyperOS 文档，不跨 HyperOS3/4
- [ ] JSON 导出接口的 `{ format, code }` 响应可通过 `JSON.parse(code)` 还原源 JSON
- [ ] **待修复**：快照导出请求失败时应禁止复制/下载并显示错误；当前实现会保留快照标签并回退本地代码

### 6. 共享记录与快照

- [ ] 编辑、导入、移动令牌分组、重排序、分组重命名、创建快照和恢复快照会产生服务端变更日志
- [ ] 移动分组日志 `move_tokens_to_group` 包含移动前后名称、Token 数量、目标分组及可选的 Collection 重排元数据
- [ ] 日志包含 actor、IP、时间戳及必要的前后值
- [ ] 可创建、下载和恢复当前文档的版本快照
- [ ] 发生 revision 冲突时刷新到最新服务端文档
- [ ] 使用其他 `documentId` 的 `snapshotId` 恢复当前文档返回 404，不修改文档、不写恢复日志

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
