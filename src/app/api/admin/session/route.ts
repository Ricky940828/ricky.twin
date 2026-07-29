import {
  createAdminSessionCookie,
  createAdminSessionToken,
  resolveAdminAuthConfig,
  verifyAdminPassword,
} from "@/server/admin/admin-auth";

export async function POST(request: Request) {
  const config = resolveAdminAuthConfig();
  if (!config) {
    return Response.json(
      { ok: false, message: "管理员登录尚未完成安全配置" },
      { status: 503 },
    );
  }

  let password = "";
  try {
    const body = (await request.json()) as { password?: unknown };
    password = typeof body.password === "string" ? body.password : "";
  } catch {
    return Response.json(
      { ok: false, message: "登录信息格式无效" },
      { status: 400 },
    );
  }

  if (!verifyAdminPassword(password, config)) {
    return Response.json(
      { ok: false, message: "登录信息不正确" },
      { status: 401 },
    );
  }

  const token = createAdminSessionToken(config);
  return Response.json(
    { ok: true },
    {
      headers: {
        "Set-Cookie": createAdminSessionCookie(token, config),
      },
    },
  );
}
