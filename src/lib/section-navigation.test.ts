import { describe, expect, it } from "vitest";

import { siteContent } from "@/content/site-content";
import { getEnabledSectionIds } from "./section-navigation";

describe("getEnabledSectionIds", () => {
  it("filters disabled sections and returns enabled ids by configured order", () => {
    const content = {
      ...siteContent,
      sections: siteContent.sections.map((section) =>
        section.id === "practice"
          ? { ...section, enabled: false, order: 1 }
          : section,
      ),
    };

    expect(getEnabledSectionIds(content)).toEqual([
      "hero",
      "career",
      "projects",
      "lounge",
    ]);
  });
});
