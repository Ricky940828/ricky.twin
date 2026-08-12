"use client";

import { useCallback, useEffect, useState } from "react";

import type { SiteContent } from "@/content/types";
import type { AdminContentResponse } from "@/server/content/content-service";
import type { ContentWorkspace } from "@/server/content/content-workspace";
import { AdminLogin } from "@/components/admin/admin-login";
import {
  AdminShell,
  type AdminModuleId,
  type SaveState,
} from "@/components/admin/admin-shell";
import {
  ContentEditor,
  type AdminEditorId,
} from "@/components/admin/content-editor";
import {
  getDefaultEditorTarget,
  type AdminPreviewFocusRequest,
  type AdminPreviewTarget,
} from "@/components/admin/content-editor-config";
import { LivePreview } from "@/components/admin/live-preview";
import { KnowledgeManager } from "@/components/admin/knowledge/knowledge-manager";
import { AgentManager } from "@/components/admin/agent/agent-manager";
import { ModelManager } from "@/components/admin/models/model-manager";
import { ActivityManager } from "@/components/admin/activity/activity-manager";

type SessionState = "checking" | "unauthenticated" | "authenticated";

interface SessionResponse {
  authenticated: boolean;
  configured: boolean;
  localFallback: boolean;
}

export function AdminWorkspace() {
  const [sessionState, setSessionState] =
    useState<SessionState>("checking");
  const [localFallback, setLocalFallback] = useState(false);
  const [workspace, setWorkspace] = useState<ContentWorkspace | null>(
    null,
  );
  const [draft, setDraft] = useState<SiteContent | null>(null);
  const [activeEditor, setActiveEditor] =
    useState<AdminEditorId>("home");
  const [previewFocus, setPreviewFocus] =
    useState<AdminPreviewFocusRequest>(() => ({
      ...getDefaultEditorTarget("home"),
      requestId: 1,
    }));
  const [activeModule, setActiveModule] =
    useState<AdminModuleId>("content");
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [error, setError] = useState("");

  const loadWorkspace = useCallback(async () => {
    setError("");
    const response = await fetch("/api/admin/content", {
      cache: "no-store",
    });
    if (response.status === 401) {
      setSessionState("unauthenticated");
      return;
    }
    const result = (await response.json()) as AdminContentResponse;
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setWorkspace(result.workspace);
    setDraft(structuredClone(result.workspace.draft));
    setSaveState("saved");
    setSessionState("authenticated");
  }, []);

  useEffect(() => {
    let active = true;
    const check = async () => {
      try {
        const response = await fetch("/api/admin/session/status", {
          cache: "no-store",
        });
        const result = (await response.json()) as SessionResponse;
        if (!active) {
          return;
        }
        setLocalFallback(result.localFallback);
        if (!result.authenticated) {
          setSessionState("unauthenticated");
          return;
        }
        await loadWorkspace();
      } catch {
        if (active) {
          setError("管理后台暂时无法加载");
          setSessionState("unauthenticated");
        }
      }
    };
    void check();
    return () => {
      active = false;
    };
  }, [loadWorkspace]);

  const updateDraft = (content: SiteContent) => {
    setDraft(content);
    setSaveState("dirty");
  };

  const requestPreviewFocus = useCallback(
    (target: AdminPreviewTarget) => {
      setPreviewFocus((current) => ({
        ...target,
        requestId: current.requestId + 1,
      }));
    },
    [],
  );

  const changeEditor = useCallback(
    (editor: AdminEditorId) => {
      setActiveEditor(editor);
      requestPreviewFocus(getDefaultEditorTarget(editor));
    },
    [requestPreviewFocus],
  );

  const saveDraft = async () => {
    if (!draft) {
      return;
    }
    setSaveState("saving");
    setError("");
    try {
      const response = await fetch("/api/admin/content", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: draft }),
      });
      const result = (await response.json()) as AdminContentResponse;
      if (!result.ok) {
        setSaveState("error");
        setError(
          result.issues?.[0]
            ? `${result.issues[0].path}：${result.issues[0].message}`
            : result.message,
        );
        return;
      }
      setWorkspace(result.workspace);
      setDraft(structuredClone(result.workspace.draft));
      setSaveState("saved");
    } catch {
      setSaveState("error");
      setError("保存失败，当前修改仍保留在页面中");
    }
  };

  const logout = async () => {
    await fetch("/api/admin/session/logout", { method: "POST" });
    setWorkspace(null);
    setDraft(null);
    setSessionState("unauthenticated");
  };

  const publishDraft = async (note: string) => {
    if (saveState !== "saved") {
      setError("请先保存草稿，再发布到正式站");
      return false;
    }
    setError("");
    try {
      const response = await fetch("/api/admin/content/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note }),
      });
      const result = (await response.json()) as AdminContentResponse;
      if (!result.ok) {
        setError(result.message);
        return false;
      }
      setWorkspace(result.workspace);
      setDraft(structuredClone(result.workspace.draft));
      setSaveState("saved");
      return true;
    } catch {
      setError("发布失败，正式站仍保持上一版本");
      return false;
    }
  };

  if (sessionState === "checking") {
    return (
      <main className="admin-loading">
        <span aria-hidden="true" />
        正在打开内容后台…
      </main>
    );
  }

  if (sessionState === "unauthenticated") {
    return (
      <AdminLogin
        localFallback={localFallback}
        onAuthenticated={() => void loadWorkspace()}
      />
    );
  }

  if (!workspace || !draft) {
    return (
      <main className="admin-loading">
        <p>{error || "正在读取内容工作区…"}</p>
        <button onClick={() => void loadWorkspace()} type="button">
          重新加载
        </button>
      </main>
    );
  }

  return (
    <AdminShell
      activeEditor={activeEditor}
      activeModule={activeModule}
      onEditorChange={changeEditor}
      onLogout={() => void logout()}
      onModuleChange={setActiveModule}
      onSave={() => void saveDraft()}
      saveState={saveState}
      versionLabel={`正式版本 ${workspace.publishedVersion.id}`}
    >
      {activeModule === "content" ? (
        <div className="admin-content-layout">
          <div className="admin-content-layout__editor">
            {error ? (
              <div className="admin-form-error" role="alert">
                {error}
              </div>
            ) : null}
            <ContentEditor
              activeEditor={activeEditor}
              content={draft}
              onChange={updateDraft}
              onFocusChange={requestPreviewFocus}
            />
          </div>
          <LivePreview
            canPublish={saveState === "saved"}
            content={draft}
            focus={previewFocus}
            onPublish={publishDraft}
          />
        </div>
      ) : activeModule === "knowledge" ? (
        <KnowledgeManager />
      ) : activeModule === "agent" ? (
        <AgentManager />
      ) : activeModule === "models" ? (
        <ModelManager />
      ) : (
        <ActivityManager />
      )}
    </AdminShell>
  );
}
