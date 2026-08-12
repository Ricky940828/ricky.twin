import { getAgentStore } from "@/server/agent/agent-service";
import { resolveApplicationRuntime } from "@/server/app-runtime";
import { getContentService } from "@/server/content/content-service";
import { CURRENT_DATA_SCHEMA_VERSION, initializeApplicationDataRoot } from "@/server/data/data-schema";
import { getKnowledgeService } from "@/server/knowledge/knowledge-service";
import { getRuntimeStore } from "@/server/runtime/file-runtime-store";

type StoreName = "content" | "knowledge" | "agent" | "runtime";

interface HealthOptions {
  version: string;
  commit: string;
  dataSchemaVersion: number;
  probes: Record<StoreName, () => Promise<unknown>>;
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
