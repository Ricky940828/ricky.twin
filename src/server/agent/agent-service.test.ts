import { describe, expect, it, vi } from "vitest";

import type { AgentStore } from "./agent-store";
import type {
  AdminAgentWorkspace,
  AgentConfig,
  ResolvedModelConnection,
} from "./agent-types";
import { createAgentService } from "./agent-service";

function workspace(): AdminAgentWorkspace {
  const agent = {
    schemaVersion: 1,
    name: "测试 Agent",
    prompt: {
      identity: "身份",
      scope: "范围",
      style: "风格",
      knowledgeRules: "知识规则",
      permissionBoundary: "权限边界",
      commitmentBoundary: "承诺边界",
      responseStructure: "回答结构",
      conversionRules: "转化规则",
      prohibited: "禁止事项",
    },
    tools: [],
    knowledgeBaseIds: [],
    retrieval: {
      contextBudgetMode: "automatic",
      customContextTokens: 16_000,
      maxRetrievedChunks: 12,
    },
    usage: {
      anonymousPerMinute: 4,
      anonymousDailyQuestions: 20,
      registeredDailyQuestions: 80,
      authorizedDailyQuestions: 200,
      maxInputChars: 1_500,
      maxOutputTokens: 1_200,
      maxSessionTurns: 12,
      maxConcurrentRuns: 2,
      siteDailyTokenBudget: 300_000,
    },
  } satisfies AgentConfig;
  return {
    draft: agent,
    published: structuredClone(agent),
    publishedVersion: {
      id: "agent-v1",
      createdAt: "2026-07-30T00:00:00.000Z",
      note: "初始版本",
    },
    versions: [],
    models: [],
    updatedAt: "2026-07-30T00:00:00.000Z",
  };
}

function mockStore(): AgentStore {
  const value = workspace();
  return {
    getAdminWorkspace: vi.fn(async () => value),
    getPublishedAgent: vi.fn(async () => value.published),
    saveAgentDraft: vi.fn(async () => value),
    publishAgent: vi.fn(async () => value),
    upsertModel: vi.fn(async () => value),
    setActiveModel: vi.fn(async () => value),
    getActiveModel: vi.fn(async () => null),
    getResolvedModel: vi.fn(async () => null),
    recordModelTest: vi.fn(async () => value),
  };
}

describe("agent service", () => {
  it("拒绝无效配置，同时不调用存储层", async () => {
    const store = mockStore();
    const service = createAgentService(store);

    const result = await service.saveDraft(null);

    expect(result).toEqual({
      ok: false,
      message: "Agent 配置格式无效",
    });
    expect(store.saveAgentDraft).not.toHaveBeenCalled();
  });

  it("测试模型连接并记录成功状态", async () => {
    const store = mockStore();
    const model = {
      id: "model-1",
      name: "主模型",
      kind: "openai-compatible",
      baseUrl: "https://example.com/v1",
      modelId: "example-model",
      apiKey: "secret",
      enabled: true,
      timeoutMs: 10_000,
      contextWindowTokens: 128_000,
      maxOutputTokens: 800,
      createdAt: "2026-07-30T00:00:00.000Z",
      updatedAt: "2026-07-30T00:00:00.000Z",
    } satisfies ResolvedModelConnection;
    vi.mocked(store.getResolvedModel).mockResolvedValue(model);
    const invoke = vi.fn(async () => ({
      text: "OK",
      providerModelId: "provider-model-actual",
      providerRequestId: "request-1234567890",
      usage: {
        promptTokens: 2,
        completionTokens: 1,
        totalTokens: 3,
      },
    }));
    const service = createAgentService(store, invoke);

    const result = await service.testModel("model-1");

    expect(result.ok).toBe(true);
    expect(invoke).toHaveBeenCalledOnce();
    expect(store.recordModelTest).toHaveBeenCalledWith("model-1", {
      ok: true,
      message:
        "连接成功 · 实际模型：provider-model-actual · 请求 t-1234567890",
    });
  });

  it("模型调用失败时保留可读错误并写入测试状态", async () => {
    const store = mockStore();
    vi.mocked(store.getResolvedModel).mockResolvedValue({
      id: "model-1",
      name: "主模型",
      kind: "openai-compatible",
      baseUrl: "https://example.com/v1",
      modelId: "example-model",
      apiKey: "secret",
      enabled: true,
      timeoutMs: 10_000,
      contextWindowTokens: 128_000,
      maxOutputTokens: 800,
      createdAt: "2026-07-30T00:00:00.000Z",
      updatedAt: "2026-07-30T00:00:00.000Z",
    });
    const service = createAgentService(store, async () => {
      throw new Error("模型连接返回 401");
    });

    const result = await service.testModel("model-1");

    expect(result).toMatchObject({
      ok: false,
      message: "连接失败：模型连接返回 401",
    });
    expect(store.recordModelTest).toHaveBeenCalledWith("model-1", {
      ok: false,
      message: "连接失败：模型连接返回 401",
    });
  });
});
