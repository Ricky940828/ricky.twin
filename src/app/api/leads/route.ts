import { getRuntimeStore } from "@/server/runtime/file-runtime-store";
import { RuntimeStoreError } from "@/server/runtime/runtime-store";
import {
  attachVisitorCookie,
  visitorIdForRequest,
} from "@/server/runtime/visitor-session";

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    const value = await request.json();
    body =
      typeof value === "object" && value !== null
        ? (value as Record<string, unknown>)
        : {};
  } catch {
    return Response.json(
      { ok: false, message: "沟通信息格式无效" },
      { status: 400 },
    );
  }
  const visitorId = visitorIdForRequest(request);
  try {
    await getRuntimeStore().createLead({
      visitorId,
      name: typeof body.name === "string" ? body.name : "",
      role: typeof body.role === "string" ? body.role : "",
      contact:
        typeof body.contact === "string" ? body.contact : "",
      direction:
        typeof body.direction === "string" ? body.direction : "",
      consent: body.consent === true,
    });
    const response = Response.json(
      {
        ok: true,
        message: "沟通意向已提交，Ricky 将在方便时与你联系。",
      },
      {
        status: 201,
        headers: { "Cache-Control": "no-store" },
      },
    );
    return attachVisitorCookie(response, request, visitorId);
  } catch (error) {
    return Response.json(
      {
        ok: false,
        message:
          error instanceof RuntimeStoreError
            ? error.message
            : "沟通意向暂时无法提交，请稍后再试",
      },
      { status: 422 },
    );
  }
}
