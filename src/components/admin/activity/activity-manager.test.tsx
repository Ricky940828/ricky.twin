import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { ObservabilityDashboard } from "@/server/observability/observability-types";
import type { RuntimeWorkspace } from "@/server/runtime/runtime-types";
import { ActivityManager } from "./activity-manager";

const now = new Date().toISOString();
const workspace: RuntimeWorkspace = {
  visits: [{
    id: "visit-1", visitorId: "visitor-a", path: "/",
    userAgentGroup: "Chrome / macOS", authenticated: false, createdAt: now,
  }],
  runs: [],
  leads: [{
    id: "lead-1", visitorId: "visitor-a", name: "合作访客",
    role: "某金融机构 / 产品负责人", contact: "visitor@example.com",
    direction: "沟通 AI 知识库合作", consent: true, status: "new",
    createdAt: now, updatedAt: now,
  }],
  updatedAt: now,
};

const dashboard: ObservabilityDashboard = {
  settings: { transcriptEnabled: true, retentionDays: 30 },
  rangeDays: 7,
  overview: {
    aiRuns: 1, successfulAiRuns: 1, failedAiRuns: 0, totalTokens: 120,
    uniqueVisitors: 1, behaviorEvents: 2, requests: 3, requestErrors: 0,
  },
  recentAiRuns: [{
    id: "run-1", requestId: "req-1", visitorId: "visitor-a",
    tier: "anonymous", questionPreview: "如何判断机构合作",
    createdAt: now, completedAt: now, status: "success", mode: "live",
    configuredModel: "主模型", actualModel: "MiniMax-M2.5",
    providerRequestIdSuffix: "123456", retrievalCount: 2,
    contextBudgetTokens: 12_000, promptTokens: 90, completionTokens: 30,
    totalTokens: 120, firstTokenMs: 420, latencyMs: 980, attempts: 1,
    nextAction: "leave-contact", transcriptAvailable: true,
  }],
  recentBehaviorEvents: [{
    id: "event-1", eventType: "section_view", visitorId: "visitor-a",
    path: "/", section: "projects", createdAt: now,
  }],
  recentRequests: [{
    id: "request-1", requestId: "req-1", method: "POST",
    route: "/api/chat/stream", status: 200, durationMs: 1_000,
    actor: "anonymous", visitorId: "visitor-a", createdAt: now,
  }],
  systemSamples: [{
    id: "system-1", createdAt: now, uptimeSeconds: 360,
    memoryBytes: 120_000_000, heapBytes: 40_000_000,
    eventLoopUtilization: 0.12, diskFreeBytes: 8_000_000_000,
    dbSizeBytes: 1_000_000, pendingRuns: 0,
  }],
  alerts: [],
};

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("ActivityManager", () => {
  it("provides five focused views and decrypts a transcript only on demand", async () => {
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
      if (String(input).endsWith("/runs/run-1")) {
        return Response.json({ ok: true, run: {
          ...dashboard.recentAiRuns[0],
          question: "如何判断机构合作？",
          answer: "先看交易主体，再看资产与资金结构。",
        }});
      }
      return Response.json({ ok: true, workspace, dashboard });
    }));
    const user = userEvent.setup();
    render(<ActivityManager />);

    expect(
      await screen.findByRole("heading", { name: "运营总览" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "访客与转化" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "AI 与 RAG" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "请求与审计" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "系统性能" })).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "AI 与 RAG" }));
    expect(screen.getByText("如何判断机构合作")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "查看完整问答" }));
    expect(await screen.findByText("先看交易主体，再看资产与资金结构。"))
      .toBeInTheDocument();
  });

  it("allows retention configuration within the 1 to 90 day boundary", async () => {
    const request = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input).endsWith("/settings") && init?.method === "PUT") {
        return Response.json({
          ok: true,
          settings: { transcriptEnabled: true, retentionDays: 60 },
        });
      }
      return Response.json({ ok: true, workspace, dashboard });
    });
    vi.stubGlobal("fetch", request);
    const user = userEvent.setup();
    render(<ActivityManager />);

    await user.click(await screen.findByRole("tab", { name: "请求与审计" }));
    const retention = screen.getByRole("spinbutton", { name: "日志保留天数" });
    await user.clear(retention);
    await user.type(retention, "60");
    await user.click(screen.getByRole("button", { name: "保存留存设置" }));

    expect(request).toHaveBeenCalledWith(
      "/api/admin/activity/settings",
      expect.objectContaining({ method: "PUT" }),
    );
    expect(await screen.findByText("留存设置已保存")).toBeInTheDocument();

    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
    await user.click(
      screen.getByRole("button", { name: "立即清理到期记录" }),
    );
    expect(confirm).toHaveBeenCalledWith(
      "确认立即清理超过当前保留期的监测记录？",
    );
    expect(request).toHaveBeenCalledWith(
      "/api/admin/activity/cleanup",
      { method: "POST" },
    );
  });
});
