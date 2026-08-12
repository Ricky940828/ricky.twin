import { describe, expect, it } from "vitest";

import {
  DEFAULT_SITE_PRESENTATION,
  getSitePresentation,
} from "./site-presentation";

describe("site presentation copy", () => {
  it("keeps legacy saved content renderable with complete default copy", () => {
    const presentation = getSitePresentation(undefined);

    expect(presentation).toEqual(DEFAULT_SITE_PRESENTATION);
    expect(presentation.career.title).toContain("一路复合生长");
  });

  it("uses configured public copy", () => {
    const presentation = getSitePresentation({
      ...DEFAULT_SITE_PRESENTATION,
      career: {
        ...DEFAULT_SITE_PRESENTATION.career,
        title: "新的职业路线标题",
      },
    });

    expect(presentation.career.title).toBe("新的职业路线标题");
  });
});
