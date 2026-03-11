import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { CodeOutput } from "./code-output";

// Mock useShikiHtml hook
vi.mock("@/lib/use-shiki", () => ({
  useShikiHtml: vi.fn(),
}));

// Mock token store
vi.mock("@/stores/token-store", () => ({
  useTokenStore: vi.fn(),
}));

const { useShikiHtml } = await import("@/lib/use-shiki");
const { useTokenStore } = await import("@/stores/token-store");

describe("CodeOutput - Bug Condition Exploration", () => {
  /**
   * **Validates: Requirements 1.1, 1.2, 2.1, 2.2**
   *
   * Property 1: Bug Condition - 长代码行溢出容器
   *
   * 当 Shiki 渲染的代码行较长时（如 Android XML 资源名称），
   * `.shiki-wrapper` 应包含 `[&_pre]:overflow-x-auto` 和 `[&_pre]:max-w-full`
   * 类选择器，确保 `<pre>` 元素内容被约束在容器内并可水平滚动。
   *
   * 在未修复的代码中，这些类选择器缺失，测试应当 FAIL。
   */

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock useTokenStore to return codeFormat and setCodeFormat
    (useTokenStore as ReturnType<typeof vi.fn>).mockImplementation(
      (selector: (s: Record<string, unknown>) => unknown) =>
        selector({
          codeFormat: "android",
          setCodeFormat: vi.fn(),
        })
    );
  });

  it("shiki-wrapper should have [&_pre]:overflow-x-auto class for long code lines", () => {
    // Mock useShikiHtml to return a long Android XML code line
    const longCodeHtml =
      '<pre class="shiki github-light github-dark" style="background-color:#fff;--shiki-dark-bg:#24292e;color:#24292e;--shiki-dark:#e1e4e8" tabindex="0"><code><span class="line"><span style="color:#1F2328">&lt;</span><span style="color:#1F6FEB">color</span> <span style="color:#0550AE">name</span>=<span style="color:#0A3069">"miuix_default_color_surface_container_light"</span><span style="color:#1F2328">&gt;</span>@color/ref_value<span style="color:#1F2328">&lt;/</span><span style="color:#1F6FEB">color</span><span style="color:#1F2328">&gt;</span></span></code></pre>';

    (useShikiHtml as ReturnType<typeof vi.fn>).mockReturnValue(longCodeHtml);

    const { container } = render(
      <CodeOutput code='<color name="miuix_default_color_surface_container_light">@color/ref_value</color>' />
    );

    const shikiWrapper = container.querySelector(".shiki-wrapper");
    expect(shikiWrapper).not.toBeNull();

    // Assert: `.shiki-wrapper` className 应包含 [&_pre]:overflow-x-auto
    expect(shikiWrapper!.className).toContain("[&_pre]:overflow-x-auto");
  });

  it("shiki-wrapper should have [&_pre]:min-w-0 class for long code lines", () => {
    // Mock useShikiHtml to return a long CSS custom property line
    const longCssHtml =
      '<pre class="shiki github-light github-dark" style="background-color:#fff;--shiki-dark-bg:#24292e;color:#24292e;--shiki-dark:#e1e4e8" tabindex="0"><code><span class="line"><span style="color:#0550AE">--miuix-default-color-surface-container-light</span>: <span style="color:#953800">oklch(0.95 0.01 250)</span>;</span></code></pre>';

    (useShikiHtml as ReturnType<typeof vi.fn>).mockReturnValue(longCssHtml);

    const { container } = render(
      <CodeOutput code="--miuix-default-color-surface-container-light: oklch(0.95 0.01 250);" />
    );

    const shikiWrapper = container.querySelector(".shiki-wrapper");
    expect(shikiWrapper).not.toBeNull();

    // Assert: `.shiki-wrapper` className 应包含 [&_pre]:min-w-0（约束 <pre> 元素宽度）
    expect(shikiWrapper!.className).toContain("[&_pre]:min-w-0");
  });
});


// --- Property-Based Testing: fast-check ---
import fc from "fast-check";

/**
 * Property 2: Preservation - 短代码行与现有功能保持不变
 *
 * **Validates: Requirements 3.1, 3.2, 3.3, 3.4**
 *
 * 这些测试验证在未修复代码上已有的正确行为，
 * 确保修复后这些行为不会被破坏（回归防护）。
 */
describe("CodeOutput - Preservation Property Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    (useTokenStore as ReturnType<typeof vi.fn>).mockImplementation(
      (selector: (s: Record<string, unknown>) => unknown) =>
        selector({
          codeFormat: "css",
          setCodeFormat: vi.fn(),
        })
    );
  });

  /**
   * **Validates: Requirements 3.1**
   *
   * Property: 对于任意短代码字符串 (length < 40)，CodeOutput 能正常渲染且包含代码文本。
   * `.shiki-wrapper` 包含 `overflow-x-auto` 和 `min-w-0` 类。
   */
  it("short code strings render without error and contain the code text", () => {
    // 生成短代码字符串的 arbitrary（模拟 CSS 自定义属性）
    const shortCodeArb = fc
      .string({ minLength: 1, maxLength: 39 })
      .filter((s) => s.trim().length > 0 && !s.includes("<") && !s.includes(">"));

    fc.assert(
      fc.property(shortCodeArb, (code) => {
        // Mock useShikiHtml 返回包含代码的 HTML
        const mockHtml = `<pre class="shiki"><code><span class="line"><span>${code}</span></span></code></pre>`;
        (useShikiHtml as ReturnType<typeof vi.fn>).mockReturnValue(mockHtml);

        const { container, unmount } = render(<CodeOutput code={code} />);

        // 组件应正常渲染
        const shikiWrapper = container.querySelector(".shiki-wrapper");
        expect(shikiWrapper).not.toBeNull();

        // shiki-wrapper 应包含 overflow-x-auto 和 min-w-0 类
        expect(shikiWrapper!.className).toContain("overflow-x-auto");
        expect(shikiWrapper!.className).toContain("min-w-0");

        // 渲染内容应包含代码文本
        expect(shikiWrapper!.textContent).toContain(code);

        unmount();
      }),
      { numRuns: 50 }
    );
  });

  /**
   * **Validates: Requirements 3.3**
   *
   * Property: CodeFormatTabs 始终渲染恰好 2 个格式按钮（Android 和 CSS）。
   */
  it("CodeFormatTabs always renders exactly 2 format buttons (Android, CSS)", () => {
    // 使用不同的 codeFormat 值测试
    const codeFormatArb = fc.constantFrom("android", "css");

    fc.assert(
      fc.property(codeFormatArb, (format) => {
        (useTokenStore as ReturnType<typeof vi.fn>).mockImplementation(
          (selector: (s: Record<string, unknown>) => unknown) =>
            selector({
              codeFormat: format,
              setCodeFormat: vi.fn(),
            })
        );

        const mockHtml = `<pre class="shiki"><code><span>test</span></code></pre>`;
        (useShikiHtml as ReturnType<typeof vi.fn>).mockReturnValue(mockHtml);

        const { container, unmount } = render(<CodeOutput code="test" />);

        // 查找格式切换按钮区域内的 button 元素
        const buttons = container.querySelectorAll(
          ".flex.items-center.gap-1 > button"
        );
        expect(buttons.length).toBe(2);

        // 验证按钮文本
        const buttonTexts = Array.from(buttons).map((b) => b.textContent);
        expect(buttonTexts).toContain("Android");
        expect(buttonTexts).toContain("CSS");

        unmount();
      }),
      { numRuns: 10 }
    );
  });

  /**
   * **Validates: Requirements 3.4**
   *
   * Property: 复制按钮始终存在且可点击。
   */
  it("copy button is always present and clickable", () => {
    const codeArb = fc.string({ minLength: 1, maxLength: 100 }).filter((s) => s.trim().length > 0);

    fc.assert(
      fc.property(codeArb, (code) => {
        const mockHtml = `<pre class="shiki"><code><span>${code}</span></code></pre>`;
        (useShikiHtml as ReturnType<typeof vi.fn>).mockReturnValue(mockHtml);

        const { container, unmount } = render(<CodeOutput code={code} />);

        // 复制按钮应存在（ghost variant, size icon, h-6 w-6）
        const copyButton = container.querySelector(
          'button.h-6.w-6'
        );
        expect(copyButton).not.toBeNull();

        // 按钮应该是可点击的（没有 disabled 属性）
        expect(copyButton!.hasAttribute("disabled")).toBe(false);

        unmount();
      }),
      { numRuns: 30 }
    );
  });

  /**
   * **Validates: Requirements 3.1**
   *
   * Property: 当 useShikiHtml 返回 null 时，fallback `<pre>` 元素
   * 渲染正确的类（overflow-x-auto, whitespace-pre-wrap, break-all）。
   */
  it("fallback <pre> renders with correct classes when useShikiHtml returns null", () => {
    const codeArb = fc.string({ minLength: 1, maxLength: 100 }).filter((s) => s.trim().length > 0);

    fc.assert(
      fc.property(codeArb, (code) => {
        // Mock useShikiHtml 返回 null，触发 fallback 渲染
        (useShikiHtml as ReturnType<typeof vi.fn>).mockReturnValue(null);

        const { container, unmount } = render(<CodeOutput code={code} />);

        // 不应有 shiki-wrapper
        const shikiWrapper = container.querySelector(".shiki-wrapper");
        expect(shikiWrapper).toBeNull();

        // 应有 fallback <pre> 元素
        const preElement = container.querySelector("pre");
        expect(preElement).not.toBeNull();

        // 验证 fallback <pre> 的关键类
        expect(preElement!.className).toContain("overflow-x-auto");
        expect(preElement!.className).toContain("whitespace-pre-wrap");
        expect(preElement!.className).toContain("break-all");

        // fallback 应包含代码文本
        const codeElement = preElement!.querySelector("code");
        expect(codeElement).not.toBeNull();
        expect(codeElement!.textContent).toBe(code);

        unmount();
      }),
      { numRuns: 50 }
    );
  });
});
