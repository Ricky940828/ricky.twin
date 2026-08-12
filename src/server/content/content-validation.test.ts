import { describe, expect, it } from "vitest";

import { siteContent } from "@/content/site-content";
import type { SiteContent } from "@/content/types";

import {
  cloneSiteContent,
  validateSiteContent,
} from "./content-validation";

function cloneSeed(): SiteContent {
  return structuredClone(siteContent);
}

describe("validateSiteContent", () => {
  it("accepts the complete seed and returns an isolated copy", () => {
    const result = validateSiteContent(siteContent);

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.value).toEqual(siteContent);
    expect(result.value).not.toBe(siteContent);
    expect(result.value.hero).not.toBe(siteContent.hero);
  });

  it("normalizes the current identity-card defaults for an older saved workspace", () => {
    const candidate = cloneSeed();
    delete candidate.identityCard;

    const result = validateSiteContent(candidate);

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.value.identityCard?.front.name).toBe("李富豪 · Ricky");
    expect(result.value.identityCard?.back.title).toBe("知识与访问权限");
  });

  it("rejects an empty configured identity-card field with its exact path", () => {
    const candidate = cloneSeed();
    candidate.identityCard!.front.summary = "";

    const result = validateSiteContent(candidate);

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.issues).toContainEqual({
      path: "identityCard.front.summary",
      message: "必须填写文本",
    });
  });

  it("rejects duplicate section orders", () => {
    const candidate = cloneSeed();
    candidate.sections[1].order = candidate.sections[0].order;

    const result = validateSiteContent(candidate);

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.issues).toContainEqual({
      path: "sections[1].order",
      message: "板块顺序不能重复",
    });
  });

  it("rejects a missing required section", () => {
    const candidate = cloneSeed();
    candidate.sections = candidate.sections.filter(
      (section) => section.id !== "lounge",
    );

    const result = validateSiteContent(candidate);

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.issues).toContainEqual({
      path: "sections",
      message: "缺少必需板块：lounge",
    });
  });

  it("rejects an out-of-range radar level with its exact path", () => {
    const candidate = cloneSeed() as unknown as {
      career: Array<{ radar: number[] }>;
    };
    candidate.career[1].radar[3] = 5;

    const result = validateSiteContent(candidate);

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.issues).toContainEqual({
      path: "career[1].radar[3]",
      message: "能力等级必须是 1 到 4 的整数",
    });
  });

  it("clones content without sharing nested arrays", () => {
    const cloned = cloneSiteContent(siteContent);

    cloned.hero.tags[0] = "修改后的标签";
    cloned.career[0].highlights[0] = "修改后的经历";

    expect(siteContent.hero.tags[0]).toBe("金融产品经理");
    expect(siteContent.career[0].highlights[0]).not.toBe("修改后的经历");
  });
});
