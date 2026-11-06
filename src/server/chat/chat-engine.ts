import type { SiteContent } from "@/content/types";
import { callOpenAICompatibleModel } from "@/server/agent/model-adapter";
import type {
  AgentConfig,
  ResolvedModelConnection,
  UnifiedModelResponse,
} from "@/server/agent/agent-types";
import { retrieveKnowledge } from "@/server/knowledge/knowledge-retriever";
import type { KnowledgeWorkspace } from "@/server/knowledge/knowledge-types";
import {
  estimateTextTokens,
  resolveContextTokenBudget,
} from "@/server/token-budget";

import { compileAgentPrompt } from "./agent-prompt";
import { buildPublicProfile } from "./public-profile";
import type {
  ChatInput,
  ChatNextAction,
  ChatResult,
} from "./chat-types";

type ModelInvoker = (
  connection: ResolvedModelConnection,
  request: Parameters<typeof callOpenAICompatibleModel>[1],
) => Promise<UnifiedModelResponse>;

export interface ChatEngineDependencies {
  getAgent(): Promise<AgentConfig>;
  getModel(): Promise<ResolvedModelConnection | null>;
  getKnowledge(): Promise<KnowledgeWorkspace>;
  getContent(): Promise<SiteContent>;
  invokeModel?: ModelInvoker;
  now?: () => number;
}

function toolEnabled(agent: AgentConfig, id: string) {
  return agent.tools.some((tool) => tool.id === id && tool.enabled);
}

export function sanitizeChatFragment(value: string) {
  return value
    .replace(
      /<(think|analysis)>[\s\S]*?<\/\1>/gi,
      "",
    )
    .replace(/<(think|analysis)>[\s\S]*$/gi, "")
    .replace(/<\/?(?:think|analysis)>/gi, "")
    .replace(/\/Users\/[^\s，。；;！!？?]+/g, "[已隐藏]")
    .replace(
      /(?:00-工作台|我的知识库)\/[^\s，。；;！!？?]+/g,
      "[已隐藏]",
    )
    .replace(/\bsk-[A-Za-z0-9_-]{12,}\b/g, "[已隐藏]")
    .replace(
      /\b(?:api[_ -]?key|secret)\s*[:：=]\s*\S+/gi,
      "[已隐藏]",
    );
}

function sanitizeAnswer(value: string) {
  return sanitizeChatFragment(value)
    .trim()
    .slice(0, 12_000);
}

function nextAction(
  agent: AgentConfig,
  question: string,
  hasDeniedKnowledge: boolean,
): ChatNextAction {
  const wantsRestrictedDetail =
    /具体|内部|原始|证据|费率|参数|底稿|盈利测算|敏感|合同|名单/.test(
      question,
    );
  if (
    hasDeniedKnowledge &&
    wantsRestrictedDetail &&
    toolEnabled(agent, "open-access-request")
  ) {
    return "request-access";
  }
  if (
    /合作|岗位|招聘|咨询|联系|沟通|方案服务/.test(question) &&
    toolEnabled(agent, "open-lead-form")
  ) {
    return "leave-contact";
  }
  return "none";
}

function blocked(
  code: ChatResult["code"],
  answer: string,
  latencyMs: number,
): ChatResult {
  return {
    ok: false,
    code,
    message: answer,
    mode: "blocked",
    answer,
    nextAction: "none",
    meta: { retrievalCount: 0, latencyMs },
  };
}

export async function runChat(
  dependencies: ChatEngineDependencies,
  input: ChatInput,
): Promise<ChatResult> {
  const now = dependencies.now ?? Date.now;
  const startedAt = now();
  const agent = await dependencies.getAgent();
  const question =
    typeof input.question === "string" ? input.question.trim() : "";

  if (!question) {
    return blocked(
      "input-empty",
      "请输入一个具体问题后再发送。",
      Math.max(0, now() - startedAt),
    );
  }
  if (question.length > agent.usage.maxInputChars) {
    return blocked(
      "input-too-long",
      `本次输入超过 ${agent.usage.maxInputChars} 字，请精简后重新发送。`,
      Math.max(0, now() - startedAt),
    );
  }

  const model = await dependencies.getModel();
  if (!model) {
    return {
      ok: true,
      mode: "demo",
      answer:
        "当前 AI 会客厅尚未连接可用模型，因此这次没有生成正式回答。你仍可浏览公开的职业路线和项目内容；管理员完成模型连接并设为主模型后，此处会自动切换为实时回答。",
      nextAction: "none",
      boundary: "当前为透明演示状态，不是大模型生成结果。",
      meta: {
        retrievalCount: 0,
        latencyMs: Math.max(0, now() - startedAt),
      },
    };
  }

  const canReadProfile = toolEnabled(agent, "read-public-profile");
  const canRetrieve = toolEnabled(
    agent,
    "retrieve-authorized-knowledge",
  );
  const [content, knowledge] = await Promise.all([
    canReadProfile ? dependencies.getContent() : Promise.resolve(null),
    canRetrieve
      ? dependencies.getKnowledge()
      : Promise.resolve(null),
  ]);
  const publicProfile = content ? buildPublicProfile(content) : "";
  const historyLimit = Math.max(0, agent.usage.maxSessionTurns * 2);
  const history = (Array.isArray(input.history) ? input.history : [])
    .filter(
      (message) =>
        (message.role === "user" || message.role === "assistant") &&
        typeof message.content === "string" &&
        message.content.trim(),
    )
    .slice(-historyLimit)
    .map((message) => ({
      role: message.role,
      content: message.content.slice(0, agent.usage.maxInputChars),
    }));
  const outputReserveTokens = Math.min(
    model.maxOutputTokens,
    agent.usage.maxOutputTokens,
  );
  const baseSystemPrompt = compileAgentPrompt({
    agent,
    publicProfile,
    knowledgeContext: "",
    runtimeModel: {
      name: model.name,
      modelId: model.modelId,
    },
  });
  const usedInputTokens =
    estimateTextTokens(baseSystemPrompt) +
    estimateTextTokens(question) +
    history.reduce(
      (total, message) => total + estimateTextTokens(message.content),
      0,
    ) +
    (history.length + 1) * 8;
  const contextBudgetTokens = resolveContextTokenBudget({
    mode: agent.retrieval.contextBudgetMode,
    customContextTokens: agent.retrieval.customContextTokens,
    contextWindowTokens: model.contextWindowTokens,
    usedInputTokens,
    outputReserveTokens,
  });
  const retrieval = knowledge
    ? retrieveKnowledge(knowledge, {
        query: question,
        allowedBaseIds: input.actor.allowedBaseIds,
        owner: input.actor.tier === "owner",
        baseIds: agent.knowledgeBaseIds,
        limit: agent.retrieval.maxRetrievedChunks,
        maxTokens: contextBudgetTokens,
      })
    : { matches: [], context: "", deniedBaseIds: [] };
  const action = nextAction(
    agent,
    question,
    retrieval.deniedBaseIds.length > 0,
  );

  try {
    const response = await (
      dependencies.invokeModel ?? callOpenAICompatibleModel
    )(
      {
        ...model,
        maxOutputTokens: outputReserveTokens,
      },
      {
        system: compileAgentPrompt({
          agent,
          publicProfile,
          knowledgeContext: retrieval.context,
          runtimeModel: {
            name: model.name,
            modelId: model.modelId,
          },
        }),
        messages: [
          ...history,
          { role: "user", content: question },
        ],
      },
    );
    const debugNames = input.adminDebug
      ? Array.from(
          new Set(retrieval.matches.map((match) => match.baseName)),
        )
      : undefined;
    return {
      ok: true,
      mode: "live",
      answer: sanitizeAnswer(response.text),
      nextAction: action,
      boundary:
        action === "request-access"
          ? agent.prompt.permissionBoundary
          : undefined,
      meta: {
        retrievalCount: retrieval.matches.length,
        contextBudgetTokens,
        latencyMs: Math.max(0, now() - startedAt),
        modelName: response.providerModelId
          ? `${model.name}（实际 ${response.providerModelId}）`
          : model.name,
        configuredModel: model.name,
        actualModel: response.providerModelId ?? model.modelId,
        providerRequestId: response.providerRequestId,
        firstTokenMs: response.firstTokenMs,
        attempts: response.attempts,
        usage: response.usage,
        knowledgeBaseNames: debugNames,
      },
    };
  } catch (error) {
    console.warn(
      "[chat] model invocation failed:",
      error instanceof Error ? error.message : "unknown model error",
    );
    const result = blocked(
      "model-unavailable",
      "数字分身暂时无法完成回答，请稍后再试，或先浏览公开职业与项目内容。",
      Math.max(0, now() - startedAt),
    );
    result.meta.errorType =
      error instanceof Error ? error.name : "UnknownError";
    return result;
  }
}
