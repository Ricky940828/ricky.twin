import {
  resolveAdminAuthConfig,
  verifyAdminRequest,
} from "@/server/admin/admin-auth";
import { observeRequest } from "@/server/observability/request-monitor";
import { getObservabilityStore } from "@/server/observability/sqlite-observability-store";
import { getRuntimeStore } from "@/server/runtime/file-runtime-store";

export async function GET(request: Request) {
  if (!verifyAdminRequest(request, resolveAdminAuthConfig())) {
    return Response.json(
      { ok: false, message: "管理员会话已失效，请重新登录" },
      { status: 401 },
    );
  }
  return observeRequest({
    request,
    route: "/api/admin/activity",
    actor: "admin",
    async handler() {
      const range = new URL(request.url).searchParams.get("range");
      const rawRange = range === null ? Number.NaN : Number(range);
      const rangeDays = Number.isFinite(rawRange)
        ? Math.min(90, Math.max(1, Math.trunc(rawRange)))
        : 7;
      const [workspace, dashboard] = await Promise.all([
        getRuntimeStore().getWorkspace(),
        getObservabilityStore().getDashboard(rangeDays),
      ]);
      return Response.json(
        { ok: true, workspace, dashboard },
        { headers: { "Cache-Control": "no-store" } },
      );
    },
  });
}
