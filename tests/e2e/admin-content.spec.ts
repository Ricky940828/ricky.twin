import { expect, test } from "@playwright/test";

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
  await page.getByLabel("管理员密码").fill("test-admin");
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
