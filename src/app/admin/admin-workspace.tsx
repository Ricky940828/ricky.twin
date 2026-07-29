"use client";

import { useCallback, useEffect, useState } from "react";

import type { SiteContent } from "@/content/types";
import type { AdminContentResponse } from "@/server/content/content-service";
import type { ContentWorkspace } from "@/server/content/content-workspace";
import { AdminLogin } from "@/components/admin/admin-login";
import {
  AdminShell,
  type SaveState,
} from "@/components/admin/admin-shell";
import {
  ContentEditor,
  type AdminEditorId,
} from "@/components/admin/content-editor";

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
    useState<AdminEditorId>("overview");
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
      onEditorChange={setActiveEditor}
      onLogout={() => void logout()}
      onSave={() => void saveDraft()}
      saveState={saveState}
      versionLabel={`正式版本 ${workspace.publishedVersion.id}`}
    >
      {error ? (
        <div className="admin-form-error" role="alert">
          {error}
        </div>
      ) : null}
      <ContentEditor
        activeEditor={activeEditor}
        content={draft}
        onChange={updateDraft}
      />
    </AdminShell>
  );
}
