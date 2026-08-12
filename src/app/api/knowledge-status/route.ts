import type { KnowledgeBadge } from "@/content/types";
import {
  getKnowledgeService,
  type AdminKnowledgeWorkspace,
} from "@/server/knowledge/knowledge-service";

export function knowledgeBadgesFromWorkspace(
  workspace: AdminKnowledgeWorkspace,
): KnowledgeBadge[] {
  return workspace.bases
    .filter((base) => base.loungeVisible !== false)
    .map((base) => ({
      id: base.id,
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
          : "需申请访问权限",
      ragEnabled: base.ragEnabled,
    }));
}

export async function GET() {
  const workspace = await getKnowledgeService().getAdminWorkspace();
  const configured = workspace.bases.length > 0;
  const knowledge = knowledgeBadgesFromWorkspace(workspace);
  return Response.json(
    { ok: true, configured, knowledge },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
