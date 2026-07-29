import {
  resolveAdminAuthConfig,
  verifyAdminRequest,
} from "@/server/admin/admin-auth";
import { getRuntimeStore } from "@/server/runtime/file-runtime-store";
import { RuntimeStoreError } from "@/server/runtime/runtime-store";
import type { RuntimeLeadStatus } from "@/server/runtime/runtime-types";

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
  let status: RuntimeLeadStatus;
  try {
    const body = (await request.json()) as { status?: unknown };
    if (
      body.status !== "new" &&
      body.status !== "contacted" &&
      body.status !== "closed"
    ) {
      throw new Error("invalid");
    }
    status = body.status;
  } catch {
    return Response.json(
      { ok: false, message: "线索状态无效" },
      { status: 400 },
    );
  }
  const { id } = await context.params;
  try {
    return Response.json(
      {
        ok: true,
        workspace: await getRuntimeStore().updateLeadStatus(
          id,
          status,
        ),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return Response.json(
      {
        ok: false,
        message:
          error instanceof RuntimeStoreError
            ? error.message
            : "线索状态更新失败",
      },
      { status: 422 },
    );
  }
}
