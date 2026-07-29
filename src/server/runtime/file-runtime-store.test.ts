import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import type { AgentUsagePolicy } from "@/server/agent/agent-types";

import { createFileRuntimeStore } from "./file-runtime-store";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) =>
      rm(directory, { force: true, recursive: true }),
    ),
  );
});

const policy: AgentUsagePolicy = {
  anonymousPerMinute: 2,
  anonymousDailyQuestions: 3,
  registeredDailyQuestions: 6,
  authorizedDailyQuestions: 10,
  maxInputChars: 1_500,
  maxOutputTokens: 1_200,
  maxSessionTurns: 12,
  maxConcurrentRuns: 1,
  siteDailyTokenBudget: 100,
};

describe("FileRuntimeStore", () => {
  it("在模型调用前执行分钟、并发和每日问题限额", async () => {
    const dataDir = await mkdtemp(join(tmpdir(), "ricky-runtime-"));
    temporaryDirectories.push(dataDir);
    let current = new Date("2026-07-30T08:00:00.000Z");
    let sequence = 0;
    const store = createFileRuntimeStore({
      dataDir,
      now: () => current,
      id: () => `run-${++sequence}`,
    });

    const first = await store.begin({
      visitorId: "visitor-1",
      tier: "anonymous",
      questionPreview: "第一个问题",
      policy,
    });
    expect(first.allowed).toBe(true);

    const concurrent = await store.begin({
      visitorId: "visitor-2",
      tier: "anonymous",
      questionPreview: "并发问题",
      policy,
    });
    expect(concurrent).toMatchObject({
      allowed: false,
      reason: "concurrency",
    });

    if (first.allowed) {
      await store.finish(first.runId, {
        status: "success",
        mode: "live",
        retrievalCount: 2,
        latencyMs: 120,
        totalTokens: 20,
        nextAction: "none",
        modelName: "主模型",
      });
    }
    const second = await store.begin({
      visitorId: "visitor-1",
      tier: "anonymous",
      questionPreview: "第二个问题",
      policy,
    });
    expect(second.allowed).toBe(true);
    if (second.allowed) {
      await store.finish(second.runId, {
        status: "success",
        mode: "live",
        retrievalCount: 1,
        latencyMs: 100,
        totalTokens: 20,
        nextAction: "none",
      });
    }
    const minuteBlocked = await store.begin({
      visitorId: "visitor-1",
      tier: "anonymous",
      questionPreview: "第三个问题",
      policy,
    });
    expect(minuteBlocked).toMatchObject({
      allowed: false,
      reason: "minute",
    });

    current = new Date("2026-07-30T08:02:00.000Z");
    const third = await store.begin({
      visitorId: "visitor-1",
      tier: "anonymous",
      questionPreview: "第三个问题",
      policy,
    });
    expect(third.allowed).toBe(true);
    if (third.allowed) {
      await store.finish(third.runId, {
        status: "success",
        mode: "live",
        retrievalCount: 1,
        latencyMs: 100,
        totalTokens: 20,
        nextAction: "none",
      });
    }
    const dailyBlocked = await store.begin({
      visitorId: "visitor-1",
      tier: "anonymous",
      questionPreview: "第四个问题",
      policy,
    });
    expect(dailyBlocked).toMatchObject({
      allowed: false,
      reason: "daily",
    });
  });

  it("持久化最少运行信息，不记录回答和 API Key", async () => {
    const dataDir = await mkdtemp(join(tmpdir(), "ricky-runtime-"));
    temporaryDirectories.push(dataDir);
    const store = createFileRuntimeStore({
      dataDir,
      now: () => new Date("2026-07-30T08:00:00.000Z"),
      id: () => "run-1",
    });
    const started = await store.begin({
      visitorId: "visitor-1",
      tier: "anonymous",
      questionPreview: "如何判断机构合作",
      policy,
    });
    expect(started.allowed).toBe(true);
    if (started.allowed) {
      await store.finish(started.runId, {
        status: "success",
        mode: "live",
        retrievalCount: 2,
        latencyMs: 180,
        totalTokens: 42,
        nextAction: "leave-contact",
        modelName: "主模型",
      });
    }

    const raw = await readFile(
      join(dataDir, "runtime", "workspace.json"),
      "utf8",
    );
    expect(raw).toContain("如何判断机构合作");
    expect(raw).toContain('"totalTokens": 42');
    expect(raw).not.toContain("apiKey");
    expect(raw).not.toContain("answer");
  });
});
