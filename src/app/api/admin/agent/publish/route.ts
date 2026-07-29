import {
  resolveAdminAuthConfig,
  verifyAdminRequest,
} from "@/server/admin/admin-auth";
import { getAgentService } from "@/server/agent/agent-service";

export async function POST(request: Request) {
  if (!verifyAdminRequest(request, resolveAdminAuthConfig())) {
    return Response.json(
      { ok: false, message: "管理员会话已失效，请重新登录" },
      { status: 401 },
    );
  }
  let note: unknown;
  try {
    const body = (await request.json()) as { note?: unknown };
    note = body.note;
  } catch {
    note = undefined;
  }
  const result = await getAgentService().publish(note);
  return Response.json(result, {
    status: result.ok ? 200 : 422,
    headers: { "Cache-Control": "no-store" },
  });
}
