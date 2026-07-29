import { describe, expect, it } from "vitest";

import {
  cardSwapReducer,
  createCardSwapState,
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
});
