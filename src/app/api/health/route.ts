import { getSystemLivenessCheck } from "@/server/health/system-health";

export async function GET() {
  const health = await getSystemLivenessCheck()();
  return Response.json(health, {
    status: 200,
    headers: { "Cache-Control": "no-store" },
  });
}
