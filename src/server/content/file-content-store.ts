import {
  mkdir,
  readFile,
  rename,
  writeFile,
} from "node:fs/promises";
import { join } from "node:path";

import { siteContent } from "@/content/site-content";

import {
  ContentValidationError,
  type ContentStore,
} from "./content-store";
import {
  cloneSiteContent,
  validateSiteContent,
} from "./content-validation";
import type {
  ContentVersionMeta,
  ContentWorkspace,
} from "./content-workspace";

export interface FileContentStoreOptions {
  dataDir?: string;
  now?: () => Date;
  idSuffix?: () => string;
}

class InvalidWorkspaceError extends Error {}

function defaultSuffix() {
  return Math.random().toString(36).slice(2, 8);
}

function cloneWorkspace(workspace: ContentWorkspace): ContentWorkspace {
  return structuredClone(workspace);
}

function parseVersionMeta(value: unknown): ContentVersionMeta | undefined {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value)
  ) {
    return undefined;
  }
  const candidate = value as Record<string, unknown>;
  if (
    typeof candidate.id !== "string" ||
    typeof candidate.createdAt !== "string" ||
    typeof candidate.note !== "string"
  ) {
    return undefined;
  }
  return {
    id: candidate.id,
    createdAt: candidate.createdAt,
    note: candidate.note,
  };
}

function parseWorkspace(value: unknown): ContentWorkspace {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value)
  ) {
    throw new InvalidWorkspaceError("工作区根节点无效");
  }
  const candidate = value as Record<string, unknown>;
  const draft = validateSiteContent(candidate.draft);
  const published = validateSiteContent(candidate.published);
  const publishedVersion = parseVersionMeta(candidate.publishedVersion);
  const versions = Array.isArray(candidate.versions)
    ? candidate.versions.map(parseVersionMeta)
    : [];

  if (
    !draft.ok ||
    !published.ok ||
    !publishedVersion ||
    versions.some((version) => version === undefined) ||
    typeof candidate.draftUpdatedAt !== "string"
  ) {
    throw new InvalidWorkspaceError("工作区内容协议无效");
  }

  return {
    draft: draft.value,
    published: published.value,
    publishedVersion,
    versions: versions as ContentVersionMeta[],
    draftUpdatedAt: candidate.draftUpdatedAt,
    warnings: Array.isArray(candidate.warnings)
      ? candidate.warnings.filter(
          (warning): warning is string => typeof warning === "string",
        )
      : undefined,
  };
}

export function createFileContentStore(
  options: FileContentStoreOptions = {},
): ContentStore {
  const dataDir =
    options.dataDir ??
    process.env.RICKY_CONTENT_DATA_DIR ??
    join(process.cwd(), ".ricky-twin-data");
  const now = options.now ?? (() => new Date());
  const idSuffix = options.idSuffix ?? defaultSuffix;
  const contentDir = join(dataDir, "content");
  const versionsDir = join(contentDir, "versions");
  const workspacePath = join(contentDir, "workspace.json");
  let writeQueue: Promise<unknown> = Promise.resolve();

  const ensureDirectories = async () => {
    await mkdir(versionsDir, { recursive: true });
  };

  const atomicWriteJson = async (path: string, value: unknown) => {
    const temporaryPath = `${path}.tmp-${process.pid}-${idSuffix()}`;
    await writeFile(
      temporaryPath,
      `${JSON.stringify(value, null, 2)}\n`,
      "utf8",
    );
    await rename(temporaryPath, path);
  };

  const createSeedWorkspace = (): ContentWorkspace => {
    const createdAt = now().toISOString();
    const publishedVersion: ContentVersionMeta = {
      id: `seed-v${siteContent.schemaVersion}`,
      createdAt,
      note: "初始公开版本",
    };
    return {
      draft: cloneSiteContent(siteContent),
      published: cloneSiteContent(siteContent),
      publishedVersion,
      versions: [publishedVersion],
      draftUpdatedAt: createdAt,
    };
  };

  const persistSeed = async (warnings?: string[]) => {
    const workspace = createSeedWorkspace();
    if (warnings) {
      workspace.warnings = warnings;
    }
    await atomicWriteJson(
      join(versionsDir, `${workspace.publishedVersion.id}.json`),
      {
        meta: workspace.publishedVersion,
        content: workspace.published,
      },
    );
    await atomicWriteJson(workspacePath, workspace);
    return workspace;
  };

  const recoverCorruptWorkspace = async (error: unknown) => {
    const stamp = now().toISOString().replaceAll(/[:.]/g, "-");
    const corruptPath = join(
      contentDir,
      `workspace.corrupt-${stamp}-${idSuffix()}.json`,
    );
    try {
      await rename(workspacePath, corruptPath);
    } catch {
      // The missing file path is handled by normal seed initialization.
    }
    const detail =
      error instanceof Error ? error.message : "无法解析内容工作区";
    return persistSeed([`内容工作区损坏，已安全恢复初始版本：${detail}`]);
  };

  const readOrSeed = async () => {
    await ensureDirectories();
    try {
      const raw = await readFile(workspacePath, "utf8");
      return parseWorkspace(JSON.parse(raw) as unknown);
    } catch (error) {
      const code =
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        typeof error.code === "string"
          ? error.code
          : undefined;
      if (code === "ENOENT") {
        return persistSeed();
      }
      return recoverCorruptWorkspace(error);
    }
  };

  const runExclusive = <T>(operation: () => Promise<T>) => {
    const next = writeQueue.then(operation, operation);
    writeQueue = next.then(
      () => undefined,
      () => undefined,
    );
    return next;
  };

  return {
    async getWorkspace() {
      return cloneWorkspace(await readOrSeed());
    },

    async saveDraft(content) {
      const validation = validateSiteContent(content);
      if (!validation.ok) {
        throw new ContentValidationError(validation.issues);
      }
      return runExclusive(async () => {
        const workspace = await readOrSeed();
        workspace.draft = validation.value;
        workspace.draftUpdatedAt = now().toISOString();
        delete workspace.warnings;
        await atomicWriteJson(workspacePath, workspace);
        return cloneWorkspace(workspace);
      });
    },

    async publish(note) {
      return runExclusive(async () => {
        const workspace = await readOrSeed();
        const createdAt = now().toISOString();
        const version: ContentVersionMeta = {
          id: `v-${createdAt.replaceAll(/[:.]/g, "-")}-${idSuffix()}`,
          createdAt,
          note: note.trim() || "内容更新",
        };
        const content = cloneSiteContent(workspace.draft);
        await atomicWriteJson(join(versionsDir, `${version.id}.json`), {
          meta: version,
          content,
        });
        workspace.published = content;
        workspace.publishedVersion = version;
        workspace.versions = [...workspace.versions, version];
        delete workspace.warnings;
        await atomicWriteJson(workspacePath, workspace);
        return cloneWorkspace(workspace);
      });
    },

    async getPublished() {
      const workspace = await readOrSeed();
      return cloneSiteContent(workspace.published);
    },
  };
}
