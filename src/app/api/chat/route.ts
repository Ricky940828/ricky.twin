import type { UnifiedChatMessage } from "@/server/agent/agent-types";
import { getChatService } from "@/server/chat/chat-service";
import { observeRequest } from "@/server/observability/request-monitor";
import {
  attachVisitorCookie,
  visitorIdForRequest,
} from "@/server/runtime/visitor-session";

function safeHistory(value: unknown): UnifiedChatMessage[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .filter(
      (item): item is { role: "user" | "assistant"; content: string } =>
        typeof item === "object" &&
        item !== null &&
        "role" in item &&
        (item.role === "user" || item.role === "assistant") &&
        "content" in item &&
        typeof item.content === "string",
    )
    .slice(-24)
    .map((item) => ({
      role: item.role,
      content: item.content.slice(0, 4_000),
    }));
}

export async function POST(request: Request) {
  const visitorId = visitorIdForRequest(request);
  return observeRequest({
    request,
    route: "/api/chat",
    actor: "anonymous",
    visitorId,
    handler: async (requestId) => {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      {
        ok: false,
        message: "问题格式无效",
        answer: "请重新输入问题。",
      },
      { status: 400 },
    );
  }
  const record =
    typeof body === "object" && body !== null
      ? (body as Record<string, unknown>)
      : {};
  const result = await getChatService().chat({
    question: typeof record.question === "string" ? record.question : "",
    history: safeHistory(record.history),
    actor: {
      tier: "anonymous",
      allowedBaseIds: [],
      visitorId,
      sessionId: visitorId,
    },
    requestId,
  });
  const status =
    result.code === "usage-limit"
      ? 429
      : result.code === "model-unavailable"
        ? 503
        : result.ok
          ? 200
          : 400;
  const response = Response.json(result, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
  return attachVisitorCookie(response, request, visitorId);
    },
  });
}
