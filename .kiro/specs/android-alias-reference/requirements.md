# Requirements Document

## Introduction

改进 Android 代码生成器，使别名（alias）token 在输出 Android XML 资源时保留 `@color/xxx`、`@dimen/xxx` 等引用格式，而非解析后的最终值。这与真实 Android 研发中的资源引用方式一致，例如小米 HyperOS 设计系统中 `<color name="miuix_default_color_primary_light">@color/miuix_color_blue_light_level1</color>` 的写法。

当前 `generateAndroidToken` 和 `generateAndroidBlock` 仅使用 `token.resolvedValues` 输出具体值，无法表达 token 之间的引用关系。改进后，别名 token 应输出对被引用 token 的 Android 资源引用，非别名 token 继续输出具体值。

## Glossary

- **Android_Code_Generator**: 位于 `src/lib/code-generators/android.ts` 的代码生成模块，负责将 DesignToken 转换为 Android XML 资源格式
- **Alias_Token**: `isAlias` 为 true 的 DesignToken，其 `rawValues` 中包含 `type: "ALIAS"` 的引用，指向另一个 token
- **Referenced_Token**: 被 Alias_Token 引用的目标 DesignToken，即别名链的下一级 token
- **Android_Resource_Reference**: Android 资源引用格式，如 `@color/name`、`@dimen/name`、`@string/name`、`@bool/name`
- **Token_Dictionary**: `Record<string, DesignToken>` 类型的 token 字典，用于通过 id 查找任意 token
- **Code_Generator_Index**: 位于 `src/lib/code-generators/index.ts` 的统一入口模块，封装 `generateTokenCode` 和 `generateTokenBlock` 函数

## Requirements

### Requirement 1: 别名 Token 输出 Android 资源引用格式

**User Story:** 作为设计系统开发者，我希望别名 token 在 Android XML 输出中显示为 `@color/引用名称` 等资源引用格式，以便生成的代码与真实 Android 项目中的资源引用方式一致。

#### Acceptance Criteria

1. WHEN 一个 Alias_Token 被生成为 Android XML 时，THE Android_Code_Generator SHALL 输出该 token 对 Referenced_Token 的 Android_Resource_Reference，而非解析后的最终值
2. WHEN 一个 COLOR 类型的 Alias_Token 被生成时，THE Android_Code_Generator SHALL 输出 `@color/引用目标名称` 格式的值（例如 `<color name="primary_light">@color/blue_light_level1</color>`）
3. WHEN 一个 NUMBER 类型的 Alias_Token 被生成时，THE Android_Code_Generator SHALL 输出 `@dimen/引用目标名称` 格式的值
4. WHEN 一个 STRING 类型的 Alias_Token 被生成时，THE Android_Code_Generator SHALL 输出 `@string/引用目标名称` 格式的值
5. WHEN 一个 BOOLEAN 类型的 Alias_Token 被生成时，THE Android_Code_Generator SHALL 输出 `@bool/引用目标名称` 格式的值
6. WHEN 一个非别名 token 被生成为 Android XML 时，THE Android_Code_Generator SHALL 继续输出具体的解析值（与当前行为一致）

### Requirement 2: 引用目标名称的确定规则

**User Story:** 作为设计系统开发者，我希望引用目标的 Android 资源名称能正确派生，以便生成的引用能在 Android 项目中正确解析。

#### Acceptance Criteria

1. WHEN Referenced_Token 拥有 `codeSyntax.ANDROID` 属性时，THE Android_Code_Generator SHALL 使用经过 `stripCodeSyntaxPrefix` 处理后的 `codeSyntax.ANDROID` 值作为引用目标名称
2. WHEN Referenced_Token 没有 `codeSyntax.ANDROID` 属性时，THE Android_Code_Generator SHALL 从 Referenced_Token 的 `name` 派生 Android 资源名称（将 `/`、`-`、空格替换为 `_` 并转小写）
3. IF Referenced_Token 在 Token_Dictionary 中不存在，THEN THE Android_Code_Generator SHALL 回退为输出解析后的最终值（与非别名 token 行为一致）

### Requirement 3: 函数签名变更以支持 Token 字典传递

**User Story:** 作为开发者，我希望代码生成函数能接收 Token_Dictionary 参数，以便在生成别名引用时查找被引用 token 的信息。

#### Acceptance Criteria

1. THE `generateAndroidToken` 函数 SHALL 接受一个可选的 Token_Dictionary 参数，用于查找 Referenced_Token 的名称信息
2. THE `generateAndroidBlock` 函数 SHALL 接受一个可选的 Token_Dictionary 参数，并将其传递给每次 `generateAndroidToken` 调用
3. THE Code_Generator_Index 中的 `generateTokenCode` 函数 SHALL 接受一个可选的 Token_Dictionary 参数，并在 format 为 "android" 时传递给 `generateAndroidToken`
4. THE Code_Generator_Index 中的 `generateTokenBlock` 函数 SHALL 接受一个可选的 Token_Dictionary 参数，并在 format 为 "android" 时传递给 `generateAndroidBlock`
5. WHEN Token_Dictionary 参数未提供时，THE Android_Code_Generator SHALL 回退为当前行为（输出解析后的最终值）

### Requirement 4: UI 调用方传递 Token 字典

**User Story:** 作为用户，我希望在 Inspector 面板、导出对话框和列表视图中看到的 Android 代码都能正确显示别名引用格式。

#### Acceptance Criteria

1. THE token-inspector 组件 SHALL 在调用 `generateTokenCode` 时传递 Zustand store 中的 tokens 字典
2. THE export-dialog 组件 SHALL 在调用 `generateTokenBlock` 时传递 Zustand store 中的 tokens 字典
3. THE token-list 组件 SHALL 在调用 `generateTokenCode` 时传递 Zustand store 中的 tokens 字典

### Requirement 5: 多级别名链的处理

**User Story:** 作为设计系统开发者，我希望多级别名链（A → B → C）中每个别名 token 都只引用其直接目标，以便保持引用层级的清晰。

#### Acceptance Criteria

1. WHEN 一个 Alias_Token 的引用目标本身也是 Alias_Token 时，THE Android_Code_Generator SHALL 仅输出对直接引用目标的 Android_Resource_Reference（即 A 引用 B，而非跳过 B 直接引用 C）
2. THE Android_Code_Generator SHALL 使用当前 mode 下的 `rawValues` 来判断 token 是否为别名及其直接引用目标
