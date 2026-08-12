import { describe, expect, it } from "vitest";

import {
  resolveActiveSection,
  type SectionViewportMetric,
} from "./section-scrollspy";

const metric = (
  id: SectionViewportMetric["id"],
  top: number,
): SectionViewportMetric => ({ id, top });

describe("resolveActiveSection", () => {
  it("keeps the section whose top has most recently crossed the viewport anchor", () => {
    const sections = [
      metric("hero", -920),
      metric("career", 80),
      metric("projects", 1280),
      metric("practice", 2280),
      metric("lounge", 3280),
    ];

    expect(resolveActiveSection(sections, 96, "hero")).toBe("career");
  });

  it("does not mark a clicked destination active before it reaches the viewport", () => {
    const sections = [
      metric("hero", -420),
      metric("career", 520),
      metric("projects", 1520),
    ];

    expect(resolveActiveSection(sections, 96, "hero")).toBe("hero");
  });

  it("falls back to the first enabled section above the document start", () => {
    const sections = [metric("career", 420), metric("projects", 1420)];

    expect(resolveActiveSection(sections, 96, "hero")).toBe("career");
  });
});
