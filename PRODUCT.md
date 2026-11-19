# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- 主要用户：维护者 Allen，负责 Xiaomi HyperOS 设计系统的 Design Token（README 称“个人用的”工具）。
- 次要用户：HyperOS 团队的设计师和研发，查阅、对照 Token，给组件 Token 命名，或取用导出的代码。
- 使用场景：在桌面浏览器中，一边对照 Figma 一边查找 Token、核对 Light/Dark 值和别名链、导出代码给研发。

## Product Purpose

浏览、对照、编辑并导出 HyperOS 的 Figma Variables（含 Text Style 转成的 TYPOGRAPHY Token）。它是 Figma 之外的查阅和交付面：让人看清每个 Token 的值、模式、别名引用与反向引用，并导出 CSS、Android XML、JSON 和 GitLab CSV。成功标准：找到一个 Token 并确认其值与引用只需几秒，导出结果与 Figma 源一致。

## Positioning

专为 HyperOS 设计系统定制，而非通用 Token 浏览器：保留 Figma description、scopes、codeSyntax，支持 HyperOS 命名约定（如去除中文前缀的 `stripCodeSyntaxPrefix`），把 Text Style 映射为字段级别名的 TYPOGRAPHY Token，并按 HyperOS 4 / HyperOS 5 两套表隔离。不是 Figma 插件，不在应用内读写 Figma 文件。

## Operating Context

- 数据源：Figma 文件 HyperOS-Design-Token（`5gZYD8i6JqBvsaS7yvnO9c`）的本地 Variables 与 Text Styles，经 Figma MCP 增量同步脚本写入 Neon PostgreSQL；DTCG 转换为备用流程。
- 日常流程：`npm run figma:plugin` → `npm run token:preview` → `npm run token:sync`，生成 `exports/HyperOS_Design_Token_YYYYMMDD.csv`，人工放入 GitLab OS5token。
- 生产站：https://hyperostoken.netlify.app/
- 附带工具：`/tools/comp-token-namer`，组件 Token 快速命名，格式 `miuix_comp_{组件}_{类型}_{角色}_{状态}`。

## Capabilities and Constraints

- 多 Collection、多 Mode（Light/Dark）；Grid / List 视图；树形导航与搜索；颜色 HEX/RGB/HSL 与 WCAG 对比度。
- 编辑值、名称、描述、codeSyntax、别名；删除、移动分组、重排序、重命名分组；变更日志与版本快照。
- Token 顺序以 Collection 存储顺序为准；HyperOS 5 的顺序来自 Figma，每次同步覆盖应用内排序和编辑。
- 分组名一律显示原始名称（`GroupLabel`），不得引入第二套显示名。
- 术语：显示名 HyperOS 4 = 文档 id `hyperos3`，HyperOS 5 = `hyperos4`。
- UI 文案为中文。
- 安全边界：导入与编辑接口没有内建鉴权；actor 只是审计标签。
- 已知限制：快照导出失败时未 fail-closed；`move-to-group` 输入校验不完整。

## Brand Commitments

- 名称：Design Token Viewer；面向 Xiaomi HyperOS 设计系统，资源有 `public/hyperos-logo.png`。
- 中文界面。其他视觉承诺未确认。

## Evidence on Hand

- 真实 Token 数据：`src/data/sample-tokens.json`（HyperOS 4）、`src/data/sample-tokens-hyperos4.json`（HyperOS 5）、`figma-token/figma-variables.json`。
- 无用户反馈、使用数据或推荐语，后续工作不得编造。

## Product Principles

1. 与 Figma 源保持一致优先于应用内的便利：显示和导出都忠实于源数据与原始命名。
2. 查阅速度第一：找到 Token、看清值与引用链是核心任务。
3. 变更可追溯：每次写入都有日志和可恢复的快照。
4. 交付物可直接用于研发：导出格式贴合 Android 与 Web 的实际用法。

## Accessibility

暂无专门要求。
