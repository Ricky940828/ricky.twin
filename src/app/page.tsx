import { SectionRenderer } from "@/components/layout/section-renderer";
import { getContentService } from "@/server/content/content-service";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const published = await getContentService().getPublished();
  return <SectionRenderer site={published} />;
}
