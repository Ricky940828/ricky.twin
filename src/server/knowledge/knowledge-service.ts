import { createFileKnowledgeStore } from "./file-knowledge-store";
import {
  KnowledgeStoreError,
  type KnowledgeStore,
} from "./knowledge-store";
import type {
  CreateKnowledgeBaseInput,
  IngestKnowledgeDocumentInput,
  KnowledgeWorkspace,
  UpdateKnowledgeBaseInput,
} from "./knowledge-types";

export type AdminKnowledgeWorkspace = Omit<
  KnowledgeWorkspace,
  "chunks"
>;

export type AdminKnowledgeResponse =
  | { ok: true; workspace: AdminKnowledgeWorkspace }
  | { ok: false; message: string };

function adminWorkspace(
  workspace: KnowledgeWorkspace,
): AdminKnowledgeWorkspace {
  return structuredClone({
    bases: workspace.bases,
    documents: workspace.documents,
    updatedAt: workspace.updatedAt,
    warnings: workspace.warnings,
  });
}

function failure(error: unknown): AdminKnowledgeResponse {
  if (error instanceof KnowledgeStoreError) {
    return { ok: false, message: error.message };
  }
  return {
    ok: false,
    message: "知识库操作失败，原有索引仍保持可用",
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export interface KnowledgeService {
  getAdminWorkspace(): Promise<AdminKnowledgeWorkspace>;
  getRetrievalWorkspace(): Promise<KnowledgeWorkspace>;
  createBase(value: unknown): Promise<AdminKnowledgeResponse>;
  updateBase(
    id: string,
    value: unknown,
  ): Promise<AdminKnowledgeResponse>;
  ingestDocument(
    input: IngestKnowledgeDocumentInput,
  ): Promise<AdminKnowledgeResponse>;
}

export function createKnowledgeService(
  store: KnowledgeStore,
): KnowledgeService {
  return {
    async getAdminWorkspace() {
      return adminWorkspace(await store.getWorkspace());
    },

    getRetrievalWorkspace: () => store.getWorkspace(),

    async createBase(value) {
      if (!isRecord(value)) {
        return { ok: false, message: "知识库配置格式无效" };
      }
      try {
        await store.createBase({
          name: typeof value.name === "string" ? value.name : "",
          description:
            typeof value.description === "string"
              ? value.description
              : "",
          defaultAccess: value.defaultAccess as CreateKnowledgeBaseInput["defaultAccess"],
          ragEnabled: value.ragEnabled === true,
          loungeVisible: value.loungeVisible !== false,
        });
        return {
          ok: true,
          workspace: adminWorkspace(await store.getWorkspace()),
        };
      } catch (error) {
        return failure(error);
      }
    },

    async updateBase(id, value) {
      if (!isRecord(value)) {
        return { ok: false, message: "知识库配置格式无效" };
      }
      const update: UpdateKnowledgeBaseInput = {};
      if (typeof value.name === "string") {
        update.name = value.name;
      }
      if (typeof value.description === "string") {
        update.description = value.description;
      }
      if (
        value.defaultAccess === "public" ||
        value.defaultAccess === "authorized" ||
        value.defaultAccess === "private"
      ) {
        update.defaultAccess = value.defaultAccess;
      }
      if (typeof value.ragEnabled === "boolean") {
        update.ragEnabled = value.ragEnabled;
      }
      if (typeof value.loungeVisible === "boolean") {
        update.loungeVisible = value.loungeVisible;
      }
      try {
        return {
          ok: true,
          workspace: adminWorkspace(await store.updateBase(id, update)),
        };
      } catch (error) {
        return failure(error);
      }
    },

    async ingestDocument(input) {
      try {
        return {
          ok: true,
          workspace: adminWorkspace(
            await store.ingestDocument(input),
          ),
        };
      } catch (error) {
        return failure(error);
      }
    },
  };
}

let singleton: KnowledgeService | undefined;

export function getKnowledgeService() {
  singleton ??= createKnowledgeService(createFileKnowledgeStore());
  return singleton;
}
