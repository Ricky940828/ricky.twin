import { expect, test } from "@playwright/test";

test("知识库、Agent、前台会客厅和运行记录形成完整闭环", async ({
  context,
  page,
}) => {
  const knowledgeName = "E2E 公开能力知识";
  const visitorName = "E2E 合作访客";
  const publicPage = await context.newPage();

  await page.goto("/admin");
  await page.getByLabel("管理员密码").fill("test-admin");
  await page.getByRole("button", { name: "登录后台" }).click();

  await page.getByRole("button", { name: "知识库", exact: true }).click();
  await expect(page.getByRole("heading", { name: "新建知识库" })).toBeVisible();
  await page.getByLabel("知识库名称").fill(knowledgeName);
  await page
    .getByLabel("知识库说明")
    .fill("用于验证知识上传、前台权限信号和 Agent 关联。");
  await page.getByRole("button", { name: "创建知识库" }).click();
  await expect(page.getByText("知识库已创建")).toBeVisible();

  await page.getByLabel("上传 Markdown").setInputFiles({
    name: "e2e-knowledge.md",
    mimeType: "text/markdown",
    buffer: Buffer.from(
      [
        "# 机构合作判断",
        "",
        "先判断合作主体、资产质量、风险收益结构和产品落地约束。",
        "",
        "## 执行顺序",
        "",
        "从材料缺口识别开始，再完成交易结构、盈利测算、产品方案和持续经营检查。",
      ].join("\n"),
    ),
  });
  await expect(
    page.getByText("e2e-knowledge.md 已上传并完成索引"),
  ).toBeVisible();
  await expect(page.getByText("e2e-knowledge.md", { exact: true })).toBeVisible();

  await publicPage.goto("/");
  await expect(publicPage.getByText(knowledgeName)).toBeVisible();

  await page.getByRole("button", { name: "Agent 管理" }).click();
  const knowledgeLink = page.getByRole("checkbox", {
    name: knowledgeName,
  });
  await expect(knowledgeLink).toBeVisible();
  if (!(await knowledgeLink.isChecked())) {
    await knowledgeLink.check();
  }
  await page
    .getByRole("button", { name: "保存 Agent 草稿" })
    .click();
  await expect(page.getByText("Agent 草稿已保存")).toBeVisible();
  await page.getByRole("button", { name: "发布 Agent 配置" }).click();
  await expect(page.getByText("Agent 配置已发布")).toBeVisible();

  await page.getByRole("button", { name: "运行标准测试" }).click();
  await expect(page.getByText("透明演示", { exact: true })).toBeVisible();
  await expect(
    page.getByText(/尚未连接可用模型/),
  ).toBeVisible();

  await publicPage
    .getByRole("button", {
      name: "你如何判断一个机构合作是否值得推进？",
    })
    .click();
  await expect(publicPage.getByTestId("lounge-answer")).toContainText(
    "尚未连接可用模型",
  );

  await publicPage
    .getByRole("button", { name: "留下联系方式进一步沟通" })
    .click();
  await publicPage.getByLabel("怎么称呼").fill(visitorName);
  await publicPage
    .getByRole("textbox", { name: "联系方式", exact: true })
    .fill("e2e@example.com");
  await publicPage
    .getByLabel("沟通方向")
    .fill("希望进一步交流企业知识库与 AI 产品落地。");
  await publicPage
    .getByLabel("同意仅将上述信息用于本次进一步沟通")
    .check();
  await publicPage
    .getByRole("button", { name: "提交沟通意向" })
    .click();
  await expect(publicPage.getByText("沟通意向已提交")).toBeVisible();

  await page.getByRole("button", { name: "访客与运行" }).click();
  await expect(page.getByText(visitorName, { exact: true })).toBeVisible();
  await expect(page.getByText(/你如何判断一个机构合作是否值得推进/)).toBeVisible();

  await publicPage.close();
});
