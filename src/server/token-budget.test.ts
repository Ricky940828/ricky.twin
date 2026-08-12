import { describe, expect, it } from "vitest";

import {
  estimateTextTokens,
  resolveContextTokenBudget,
  takeTextWithinTokenBudget,
} from "./token-budget";

describe("上下文 Token 预算", () => {
  it("全量模式使用扣除提示词、历史、问题、输出和安全余量后的全部空间", () => {
    expect(
      resolveContextTokenBudget({
        mode: "full",
        contextWindowTokens: 100_000,
        usedInputTokens: 8_000,
        outputReserveTokens: 4_000,
        safetyTokens: 1_000,
      }),
    ).toBe(87_000);
  });

  it("自定义和自动模式都不会超过当前模型的实际剩余窗口", () => {
    expect(
      resolveContextTokenBudget({
        mode: "custom",
        customContextTokens: 80_000,
        contextWindowTokens: 32_000,
        usedInputTokens: 7_000,
        outputReserveTokens: 4_000,
        safetyTokens: 1_000,
      }),
    ).toBe(20_000);
    expect(
      resolveContextTokenBudget({
        mode: "automatic",
        contextWindowTokens: 1_000_000,
        usedInputTokens: 20_000,
        outputReserveTokens: 8_000,
        safetyTokens: 2_000,
      }),
    ).toBeLessThanOrEqual(970_000);
  });

  it("按估算 Token 截断召回正文，不把中文长文本塞爆窗口", () => {
    const source = "机构业务判断".repeat(1_000);
    const fitted = takeTextWithinTokenBudget(source, 120);

    expect(estimateTextTokens(fitted)).toBeLessThanOrEqual(120);
    expect(fitted.length).toBeLessThan(source.length);
  });
});
