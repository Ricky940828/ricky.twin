import { describe, expect, it } from "vitest";

import { siteContent } from "./site-content";

describe("siteContent", () => {
  it("keeps the approved public identity and hero copy", () => {
    expect(siteContent.brand.name).toBe("Ricky 会客厅");
    expect(siteContent.hero.welcome).toBe(
      "这里是 Ricky 的 AI 会客厅，我是 Ricky 的数字分身。您可以在这里了解我的职业路径与项目经验，也可以进入 AI 会客厅与我对话，继续了解更多哦～",
    );
    expect(siteContent.hero.tags).toEqual([
      "金融产品经理",
      "AI 应用实战者",
      "人工智能训练师（三级）",
      "企业知识库落地咨询",
    ]);
  });

  it("keeps the approved career route and capability axes", () => {
    expect(siteContent.career.map((stage) => stage.publicBrand)).toEqual([
      "点融网",
      "还呗",
      "小象优品",
      "海尔消费金融",
    ]);
    expect(siteContent.capabilityAxes).toEqual([
      "机构与资产评估",
      "交易结构设计与盈利模型测算",
      "金融产品方案设计与跨部门协同",
      "业务规则系统化与 PRD 落地",
      "项目上线运营与数据经营分析",
      "标准化沉淀与 AI 赋能",
    ]);
  });

  it("defines progressively broader six-axis career radar coverage", () => {
    expect(siteContent.capabilityAxes).toHaveLength(6);

    siteContent.career.forEach((stage) => {
      expect(stage.radar).toHaveLength(6);
      stage.radar.forEach((value) => {
        expect(value).toBeGreaterThanOrEqual(1);
        expect(value).toBeLessThanOrEqual(4);
      });
    });

    const totals = siteContent.career.map((stage) =>
      stage.radar.reduce((total, value) => total + value, 0),
    );
    expect(totals).toEqual([...totals].sort((a, b) => a - b));
    expect(new Set(totals).size).toBe(totals.length);
  });

  it("defines the four approved project themes and solution path", () => {
    expect(siteContent.projects.map((project) => project.title)).toEqual([
      "机构业务商业判断与产品落地",
      "资产资金标准化",
      "自营 H5 信贷产品落地",
      "AI 知识资产化与 FDE 实践",
    ]);

    siteContent.projects.forEach((project) => {
      expect(project.solutionPath.map((step) => step.label)).toEqual([
        "业务问题",
        "核心判断",
        "解决路径",
        "抽象成果",
      ]);
    });
  });

  it("uses unique enabled section ids and safe public wording", () => {
    const enabledIds = siteContent.sections
      .filter((section) => section.enabled)
      .map((section) => section.id);

    expect(new Set(enabledIds).size).toBe(enabledIds.length);
    expect(JSON.stringify(siteContent)).not.toMatch(/即科|源石云/);
  });
});
