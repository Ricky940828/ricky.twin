import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { getLetterPressure, PressureTitle } from "./pressure-title";

describe("PressureTitle", () => {
  it("renders an accessible title and one visual span per character", () => {
    render(<PressureTitle text="RICKY" />);

    const title = screen.getByRole("heading", { name: "RICKY" });
    expect(title.querySelectorAll("[data-pressure-letter]")).toHaveLength(5);
  });

  it("bounds the pointer response and weakens it with distance", () => {
    const close = getLetterPressure(0.5, 0.5);
    const far = getLetterPressure(0, 1);

    expect(close.scaleX).toBeGreaterThan(far.scaleX);
    expect(close.scaleX).toBeLessThanOrEqual(1.32);
    expect(close.translateY).toBeGreaterThanOrEqual(-12);
    expect(close.weight).toBeLessThanOrEqual(720);
  });
});
