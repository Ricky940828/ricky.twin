import { afterEach, describe, expect, it, vi } from "vitest";

import {
  callOpenAICompatibleModel,
  streamOpenAICompatibleModel,
} from "./model-adapter";
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
          id: "request-model-1",
          model: "provider-model-actual",
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
      contextWindowTokens: 128_000,
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
    expect(result.providerModelId).toBe("provider-model-actual");
    expect(result.providerRequestId).toBe("request-model-1");
    expect(result.attempts).toBe(1);
    expect(String(requests[0].input)).toBe(
      "https://api.aicenter.net.cn/v1/chat/completions",
    );
    expect(new Headers(requests[0].init?.headers).get("Authorization")).toBe(
      "Bearer sk-secret",
    );
    const body = JSON.parse(String(requests[0].init?.body));
    expect(body).toEqual(
      expect.objectContaining({
        model: "chatgpt-5.5",
        max_tokens: 1_200,
      }),
    );
    expect(body).not.toHaveProperty("temperature");
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
          contextWindowTokens: 128_000,
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

  it("parses OpenAI-compatible SSE chunks and exposes deltas immediately", async () => {
    const requests: RequestInit[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
        requests.push(init ?? {});
        return new Response(
          [
            'data: {"choices":[{"delta":{"content":"先判断"}}]}',
            "",
            'data: {"id":"stream-request-1","model":"provider-stream-model","choices":[{"delta":{"content":"主体和资产。"}}]}',
            "",
            "data: [DONE]",
            "",
          ].join("\n"),
          {
            headers: { "Content-Type": "text/event-stream" },
          },
        );
      }),
    );
    const deltas: string[] = [];
    const result = await streamOpenAICompatibleModel(
      {
        id: "model-1",
        name: "Streaming model",
        kind: "openai-compatible",
        baseUrl: "https://example.com/v1",
        apiKey: "sk-secret",
        modelId: "stream-model",
        enabled: true,
        timeoutMs: 5_000,
        contextWindowTokens: 128_000,
        maxOutputTokens: 400,
        createdAt: "",
        updatedAt: "",
      },
      {
        system: "system",
        messages: [{ role: "user", content: "test" }],
      },
      (delta) => deltas.push(delta),
    );

    expect(deltas).toEqual(["先判断", "主体和资产。"]);
    expect(result.text).toBe("先判断主体和资产。");
    expect(result.usage.totalTokens).toBeGreaterThan(0);
    expect(result.providerModelId).toBe("provider-stream-model");
    expect(result.providerRequestId).toBe("stream-request-1");
    expect(result.firstTokenMs).toEqual(expect.any(Number));
    expect(result.firstTokenMs).toBeGreaterThanOrEqual(0);
    expect(result.attempts).toBe(1);
    expect(JSON.parse(String(requests[0].body))).toMatchObject({
      stream: true,
    });
  });

  it("retries one transient streaming failure before any text is exposed", async () => {
    let attempts = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        attempts += 1;
        if (attempts === 1) {
          return new Response("temporary upstream error", {
            status: 503,
          });
        }
        return new Response(
          [
            'data: {"choices":[{"delta":{"content":"重试后恢复。"}}]}',
            "",
            "data: [DONE]",
            "",
          ].join("\n"),
          {
            headers: { "Content-Type": "text/event-stream" },
          },
        );
      }),
    );
    const deltas: string[] = [];

    const result = await streamOpenAICompatibleModel(
      {
        id: "model-1",
        name: "Streaming model",
        kind: "openai-compatible",
        baseUrl: "https://example.com/v1",
        apiKey: "sk-secret",
        modelId: "stream-model",
        enabled: true,
        timeoutMs: 5_000,
        contextWindowTokens: 128_000,
        maxOutputTokens: 400,
        createdAt: "",
        updatedAt: "",
      },
      {
        system: "system",
        messages: [{ role: "user", content: "test" }],
      },
      (delta) => deltas.push(delta),
    );

    expect(attempts).toBe(2);
    expect(deltas).toEqual(["重试后恢复。"]);
    expect(result.text).toBe("重试后恢复。");
    expect(result.attempts).toBe(2);
    expect(result.firstTokenMs).toEqual(expect.any(Number));
  });
});
