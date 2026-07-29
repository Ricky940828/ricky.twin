import { describe, expect, it } from "vitest";

import type { KnowledgeWorkspace } from "./knowledge-types";
import { retrieveKnowledge } from "./knowledge-retriever";

const workspace: KnowledgeWorkspace = {
  bases: [
    {
      id: "public",
      name: "公开职业资料",
      description: "公开内容",
      defaultAccess: "public",
      ragEnabled: true,
      indexStatus: "ready",
      documentCount: 1,
      chunkCount: 2,
      createdAt: "2026-07-30T00:00:00.000Z",
      updatedAt: "2026-07-30T00:00:00.000Z",
    },
    {
      id: "private",
      name: "盈利测算证据",
      description: "受限内容",
      defaultAccess: "authorized",
      ragEnabled: true,
      indexStatus: "ready",
      documentCount: 1,
      chunkCount: 1,
      createdAt: "2026-07-30T00:00:00.000Z",
      updatedAt: "2026-07-30T00:00:00.000Z",
    },
  ],
  documents: [
    {
      id: "doc-public",
      baseId: "public",
      fileName: "职业资料.md",
      title: "职业资料",
      sizeBytes: 100,
      checksum: "public",
      status: "ready",
      chunkCount: 2,
      createdAt: "2026-07-30T00:00:00.000Z",
      updatedAt: "2026-07-30T00:00:00.000Z",
    },
    {
      id: "doc-private",
      baseId: "private",
      fileName: "测算.md",
      title: "测算",
      sizeBytes: 100,
      checksum: "private",
      status: "ready",
      chunkCount: 1,
      createdAt: "2026-07-30T00:00:00.000Z",
      updatedAt: "2026-07-30T00:00:00.000Z",
    },
  ],
  chunks: [
    {
      id: "public-1",
      baseId: "public",
      documentId: "doc-public",
      order: 0,
      headingPath: ["机构业务", "准入判断"],
      content: "判断机构合作时，先识别主体、资产来源和治理成熟度。",
      charCount: 27,
    },
    {
      id: "public-2",
      baseId: "public",
      documentId: "doc-public",
      order: 1,
      headingPath: ["产品落地"],
      content: "将商业判断转换为产品规则、系统流程和跨部门交付。",
      charCount: 25,
    },
    {
      id: "private-1",
      baseId: "private",
      documentId: "doc-private",
      order: 0,
      headingPath: ["盈利测算"],
      content:
        "机构合作盈利测算的具体费率、成本公式和敏感性参数属于授权材料。",
      charCount: 31,
    },
  ],
  updatedAt: "2026-07-30T00:00:00.000Z",
};

describe("retrieveKnowledge", () => {
  it("filters inaccessible bases before ranking", () => {
    const result = retrieveKnowledge(workspace, {
      query: "机构合作盈利测算怎么判断",
      allowedBaseIds: [],
      owner: false,
      maxChars: 500,
      limit: 4,
    });

    expect(result.matches.length).toBeGreaterThan(0);
    expect(
      new Set(result.matches.map((match) => match.baseId)),
    ).toEqual(new Set(["public"]));
    expect(result.deniedBaseIds).toContain("private");
  });

  it("returns authorized content within a strict context budget", () => {
    const result = retrieveKnowledge(workspace, {
      query: "机构合作盈利测算怎么判断",
      allowedBaseIds: ["private"],
      owner: false,
      maxChars: 80,
      limit: 4,
    });

    expect(result.matches[0]).toEqual(
      expect.objectContaining({
        baseId: "private",
        baseName: "盈利测算证据",
      }),
    );
    expect(result.context.length).toBeLessThanOrEqual(80);
    expect(result.matches.every((match) => !("id" in match))).toBe(true);
  });
});
