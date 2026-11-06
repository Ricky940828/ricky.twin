import { getRuntimeStore } from "@/server/runtime/file-runtime-store";
import { observeRequest } from "@/server/observability/request-monitor";
import { getObservabilityStore } from "@/server/observability/sqlite-observability-store";
import {
  attachVisitorCookie,
  userAgentGroup,
  visitorIdForRequest,
} from "@/server/runtime/visitor-session";

export async function POST(request: Request) {
  const visitorId = visitorIdForRequest(request);
  return observeRequest({
    request,
    route: "/api/visit",
    actor: "anonymous",
    visitorId,
    handler: async () => {
  let path = "/";
  try {
    const body = (await request.json()) as { path?: unknown };
    if (typeof body.path === "string") {
      path = body.path;
    }
  } catch {
    path = "/";
  }
  await getRuntimeStore().recordVisit({
    visitorId,
    path,
    referer: request.headers.get("referer") ?? undefined,
    userAgentGroup: userAgentGroup(request),
    authenticated: false,
  });
  await getObservabilityStore().recordBehavior({
    eventType: "page_view",
    visitorId,
    sessionId: visitorId,
    path,
  });
  const response = Response.json(
    { ok: true },
    {
      headers: { "Cache-Control": "no-store" },
    },
  );
  return attachVisitorCookie(response, request, visitorId);
    },
  });
}
