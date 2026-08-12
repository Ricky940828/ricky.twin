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

  it("reads the original markdown and removes the document, chunks and source file", async () => {
    const dataDir = await mkdtemp(join(tmpdir(), "ricky-knowledge-"));
    temporaryDirectories.push(dataDir);
    let sequence = 0;
    const store = createFileKnowledgeStore({
      dataDir,
      id: (prefix) => `${prefix}-${++sequence}`,
      now: () => new Date("2026-07-30T06:00:00.000Z"),
    });
    const base = await store.createBase({
      name: "能力单元库",
      description: "结构化能力单元",
      defaultAccess: "authorized",
      ragEnabled: true,
    });
    const ingested = await store.ingestDocument({
      baseId: base.id,
      fileName: "能力单元.md",
      content: "# 能力单元\n\n## 交易结构\n\n先明确主体、资产与责任边界。",
    });
    const document = ingested.documents[0];

    const source = await store.getDocumentContent(base.id, document.id);
    expect(source.document.id).toBe(document.id);
    expect(source.content).toContain("先明确主体、资产与责任边界");

    const deleted = await store.deleteDocument(base.id, document.id);
    expect(deleted.documents).toHaveLength(0);
    expect(deleted.chunks).toHaveLength(0);
    expect(deleted.bases[0]).toEqual(
      expect.objectContaining({
        documentCount: 0,
        chunkCount: 0,
        indexStatus: "empty",
      }),
    );
    await expect(
      readFile(
        join(
          dataDir,
          "knowledge",
          "documents",
          base.id,
          `${document.id}.md`,
        ),
        "utf8",
      ),
    ).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("deletes one knowledge base with all of its documents, chunks and source files", async () => {
    const dataDir = await mkdtemp(join(tmpdir(), "ricky-knowledge-"));
    temporaryDirectories.push(dataDir);
    let sequence = 0;
    const store = createFileKnowledgeStore({
      dataDir,
      id: (prefix) => `${prefix}-${++sequence}`,
      now: () => new Date("2026-08-06T03:00:00.000Z"),
    });
    const removedBase = await store.createBase({
      name: "待删除知识库",
      description: "这组资料需要整体移除",
      defaultAccess: "private",
      ragEnabled: true,
    });
    const retainedBase = await store.createBase({
      name: "保留知识库",
      description: "不能受到删除操作影响",
      defaultAccess: "public",
      ragEnabled: true,
    });
    const removedWorkspace = await store.ingestDocument({
      baseId: removedBase.id,
      fileName: "删除资料.md",
      content: "# 删除资料\n\n只属于待删除知识库的内容。",
    });
    const removedDocument = removedWorkspace.documents.find(
      (document) => document.baseId === removedBase.id,
    );
    await store.ingestDocument({
      baseId: retainedBase.id,
      fileName: "保留资料.md",
      content: "# 保留资料\n\n删除其他知识库后仍然可检索。",
    });

    const deleted = await store.deleteBase(removedBase.id);

    expect(deleted.bases.map((base) => base.id)).toEqual([retainedBase.id]);
    expect(deleted.documents).toEqual([
      expect.objectContaining({ baseId: retainedBase.id }),
    ]);
    expect(deleted.chunks).toEqual([
      expect.objectContaining({ baseId: retainedBase.id }),
    ]);
    await expect(
      readFile(
        join(
          dataDir,
          "knowledge",
          "documents",
          removedBase.id,
          `${removedDocument?.id}.md`,
        ),
        "utf8",
      ),
    ).rejects.toMatchObject({ code: "ENOENT" });
    const retainedSource = await store.getDocumentContent(
      retainedBase.id,
      deleted.documents[0].id,
    );
    expect(retainedSource.content).toContain("仍然可检索");
  });

  it("保留文件夹内相对路径，并允许不同子目录存在同名 Markdown", async () => {
    const dataDir = await mkdtemp(join(tmpdir(), "ricky-knowledge-"));
    temporaryDirectories.push(dataDir);
    let sequence = 0;
    const store = createFileKnowledgeStore({
      dataDir,
      id: (prefix) => `${prefix}-${++sequence}`,
    });
    const base = await store.createBase({
      name: "产品方法库",
      description: "从文件夹导入的产品方法",
      defaultAccess: "private",
      ragEnabled: true,
    });

    await store.ingestDocument({
      baseId: base.id,
      fileName: "总览.md",
      relativePath: "机构业务/总览.md",
      content: "# 机构业务\n\n机构合作的判断方法。",
    });
    const workspace = await store.ingestDocument({
      baseId: base.id,
      fileName: "总览.md",
      relativePath: "AI实践/总览.md",
      content: "# AI 实践\n\n知识库与 Agent 的应用方法。",
    });

    expect(workspace.documents).toHaveLength(2);
    expect(
      workspace.documents.map((document) => document.relativePath),
    ).toEqual(["机构业务/总览.md", "AI实践/总览.md"]);
  });

  it("拒绝包含路径穿越的文件夹相对路径", async () => {
    const dataDir = await mkdtemp(join(tmpdir(), "ricky-knowledge-"));
    temporaryDirectories.push(dataDir);
    const store = createFileKnowledgeStore({ dataDir });
    const base = await store.createBase({
      name: "安全测试库",
      description: "测试文件夹路径边界",
      defaultAccess: "private",
      ragEnabled: true,
    });

    await expect(
      store.ingestDocument({
        baseId: base.id,
        fileName: "越界.md",
        relativePath: "../越界.md",
        content: "# 越界\n\n不应写入。",
      }),
    ).rejects.toThrow("相对路径无效");
  });
});
