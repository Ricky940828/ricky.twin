import {
  resolveAdminAuthConfig,
  verifyAdminRequest,
} from "@/server/admin/admin-auth";
import { getRuntimeStore } from "@/server/runtime/file-runtime-store";

export async function GET(request: Request) {
  if (!verifyAdminRequest(request, resolveAdminAuthConfig())) {
    return Response.json(
      { ok: false, message: "管理员会话已失效，请重新登录" },
      { status: 401 },
    );
  }
  return Response.json(
    {
      ok: true,
      workspace: await getRuntimeStore().getWorkspace(),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
