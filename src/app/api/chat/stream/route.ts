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

function event(name: string, value: unknown) {
  return `event: ${name}\ndata: ${JSON.stringify(value)}\n\n`;
}

export async function POST(request: Request) {
  const visitorId = visitorIdForRequest(request);
  return observeRequest({
    request,
    route: "/api/chat/stream",
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
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      void (async () => {
        try {
          const result = await getChatService().stream(
            {
              question:
                typeof record.question === "string"
                  ? record.question
                  : "",
              history: safeHistory(record.history),
              actor: {
                tier: "anonymous",
                allowedBaseIds: [],
                visitorId,
                sessionId: visitorId,
              },
              requestId,
            },
            (text) => {
              controller.enqueue(
                encoder.encode(event("delta", { text })),
              );
            },
          );
          controller.enqueue(
            encoder.encode(event("done", { result })),
          );
        } catch {
          controller.enqueue(
            encoder.encode(
              event("error", {
                message:
                  "数字分身暂时无法连接服务，请稍后再试。",
              }),
            ),
          );
        } finally {
          controller.close();
        }
      })();
    },
  });
  const response = new Response(stream, {
    headers: {
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "Content-Type": "text/event-stream; charset=utf-8",
      "X-Accel-Buffering": "no",
    },
  });
  return attachVisitorCookie(response, request, visitorId);
    },
  });
}
