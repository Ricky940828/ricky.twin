import { describe, expect, it } from "vitest";

import {
  getStageIndex,
  interpolateRadar,
  splitCareerProgress,
} from "./career-model";

describe("career model", () => {
  it("maps bounded progress to the available career stages", () => {
    expect(getStageIndex(0, 4)).toBe(0);
    expect(getStageIndex(0.24, 4)).toBe(0);
    expect(getStageIndex(0.25, 4)).toBe(1);
    expect(getStageIndex(1, 4)).toBe(3);
    expect(getStageIndex(-2, 4)).toBe(0);
    expect(getStageIndex(3, 4)).toBe(3);
    expect(getStageIndex(0.5, 0)).toBe(0);
  });

  it("interpolates and clamps six-axis radar values", () => {
    expect(
      interpolateRadar(
        [1, 1, 1, 1, 1, 1],
        [2, 2, 2, 2, 2, 2],
        0.5,
      ),
    ).toEqual([1.5, 1.5, 1.5, 1.5, 1.5, 1.5]);
    expect(
      interpolateRadar(
        [1, 1, 1, 1, 1, 1],
        [2, 2, 2, 2, 2, 2],
        2,
      ),
    ).toEqual([2, 2, 2, 2, 2, 2]);
  });

  it("splits global progress into a transition between adjacent stages", () => {
    expect(splitCareerProgress(0, 4)).toEqual({
      fromIndex: 0,
      toIndex: 0,
      localProgress: 0,
    });
    expect(splitCareerProgress(0.5, 4)).toEqual({
      fromIndex: 1,
      toIndex: 2,
      localProgress: 0.5,
    });
    expect(splitCareerProgress(1, 4)).toEqual({
      fromIndex: 3,
      toIndex: 3,
      localProgress: 0,
    });
  });
});
