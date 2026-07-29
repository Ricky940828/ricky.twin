import { expect, test } from "@playwright/test";

test("减少动态效果时使用静态人物图且核心操作仍可用", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect
    .poll(() =>
      page.evaluate(() =>
        window.matchMedia("(prefers-reduced-motion: reduce)").matches,
      ),
    )
    .toBe(true);

  await expect(
    page.locator(
      'img.character-media[alt="Ricky 数字分身首页形象"]',
    ),
  ).toBeVisible();
  await expect(page.getByTestId("character-video")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "沿职业路线认识我" }),
  ).toBeEnabled();
  await expect(
    page.getByRole("button", { name: "进入 AI 会客厅" }).first(),
  ).toBeEnabled();

  await page.getByRole("button", { name: "沿职业路线认识我" }).click();
  await expect(page.locator("#career")).toBeInViewport();
});
