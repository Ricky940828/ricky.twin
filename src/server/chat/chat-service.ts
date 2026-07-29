import {
  getAgentStore,
} from "@/server/agent/agent-service";
import type { AgentStore } from "@/server/agent/agent-store";
import { callOpenAICompatibleModel } from "@/server/agent/model-adapter";
import {
  getContentService,
  type ContentService,
} from "@/server/content/content-service";
import {
  getKnowledgeService,
  type KnowledgeService,
} from "@/server/knowledge/knowledge-service";
import {
  getRuntimeStore,
} from "@/server/runtime/file-runtime-store";
import type { RuntimeStore } from "@/server/runtime/runtime-store";

import {
  runChat,
  type ChatEngineDependencies,
} from "./chat-engine";
import type {
  ChatInput,
  ChatResult,
} from "./chat-types";

type ChatRunner = (
  dependencies: ChatEngineDependencies,
  input: ChatInput,
) => Promise<ChatResult>;

export interface ChatServiceDependencies {
  agentStore: AgentStore;
  runtimeStore: RuntimeStore;
  knowledgeService: KnowledgeService;
  contentService: ContentService;
  run?: ChatRunner;
}

function usageBlocked(
  reason: "minute" | "daily" | "concurrency" | "site-budget",
): ChatResult {
  const answers = {
    minute: "发送得有些快，请稍等片刻再继续。",
    daily: "今天的免费对话额度已经用完，欢迎稍后再来或留下联系方式继续沟通。",
    concurrency: "当前同时对话的人较多，请稍后重新发送。",
    "site-budget": "AI 会客厅今日服务额度已达到保护线，请明天再来。",
  };
  return {
    ok: false,
    code: "usage-limit",
    message: answers[reason],
    mode: "blocked",
    answer: answers[reason],
    nextAction: reason === "daily" ? "leave-contact" : "none",
    meta: { retrievalCount: 0, latencyMs: 0 },
  };
}

export interface ChatService {
  chat(input: ChatInput): Promise<ChatResult>;
  testDraft(question: string): Promise<ChatResult>;
}

export function createChatService(
  dependencies: ChatServiceDependencies,
): ChatService {
  const execute = dependencies.run ?? runChat;

  return {
    async chat(input) {
      const agent = await dependencies.agentStore.getPublishedAgent();
      const started = await dependencies.runtimeStore.begin({
        visitorId: input.actor.visitorId,
        sessionId: input.actor.sessionId,
        tier: input.actor.tier,
        questionPreview: input.question,
        policy: agent.usage,
      });
      if (!started.allowed) {
        return usageBlocked(started.reason);
      }

      const result = await execute(
        {
          getAgent: async () => agent,
          getModel: () => dependencies.agentStore.getActiveModel(),
          getKnowledge: () =>
            dependencies.knowledgeService.getRetrievalWorkspace(),
          getContent: () => dependencies.contentService.getPublished(),
          invokeModel: callOpenAICompatibleModel,
        },
        input,
      );
      const status =
        result.mode === "demo"
          ? "demo"
          : result.ok
            ? "success"
            : result.code === "model-unavailable"
              ? "error"
              : "blocked";
      await dependencies.runtimeStore.finish(started.runId, {
        status,
        mode: result.mode,
        modelName: result.meta.modelName,
        retrievalCount: result.meta.retrievalCount,
        latencyMs: result.meta.latencyMs,
        totalTokens: result.meta.usage?.totalTokens ?? 0,
        usage: result.meta.usage,
        nextAction: result.nextAction,
      });
      return result;
    },

    async testDraft(question) {
      const workspace =
        await dependencies.agentStore.getAdminWorkspace();
      return execute(
        {
          getAgent: async () => workspace.draft,
          getModel: () => dependencies.agentStore.getActiveModel(),
          getKnowledge: () =>
            dependencies.knowledgeService.getRetrievalWorkspace(),
          getContent: () => dependencies.contentService.getPublished(),
          invokeModel: callOpenAICompatibleModel,
        },
        {
          question,
          history: [],
          actor: {
            tier: "owner",
            allowedBaseIds: workspace.draft.knowledgeBaseIds,
            visitorId: "admin-test",
          },
          adminDebug: true,
        },
      );
    },
  };
}

let singleton: ChatService | undefined;

export function getChatService() {
  singleton ??= createChatService({
    agentStore: getAgentStore(),
    runtimeStore: getRuntimeStore(),
    knowledgeService: getKnowledgeService(),
    contentService: getContentService(),
  });
  return singleton;
}
