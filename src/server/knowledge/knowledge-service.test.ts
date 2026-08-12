import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { createFileKnowledgeStore } from "./file-knowledge-store";
import { createKnowledgeService } from "./knowledge-service";

const directories: string[] = [];

afterEach(async () => {
  await Promise.all(
    directories.splice(0).map((directory) =>
      rm(directory, { force: true, recursive: true }),
    ),
  );
});

describe("KnowledgeService", () => {
  it("validates base input and never exposes raw chunks to admin clients", async () => {
    const dataDir = await mkdtemp(join(tmpdir(), "ricky-knowledge-"));
    directories.push(dataDir);
    const service = createKnowledgeService(
      createFileKnowledgeStore({ dataDir }),
    );

    const invalid = await service.createBase({
      name: "",
      description: "",
      defaultAccess: "public",
      ragEnabled: true,
    });
    expect(invalid).toEqual(
      expect.objectContaining({ ok: false }),
    );

    const created = await service.createBase({
      name: "公开职业资料",
      description: "职业路线与公开项目",
      defaultAccess: "public",
      ragEnabled: true,
    });
    expect(created.ok).toBe(true);
    if (!created.ok) {
      return;
    }
    const uploaded = await service.ingestDocument({
      baseId: created.workspace.bases[0].id,
      fileName: "职业资料.md",
      content: "# 职业资料\n\n七年多金融产品与 AI 应用实践。",
    });
    expect(uploaded.ok).toBe(true);
    if (uploaded.ok) {
      expect(uploaded.workspace).not.toHaveProperty("chunks");
      expect(uploaded.workspace.documents[0].chunkCount).toBe(1);

      const deleted = await service.deleteBase(
        created.workspace.bases[0].id,
      );
      expect(deleted).toEqual(
        expect.objectContaining({
          ok: true,
          workspace: expect.objectContaining({
            bases: [],
            documents: [],
          }),
        }),
      );
    }
  });
});
