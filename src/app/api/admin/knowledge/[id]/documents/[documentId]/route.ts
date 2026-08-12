import {
  resolveAdminAuthConfig,
  verifyAdminRequest,
} from "@/server/admin/admin-auth";
import { getKnowledgeService } from "@/server/knowledge/knowledge-service";

interface RouteContext {
  params: Promise<{ id: string; documentId: string }>;
}

function unauthorized() {
  return Response.json(
    { ok: false, message: "管理员会话已失效，请重新登录" },
    { status: 401 },
  );
}

export async function GET(request: Request, context: RouteContext) {
  if (!verifyAdminRequest(request, resolveAdminAuthConfig())) {
    return unauthorized();
  }
  const { id, documentId } = await context.params;
  const result = await getKnowledgeService().getDocumentContent(
    id,
    documentId,
  );
  return Response.json(result, {
    status: result.ok ? 200 : 404,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function DELETE(request: Request, context: RouteContext) {
  if (!verifyAdminRequest(request, resolveAdminAuthConfig())) {
    return unauthorized();
  }
  const { id, documentId } = await context.params;
  const result = await getKnowledgeService().deleteDocument(
    id,
    documentId,
  );
  return Response.json(result, {
    status: result.ok ? 200 : 404,
    headers: { "Cache-Control": "no-store" },
  });
}
