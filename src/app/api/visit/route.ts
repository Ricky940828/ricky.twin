import { getRuntimeStore } from "@/server/runtime/file-runtime-store";
import {
  attachVisitorCookie,
  userAgentGroup,
  visitorIdForRequest,
} from "@/server/runtime/visitor-session";

export async function POST(request: Request) {
  let path = "/";
  try {
    const body = (await request.json()) as { path?: unknown };
    if (typeof body.path === "string") {
      path = body.path;
    }
  } catch {
    path = "/";
  }
  const visitorId = visitorIdForRequest(request);
  await getRuntimeStore().recordVisit({
    visitorId,
    path,
    referer: request.headers.get("referer") ?? undefined,
    userAgentGroup: userAgentGroup(request),
    authenticated: false,
  });
  const response = Response.json(
    { ok: true },
    {
      headers: { "Cache-Control": "no-store" },
    },
  );
  return attachVisitorCookie(response, request, visitorId);
}
