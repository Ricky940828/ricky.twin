import type {
  AdminAgentWorkspace,
  AgentConfig,
  ModelConnectionInput,
  ResolvedModelConnection,
} from "./agent-types";

export class AgentStoreError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "invalid-input"
      | "not-found"
      | "secret-unavailable",
  ) {
    super(message);
  }
}

export interface AgentStore {
  getAdminWorkspace(): Promise<AdminAgentWorkspace>;
  getPublishedAgent(): Promise<AgentConfig>;
  saveAgentDraft(config: AgentConfig): Promise<AdminAgentWorkspace>;
  publishAgent(note: string): Promise<AdminAgentWorkspace>;
  upsertModel(
    input: ModelConnectionInput,
  ): Promise<AdminAgentWorkspace>;
  setActiveModel(id: string): Promise<AdminAgentWorkspace>;
  getActiveModel(): Promise<ResolvedModelConnection | null>;
  getResolvedModel(id: string): Promise<ResolvedModelConnection | null>;
  recordModelTest(
    id: string,
    result: { ok: boolean; message: string },
  ): Promise<AdminAgentWorkspace>;
}
