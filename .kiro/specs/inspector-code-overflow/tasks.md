# Implementation Plan

- [x] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - 长代码行溢出容器
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the bug exists
  - **Scoped PBT Approach**: Scope the property to concrete failing cases — render CodeOutput with a long code string (e.g., Android XML `<color name="miuix_default_color_surface_container_light">@color/ref_value</color>`) and assert that the `.shiki-wrapper` 内部的 `<pre>` 元素具有 `overflow-x: auto` 和 `max-width: 100%` 样式
  - Test file: `src/components/features/code-output.test.tsx`
  - Use Vitest + Testing Library + jsdom
  - Mock `useShikiHtml` hook to return a known long `<pre><code>...</code></pre>` HTML string
  - Assert: the rendered `.shiki-wrapper` 内部 `<pre>` 元素应用了 `overflow-x: auto` 样式（通过检查 Tailwind 类选择器 `[&_pre]:overflow-x-auto` 存在于 `.shiki-wrapper` 的 className 中）
  - Assert: the rendered `.shiki-wrapper` 内部 `<pre>` 元素应用了 `max-w-full` 约束（通过检查 `[&_pre]:max-w-full` 存在于 `.shiki-wrapper` 的 className 中）
  - Run test on UNFIXED code
  - **EXPECTED OUTCOME**: Test FAILS (this is correct - it proves the bug exists, because `[&_pre]:overflow-x-auto` and `[&_pre]:max-w-full` are missing from the className)
  - Document counterexamples found: `.shiki-wrapper` className 缺少 `[&_pre]:overflow-x-auto` 和 `[&_pre]:max-w-full`，导致 Shiki 生成的 `<pre>` 元素内容溢出容器
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 1.1, 1.2, 2.1, 2.2_

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - 短代码行与现有功能保持不变
  - **IMPORTANT**: Follow observation-first methodology
  - Test file: `src/components/features/code-output.test.tsx` (same file as task 1)
  - Use Vitest + Testing Library + jsdom
  - Mock `useShikiHtml` hook and Zustand store
  - Observe on UNFIXED code:
    - 短代码行（如 `--primary: #ff0000;`）正常渲染，`.shiki-wrapper` 包含 `overflow-x-auto` 和 `min-w-0` 类
    - CodeFormatTabs 渲染 Android 和 CSS 两个标签按钮
    - 复制按钮存在且可点击
    - `<pre>` fallback（html 为空时）正确渲染代码文本
  - Write property-based tests:
    - For any short code string (length < 40 chars), CodeOutput renders without error and contains the code text
    - CodeFormatTabs always renders exactly 2 format buttons (Android, CSS)
    - Copy button is always present and clickable
    - When `useShikiHtml` returns null, fallback `<pre>` element renders with correct classes (`overflow-x-auto`, `whitespace-pre-wrap`, `break-all`)
  - Verify tests pass on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 3. Fix for Inspector 代码预览溢出

  - [x] 3.1 Implement the fix in code-output.tsx
    - In `src/components/features/code-output.tsx`, modify the `.shiki-wrapper` div's className
    - Add `[&_pre]:overflow-x-auto` to enable horizontal scrollbar on Shiki-generated `<pre>` elements when content overflows
    - Add `[&_pre]:max-w-full` to constrain `<pre>` element width to container
    - Change className from:
      `"shiki-wrapper min-w-0 max-w-full overflow-x-auto overflow-y-hidden p-3 text-[11px] font-mono leading-relaxed [&_pre]:!bg-transparent [&_code]:!bg-transparent"`
      to:
      `"shiki-wrapper min-w-0 max-w-full overflow-x-auto overflow-y-hidden p-3 text-[11px] font-mono leading-relaxed [&_pre]:!bg-transparent [&_pre]:overflow-x-auto [&_pre]:max-w-full [&_code]:!bg-transparent"`
    - _Bug_Condition: isBugCondition(input) where preElement.scrollWidth > containerWidth AND no horizontal scrollbar_
    - _Expected_Behavior: preElement constrained within container, horizontal scrollbar visible when content overflows_
    - _Preservation: Short code lines display normally without unnecessary scrollbars; format tabs, copy button, panel resize all unchanged_
    - _Requirements: 1.1, 1.2, 2.1, 2.2, 3.1, 3.2, 3.3, 3.4_

  - [x] 3.2 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - 长代码行水平滚动
    - **IMPORTANT**: Re-run the SAME test from task 1 - do NOT write a new test
    - The test from task 1 encodes the expected behavior (`.shiki-wrapper` className contains `[&_pre]:overflow-x-auto` and `[&_pre]:max-w-full`)
    - When this test passes, it confirms the expected behavior is satisfied
    - Run bug condition exploration test from step 1
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
    - _Requirements: 2.1, 2.2_

  - [x] 3.3 Verify preservation tests still pass
    - **Property 2: Preservation** - 短代码行与现有功能保持不变
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - Run preservation property tests from step 2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm all tests still pass after fix (no regressions)

- [x] 4. Checkpoint - Ensure all tests pass
  - Run full test suite: `npx vitest --run`
  - Ensure all tests pass, ask the user if questions arise.
