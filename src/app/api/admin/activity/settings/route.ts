import {
  resolveAdminAuthConfig,
  verifyAdminRequest,
} from "@/server/admin/admin-auth";
import { ObservabilityStoreError } from "@/server/observability/observability-store";
import { observeRequest } from "@/server/observability/request-monitor";
import { getObservabilityStore } from "@/server/observability/sqlite-observability-store";

function unauthorized() {
  return Response.json(
    { ok: false, message: "管理员会话已失效，请重新登录" },
    { status: 401 },
  );
}

export async function GET(request: Request) {
  if (!verifyAdminRequest(request, resolveAdminAuthConfig())) {
    return unauthorized();
  }
  return observeRequest({
    request,
    route: "/api/admin/activity/settings",
    actor: "admin",
    async handler() {
      return Response.json(
        { ok: true, settings: await getObservabilityStore().getSettings() },
        { headers: { "Cache-Control": "no-store" } },
      );
    },
  });
}

export async function PUT(request: Request) {
  if (!verifyAdminRequest(request, resolveAdminAuthConfig())) {
    return unauthorized();
  }
  return observeRequest({
    request,
    route: "/api/admin/activity/settings",
    actor: "admin",
    async handler() {
      try {
        const body = (await request.json()) as {
          transcriptEnabled?: unknown;
          retentionDays?: unknown;
        };
        if (
          typeof body.transcriptEnabled !== "boolean" ||
          typeof body.retentionDays !== "number"
        ) {
          return Response.json(
            { ok: false, message: "留存设置格式无效" },
            { status: 400 },
          );
        }
        const settings = await getObservabilityStore().updateSettings({
          transcriptEnabled: body.transcriptEnabled,
          retentionDays: body.retentionDays,
        });
        return Response.json(
          { ok: true, settings },
          { headers: { "Cache-Control": "no-store" } },
        );
      } catch (error) {
        return Response.json(
          {
            ok: false,
            message:
              error instanceof ObservabilityStoreError
                ? error.message
                : "留存设置保存失败",
          },
          { status: 422 },
        );
      }
    },
  });
}
