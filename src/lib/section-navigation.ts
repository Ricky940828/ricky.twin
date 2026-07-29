import type { SiteContent, SiteSectionId } from "@/content/types";

export function getEnabledSectionIds(content: SiteContent): SiteSectionId[] {
  return [...content.sections]
    .filter((section) => section.enabled)
    .sort((a, b) => a.order - b.order)
    .map((section) => section.id);
}

export function getSectionAnchor(id: SiteSectionId): `#${SiteSectionId}` {
  return `#${id}`;
}
