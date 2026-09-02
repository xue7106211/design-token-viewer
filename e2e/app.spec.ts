import { test, expect } from "@playwright/test";

test.describe("Design Token Viewer", () => {
  test("loads the default HyperOS 4 token document", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("button", { name: "HyperOS 4" })).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole("button", { name: "Semantic Token" })).toBeVisible();

    await page.getByRole("button", { name: "导出" }).click();
    const source = page.getByRole("button", { name: "选择导出来源" });
    const currentCount = await page.getByTestId("export-token-count").textContent();
    await source.click();
    await page.getByRole("menuitemradio", { name: "全部 Token 表" }).click();
    await expect(source).toHaveText("全部 Token 表");
    await expect(page.getByTestId("export-token-count")).not.toHaveText(currentCount ?? "");
  });
});
