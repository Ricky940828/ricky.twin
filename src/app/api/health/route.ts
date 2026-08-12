import { getSystemHealthCheck } from "@/server/health/system-health";

export async function GET() {
  const health = await getSystemHealthCheck()();
  return Response.json(health, {
    status: health.ok ? 200 : 503,
    headers: { "Cache-Control": "no-store" },
  });
}
