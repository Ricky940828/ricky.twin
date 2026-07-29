import { SectionRenderer } from "@/components/layout/section-renderer";
import { siteContent } from "@/content/site-content";

export default function HomePage() {
  return <SectionRenderer site={siteContent} />;
}
