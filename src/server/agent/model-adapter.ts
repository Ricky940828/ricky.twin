import type {
  ResolvedModelConnection,
  UnifiedModelRequest,
  UnifiedModelResponse,
} from "./agent-types";

interface OpenAICompatibleResponse {
  id?: unknown;
  model?: unknown;
  choices?: Array<{
    message?: { content?: unknown };
  }>;
  usage?: {
    prompt_tokens?: unknown;
    completion_tokens?: unknown;
    total_tokens?: unknown;
  };
}

interface OpenAICompatibleStreamChunk {
  id?: unknown;
  model?: unknown;
  choices?: Array<{
    delta?: { content?: unknown };
  }>;
  usage?: OpenAICompatibleResponse["usage"];
}

function numberOrZero(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function optionalText(value: unknown) {
  return typeof value === "string" && value.trim()
    ? value.trim().slice(0, 160)
    : undefined;
}

function requestBody(
  connection: ResolvedModelConnection,
  request: UnifiedModelRequest,
  stream: boolean,
) {
  return JSON.stringify({
    model: connection.modelId,
    messages: [
      { role: "system", content: request.system },
      ...request.messages,
    ],
    max_tokens: connection.maxOutputTokens,
    stream,
  });
}

function usageFromPayload(usage: OpenAICompatibleResponse["usage"]) {
  const promptTokens = numberOrZero(usage?.prompt_tokens);
  const completionTokens = numberOrZero(usage?.completion_tokens);
  const totalTokens =
    numberOrZero(usage?.total_tokens) ||
    promptTokens + completionTokens;
  return { promptTokens, completionTokens, totalTokens };
}

function usageWithFallback(
  usage: OpenAICompatibleResponse["usage"],
  request: UnifiedModelRequest,
  answer: string,
) {
  const reported = usageFromPayload(usage);
  if (reported.totalTokens > 0) {
    return reported;
  }
  const promptCharacters =
    request.system.length +
    request.messages.reduce(
      (total, message) => total + message.content.length,
      0,
    );
  const promptTokens = Math.max(1, Math.ceil(promptCharacters / 2));
  const completionTokens = Math.max(1, Math.ceil(answer.length / 2));
  return {
    promptTokens,
    completionTokens,
    totalTokens: promptTokens + completionTokens,
  };
}

export async function callOpenAICompatibleModel(
  connection: ResolvedModelConnection,
  request: UnifiedModelRequest,
): Promise<UnifiedModelResponse> {
  const response = await fetch(
    `${connection.baseUrl.replace(/\/$/, "")}/chat/completions`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${connection.apiKey}`,
        "Content-Type": "application/json",
      },
      body: requestBody(connection, request, false),
      signal: AbortSignal.timeout(connection.timeoutMs),
    },
  );
  if (!response.ok) {
    throw new Error(`模型连接返回 ${response.status}`);
  }

  const payload = (await response.json()) as OpenAICompatibleResponse;
  const text = payload.choices?.[0]?.message?.content;
  if (typeof text !== "string" || !text.trim()) {
    throw new Error("模型连接未返回有效文本");
  }
  return {
    text: text.trim(),
    usage: usageWithFallback(payload.usage, request, text),
    providerModelId: optionalText(payload.model),
    providerRequestId:
      optionalText(payload.id) ??
      optionalText(response.headers.get("x-request-id")),
  };
}

async function streamOpenAICompatibleModelOnce(
  connection: ResolvedModelConnection,
  request: UnifiedModelRequest,
  onDelta: (delta: string) => void,
): Promise<UnifiedModelResponse> {
  const response = await fetch(
    `${connection.baseUrl.replace(/\/$/, "")}/chat/completions`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${connection.apiKey}`,
        Accept: "text/event-stream",
        "Content-Type": "application/json",
      },
      body: requestBody(connection, request, true),
      signal: AbortSignal.timeout(connection.timeoutMs),
    },
  );
  if (!response.ok) {
    throw new Error(`模型连接返回 ${response.status}`);
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const payload = (await response.json()) as OpenAICompatibleResponse;
    const text = payload.choices?.[0]?.message?.content;
    if (typeof text !== "string" || !text.trim()) {
      throw new Error("模型连接未返回有效文本");
    }
    onDelta(text);
    return {
      text: text.trim(),
      usage: usageWithFallback(payload.usage, request, text),
      providerModelId: optionalText(payload.model),
      providerRequestId:
        optionalText(payload.id) ??
        optionalText(response.headers.get("x-request-id")),
    };
  }
  if (!response.body) {
    throw new Error("模型连接未返回流式内容");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let answer = "";
  let usage = usageFromPayload(undefined);
  let providerModelId: string | undefined;
  let providerRequestId =
    optionalText(response.headers.get("x-request-id"));

  const consumeEvent = (event: string) => {
    const data = event
      .split(/\r?\n/)
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice(5).trimStart())
      .join("\n");
    if (!data || data === "[DONE]") {
      return;
    }
    let payload: OpenAICompatibleStreamChunk;
    try {
      payload = JSON.parse(data) as OpenAICompatibleStreamChunk;
    } catch {
      return;
    }
    const delta = payload.choices?.[0]?.delta?.content;
    if (typeof delta === "string" && delta) {
      answer += delta;
      onDelta(delta);
    }
    if (payload.usage) {
      usage = usageFromPayload(payload.usage);
    }
    providerModelId ??= optionalText(payload.model);
    providerRequestId ??= optionalText(payload.id);
  };

  while (true) {
    const { done, value } = await reader.read();
    buffer += decoder.decode(value, { stream: !done });
    let boundary = /\r?\n\r?\n/.exec(buffer);
    while (boundary) {
      const event = buffer.slice(0, boundary.index);
      buffer = buffer.slice(boundary.index + boundary[0].length);
      consumeEvent(event);
      boundary = /\r?\n\r?\n/.exec(buffer);
    }
    if (done) {
      break;
    }
  }
  if (buffer.trim()) {
    consumeEvent(buffer);
  }
  if (!answer.trim()) {
    throw new Error("模型连接未返回有效文本");
  }
  return {
    text: answer.trim(),
    usage:
      usage.totalTokens > 0
        ? usage
        : usageWithFallback(undefined, request, answer),
    providerModelId,
    providerRequestId,
  };
}

export async function streamOpenAICompatibleModel(
  connection: ResolvedModelConnection,
  request: UnifiedModelRequest,
  onDelta: (delta: string) => void,
): Promise<UnifiedModelResponse> {
  let emitted = false;
  const forward = (delta: string) => {
    emitted = true;
    onDelta(delta);
  };
  try {
    return await streamOpenAICompatibleModelOnce(
      connection,
      request,
      forward,
    );
  } catch (error) {
    const timedOut =
      error instanceof DOMException && error.name === "TimeoutError";
    if (emitted || timedOut) {
      throw error;
    }
    return streamOpenAICompatibleModelOnce(
      connection,
      request,
      forward,
    );
  }
}
