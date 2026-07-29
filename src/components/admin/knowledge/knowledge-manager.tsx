"use client";

import {
  CheckCircle2,
  Database,
  FileText,
  Plus,
  RefreshCw,
  Upload,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
} from "react";

import {
  EditorPanel,
  TextAreaField,
  TextField,
  ToggleField,
} from "@/components/admin/editor-fields";
import type {
  AdminKnowledgeResponse,
  AdminKnowledgeWorkspace,
} from "@/server/knowledge/knowledge-service";
import type {
  KnowledgeAccessLevel,
  KnowledgeBase,
} from "@/server/knowledge/knowledge-types";

interface BaseDraft {
  name: string;
  description: string;
  defaultAccess: KnowledgeAccessLevel;
  ragEnabled: boolean;
  loungeVisible: boolean;
}

const EMPTY_DRAFT: BaseDraft = {
  name: "",
  description: "",
  defaultAccess: "public",
  ragEnabled: true,
  loungeVisible: true,
};

const ACCESS_LABELS: Record<KnowledgeAccessLevel, string> = {
  public: "公开访客可用",
  authorized: "授权账号可用",
  private: "仅本人可用",
};

function draftFromBase(base: KnowledgeBase): BaseDraft {
  return {
    name: base.name,
    description: base.description,
    defaultAccess: base.defaultAccess,
    ragEnabled: base.ragEnabled,
    loungeVisible: base.loungeVisible !== false,
  };
}

export function KnowledgeManager() {
  const [workspace, setWorkspace] =
    useState<AdminKnowledgeWorkspace | null>(null);
  const [selectedId, setSelectedId] = useState("");
  const [draft, setDraft] = useState<BaseDraft>(EMPTY_DRAFT);
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const selected = useMemo(
    () => workspace?.bases.find((base) => base.id === selectedId),
    [selectedId, workspace],
  );
  const documents = useMemo(
    () =>
      workspace?.documents.filter(
        (document) => document.baseId === selectedId,
      ) ?? [],
    [selectedId, workspace],
  );

  const applyWorkspace = (value: AdminKnowledgeWorkspace) => {
    setWorkspace(value);
    const nextId =
      value.bases.find((base) => base.id === selectedId)?.id ??
      value.bases[0]?.id ??
      "";
    setSelectedId(nextId);
    const next = value.bases.find((base) => base.id === nextId);
    if (next) {
      setDraft(draftFromBase(next));
    }
  };

  useEffect(() => {
    let active = true;
    const loadWorkspace = async () => {
      try {
        const response = await fetch("/api/admin/knowledge", {
          cache: "no-store",
        });
        const result = (await response.json()) as AdminKnowledgeResponse;
        if (!active) {
          return;
        }
        if (!result.ok) {
          setError(result.message);
          return;
        }
        setWorkspace(result.workspace);
        const first = result.workspace.bases[0];
        if (first) {
          setSelectedId(first.id);
          setDraft(draftFromBase(first));
        } else {
          setCreating(true);
          setDraft(EMPTY_DRAFT);
        }
      } catch {
        if (active) {
          setError("知识库工作区暂时无法加载");
        }
      }
    };
    void loadWorkspace();
    return () => {
      active = false;
    };
  }, []);

  const selectBase = (base: KnowledgeBase) => {
    setSelectedId(base.id);
    setDraft(draftFromBase(base));
    setCreating(false);
    setError("");
    setMessage("");
  };

  const saveBase = async () => {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch(
        creating
          ? "/api/admin/knowledge"
          : `/api/admin/knowledge/${selectedId}`,
        {
          method: creating ? "POST" : "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(draft),
        },
      );
      const result = (await response.json()) as AdminKnowledgeResponse;
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setCreating(false);
      applyWorkspace(result.workspace);
      setMessage(creating ? "知识库已创建" : "知识库配置已保存");
    } catch {
      setError("知识库配置保存失败");
    } finally {
      setBusy(false);
    }
  };

  const upload = async (
    event: ChangeEvent<HTMLInputElement>,
    documentId?: string,
  ) => {
    const file = event.target.files?.[0];
    if (!file || !selectedId) {
      return;
    }
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      if (documentId) {
        formData.append("documentId", documentId);
      }
      const response = await fetch(
        `/api/admin/knowledge/${selectedId}/documents`,
        { method: "POST", body: formData },
      );
      const result = (await response.json()) as AdminKnowledgeResponse;
      if (!result.ok) {
        setError(result.message);
        return;
      }
      applyWorkspace(result.workspace);
      setMessage(
        documentId
          ? `${file.name} 已更新并重新索引`
          : `${file.name} 已上传并完成索引`,
      );
    } catch {
      setError("文档上传失败，原有索引未受影响");
    } finally {
      setBusy(false);
      event.target.value = "";
    }
  };

  if (!workspace) {
    return (
      <section className="admin-module-loading">
        <span aria-hidden="true" />
        {error || "正在读取知识库…"}
      </section>
    );
  }

  return (
    <div className="admin-knowledge-layout">
      <aside className="admin-knowledge-list">
        <header>
          <div>
            <span className="admin-kicker">KNOWLEDGE BASES</span>
            <h2>知识库</h2>
          </div>
          <button
            aria-label="快速新建知识库"
            onClick={() => {
              setCreating(true);
              setSelectedId("");
              setDraft(EMPTY_DRAFT);
            }}
            type="button"
          >
            <Plus aria-hidden size={16} />
          </button>
        </header>
        {workspace.bases.length === 0 ? (
          <div className="admin-knowledge-empty">
            <Database aria-hidden size={24} />
            <strong>还没有知识库</strong>
            <p>先建立语义边界，再上传对应的 Markdown 资料。</p>
            <button
              className="admin-button is-secondary"
              onClick={() => {
                setCreating(true);
                setDraft(EMPTY_DRAFT);
              }}
              type="button"
            >
              新建知识库
            </button>
          </div>
        ) : (
          <div className="admin-knowledge-list__items">
            {workspace.bases.map((base) => (
              <button
                key={base.id}
                className={selectedId === base.id ? "is-active" : ""}
                onClick={() => selectBase(base)}
                type="button"
              >
                <span>
                  <strong>{base.name}</strong>
                  <small>{ACCESS_LABELS[base.defaultAccess]}</small>
                </span>
                <span data-status={base.indexStatus}>
                  {base.documentCount} 文档 · {base.chunkCount} 片段
                </span>
              </button>
            ))}
          </div>
        )}
      </aside>

      <div className="admin-editor-stack">
        {creating || selected ? (
          <>
            <EditorPanel
              action={
                <button
                  className="admin-button is-primary"
                  disabled={busy}
                  onClick={() => void saveBase()}
                  type="button"
                >
                  {creating ? "创建知识库" : "保存配置"}
                </button>
              }
              description="语义名称会用于前台权限提示；真实目录和内部标识不会对外展示。"
              title={creating ? "新建知识库" : "知识库设置"}
            >
              <TextField
                aria-label="知识库名称"
                label="知识库名称"
                onChange={(event) =>
                  setDraft((value) => ({
                    ...value,
                    name: event.target.value,
                  }))
                }
                placeholder="例如：公开职业资料"
                value={draft.name}
              />
              <TextAreaField
                aria-label="知识库说明"
                label="知识库说明"
                onChange={(event) =>
                  setDraft((value) => ({
                    ...value,
                    description: event.target.value,
                  }))
                }
                placeholder="说明这组知识回答什么问题"
                rows={3}
                value={draft.description}
              />
              <div className="admin-form-grid is-two">
                <label className="admin-field">
                  <span>
                    <strong>默认权限</strong>
                  </span>
                  <select
                    aria-label="默认权限"
                    onChange={(event) =>
                      setDraft((value) => ({
                        ...value,
                        defaultAccess: event.target
                          .value as KnowledgeAccessLevel,
                      }))
                    }
                    value={draft.defaultAccess}
                  >
                    {Object.entries(ACCESS_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <ToggleField
                  checked={draft.ragEnabled}
                  description="关闭后，这个知识库不会进入任何会客厅检索"
                  label="参与 RAG"
                  onChange={(ragEnabled) =>
                    setDraft((value) => ({ ...value, ragEnabled }))
                  }
                />
                <ToggleField
                  checked={draft.loungeVisible}
                  description="在前台展示语义名称与权限状态，不暴露真实路径"
                  label="会客厅展示"
                  onChange={(loungeVisible) =>
                    setDraft((value) => ({
                      ...value,
                      loungeVisible,
                    }))
                  }
                />
              </div>
            </EditorPanel>

            {!creating && selected ? (
              <EditorPanel
                action={
                  <label className="admin-upload-button">
                    <Upload aria-hidden size={15} />
                    上传 Markdown
                    <input
                      accept=".md,text/markdown"
                      aria-label="上传 Markdown"
                      disabled={busy}
                      onChange={(event) => void upload(event)}
                      type="file"
                    />
                  </label>
                }
                description="上传同名文件会更新存量内容；也可以在单个文档上明确执行替换。"
                title="内容与索引"
              >
                {documents.length === 0 ? (
                  <div className="admin-documents-empty">
                    <FileText aria-hidden size={22} />
                    <p>还没有文档。上传 Markdown 后会自动解析标题并分块。</p>
                  </div>
                ) : (
                  <div className="admin-document-list">
                    {documents.map((document) => (
                      <article key={document.id}>
                        <span className="admin-document-list__icon">
                          {document.status === "ready" ? (
                            <CheckCircle2 aria-hidden size={18} />
                          ) : (
                            <RefreshCw aria-hidden size={18} />
                          )}
                        </span>
                        <div>
                          <strong>{document.fileName}</strong>
                          <small>
                            {document.chunkCount} 个片段 ·{" "}
                            {Math.max(
                              1,
                              Math.round(document.sizeBytes / 1024),
                            )}{" "}
                            KB
                          </small>
                        </div>
                        <label className="admin-document-update">
                          更新内容
                          <input
                            accept=".md,text/markdown"
                            aria-label={`更新内容：${document.fileName}`}
                            disabled={busy}
                            onChange={(event) =>
                              void upload(event, document.id)
                            }
                            type="file"
                          />
                        </label>
                      </article>
                    ))}
                  </div>
                )}
              </EditorPanel>
            ) : null}
          </>
        ) : null}

        {message ? (
          <div className="admin-module-message" role="status">
            <CheckCircle2 aria-hidden size={15} />
            {message}
          </div>
        ) : null}
        {error ? (
          <div className="admin-form-error" role="alert">
            {error}
          </div>
        ) : null}
      </div>
    </div>
  );
}
