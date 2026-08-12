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

test("自然滚动进入职业路线时人物在 0.3 秒内快速滑动且不被路径进度抢占", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  const character = page.getByTestId("persistent-character");
  await expect(character).toHaveAttribute("data-scene", "hero");
  await expect
    .poll(() =>
      character.evaluate((element) => getComputedStyle(element).transform),
    )
    .not.toBe("none");

  const movement = await page.evaluate(async () => {
    const character = document.querySelector<HTMLElement>(
      '[data-testid="persistent-character"]',
    );
    const career = document.getElementById("career");
    if (!character || !career) {
      return null;
    }

    const readPosition = () => {
      const bounds = character.getBoundingClientRect();
      return { x: bounds.x, y: bounds.y, width: bounds.width };
    };
    const start = readPosition();
    const targetScroll =
      career.getBoundingClientRect().top +
      window.scrollY -
      window.innerHeight * 0.27;
    const startedAt = performance.now();
    const samples: Array<{
      elapsed: number;
      x: number;
      y: number;
      width: number;
    }> = [];

    window.scrollTo({ top: targetScroll, behavior: "instant" });
    await new Promise<void>((resolve) => {
      const sample = () => {
        const position = readPosition();
        const elapsed = performance.now() - startedAt;
        samples.push({ elapsed, ...position });
        if (elapsed >= 1350) {
          resolve();
          return;
        }
        window.requestAnimationFrame(sample);
      };
      window.requestAnimationFrame(sample);
    });

    return {
      start,
      samples,
      scene: character.dataset.scene,
    };
  });

  expect(movement).not.toBeNull();
  expect(movement!.scene).toBe("career");
  const final = movement!.samples.at(-1)!;
  const early = movement!.samples.reduce((nearest, sample) =>
    Math.abs(sample.elapsed - 220) < Math.abs(nearest.elapsed - 220)
      ? sample
      : nearest,
  );
  const settled = movement!.samples.reduce((nearest, sample) =>
    Math.abs(sample.elapsed - 420) < Math.abs(nearest.elapsed - 420)
      ? sample
      : nearest,
  );
  const distance = (
    from: { x: number; y: number; width: number },
    to: { x: number; y: number; width: number },
  ) => Math.hypot(to.x - from.x, to.y - from.y, to.width - from.width);
  const totalDistance = distance(movement!.start, final);
  const earlyProgress = distance(movement!.start, early) / totalDistance;
  const settledRemaining = distance(settled, final) / totalDistance;

  expect(totalDistance).toBeGreaterThan(300);
  expect(earlyProgress).toBeGreaterThan(0.55);
  expect(earlyProgress).toBeLessThan(0.98);
  expect(settledRemaining).toBeLessThan(0.08);
  expect(distance(movement!.start, final)).toBeGreaterThan(
    distance(movement!.start, early),
  );
});

test("人物只合成当前场景视频以避免透明素材串帧", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");

  const character = page.getByTestId("persistent-character");
  await expect(character.locator("video")).toHaveCount(1);
  await expect(character.locator('video[data-scene="hero"]')).toHaveCount(1);

  await page
    .getByRole("button", { name: "AI 会客厅", exact: true })
    .click();
  await expect(character).toHaveAttribute("data-scene", "lounge");
  await expect(character.locator("video")).toHaveCount(1);
  await expect(character.locator('video[data-scene="lounge"]')).toHaveCount(1);
});

test("进入职业路线后人物脚底精确落在曲线起点", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");

  const character = page.getByTestId("persistent-character");
  await page.locator(".career-experience").scrollIntoViewIfNeeded();
  await expect(character).toHaveAttribute("data-scene", "career");
  await page.waitForTimeout(1_300);

  const anchorDistances = await page.evaluate(() => {
    const characterElement = document.querySelector<HTMLElement>(
      '[data-testid="persistent-character"]',
    );
    const routePath = document.querySelector<SVGPathElement>(
      '[data-career-path="true"]',
    );
    const matrix = routePath?.getScreenCTM();
    const point = routePath?.getPointAtLength(0);
    const firstNode = document.querySelector<HTMLElement>(
      ".career-route__node i",
    );
    if (!characterElement || !matrix || !point || !firstNode) {
      return {
        path: Number.POSITIVE_INFINITY,
        visibleNode: Number.POSITIVE_INFINITY,
      };
    }

    const characterBounds = characterElement.getBoundingClientRect();
    const firstNodeBounds = firstNode.getBoundingClientRect();
    const pathStart = {
      x: matrix.a * point.x + matrix.c * point.y + matrix.e,
      y: matrix.b * point.x + matrix.d * point.y + matrix.f,
    };
    const characterFoot = {
      x: characterBounds.x + characterBounds.width * 0.5,
      y: characterBounds.y + characterBounds.height * 0.92,
    };
    const visibleNode = {
      x: firstNodeBounds.x + firstNodeBounds.width * 0.5,
      y: firstNodeBounds.y + firstNodeBounds.height * 0.5,
    };

    return {
      path: Math.hypot(
        characterFoot.x - pathStart.x,
        characterFoot.y - pathStart.y,
      ),
      visibleNode: Math.hypot(
        characterFoot.x - visibleNode.x,
        characterFoot.y - visibleNode.y,
      ),
    };
  });

  expect(anchorDistances.path).toBeLessThanOrEqual(6);
  expect(anchorDistances.visibleNode).toBeLessThanOrEqual(6);
});

test("职业路线固定前滚动时人物持续跟随曲线起点", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");

  const character = page.getByTestId("persistent-character");
  const pinStart = await page.locator(".career-experience").evaluate((element) =>
    element.getBoundingClientRect().top + window.scrollY - 84,
  );
  await page.evaluate((top) => window.scrollTo(0, top - 240), pinStart);
  await expect(character).toHaveAttribute("data-scene", "career");
  await page.waitForTimeout(1_250);

  await page.evaluate(() => window.scrollBy(0, 140));
  await page.waitForTimeout(650);

  const anchorDistance = await page.evaluate(() => {
    const characterElement = document.querySelector<HTMLElement>(
      '[data-testid="persistent-character"]',
    );
    const routePath = document.querySelector<SVGPathElement>(
      '[data-career-path="true"]',
    );
    const matrix = routePath?.getScreenCTM();
    const point = routePath?.getPointAtLength(0);
    if (!characterElement || !matrix || !point) {
      return Number.POSITIVE_INFINITY;
    }

    const characterBounds = characterElement.getBoundingClientRect();
    const pathStart = {
      x: matrix.a * point.x + matrix.c * point.y + matrix.e,
      y: matrix.b * point.x + matrix.d * point.y + matrix.f,
    };
    const characterFoot = {
      x: characterBounds.x + characterBounds.width * 0.5,
      y: characterBounds.y + characterBounds.height * 0.92,
    };

    return Math.hypot(
      characterFoot.x - pathStart.x,
      characterFoot.y - pathStart.y,
    );
  });

  expect(anchorDistance).toBeLessThanOrEqual(8);
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

  await page.getByRole("button", { name: "项目与能力" }).click();
  await expect(page.locator("#projects")).toBeInViewport();
  await expect(page.locator(".project-capability-map h3")).toHaveText(
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

test("主导航随真实可见板块联动高亮", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");

  for (const label of ["职业路线", "项目与能力", "实践现场"] as const) {
    const navigation = page.getByRole("button", {
      name: label,
      exact: true,
    });
    await navigation.click();
    await expect(navigation).toHaveAttribute("aria-current", "location");
  }

  const loungeNavigation = page.getByRole("button", {
    name: "AI 会客厅",
    exact: true,
  });
  await loungeNavigation.click();
  await expect(loungeNavigation).toHaveAttribute(
    "aria-current",
    "location",
  );
});

test("主导航从首页直达会客厅时不串行播放中间场景", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await page.evaluate(() => {
    const character = document.querySelector<HTMLElement>(
      '[data-testid="persistent-character"]',
    );
    const history: string[] = [];
    if (character) {
      new MutationObserver(() => {
        history.push(character.dataset.scene ?? "");
      }).observe(character, {
        attributeFilter: ["data-scene"],
        attributes: true,
      });
    }
    (window as typeof window & { __directSceneHistory?: string[] })
      .__directSceneHistory = history;
  });

  await page
    .getByRole("button", { name: "AI 会客厅", exact: true })
    .click();

  await expect(page.locator("#lounge")).toBeInViewport();
  await expect(page.getByTestId("persistent-character")).toHaveAttribute(
    "data-scene",
    "lounge",
  );
  await expect(page.locator(".lounge-transition")).toHaveCount(0);
  const history = await page.evaluate(
    () =>
      (window as typeof window & { __directSceneHistory?: string[] })
        .__directSceneHistory ?? [],
  );
  expect(history).not.toContain("career");
  expect(history).not.toContain("projects");
});

test("会客厅多知识库标签默认紧凑叠放并在悬停时完整展开", async ({
  page,
}) => {
  const knowledge = Array.from({ length: 5 }, (_, index) => ({
    id: `visual-kb-${index + 1}`,
    name: `知识库标签 ${index + 1}`,
    description: "用于验证会客厅知识范围的紧凑展示",
    access: index % 2 === 0 ? "public" : "request",
    accessLabel: index % 2 === 0 ? "公开" : "需申请访问权限",
    ragEnabled: true,
  }));
  await page.route("**/api/knowledge-status", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ ok: true, configured: true, knowledge }),
    });
  });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");

  const grid = page.getByLabel("当前可展示的知识库");
  await expect(grid).toHaveClass(/is-stacked/);
  const cards = grid.locator(".knowledge-status");
  await expect(cards).toHaveCount(5);

  const collapsed = await cards.evaluateAll((nodes) => {
    const first = nodes[0] as HTMLElement;
    const second = nodes[1] as HTMLElement;
    const firstBox = first.getBoundingClientRect();
    const secondBox = second.getBoundingClientRect();
    return {
      step: secondBox.left - firstBox.left,
      width: firstBox.width,
      titleSize: Number.parseFloat(
        getComputedStyle(first.querySelector("strong")!).fontSize,
      ),
    };
  });
  expect(collapsed.step).toBeLessThan(collapsed.width * 0.35);
  expect(collapsed.titleSize).toBeLessThanOrEqual(10.5);

  await grid.hover();
  await page.waitForTimeout(480);
  const expandedStep = await cards.evaluateAll((nodes) => {
    const first = (nodes[0] as HTMLElement).getBoundingClientRect();
    const second = (nodes[1] as HTMLElement).getBoundingClientRect();
    return second.left - first.left;
  });
  expect(expandedStep).toBeGreaterThan(collapsed.step * 3);
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
    .getByRole("button", {
      name: "查看小象优品阶段",
      exact: true,
    })
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
    .locator(".capability-radar__chart")
    .boundingBox();
  const radarAxes = page.locator(".capability-radar__axis-label");
  expect(radarPanel).not.toBeNull();
  expect(radarChart).not.toBeNull();
  await expect(radarAxes).toHaveCount(6);
  for (let index = 0; index < 6; index += 1) {
    const axisBox = await radarAxes.nth(index).boundingBox();
    expect(axisBox).not.toBeNull();
    expect(axisBox!.x).toBeGreaterThanOrEqual(radarPanel!.x - 1);
    expect(axisBox!.x + axisBox!.width).toBeLessThanOrEqual(
      radarPanel!.x + radarPanel!.width + 1,
    );
  }
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

  const capabilityTitle = page.locator(".project-capability-map h3");
  await expect(capabilityTitle).toHaveText(
    "机构业务商业判断与产品落地",
  );

  const stageBox = await page.locator(".projects-stage").boundingBox();
  expect(stageBox).not.toBeNull();
  await page.mouse.move(
    stageBox!.x + stageBox!.width / 2,
    stageBox!.y + stageBox!.height / 2,
  );

  await page.mouse.wheel(0, 620);
  await expect(capabilityTitle).toHaveText("资产资金标准化");
  await page.mouse.wheel(0, 620);
  await expect(capabilityTitle).toHaveText("自营 H5 信贷产品落地");
  await page.mouse.wheel(0, 620);
  await expect(capabilityTitle).toHaveText("AI 知识资产化与 FDE 实践");

  await page.mouse.wheel(0, 620);
  await page.waitForTimeout(320);
  const releasedStage = await page.locator(".projects-stage").boundingBox();
  expect(releasedStage).not.toBeNull();
  expect(releasedStage!.y).toBeLessThan(0);
});

test("项目卡片内的详情按钮可以用真实指针点击打开弹窗", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await page
    .getByRole("button", { name: "项目与能力", exact: true })
    .click();

  const detailButton = page.getByRole("button", {
    name: "查看项目完整说明",
    exact: true,
  });
  await expect(detailButton).toBeVisible();
  await detailButton.click();

  await expect(page.locator(".project-dialog-overlay")).toBeVisible();
  await expect(page.locator(".project-dialog")).toBeVisible();
  await page.getByRole("button", { name: "关闭项目详情" }).click();

  const activeTitle = page.locator(
    '.project-card[data-active="true"] h3',
  );
  const beforeDragTitle = await activeTitle.innerText();
  const stackBox = await page.locator(".card-swap").boundingBox();
  expect(stackBox).not.toBeNull();
  await page.mouse.move(
    stackBox!.x + stackBox!.width * 0.58,
    stackBox!.y + stackBox!.height * 0.48,
  );
  await page.mouse.down();
  await page.mouse.move(
    stackBox!.x + stackBox!.width * 0.3,
    stackBox!.y + stackBox!.height * 0.48,
    { steps: 8 },
  );
  await page.mouse.up();

  await expect.poll(() => activeTitle.innerText()).not.toBe(beforeDragTitle);
  await detailButton.click();
  await expect(page.locator(".project-dialog-overlay")).toBeVisible();
});
