import { resolveAdminAuthConfig, verifyAdminRequest } from "@/server/admin/admin-auth";
import { getUpdateService } from "@/server/update/update-service";

export function unauthorizedUpdateResponse() {
  return Response.json(
    { ok: false, message: "管理员会话已失效，请重新登录" },
    { status: 401 },
  );
}

export function updateFailure(error: unknown) {
  const message = error instanceof Error ? error.message : "系统更新操作失败";
  return Response.json({ ok: false, message }, { status: 422 });
}

export async function GET(request: Request) {
  if (!verifyAdminRequest(request, resolveAdminAuthConfig())) {
    return unauthorizedUpdateResponse();
  }
  try {
    return Response.json(
      { ok: true, status: await getUpdateService().status() },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return updateFailure(error);
  }
}

