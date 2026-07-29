import type { SiteContent } from "@/content/types";

import { ContentValidationError, type ContentStore } from "./content-store";
import { createFileContentStore } from "./file-content-store";
import {
  validateSiteContent,
  type ValidationIssue,
} from "./content-validation";
import type { ContentWorkspace } from "./content-workspace";

export type AdminContentResponse =
  | { ok: true; workspace: ContentWorkspace }
  | {
      ok: false;
      message: string;
      issues?: ValidationIssue[];
    };

export interface ContentService {
  getWorkspace(): Promise<ContentWorkspace>;
  getPublished(): Promise<SiteContent>;
  saveDraft(value: unknown): Promise<AdminContentResponse>;
  publish(note: unknown): Promise<AdminContentResponse>;
}

export function createContentService(store: ContentStore): ContentService {
  return {
    getWorkspace: () => store.getWorkspace(),
    getPublished: () => store.getPublished(),

    async saveDraft(value) {
      const validation = validateSiteContent(value);
      if (!validation.ok) {
        return {
          ok: false,
          message: "草稿存在需要修正的内容",
          issues: validation.issues,
        };
      }
      try {
        return {
          ok: true,
          workspace: await store.saveDraft(validation.value),
        };
      } catch (error) {
        if (error instanceof ContentValidationError) {
          return {
            ok: false,
            message: error.message,
            issues: error.issues,
          };
        }
        return {
          ok: false,
          message: "草稿保存失败，请保留当前页面并稍后重试",
        };
      }
    },

    async publish(note) {
      const normalizedNote =
        typeof note === "string" && note.trim()
          ? note.trim()
          : "内容更新";
      try {
        return {
          ok: true,
          workspace: await store.publish(normalizedNote),
        };
      } catch {
        return {
          ok: false,
          message: "发布失败，正式站仍保持上一版本",
        };
      }
    },
  };
}

let singleton: ContentService | undefined;

export function getContentService() {
  singleton ??= createContentService(createFileContentStore());
  return singleton;
}
