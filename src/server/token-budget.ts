export type ContextBudgetMode = "automatic" | "custom" | "full";

export function estimateTextTokens(value: string) {
  if (!value) {
    return 0;
  }
  const cjk = value.match(/[\u3400-\u9fff\uf900-\ufaff]/g)?.length ?? 0;
  const remaining = Math.max(0, value.length - cjk);
  return Math.ceil(cjk + remaining / 4);
}

export function takeTextWithinTokenBudget(
  value: string,
  tokenBudget: number,
) {
  const budget = Math.max(0, Math.floor(tokenBudget));
  if (budget === 0) {
    return "";
  }
  if (estimateTextTokens(value) <= budget) {
    return value;
  }
  let low = 0;
  let high = value.length;
  while (low < high) {
    const middle = Math.ceil((low + high) / 2);
    if (estimateTextTokens(value.slice(0, middle)) <= budget) {
      low = middle;
    } else {
      high = middle - 1;
    }
  }
  return value.slice(0, low).trimEnd();
}

export function resolveContextTokenBudget({
  mode,
  customContextTokens,
  contextWindowTokens,
  usedInputTokens,
  outputReserveTokens,
  safetyTokens = 1_024,
}: {
  mode: ContextBudgetMode;
  customContextTokens?: number;
  contextWindowTokens: number;
  usedInputTokens: number;
  outputReserveTokens: number;
  safetyTokens?: number;
}) {
  const remaining = Math.max(
    0,
    Math.floor(contextWindowTokens) -
      Math.max(0, Math.ceil(usedInputTokens)) -
      Math.max(0, Math.ceil(outputReserveTokens)) -
      Math.max(0, Math.ceil(safetyTokens)),
  );
  if (mode === "full") {
    return remaining;
  }
  if (mode === "custom") {
    return Math.min(
      remaining,
      Math.max(0, Math.floor(customContextTokens ?? 0)),
    );
  }
  const automatic = Math.min(32_000, Math.floor(remaining * 0.32));
  return Math.min(remaining, Math.max(Math.min(remaining, 256), automatic));
}
