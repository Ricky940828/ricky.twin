"use client";

import { useEffect, useState } from "react";

import type {
  ContentPreviewMessage,
  ContentPreviewReadyMessage,
} from "@/components/admin/live-preview";
import { SectionRenderer } from "@/components/layout/section-renderer";
import type { SiteContent } from "@/content/types";
import type { AdminPreviewFocusRequest } from "@/components/admin/content-editor-config";
import type { AdminContentResponse } from "@/server/content/content-service";
import { validateSiteContent } from "@/server/content/content-validation";

type PreviewState =
  | { status: "loading" }
  | {
      status: "ready";
      content: SiteContent;
      replayKey: number;
      focus?: AdminPreviewFocusRequest;
    }
  | { status: "error"; message: string };

function isPreviewMessage(
  value: unknown,
): value is ContentPreviewMessage {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value)
  ) {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  return (
    candidate.type === "ricky:content-preview" &&
    Number.isInteger(candidate.replayKey)
  );
}

export function PreviewClient() {
  const [preview, setPreview] = useState<PreviewState>({
    status: "loading",
  });

  useEffect(() => {
    let active = true;
    let receivedLiveDraft = false;

    const loadSavedDraft = async () => {
      try {
        const response = await fetch("/api/admin/content", {
          cache: "no-store",
        });
        if (response.status === 401) {
          if (active) {
            setPreview({
              status: "error",
              message: "管理会话已失效，请返回后台重新登录。",
            });
          }
          return;
        }
        const result = (await response.json()) as AdminContentResponse;
        if (active && result.ok && !receivedLiveDraft) {
          setPreview({
            status: "ready",
            content: result.workspace.draft,
            replayKey: 0,
          });
        } else if (active && !result.ok && !receivedLiveDraft) {
          setPreview({
            status: "error",
            message: "草稿暂时无法读取。",
          });
        }
      } catch {
        if (active) {
          setPreview({
            status: "error",
            message: "草稿预览暂时无法连接。",
          });
        }
      }
    };

    const receiveDraft = (event: MessageEvent<unknown>) => {
      if (event.origin !== window.location.origin) {
        return;
      }
      if (window.parent !== window && event.source !== window.parent) {
        return;
      }
      if (!isPreviewMessage(event.data)) {
        return;
      }
      const validation = validateSiteContent(event.data.payload);
      if (!validation.ok) {
        return;
      }
      receivedLiveDraft = true;
      setPreview({
        status: "ready",
        content: validation.value,
        replayKey: event.data.replayKey,
        focus: event.data.focus,
      });
    };

    window.addEventListener("message", receiveDraft);
    const readyMessage: ContentPreviewReadyMessage = {
      type: "ricky:content-preview-ready",
    };
    window.parent.postMessage(readyMessage, window.location.origin);
    void loadSavedDraft();

    return () => {
      active = false;
      window.removeEventListener("message", receiveDraft);
    };
  }, []);

  if (preview.status === "loading") {
    return (
      <main className="admin-preview-loading">
        <span aria-hidden="true" />
        正在装配前台预览…
      </main>
    );
  }

  if (preview.status === "error") {
    return (
      <main className="admin-preview-loading">
        <p>{preview.message}</p>
        <a href="/admin">返回内容后台</a>
      </main>
    );
  }

  return (
    <SectionRenderer
      key={preview.replayKey}
      mode="preview"
      previewFocus={preview.focus}
      site={preview.content}
    />
  );
}
