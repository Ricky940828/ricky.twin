export interface LoungeReply {
  answer: string;
  boundary?: string;
  nextAction?: "none" | "request-access" | "leave-contact";
}

export interface LoungeMessage {
  id: string;
  role: "assistant" | "visitor";
  text: string;
  boundary?: string;
  nextAction?: LoungeReply["nextAction"];
}

export interface LoungeState {
  status: "idle" | "thinking" | "answered";
  messages: LoungeMessage[];
  pendingQuestion?: string;
  pulseKey: number;
  hasPulsed: boolean;
  lastMode?: "live" | "demo" | "blocked";
}

export type LoungeEvent =
  | { type: "submit"; question: string }
  | { type: "resolve"; reply?: LoungeReply; mode?: LoungeState["lastMode"] }
  | { type: "fail"; message: string };

const REPLIES: Record<string, LoungeReply> = {
  institution: {
    answer:
      "我通常先看四件事：合作主体与履约能力是否真实，资产和客群是否适配，风险与收益能否在同一套结构里成立，以及系统、协议、运营能否把纸面方案真正执行。之后再把问题分成可补件、可试点、可通过结构调整修复和应停止四类，避免一开始就陷入零散材料。",
    nextAction: "none",
  },
  financeAi: {
    answer:
      "金融能力为 AI 提供的不是一批术语，而是判断框架和验收标准。我会先识别真实业务问题，再把机构评估、交易结构、盈利测算、产品规则和运营复盘拆成 AI 可完成的任务，组合知识检索、模型、工具和人工节点，最后用准确性、采纳率、时间节约与成本验证是否值得持续使用。",
    nextAction: "leave-contact",
  },
  workflowAi: {
    answer:
      "我会从一个真实流程开始：先画清参与者、输入、判断、动作和结果，再找出高频重复、信息分散或依赖经验的节点。AI 方案必须继续落到数据来源、知识边界、提示词、工具权限、人工兜底与验收指标，先做可操作的 Demo 或 PoC，再决定是否进入日常流程，而不是先堆一个复杂 Agent。",
    nextAction: "leave-contact",
  },
  knowledgeBase: {
    answer:
      "企业知识库的价值不是“文件都传上去了”，而是让正确的人在正确权限下获得可验证的答案。真正落地还需要内容分层、去重与版本、语义名称、检索结构、权限交集、引用边界、失败处理和持续更新。文件只是原料，稳定回答与业务行动才是产出。",
    boundary: "更具体的方法单元和案例需要相应知识权限。",
    nextAction: "request-access",
  },
  default: {
    answer:
      "这个问题可以继续拆解。为了给出更有用的回答，我会先确认你关注的是职业能力、金融产品、机构合作还是 AI 应用，再基于当前可访问的知识范围给出判断、处理路径和下一步建议。",
    nextAction: "none",
  },
};

function classifyQuestion(question: string) {
  if (question.includes("机构合作") || question.includes("值得推进")) {
    return "institution";
  }
  if (question.includes("金融能力") && question.includes("AI")) {
    return "financeAi";
  }
  if (
    question.includes("日常流程") ||
    question.includes("可执行、可验收")
  ) {
    return "workflowAi";
  }
  if (question.includes("知识库") || question.includes("文件上传")) {
    return "knowledgeBase";
  }
  return "default";
}

export function getSimulatedReply(question: string): LoungeReply {
  return REPLIES[classifyQuestion(question)];
}

export const initialLoungeState: LoungeState = {
  status: "idle",
  pulseKey: 0,
  hasPulsed: false,
  messages: [
    {
      id: "welcome",
      role: "assistant",
      text: "你好，我是 Ricky 的数字分身。可以先从职业路径、项目判断、金融产品或 AI 应用开始聊。",
      nextAction: "none",
    },
  ],
};

export function loungeReducer(
  state: LoungeState,
  event: LoungeEvent,
): LoungeState {
  switch (event.type) {
    case "submit": {
      const question = event.question.trim();
      if (!question || state.status === "thinking") {
        return state;
      }
      const messageNumber = state.messages.length + 1;
      return {
        ...state,
        status: "thinking",
        pendingQuestion: question,
        pulseKey: state.hasPulsed ? state.pulseKey : state.pulseKey + 1,
        hasPulsed: true,
        messages: [
          ...state.messages,
          {
            id: `visitor-${messageNumber}`,
            role: "visitor",
            text: question,
          },
        ],
      };
    }
    case "resolve": {
      if (!state.pendingQuestion || state.status !== "thinking") {
        return state;
      }
      const reply =
        event.reply ?? getSimulatedReply(state.pendingQuestion);
      return {
        ...state,
        status: "answered",
        pendingQuestion: undefined,
        lastMode: event.mode ?? state.lastMode,
        messages: [
          ...state.messages,
          {
            id: `assistant-${state.messages.length + 1}`,
            role: "assistant",
            text: reply.answer,
            boundary: reply.boundary,
            nextAction: reply.nextAction,
          },
        ],
      };
    }
    case "fail": {
      if (state.status !== "thinking") {
        return state;
      }
      return {
        ...state,
        status: "answered",
        pendingQuestion: undefined,
        lastMode: "blocked",
        messages: [
          ...state.messages,
          {
            id: `assistant-${state.messages.length + 1}`,
            role: "assistant",
            text: event.message,
            nextAction: "none",
          },
        ],
      };
    }
    default:
      return state;
  }
}
