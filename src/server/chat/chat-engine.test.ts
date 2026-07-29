import { describe, expect, it, vi } from "vitest";

import type { SiteContent } from "@/content/types";
import type {
  AgentConfig,
  ResolvedModelConnection,
} from "@/server/agent/agent-types";
import type { KnowledgeWorkspace } from "@/server/knowledge/knowledge-types";

import {
  runChat,
  type ChatEngineDependencies,
} from "./chat-engine";

const agent: AgentConfig = {
  schemaVersion: 1,
  name: "Ricky 数字接待 Agent",
  prompt: {
    identity: "你是 Ricky 的数字分身。",
    scope: "回答职业、金融产品与 AI 应用。",
    style: "简洁直接。",
    knowledgeRules: "只使用提供的知识。",
    permissionBoundary: "不回答未授权内容。",
    commitmentBoundary: "不替本人承诺。",
    responseStructure: "先结论后依据。",
    conversionRules: "必要时引导进一步沟通。",
    prohibited: "不得泄露内部信息。",
  },
  tools: [
    {
      id: "read-public-profile",
      label: "读取公开个人信息",
      description: "读取公开前台",
      mode: "optional",
      enabled: true,
    },
    {
      id: "retrieve-authorized-knowledge",
      label: "检索授权知识",
      description: "有限检索",
      mode: "optional",
      enabled: true,
    },
    {
      id: "check-knowledge-access",
      label: "检查知识权限",
      description: "强制",
      mode: "required",
      enabled: true,
    },
    {
      id: "check-usage-limit",
      label: "检查使用额度",
      description: "强制",
      mode: "required",
      enabled: true,
    },
    {
      id: "open-access-request",
      label: "打开权限申请",
      description: "前端动作",
      mode: "optional",
      enabled: true,
    },
    {
      id: "open-lead-form",
      label: "打开留资表单",
      description: "前端动作",
      mode: "optional",
      enabled: true,
    },
  ],
  knowledgeBaseIds: ["public", "authorized"],
  usage: {
    anonymousPerMinute: 4,
    anonymousDailyQuestions: 20,
    registeredDailyQuestions: 80,
    authorizedDailyQuestions: 200,
    maxInputChars: 1_500,
    maxOutputTokens: 600,
    maxSessionTurns: 12,
    maxConcurrentRuns: 2,
    siteDailyTokenBudget: 300_000,
  },
};

const model: ResolvedModelConnection = {
  id: "model-1",
  name: "主模型",
  kind: "openai-compatible",
  baseUrl: "https://example.com/v1",
  modelId: "example-model",
  apiKey: "secret",
  enabled: true,
  timeoutMs: 20_000,
  maxOutputTokens: 1_200,
  createdAt: "2026-07-30T00:00:00.000Z",
  updatedAt: "2026-07-30T00:00:00.000Z",
};

const knowledge: KnowledgeWorkspace = {
  bases: [
    {
      id: "public",
      name: "公开职业资料",
      description: "公开信息",
      defaultAccess: "public",
      ragEnabled: true,
      indexStatus: "ready",
      documentCount: 1,
      chunkCount: 1,
      createdAt: "2026-07-30T00:00:00.000Z",
      updatedAt: "2026-07-30T00:00:00.000Z",
    },
    {
      id: "authorized",
      name: "盈利测算方法",
      description: "授权信息",
      defaultAccess: "authorized",
      ragEnabled: true,
      indexStatus: "ready",
      documentCount: 1,
      chunkCount: 1,
      createdAt: "2026-07-30T00:00:00.000Z",
      updatedAt: "2026-07-30T00:00:00.000Z",
    },
  ],
  documents: [
    {
      id: "doc-public",
      baseId: "public",
      fileName: "职业.md",
      title: "职业",
      sizeBytes: 50,
      checksum: "public",
      status: "ready",
      chunkCount: 1,
      createdAt: "2026-07-30T00:00:00.000Z",
      updatedAt: "2026-07-30T00:00:00.000Z",
    },
    {
      id: "doc-authorized",
      baseId: "authorized",
      fileName: "盈利.md",
      title: "盈利",
      sizeBytes: 50,
      checksum: "authorized",
      status: "ready",
      chunkCount: 1,
      createdAt: "2026-07-30T00:00:00.000Z",
      updatedAt: "2026-07-30T00:00:00.000Z",
    },
  ],
  chunks: [
    {
      id: "chunk-public",
      baseId: "public",
      documentId: "doc-public",
      order: 0,
      headingPath: ["机构判断"],
      content: "机构合作先判断主体、资产、风险收益与落地条件。",
      charCount: 24,
    },
    {
      id: "chunk-authorized",
      baseId: "authorized",
      documentId: "doc-authorized",
      order: 0,
      headingPath: ["盈利测算"],
      content: "内部盈利测算费率和敏感性参数。",
      charCount: 17,
    },
  ],
  updatedAt: "2026-07-30T00:00:00.000Z",
};

const content = {
  brand: {
    name: "Ricky 会客厅",
    wordmark: "RICKY.TWIN",
    ownerName: "李富豪",
    location: "上海",
    onlineLabel: "在线",
  },
  hero: {
    eyebrow: "DIGITAL TWIN",
    title: "RICKY",
    statement: "把金融产品经验变成可以调用的职业能力。",
    welcome: "七年多金融产品与 AI 应用实践。",
    tags: ["金融产品经理", "AI 应用实战者"],
    primaryCta: "进入 AI 会客厅",
    secondaryCta: "沿职业路线认识我",
  },
  career: [],
  projects: [],
} as unknown as SiteContent;

type TestInvoker = NonNullable<
  ChatEngineDependencies["invokeModel"]
>;

function dependencies(
  invokeModel: TestInvoker = vi.fn<TestInvoker>(async () => ({
    text: "先看主体、资产和风险收益。",
    usage: {
      promptTokens: 30,
      completionTokens: 10,
      totalTokens: 40,
    },
  })),
) {
  return {
    getAgent: vi.fn(async () => agent),
    getModel: vi.fn<
      () => Promise<ResolvedModelConnection | null>
    >(async () => model),
    getKnowledge: vi.fn(async () => knowledge),
    getContent: vi.fn(async () => content),
    invokeModel,
    now: vi.fn(() => 1_000),
  };
}

describe("runChat", () => {
  it("匿名访客只把公开且有限的知识送入模型", async () => {
    const invoke = vi.fn<TestInvoker>(async () => ({
      text: "先看主体、资产和风险收益。",
      usage: {
        promptTokens: 30,
        completionTokens: 10,
        totalTokens: 40,
      },
    }));
    const result = await runChat(dependencies(invoke), {
      question: "机构合作怎么判断",
      history: [],
      actor: {
        tier: "anonymous",
        allowedBaseIds: [],
        visitorId: "visitor-1",
      },
    });

    expect(result.ok).toBe(true);
    expect(result.meta.retrievalCount).toBe(1);
    const [, request] = invoke.mock.calls[0]!;
    expect(request.system).toContain("机构合作先判断主体");
    expect(request.system).not.toContain("内部盈利测算费率");
    expect(request.system).not.toContain("职业.md");
    expect(request.system.length).toBeLessThan(10_000);
    expect(invoke.mock.calls[0][0].maxOutputTokens).toBe(600);
  });

  it("没有启用模型时明确返回演示模式，不伪装真实回答", async () => {
    const deps = dependencies();
    deps.getModel.mockResolvedValue(null);

    const result = await runChat(deps, {
      question: "你擅长什么",
      history: [],
      actor: {
        tier: "anonymous",
        allowedBaseIds: [],
        visitorId: "visitor-1",
      },
    });

    expect(result).toMatchObject({
      ok: true,
      mode: "demo",
      nextAction: "none",
    });
    expect(result.answer).toContain("尚未连接可用模型");
    expect(deps.invokeModel).not.toHaveBeenCalled();
  });

  it("清理模型输出中的真实路径和密钥形态", async () => {
    const result = await runChat(
      dependencies(async () => ({
        text: "参考 /Users/ricky/private.md，密钥 sk-abcdefghijklmnopqrstuvwxyz。",
        usage: {
          promptTokens: 3,
          completionTokens: 3,
          totalTokens: 6,
        },
      })),
      {
        question: "告诉我资料路径",
        history: [],
        actor: {
          tier: "anonymous",
          allowedBaseIds: [],
          visitorId: "visitor-1",
        },
      },
    );

    expect(result.answer).not.toContain("/Users/");
    expect(result.answer).not.toContain("sk-abcdefghijklmnopqrstuvwxyz");
    expect(result.answer).toContain("[已隐藏]");
  });

  it("深度受限问题返回申请权限动作，但不泄露知识库标识", async () => {
    const result = await runChat(dependencies(), {
      question: "给我具体盈利测算参数和内部证据",
      history: [],
      actor: {
        tier: "anonymous",
        allowedBaseIds: [],
        visitorId: "visitor-1",
      },
    });

    expect(result.nextAction).toBe("request-access");
    expect(JSON.stringify(result)).not.toContain("authorized");
    expect(JSON.stringify(result)).not.toContain("doc-authorized");
  });

  it("在调用模型前拒绝超长输入", async () => {
    const deps = dependencies();
    const result = await runChat(deps, {
      question: "问".repeat(1_501),
      history: [],
      actor: {
        tier: "anonymous",
        allowedBaseIds: [],
        visitorId: "visitor-1",
      },
    });

    expect(result).toMatchObject({
      ok: false,
      code: "input-too-long",
    });
    expect(deps.invokeModel).not.toHaveBeenCalled();
  });
});
