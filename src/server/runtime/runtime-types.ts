import type {
  AgentUsagePolicy,
  ModelUsage,
} from "@/server/agent/agent-types";
import type {
  ChatActorTier,
  ChatNextAction,
} from "@/server/chat/chat-types";

export type RuntimeRunStatus =
  | "pending"
  | "success"
  | "error"
  | "demo"
  | "blocked";

export interface RuntimeRun {
  id: string;
  visitorId: string;
  sessionId?: string;
  tier: ChatActorTier;
  questionPreview: string;
  createdAt: string;
  completedAt?: string;
  status: RuntimeRunStatus;
  mode?: "live" | "demo" | "blocked";
  modelName?: string;
  retrievalCount?: number;
  latencyMs?: number;
  totalTokens?: number;
  nextAction?: ChatNextAction;
}

export interface RuntimeWorkspace {
  runs: RuntimeRun[];
  visits: RuntimeVisit[];
  leads: RuntimeLead[];
  updatedAt: string;
  warnings?: string[];
}

export interface RuntimeVisit {
  id: string;
  visitorId: string;
  path: string;
  referer?: string;
  userAgentGroup: string;
  authenticated: boolean;
  createdAt: string;
}

export type RuntimeLeadStatus = "new" | "contacted" | "closed";

export interface RuntimeLead {
  id: string;
  visitorId: string;
  name: string;
  role: string;
  contact: string;
  direction: string;
  consent: true;
  status: RuntimeLeadStatus;
  createdAt: string;
  updatedAt: string;
}

export interface RecordVisitInput {
  visitorId: string;
  path: string;
  referer?: string;
  userAgentGroup: string;
  authenticated: boolean;
}

export interface CreateLeadInput {
  visitorId: string;
  name: string;
  role: string;
  contact: string;
  direction: string;
  consent: boolean;
}

export interface BeginRuntimeInput {
  visitorId: string;
  sessionId?: string;
  tier: ChatActorTier;
  questionPreview: string;
  policy: AgentUsagePolicy;
}

export type BeginRuntimeResult =
  | { allowed: true; runId: string }
  | {
      allowed: false;
      reason: "minute" | "daily" | "concurrency" | "site-budget";
    };

export interface FinishRuntimeInput {
  status: Exclude<RuntimeRunStatus, "pending">;
  mode: "live" | "demo" | "blocked";
  retrievalCount: number;
  latencyMs: number;
  totalTokens: number;
  nextAction: ChatNextAction;
  modelName?: string;
  usage?: ModelUsage;
}
