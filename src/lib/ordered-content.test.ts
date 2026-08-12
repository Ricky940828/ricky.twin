import { describe, expect, it } from "vitest";

import { moveOrderedItem, normalizeOrderedItems } from "./ordered-content";

describe("ordered content helpers", () => {
  const items = [
    { id: "a", order: 1 },
    { id: "b", order: 2 },
    { id: "c", order: 3 },
  ];

  it("moves one item and always returns unique sequential order values", () => {
    const moved = moveOrderedItem(items, "c", -1);

    expect(moved.map((item) => item.id)).toEqual(["a", "c", "b"]);
    expect(moved.map((item) => item.order)).toEqual([1, 2, 3]);
  });

  it("repairs duplicated or sparse order values", () => {
    const normalized = normalizeOrderedItems([
      { id: "a", order: 7 },
      { id: "b", order: 7 },
      { id: "c", order: 20 },
    ]);

    expect(normalized.map((item) => item.order)).toEqual([1, 2, 3]);
  });
});
