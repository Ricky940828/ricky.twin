import { expect, test } from "@playwright/test";

const adminPassword =
  process.env.PLAYWRIGHT_ADMIN_PASSWORD ?? "test-admin";

test("身份名片拥有独立配置入口并可实时预览正反面", async ({
  page,
}) => {
  await page.goto("/admin");
  await page.getByLabel("管理员密码").fill(adminPassword);
  await page.getByRole("button", { name: "登录后台" }).click();

  await page
    .getByRole("button", { name: "身份名片", exact: true })
    .click();

  const preview = page.frameLocator('iframe[title="前台实时预览"]');
  const previewCard = preview.getByRole("dialog", {
    name: "Ricky 数字身份卡",
  });
  await expect(previewCard).toBeVisible();
  await expect(preview.locator(".identity-card")).toHaveAttribute(
    "data-flipped",
    "false",
  );

  const configuredName = "李富豪 · Ricky · 实时预览";
  await page.getByLabel("对外姓名").fill(configuredName);
  await expect(preview.getByText(configuredName)).toBeVisible();

  await page
    .getByRole("button", { name: "知识与权限", exact: true })
    .click();
  await expect(preview.locator(".identity-card")).toHaveAttribute(
    "data-flipped",
    "true",
  );
  await expect(preview.getByText("知识与访问权限")).toBeVisible();
});

test("后台编辑、同源预览、保存与发布形成完整闭环", async ({
  context,
  page,
}) => {
  const previewSideEffects: string[] = [];
  page.on("request", (request) => {
    if (/\/api\/(analytics|visits?|chat|leads)/.test(request.url())) {
      previewSideEffects.push(request.url());
    }
  });

  await page.goto("/admin");
  await page.getByLabel("管理员密码").fill(adminPassword);
  await page.getByRole("button", { name: "登录后台" }).click();

  const statement = page.getByLabel("首页主张");
  const originalStatement = await statement.inputValue();
  const testStatement =
    "E2E 实时预览：把金融产品经验变成可验证、可调用的职业能力。";
  const publicPage = await context.newPage();

  try {
    await statement.fill(testStatement);
    await expect(page.getByRole("status")).toHaveText("未保存");
    await expect(
      page.getByRole("button", { name: "发布到正式站" }),
    ).toBeDisabled();

    const preview = page.frameLocator(
      'iframe[title="前台实时预览"]',
    );
    await expect(preview.getByText(testStatement)).toBeVisible();
    await expect(preview.getByText("草稿预览")).toBeVisible();

    await page.getByRole("button", { name: "移动端" }).click();
    await expect(
      page.locator('iframe[title="前台实时预览"]'),
    ).toHaveAttribute("width", "390");

    const previewFrame = page
      .frames()
      .find((frame) => frame.url().includes("/admin/preview"));
    expect(previewFrame).toBeDefined();
    const previewUrl = previewFrame!.url();
    await preview
      .getByRole("link", {
        name: /打开 AI Token 中转站，在新标签页打开/,
      })
      .click();
    await expect.poll(() => previewFrame!.url()).toBe(previewUrl);
    expect(previewSideEffects).toEqual([]);

    await page.getByRole("button", { name: "保存草稿" }).click();
    await expect(page.getByRole("status")).toHaveText("已保存");

    await publicPage.goto("/");
    await expect(publicPage.getByText(testStatement)).toHaveCount(0);

    await page
      .getByRole("button", { name: "发布到正式站" })
      .click();
    const confirm = page.getByRole("button", { name: "确认发布" });
    await expect(confirm).toBeDisabled();
    await page
      .getByLabel("发布说明")
      .fill("端到端验证前台内容发布闭环");
    await confirm.click();
    await expect(
      page.getByRole("dialog", { name: "发布正式版本" }),
    ).toHaveCount(0);

    await publicPage.reload();
    await expect(publicPage.getByText(testStatement)).toBeVisible();
  } finally {
    await statement.fill(originalStatement);
    await page.getByRole("button", { name: "保存草稿" }).click();
    await expect(page.getByRole("status")).toHaveText("已保存");
    await page
      .getByRole("button", { name: "发布到正式站" })
      .click();
    await page.getByLabel("发布说明").fill("恢复端到端验收前内容");
    await page.getByRole("button", { name: "确认发布" }).click();
    await expect(
      page.getByRole("dialog", { name: "发布正式版本" }),
    ).toHaveCount(0);
    await publicPage.reload();
    await expect(publicPage.getByText(originalStatement)).toBeVisible();
    await publicPage.close();
  }
});

test("职业与项目增删改排序时实时预览保持单一完整页面", async ({
  page,
}) => {
  await page.goto("/admin");
  await page.getByLabel("管理员密码").fill(adminPassword);
  await page.getByRole("button", { name: "登录后台" }).click();

  const preview = page.frameLocator('iframe[title="前台实时预览"]');
  await page.getByRole("button", { name: "职业路线", exact: true }).click();
  const role = page.getByLabel("职位");
  const originalRole = await role.inputValue();
  const changedRole = `${originalRole} · E2E预览`;
  await role.fill(changedRole);
  await preview
    .getByRole("button", { name: "职业路线", exact: true })
    .click();
  await expect(preview.getByText(changedRole, { exact: true })).toBeVisible();
  await expect(preview.locator("#career")).toHaveCount(1);
  await expect(preview.getByTestId("site-renderer")).toBeVisible();

  const previewScrollBeforeAdd = await preview.locator("html").evaluate(
    () => window.scrollY,
  );
  await page.getByRole("button", { name: "新增阶段" }).click();
  await expect(preview.getByText("新职业阶段", { exact: true })).toBeVisible();
  await expect(preview.locator(".career-section__intro")).toBeInViewport();
  const previewScrollAfterAdd = await preview.locator("html").evaluate(
    () => window.scrollY,
  );
  expect(
    Math.abs(previewScrollAfterAdd - previewScrollBeforeAdd),
  ).toBeLessThanOrEqual(12);
  await page.getByRole("button", { name: "删除阶段" }).click();
  await expect(preview.getByText("新职业阶段", { exact: true })).toHaveCount(0);
  await expect(preview.locator("#career")).toHaveCount(1);

  await page
    .getByRole("button", { name: "项目与能力", exact: true })
    .click();
  await page.getByRole("button", { name: "后移" }).click();
  await expect(preview.locator("#projects")).toHaveCount(1);
  await expect(preview.locator(".projects-section")).toBeVisible();
  await expect(preview.locator(".project-card")).toHaveCount(4);

  await page.getByRole("button", { name: "新增项目" }).click();
  await expect(preview.getByText("01 / 05")).toHaveCount(2);
  await expect(preview.locator("#projects .projects-stage")).toHaveCount(1);
  await expect(preview.locator("#projects .pin-spacer")).toHaveCount(1);

  await page.getByRole("button", { name: "删除项目" }).click();
  await expect(preview.getByText("01 / 04")).toHaveCount(2);
  await expect(preview.locator("#projects .projects-stage")).toHaveCount(1);
  await expect(preview.locator("#projects .pin-spacer")).toHaveCount(1);
});
