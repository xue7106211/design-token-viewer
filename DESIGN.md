---
name: Design Token Viewer
description: HyperOS 设计令牌的查阅、对照与交付台
colors:
  background: "oklch(1 0 0)"
  foreground: "oklch(0.145 0 0)"
  card: "oklch(1 0 0)"
  primary: "oklch(0.205 0 0)"
  primary-foreground: "oklch(0.985 0 0)"
  muted: "oklch(0.97 0 0)"
  muted-foreground: "oklch(0.556 0 0)"
  border: "oklch(0.922 0 0)"
  ring: "oklch(0.708 0 0)"
  sidebar: "oklch(0.985 0 0)"
  destructive: "oklch(0.577 0.245 27.325)"
  dark-background: "oklch(0.145 0 0)"
  dark-card: "oklch(0.205 0 0)"
  dark-muted: "oklch(0.269 0 0)"
  dark-muted-foreground: "oklch(0.708 0 0)"
  dark-primary: "oklch(0.922 0 0)"
  dark-border: "oklch(1 0 0 / 10%)"
  dark-destructive: "oklch(0.704 0.191 22.216)"
  type-color: "oklch(0.588 0.158 241.966)"
  type-number: "oklch(0.541 0.281 293.009)"
  type-string: "oklch(0.666 0.179 58.318)"
  type-boolean: "oklch(0.596 0.145 163.225)"
  type-typography: "oklch(0.586 0.253 17.585)"
typography:
  title:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 600
    lineHeight: "20px"
  body:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: "16px"
  body-strong:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 600
    lineHeight: 1
  label:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "10px"
    fontWeight: 600
    lineHeight: "14px"
    letterSpacing: "0.05em"
  mono-value:
    fontFamily: "Geist Mono, ui-monospace, monospace"
    fontSize: "11px"
    fontWeight: 400
    lineHeight: "16px"
  mono-meta:
    fontFamily: "Geist Mono, ui-monospace, monospace"
    fontSize: "10px"
    fontWeight: 400
    lineHeight: "14px"
rounded:
  sm: "6px"
  md: "8px"
  lg: "10px"
  xl: "14px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "20px"
  bar: "56px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    typography: "{typography.title}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
    height: "36px"
  button-ghost-icon:
    textColor: "{colors.muted-foreground}"
    rounded: "{rounded.md}"
    size: "28px"
  button-ghost-icon-hover:
    backgroundColor: "{colors.muted}"
    textColor: "{colors.foreground}"
  input-search:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "0 32px"
    height: "32px"
  segmented-control:
    backgroundColor: "{colors.muted}"
    rounded: "{rounded.lg}"
    padding: "2px"
    height: "32px"
  segmented-control-active:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.md}"
    height: "28px"
  tree-row:
    textColor: "{colors.foreground}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "4px 8px"
  tree-row-selected:
    backgroundColor: "{colors.muted}"
    textColor: "{colors.primary}"
  token-card:
    backgroundColor: "{colors.card}"
    rounded: "{rounded.xl}"
    padding: "12px"
  type-badge:
    backgroundColor: "{colors.background}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: "2px 6px"
  count-pill:
    backgroundColor: "{colors.muted}"
    textColor: "{colors.muted-foreground}"
    typography: "{typography.mono-meta}"
    rounded: "{rounded.full}"
    padding: "2px 6px"
---

# Design System: Design Token Viewer

## Overview

**Creative North Star: "The Spec Sheet（规格对照表）"**

这是一张放在 Figma 旁边的对照表。界面本身几乎没有颜色：纯中性灰阶（色度为 0 的 OKLCH）承担全部结构，让被查阅的 Token 色块、数值和字样成为屏幕上唯一的色彩来源。信息密度高，正文基准是 12px，元信息降到 10–11px，Token 名称和取值一律用等宽字体，便于逐字核对 Figma 源。

布局是桌面三栏工作台：左侧 256px 侧边栏（文档切换、Collection、搜索、树形导航），中间可滚动的 Grid / List 内容区，右侧可拖拽调宽的 Inspector（280–560px）。三栏顶部共享 56px 的工具条高度，形成一条连续的水平基线。亮色与暗色主题等权，暗色不是事后补的。

动效克制且有功能：按压缩放 0.98、卡片悬停上浮 2px、列表重排 FLIP、分段控件滑块，全部使用同一条减速曲线，并在 `prefers-reduced-motion` 下缩短。

**Key Characteristics:**
- 零色度的中性外壳，色彩只属于数据
- 12px 正文、10px 大写标签、等宽取值的高密度层级
- 56px 工具条基线贯穿三栏
- 以 1px 边框和极轻的环形阴影分层，而非投影
- 五种 Token 类型各有固定色相，仅用于类型图标和类型徽标
- 原始命名优先：分组路径父级浅色、末段正文色，不做任何改写

## Colors

外壳全部是无彩色灰阶，唯一的彩色是数据本身、类型标识和破坏性操作。

### Primary
- **Ink（墨黑）** (`primary`): 主按钮、选中态的强调文字和主要操作。暗色下翻转为接近白的浅灰（`dark-primary`）。

### Neutral
- **Paper（纸白）** (`background` / `card`): 主内容区和卡片底色。亮色下两者相同，卡片靠边框而非底色区分。
- **Graphite（石墨）** (`foreground`): 正文与标题。
- **Mist（雾灰）** (`muted`): 悬停底、选中树节点底、分段控件槽、计数胶囊；同值也用作 `secondary` 与 `accent`。
- **Pencil（铅笔灰）** (`muted-foreground`): 次要文字、图标、完整 Token 路径、分组父级路径。
- **Hairline（发丝线）** (`border`): 所有分隔线、卡片与输入框描边；暗色下改为 10% 白（`dark-border`）。
- **Sidebar Wash** (`sidebar`): 侧边栏比主区略暗一阶（0.985），用明度差而非边框以外的装饰区分区域。
- **Focus Grey** (`ring`): 焦点环，以 50% 透明度、3px 宽度出现。

### Tertiary
- **类型色相**：`type-color`（sky）、`type-number`（violet）、`type-string`（amber）、`type-boolean`（emerald）、`type-typography`（rose）。只用于 Token 卡片和列表中的类型图标与类型徽标文字，暗色下换用对应 400 档。

### Named Rules
**The Data Owns Color Rule.** 外壳不引入任何品牌色或装饰色。屏幕上的饱和色只能来自 Token 自身的取值、类型标识或 `destructive`。

**The Destructive Is Rare Rule.** `destructive` 只出现在删除与校验错误上，删除 Token 还需要长按 2 秒确认。

## Typography

**Display Font:** 无（本系统没有展示级字号）
**Body Font:** Geist（回退 ui-sans-serif, system-ui）
**Label/Mono Font:** Geist Mono（回退 ui-monospace）

**Character:** Geist 中性、紧凑，适合密集的中文与英文混排；Geist Mono 承担所有需要逐字核对的内容。

### Hierarchy
- **Title**（600，14px）: 工具条中的 Collection 名、Inspector 中的 Token 短名。
- **Body**（400，12px）: 树节点、Collection 列表、搜索框、分段控件、绝大多数正文。
- **Body Strong**（600，12px，行高 1）: 卡片中的 Token 短名。
- **Label**（600，10px，大写，字距 0.05em）: 区块标题（"Token 组"、"对比度"、表头）。编辑弹窗的区块标题加宽到 0.16em。
- **Mono Value**（400，11px）: HEX、数值、字符串取值。
- **Mono Meta**（400，10px）: 完整 Token 路径、计数、宽度提示。

### Named Rules
**The Mono For Truth Rule.** 任何可能被复制到代码或拿去和 Figma 比对的字符串（Token 名、路径、取值、codeSyntax）都用等宽字体显示。

**The Tabular Count Rule.** 所有计数和数值使用 `tabular-nums`，避免列表滚动时数字抖动。

## Layout

桌面优先的三栏弹性布局，整页 `h-screen` 且禁止外层滚动，每栏内部独立滚动。

- **侧边栏**：展开 256px，收起为 40px 图标轨；内部各区块以 1px 分隔线切开，水平内边距 8–12px。
- **工具条**：三栏统一高 56px，内边距 12–16px，控件高 32px。
- **Grid 视图**：`repeat(auto-fill, minmax(220px, 1fr))`，卡片间距 12px，分组间距 28px，外边距 20px（lg 24px）。每组标题后接一条延伸到行尾的发丝线。
- **List 视图**：带圆角描边的固定布局表格，表头 40px 吸顶并带半透明磨砂底，列宽可拖拽。
- **Inspector**：宽度 280–560px，可拖拽并持久化，视口过窄时自动收缩并保留 48px 余量。

间距以 4px 为步进，常用 4 / 8 / 12 / 16 / 20px。

## Elevation & Depth

系统基本是平的。层级主要靠 1px 发丝线、明度差（侧边栏 0.985、muted 0.97）和半透明底色表达。阴影只有两档，而且以 1px 环形描边为主体：`elevation-raised` 用于浮起的面板，`elevation-dialog` 用于对话框。暗色下两者都退化为纯 1px 白色环线，不使用投影。

可拖动的编辑弹窗是唯一使用较重投影（`shadow-xl`）的元素，因为它浮在所有内容之上且可以移动。

### Named Rules
**The Hairline First Rule.** 先用边框分层；只有当元素真正脱离文档流（对话框、弹窗、拖拽中的面板）时才加阴影。

**The Hover Lift Rule.** 卡片静止时没有阴影，悬停时上浮 2px 并加一层 `shadow-sm`，按下时回落并缩放到 0.99。

## Shapes

基准圆角 10px（`--radius: 0.625rem`），由它派生出一组同心圆角：小控件和树节点 8px（md），分段控件槽和预览框 10px（lg），Token 卡片 14px（xl），计数胶囊和开关全圆。嵌套时外层圆角大于内层：分段控件槽 10px 包 8px 滑块，卡片 14px 包 10px 预览框。

色块随尺寸放大圆角：32px 色块 6px、48px 色块 8px、80px 色块 14px，并带 1px 描边与内侧 5% 黑环，确保白色和透明色在白底上也能看清边界。

## Components

### Buttons
工具型、安静的按钮，绝大多数是 ghost 图标按钮。
- **Shape:** 8px 圆角；默认高 36px，工具条与侧边栏中的图标按钮为 28px 见方，图标 14–16px。
- **Primary:** 墨黑底、纸白字，悬停降到 90% 不透明度。只用于对话框里的确认操作。
- **Ghost:** 默认铅笔灰图标，悬停换雾灰底与正文色。
- **Outline:** 发丝线描边、纸白底、`shadow-xs`。
- **Hover / Focus / Active:** 150ms 过渡颜色、边框与阴影；`:active` 缩放 0.98；焦点为 3px、50% 透明的 Focus Grey 环。禁用态 50% 不透明度。

### Chips
- **类型徽标:** 6px 圆角、1px 描边、纸白底，10px 600 字重，图标与文字都使用该类型的色相。
- **计数胶囊:** 全圆、雾灰底、10px 等宽数字。

### Cards / Containers
- **Corner Style:** 14px。
- **Background:** 纸白；上部 96px 预览区为 25% 雾灰底，下以 1px 线分隔。
- **Shadow Strategy:** 见 The Hover Lift Rule。
- **Border:** 60% 发丝线；选中态换为 45% 墨黑描边加 3.5% 墨黑底和 1px 环。
- **Internal Padding:** 12px；最小高度 172px。

### Inputs / Fields
- **Style:** 1px 发丝线描边、透明底（暗色 30% input 底）、8px 圆角、`shadow-xs`；搜索框高 32px，左侧放 14px 搜索图标，有内容时右侧出现清除按钮。
- **Focus:** 描边换 Focus Grey，外加 3px 50% 透明环。
- **Error / Disabled:** `aria-invalid` 时描边换 `destructive` 并加 20% 环；禁用 50% 不透明度。

### Navigation
- **树形导航:** 12px 文字，行内边距 4px 8px，每级缩进 12px。分组行前置 12px 折叠箭头（展开旋转 90°），行尾显示 10px 计数；叶子行前置 14px 类型图标。悬停与选中都使用雾灰底，选中额外加粗。右键分组可重命名。
- **Collection 列表:** 与树节点同样的 8px 圆角行，选中用侧边栏强调底并加粗，右侧显示 Token 数。
- **分段控件（Mode / 视图切换）:** 32px 高的雾灰槽，10px 圆角，2px 内边距；选中项为 28px 高的纸白滑块加 `shadow-sm`。编辑弹窗里的分段控件用滑动指示器，曲线 `cubic-bezier(0.32, 0.72, 0, 1)`、200ms。

### Token Preview（Signature Component）
每种 Token 类型都有自己的预览方式：颜色显示真实色块并在大色块内写上 HEX（按对比度自动选黑或白字）；数值显示可视化条；Typography 显示 "Ag" 样字加字号/行高；字符串用等宽文字；布尔值显示一个只读开关。预览是界面里唯一允许"有表情"的地方。

## Do's and Don'ts

### Do:
- **Do** 让外壳保持零色度的 OKLCH 灰阶，新增颜色先加到 `globals.css` 的 `:root` 与 `.dark` 两处。
- **Do** 所有 Token 名、路径和取值使用 Geist Mono，计数使用 `tabular-nums`。
- **Do** 分组名统一通过 `GroupLabel` 显示原始名称：父级浅色、末段正文色。
- **Do** 交互过渡使用 `--ease-out`（`cubic-bezier(0.23, 1, 0.32, 1)`），时长 150–200ms，并提供 `motion-reduce` 变体。
- **Do** 新的顶部栏保持 56px 高，与三栏基线对齐。
- **Do** 嵌套圆角遵循外大内小（14 → 10 → 8px）。

### Don't:
- **Don't** 给外壳加品牌色、渐变或彩色背景，它会和被查阅的 Token 颜色混淆。
- **Don't** 把类型色相用在类型标识以外的地方。
- **Don't** 对分组名或 Token 名做大小写、下划线转换或另起显示名。
- **Don't** 用 `hsl(var(--…))` 引用主题变量；变量值是 OKLCH，应直接写 `var(--…)`。
- **Don't** 在静止的卡片或面板上加投影；浮层以外的层级用发丝线和明度差表达。
- **Don't** 用 `transition-all`；明确列出要过渡的属性。
