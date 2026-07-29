import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { siteContent } from "@/content/site-content";

import { createContentService } from "./content-service";
import { createFileContentStore } from "./file-content-store";

describe("ContentService", () => {
  let dataDir = "";

  beforeEach(async () => {
    dataDir = await mkdtemp(join(tmpdir(), "ricky-twin-service-"));
  });

  afterEach(async () => {
    await rm(dataDir, { recursive: true, force: true });
  });

  it("rejects invalid content without changing the stored draft", async () => {
    const service = createContentService(
      createFileContentStore({ dataDir }),
    );
    const invalid = structuredClone(siteContent) as unknown as {
      sections: unknown[];
    };
    invalid.sections = [];

    const result = await service.saveDraft(invalid);
    const workspace = await service.getWorkspace();

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.issues?.[0]?.path).toBe("sections");
    expect(workspace.draft).toEqual(siteContent);
  });

  it("saves a complete valid draft and returns updated metadata", async () => {
    const service = createContentService(
      createFileContentStore({ dataDir }),
    );
    const draft = structuredClone(siteContent);
    draft.hero.statement = "服务层保存的新草稿";

    const result = await service.saveDraft(draft);

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.workspace.draft.hero.statement).toBe(
      "服务层保存的新草稿",
    );
    expect(result.workspace.draftUpdatedAt).toBeTruthy();
  });

  it("keeps the public snapshot unchanged until publish", async () => {
    const service = createContentService(
      createFileContentStore({ dataDir }),
    );
    const draft = structuredClone(siteContent);
    draft.hero.statement = "等待发布的新首页";

    await service.saveDraft(draft);
    expect((await service.getPublished()).hero.statement).toBe(
      siteContent.hero.statement,
    );

    const published = await service.publish(" ");
    expect(published.ok).toBe(true);
    if (!published.ok) {
      return;
    }
    expect(published.workspace.publishedVersion.note).toBe("内容更新");
    expect((await service.getPublished()).hero.statement).toBe(
      "等待发布的新首页",
    );
  });
});
