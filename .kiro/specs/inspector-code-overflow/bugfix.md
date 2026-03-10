# Bugfix Requirements Document

## Introduction

Token Inspector 面板底部的代码预览区域（CodeOutput 组件）中，Shiki 语法高亮渲染的代码内容溢出了面板右边界。当代码行较长时（如 Android XML 资源名称），内容超出 Inspector 面板宽度，没有被正确约束在容器内，也无法通过水平滚动查看完整内容。

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN Inspector 面板中显示较长的代码行（如 Android XML `<color name="miuix_default_color_surface_container_light">@co...`）THEN Shiki 渲染的 `<pre>` 元素内容溢出 CodeOutput 容器右边界，超出 Inspector 面板可见区域

1.2 WHEN Inspector 面板宽度被拖拽调整为较小值（接近 280px 最小宽度）THEN 代码溢出问题更加严重，长代码行完全超出面板边界且无法通过水平滚动查看

### Expected Behavior (Correct)

2.1 WHEN Inspector 面板中显示较长的代码行 THEN 系统 SHALL 将代码内容约束在 CodeOutput 容器宽度内，超出部分可通过水平滚动条查看

2.2 WHEN Inspector 面板宽度被拖拽调整为较小值 THEN 系统 SHALL 保持代码内容在容器内正确显示，自动出现水平滚动条以便查看完整代码

### Unchanged Behavior (Regression Prevention)

3.1 WHEN 代码行较短且完全在容器宽度内 THEN 系统 SHALL CONTINUE TO 正常显示代码内容，不出现不必要的滚动条

3.2 WHEN 用户拖拽调整 Inspector 面板宽度 THEN 系统 SHALL CONTINUE TO 在 280px-560px 范围内平滑调整面板宽度

3.3 WHEN 用户切换 Android/CSS 代码格式标签页 THEN 系统 SHALL CONTINUE TO 正确切换并显示对应格式的语法高亮代码

3.4 WHEN 用户点击复制按钮 THEN 系统 SHALL CONTINUE TO 将完整代码内容复制到剪贴板
