import {
  resolveAdminAuthConfig,
  verifyAdminRequest,
} from "@/server/admin/admin-auth";
import { getKnowledgeService } from "@/server/knowledge/knowledge-service";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  if (!verifyAdminRequest(request, resolveAdminAuthConfig())) {
    return Response.json(
      { ok: false, message: "管理员会话已失效，请重新登录" },
      { status: 401 },
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return Response.json(
      { ok: false, message: "上传内容格式无效" },
      { status: 400 },
    );
  }
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return Response.json(
      { ok: false, message: "请选择 Markdown 文件" },
      { status: 400 },
    );
  }
  const documentId = formData.get("documentId");
  const { id } = await context.params;
  const result = await getKnowledgeService().ingestDocument({
    baseId: id,
    documentId:
      typeof documentId === "string" && documentId
        ? documentId
        : undefined,
    fileName: file.name,
    content: await file.text(),
  });
  return Response.json(result, {
    status: result.ok ? 200 : 422,
    headers: { "Cache-Control": "no-store" },
  });
}
