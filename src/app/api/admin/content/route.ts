import {
  resolveAdminAuthConfig,
  verifyAdminRequest,
} from "@/server/admin/admin-auth";
import { getContentService } from "@/server/content/content-service";

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
  const workspace = await getContentService().getWorkspace();
  return Response.json(
    { ok: true, workspace },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function PUT(request: Request) {
  if (!verifyAdminRequest(request, resolveAdminAuthConfig())) {
    return unauthorized();
  }

  let content: unknown;
  try {
    const body = (await request.json()) as { content?: unknown };
    content = body.content;
  } catch {
    return Response.json(
      { ok: false, message: "草稿数据格式无效" },
      { status: 400 },
    );
  }

  const result = await getContentService().saveDraft(content);
  return Response.json(result, {
    status: result.ok ? 200 : 422,
    headers: { "Cache-Control": "no-store" },
  });
}
