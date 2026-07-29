import { describe, expect, it, vi } from "vitest";

import type { ContentService } from "@/server/content/content-service";
import type { KnowledgeService } from "@/server/knowledge/knowledge-service";
import type { AgentStore } from "@/server/agent/agent-store";
import type { RuntimeStore } from "@/server/runtime/runtime-store";

import { createChatService } from "./chat-service";

const agent = {
  schemaVersion: 1,
  name: "测试 Agent",
  prompt: {
    identity: "身份",
    scope: "范围",
    style: "风格",
    knowledgeRules: "知识",
    permissionBoundary: "权限",
    commitmentBoundary: "承诺",
    responseStructure: "结构",
    conversionRules: "转化",
    prohibited: "禁止",
  },
  tools: [],
  knowledgeBaseIds: [],
  usage: {
    anonymousPerMinute: 1,
    anonymousDailyQuestions: 1,
    registeredDailyQuestions: 2,
    authorizedDailyQuestions: 3,
    maxInputChars: 1_500,
    maxOutputTokens: 600,
    maxSessionTurns: 12,
    maxConcurrentRuns: 1,
    siteDailyTokenBudget: 100,
  },
};

function dependencies() {
  const agentStore = {
    getPublishedAgent: vi.fn(async () => agent),
    getActiveModel: vi.fn(async () => null),
    getAdminWorkspace: vi.fn(),
  } as unknown as AgentStore;
  const runtimeStore = {
    begin: vi.fn<RuntimeStore["begin"]>(
      async () => ({ allowed: true, runId: "run-1" }) as const,
    ),
    finish: vi.fn(async () => ({ runs: [], updatedAt: "" })),
    getWorkspace: vi.fn(),
  } satisfies RuntimeStore;
  const knowledgeService = {
    getRetrievalWorkspace: vi.fn(async () => ({
      bases: [],
      documents: [],
      chunks: [],
      updatedAt: "",
    })),
  } as unknown as KnowledgeService;
  const contentService = {
    getPublished: vi.fn(async () => ({})),
  } as unknown as ContentService;
  const run = vi.fn(async () => ({
    ok: true,
    mode: "demo" as const,
    answer: "尚未连接模型",
    nextAction: "none" as const,
    meta: { retrievalCount: 0, latencyMs: 2 },
  }));
  return {
    agentStore,
    runtimeStore,
    knowledgeService,
    contentService,
    run,
  };
}

describe("chat service", () => {
  it("额度拒绝发生在知识检索与模型调用之前", async () => {
    const deps = dependencies();
    vi.mocked(deps.runtimeStore.begin).mockResolvedValue({
      allowed: false,
      reason: "daily",
    });
    const service = createChatService(deps);

    const result = await service.chat({
      question: "你擅长什么",
      history: [],
      actor: {
        tier: "anonymous",
        allowedBaseIds: [],
        visitorId: "visitor-1",
      },
    });

    expect(result).toMatchObject({
      ok: false,
      code: "usage-limit",
      mode: "blocked",
    });
    expect(deps.run).not.toHaveBeenCalled();
  });

  it("完成回答后记录最小运行元数据", async () => {
    const deps = dependencies();
    const service = createChatService(deps);

    await service.chat({
      question: "你擅长什么",
      history: [],
      actor: {
        tier: "anonymous",
        allowedBaseIds: [],
        visitorId: "visitor-1",
      },
    });

    expect(deps.runtimeStore.finish).toHaveBeenCalledWith(
      "run-1",
      expect.objectContaining({
        status: "demo",
        mode: "demo",
        retrievalCount: 0,
        totalTokens: 0,
      }),
    );
  });
});
