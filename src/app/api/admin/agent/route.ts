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

export async function PUT(request: Request) {
  if (!verifyAdminRequest(request, resolveAdminAuthConfig())) {
    return unauthorized();
  }
  let config: unknown;
  try {
    const body = (await request.json()) as { config?: unknown };
    config = body.config;
  } catch {
    return Response.json(
      { ok: false, message: "Agent 配置格式无效" },
      { status: 400 },
    );
  }
  const result = await getAgentService().saveDraft(config);
  return Response.json(result, {
    status: result.ok ? 200 : 422,
    headers: { "Cache-Control": "no-store" },
  });
}
