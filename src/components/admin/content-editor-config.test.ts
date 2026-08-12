import { describe, expect, it } from "vitest";

import {
  ADMIN_EDITOR_GROUPS,
  ADMIN_EDITOR_META,
} from "./content-editor-config";

describe("admin content editor configuration", () => {
  it("separates page content from global settings", () => {
    expect(ADMIN_EDITOR_GROUPS.map((group) => group.label)).toEqual([
      "页面内容",
      "全局设置",
    ]);
    expect(
      ADMIN_EDITOR_GROUPS[0].items.map((item) => item.label),
    ).toEqual([
      "首页",
      "身份名片",
      "职业路线",
      "项目与能力",
      "实践现场",
      "AI 会客厅",
      "底部行动区",
    ]);
    expect(
      ADMIN_EDITOR_GROUPS[1].items.map((item) => item.label),
    ).toEqual([
      "品牌与身份",
      "导航与页面",
      "共用能力维度",
      "网站页脚",
    ]);
  });

  it("targets the requested identity-card face in live preview", () => {
    expect(ADMIN_EDITOR_META["identity-card"].panels).toEqual([
      expect.objectContaining({
        id: "identity-card-front",
        preview: expect.objectContaining({
          section: "identity-card",
          identityFace: "front",
        }),
      }),
      expect.objectContaining({
        id: "identity-card-back",
        preview: expect.objectContaining({
          section: "identity-card",
          identityFace: "back",
        }),
      }),
    ]);
  });

  it("keeps every editor id and panel id unique", () => {
    const ids = ADMIN_EDITOR_GROUPS.flatMap((group) =>
      group.items.map((item) => item.id),
    );
    expect(new Set(ids).size).toBe(ids.length);

    Object.values(ADMIN_EDITOR_META).forEach((editor) => {
      const panelIds = editor.panels.map((panel) => panel.id);
      expect(new Set(panelIds).size).toBe(panelIds.length);
    });
  });
});
