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

test("首页 Text Pressure 使用本地可变字体并形成极窄到极宽的压力差", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await page.evaluate(() => document.fonts.ready);

  const title = page.getByRole("heading", { name: "RICKY" });
  const letters = title.locator("[data-pressure-letter]");
  const centerLetter = await letters.nth(2).boundingBox();
  expect(centerLetter).not.toBeNull();

  await page.mouse.move(
    centerLetter!.x + centerLetter!.width / 2,
    centerLetter!.y + centerLetter!.height / 2,
  );
  await page.waitForTimeout(520);

  const pressure = await letters.evaluateAll((nodes) =>
    nodes.map((node) => {
      const element = node as HTMLElement;
      const settings = element.style.fontVariationSettings;
      const weight = Number(
        settings.match(/"wght"\s+(\d+)/)?.[1] ?? 0,
      );
      const width = Number(
        settings.match(/"wdth"\s+(\d+)/)?.[1] ?? 0,
      );
      return {
        family: getComputedStyle(element).fontFamily,
        hot: element.dataset.hot,
        weight,
        width,
      };
    }),
  );

  expect(pressure[2].family).toContain("Roboto Flex Variable");
  expect(pressure[2].hot).toBe("true");
  expect(pressure[2].weight).toBeGreaterThanOrEqual(820);
  expect(pressure[2].width).toBeGreaterThanOrEqual(130);
  expect(Math.min(pressure[0].width, pressure[4].width)).toBeLessThan(
    100,
  );
  expect(Math.min(pressure[0].weight, pressure[4].weight)).toBeLessThan(
    600,
  );
});

test("职业路线的滚动与节点点击共同驱动人物且人物和经历卡同屏", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");

  const character = page.getByTestId("persistent-character");
  const experience = page.locator(".career-experience");
  await experience.scrollIntoViewIfNeeded();
  await expect(character).toHaveAttribute("data-scene", "career");

  const initialCharacter = await character.boundingBox();
  await page.mouse.wheel(0, 980);
  await page.waitForTimeout(450);
  const movedCharacter = await character.boundingBox();

  expect(initialCharacter).not.toBeNull();
  expect(movedCharacter).not.toBeNull();
  expect(
    Math.hypot(
      movedCharacter!.x - initialCharacter!.x,
      movedCharacter!.y - initialCharacter!.y,
    ),
  ).toBeGreaterThan(80);

  const card = await page.locator(".career-stage-card").boundingBox();
  expect(card).not.toBeNull();
  expect(card!.y).toBeGreaterThanOrEqual(0);
  expect(card!.y + card!.height).toBeLessThanOrEqual(900);
  expect(movedCharacter!.y).toBeGreaterThanOrEqual(-10);
  expect(movedCharacter!.y + movedCharacter!.height).toBeLessThanOrEqual(
    910,
  );

  const beforeNodeClick = movedCharacter!;
  await page
    .getByRole("button", { name: "查看小象优品阶段" })
    .click();
  await expect(page.locator(".career-stage-card h3")).toHaveText("小象优品");
  await page.waitForTimeout(950);
  const afterNodeClick = await character.boundingBox();
  expect(afterNodeClick).not.toBeNull();
  expect(
    Math.hypot(
      afterNodeClick!.x - beforeNodeClick.x,
      afterNodeClick!.y - beforeNodeClick.y,
    ),
  ).toBeGreaterThan(80);

  const radarPanel = await page.locator(".career-radar-panel").boundingBox();
  const radarChart = await page
    .locator(".capability-radar__visual svg")
    .boundingBox();
  const radarAxes = await page
    .locator(".capability-radar__axes")
    .boundingBox();
  expect(radarPanel).not.toBeNull();
  expect(radarChart).not.toBeNull();
  expect(radarAxes).not.toBeNull();
  expect(radarAxes!.x).toBeGreaterThanOrEqual(radarPanel!.x);
  expect(radarAxes!.x + radarAxes!.width).toBeLessThanOrEqual(
    radarPanel!.x + radarPanel!.width,
  );
  expect(radarAxes!.y).toBeGreaterThanOrEqual(
    radarChart!.y + radarChart!.height - 2,
  );
});

test("项目区由向下滚动逐卡切换并在末卡后自然释放页面", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");

  await page.locator("#projects").scrollIntoViewIfNeeded();
  await page.waitForTimeout(420);
  await page.evaluate(() => {
    const stage = document.querySelector<HTMLElement>(".projects-stage");
    if (!stage) {
      throw new Error("projects stage missing");
    }
    const pinSpacer =
      stage.parentElement?.classList.contains("pin-spacer")
        ? stage.parentElement
        : stage;
    document.documentElement.style.scrollBehavior = "auto";
    window.scrollTo(
      0,
      pinSpacer.getBoundingClientRect().top + window.scrollY - 84,
    );
  });
  await page.waitForTimeout(120);
  await page.waitForTimeout(320);

  const solutionTitle = page.locator(".project-solution h3");
  await expect(solutionTitle).toHaveText(
    "机构业务商业判断与产品落地",
  );

  const stageBox = await page.locator(".projects-stage").boundingBox();
  expect(stageBox).not.toBeNull();
  await page.mouse.move(
    stageBox!.x + stageBox!.width / 2,
    stageBox!.y + stageBox!.height / 2,
  );

  await page.mouse.wheel(0, 620);
  await expect(solutionTitle).toHaveText("资产资金标准化");
  await page.mouse.wheel(0, 620);
  await expect(solutionTitle).toHaveText("自营 H5 信贷产品落地");
  await page.mouse.wheel(0, 620);
  await expect(solutionTitle).toHaveText("AI 知识资产化与 FDE 实践");

  await page.mouse.wheel(0, 620);
  await page.waitForTimeout(320);
  const releasedStage = await page.locator(".projects-stage").boundingBox();
  expect(releasedStage).not.toBeNull();
  expect(releasedStage!.y).toBeLessThan(0);
});
