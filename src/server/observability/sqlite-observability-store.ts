import { mkdirSync, statfsSync, statSync } from "node:fs";
import { join } from "node:path";
import { performance } from "node:perf_hooks";
import { randomUUID } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { decryptSecret, encryptSecret } from "@/server/agent/secret-box";
import {
  ObservabilityStoreError,
  type ObservabilityStore,
} from "./observability-store";
import type {
  AiRunDetail,
  AiRunSummary,
  BehaviorEvent,
  CleanupResult,
  ObservabilityDashboard,
  ObservabilitySettings,
  RecordAiRunInput,
  RequestLog,
  SystemProbeResult,
  SystemSample,
} from "./observability-types";

interface SqliteObservabilityStoreOptions {
  dataDir?: string;
  secret?: string;
  now?: () => Date;
  id?: (prefix: string) => string;
  systemProbe?: () => Promise<SystemProbeResult>;
  sampleIntervalMs?: number;
  cleanupIntervalMs?: number | false;
}

type SqliteRow = Record<string, string | number | null>;

const DEFAULT_SETTINGS: ObservabilitySettings = {
  transcriptEnabled: true,
  retentionDays: 30,
};

function finiteInteger(value: unknown, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.trunc(number) : fallback;
}

function optionalString(value: unknown) {
  return typeof value === "string" && value ? value : undefined;
}

function questionPreview(question: string) {
  return question
    .replace(/(api[-_ ]?key|secret|token)\s*[:=]\s*\S+/gi, "$1=[已隐藏]")
    .trim()
    .slice(0, 180);
}

function encryptedQuestionPlaceholder(question: string) {
  return `已加密问答（问题 ${Array.from(question).length} 字）`;
}

function providerRequestIdSuffix(value?: string) {
  if (!value) return undefined;
  return value.slice(-6);
}

function parseMetadata(value: unknown) {
  if (typeof value !== "string" || !value) return undefined;
  try {
    return JSON.parse(value) as Record<
      string,
      string | number | boolean | null
    >;
  } catch {
    return undefined;
  }
}

function toAiRunSummary(row: SqliteRow): AiRunSummary {
  return {
    id: String(row.id),
    requestId: optionalString(row.request_id),
    visitorId: String(row.visitor_id),
    sessionId: optionalString(row.session_id),
    tier: String(row.tier) as AiRunSummary["tier"],
    questionPreview: String(row.question_preview ?? ""),
    createdAt: String(row.created_at),
    completedAt: optionalString(row.completed_at),
    status: String(row.status) as AiRunSummary["status"],
    mode: optionalString(row.mode) as AiRunSummary["mode"],
    configuredModel: optionalString(row.configured_model),
    actualModel: optionalString(row.actual_model),
    providerRequestIdSuffix: optionalString(row.provider_request_suffix),
    retrievalCount: finiteInteger(row.retrieval_count),
    contextBudgetTokens:
      row.context_budget_tokens === null
        ? undefined
        : finiteInteger(row.context_budget_tokens),
    promptTokens: finiteInteger(row.prompt_tokens),
    completionTokens: finiteInteger(row.completion_tokens),
    totalTokens: finiteInteger(row.total_tokens),
    firstTokenMs:
      row.first_token_ms === null
        ? undefined
        : finiteInteger(row.first_token_ms),
    latencyMs:
      row.latency_ms === null ? undefined : finiteInteger(row.latency_ms),
    attempts: Math.max(1, finiteInteger(row.attempts, 1)),
    errorType: optionalString(row.error_type),
    nextAction: optionalString(row.next_action) as AiRunSummary["nextAction"],
    transcriptAvailable: Boolean(
      row.question_ciphertext || row.answer_ciphertext,
    ),
  };
}

function toBehaviorEvent(row: SqliteRow): BehaviorEvent {
  return {
    id: String(row.id),
    eventType: String(row.event_type),
    visitorId: String(row.visitor_id),
    sessionId: optionalString(row.session_id),
    path: String(row.path),
    section: optionalString(row.section),
    target: optionalString(row.target),
    metadata: parseMetadata(row.metadata_json),
    createdAt: String(row.created_at),
  };
}

function toRequestLog(row: SqliteRow): RequestLog {
  return {
    id: String(row.id),
    requestId: String(row.request_id),
    method: String(row.method),
    route: String(row.route),
    status: finiteInteger(row.status),
    durationMs: finiteInteger(row.duration_ms),
    errorType: optionalString(row.error_type),
    actor: String(row.actor) as RequestLog["actor"],
    visitorId: optionalString(row.visitor_id),
    createdAt: String(row.created_at),
  };
}

function toSystemSample(row: SqliteRow): SystemSample {
  return {
    id: String(row.id),
    createdAt: String(row.created_at),
    uptimeSeconds: Number(row.uptime_seconds),
    memoryBytes: finiteInteger(row.memory_bytes),
    heapBytes: finiteInteger(row.heap_bytes),
    eventLoopUtilization: Number(row.event_loop_utilization),
    diskFreeBytes: finiteInteger(row.disk_free_bytes),
    dbSizeBytes: finiteInteger(row.db_size_bytes),
    pendingRuns: finiteInteger(row.pending_runs),
  };
}

function defaultSystemProbe(dataDir: string): SystemProbeResult {
  const memory = process.memoryUsage();
  let diskFreeBytes = 0;
  try {
    const filesystem = statfsSync(dataDir);
    diskFreeBytes = Number(filesystem.bavail) * Number(filesystem.bsize);
  } catch {
    diskFreeBytes = 0;
  }
  return {
    uptimeSeconds: process.uptime(),
    memoryBytes: memory.rss,
    heapBytes: memory.heapUsed,
    eventLoopUtilization: performance.eventLoopUtilization().utilization,
    diskFreeBytes,
  };
}

export function createSqliteObservabilityStore(
  options: SqliteObservabilityStoreOptions = {},
): ObservabilityStore {
  const dataDir =
    options.dataDir ??
    process.env.RICKY_CONTENT_DATA_DIR ??
    join(process.cwd(), ".ricky-twin-data");
  const observabilityDir = join(dataDir, "observability");
  const databasePath = join(observabilityDir, "monitoring.sqlite");
  const secret =
    options.secret ??
    process.env.RICKY_SECRETS_KEY ??
    process.env.RICKY_ADMIN_SESSION_SECRET ??
    "ricky-local-development-secret-change-before-production";
  const now = options.now ?? (() => new Date());
  const makeId = options.id ?? ((prefix: string) => `${prefix}-${randomUUID()}`);
  const sampleIntervalMs = Math.max(1_000, options.sampleIntervalMs ?? 30_000);
  const systemProbe =
    options.systemProbe ?? (async () => defaultSystemProbe(dataDir));
  let lastSystemSampleAt = Number.NEGATIVE_INFINITY;
  let cleanupTimer: NodeJS.Timeout | undefined;

  mkdirSync(observabilityDir, { recursive: true });
  const database = new DatabaseSync(databasePath);
  database.exec("PRAGMA journal_mode = WAL");
  database.exec("PRAGMA foreign_keys = ON");
  database.exec("PRAGMA busy_timeout = 5000");
  database.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS ai_runs (
      id TEXT PRIMARY KEY,
      request_id TEXT,
      visitor_id TEXT NOT NULL,
      session_id TEXT,
      tier TEXT NOT NULL,
      question_preview TEXT NOT NULL,
      question_ciphertext TEXT,
      answer_ciphertext TEXT,
      created_at TEXT NOT NULL,
      completed_at TEXT,
      status TEXT NOT NULL,
      mode TEXT,
      configured_model TEXT,
      actual_model TEXT,
      provider_request_suffix TEXT,
      retrieval_count INTEGER NOT NULL DEFAULT 0,
      context_budget_tokens INTEGER,
      prompt_tokens INTEGER NOT NULL DEFAULT 0,
      completion_tokens INTEGER NOT NULL DEFAULT 0,
      total_tokens INTEGER NOT NULL DEFAULT 0,
      first_token_ms INTEGER,
      latency_ms INTEGER,
      attempts INTEGER NOT NULL DEFAULT 1,
      error_type TEXT,
      next_action TEXT
    );
    CREATE TABLE IF NOT EXISTS behavior_events (
      id TEXT PRIMARY KEY,
      event_type TEXT NOT NULL,
      visitor_id TEXT NOT NULL,
      session_id TEXT,
      path TEXT NOT NULL,
      section TEXT,
      target TEXT,
      metadata_json TEXT,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS request_logs (
      id TEXT PRIMARY KEY,
      request_id TEXT NOT NULL,
      method TEXT NOT NULL,
      route TEXT NOT NULL,
      status INTEGER NOT NULL,
      duration_ms INTEGER NOT NULL,
      error_type TEXT,
      actor TEXT NOT NULL,
      visitor_id TEXT,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS system_samples (
      id TEXT PRIMARY KEY,
      created_at TEXT NOT NULL,
      uptime_seconds REAL NOT NULL,
      memory_bytes INTEGER NOT NULL,
      heap_bytes INTEGER NOT NULL,
      event_loop_utilization REAL NOT NULL,
      disk_free_bytes INTEGER NOT NULL,
      db_size_bytes INTEGER NOT NULL,
      pending_runs INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_ai_runs_created ON ai_runs(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_ai_runs_request ON ai_runs(request_id);
    CREATE INDEX IF NOT EXISTS idx_ai_runs_visitor ON ai_runs(visitor_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_ai_runs_status ON ai_runs(status, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_behavior_created ON behavior_events(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_behavior_visitor ON behavior_events(visitor_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_request_created ON request_logs(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_request_request_id ON request_logs(request_id);
    CREATE INDEX IF NOT EXISTS idx_system_created ON system_samples(created_at DESC);
  `);

  const setting = database.prepare("SELECT value FROM settings WHERE key = ?");
  const upsertSetting = database.prepare(`
    INSERT INTO settings(key, value) VALUES(?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `);

  const readSettings = (): ObservabilitySettings => {
    const transcript = setting.get("transcriptEnabled") as
      | { value: string }
      | undefined;
    const retention = setting.get("retentionDays") as
      | { value: string }
      | undefined;
    return {
      transcriptEnabled:
        transcript?.value === undefined
          ? DEFAULT_SETTINGS.transcriptEnabled
          : transcript.value === "true",
      retentionDays: Math.min(
        90,
        Math.max(
          1,
          finiteInteger(retention?.value, DEFAULT_SETTINGS.retentionDays),
        ),
      ),
    };
  };

  if (!setting.get("transcriptEnabled")) {
    upsertSetting.run("transcriptEnabled", "true");
  }
  if (!setting.get("retentionDays")) {
    upsertSetting.run("retentionDays", "30");
  }

  const store: ObservabilityStore = {
    async getSettings() {
      return readSettings();
    },

    async updateSettings(input) {
      if (input.retentionDays !== undefined) {
        if (
          !Number.isInteger(input.retentionDays) ||
          input.retentionDays < 1 ||
          input.retentionDays > 90
        ) {
          throw new ObservabilityStoreError(
            "日志保留天数必须在 1 到 90 天之间",
          );
        }
        upsertSetting.run("retentionDays", String(input.retentionDays));
      }
      if (input.transcriptEnabled !== undefined) {
        upsertSetting.run(
          "transcriptEnabled",
          String(Boolean(input.transcriptEnabled)),
        );
      }
      return readSettings();
    },

    async recordAiRun(input: RecordAiRunInput) {
      const settings = readSettings();
      const createdAt = input.createdAt ?? now().toISOString();
      const completedAt = input.completedAt ?? now().toISOString();
      const transcriptEnabled = settings.transcriptEnabled;
      database.prepare(`
        INSERT INTO ai_runs(
          id, request_id, visitor_id, session_id, tier,
          question_preview, question_ciphertext, answer_ciphertext,
          created_at, completed_at, status, mode,
          configured_model, actual_model, provider_request_suffix,
          retrieval_count, context_budget_tokens,
          prompt_tokens, completion_tokens, total_tokens,
          first_token_ms, latency_ms, attempts, error_type, next_action
        ) VALUES(
          ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
        )
        ON CONFLICT(id) DO UPDATE SET
          request_id = excluded.request_id,
          question_preview = excluded.question_preview,
          question_ciphertext = excluded.question_ciphertext,
          answer_ciphertext = excluded.answer_ciphertext,
          completed_at = excluded.completed_at,
          status = excluded.status,
          mode = excluded.mode,
          configured_model = excluded.configured_model,
          actual_model = excluded.actual_model,
          provider_request_suffix = excluded.provider_request_suffix,
          retrieval_count = excluded.retrieval_count,
          context_budget_tokens = excluded.context_budget_tokens,
          prompt_tokens = excluded.prompt_tokens,
          completion_tokens = excluded.completion_tokens,
          total_tokens = excluded.total_tokens,
          first_token_ms = excluded.first_token_ms,
          latency_ms = excluded.latency_ms,
          attempts = excluded.attempts,
          error_type = excluded.error_type,
          next_action = excluded.next_action
      `).run(
        input.id,
        input.requestId ?? null,
        input.visitorId.slice(0, 96),
        input.sessionId?.slice(0, 96) ?? null,
        input.tier,
        encryptedQuestionPlaceholder(input.question),
        transcriptEnabled ? encryptSecret(input.question, secret) : null,
        transcriptEnabled && input.answer !== undefined
          ? encryptSecret(input.answer, secret)
          : null,
        createdAt,
        completedAt,
        input.status,
        input.mode ?? null,
        input.configuredModel?.slice(0, 160) ?? null,
        input.actualModel?.slice(0, 160) ?? null,
        providerRequestIdSuffix(input.providerRequestId) ?? null,
        input.retrievalCount ?? 0,
        input.contextBudgetTokens ?? null,
        input.promptTokens ?? 0,
        input.completionTokens ?? 0,
        input.totalTokens ?? 0,
        input.firstTokenMs ?? null,
        input.latencyMs ?? null,
        Math.max(1, input.attempts ?? 1),
        input.errorType?.slice(0, 120) ?? null,
        input.nextAction ?? null,
      );
    },

    async getAiRunDetail(id) {
      const row = database
        .prepare("SELECT * FROM ai_runs WHERE id = ?")
        .get(id) as SqliteRow | undefined;
      if (!row) return undefined;
      const summary = toAiRunSummary(row);
      let question: string | undefined;
      let answer: string | undefined;
      try {
        if (row.question_ciphertext) {
          question = decryptSecret(String(row.question_ciphertext), secret);
        }
        if (row.answer_ciphertext) {
          answer = decryptSecret(String(row.answer_ciphertext), secret);
        }
      } catch {
        throw new ObservabilityStoreError("问答内容无法解密");
      }
      return {
        ...summary,
        questionPreview: question ? questionPreview(question) : summary.questionPreview,
        question,
        answer,
      } satisfies AiRunDetail;
    },

    async recordBehavior(input) {
      database.prepare(`
        INSERT INTO behavior_events(
          id, event_type, visitor_id, session_id, path,
          section, target, metadata_json, created_at
        ) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        makeId("behavior"),
        input.eventType.slice(0, 80),
        input.visitorId.slice(0, 96),
        input.sessionId?.slice(0, 96) ?? null,
        input.path.split("?")[0].slice(0, 200) || "/",
        input.section?.slice(0, 80) ?? null,
        input.target?.slice(0, 160) ?? null,
        input.metadata ? JSON.stringify(input.metadata).slice(0, 2_000) : null,
        input.createdAt ?? now().toISOString(),
      );
    },

    async recordRequest(input) {
      database.prepare(`
        INSERT INTO request_logs(
          id, request_id, method, route, status, duration_ms,
          error_type, actor, visitor_id, created_at
        ) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        makeId("request"),
        input.requestId.slice(0, 96),
        input.method.toUpperCase().slice(0, 12),
        input.route.split("?")[0].slice(0, 200),
        input.status,
        Math.max(0, Math.trunc(input.durationMs)),
        input.errorType?.slice(0, 120) ?? null,
        input.actor,
        input.visitorId?.slice(0, 96) ?? null,
        input.createdAt ?? now().toISOString(),
      );
    },

    async sampleSystem() {
      const timestamp = now();
      if (timestamp.valueOf() - lastSystemSampleAt < sampleIntervalMs) return;
      const sample = await systemProbe();
      lastSystemSampleAt = timestamp.valueOf();
      let dbSizeBytes = 0;
      try {
        dbSizeBytes = statSync(databasePath).size;
      } catch {
        dbSizeBytes = 0;
      }
      const pending = database
        .prepare("SELECT COUNT(*) AS count FROM ai_runs WHERE status = 'pending'")
        .get() as { count: number };
      database.prepare(`
        INSERT INTO system_samples(
          id, created_at, uptime_seconds, memory_bytes, heap_bytes,
          event_loop_utilization, disk_free_bytes, db_size_bytes, pending_runs
        ) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        makeId("system"),
        timestamp.toISOString(),
        sample.uptimeSeconds,
        sample.memoryBytes,
        sample.heapBytes,
        sample.eventLoopUtilization,
        sample.diskFreeBytes,
        dbSizeBytes,
        pending.count,
      );
    },

    async getDashboard(rangeDays) {
      const safeRangeDays = Math.min(90, Math.max(1, Math.trunc(rangeDays)));
      const cutoff = new Date(
        now().valueOf() - safeRangeDays * 86_400_000,
      ).toISOString();
      const aiOverview = database.prepare(`
        SELECT
          COUNT(*) AS runs,
          SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) AS success,
          SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) AS failed,
          COALESCE(SUM(total_tokens), 0) AS tokens,
          COUNT(DISTINCT visitor_id) AS visitors
        FROM ai_runs WHERE created_at >= ?
      `).get(cutoff) as Record<string, number>;
      const behaviorCount = database
        .prepare("SELECT COUNT(*) AS count FROM behavior_events WHERE created_at >= ?")
        .get(cutoff) as { count: number };
      const visitorCount = database.prepare(`
        SELECT COUNT(DISTINCT visitor_id) AS count FROM (
          SELECT visitor_id FROM behavior_events WHERE created_at >= ?
          UNION ALL
          SELECT visitor_id FROM ai_runs WHERE created_at >= ?
        )
      `).get(cutoff, cutoff) as { count: number };
      const requestOverview = database.prepare(`
        SELECT COUNT(*) AS count,
          SUM(CASE WHEN status >= 400 THEN 1 ELSE 0 END) AS errors
        FROM request_logs WHERE created_at >= ?
      `).get(cutoff) as { count: number; errors: number | null };
      const aiRows = database
        .prepare("SELECT * FROM ai_runs WHERE created_at >= ? ORDER BY created_at DESC LIMIT 100")
        .all(cutoff) as SqliteRow[];
      const behaviorRows = database
        .prepare("SELECT * FROM behavior_events WHERE created_at >= ? ORDER BY created_at DESC LIMIT 100")
        .all(cutoff) as SqliteRow[];
      const requestRows = database
        .prepare("SELECT * FROM request_logs WHERE created_at >= ? ORDER BY created_at DESC LIMIT 100")
        .all(cutoff) as SqliteRow[];
      const systemRows = database
        .prepare("SELECT * FROM system_samples WHERE created_at >= ? ORDER BY created_at DESC LIMIT 240")
        .all(cutoff) as SqliteRow[];
      const latestSystem = systemRows[0]
        ? toSystemSample(systemRows[0])
        : undefined;
      const alerts: string[] = [];
      if ((latestSystem?.pendingRuns ?? 0) > 0) {
        alerts.push(`当前有 ${latestSystem?.pendingRuns} 个待收口 AI 运行`);
      }
      if (latestSystem && latestSystem.diskFreeBytes < 1_000_000_000) {
        alerts.push("服务器可用磁盘空间不足 1 GB");
      }
      if (finiteInteger(aiOverview.failed) > 0) {
        alerts.push(`当前统计范围内有 ${finiteInteger(aiOverview.failed)} 次 AI 调用失败`);
      }
      if (
        finiteInteger(requestOverview.count) >= 10 &&
        finiteInteger(requestOverview.errors) /
          finiteInteger(requestOverview.count) >=
          0.1
      ) {
        alerts.push("当前统计范围内请求异常率达到 10% 以上");
      }
      return {
        settings: readSettings(),
        rangeDays: safeRangeDays,
        overview: {
          aiRuns: finiteInteger(aiOverview.runs),
          successfulAiRuns: finiteInteger(aiOverview.success),
          failedAiRuns: finiteInteger(aiOverview.failed),
          totalTokens: finiteInteger(aiOverview.tokens),
          uniqueVisitors: finiteInteger(visitorCount.count),
          behaviorEvents: finiteInteger(behaviorCount.count),
          requests: finiteInteger(requestOverview.count),
          requestErrors: finiteInteger(requestOverview.errors),
        },
        recentAiRuns: aiRows.map((row) => {
          const summary = toAiRunSummary(row);
          if (!row.question_ciphertext) return summary;
          try {
            return {
              ...summary,
              questionPreview: questionPreview(
                decryptSecret(String(row.question_ciphertext), secret),
              ),
            };
          } catch {
            return summary;
          }
        }),
        recentBehaviorEvents: behaviorRows.map(toBehaviorEvent),
        recentRequests: requestRows.map(toRequestLog),
        systemSamples: systemRows.map(toSystemSample).reverse(),
        alerts,
      } satisfies ObservabilityDashboard;
    },

    async cleanupExpired() {
      const settings = readSettings();
      const cutoff = new Date(
        now().valueOf() - settings.retentionDays * 86_400_000,
      ).toISOString();
      const remove = (table: string) => {
        const result = database
          .prepare(
            `DELETE FROM ${table} WHERE id IN (` +
              `SELECT id FROM ${table} WHERE created_at < ? LIMIT 5000)`,
          )
          .run(cutoff);
        return Number(result.changes);
      };
      const result: CleanupResult = {
        aiRuns: remove("ai_runs"),
        behaviorEvents: remove("behavior_events"),
        requestLogs: remove("request_logs"),
        systemSamples: remove("system_samples"),
      };
      database.exec("PRAGMA wal_checkpoint(PASSIVE)");
      return result;
    },

    close() {
      if (cleanupTimer) clearInterval(cleanupTimer);
      database.close();
    },
  };

  if (options.cleanupIntervalMs !== false) {
    cleanupTimer = setInterval(
      () => {
        void store.cleanupExpired().catch((error) => {
          console.warn(
            "[observability] scheduled cleanup failed:",
            error instanceof Error ? error.message : "unknown error",
          );
        });
      },
      Math.max(60_000, options.cleanupIntervalMs ?? 3_600_000),
    );
    cleanupTimer.unref();
  }

  return store;
}

let singleton: ObservabilityStore | undefined;

export function getObservabilityStore() {
  singleton ??= createSqliteObservabilityStore();
  return singleton;
}
