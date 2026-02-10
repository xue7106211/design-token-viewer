import { test, expect } from "@playwright/test";

test.describe("Design Token Viewer", () => {
  test("shows upload screen when no data loaded", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Design Token Viewer" })).toBeVisible();
    await expect(page.getByText(/拖拽 JSON 文件到此处/)).toBeVisible();
  });

  test("loads sample data and shows token viewer", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /加载示例数据/ }).click();
    await expect(page.getByText("HyperOS Token Lib")).toBeVisible({ timeout: 5000 });
  });
});
