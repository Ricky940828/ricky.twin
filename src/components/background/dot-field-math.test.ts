import { describe, expect, it } from "vitest";

import { computeDotOffset, computePulseDecay } from "./dot-field-math";

const options = {
  radius: 160,
  maxDisplacement: 18,
};

describe("computeDotOffset", () => {
  it("does not move a dot when the pointer is stationary and far away", () => {
    expect(
      computeDotOffset(
        { x: 0, y: 0 },
        { x: 1000, y: 1000, speed: 0 },
        options,
      ),
    ).toEqual({ x: 0, y: 0, intensity: 0 });
  });

  it("creates a strong local response when the pointer reaches a dot", () => {
    const result = computeDotOffset(
      { x: 10, y: 10 },
      { x: 10, y: 10, speed: 1 },
      options,
    );

    expect(result.intensity).toBeGreaterThan(0);
    expect(Math.hypot(result.x, result.y)).toBeLessThanOrEqual(
      options.maxDisplacement,
    );
  });

  it("uses a quadratic falloff inside the response radius", () => {
    const near = computeDotOffset(
      { x: 20, y: 0 },
      { x: 0, y: 0, speed: 1 },
      options,
    );
    const far = computeDotOffset(
      { x: 120, y: 0 },
      { x: 0, y: 0, speed: 1 },
      options,
    );

    expect(near.intensity).toBeGreaterThan(far.intensity);
  });
});

describe("computePulseDecay", () => {
  it("keeps a fresh pointer trace visible and fades it completely", () => {
    expect(computePulseDecay(0, 1600)).toBe(1);
    expect(computePulseDecay(800, 1600)).toBeGreaterThan(0);
    expect(computePulseDecay(800, 1600)).toBeLessThan(1);
    expect(computePulseDecay(1600, 1600)).toBe(0);
    expect(computePulseDecay(2200, 1600)).toBe(0);
  });
});
