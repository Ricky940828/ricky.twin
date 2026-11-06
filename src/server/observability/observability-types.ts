import type { ChatActorTier, ChatNextAction } from "@/server/chat/chat-types";

export interface ObservabilitySettings {
  transcriptEnabled: boolean;
  retentionDays: number;
}

export type ObservabilityAiRunStatus =
  | "success"
  | "error"
  | "blocked"
  | "demo"
  | "pending";

export interface RecordAiRunInput {
  id: string;
  requestId?: string;
  visitorId: string;
  sessionId?: string;
  tier: ChatActorTier;
  question: string;
  answer?: string;
  createdAt?: string;
  completedAt?: string;
  status: ObservabilityAiRunStatus;
  mode?: "live" | "demo" | "blocked";
  configuredModel?: string;
  actualModel?: string;
  providerRequestId?: string;
  retrievalCount?: number;
  contextBudgetTokens?: number;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  firstTokenMs?: number;
  latencyMs?: number;
  attempts?: number;
  errorType?: string;
  nextAction?: ChatNextAction;
}

export interface AiRunSummary {
  id: string;
  requestId?: string;
  visitorId: string;
  sessionId?: string;
  tier: ChatActorTier;
  questionPreview: string;
  createdAt: string;
  completedAt?: string;
  status: ObservabilityAiRunStatus;
  mode?: "live" | "demo" | "blocked";
  configuredModel?: string;
  actualModel?: string;
  providerRequestIdSuffix?: string;
  retrievalCount: number;
  contextBudgetTokens?: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  firstTokenMs?: number;
  latencyMs?: number;
  attempts: number;
  errorType?: string;
  nextAction?: ChatNextAction;
  transcriptAvailable: boolean;
}

export interface AiRunDetail extends AiRunSummary {
  question?: string;
  answer?: string;
}

export interface RecordBehaviorInput {
  eventType: string;
  visitorId: string;
  sessionId?: string;
  path: string;
  section?: string;
  target?: string;
  metadata?: Record<string, string | number | boolean | null>;
  createdAt?: string;
}

export interface BehaviorEvent extends RecordBehaviorInput {
  id: string;
  createdAt: string;
}

export interface RecordRequestInput {
  requestId: string;
  method: string;
  route: string;
  status: number;
  durationMs: number;
  errorType?: string;
  actor: "anonymous" | "authenticated" | "admin" | "system";
  visitorId?: string;
  createdAt?: string;
}

export interface RequestLog extends RecordRequestInput {
  id: string;
  createdAt: string;
}

export interface SystemProbeResult {
  uptimeSeconds: number;
  memoryBytes: number;
  heapBytes: number;
  eventLoopUtilization: number;
  diskFreeBytes: number;
}

export interface SystemSample extends SystemProbeResult {
  id: string;
  createdAt: string;
  dbSizeBytes: number;
  pendingRuns: number;
}

export interface ObservabilityOverview {
  aiRuns: number;
  successfulAiRuns: number;
  failedAiRuns: number;
  totalTokens: number;
  uniqueVisitors: number;
  behaviorEvents: number;
  requests: number;
  requestErrors: number;
}

export interface ObservabilityDashboard {
  settings: ObservabilitySettings;
  rangeDays: number;
  overview: ObservabilityOverview;
  recentAiRuns: AiRunSummary[];
  recentBehaviorEvents: BehaviorEvent[];
  recentRequests: RequestLog[];
  systemSamples: SystemSample[];
  alerts: string[];
}

export interface CleanupResult {
  aiRuns: number;
  behaviorEvents: number;
  requestLogs: number;
  systemSamples: number;
}

