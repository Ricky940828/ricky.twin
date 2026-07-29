import {
  resolveAdminAuthConfig,
  verifyAdminRequest,
} from "@/server/admin/admin-auth";
import { getAgentService } from "@/server/agent/agent-service";

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  if (!verifyAdminRequest(request, resolveAdminAuthConfig())) {
    return Response.json(
      { ok: false, message: "管理员会话已失效，请重新登录" },
      { status: 401 },
    );
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { ok: false, message: "模型连接配置格式无效" },
      { status: 400 },
    );
  }
  const { id } = await context.params;
  const result = await getAgentService().upsertModel({
    ...(typeof body === "object" && body !== null ? body : {}),
    id,
  });
  return Response.json(result, {
    status: result.ok ? 200 : 422,
    headers: { "Cache-Control": "no-store" },
  });
}
