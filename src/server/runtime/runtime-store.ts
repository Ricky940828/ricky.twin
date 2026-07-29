import type {
  BeginRuntimeInput,
  BeginRuntimeResult,
  FinishRuntimeInput,
  RuntimeWorkspace,
} from "./runtime-types";

export interface RuntimeStore {
  begin(input: BeginRuntimeInput): Promise<BeginRuntimeResult>;
  finish(
    runId: string,
    input: FinishRuntimeInput,
  ): Promise<RuntimeWorkspace>;
  getWorkspace(): Promise<RuntimeWorkspace>;
}
