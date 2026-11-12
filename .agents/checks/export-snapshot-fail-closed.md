---
files:
  - "src/components/features/export-dialog.tsx"
  - "src/app/api/export/route.ts"
---

# 导出来源为快照时必须 fail-closed

导出对话框支持以来源「当前 / 全部 / 某个版本快照」生成 Android XML、CSS 或 JSON。当用户选择的是**快照**时，复制与下载的内容必须来自成功的远端 `/api/export?snapshotId=…` 响应，不能在请求失败后静默回退到本地代码却仍显示快照名称。

1. **请求成功前不得放出可复制/可下载的快照内容**。`syncExportCode`（或等价逻辑）在快照请求进行中应处于生成中/不可用状态；只有拿到 `response.code` 后才把该字符串作为导出正文。
2. **失败时必须 fail-closed**：清除或禁用快照来源（例如回退到来源「当前」并清空 `remoteCode`），或明确展示错误并禁用复制/下载。禁止 `catch` 里 `setRemoteCode(localCode)` 同时保留快照 `source`——界面会标成快照，实际却是当前文档，开发会拿到错误版本的 Token。
3. **不得只根据来源标签判断内容来源**。来源下拉的显示名（`getSourceLabel`）与实际 `code` 必须一致；标签写「某快照」时，`code` 必须是该快照的导出结果。

AGENTS.md「已知限制」已记录当前实现会在失败路径保留快照标签并回退本地代码；在真正修成 fail-closed 之前，任何改动导出对话框的 PR 都不得继续依赖或扩大这一回退行为。

## 示例

错误——请求失败时用本地代码顶上，来源仍是快照 id：

```ts
try {
  const response = await apiRequest<{ code: string }>(`/api/export?${params}`);
  setRemoteCode(response.code);
} catch {
  setRemoteCode(localCode); // 来源仍为 snapshotId，标签像快照、内容却是当前文档
}
```

正确——失败时清掉远端结果并离开快照来源（或禁用导出动作）：

```ts
try {
  const response = await apiRequest<{ code: string }>(`/api/export?${params}`);
  setRemoteCode(response.code);
} catch {
  setRemoteCode(null);
  setSource("current");
  // 并可向用户展示「快照导出失败」
}
```
