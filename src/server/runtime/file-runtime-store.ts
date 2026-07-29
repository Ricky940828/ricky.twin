import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";

import type { RuntimeStore } from "./runtime-store";
import type {
  BeginRuntimeResult,
  RuntimeRun,
  RuntimeWorkspace,
} from "./runtime-types";

export interface FileRuntimeStoreOptions {
  dataDir?: string;
  now?: () => Date;
  id?: () => string;
  maxRuns?: number;
}

function dayKey(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function sanitizePreview(value: string) {
  return value
    .replace(/\bsk-[A-Za-z0-9_-]{8,}\b/g, "[已隐藏]")
    .replace(
      /\b(?:api[_ -]?key|secret)\s*[:：=]\s*\S+/gi,
      "[已隐藏]",
    )
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 160);
}

function parseWorkspace(value: unknown): RuntimeWorkspace | undefined {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value)
  ) {
    return undefined;
  }
  const candidate = value as Partial<RuntimeWorkspace>;
  if (!Array.isArray(candidate.runs) || typeof candidate.updatedAt !== "string") {
    return undefined;
  }
  return candidate as RuntimeWorkspace;
}

function tierDailyLimit(
  tier: RuntimeRun["tier"],
  policy: Parameters<RuntimeStore["begin"]>[0]["policy"],
) {
  if (tier === "owner") {
    return Number.MAX_SAFE_INTEGER;
  }
  if (tier === "authorized") {
    return policy.authorizedDailyQuestions;
  }
  if (tier === "registered") {
    return policy.registeredDailyQuestions;
  }
  return policy.anonymousDailyQuestions;
}

export function createFileRuntimeStore(
  options: FileRuntimeStoreOptions = {},
): RuntimeStore {
  const dataDir =
    options.dataDir ??
    process.env.RICKY_CONTENT_DATA_DIR ??
    join(process.cwd(), ".ricky-twin-data");
  const now = options.now ?? (() => new Date());
  const makeId = options.id ?? (() => `run-${randomUUID()}`);
  const maxRuns = Math.max(100, options.maxRuns ?? 2_000);
  const runtimeDir = join(dataDir, "runtime");
  const workspacePath = join(runtimeDir, "workspace.json");
  const activeRuns = new Set<string>();
  let queue: Promise<unknown> = Promise.resolve();

  const seed = (): RuntimeWorkspace => ({
    runs: [],
    updatedAt: now().toISOString(),
  });

  const atomicWrite = async (workspace: RuntimeWorkspace) => {
    await mkdir(runtimeDir, { recursive: true });
    const temporary = `${workspacePath}.tmp-${randomUUID()}`;
    await writeFile(
      temporary,
      `${JSON.stringify(workspace, null, 2)}\n`,
      "utf8",
    );
    await rename(temporary, workspacePath);
  };

  const readOrSeed = async () => {
    await mkdir(runtimeDir, { recursive: true });
    try {
      const parsed = parseWorkspace(
        JSON.parse(await readFile(workspacePath, "utf8")) as unknown,
      );
      if (parsed) {
        return parsed;
      }
    } catch (error) {
      const missing =
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === "ENOENT";
      if (!missing) {
        const recovered = seed();
        recovered.warnings = [
          "运行记录无法读取，已重新建立空白记录。",
        ];
        await atomicWrite(recovered);
        return recovered;
      }
    }
    const workspace = seed();
    await atomicWrite(workspace);
    return workspace;
  };

  const exclusive = <T>(operation: () => Promise<T>) => {
    const next = queue.then(operation, operation);
    queue = next.then(
      () => undefined,
      () => undefined,
    );
    return next;
  };

  return {
    async begin(input): Promise<BeginRuntimeResult> {
      return exclusive(async () => {
        const timestamp = now();
        const workspace = await readOrSeed();
        if (activeRuns.size >= input.policy.maxConcurrentRuns) {
          return { allowed: false, reason: "concurrency" };
        }
        const minuteAgo = timestamp.valueOf() - 60_000;
        const visitorRuns = workspace.runs.filter(
          (run) => run.visitorId === input.visitorId,
        );
        const recentCount = visitorRuns.filter(
          (run) => new Date(run.createdAt).valueOf() > minuteAgo,
        ).length;
        if (recentCount >= input.policy.anonymousPerMinute) {
          return { allowed: false, reason: "minute" };
        }
        const today = dayKey(timestamp);
        const dailyCount = visitorRuns.filter(
          (run) => dayKey(new Date(run.createdAt)) === today,
        ).length;
        if (
          dailyCount >= tierDailyLimit(input.tier, input.policy)
        ) {
          return { allowed: false, reason: "daily" };
        }
        const dailyTokens = workspace.runs
          .filter((run) => dayKey(new Date(run.createdAt)) === today)
          .reduce((sum, run) => sum + (run.totalTokens ?? 0), 0);
        if (dailyTokens >= input.policy.siteDailyTokenBudget) {
          return { allowed: false, reason: "site-budget" };
        }

        const runId = makeId();
        workspace.runs.push({
          id: runId,
          visitorId: input.visitorId,
          sessionId: input.sessionId,
          tier: input.tier,
          questionPreview: sanitizePreview(input.questionPreview),
          createdAt: timestamp.toISOString(),
          status: "pending",
        });
        workspace.runs = workspace.runs.slice(-maxRuns);
        workspace.updatedAt = timestamp.toISOString();
        delete workspace.warnings;
        activeRuns.add(runId);
        await atomicWrite(workspace);
        return { allowed: true, runId };
      });
    },

    async finish(runId, input) {
      return exclusive(async () => {
        const workspace = await readOrSeed();
        const run = workspace.runs.find((item) => item.id === runId);
        const timestamp = now().toISOString();
        if (run) {
          run.completedAt = timestamp;
          run.status = input.status;
          run.mode = input.mode;
          run.modelName = input.modelName;
          run.retrievalCount = input.retrievalCount;
          run.latencyMs = input.latencyMs;
          run.totalTokens = input.totalTokens;
          run.nextAction = input.nextAction;
        }
        workspace.updatedAt = timestamp;
        activeRuns.delete(runId);
        await atomicWrite(workspace);
        return structuredClone(workspace);
      });
    },

    async getWorkspace() {
      return structuredClone(await readOrSeed());
    },
  };
}

let singleton: RuntimeStore | undefined;

export function getRuntimeStore() {
  singleton ??= createFileRuntimeStore();
  return singleton;
}
