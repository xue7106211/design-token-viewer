// 从 Playwright 测试框架引入 test（定义用例）和 expect（断言）
import { test, expect } from "@playwright/test";

// test.describe：把相关用例归为一组，第一个参数是分组名称（仅用于报告展示）
test.describe("Design Token Viewer", () => {
  // 用例 1：未加载任何数据时，应展示上传界面
  // 回调参数 { page } 是 Playwright 注入的页面对象，代表一个浏览器标签页
  test("shows upload screen when no data loaded", async ({ page }) => {
    // 打开首页（"/" 会基于 playwright.config.ts 的 baseURL 拼成完整 URL）
    await page.goto("/");
    // 断言：页面上存在角色为 heading、文本为 "Design Token Viewer" 的标题且可见
    await expect(page.getByRole("heading", { name: "Design Token Viewer" })).toBeVisible();
    // 断言：上传区域的提示文案可见（用正则匹配部分文本）
    await expect(page.getByText(/拖拽 JSON 文件到此处/)).toBeVisible();
  });

  // 用例 2：点击「加载示例数据」后，应进入 Token 查看器
  test("loads sample data and shows token viewer", async ({ page }) => {
    // 打开首页
    await page.goto("/");
    // 找到名称匹配 /加载示例数据/ 的按钮并点击（模拟真实用户点击）
    await page.getByRole("button", { name: /加载示例数据/ }).click();
    // 断言：5 秒内出现 "HyperOS Token Lib" 文本，说明已加载数据并进入查看器
    // timeout 给异步加载（解析 JSON、渲染）留出等待时间
    await expect(page.getByText("HyperOS Token Lib")).toBeVisible({ timeout: 5000 });
  });
});
