import type {
  ResolvedModelConnection,
  UnifiedModelRequest,
  UnifiedModelResponse,
} from "./agent-types";

interface OpenAICompatibleResponse {
  choices?: Array<{
    message?: { content?: unknown };
  }>;
  usage?: {
    prompt_tokens?: unknown;
    completion_tokens?: unknown;
    total_tokens?: unknown;
  };
}

function numberOrZero(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
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
      body: JSON.stringify({
        model: connection.modelId,
        messages: [
          { role: "system", content: request.system },
          ...request.messages,
        ],
        max_tokens: connection.maxOutputTokens,
        temperature: 0.2,
        stream: false,
      }),
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
  const promptTokens = numberOrZero(payload.usage?.prompt_tokens);
  const completionTokens = numberOrZero(
    payload.usage?.completion_tokens,
  );
  const totalTokens =
    numberOrZero(payload.usage?.total_tokens) ||
    promptTokens + completionTokens;
  return {
    text: text.trim(),
    usage: { promptTokens, completionTokens, totalTokens },
  };
}
