import {
  mkdtemp,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { siteContent } from "@/content/site-content";

import { createFileContentStore } from "./file-content-store";

describe("FileContentStore", () => {
  let dataDir = "";

  beforeEach(async () => {
    dataDir = await mkdtemp(join(tmpdir(), "ricky-twin-content-"));
  });

  afterEach(async () => {
    await rm(dataDir, { recursive: true, force: true });
  });

  it("does not replace a corrupt production workspace", async () => {
    const workspacePath = join(dataDir, "content", "workspace.json");
    await import("node:fs/promises").then(({ mkdir }) =>
      mkdir(join(dataDir, "content"), { recursive: true }),
    );
    await writeFile(workspacePath, "not-json\n", "utf8");

    const store = createFileContentStore({ dataDir, strict: true });

    await expect(store.getWorkspace()).rejects.toThrow(
      "内容工作区无法读取",
    );
    expect(await readFile(workspacePath, "utf8")).toBe("not-json\n");
  });

  it("seeds draft, published content and the first version on first read", async () => {
    const store = createFileContentStore({ dataDir });

    const workspace = await store.getWorkspace();

    expect(workspace.draft).toEqual(siteContent);
    expect(workspace.published).toEqual(siteContent);
    expect(workspace.versions).toHaveLength(1);
    await expect(
      readFile(join(dataDir, "content", "workspace.json"), "utf8"),
    ).resolves.toContain('"schemaVersion": 1');
  });

  it("saves a draft without changing the published snapshot", async () => {
    const store = createFileContentStore({ dataDir });
    const workspace = await store.getWorkspace();
    workspace.draft.hero.statement = "后台草稿的新文案";

    const saved = await store.saveDraft(workspace.draft);

    expect(saved.draft.hero.statement).toBe("后台草稿的新文案");
    expect(saved.published.hero.statement).toBe(
      siteContent.hero.statement,
    );
    await expect(store.getPublished()).resolves.toEqual(siteContent);
  });

  it("publishes the current draft and creates an immutable version file", async () => {
    const store = createFileContentStore({
      dataDir,
      now: () => new Date("2026-07-30T10:20:30.000Z"),
      idSuffix: () => "abc123",
    });
    const workspace = await store.getWorkspace();
    workspace.draft.hero.statement = "已经发布的新文案";
    await store.saveDraft(workspace.draft);

    const published = await store.publish("更新首页定位");

    expect(published.published.hero.statement).toBe("已经发布的新文案");
    expect(published.publishedVersion.note).toBe("更新首页定位");
    expect(published.publishedVersion.id).toContain("abc123");
    expect(published.versions).toHaveLength(2);
    const versionFiles = await readdir(join(dataDir, "content", "versions"));
    expect(versionFiles).toContain(
      `${published.publishedVersion.id}.json`,
    );
  });

  it("loads saved state from a fresh store instance", async () => {
    const first = createFileContentStore({ dataDir });
    const workspace = await first.getWorkspace();
    workspace.draft.footer.headline = "新的页尾标题";
    await first.saveDraft(workspace.draft);

    const second = createFileContentStore({ dataDir });
    const restored = await second.getWorkspace();

    expect(restored.draft.footer.headline).toBe("新的页尾标题");
  });

  it("retains a corrupt file and recovers to a safe seed workspace", async () => {
    const store = createFileContentStore({ dataDir });
    await store.getWorkspace();
    const workspacePath = join(dataDir, "content", "workspace.json");
    await writeFile(workspacePath, "{not-json", "utf8");

    const recovered = await store.getWorkspace();

    expect(recovered.published).toEqual(siteContent);
    expect(recovered.warnings?.[0]).toContain("内容工作区损坏");
    const contentFiles = await readdir(join(dataDir, "content"));
    expect(
      contentFiles.some((name) => name.startsWith("workspace.corrupt-")),
    ).toBe(true);
  });
});
