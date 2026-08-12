import { callOpenAICompatibleModel } from "./model-adapter";
import { createFileAgentStore } from "./file-agent-store";
import {
  AgentStoreError,
  type AgentStore,
} from "./agent-store";
import type {
  AdminAgentWorkspace,
  AgentConfig,
  ModelConnectionInput,
  UnifiedModelRequest,
  UnifiedModelResponse,
} from "./agent-types";

export type AdminAgentResponse =
  | {
      ok: true;
      workspace: AdminAgentWorkspace;
      message?: string;
    }
  | {
      ok: false;
      message: string;
      workspace?: AdminAgentWorkspace;
    };

type ModelInvoker = (
  connection: Parameters<typeof callOpenAICompatibleModel>[0],
  request: UnifiedModelRequest,
) => Promise<UnifiedModelResponse>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readableError(error: unknown, fallback: string) {
  if (error instanceof AgentStoreError) {
    return error.message;
  }
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  return fallback;
}

function parseModelInput(value: unknown): ModelConnectionInput | null {
  if (!isRecord(value)) {
    return null;
  }
  return {
    id: typeof value.id === "string" ? value.id : undefined,
    name: typeof value.name === "string" ? value.name : "",
    baseUrl: typeof value.baseUrl === "string" ? value.baseUrl : "",
    apiKey: typeof value.apiKey === "string" ? value.apiKey : undefined,
    modelId: typeof value.modelId === "string" ? value.modelId : "",
    enabled: value.enabled !== false,
    timeoutMs:
      typeof value.timeoutMs === "number" ? value.timeoutMs : 30_000,
    contextWindowTokens:
      typeof value.contextWindowTokens === "number"
        ? value.contextWindowTokens
        : 128_000,
    maxOutputTokens:
      typeof value.maxOutputTokens === "number"
        ? value.maxOutputTokens
        : 1_200,
  };
}

export interface AgentService {
  getWorkspace(): Promise<AdminAgentWorkspace>;
  saveDraft(value: unknown): Promise<AdminAgentResponse>;
  publish(note: unknown): Promise<AdminAgentResponse>;
  upsertModel(value: unknown): Promise<AdminAgentResponse>;
  activateModel(id: string): Promise<AdminAgentResponse>;
  testModel(id: string): Promise<AdminAgentResponse>;
}

export function createAgentService(
  store: AgentStore,
  invokeModel: ModelInvoker = callOpenAICompatibleModel,
): AgentService {
  return {
    getWorkspace: () => store.getAdminWorkspace(),

    async saveDraft(value) {
      if (!isRecord(value)) {
        return { ok: false, message: "Agent 配置格式无效" };
      }
      try {
        return {
          ok: true,
          workspace: await store.saveAgentDraft(value as unknown as AgentConfig),
          message: "Agent 草稿已保存",
        };
      } catch (error) {
        return {
          ok: false,
          message: readableError(error, "Agent 草稿保存失败"),
        };
      }
    },

    async publish(note) {
      const normalized =
        typeof note === "string" && note.trim()
          ? note.trim()
          : "Agent 配置更新";
      try {
        return {
          ok: true,
          workspace: await store.publishAgent(normalized),
          message: "Agent 配置已发布",
        };
      } catch (error) {
        return {
          ok: false,
          message: readableError(
            error,
            "Agent 发布失败，线上仍使用上一版本",
          ),
        };
      }
    },

    async upsertModel(value) {
      const input = parseModelInput(value);
      if (!input) {
        return { ok: false, message: "模型连接配置格式无效" };
      }
      try {
        return {
          ok: true,
          workspace: await store.upsertModel(input),
          message: input.id ? "模型连接已更新" : "模型连接已创建",
        };
      } catch (error) {
        return {
          ok: false,
          message: readableError(error, "模型连接保存失败"),
        };
      }
    },

    async activateModel(id) {
      try {
        return {
          ok: true,
          workspace: await store.setActiveModel(id),
          message: "会客厅主模型已切换",
        };
      } catch (error) {
        return {
          ok: false,
          message: readableError(error, "主模型切换失败"),
        };
      }
    },

    async testModel(id) {
      let model;
      try {
        model = await store.getResolvedModel(id);
      } catch (error) {
        return {
          ok: false,
          message: readableError(error, "无法读取模型连接"),
        };
      }
      if (!model) {
        return { ok: false, message: "模型连接不存在" };
      }
      try {
        const result = await invokeModel(model, {
          system: "这是连接测试。请严格只回复 OK。",
          messages: [
            {
              role: "user",
              content: "请确认模型连接正常。",
            },
          ],
        });
        const actualModel = result.providerModelId ?? model.modelId;
        const requestHint = result.providerRequestId
          ? ` · 请求 ${result.providerRequestId.slice(-12)}`
          : "";
        const message = `连接成功 · 实际模型：${actualModel}${requestHint}`;
        return {
          ok: true,
          workspace: await store.recordModelTest(id, {
            ok: true,
            message,
          }),
          message,
        };
      } catch (error) {
        const message = `连接失败：${readableError(
          error,
          "模型服务暂时不可用",
        )}`;
        try {
          const workspace = await store.recordModelTest(id, {
            ok: false,
            message,
          });
          return { ok: false, message, workspace };
        } catch {
          return { ok: false, message };
        }
      }
    },
  };
}

let storeSingleton: AgentStore | undefined;
let singleton: AgentService | undefined;

export function getAgentStore() {
  storeSingleton ??= createFileAgentStore();
  return storeSingleton;
}

export function getAgentService() {
  singleton ??= createAgentService(getAgentStore());
  return singleton;
}
