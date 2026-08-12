import { describe, expect, it } from "vitest";

import {
  DEFAULT_IDENTITY_CARD_CONTENT,
  getIdentityCardContent,
} from "./identity-card";

describe("identity-card content", () => {
  it("returns an isolated default for workspaces saved before identity-card configuration existed", () => {
    const first = getIdentityCardContent(undefined);
    const second = getIdentityCardContent(undefined);

    expect(first).toEqual(DEFAULT_IDENTITY_CARD_CONTENT);
    expect(first).not.toBe(DEFAULT_IDENTITY_CARD_CONTENT);
    expect(first.front.tags).not.toBe(DEFAULT_IDENTITY_CARD_CONTENT.front.tags);

    first.front.tags[0] = "已修改";
    expect(second.front.tags[0]).toBe("机构信贷");
  });

  it("preserves configured identity-card copy", () => {
    const configured = structuredClone(DEFAULT_IDENTITY_CARD_CONTENT);
    configured.front.name = "新的名片姓名";
    configured.back.title = "新的权限标题";

    expect(getIdentityCardContent(configured)).toEqual(configured);
  });
});
