import { randomUUID } from "node:crypto";

import type { UnifiedChatMessage } from "@/server/agent/agent-types";
import { getChatService } from "@/server/chat/chat-service";

function cookieValue(request: Request, name: string) {
  const cookie = request.headers.get("cookie") ?? "";
  for (const part of cookie.split(";")) {
    const [key, ...value] = part.trim().split("=");
    if (key === name) {
      return decodeURIComponent(value.join("="));
    }
  }
  return undefined;
}

function safeVisitorId(request: Request) {
  const existing = cookieValue(request, "ricky_visitor");
  return existing && /^visitor-[a-z0-9-]{8,80}$/i.test(existing)
    ? existing
    : `visitor-${randomUUID()}`;
}

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
  const visitorId = safeVisitorId(request);
  const result = await getChatService().chat({
    question: typeof record.question === "string" ? record.question : "",
    history: safeHistory(record.history),
    actor: {
      tier: "anonymous",
      allowedBaseIds: [],
      visitorId,
      sessionId: visitorId,
    },
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
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  response.headers.append(
    "Set-Cookie",
    `ricky_visitor=${encodeURIComponent(visitorId)}; Path=/; Max-Age=31536000; HttpOnly; SameSite=Lax${secure}`,
  );
  return response;
}
