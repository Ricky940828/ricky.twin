import {
  getAgentStore,
} from "@/server/agent/agent-service";
import type { AgentStore } from "@/server/agent/agent-store";
import {
  callOpenAICompatibleModel,
  streamOpenAICompatibleModel,
} from "@/server/agent/model-adapter";
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
import type { FinishRuntimeInput } from "@/server/runtime/runtime-types";
import {
  getObservabilityStore,
} from "@/server/observability/sqlite-observability-store";
import type { ObservabilityStore } from "@/server/observability/observability-store";

import {
  runChat,
  sanitizeChatFragment,
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
  observabilityStore: ObservabilityStore;
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
  stream(
    input: ChatInput,
    onDelta: (delta: string) => void,
  ): Promise<ChatResult>;
  testDraft(question: string): Promise<ChatResult>;
}

type ModelInvoker = NonNullable<ChatEngineDependencies["invokeModel"]>;

function reasoningDeltaFilter() {
  const openingTags = ["<think>", "<analysis>"] as const;
  let buffered = "";
  let activeTag: "think" | "analysis" | null = null;

  const longestOpeningSuffix = (value: string) => {
    const lower = value.toLowerCase();
    let keep = 0;
    for (const tag of openingTags) {
      for (let length = 1; length < tag.length; length += 1) {
        if (lower.endsWith(tag.slice(0, length))) {
          keep = Math.max(keep, length);
        }
      }
    }
    return keep;
  };

  const consume = (delta: string, final = false) => {
    buffered += delta;
    let visible = "";

    while (buffered) {
      const lower = buffered.toLowerCase();
      if (activeTag) {
        const closingTag = `</${activeTag}>`;
        const closingIndex = lower.indexOf(closingTag);
        if (closingIndex >= 0) {
          buffered = buffered.slice(
            closingIndex + closingTag.length,
          );
          activeTag = null;
          continue;
        }
        if (final) {
          buffered = "";
          break;
        }
        buffered = buffered.slice(
          -Math.min(buffered.length, closingTag.length - 1),
        );
        break;
      }

      const openings = openingTags
        .map((tag) => ({ tag, index: lower.indexOf(tag) }))
        .filter((entry) => entry.index >= 0)
        .sort((left, right) => left.index - right.index);
      const opening = openings[0];
      if (opening) {
        visible += buffered.slice(0, opening.index);
        buffered = buffered.slice(opening.index + opening.tag.length);
        activeTag = opening.tag === "<think>" ? "think" : "analysis";
        continue;
      }
      if (final) {
        visible += buffered;
        buffered = "";
        break;
      }
      const keep = longestOpeningSuffix(buffered);
      visible += keep > 0 ? buffered.slice(0, -keep) : buffered;
      buffered = keep > 0 ? buffered.slice(-keep) : "";
      break;
    }
    return visible;
  };

  return {
    push(delta: string) {
      return consume(delta);
    },
    finish() {
      return consume("", true);
    },
  };
}

export function createSafeDeltaBuffer(
  onDelta: (delta: string) => void,
) {
  let pending = "";
  const reasoning = reasoningDeltaFilter();

  const emitThroughBoundary = () => {
    let lastBoundary = -1;
    const boundaries = /[\n。！？!?；;]/g;
    let match = boundaries.exec(pending);
    while (match) {
      lastBoundary = match.index + match[0].length;
      match = boundaries.exec(pending);
    }
    if (lastBoundary <= 0) {
      return;
    }
    const safe = sanitizeChatFragment(
      pending.slice(0, lastBoundary),
    );
    pending = pending.slice(lastBoundary);
    if (safe.trim()) {
      onDelta(safe);
    }
  };

  return {
    push(delta: string) {
      pending += reasoning.push(delta);
      emitThroughBoundary();
    },
    finish() {
      pending += reasoning.finish();
      const safe = sanitizeChatFragment(pending);
      pending = "";
      if (safe.trim()) {
        onDelta(safe);
      }
    },
  };
}

export function createChatService(
  dependencies: ChatServiceDependencies,
): ChatService {
  const execute = dependencies.run ?? runChat;

  const runTracked = async (
    input: ChatInput,
    invokeModel: ModelInvoker,
    partialAnswer?: () => string,
  ) => {
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

    let result: ChatResult | undefined;
    let failure: unknown;
    try {
      result = await execute(
        {
          getAgent: async () => agent,
          getModel: () => dependencies.agentStore.getActiveModel(),
          getKnowledge: () =>
            dependencies.knowledgeService.getRetrievalWorkspace(),
          getContent: () => dependencies.contentService.getPublished(),
          invokeModel,
        },
        input,
      );
      return result;
    } catch (error) {
      failure = error;
      throw error;
    } finally {
      const status: FinishRuntimeInput["status"] = failure
        ? "error"
        : result?.mode === "demo"
          ? "demo"
          : result?.ok
            ? "success"
            : result?.code === "model-unavailable"
              ? "error"
              : "blocked";
      const runtimeResult: FinishRuntimeInput = result
        ? {
            status,
            mode: result.mode,
            modelName: result.meta.modelName,
            retrievalCount: result.meta.retrievalCount,
            latencyMs: result.meta.latencyMs,
            totalTokens: result.meta.usage?.totalTokens ?? 0,
            usage: result.meta.usage,
            nextAction: result.nextAction,
          }
        : {
            status: "error" as const,
            mode: "blocked" as const,
            retrievalCount: 0,
            latencyMs: 0,
            totalTokens: 0,
            nextAction: "none" as const,
          };
      try {
        await dependencies.runtimeStore.finish(started.runId, runtimeResult);
      } catch (error) {
        console.warn(
          "[runtime] failed to finish tracked run:",
          error instanceof Error ? error.message : "unknown error",
        );
      }
      try {
        const visiblePartial = partialAnswer?.().trim();
        await dependencies.observabilityStore.recordAiRun({
          id: started.runId,
          requestId: input.requestId,
          visitorId: input.actor.visitorId,
          sessionId: input.actor.sessionId,
          tier: input.actor.tier,
          question: input.question,
          answer: visiblePartial || result?.answer,
          status,
          mode: result?.mode,
          configuredModel: result?.meta.configuredModel,
          actualModel: result?.meta.actualModel,
          providerRequestId: result?.meta.providerRequestId,
          retrievalCount: result?.meta.retrievalCount ?? 0,
          contextBudgetTokens: result?.meta.contextBudgetTokens,
          promptTokens: result?.meta.usage?.promptTokens ?? 0,
          completionTokens: result?.meta.usage?.completionTokens ?? 0,
          totalTokens: result?.meta.usage?.totalTokens ?? 0,
          firstTokenMs: result?.meta.firstTokenMs,
          latencyMs: result?.meta.latencyMs ?? 0,
          attempts: result?.meta.attempts ?? 1,
          errorType:
            result?.meta.errorType ??
            (failure instanceof Error ? failure.name : failure ? "UnknownError" : undefined),
          nextAction: result?.nextAction,
        });
      } catch (error) {
        console.warn(
          "[observability] AI run log failed:",
          error instanceof Error ? error.message : "unknown error",
        );
      }
    }
  };

  return {
    chat: (input) => runTracked(input, callOpenAICompatibleModel),

    async stream(input, onDelta) {
      let visibleAnswer = "";
      const safeStream = createSafeDeltaBuffer((delta) => {
        visibleAnswer += delta;
        onDelta(delta);
      });
      const result = await runTracked(
        input,
        (connection, request) =>
          streamOpenAICompatibleModel(
            connection,
            request,
            safeStream.push,
          ),
        () => visibleAnswer,
      );
      safeStream.finish();
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
    observabilityStore: getObservabilityStore(),
  });
  return singleton;
}
