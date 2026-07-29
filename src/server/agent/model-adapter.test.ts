import { afterEach, describe, expect, it, vi } from "vitest";

import { callOpenAICompatibleModel } from "./model-adapter";
import type { ResolvedModelConnection } from "./agent-types";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("callOpenAICompatibleModel", () => {
  it("maps the unified request to an OpenAI-compatible chat request", async () => {
    const requests: Array<{ input: RequestInfo | URL; init?: RequestInit }> =
      [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        requests.push({ input, init });
        return Response.json({
          choices: [
            {
              message: {
                content: "先判断合作主体，再看资产与交易结构。",
              },
            },
          ],
          usage: {
            prompt_tokens: 120,
            completion_tokens: 32,
            total_tokens: 152,
          },
        });
      }),
    );
    const connection: ResolvedModelConnection = {
      id: "model-1",
      name: "AI Center",
      kind: "openai-compatible",
      baseUrl: "https://api.aicenter.net.cn/v1",
      apiKey: "sk-secret",
      modelId: "chatgpt-5.5",
      enabled: true,
      timeoutMs: 30_000,
      maxOutputTokens: 1_200,
      createdAt: "2026-07-30T00:00:00.000Z",
      updatedAt: "2026-07-30T00:00:00.000Z",
    };

    const result = await callOpenAICompatibleModel(connection, {
      system: "你是 Ricky 的数字分身。",
      messages: [{ role: "user", content: "如何判断机构合作？" }],
    });

    expect(result.text).toContain("先判断合作主体");
    expect(result.usage.totalTokens).toBe(152);
    expect(String(requests[0].input)).toBe(
      "https://api.aicenter.net.cn/v1/chat/completions",
    );
    expect(new Headers(requests[0].init?.headers).get("Authorization")).toBe(
      "Bearer sk-secret",
    );
    expect(JSON.parse(String(requests[0].init?.body))).toEqual(
      expect.objectContaining({
        model: "chatgpt-5.5",
        max_tokens: 1_200,
      }),
    );
  });

  it("returns a stable provider error without leaking response bodies", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("secret upstream detail", { status: 401 })),
    );

    await expect(
      callOpenAICompatibleModel(
        {
          id: "model-1",
          name: "Bad model",
          kind: "openai-compatible",
          baseUrl: "https://example.com/v1",
          apiKey: "sk-secret",
          modelId: "model",
          enabled: true,
          timeoutMs: 5_000,
          maxOutputTokens: 400,
          createdAt: "",
          updatedAt: "",
        },
        {
          system: "system",
          messages: [{ role: "user", content: "test" }],
        },
      ),
    ).rejects.toThrow("模型连接返回 401");
  });
});
