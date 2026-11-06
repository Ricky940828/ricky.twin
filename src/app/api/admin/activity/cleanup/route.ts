import {
  resolveAdminAuthConfig,
  verifyAdminRequest,
} from "@/server/admin/admin-auth";
import { observeRequest } from "@/server/observability/request-monitor";
import { getObservabilityStore } from "@/server/observability/sqlite-observability-store";

export async function POST(request: Request) {
  if (!verifyAdminRequest(request, resolveAdminAuthConfig())) {
    return Response.json(
      { ok: false, message: "管理员会话已失效，请重新登录" },
      { status: 401 },
    );
  }
  return observeRequest({
    request,
    route: "/api/admin/activity/cleanup",
    actor: "admin",
    async handler() {
      try {
        const removed = await getObservabilityStore().cleanupExpired();
        return Response.json(
          { ok: true, removed },
          { headers: { "Cache-Control": "no-store" } },
        );
      } catch {
        return Response.json(
          { ok: false, message: "到期监测记录清理失败" },
          { status: 422 },
        );
      }
    },
  });
}
