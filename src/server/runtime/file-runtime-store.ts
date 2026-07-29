import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";

import {
  decryptSecret,
  encryptSecret,
} from "@/server/agent/secret-box";

import {
  RuntimeStoreError,
  type RuntimeStore,
} from "./runtime-store";
import type {
  BeginRuntimeResult,
  RuntimeLead,
  RuntimeRun,
  RuntimeVisit,
  RuntimeWorkspace,
} from "./runtime-types";

export interface FileRuntimeStoreOptions {
  dataDir?: string;
  now?: () => Date;
  id?: (prefix: string) => string;
  maxRuns?: number;
  maxVisits?: number;
  maxLeads?: number;
  secret?: string;
}

interface StoredRuntimeLead extends Omit<RuntimeLead, "contact"> {
  contactCiphertext: string;
}

interface StoredRuntimeWorkspace {
  runs: RuntimeRun[];
  visits: RuntimeVisit[];
  leads: StoredRuntimeLead[];
  updatedAt: string;
  warnings?: string[];
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

function parseWorkspace(
  value: unknown,
): StoredRuntimeWorkspace | undefined {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value)
  ) {
    return undefined;
  }
  const candidate = value as Partial<StoredRuntimeWorkspace>;
  if (!Array.isArray(candidate.runs) || typeof candidate.updatedAt !== "string") {
    return undefined;
  }
  candidate.visits = Array.isArray(candidate.visits)
    ? candidate.visits
    : [];
  candidate.leads = Array.isArray(candidate.leads)
    ? candidate.leads
    : [];
  return candidate as StoredRuntimeWorkspace;
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
  const makeId =
    options.id ?? ((prefix: string) => `${prefix}-${randomUUID()}`);
  const maxRuns = Math.max(100, options.maxRuns ?? 2_000);
  const maxVisits = Math.max(100, options.maxVisits ?? 5_000);
  const maxLeads = Math.max(50, options.maxLeads ?? 1_000);
  const secret =
    options.secret ??
    process.env.RICKY_SECRETS_KEY ??
    process.env.RICKY_ADMIN_SESSION_SECRET ??
    "ricky-local-development-secret-change-before-production";
  const runtimeDir = join(dataDir, "runtime");
  const workspacePath = join(runtimeDir, "workspace.json");
  const activeRuns = new Set<string>();
  let queue: Promise<unknown> = Promise.resolve();

  const seed = (): StoredRuntimeWorkspace => ({
    runs: [],
    visits: [],
    leads: [],
    updatedAt: now().toISOString(),
  });

  const atomicWrite = async (workspace: StoredRuntimeWorkspace) => {
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

  const safeWorkspace = (
    workspace: StoredRuntimeWorkspace,
  ): RuntimeWorkspace => {
    const warnings = [...(workspace.warnings ?? [])];
    const leads = workspace.leads.map((lead) => {
      const { contactCiphertext, ...base } = lead;
      try {
        return {
          ...base,
          contact: decryptSecret(contactCiphertext, secret),
        };
      } catch {
        warnings.push(`线索 ${lead.id} 的联系方式无法解密。`);
        return { ...base, contact: "[无法解密]" };
      }
    });
    return structuredClone({
      runs: workspace.runs,
      visits: workspace.visits,
      leads,
      updatedAt: workspace.updatedAt,
      warnings: warnings.length ? Array.from(new Set(warnings)) : undefined,
    });
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

        const runId = makeId("run");
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
        return safeWorkspace(workspace);
      });
    },

    async recordVisit(input) {
      return exclusive(async () => {
        const workspace = await readOrSeed();
        const timestamp = now().toISOString();
        const path = input.path.trim().slice(0, 200);
        workspace.visits.push({
          id: makeId("visit"),
          visitorId: input.visitorId.slice(0, 96),
          path: path.startsWith("/") ? path : "/",
          referer: input.referer?.trim().slice(0, 300),
          userAgentGroup:
            input.userAgentGroup.trim().slice(0, 80) || "Unknown",
          authenticated: Boolean(input.authenticated),
          createdAt: timestamp,
        });
        workspace.visits = workspace.visits.slice(-maxVisits);
        workspace.updatedAt = timestamp;
        await atomicWrite(workspace);
        return safeWorkspace(workspace);
      });
    },

    async createLead(input) {
      return exclusive(async () => {
        if (!input.consent) {
          throw new RuntimeStoreError("请先同意仅用于本次沟通");
        }
        const name = input.name.trim().slice(0, 80);
        const contact = input.contact.trim().slice(0, 180);
        if (!name || !contact) {
          throw new RuntimeStoreError("称呼和联系方式不能为空");
        }
        const workspace = await readOrSeed();
        const timestampDate = now();
        const today = dayKey(timestampDate);
        const todayCount = workspace.leads.filter(
          (lead) =>
            lead.visitorId === input.visitorId &&
            dayKey(new Date(lead.createdAt)) === today,
        ).length;
        if (todayCount >= 5) {
          throw new RuntimeStoreError(
            "今天已提交过多次沟通意向，请稍后再试",
          );
        }
        const timestamp = timestampDate.toISOString();
        workspace.leads.push({
          id: makeId("lead"),
          visitorId: input.visitorId.slice(0, 96),
          name,
          role: input.role.trim().slice(0, 120),
          contactCiphertext: encryptSecret(contact, secret),
          direction: input.direction.trim().slice(0, 800),
          consent: true,
          status: "new",
          createdAt: timestamp,
          updatedAt: timestamp,
        });
        workspace.leads = workspace.leads.slice(-maxLeads);
        workspace.updatedAt = timestamp;
        await atomicWrite(workspace);
        return safeWorkspace(workspace);
      });
    },

    async updateLeadStatus(id, status) {
      return exclusive(async () => {
        if (!["new", "contacted", "closed"].includes(status)) {
          throw new RuntimeStoreError("线索状态无效");
        }
        const workspace = await readOrSeed();
        const lead = workspace.leads.find((item) => item.id === id);
        if (!lead) {
          throw new RuntimeStoreError("沟通线索不存在");
        }
        const timestamp = now().toISOString();
        lead.status = status;
        lead.updatedAt = timestamp;
        workspace.updatedAt = timestamp;
        await atomicWrite(workspace);
        return safeWorkspace(workspace);
      });
    },

    async getWorkspace() {
      return safeWorkspace(await readOrSeed());
    },
  };
}

let singleton: RuntimeStore | undefined;

export function getRuntimeStore() {
  singleton ??= createFileRuntimeStore();
  return singleton;
}
