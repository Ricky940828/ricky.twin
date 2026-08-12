import type { SiteSectionId } from "@/content/types";

export const DIRECT_NAVIGATION_EVENT = "ricky:direct-navigation";

export interface DirectNavigationDetail {
  section: SiteSectionId;
}
