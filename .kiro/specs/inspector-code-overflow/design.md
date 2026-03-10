# Inspector 代码预览溢出 Bugfix Design

## Overview

Token Inspector 面板底部的 CodeOutput 组件中，Shiki 语法高亮渲染的 `<pre>` 元素内容溢出了面板右边界。根本原因是 Shiki 生成的 `<pre>` 元素默认使用 `white-space: pre` 且没有宽度约束，在 flex 布局的 Inspector 面板中无法被正确收缩。修复方案是在 `.shiki-wrapper` 内部对 Shiki 生成的 `<pre>` 元素添加 `overflow-x: auto` 和 `max-width: 100%` 约束，确保长代码行通过水平滚动条查看。

## Glossary

- **Bug_Condition (C)**: Shiki 渲染的代码行宽度超过 CodeOutput 容器可用宽度时，内容溢出右边界
- **Property (P)**: 超长代码行应被约束在容器内，通过水平滚动条查看完整内容
- **Preservation**: 短代码行正常显示、面板拖拽调宽、格式切换、复制功能等现有行为不受影响
- **CodeOutput**: `src/components/features/code-output.tsx` 中的代码展示组件，使用 Shiki 语法高亮
- **TokenInspector**: `src/components/features/token-inspector.tsx` 中的右侧检查器面板，宽度可拖拽调整 (280-560px)
- **useShikiHtml**: `src/lib/use-shiki.ts` 中的 hook，调用 Shiki 的 `codeToHtml` 生成包含 `<pre><code>` 结构的 HTML 字符串

## Bug Details

### Bug Condition

当 Inspector 面板中显示的代码行（由 Shiki 渲染）的像素宽度超过 CodeOutput 容器的可用宽度时，`<pre>` 元素内容溢出容器右边界。这在 Inspector 面板宽度较小（接近 280px）或代码行较长（如 Android XML 资源名称）时尤为明显。

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type { codeText: string, inspectorWidth: number }
  OUTPUT: boolean

  shikiHtml := renderShikiHtml(input.codeText)
  preElement := extractPreElement(shikiHtml)
  containerWidth := input.inspectorWidth - paddingAndBorders

  RETURN preElement.scrollWidth > containerWidth
         AND preElement does NOT have horizontal scrollbar
         AND content visually overflows container right boundary
END FUNCTION
```

### Examples

- **Android XML 长资源名**: `<color name="miuix_default_color_surface_container_light">@color/ref</color>` 在 280px 宽度面板中溢出右边界，期望出现水平滚动条
- **CSS 长自定义属性**: `--miuix-default-color-surface-container-light: oklch(0.95 0.01 250);` 在 320px 宽度面板中溢出，期望出现水平滚动条
- **短代码行**: `--primary: #ff0000;` 在任意面板宽度下正常显示，不应出现滚动条
- **面板最大宽度**: 560px 宽度下大部分代码行可完整显示，极长行仍应有滚动条

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- 短代码行在容器宽度内正常显示，不出现不必要的滚动条
- Inspector 面板拖拽调宽功能在 280px-560px 范围内平滑工作
- Android/CSS 代码格式标签页切换正常，语法高亮正确渲染
- 复制按钮将完整代码内容复制到剪贴板
- Shiki 双主题（github-light / github-dark）正常切换
- 代码区域的字体大小（11px）、行高、内边距不变

**Scope:**
所有不涉及长代码行溢出的场景应完全不受此修复影响。包括：
- 短代码行的正常显示
- 鼠标交互（复制按钮、格式切换）
- 面板拖拽调宽
- 主题切换

## Hypothesized Root Cause

基于代码分析，最可能的原因是：

1. **Shiki `<pre>` 元素缺少溢出约束**: Shiki 的 `codeToHtml` 生成的 `<pre>` 元素默认使用 `white-space: pre`，不会自动换行。`.shiki-wrapper` 虽然设置了 `overflow-x: auto` 和 `min-w-0`，但 Shiki 生成的内部 `<pre>` 元素没有 `overflow` 或 `max-width` 约束，导致 `<pre>` 本身扩展超出父容器。

2. **Flex 布局中 `min-width: auto` 问题**: Inspector 面板使用 flex 列布局，ScrollArea 内部的内容区域可能存在 flex 子元素默认 `min-width: auto` 的问题，阻止了内容正确收缩。虽然 `.shiki-wrapper` 设置了 `min-w-0`，但 Shiki 生成的 `<pre>` 元素是通过 `dangerouslySetInnerHTML` 注入的，无法直接添加 Tailwind 类名，需要通过 CSS 选择器（已有 `[&_pre]:!bg-transparent`）来约束。

3. **现有 CSS 选择器不完整**: 当前 `.shiki-wrapper` 上的 Tailwind 任意选择器只设置了 `[&_pre]:!bg-transparent` 和 `[&_code]:!bg-transparent`（背景透明），但缺少对 `<pre>` 元素的溢出和宽度约束。

## Correctness Properties

Property 1: Bug Condition - 长代码行水平滚动

_For any_ 代码文本，当 Shiki 渲染后的 `<pre>` 元素内容宽度超过 CodeOutput 容器可用宽度时，修复后的组件 SHALL 将内容约束在容器内，并显示水平滚动条以便查看完整代码。

**Validates: Requirements 2.1, 2.2**

Property 2: Preservation - 短代码行与现有功能

_For any_ 代码文本，当 Shiki 渲染后的 `<pre>` 元素内容宽度不超过容器可用宽度时，修复后的组件 SHALL 与修复前行为一致，正常显示代码内容且不出现不必要的滚动条，保持格式切换、复制、面板调宽等功能正常。

**Validates: Requirements 3.1, 3.2, 3.3, 3.4**

## Fix Implementation

### Changes Required

假设根因分析正确：

**File**: `src/components/features/code-output.tsx`

**Component**: `CodeOutput`

**Specific Changes**:
1. **为 Shiki `<pre>` 添加溢出约束**: 在 `.shiki-wrapper` 的 Tailwind 任意选择器中添加 `[&_pre]:overflow-x-auto`，使 Shiki 生成的 `<pre>` 元素在内容超宽时显示水平滚动条

2. **为 Shiki `<pre>` 添加宽度约束**: 添加 `[&_pre]:max-w-full`，确保 `<pre>` 元素不会超出父容器宽度

3. **移除 `.shiki-wrapper` 自身的 `overflow-x-auto`**: 由于滚动行为已委托给内部 `<pre>` 元素，外层 wrapper 可以改为 `overflow-hidden` 以避免双重滚动条。或者保留外层 `overflow-x-auto` 作为兜底，但确保内部 `<pre>` 有正确约束

具体修改为将 `.shiki-wrapper` 的 className 从：
```
"shiki-wrapper min-w-0 max-w-full overflow-x-auto overflow-y-hidden p-3 text-[11px] font-mono leading-relaxed [&_pre]:!bg-transparent [&_code]:!bg-transparent"
```
改为：
```
"shiki-wrapper min-w-0 max-w-full overflow-x-auto overflow-y-hidden p-3 text-[11px] font-mono leading-relaxed [&_pre]:!bg-transparent [&_pre]:overflow-x-auto [&_pre]:max-w-full [&_code]:!bg-transparent"
```

## Testing Strategy

### Validation Approach

测试策略分两阶段：首先在未修复代码上复现溢出问题，然后验证修复后代码行为正确且不引入回归。

### Exploratory Bug Condition Checking

**Goal**: 在实施修复前，复现并确认溢出 bug 的存在，验证根因分析。

**Test Plan**: 在 Inspector 面板中选择具有长代码行的令牌（如 Android XML 格式的颜色令牌），观察代码区域是否溢出。在不同面板宽度下测试。

**Test Cases**:
1. **Android XML 长名称测试**: 选择名称较长的颜色令牌，切换到 Android 格式，观察 `<pre>` 元素是否溢出（未修复代码将溢出）
2. **最小面板宽度测试**: 将 Inspector 面板拖拽到 280px 最小宽度，观察代码溢出情况（未修复代码将严重溢出）
3. **CSS 格式长属性测试**: 切换到 CSS 格式，观察长自定义属性名是否溢出（未修复代码将溢出）

**Expected Counterexamples**:
- Shiki 渲染的 `<pre>` 元素 `scrollWidth` 大于 `clientWidth`，但没有水平滚动条
- 内容视觉上超出 Inspector 面板右边界

### Fix Checking

**Goal**: 验证对所有触发 bug 条件的输入，修复后的组件产生期望行为。

**Pseudocode:**
```
FOR ALL input WHERE isBugCondition(input) DO
  result := renderCodeOutput_fixed(input)
  ASSERT preElement.scrollWidth <= containerWidth
         OR horizontalScrollbarVisible(preElement)
  ASSERT content does NOT overflow container right boundary
END FOR
```

### Preservation Checking

**Goal**: 验证对所有不触发 bug 条件的输入，修复后的组件与原始组件行为一致。

**Pseudocode:**
```
FOR ALL input WHERE NOT isBugCondition(input) DO
  ASSERT renderCodeOutput_original(input) = renderCodeOutput_fixed(input)
END FOR
```

**Testing Approach**: 由于此 bug 主要涉及 CSS 样式，属性基测试（PBT）的适用性有限。推荐结合视觉回归测试和单元测试来验证。

**Test Plan**: 先在未修复代码上确认短代码行、格式切换、复制功能正常工作，然后在修复后验证这些行为不变。

**Test Cases**:
1. **短代码行显示**: 验证短代码行在修复前后显示一致，无不必要的滚动条
2. **格式切换**: 验证 Android/CSS 格式切换在修复前后行为一致
3. **复制功能**: 验证复制按钮在修复前后都能正确复制完整代码
4. **面板调宽**: 验证拖拽调宽在修复前后平滑工作

### Unit Tests

- 测试 CodeOutput 组件在长代码输入时渲染的 DOM 结构包含正确的 overflow CSS 属性
- 测试 CodeOutput 组件在短代码输入时不产生不必要的样式变化
- 测试 Shiki HTML 注入后 `<pre>` 元素的样式选择器正确应用

### Property-Based Tests

- 生成随机长度的代码字符串，验证 CodeOutput 容器始终约束内容在可见区域内
- 生成随机 Inspector 面板宽度（280-560px），验证代码区域在所有宽度下正确显示

### Integration Tests

- 在完整 Inspector 面板中选择不同类型的令牌，验证代码预览区域不溢出
- 在不同面板宽度下切换代码格式，验证溢出约束始终有效
- 验证亮色/暗色主题切换后溢出修复仍然生效
