import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { getLetterPressure, PressureTitle } from "./pressure-title";

describe("PressureTitle", () => {
  it("renders an accessible title and one visual span per character", () => {
    render(<PressureTitle text="RICKY" />);

    const title = screen.getByRole("heading", { name: "RICKY" });
    expect(title.parentElement).toHaveAttribute("data-pressure-surface");
    expect(title.querySelectorAll("[data-pressure-letter]")).toHaveLength(5);
  });

  it("bounds the pointer response and weakens it with distance", () => {
    const close = getLetterPressure(0.5, 0.5);
    const far = getLetterPressure(0, 1);

    expect(close.width).toBeGreaterThan(far.width);
    expect(close.width).toBeGreaterThanOrEqual(145);
    expect(far.width).toBeGreaterThanOrEqual(58);
    expect(close.weight).toBeGreaterThanOrEqual(900);
    expect(far.weight).toBeGreaterThanOrEqual(220);
    expect(close.hot).toBe(true);
    expect(far.hot).toBe(false);
  });

  it("uses the variable-font axes without a geometric scale fallback", () => {
    render(<PressureTitle text="RICKY" />);

    const letters = screen
      .getByRole("heading", { name: "RICKY" })
      .querySelectorAll<HTMLElement>("[data-pressure-letter]");

    letters.forEach((letter) => {
      expect(letter.style.transform).toBe("");
    });
  });
});
