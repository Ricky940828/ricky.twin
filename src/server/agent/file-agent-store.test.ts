import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { createFileAgentStore } from "./file-agent-store";

const directories: string[] = [];

afterEach(async () => {
  await Promise.all(
    directories.splice(0).map((directory) =>
      rm(directory, { force: true, recursive: true }),
    ),
  );
});

describe("FileAgentStore", () => {
  it("seeds a protected single-agent protocol and publishes versioned drafts", async () => {
    const dataDir = await mkdtemp(join(tmpdir(), "ricky-agent-"));
    directories.push(dataDir);
    let sequence = 0;
    const store = createFileAgentStore({
      dataDir,
      id: (prefix) => `${prefix}-${++sequence}`,
      now: () => new Date("2026-07-30T05:00:00.000Z"),
      secret: "test-encryption-secret",
    });

    const initial = await store.getAdminWorkspace();
    expect(initial.draft.name).toBe("Ricky 数字接待 Agent");
    expect(
      initial.draft.tools.find((tool) => tool.id === "check-usage-limit"),
    ).toEqual(
      expect.objectContaining({ mode: "required", enabled: true }),
    );
    expect(
      initial.draft.tools.find((tool) => tool.id === "modify-knowledge"),
    ).toEqual(
      expect.objectContaining({ mode: "forbidden", enabled: false }),
    );

    const draft = structuredClone(initial.draft);
    draft.prompt.style = "简洁直接，先给判断，再说明依据和下一步。";
    await store.saveAgentDraft(draft);
    const published = await store.publishAgent("更新表达风格");

    expect(published.published.prompt.style).toContain("先给判断");
    expect(published.versions.at(-1)?.note).toBe("更新表达风格");
  });

  it("encrypts API keys at rest and only returns a masked connection", async () => {
    const dataDir = await mkdtemp(join(tmpdir(), "ricky-agent-"));
    directories.push(dataDir);
    const store = createFileAgentStore({
      dataDir,
      id: (prefix) => `${prefix}-1`,
      secret: "test-encryption-secret",
    });

    const workspace = await store.upsertModel({
      name: "AI Center",
      baseUrl: "https://api.aicenter.net.cn/v1",
      apiKey: "sk-this-must-never-reach-the-browser",
      modelId: "chatgpt-5.5",
      enabled: true,
      timeoutMs: 30_000,
      maxOutputTokens: 1_200,
    });
    const connection = workspace.models[0];

    expect(connection).toEqual(
      expect.objectContaining({
        apiKeyConfigured: true,
        apiKeyHint: "…wser",
      }),
    );
    expect(connection).not.toHaveProperty("apiKey");
    expect(connection).not.toHaveProperty("apiKeyCiphertext");

    const raw = await readFile(
      join(dataDir, "agent", "workspace.json"),
      "utf8",
    );
    expect(raw).not.toContain("sk-this-must-never-reach-the-browser");

    await store.setActiveModel(connection.id);
    const active = await store.getActiveModel();
    expect(active?.apiKey).toBe(
      "sk-this-must-never-reach-the-browser",
    );
  });
});
