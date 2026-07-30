import { describe, expect, it } from "vitest";

import {
  cardSwapReducer,
  createCardSwapState,
  getCardIndexForScroll,
  getCardScrollProgress,
} from "./card-swap-model";

describe("cardSwapReducer", () => {
  it("moves next and previous without wrapping past either boundary", () => {
    let state = createCardSwapState(4);
    state = cardSwapReducer(state, { type: "previous" });
    expect(state.activeIndex).toBe(0);

    state = cardSwapReducer(state, { type: "next" });
    expect(state.activeIndex).toBe(1);
    state = cardSwapReducer(state, { type: "previous" });
    expect(state.activeIndex).toBe(0);

    state = cardSwapReducer(
      { activeIndex: 3, count: 4 },
      { type: "next" },
    );
    expect(state.activeIndex).toBe(3);
  });

  it("supports direct selection and clamps invalid indexes", () => {
    const state = createCardSwapState(4);

    expect(
      cardSwapReducer(state, { type: "select", index: 2 }).activeIndex,
    ).toBe(2);
    expect(
      cardSwapReducer(state, { type: "select", index: 99 }).activeIndex,
    ).toBe(3);
    expect(
      cardSwapReducer(state, { type: "select", index: -1 }).activeIndex,
    ).toBe(0);
  });

  it("adapts safely to project counts from one through eight", () => {
    for (let count = 1; count <= 8; count += 1) {
      const state = cardSwapReducer(
        { activeIndex: 7, count: 8 },
        { type: "set-count", count },
      );
      expect(state.count).toBe(count);
      expect(state.activeIndex).toBeLessThan(count);
    }
  });

  it("maps pinned scroll to each card and lets the last card reach the exit", () => {
    expect(getCardIndexForScroll(0, 4)).toBe(0);
    expect(getCardIndexForScroll(0.24, 4)).toBe(0);
    expect(getCardIndexForScroll(0.25, 4)).toBe(1);
    expect(getCardIndexForScroll(0.74, 4)).toBe(2);
    expect(getCardIndexForScroll(0.75, 4)).toBe(3);
    expect(getCardIndexForScroll(1, 4)).toBe(3);

    expect(getCardScrollProgress(0, 4)).toBe(0);
    expect(getCardScrollProgress(2, 4)).toBeCloseTo(2 / 3);
    expect(getCardScrollProgress(3, 4)).toBe(1);
  });
});
