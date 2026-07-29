import {
  resolveAdminAuthConfig,
  verifyAdminRequest,
} from "@/server/admin/admin-auth";
import { getAgentService } from "@/server/agent/agent-service";

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
  return Response.json(
    {
      ok: true,
      workspace: await getAgentService().getWorkspace(),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: Request) {
  if (!verifyAdminRequest(request, resolveAdminAuthConfig())) {
    return unauthorized();
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
  const result = await getAgentService().upsertModel(body);
  return Response.json(result, {
    status: result.ok ? 201 : 422,
    headers: { "Cache-Control": "no-store" },
  });
}
