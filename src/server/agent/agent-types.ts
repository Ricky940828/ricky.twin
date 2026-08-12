export type AgentToolMode =
  | "required"
  | "optional"
  | "forbidden";

export type AgentToolId =
  | "read-public-profile"
  | "retrieve-authorized-knowledge"
  | "check-knowledge-access"
  | "check-usage-limit"
  | "open-access-request"
  | "open-lead-form"
  | "web-search"
  | "modify-knowledge"
  | "approve-access"
  | "send-external-message";

export interface AgentToolPolicy {
  id: AgentToolId;
  label: string;
  description: string;
  mode: AgentToolMode;
  enabled: boolean;
}

export interface AgentPromptProtocol {
  identity: string;
  scope: string;
  style: string;
  knowledgeRules: string;
  permissionBoundary: string;
  commitmentBoundary: string;
  responseStructure: string;
  conversionRules: string;
  prohibited: string;
}

export interface AgentUsagePolicy {
  anonymousPerMinute: number;
  anonymousDailyQuestions: number;
  registeredDailyQuestions: number;
  authorizedDailyQuestions: number;
  maxInputChars: number;
  maxOutputTokens: number;
  maxSessionTurns: number;
  maxConcurrentRuns: number;
  siteDailyTokenBudget: number;
}

export interface AgentRetrievalPolicy {
  contextBudgetMode: "automatic" | "custom" | "full";
  customContextTokens: number;
  maxRetrievedChunks: number;
}

export interface AgentConfig {
  schemaVersion: number;
  name: string;
  prompt: AgentPromptProtocol;
  tools: AgentToolPolicy[];
  knowledgeBaseIds: string[];
  retrieval: AgentRetrievalPolicy;
  usage: AgentUsagePolicy;
}

export interface AgentVersionMeta {
  id: string;
  createdAt: string;
  note: string;
}

export type ModelConnectionKind = "openai-compatible";

export interface ModelConnectionBase {
  id: string;
  name: string;
  kind: ModelConnectionKind;
  baseUrl: string;
  modelId: string;
  enabled: boolean;
  timeoutMs: number;
  contextWindowTokens: number;
  maxOutputTokens: number;
  createdAt: string;
  updatedAt: string;
  lastTestAt?: string;
  lastTestStatus?: "success" | "error";
  lastTestMessage?: string;
}

export interface StoredModelConnection extends ModelConnectionBase {
  apiKeyCiphertext: string;
}

export interface AdminModelConnection extends ModelConnectionBase {
  apiKeyConfigured: boolean;
  apiKeyHint: string;
}

export interface ResolvedModelConnection extends ModelConnectionBase {
  apiKey: string;
}

export interface ModelConnectionInput {
  id?: string;
  name: string;
  baseUrl: string;
  apiKey?: string;
  modelId: string;
  enabled: boolean;
  timeoutMs: number;
  contextWindowTokens: number;
  maxOutputTokens: number;
}

export interface StoredAgentWorkspace {
  draft: AgentConfig;
  published: AgentConfig;
  publishedVersion: AgentVersionMeta;
  versions: AgentVersionMeta[];
  models: StoredModelConnection[];
  activeModelId?: string;
  updatedAt: string;
  warnings?: string[];
}

export interface AdminAgentWorkspace {
  draft: AgentConfig;
  published: AgentConfig;
  publishedVersion: AgentVersionMeta;
  versions: AgentVersionMeta[];
  models: AdminModelConnection[];
  activeModelId?: string;
  updatedAt: string;
  warnings?: string[];
}

export interface UnifiedChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface UnifiedModelRequest {
  system: string;
  messages: UnifiedChatMessage[];
}

export interface ModelUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface UnifiedModelResponse {
  text: string;
  usage: ModelUsage;
  providerModelId?: string;
  providerRequestId?: string;
}
