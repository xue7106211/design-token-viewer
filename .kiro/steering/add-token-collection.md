---
inclusion: manual
---

# 新增 Token Collection 工作流

当用户要求在 `src/data/sample-tokens.json` 中新增一个 token collection 时，按以下流程操作。

## 前置信息收集

1. 确认 collection 名称（如 "Radius Token"、"Spacing Token"）
2. 确认 token 列表：每个 token 的 name 和 value
3. 确认 token 类型：COLOR / NUMBER / STRING / BOOLEAN
4. 确认 mode 结构：
   - 颜色类通常有 Light / Dark 两个 mode（modeId: mode_light / mode_dark）
   - 数值类通常只有一个 Default mode（modeId: mode_default）
   - 如果用户提供了多 mode 数据，按实际情况处理

## 操作步骤

### 1. 读取现有结构

读取 `src/data/sample-tokens.json`，确认：
- 现有 collections 数组的结构
- 现有最大的 `var_` ID 编号（搜索 `var_19[0-9]` 或更大范围）
- 文件末尾的 JSON 闭合结构

### 2. 分配 ID

- collection ID：`col_<语义名>`（如 `col_radius`、`col_spacing`）
- variable ID：从最大现有 ID 之后开始，留出间隔（如现有最大 var_194，新 ID 从 var_200 起）
- mode ID：复用已有的 modeId（mode_light / mode_dark / mode_default），或按需新建

### 3. 插入 collection 定义

在 `collections` 数组末尾（`]` 之前）插入新 collection 对象：

```json
{
  "id": "col_xxx",
  "name": "Xxx Token",
  "modes": [
    { "modeId": "mode_default", "name": "Default" }
  ],
  "variableIds": ["var_200", "var_201", ...]
}
```

### 4. 插入 variable 定义

在 `variables` 对象末尾插入每个 token。根据类型使用对应的值结构：

NUMBER 类型：
```json
{
  "id": "var_200",
  "name": "token_name",
  "type": "NUMBER",
  "valuesByMode": {
    "mode_default": {
      "type": "NUMBER",
      "value": 8
    }
  },
  "codeSyntax": {}
}
```

COLOR 类型（双 mode）：
```json
{
  "id": "var_200",
  "name": "group/token_name",
  "type": "COLOR",
  "valuesByMode": {
    "mode_light": {
      "type": "COLOR",
      "value": { "r": 1, "g": 0, "b": 0, "a": 1 }
    },
    "mode_dark": {
      "type": "COLOR",
      "value": { "r": 1, "g": 0.2, "b": 0.2, "a": 1 }
    }
  },
  "codeSyntax": {}
}
```

COLOR 别名引用：
```json
{
  "type": "ALIAS",
  "id": "var_xxx"
}
```

### 5. 验证

执行 JSON 合法性检查：
```bash
node -e "JSON.parse(require('fs').readFileSync('src/data/sample-tokens.json','utf8')); console.log('JSON valid')"
```

然后验证新增数据的完整性：
```bash
node -e "
const d = JSON.parse(require('fs').readFileSync('src/data/sample-tokens.json','utf8'));
const c = d.collections.find(c => c.name === '<Collection Name>');
console.log('Collection:', c.name, '| Modes:', c.modes.map(m=>m.name), '| Tokens:', c.variableIds.length);
c.variableIds.forEach(id => {
  const v = d.variables[id];
  const mode = Object.keys(v.valuesByMode)[0];
  console.log(' ', v.name, '=', JSON.stringify(v.valuesByMode[mode].value ?? v.valuesByMode[mode].id));
});
"
```

## 注意事项

- token name 中的 `/` 表示分组层级（如 `blue/color-blue-light-level1`），会被 tree-builder 解析为树形结构
- 如果 token 没有分组，直接用扁平名称即可（如 `tiny`、`small`）
- `codeSyntax` 字段可选，用于指定平台特定的代码名称（如 `{ "ANDROID": "miuix_radius_tiny" }`）
- 颜色值使用 0-1 范围的 RGBA，不是 0-255
- 由于 Zustand 使用 localStorage 持久化，修改 sample-tokens.json 后用户可能需要清除浏览器缓存才能看到新数据
