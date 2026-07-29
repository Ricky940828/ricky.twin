import { describe, expect, it } from "vitest";

import { chunkMarkdown } from "./markdown-chunker";

describe("chunkMarkdown", () => {
  it("preserves heading paths and respects the bounded context size", () => {
    const markdown = `# 机构业务方法

## 准入判断

先识别合作主体、资产来源、历史表现和治理成熟度，再判断材料缺口属于信息问题还是能力问题。

## 交易结构

将风险责任、收益分配、资金路径、增信安排和贷后处置放在同一张结构图中判断。

### 盈利测算

测算不只记录数字，还要保留收入项、成本项、风险项、资金占用和口径之间的计算关系。`;

    const chunks = chunkMarkdown(markdown, { maxChars: 110 });

    expect(chunks.length).toBeGreaterThan(2);
    expect(chunks.every((chunk) => chunk.content.length <= 110)).toBe(
      true,
    );
    expect(chunks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          headingPath: ["机构业务方法", "交易结构", "盈利测算"],
        }),
      ]),
    );
  });

  it("splits very long paragraphs without losing their order", () => {
    const paragraph =
      "盈利测算必须同时保留业务假设、计算公式、口径定义和敏感性边界。".repeat(
        12,
      );
    const chunks = chunkMarkdown(`# 盈利测算\n\n${paragraph}`, {
      maxChars: 90,
    });

    expect(chunks.length).toBeGreaterThan(2);
    expect(chunks.map((chunk) => chunk.content).join("")).toBe(
      paragraph,
    );
    expect(chunks.map((chunk) => chunk.order)).toEqual(
      chunks.map((_, index) => index),
    );
  });
});
