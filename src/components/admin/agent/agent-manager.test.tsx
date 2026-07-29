import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { AdminAgentWorkspace } from "@/server/agent/agent-types";

import { AgentManager } from "./agent-manager";

const workspace: AdminAgentWorkspace = {
  draft: {
    schemaVersion: 1,
    name: "Ricky 数字接待 Agent",
    prompt: {
      identity: "数字分身",
      scope: "职业能力与 AI 应用",
      style: "简洁直接",
      knowledgeRules: "只使用授权知识",
      permissionBoundary: "未授权时引导申请",
      commitmentBoundary: "不作合作承诺",
      responseStructure: "先判断再依据",
      conversionRules: "适时邀请留资",
      prohibited: "不得泄露密钥",
    },
    tools: [
      {
        id: "check-usage-limit",
        label: "检查使用额度",
        description: "服务端强制执行",
        mode: "required",
        enabled: true,
      },
      {
        id: "open-lead-form",
        label: "打开留资表单",
        description: "触发前端留资",
        mode: "optional",
        enabled: true,
      },
    ],
    knowledgeBaseIds: [],
    usage: {
      anonymousPerMinute: 4,
      anonymousDailyQuestions: 20,
      registeredDailyQuestions: 80,
      authorizedDailyQuestions: 200,
      maxInputChars: 1_500,
      maxOutputTokens: 1_200,
      maxSessionTurns: 12,
      maxConcurrentRuns: 2,
      siteDailyTokenBudget: 300_000,
    },
  },
  published: {} as AdminAgentWorkspace["published"],
  publishedVersion: {
    id: "agent-v1",
    createdAt: "2026-07-30T00:00:00.000Z",
    note: "初始版本",
  },
  versions: [],
  models: [],
  updatedAt: "2026-07-30T00:00:00.000Z",
};
workspace.published = structuredClone(workspace.draft);

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("AgentManager", () => {
  it("编辑并发布独立于模型的行为协议", async () => {
    const requests: Array<{ url: string; init?: RequestInit }> = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        requests.push({ url, init });
        if (url.endsWith("/api/admin/knowledge")) {
          return Response.json({
            ok: true,
            workspace: {
              bases: [
                {
                  id: "kb-public",
                  name: "公开职业资料",
                  defaultAccess: "public",
                  ragEnabled: true,
                },
              ],
              documents: [],
              updatedAt: workspace.updatedAt,
            },
          });
        }
        return Response.json({
          ok: true,
          workspace,
          message: init?.method === "PUT" ? "Agent 草稿已保存" : undefined,
        });
      }),
    );
    const user = userEvent.setup();
    render(<AgentManager />);

    await screen.findByDisplayValue("Ricky 数字接待 Agent");
    await user.clear(screen.getByLabelText("Agent 名称"));
    await user.type(screen.getByLabelText("Agent 名称"), "Ricky 会客厅接待员");
    await user.click(screen.getByRole("button", { name: "保存 Agent 草稿" }));
    await user.click(screen.getByRole("button", { name: "发布 Agent 配置" }));

    expect(
      requests.some(
        ({ url, init }) =>
          url.endsWith("/api/admin/agent") && init?.method === "PUT",
      ),
    ).toBe(true);
    expect(
      requests.some(({ url }) =>
        url.endsWith("/api/admin/agent/publish"),
      ),
    ).toBe(true);
    expect(screen.getByText("必需")).toBeInTheDocument();
    expect(screen.getByText("公开职业资料")).toBeInTheDocument();
  });
});
