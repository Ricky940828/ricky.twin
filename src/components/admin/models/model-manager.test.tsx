import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { AdminAgentWorkspace } from "@/server/agent/agent-types";

import { ModelManager } from "./model-manager";

const emptyWorkspace = {
  draft: {},
  published: {},
  publishedVersion: {
    id: "agent-v1",
    createdAt: "2026-07-30T00:00:00.000Z",
    note: "初始版本",
  },
  versions: [],
  models: [],
  updatedAt: "2026-07-30T00:00:00.000Z",
} as unknown as AdminAgentWorkspace;

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("ModelManager", () => {
  it("创建轻量 OpenAI 兼容连接并保留密钥掩码", async () => {
    let current = emptyWorkspace;
    const requests: Array<{ url: string; init?: RequestInit }> = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        requests.push({ url, init });
        if (url.endsWith("/api/admin/models") && init?.method === "POST") {
          current = {
            ...emptyWorkspace,
            models: [
              {
                id: "model-1",
                name: "主模型",
                kind: "openai-compatible",
                baseUrl: "https://example.com/v1",
                modelId: "example-model",
                enabled: true,
                timeoutMs: 30_000,
                contextWindowTokens: 1_048_576,
                maxOutputTokens: 1_200,
                createdAt: emptyWorkspace.updatedAt,
                updatedAt: emptyWorkspace.updatedAt,
                apiKeyConfigured: true,
                apiKeyHint: "…cret",
              },
            ],
          };
          return Response.json({
            ok: true,
            workspace: current,
            message: "模型连接已创建",
          });
        }
        return Response.json({ ok: true, workspace: current });
      }),
    );
    const user = userEvent.setup();
    render(<ModelManager />);

    await screen.findByText("还没有模型连接");
    await user.type(screen.getByLabelText("连接名称"), "主模型");
    await user.type(
      screen.getByLabelText("Base URL"),
      "https://example.com/v1",
    );
    await user.type(screen.getByLabelText("模型 ID"), "example-model");
    await user.type(screen.getByLabelText("API Key"), "secret");
    await user.clear(screen.getByLabelText("上下文窗口 Token"));
    await user.type(
      screen.getByLabelText("上下文窗口 Token"),
      "1048576",
    );
    await user.click(screen.getByRole("button", { name: "保存模型连接" }));

    expect(screen.getByText("…cret")).toBeInTheDocument();
    const create = requests.find(
      ({ url, init }) =>
        url.endsWith("/api/admin/models") && init?.method === "POST",
    );
    expect(create).toBeDefined();
    expect(JSON.parse(String(create?.init?.body))).toMatchObject({
      name: "主模型",
      apiKey: "secret",
      modelId: "example-model",
      contextWindowTokens: 1_048_576,
    });
  });

  it("切换主模型后同步清理会客厅的旧模型会话", async () => {
    const model = {
      id: "model-minimax",
      name: "MiniMax-M3",
      kind: "openai-compatible" as const,
      baseUrl: "https://api.minimaxi.com/v1",
      modelId: "MiniMax-M3",
      enabled: true,
      timeoutMs: 90_000,
      contextWindowTokens: 1_048_576,
      maxOutputTokens: 1_200,
      createdAt: emptyWorkspace.updatedAt,
      updatedAt: emptyWorkspace.updatedAt,
      apiKeyConfigured: true,
      apiKeyHint: "…已配置",
    };
    let current = {
      ...emptyWorkspace,
      models: [model],
    } as AdminAgentWorkspace;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        if (
          url.endsWith(`/api/admin/models/${model.id}/activate`) &&
          init?.method === "POST"
        ) {
          current = { ...current, activeModelId: model.id };
          return Response.json({
            ok: true,
            workspace: current,
            message: "会客厅主模型已切换",
          });
        }
        return Response.json({ ok: true, workspace: current });
      }),
    );
    const changed = vi.fn();
    window.addEventListener("ricky:model-changed", changed);
    const user = userEvent.setup();
    render(<ModelManager />);

    await user.click(
      await screen.findByRole("button", { name: "设为主模型" }),
    );

    expect(
      await screen.findByRole("button", { name: "当前主模型" }),
    ).toBeDisabled();
    expect(changed).toHaveBeenCalledOnce();
    window.removeEventListener("ricky:model-changed", changed);
  });
});
