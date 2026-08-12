export const UPDATE_PHASES = [
  "idle",
  "requested",
  "backing_up",
  "pulling",
  "validating",
  "migrating",
  "restarting",
  "health_check",
  "succeeded",
  "rolling_back",
  "rolled_back",
  "failed",
] as const;

export type UpdatePhase = (typeof UPDATE_PHASES)[number];

export interface UpdateManifest {
  schemaVersion: 1;
  version: string;
  releaseTag: string;
  image: string;
  publishedAt: string;
  minimumDataSchemaVersion: number;
  maximumDataSchemaVersion: number;
  requiredUpdaterVersion: string;
  notes: string[];
}

export interface UpdateJob {
  id: string;
  action: "update" | "rollback";
  phase: UpdatePhase;
  requestedAt: string;
  updatedAt: string;
  fromVersion: string;
  targetVersion: string;
  targetImage?: string;
  backupId?: string;
  message: string;
}

export interface UpdateSystemStatus {
  currentVersion: string;
  currentCommit: string;
  dataSchemaVersion: number;
  updaterVersion: string | null;
  updaterEnabled: boolean;
  latestManifest: UpdateManifest | null;
  updateAvailable: boolean;
  compatible: boolean;
  compatibilityMessage: string;
  lastCheckedAt: string | null;
  lastBackupId: string | null;
  job: UpdateJob | null;
}

