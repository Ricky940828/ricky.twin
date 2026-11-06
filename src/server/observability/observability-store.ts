import type {
  AiRunDetail,
  CleanupResult,
  ObservabilityDashboard,
  ObservabilitySettings,
  RecordAiRunInput,
  RecordBehaviorInput,
  RecordRequestInput,
} from "./observability-types";

export interface ObservabilityStore {
  getSettings(): Promise<ObservabilitySettings>;
  updateSettings(
    input: Partial<ObservabilitySettings>,
  ): Promise<ObservabilitySettings>;
  recordAiRun(input: RecordAiRunInput): Promise<void>;
  getAiRunDetail(id: string): Promise<AiRunDetail | undefined>;
  recordBehavior(input: RecordBehaviorInput): Promise<void>;
  recordRequest(input: RecordRequestInput): Promise<void>;
  sampleSystem(): Promise<void>;
  getDashboard(rangeDays: number): Promise<ObservabilityDashboard>;
  cleanupExpired(): Promise<CleanupResult>;
  close(): void;
}

export class ObservabilityStoreError extends Error {}

