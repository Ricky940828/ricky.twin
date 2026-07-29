import type {
  BeginRuntimeInput,
  BeginRuntimeResult,
  CreateLeadInput,
  FinishRuntimeInput,
  RecordVisitInput,
  RuntimeLeadStatus,
  RuntimeWorkspace,
} from "./runtime-types";

export class RuntimeStoreError extends Error {}

export interface RuntimeStore {
  begin(input: BeginRuntimeInput): Promise<BeginRuntimeResult>;
  finish(
    runId: string,
    input: FinishRuntimeInput,
  ): Promise<RuntimeWorkspace>;
  recordVisit(input: RecordVisitInput): Promise<RuntimeWorkspace>;
  createLead(input: CreateLeadInput): Promise<RuntimeWorkspace>;
  updateLeadStatus(
    id: string,
    status: RuntimeLeadStatus,
  ): Promise<RuntimeWorkspace>;
  getWorkspace(): Promise<RuntimeWorkspace>;
}
