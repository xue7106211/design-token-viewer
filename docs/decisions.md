# 决策记录

| 日期 | 决定 | 原因 |
|------|------|------|
| 2026-10-26 | 新增纯前端的「组件 Token 快速命名」工具，路由 `/tools/comp-token-namer`，不读写数据库 | 设计师给组件 Token 命名需要统一规范 |
| 2026-10-26 | 隐藏「部件」字段，命名格式定为 `miuix_comp_{组件}_{类型}_{角色}_{状态}` | Allen 验收时决定 |
| 2026-10-26 | 状态 7 个：`enabled`、`disabled`、`pressed`、`selected`、`checked`、`activated`、`hovered`，默认 `enabled`。角色 5 个：`fill`、`bg`、`text`、`stroke`、`mask`。`radius` 不限制搭配哪个角色 | Allen 验收时决定 |
| 2026-10-26 | 去掉右上角「工具」菜单，入口只放在侧边栏「版本快照」上方 | Allen 验收时决定 |
