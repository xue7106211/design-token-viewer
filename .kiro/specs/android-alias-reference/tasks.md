# Implementation Plan: Android 别名资源引用

## Overview

改进 Android 代码生成器，使别名 token 输出 `@color/xxx`、`@dimen/xxx` 等 Android 资源引用格式。改动集中在 `android.ts` 核心逻辑、`index.ts` 签名扩展，以及三个 UI 调用方的参数传递。

## Tasks

- [x] 1. 实现 Android 代码生成器的别名引用核心逻辑
  - [x] 1.1 在 `src/lib/code-generators/android.ts` 中新增 `getAndroidResourcePrefix` 函数
    - 实现 TokenType 到 Android 资源前缀的映射：COLOR → "color"、NUMBER → "dimen"、STRING → "string"、BOOLEAN → "bool"
    - _Requirements: 1.2, 1.3, 1.4, 1.5_

  - [x] 1.2 在 `src/lib/code-generators/android.ts` 中新增 `getReferenceName` 函数
    - 接受 `DesignToken` 参数，返回引用目标的 Android 资源名称
    - 优先使用 `codeSyntax.ANDROID` 经 `stripCodeSyntaxPrefix` 处理后的值
    - 无 `codeSyntax.ANDROID` 时从 `token.name` 派生（替换 `/`、`-`、空格为 `_` 并转小写，复用 `toAndroidName`）
    - _Requirements: 2.1, 2.2_

  - [x] 1.3 修改 `generateAndroidToken` 函数签名，增加可选 `tokens?: Record<string, DesignToken>` 参数
    - 当 `tokens` 已提供且当前 mode 的 `rawValues` 为 `{ type: "ALIAS", id: string }` 时：
      - 通过 `rawValue.id` 在 `tokens` 字典中查找目标 token
      - 目标存在时输出 `@prefix/引用名称` 格式（调用 `getAndroidResourcePrefix` + `getReferenceName`）
      - 目标不存在时回退为输出解析后的最终值
    - 当 `tokens` 未提供时保持当前行为不变（输出解析值）
    - 非别名 token 继续输出具体值
    - _Requirements: 1.1, 1.6, 2.3, 3.1, 3.5, 5.1, 5.2_

  - [x] 1.4 修改 `generateAndroidBlock` 函数签名，增加可选 `tokens?: Record<string, DesignToken>` 参数
    - 将 `tokens` 参数传递给每次 `generateAndroidToken` 调用
    - _Requirements: 3.2_

  - [x] 1.5 为 `android.ts` 新增单元测试文件 `src/lib/code-generators/android.test.ts`
    - 测试别名 COLOR token 输出 `@color/引用名称`
    - 测试别名 NUMBER token 输出 `@dimen/引用名称`
    - 测试别名 STRING token 输出 `@string/引用名称`
    - 测试别名 BOOLEAN token 输出 `@bool/引用名称`
    - 测试非别名 token 输出具体解析值
    - 测试引用目标不存在时回退为解析值
    - 测试 `tokens` 未提供时回退为当前行为
    - 测试引用目标有 `codeSyntax.ANDROID` 时使用 `stripCodeSyntaxPrefix` 处理后的名称
    - 测试引用目标无 `codeSyntax.ANDROID` 时从 `name` 派生名称
    - 测试多级别名链 A → B → C 中 A 仅引用 B（直接目标）
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 2.1, 2.2, 2.3, 5.1, 5.2_

- [x] 2. Checkpoint - 确保核心逻辑正确
  - Ensure all tests pass, ask the user if questions arise.

- [x] 3. 扩展 Code Generator Index 函数签名
  - [x] 3.1 修改 `src/lib/code-generators/index.ts` 中 `generateTokenCode` 函数
    - 增加可选 `tokens?: Record<string, DesignToken>` 参数
    - 在 `format === "android"` 分支中将 `tokens` 传递给 `generateAndroidToken`
    - _Requirements: 3.3_

  - [x] 3.2 修改 `src/lib/code-generators/index.ts` 中 `generateTokenBlock` 函数
    - 增加可选 `tokens?: Record<string, DesignToken>` 参数
    - 在 `format === "android"` 分支中将 `tokens` 传递给 `generateAndroidBlock`
    - _Requirements: 3.4_

- [x] 4. UI 调用方传递 tokens 字典
  - [x] 4.1 修改 `src/components/features/token-inspector.tsx`
    - 在调用 `generateTokenCode(token, codeFormat, modeId)` 时追加第四参数 `tokens`（已从 store 获取）
    - _Requirements: 4.1_

  - [x] 4.2 修改 `src/components/features/export-dialog.tsx`
    - 在调用 `generateTokenBlock(visibleTokens, format, activeModeId ?? undefined)` 时追加第四参数 `tokens`（已从 store 获取）
    - _Requirements: 4.2_

  - [x] 4.3 修改 `src/components/features/token-list.tsx`
    - 在调用 `generateTokenCode(token, codeFormat, modeId)` 时追加第四参数 `tokens`（已从 store 获取）
    - _Requirements: 4.3_

- [x] 5. Final checkpoint - 确保所有改动正确集成
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- 标记 `*` 的任务为可选，可跳过以加速 MVP
- 所有改动向后兼容：`tokens` 参数为可选，未提供时行为不变
- 不引入新的数据模型或类型定义，复用现有 `DesignToken` 和 `RawTokenValue` 类型
- 属性测试不适用于本功能（主要是确定性的格式转换逻辑），单元测试已足够覆盖
