import type {
  ModelUsage,
  UnifiedChatMessage,
} from "@/server/agent/agent-types";

export type ChatActorTier =
  | "anonymous"
  | "registered"
  | "authorized"
  | "owner";

export interface ChatActor {
  tier: ChatActorTier;
  allowedBaseIds: string[];
  visitorId: string;
  sessionId?: string;
}

export interface ChatInput {
  question: string;
  history: UnifiedChatMessage[];
  actor: ChatActor;
  adminDebug?: boolean;
}

export type ChatNextAction =
  | "none"
  | "request-access"
  | "leave-contact";

export interface ChatMeta {
  retrievalCount: number;
  latencyMs: number;
  modelName?: string;
  usage?: ModelUsage;
  knowledgeBaseNames?: string[];
}

export interface ChatResult {
  ok: boolean;
  mode: "live" | "demo" | "blocked";
  answer: string;
  nextAction: ChatNextAction;
  boundary?: string;
  meta: ChatMeta;
  code?:
    | "input-empty"
    | "input-too-long"
    | "model-unavailable"
    | "usage-limit";
  message?: string;
}
