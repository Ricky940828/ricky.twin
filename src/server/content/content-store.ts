import type { SiteContent } from "@/content/types";

import type { ContentWorkspace } from "./content-workspace";
import type { ValidationIssue } from "./content-validation";

export interface ContentStore {
  getWorkspace(): Promise<ContentWorkspace>;
  saveDraft(content: SiteContent): Promise<ContentWorkspace>;
  publish(note: string): Promise<ContentWorkspace>;
  getPublished(): Promise<SiteContent>;
}

export class ContentValidationError extends Error {
  constructor(public readonly issues: ValidationIssue[]) {
    super("内容未通过校验");
    this.name = "ContentValidationError";
  }
}
