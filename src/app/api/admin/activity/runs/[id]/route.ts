import {
  resolveAdminAuthConfig,
  verifyAdminRequest,
} from "@/server/admin/admin-auth";
import { ObservabilityStoreError } from "@/server/observability/observability-store";
import { observeRequest } from "@/server/observability/request-monitor";
import { getObservabilityStore } from "@/server/observability/sqlite-observability-store";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  if (!verifyAdminRequest(request, resolveAdminAuthConfig())) {
    return Response.json(
      { ok: false, message: "管理员会话已失效，请重新登录" },
      { status: 401 },
    );
  }
  return observeRequest({
    request,
    route: "/api/admin/activity/runs/:id",
    actor: "admin",
    async handler() {
      const { id } = await context.params;
      try {
        const run = await getObservabilityStore().getAiRunDetail(id);
        if (!run) {
          return Response.json(
            { ok: false, message: "未找到这条问答记录" },
            { status: 404 },
          );
        }
        return Response.json(
          { ok: true, run },
          { headers: { "Cache-Control": "no-store" } },
        );
      } catch (error) {
        return Response.json(
          {
            ok: false,
            message:
              error instanceof ObservabilityStoreError
                ? error.message
                : "问答详情读取失败",
          },
          { status: 422 },
        );
      }
    },
  });
}
