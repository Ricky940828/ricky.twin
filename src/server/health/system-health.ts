import { getAgentStore } from "@/server/agent/agent-service";
import { resolveApplicationRuntime } from "@/server/app-runtime";
import { getContentService } from "@/server/content/content-service";
import { CURRENT_DATA_SCHEMA_VERSION, initializeApplicationDataRoot } from "@/server/data/data-schema";
import { getKnowledgeService } from "@/server/knowledge/knowledge-service";
import { getRuntimeStore } from "@/server/runtime/file-runtime-store";
import { getObservabilityStore } from "@/server/observability/sqlite-observability-store";

type StoreName = "content" | "knowledge" | "agent" | "runtime";

interface HealthOptions {
  version: string;
  commit: string;
  dataSchemaVersion: number;
  probes: Record<StoreName, () => Promise<unknown>>;
}

interface LivenessOptions {
  version: string;
  commit: string;
  uptime?: () => number;
  sampleSystem?: () => Promise<void>;
}

export function createSystemLivenessCheck(options: LivenessOptions) {
  return async () => {
    try {
      await options.sampleSystem?.();
    } catch (error) {
      console.warn(
        "[health] system sample failed:",
        error instanceof Error ? error.message : "unknown error",
      );
    }
    return {
      ok: true as const,
      version: options.version,
      commit: options.commit,
      uptimeSeconds: Math.max(
        0,
        Math.round((options.uptime ?? process.uptime)()),
      ),
    };
  };
}

export function createSystemHealthCheck(options: HealthOptions) {
  return async () => {
    const stores: Record<StoreName, "ready" | "error"> = {
      content: "ready", knowledge: "ready", agent: "ready", runtime: "ready",
    };
    await Promise.all(
      (Object.keys(options.probes) as StoreName[]).map(async (name) => {
        try { await options.probes[name](); } catch { stores[name] = "error"; }
      }),
    );
    return {
      ok: Object.values(stores).every((value) => value === "ready"),
      version: options.version,
      commit: options.commit,
      dataSchemaVersion: options.dataSchemaVersion,
      stores,
    };
  };
}

export function getSystemHealthCheck() {
  const runtime = resolveApplicationRuntime();
  return createSystemHealthCheck({
    version: runtime.version,
    commit: runtime.commit,
    dataSchemaVersion: CURRENT_DATA_SCHEMA_VERSION,
    probes: {
      content: async () => {
        await initializeApplicationDataRoot();
        return getContentService().getWorkspace();
      },
      knowledge: () => getKnowledgeService().getRetrievalWorkspace(),
      agent: () => getAgentStore().getAdminWorkspace(),
      runtime: () => getRuntimeStore().getWorkspace(),
    },
  });
}

export function getSystemLivenessCheck() {
  const runtime = resolveApplicationRuntime();
  return createSystemLivenessCheck({
    version: runtime.version,
    commit: runtime.commit,
    sampleSystem: () => getObservabilityStore().sampleSystem(),
  });
}
