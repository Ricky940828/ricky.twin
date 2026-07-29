import {
  resolveAdminAuthConfig,
  verifyAdminRequest,
} from "@/server/admin/admin-auth";

export function GET(request: Request) {
  const config = resolveAdminAuthConfig();
  return Response.json({
    authenticated: verifyAdminRequest(request, config),
    configured: config !== null,
    localFallback:
      process.env.NODE_ENV !== "production" &&
      !process.env.RICKY_ADMIN_PASSWORD,
  });
}
