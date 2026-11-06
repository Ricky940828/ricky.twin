import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createSqliteObservabilityStore } from "./sqlite-observability-store";

const temporaryDirectories: string[] = [];

async function temporaryDirectory() {
  const directory = await mkdtemp(join(tmpdir(), "ricky-observability-"));
  temporaryDirectories.push(directory);
  return directory;
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) =>
      rm(directory, { force: true, recursive: true }),
    ),
  );
});

describe("SqliteObservabilityStore", () => {
  it("uses safe transcript defaults and validates the retention boundary", async () => {
    const store = createSqliteObservabilityStore({
      dataDir: await temporaryDirectory(),
      secret: "test-observability-secret",
    });

    await expect(store.getSettings()).resolves.toEqual({
      transcriptEnabled: true,
      retentionDays: 30,
    });
    await expect(
      store.updateSettings({ retentionDays: 90 }),
    ).resolves.toEqual({ transcriptEnabled: true, retentionDays: 90 });
    await expect(
      store.updateSettings({ retentionDays: 0 }),
    ).rejects.toThrow("日志保留天数必须在 1 到 90 天之间");
    await expect(
      store.updateSettings({ retentionDays: 91 }),
    ).rejects.toThrow("日志保留天数必须在 1 到 90 天之间");

    store.close();
  });

  it("encrypts full transcripts and keeps list responses summary-only", async () => {
    const dataDir = await temporaryDirectory();
    const store = createSqliteObservabilityStore({
      dataDir,
      secret: "test-observability-secret",
      now: () => new Date("2026-11-06T08:00:00.000Z"),
      id: () => "event-1",
    });

    await store.recordAiRun({
      id: "run-1",
      requestId: "request-1",
      visitorId: "visitor-1",
      sessionId: "session-1",
      tier: "anonymous",
      question: "完整访客问题：如何设计机构合作？",
      answer: "完整数字分身回答：先判断交易结构。",
      status: "success",
      mode: "live",
      configuredModel: "MiniMax 主模型",
      actualModel: "MiniMax-M2.5",
      providerRequestId: "provider-sensitive-request-id-123456",
      retrievalCount: 3,
      contextBudgetTokens: 12_000,
      promptTokens: 800,
      completionTokens: 200,
      totalTokens: 1_000,
      firstTokenMs: 480,
      latencyMs: 2_300,
      attempts: 1,
      nextAction: "leave-contact",
    });

    const dashboard = await store.getDashboard(7);
    expect(dashboard.recentAiRuns).toHaveLength(1);
    expect(dashboard.recentAiRuns[0]).toMatchObject({
      id: "run-1",
      questionPreview: "完整访客问题：如何设计机构合作？",
      providerRequestIdSuffix: "123456",
      promptTokens: 800,
      completionTokens: 200,
      firstTokenMs: 480,
    });
    expect(dashboard.recentAiRuns[0]).not.toHaveProperty("question");
    expect(dashboard.recentAiRuns[0]).not.toHaveProperty("answer");

    await expect(store.getAiRunDetail("run-1")).resolves.toMatchObject({
      question: "完整访客问题：如何设计机构合作？",
      answer: "完整数字分身回答：先判断交易结构。",
    });

    store.close();
    const databaseBytes = await readFile(
      join(dataDir, "observability", "monitoring.sqlite"),
    );
    expect(databaseBytes.toString("utf8")).not.toContain("完整访客问题");
    expect(databaseBytes.toString("utf8")).not.toContain("完整数字分身回答");
  });

  it("records behavior, requests and throttled system samples", async () => {
    let sampleCount = 0;
    const store = createSqliteObservabilityStore({
      dataDir: await temporaryDirectory(),
      secret: "test-observability-secret",
      now: () => new Date("2026-11-06T08:00:00.000Z"),
      id: (prefix) => `${prefix}-1`,
      systemProbe: async () => {
        sampleCount += 1;
        return {
          uptimeSeconds: 360,
          memoryBytes: 120_000_000,
          heapBytes: 40_000_000,
          eventLoopUtilization: 0.12,
          diskFreeBytes: 8_000_000_000,
        };
      },
    });

    await store.recordBehavior({
      eventType: "section_view",
      visitorId: "visitor-1",
      sessionId: "session-1",
      path: "/",
      section: "projects",
      target: "项目与能力",
    });
    await store.recordRequest({
      requestId: "request-1",
      method: "POST",
      route: "/api/chat/stream",
      status: 200,
      durationMs: 2_400,
      actor: "anonymous",
      visitorId: "visitor-1",
    });
    await store.sampleSystem();
    await store.sampleSystem();

    const dashboard = await store.getDashboard(7);
    expect(dashboard.recentBehaviorEvents[0]).toMatchObject({
      eventType: "section_view",
      section: "projects",
    });
    expect(dashboard.recentRequests[0]).toMatchObject({
      requestId: "request-1",
      route: "/api/chat/stream",
    });
    expect(dashboard.overview.uniqueVisitors).toBe(1);
    expect(dashboard.systemSamples).toHaveLength(1);
    expect(sampleCount).toBe(1);

    store.close();
  });

  it("cleans expired detail records using the configured retention", async () => {
    let now = new Date("2026-11-01T00:00:00.000Z");
    const store = createSqliteObservabilityStore({
      dataDir: await temporaryDirectory(),
      secret: "test-observability-secret",
      now: () => now,
      id: (prefix) => `${prefix}-${now.valueOf()}`,
    });
    await store.updateSettings({ retentionDays: 7 });
    await store.recordBehavior({
      eventType: "page_view",
      visitorId: "old-visitor",
      path: "/",
    });
    await store.recordRequest({
      requestId: "old-request",
      method: "GET",
      route: "/",
      status: 200,
      durationMs: 12,
      actor: "anonymous",
    });

    now = new Date("2026-11-10T00:00:00.000Z");
    await store.recordBehavior({
      eventType: "page_view",
      visitorId: "new-visitor",
      path: "/",
    });

    await expect(store.cleanupExpired()).resolves.toMatchObject({
      behaviorEvents: 1,
      requestLogs: 1,
    });
    const dashboard = await store.getDashboard(30);
    expect(dashboard.recentBehaviorEvents).toHaveLength(1);
    expect(dashboard.recentBehaviorEvents[0].visitorId).toBe("new-visitor");
    expect(dashboard.recentRequests).toHaveLength(0);

    store.close();
  });
});
