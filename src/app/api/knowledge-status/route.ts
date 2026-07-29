import type { KnowledgeBadge } from "@/content/types";
import { getKnowledgeService } from "@/server/knowledge/knowledge-service";

export async function GET() {
  const workspace = await getKnowledgeService().getAdminWorkspace();
  const configured = workspace.bases.length > 0;
  const knowledge: KnowledgeBadge[] = workspace.bases
    .filter((base) => base.loungeVisible !== false)
    .map((base, index) => ({
      id: `knowledge-${index + 1}`,
      name: base.name,
      description: base.description,
      access:
        base.defaultAccess === "public" && base.ragEnabled
          ? "public"
          : "request",
      accessLabel: !base.ragEnabled
        ? "暂未开放"
        : base.defaultAccess === "public"
          ? "公开"
          : base.defaultAccess === "authorized"
            ? "需申请"
            : "仅受邀",
      ragEnabled: base.ragEnabled,
    }));
  return Response.json(
    { ok: true, configured, knowledge },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
