import { expect, test } from "@playwright/test";

test("桌面首屏保持一屏比例且人物随叙事场景连续切换", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");

  const character = page.getByTestId("persistent-character");
  await expect(character).toBeVisible();
  await expect(character).toHaveAttribute("data-scene", "hero");

  const heroMetrics = await page.evaluate(() => {
    const hero = document.querySelector<HTMLElement>(".hero-section");
    const stage = document.querySelector<HTMLElement>(
      '[data-testid="persistent-character"]',
    );
    const dock = document.querySelector<HTMLElement>(".practice-dock");
    const heroRect = hero?.getBoundingClientRect();
    const stageRect = stage?.getBoundingClientRect();
    const dockRect = dock?.getBoundingClientRect();
    return {
      heroHeight: heroRect?.height ?? 0,
      characterHeight: stageRect?.height ?? 0,
      dockBottom: dockRect?.bottom ?? Number.POSITIVE_INFINITY,
    };
  });

  expect(heroMetrics.heroHeight).toBeLessThanOrEqual(920);
  expect(heroMetrics.characterHeight).toBeGreaterThanOrEqual(540);
  expect(heroMetrics.characterHeight).toBeLessThanOrEqual(680);
  expect(heroMetrics.dockBottom).toBeLessThanOrEqual(900);

  await page.locator("#career").scrollIntoViewIfNeeded();
  await expect(character).toHaveAttribute("data-scene", "career");
  await expect(
    character.locator('[data-scene-layer="career"]'),
  ).toHaveAttribute("data-active", "true");

  await page.locator("#projects").scrollIntoViewIfNeeded();
  await expect(character).toHaveAttribute("data-scene", "projects");

  await page.locator("#lounge").scrollIntoViewIfNeeded();
  await expect(character).toHaveAttribute("data-scene", "lounge");
});

test("访客可以从首页沿职业路线进入项目并在会客厅提问", async ({
  page,
}) => {
  await page.goto("/");

  await expect(
    page.getByRole("button", { name: "返回Ricky 会客厅首页" }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "RICKY" })).toBeVisible();

  await page.getByRole("button", { name: "沿职业路线认识我" }).click();
  await expect(page.locator(".career-stage-card h3")).toHaveText("点融网");

  await page.getByRole("button", { name: "下一站：还呗 →" }).click();
  await expect(page.locator(".career-stage-card h3")).toHaveText("还呗");

  await page.locator("#projects").scrollIntoViewIfNeeded();
  await expect(page.locator(".project-solution h3")).toHaveText(
    "机构业务商业判断与产品落地",
  );

  await page.getByRole("button", { name: "进入 AI 会客厅" }).first().click();
  await expect(page.locator(".lounge-transition")).toHaveCount(0);
  await page
    .getByRole("button", {
      name: "你如何判断一个机构合作是否值得推进？",
    })
    .click();

  await expect(page.getByTestId("lounge-answer")).toBeVisible();
});

test("身份工牌可以打开身份卡", async ({ page }) => {
  await page.goto("/");

  await page
    .getByRole("button", { name: "打开 Ricky 数字身份卡" })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Ricky 数字身份卡" }),
  ).toBeVisible();
});
