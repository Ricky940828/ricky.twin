import {
  createClearedAdminSessionCookie,
  resolveAdminAuthConfig,
} from "@/server/admin/admin-auth";

export function POST() {
  const config = resolveAdminAuthConfig();
  return Response.json(
    { ok: true },
    {
      headers: {
        "Set-Cookie": createClearedAdminSessionCookie(
          config?.secure ?? process.env.NODE_ENV === "production",
        ),
      },
    },
  );
}
