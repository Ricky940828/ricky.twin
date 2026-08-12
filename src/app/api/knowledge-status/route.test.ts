import { describe, expect, it } from "vitest";

import type { AdminKnowledgeWorkspace } from "@/server/knowledge/knowledge-service";

import { knowledgeBadgesFromWorkspace } from "./route";

describe("knowledgeBadgesFromWorkspace", () => {
  it("lists every lounge-visible base while keeping restricted content protected", () => {
    const workspace: AdminKnowledgeWorkspace = {
      bases: [
        {
          id: "kb-public",
          name: "公开职业资料",
          description: "公开内容",
          defaultAccess: "public",
          ragEnabled: true,
          loungeVisible: true,
          indexStatus: "ready",
          documentCount: 1,
          chunkCount: 2,
          createdAt: "",
          updatedAt: "",
        },
        {
          id: "kb-private",
          name: "能力单元库",
          description: "受限内容",
          defaultAccess: "authorized",
          ragEnabled: true,
          loungeVisible: true,
          indexStatus: "ready",
          documentCount: 1,
          chunkCount: 2,
          createdAt: "",
          updatedAt: "",
        },
      ],
      documents: [],
      updatedAt: "",
    };

    expect(knowledgeBadgesFromWorkspace(workspace)).toEqual([
      expect.objectContaining({
        id: "kb-public",
        name: "公开职业资料",
        access: "public",
        accessLabel: "公开",
      }),
      expect.objectContaining({
        id: "kb-private",
        name: "能力单元库",
        access: "request",
        accessLabel: "需申请访问权限",
      }),
    ]);
  });
});
