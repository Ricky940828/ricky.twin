import { observeRequest } from "@/server/observability/request-monitor";
import { getObservabilityStore } from "@/server/observability/sqlite-observability-store";
import {
  attachVisitorCookie,
  visitorIdForRequest,
} from "@/server/runtime/visitor-session";

const ALLOWED_EVENTS = new Set([
  "section_view",
  "navigation_click",
  "project_open",
  "identity_card_open",
  "lounge_question",
  "lead_form_open",
]);

function safeText(value: unknown, length: number) {
  return typeof value === "string" && value.trim()
    ? value.trim().slice(0, length)
    : undefined;
}

export async function POST(request: Request) {
  const visitorId = visitorIdForRequest(request);
  return observeRequest({
    request,
    route: "/api/events",
    actor: "anonymous",
    visitorId,
    handler: async () => {
      let body: Record<string, unknown> = {};
      try {
        const value = await request.json();
        if (value && typeof value === "object") {
          body = value as Record<string, unknown>;
        }
      } catch {
        return Response.json(
          { ok: false, message: "行为事件格式无效" },
          { status: 400 },
        );
      }
      const eventType = safeText(body.eventType, 80);
      if (!eventType || !ALLOWED_EVENTS.has(eventType)) {
        return Response.json(
          { ok: false, message: "不支持的行为事件" },
          { status: 422 },
        );
      }
      await getObservabilityStore().recordBehavior({
        eventType,
        visitorId,
        sessionId: visitorId,
        path: safeText(body.path, 200) ?? "/",
        section: safeText(body.section, 80),
        target: safeText(body.target, 160),
      });
      const response = Response.json(
        { ok: true },
        { headers: { "Cache-Control": "no-store" } },
      );
      return attachVisitorCookie(response, request, visitorId);
    },
  });
}
