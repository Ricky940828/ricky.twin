import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { createFileKnowledgeStore } from "./file-knowledge-store";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) =>
      rm(directory, { force: true, recursive: true }),
    ),
  );
});

describe("FileKnowledgeStore", () => {
  it("creates a base, ingests markdown and persists a searchable index", async () => {
    const dataDir = await mkdtemp(join(tmpdir(), "ricky-knowledge-"));
    temporaryDirectories.push(dataDir);
    let sequence = 0;
    const store = createFileKnowledgeStore({
      dataDir,
      id: (prefix) => `${prefix}-${++sequence}`,
      now: () => new Date("2026-07-30T04:00:00.000Z"),
    });

    const base = await store.createBase({
      name: "机构业务方法",
      description: "机构准入、交易结构与产品落地方法",
      defaultAccess: "authorized",
      ragEnabled: true,
    });
    const workspace = await store.ingestDocument({
      baseId: base.id,
      fileName: "机构业务方法.md",
      content:
        "# 机构准入\n\n先识别主体和资产，再判断交易结构与盈利空间。\n\n## 产品落地\n\n将业务判断转换为规则、流程和系统需求。",
    });

    expect(workspace.bases.find((item) => item.id === base.id)).toEqual(
      expect.objectContaining({
        documentCount: 1,
        chunkCount: 2,
        indexStatus: "ready",
      }),
    );
    expect(workspace.documents).toEqual([
      expect.objectContaining({
        baseId: base.id,
        fileName: "机构业务方法.md",
        status: "ready",
        chunkCount: 2,
      }),
    ]);
    expect(workspace.chunks).toHaveLength(2);

    const persisted = JSON.parse(
      await readFile(
        join(dataDir, "knowledge", "workspace.json"),
        "utf8",
      ),
    ) as { documents: unknown[]; chunks: unknown[] };
    expect(persisted.documents).toHaveLength(1);
    expect(persisted.chunks).toHaveLength(2);
  });

  it("replaces an existing document without leaving duplicate chunks", async () => {
    const dataDir = await mkdtemp(join(tmpdir(), "ricky-knowledge-"));
    temporaryDirectories.push(dataDir);
    let sequence = 0;
    const store = createFileKnowledgeStore({
      dataDir,
      id: (prefix) => `${prefix}-${++sequence}`,
    });
    const base = await store.createBase({
      name: "AI 实践",
      description: "知识库与 Agent 实践",
      defaultAccess: "public",
      ragEnabled: true,
    });
    const first = await store.ingestDocument({
      baseId: base.id,
      fileName: "知识库.md",
      content: "# 旧内容\n\n旧的知识整理方法。",
    });
    const documentId = first.documents[0].id;
    const replaced = await store.ingestDocument({
      baseId: base.id,
      documentId,
      fileName: "知识库.md",
      content: "# 新内容\n\n新的知识资产化方法与有限检索流程。",
    });

    expect(replaced.documents).toHaveLength(1);
    expect(replaced.documents[0].id).toBe(documentId);
    expect(replaced.chunks).toHaveLength(1);
    expect(replaced.chunks[0].content).toContain("有限检索");
  });
});
