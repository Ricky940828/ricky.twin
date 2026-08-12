import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { RuntimeWorkspace } from "@/server/runtime/runtime-types";

import { ActivityManager } from "./activity-manager";

const now = new Date().toISOString();

const workspace: RuntimeWorkspace = {
  visits: [
    {
      id: "visit-1",
      visitorId: "visitor-a",
      path: "/",
      userAgentGroup: "Chrome / macOS",
      authenticated: false,
      createdAt: now,
    },
    {
      id: "visit-2",
      visitorId: "visitor-a",
      path: "/",
      userAgentGroup: "Chrome / macOS",
      authenticated: false,
      createdAt: now,
    },
  ],
  runs: [
    {
      id: "run-1",
      visitorId: "visitor-a",
      tier: "anonymous",
      questionPreview: "如何判断机构合作",
      createdAt: now,
      completedAt: now,
      status: "success",
      mode: "live",
      modelName: "主模型",
      retrievalCount: 2,
      latencyMs: 980,
      totalTokens: 120,
      nextAction: "leave-contact",
    },
  ],
  leads: [
    {
      id: "lead-1",
      visitorId: "visitor-a",
      name: "合作访客",
      role: "某金融机构 / 产品负责人",
      contact: "visitor@example.com",
      direction: "沟通 AI 知识库合作",
      consent: true,
      status: "new",
      createdAt: now,
      updatedAt: now,
    },
  ],
  updatedAt: now,
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("ActivityManager", () => {
  it("展示访问、对话和线索，并更新线索状态", async () => {
    let current = workspace;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        if (init?.method === "PUT") {
          current = {
            ...workspace,
            leads: [{ ...workspace.leads[0], status: "contacted" }],
          };
        }
        return Response.json({ ok: true, workspace: current });
      }),
    );
    const user = userEvent.setup();
    render(<ActivityManager />);

    expect(await screen.findByText("2")).toBeInTheDocument();
    expect(screen.getByText("1 位")).toBeInTheDocument();
    expect(screen.getByText("如何判断机构合作")).toBeInTheDocument();
    expect(screen.getByText("visitor@example.com")).toBeInTheDocument();

    await user.selectOptions(
      screen.getByLabelText("合作访客的跟进状态"),
      "contacted",
    );
    expect(await screen.findByText("线索状态已更新")).toBeInTheDocument();
  });
});
