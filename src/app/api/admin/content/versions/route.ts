import {
  resolveAdminAuthConfig,
  verifyAdminRequest,
} from "@/server/admin/admin-auth";
import { getContentService } from "@/server/content/content-service";

export async function GET(request: Request) {
  if (!verifyAdminRequest(request, resolveAdminAuthConfig())) {
    return Response.json(
      { ok: false, message: "管理员会话已失效，请重新登录" },
      { status: 401 },
    );
  }

  const workspace = await getContentService().getWorkspace();
  return Response.json(
    {
      ok: true,
      publishedVersion: workspace.publishedVersion,
      versions: workspace.versions,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
