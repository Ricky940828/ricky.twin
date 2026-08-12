import { createHash, randomUUID } from "node:crypto";
import {
  mkdir,
  readFile,
  rename,
  rm,
  unlink,
  writeFile,
} from "node:fs/promises";
import { basename, extname, join } from "node:path";

import { chunkMarkdown } from "./markdown-chunker";
import {
  KnowledgeStoreError,
  type KnowledgeStore,
} from "./knowledge-store";
import type {
  CreateKnowledgeBaseInput,
  KnowledgeAccessLevel,
  KnowledgeBase,
  KnowledgeChunk,
  KnowledgeDocument,
  KnowledgeWorkspace,
} from "./knowledge-types";

export interface FileKnowledgeStoreOptions {
  dataDir?: string;
  now?: () => Date;
  id?: (prefix: string) => string;
  strict?: boolean;
}

const ACCESS_LEVELS: KnowledgeAccessLevel[] = [
  "public",
  "authorized",
  "private",
];
const MAX_MARKDOWN_BYTES = 2 * 1024 * 1024;

function cloneWorkspace(value: KnowledgeWorkspace) {
  return structuredClone(value);
}

function requireText(value: string, field: string) {
  const normalized = value.trim();
  if (!normalized) {
    throw new KnowledgeStoreError(`${field}不能为空`, "invalid-input");
  }
  return normalized;
}

function normalizeDocumentPath(value: string) {
  const raw = requireText(value, "文档相对路径").replaceAll("\\", "/");
  const parts = raw.split("/");
  if (
    raw.startsWith("/") ||
    /^[A-Za-z]:\//.test(raw) ||
    raw.includes("\0") ||
    parts.some((part) => !part || part === "." || part === "..")
  ) {
    throw new KnowledgeStoreError("文档相对路径无效", "invalid-input");
  }
  return parts.join("/");
}

function normalizeBaseInput(input: CreateKnowledgeBaseInput) {
  if (!ACCESS_LEVELS.includes(input.defaultAccess)) {
    throw new KnowledgeStoreError(
      "知识库默认权限无效",
      "invalid-input",
    );
  }
  return {
    name: requireText(input.name, "知识库名称"),
    description: requireText(input.description, "知识库说明"),
    defaultAccess: input.defaultAccess,
    ragEnabled: Boolean(input.ragEnabled),
    loungeVisible: input.loungeVisible !== false,
  };
}

function parseWorkspace(value: unknown): KnowledgeWorkspace | undefined {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value)
  ) {
    return undefined;
  }
  const candidate = value as Partial<KnowledgeWorkspace>;
  if (
    !Array.isArray(candidate.bases) ||
    !Array.isArray(candidate.documents) ||
    !Array.isArray(candidate.chunks) ||
    typeof candidate.updatedAt !== "string"
  ) {
    return undefined;
  }
  return candidate as KnowledgeWorkspace;
}

function recalculateBase(
  base: KnowledgeBase,
  documents: KnowledgeDocument[],
  chunks: KnowledgeChunk[],
  updatedAt: string,
): KnowledgeBase {
  const baseDocuments = documents.filter(
    (document) => document.baseId === base.id,
  );
  const chunkCount = chunks.filter(
    (chunk) => chunk.baseId === base.id,
  ).length;
  return {
    ...base,
    documentCount: baseDocuments.length,
    chunkCount,
    indexStatus:
      baseDocuments.length === 0
        ? "empty"
        : baseDocuments.some((document) => document.status === "error")
          ? "error"
          : baseDocuments.some(
                (document) => document.status === "processing",
              )
            ? "processing"
            : "ready",
    updatedAt,
  };
}

export function createFileKnowledgeStore(
  options: FileKnowledgeStoreOptions = {},
): KnowledgeStore {
  const dataDir =
    options.dataDir ??
    process.env.RICKY_CONTENT_DATA_DIR ??
    join(process.cwd(), ".ricky-twin-data");
  const now = options.now ?? (() => new Date());
  const makeId =
    options.id ?? ((prefix: string) => `${prefix}-${randomUUID()}`);
  const strict = options.strict ?? process.env.NODE_ENV === "production";
  const knowledgeDir = join(dataDir, "knowledge");
  const documentsDir = join(knowledgeDir, "documents");
  const workspacePath = join(knowledgeDir, "workspace.json");
  let queue: Promise<unknown> = Promise.resolve();

  const ensureDirectories = async () => {
    await mkdir(documentsDir, { recursive: true });
  };

  const emptyWorkspace = (): KnowledgeWorkspace => ({
    bases: [],
    documents: [],
    chunks: [],
    updatedAt: now().toISOString(),
  });

  const atomicWrite = async (path: string, value: string) => {
    const temporary = `${path}.tmp-${randomUUID()}`;
    await writeFile(temporary, value, "utf8");
    await rename(temporary, path);
  };

  const persist = async (workspace: KnowledgeWorkspace) => {
    await ensureDirectories();
    await atomicWrite(
      workspacePath,
      `${JSON.stringify(workspace, null, 2)}\n`,
    );
  };

  const readOrSeed = async () => {
    await ensureDirectories();
    try {
      const parsed = parseWorkspace(
        JSON.parse(await readFile(workspacePath, "utf8")) as unknown,
      );
      if (parsed) {
        parsed.bases = parsed.bases.map((base) => ({
          ...base,
          loungeVisible: base.loungeVisible !== false,
        }));
        parsed.documents = parsed.documents.map((document) => ({
          ...document,
          relativePath: document.relativePath ?? document.fileName,
        }));
        return parsed;
      }
    } catch (error) {
      const missing =
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === "ENOENT";
      if (!missing) {
        if (strict) {
          const detail =
            error instanceof Error ? error.message : "无法解析知识库工作区";
          throw new Error(`知识库工作区无法读取：${detail}`);
        }
        const recovered = emptyWorkspace();
        recovered.warnings = [
          "知识库工作区无法读取，已安全恢复为空工作区。",
        ];
        await persist(recovered);
        return recovered;
      }
    }
    const workspace = emptyWorkspace();
    await persist(workspace);
    return workspace;
  };

  const exclusive = <T>(operation: () => Promise<T>) => {
    const next = queue.then(operation, operation);
    queue = next.then(
      () => undefined,
      () => undefined,
    );
    return next;
  };

  return {
    async getWorkspace() {
      return cloneWorkspace(await readOrSeed());
    },

    async createBase(input) {
      return exclusive(async () => {
        const normalized = normalizeBaseInput(input);
        const workspace = await readOrSeed();
        const timestamp = now().toISOString();
        const base: KnowledgeBase = {
          id: makeId("kb"),
          ...normalized,
          indexStatus: "empty",
          documentCount: 0,
          chunkCount: 0,
          createdAt: timestamp,
          updatedAt: timestamp,
        };
        workspace.bases.push(base);
        workspace.updatedAt = timestamp;
        delete workspace.warnings;
        await persist(workspace);
        return structuredClone(base);
      });
    },

    async updateBase(id, input) {
      return exclusive(async () => {
        const workspace = await readOrSeed();
        const index = workspace.bases.findIndex((base) => base.id === id);
        if (index < 0) {
          throw new KnowledgeStoreError("知识库不存在", "not-found");
        }
        const current = workspace.bases[index];
        const updatedInput: CreateKnowledgeBaseInput = {
          name: input.name ?? current.name,
          description: input.description ?? current.description,
          defaultAccess: input.defaultAccess ?? current.defaultAccess,
          ragEnabled: input.ragEnabled ?? current.ragEnabled,
          loungeVisible:
            input.loungeVisible ?? current.loungeVisible ?? true,
        };
        const normalized = normalizeBaseInput(updatedInput);
        const timestamp = now().toISOString();
        workspace.bases[index] = {
          ...current,
          ...normalized,
          updatedAt: timestamp,
        };
        workspace.updatedAt = timestamp;
        delete workspace.warnings;
        await persist(workspace);
        return cloneWorkspace(workspace);
      });
    },

    async deleteBase(id) {
      return exclusive(async () => {
        const workspace = await readOrSeed();
        const base = workspace.bases.find((item) => item.id === id);
        if (!base) {
          throw new KnowledgeStoreError("知识库不存在", "not-found");
        }
        const timestamp = now().toISOString();
        workspace.bases = workspace.bases.filter((item) => item.id !== id);
        workspace.documents = workspace.documents.filter(
          (document) => document.baseId !== id,
        );
        workspace.chunks = workspace.chunks.filter(
          (chunk) => chunk.baseId !== id,
        );
        workspace.updatedAt = timestamp;
        delete workspace.warnings;
        await persist(workspace);

        try {
          await rm(join(documentsDir, id), {
            force: true,
            recursive: true,
          });
        } catch {
          workspace.warnings = [
            `知识库“${base.name}”及索引已删除，但源文件目录清理失败；请稍后重试。`,
          ];
          await persist(workspace);
        }
        return cloneWorkspace(workspace);
      });
    },

    async ingestDocument(input) {
      return exclusive(async () => {
        const workspace = await readOrSeed();
        const base = workspace.bases.find(
          (item) => item.id === input.baseId,
        );
        if (!base) {
          throw new KnowledgeStoreError("知识库不存在", "not-found");
        }
        const incomingPath = normalizeDocumentPath(
          input.relativePath ?? input.fileName,
        );
        const fileName = basename(incomingPath);
        if (extname(fileName).toLowerCase() !== ".md") {
          throw new KnowledgeStoreError(
            "当前仅支持 Markdown 文件",
            "unsupported-file",
          );
        }
        const content = requireText(input.content, "Markdown 内容");
        const sizeBytes = Buffer.byteLength(content, "utf8");
        if (sizeBytes > MAX_MARKDOWN_BYTES) {
          throw new KnowledgeStoreError(
            "单个 Markdown 文件不能超过 2MB",
            "file-too-large",
          );
        }

        const existingIndex = input.documentId
          ? workspace.documents.findIndex(
              (document) =>
                document.id === input.documentId &&
                document.baseId === input.baseId,
            )
          : workspace.documents.findIndex(
              (document) =>
                document.baseId === input.baseId &&
                (document.relativePath ?? document.fileName) === incomingPath,
            );
        if (input.documentId && existingIndex < 0) {
          throw new KnowledgeStoreError("待更新文档不存在", "not-found");
        }

        const timestamp = now().toISOString();
        const current =
          existingIndex >= 0 ? workspace.documents[existingIndex] : undefined;
        const relativePath =
          current && input.documentId && !input.relativePath
            ? current.relativePath ?? incomingPath
            : incomingPath;
        const documentId = current?.id ?? makeId("doc");
        const drafts = chunkMarkdown(content);
        if (drafts.length === 0) {
          throw new KnowledgeStoreError(
            "Markdown 中没有可索引的正文",
            "invalid-input",
          );
        }
        const document: KnowledgeDocument = {
          id: documentId,
          baseId: input.baseId,
          fileName,
          relativePath,
          title:
            /^#\s+(.+)$/m.exec(content)?.[1].trim() ??
            fileName.replace(/\.md$/i, ""),
          sizeBytes,
          checksum: createHash("sha256").update(content).digest("hex"),
          status: "ready",
          chunkCount: drafts.length,
          createdAt: current?.createdAt ?? timestamp,
          updatedAt: timestamp,
        };
        const chunks: KnowledgeChunk[] = drafts.map((draft) => ({
          id: makeId("chunk"),
          baseId: input.baseId,
          documentId,
          order: draft.order,
          headingPath: draft.headingPath,
          content: draft.content,
          charCount: draft.charCount,
        }));

        await mkdir(join(documentsDir, input.baseId), {
          recursive: true,
        });
        await atomicWrite(
          join(documentsDir, input.baseId, `${documentId}.md`),
          `${content}\n`,
        );

        if (existingIndex >= 0) {
          workspace.documents[existingIndex] = document;
        } else {
          workspace.documents.push(document);
        }
        workspace.chunks = [
          ...workspace.chunks.filter(
            (chunk) => chunk.documentId !== documentId,
          ),
          ...chunks,
        ];
        workspace.bases = workspace.bases.map((item) =>
          item.id === base.id
            ? recalculateBase(
                item,
                workspace.documents,
                workspace.chunks,
                timestamp,
              )
            : item,
        );
        workspace.updatedAt = timestamp;
        delete workspace.warnings;
        await persist(workspace);
        return cloneWorkspace(workspace);
      });
    },

    async getDocumentContent(baseId, documentId) {
      const workspace = await readOrSeed();
      const document = workspace.documents.find(
        (item) => item.id === documentId && item.baseId === baseId,
      );
      if (!document) {
        throw new KnowledgeStoreError("文档不存在", "not-found");
      }
      try {
        return {
          document: structuredClone(document),
          content: await readFile(
            join(documentsDir, baseId, `${documentId}.md`),
            "utf8",
          ),
        };
      } catch (error) {
        const missing =
          typeof error === "object" &&
          error !== null &&
          "code" in error &&
          error.code === "ENOENT";
        if (missing) {
          throw new KnowledgeStoreError(
            "文档原文不存在，请重新上传",
            "not-found",
          );
        }
        throw error;
      }
    },

    async deleteDocument(baseId, documentId) {
      return exclusive(async () => {
        const workspace = await readOrSeed();
        const document = workspace.documents.find(
          (item) => item.id === documentId && item.baseId === baseId,
        );
        if (!document) {
          throw new KnowledgeStoreError("文档不存在", "not-found");
        }
        const timestamp = now().toISOString();
        workspace.documents = workspace.documents.filter(
          (item) => item.id !== documentId,
        );
        workspace.chunks = workspace.chunks.filter(
          (chunk) => chunk.documentId !== documentId,
        );
        workspace.bases = workspace.bases.map((base) =>
          base.id === baseId
            ? recalculateBase(
                base,
                workspace.documents,
                workspace.chunks,
                timestamp,
              )
            : base,
        );
        workspace.updatedAt = timestamp;
        delete workspace.warnings;
        await persist(workspace);

        try {
          await unlink(
            join(documentsDir, baseId, `${documentId}.md`),
          );
        } catch (error) {
          const missing =
            typeof error === "object" &&
            error !== null &&
            "code" in error &&
            error.code === "ENOENT";
          if (!missing) {
            workspace.warnings = [
              "文档索引已删除，但源文件清理失败；请稍后重试。",
            ];
            await persist(workspace);
          }
        }
        return cloneWorkspace(workspace);
      });
    },
  };
}
