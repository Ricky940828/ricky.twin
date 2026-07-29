import { expect, test } from "@playwright/test";

test.use({ viewport: { width: 390, height: 844 } });

test("移动端保持单列叙事、横向实践入口和可用的会客厅输入框", async ({
  page,
}) => {
  await page.goto("/");

  await expect(page.locator(".career-route__mobile-nodes")).toBeVisible();

  const mobileStageLabels = await page
    .locator(".career-route__mobile-nodes button")
    .allTextContents();
  expect(mobileStageLabels.join("|")).toContain("点融网");
  expect(mobileStageLabels.join("|")).toContain("还呗");
  expect(mobileStageLabels.join("|")).toContain("小象优品");
  expect(mobileStageLabels.join("|")).toContain("海尔消费金融");

  await page.locator("#projects").scrollIntoViewIfNeeded();
  await expect(page.locator(".card-swap")).toBeVisible();
  await expect(page.locator(".project-solution")).toBeVisible();

  await page.locator(".practice-dock").scrollIntoViewIfNeeded();
  await expect(page.locator(".practice-dock__items")).toHaveCSS(
    "overflow-x",
    "auto",
  );

  await page.locator("#lounge").scrollIntoViewIfNeeded();
  await expect(page.locator(".lounge-input")).toBeVisible();
  await expect(
    page.getByPlaceholder("输入你想了解的问题…"),
  ).toBeEditable();

  const viewport = await page.evaluate(() => ({
    innerWidth: window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(viewport.scrollWidth).toBeLessThanOrEqual(viewport.innerWidth);
});
