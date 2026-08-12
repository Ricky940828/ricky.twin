import { describe, expect, it } from "vitest";

import {
  getCareerNodePositions,
  getCareerRoutePath,
} from "./career-route-geometry";

describe("career route geometry", () => {
  it("creates finite evenly ordered positions for arbitrary stage counts", () => {
    const points = getCareerNodePositions(7);

    expect(points).toHaveLength(7);
    points.forEach((point) => {
      expect(Number.isFinite(point.x)).toBe(true);
      expect(Number.isFinite(point.y)).toBe(true);
    });
    expect(points.map((point) => point.x)).toEqual(
      [...points.map((point) => point.x)].sort((a, b) => a - b),
    );
    expect(getCareerRoutePath()).not.toContain("NaN");
  });
});
