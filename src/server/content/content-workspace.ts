import type { SiteContent } from "@/content/types";

export interface ContentVersionMeta {
  id: string;
  createdAt: string;
  note: string;
}

export interface ContentWorkspace {
  draft: SiteContent;
  published: SiteContent;
  publishedVersion: ContentVersionMeta;
  versions: ContentVersionMeta[];
  draftUpdatedAt: string;
  warnings?: string[];
}
