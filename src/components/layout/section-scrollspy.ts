import type { SiteSectionId } from "@/content/types";

export interface SectionViewportMetric {
  id: SiteSectionId;
  top: number;
}

/**
 * Resolve the section that has actually reached the reading anchor.
 *
 * This deliberately ignores the navigation target. During smooth scrolling the
 * highlight therefore follows what is on screen instead of jumping ahead.
 */
export function resolveActiveSection(
  sections: readonly SectionViewportMetric[],
  anchor: number,
  fallback: SiteSectionId,
): SiteSectionId {
  if (sections.length === 0) {
    return fallback;
  }

  let active = sections[0].id;
  for (const section of sections) {
    if (section.top > anchor) {
      break;
    }
    active = section.id;
  }
  return active;
}
