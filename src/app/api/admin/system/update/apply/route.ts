import { resolveAdminAuthConfig, verifyAdminRequest } from "@/server/admin/admin-auth";
import { getUpdateService } from "@/server/update/update-service";
import { unauthorizedUpdateResponse, updateFailure } from "../route";

export async function POST(request: Request) {
  if (!verifyAdminRequest(request, resolveAdminAuthConfig())) return unauthorizedUpdateResponse();
  try {
    return Response.json({ ok: true, status: await getUpdateService().apply() }, { status: 202 });
  } catch (error) {
    return updateFailure(error);
  }
}

