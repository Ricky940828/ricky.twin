"use client";

import {
  CheckCircle2,
  Database,
  Eye,
  FileText,
  FolderUp,
  Plus,
  RefreshCw,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from "react";

import {
  EditorPanel,
  TextAreaField,
  TextField,
  ToggleField,
} from "@/components/admin/editor-fields";
import { MarkdownContent } from "@/components/content/markdown-content";
import type {
  AdminKnowledgeDocumentResponse,
  AdminKnowledgeResponse,
  AdminKnowledgeWorkspace,
} from "@/server/knowledge/knowledge-service";
import type {
  KnowledgeAccessLevel,
  KnowledgeBase,
  KnowledgeDocument,
} from "@/server/knowledge/knowledge-types";

import { groupMarkdownFolderFiles } from "./folder-import";

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

const KNOWLEDGE_CHANGE_EVENT = "ricky:knowledge-changed";
const KNOWLEDGE_CHANNEL = "ricky-twin-knowledge";

function announceKnowledgeChange() {
  window.dispatchEvent(new Event(KNOWLEDGE_CHANGE_EVENT));
  if (typeof BroadcastChannel !== "undefined") {
    const channel = new BroadcastChannel(KNOWLEDGE_CHANNEL);
    channel.postMessage({ type: "changed" });
    channel.close();
  }
}

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
  const [documentPreview, setDocumentPreview] = useState<{
    document: KnowledgeDocument;
    content: string;
  } | null>(null);
  const [pendingDelete, setPendingDelete] =
    useState<KnowledgeDocument | null>(null);
  const [pendingBaseDelete, setPendingBaseDelete] =
    useState<KnowledgeBase | null>(null);
  const updateInputRefs = useRef(
    new Map<string, HTMLInputElement>(),
  );
  const folderInputRef = useRef<HTMLInputElement | null>(null);

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
      setCreating(false);
    } else {
      setDraft(EMPTY_DRAFT);
      setCreating(true);
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
      announceKnowledgeChange();
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
      announceKnowledgeChange();
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

  const importFolder = async (event: ChangeEvent<HTMLInputElement>) => {
    if (!workspace) {
      return;
    }
    const plan = groupMarkdownFolderFiles(event.target.files ?? []);
    if (plan.groups.length === 0) {
      setError("请选择至少包含一份 Markdown 的文件夹");
      event.target.value = "";
      return;
    }
    setBusy(true);
    setError("");
    setMessage("");
    try {
      let nextWorkspace = workspace;
      let importedFiles = 0;
      for (const group of plan.groups) {
        let base = nextWorkspace.bases.find(
          (item) => item.name.trim() === group.rootName.trim(),
        );
        if (!base) {
          const beforeIds = new Set(
            nextWorkspace.bases.map((item) => item.id),
          );
          const createResponse = await fetch("/api/admin/knowledge", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: group.rootName,
              description: `由文件夹“${group.rootName}”导入的 Markdown 知识库。`,
              defaultAccess: "private",
              ragEnabled: true,
              loungeVisible: true,
            }),
          });
          const created =
            (await createResponse.json()) as AdminKnowledgeResponse;
          if (!created.ok) {
            throw new Error(created.message);
          }
          nextWorkspace = created.workspace;
          base = nextWorkspace.bases.find(
            (item) => !beforeIds.has(item.id),
          );
          if (!base) {
            throw new Error(`知识库“${group.rootName}”创建结果无法识别`);
          }
        }

        for (const item of group.files) {
          const formData = new FormData();
          formData.append("file", item.file);
          formData.append("relativePath", item.relativePath);
          const uploadResponse = await fetch(
            `/api/admin/knowledge/${base.id}/documents`,
            { method: "POST", body: formData },
          );
          const uploaded =
            (await uploadResponse.json()) as AdminKnowledgeResponse;
          if (!uploaded.ok) {
            throw new Error(uploaded.message);
          }
          nextWorkspace = uploaded.workspace;
          importedFiles += 1;
        }
      }
      applyWorkspace(nextWorkspace);
      announceKnowledgeChange();
      setMessage(
        `${plan.groups.length} 个知识库、${importedFiles} 份 Markdown 已导入` +
          (plan.skipped.length
            ? `；已跳过 ${plan.skipped.length} 个非 Markdown 文件`
            : ""),
      );
    } catch (reason) {
      setError(
        reason instanceof Error
          ? `文件夹导入未完成：${reason.message}`
          : "文件夹导入未完成",
      );
    } finally {
      setBusy(false);
      event.target.value = "";
    }
  };

  const openDocument = async (document: KnowledgeDocument) => {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(
        `/api/admin/knowledge/${document.baseId}/documents/${document.id}`,
        { cache: "no-store" },
      );
      const result =
        (await response.json()) as AdminKnowledgeDocumentResponse;
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setDocumentPreview({
        document: result.document,
        content: result.content,
      });
    } catch {
      setError("文档内容暂时无法读取");
    } finally {
      setBusy(false);
    }
  };

  const deleteDocument = async () => {
    if (!pendingDelete) {
      return;
    }
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch(
        `/api/admin/knowledge/${pendingDelete.baseId}/documents/${pendingDelete.id}`,
        { method: "DELETE" },
      );
      const result = (await response.json()) as AdminKnowledgeResponse;
      if (!result.ok) {
        setError(result.message);
        return;
      }
      applyWorkspace(result.workspace);
      announceKnowledgeChange();
      setPendingDelete(null);
      setDocumentPreview((current) =>
        current?.document.id === pendingDelete.id ? null : current,
      );
      setMessage(`${pendingDelete.fileName} 已删除`);
    } catch {
      setError("文档删除失败，原有内容仍保持可用");
    } finally {
      setBusy(false);
    }
  };

  const deleteBase = async () => {
    if (!pendingBaseDelete) {
      return;
    }
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch(
        `/api/admin/knowledge/${pendingBaseDelete.id}`,
        { method: "DELETE" },
      );
      const result = (await response.json()) as AdminKnowledgeResponse;
      if (!result.ok) {
        setError(result.message);
        return;
      }
      applyWorkspace(result.workspace);
      announceKnowledgeChange();
      setPendingBaseDelete(null);
      setDocumentPreview((current) =>
        current?.document.baseId === pendingBaseDelete.id ? null : current,
      );
      setPendingDelete((current) =>
        current?.baseId === pendingBaseDelete.id ? null : current,
      );
      setMessage(`知识库“${pendingBaseDelete.name}”已删除`);
    } catch {
      setError("知识库删除失败，原有内容仍保持可用");
    } finally {
      setBusy(false);
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
    <>
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
        <button
          className="admin-knowledge-folder-import"
          disabled={busy}
          onClick={() => folderInputRef.current?.click()}
          type="button"
        >
          <FolderUp aria-hidden size={16} />
          导入 Markdown 文件夹
        </button>
        <input
          ref={(input) => {
            folderInputRef.current = input;
            if (input) {
              input.setAttribute("webkitdirectory", "");
              input.setAttribute("directory", "");
            }
          }}
          accept=".md,text/markdown"
          aria-label="选择 Markdown 文件夹"
          className="admin-document-update-input"
          disabled={busy}
          multiple
          onChange={(event) => void importFolder(event)}
          type="file"
        />
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
                <div className="admin-knowledge-settings-actions">
                  {!creating && selected ? (
                    <button
                      aria-label={`删除知识库：${selected.name}`}
                      className="admin-button is-danger"
                      disabled={busy}
                      onClick={() => setPendingBaseDelete(selected)}
                      type="button"
                    >
                      <Trash2 aria-hidden size={14} />
                      删除知识库
                    </button>
                  ) : null}
                  <button
                    className="admin-button is-primary"
                    disabled={busy}
                    onClick={() => void saveBase()}
                    type="button"
                  >
                    {creating ? "创建知识库" : "保存配置"}
                  </button>
                </div>
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
                        <div className="admin-document-list__meta">
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
                        <div className="admin-document-actions">
                          <button
                            aria-label={`查看内容：${document.fileName}`}
                            disabled={busy}
                            onClick={() => void openDocument(document)}
                            type="button"
                          >
                            <Eye aria-hidden size={14} />
                            查看
                          </button>
                          <button
                            aria-label={`更新内容：${document.fileName}`}
                            disabled={busy}
                            onClick={() =>
                              updateInputRefs.current
                                .get(document.id)
                                ?.click()
                            }
                            type="button"
                          >
                            <RefreshCw aria-hidden size={14} />
                            更新内容
                          </button>
                          <input
                            ref={(input) => {
                              if (input) {
                                updateInputRefs.current.set(
                                  document.id,
                                  input,
                                );
                              } else {
                                updateInputRefs.current.delete(document.id);
                              }
                            }}
                            accept=".md,text/markdown"
                            aria-label={`选择替换文件：${document.fileName}`}
                            className="admin-document-update-input"
                            disabled={busy}
                            onChange={(event) =>
                              void upload(event, document.id)
                            }
                            type="file"
                          />
                          <button
                            aria-label={`删除文档：${document.fileName}`}
                            className="is-danger"
                            disabled={busy}
                            onClick={() => setPendingDelete(document)}
                            type="button"
                          >
                            <Trash2 aria-hidden size={14} />
                            删除
                          </button>
                        </div>
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

      {documentPreview ? (
        <div className="admin-document-dialog-overlay" role="presentation">
          <dialog
            aria-label={`查看文档：${documentPreview.document.fileName}`}
            className="admin-document-dialog"
            open
          >
            <header>
              <div>
                <span className="admin-kicker">MARKDOWN SOURCE</span>
                <h2>{documentPreview.document.fileName}</h2>
                <p>
                  {documentPreview.document.chunkCount} 个片段 ·{" "}
                  {Math.max(
                    1,
                    Math.round(
                      documentPreview.document.sizeBytes / 1024,
                    ),
                  )}{" "}
                  KB
                </p>
              </div>
              <button
                aria-label="关闭文档内容"
                onClick={() => setDocumentPreview(null)}
                type="button"
              >
                <X aria-hidden size={18} />
              </button>
            </header>
            <MarkdownContent
              className="admin-document-markdown"
              content={documentPreview.content}
            />
          </dialog>
        </div>
      ) : null}

      {pendingDelete ? (
        <div className="admin-document-dialog-overlay" role="presentation">
          <dialog
            aria-label="确认删除文档"
            className="admin-document-confirm"
            open
          >
            <span className="admin-kicker">DELETE DOCUMENT</span>
            <h2>删除这份文档？</h2>
            <p>
              将同时移除「{pendingDelete.fileName}」的原文与{" "}
              {pendingDelete.chunkCount} 个检索片段，此操作不能撤销。
            </p>
            <div>
              <button
                className="admin-button is-secondary"
                disabled={busy}
                onClick={() => setPendingDelete(null)}
                type="button"
              >
                取消
              </button>
              <button
                className="admin-button is-danger"
                disabled={busy}
                onClick={() => void deleteDocument()}
                type="button"
              >
                {busy ? "正在删除…" : "确认删除"}
              </button>
            </div>
          </dialog>
        </div>
      ) : null}

      {pendingBaseDelete ? (
        <div className="admin-document-dialog-overlay" role="presentation">
          <dialog
            aria-label="确认删除知识库"
            className="admin-document-confirm"
            open
          >
            <span className="admin-kicker">DELETE KNOWLEDGE BASE</span>
            <h2>删除整个知识库？</h2>
            <p>
              将删除「{pendingBaseDelete.name}」及其中全部{" "}
              {pendingBaseDelete.documentCount} 份文档、{" "}
              {pendingBaseDelete.chunkCount} 个检索片段；前台标签与 RAG
              检索范围也会同步移除。此操作不能撤销。
            </p>
            <div>
              <button
                className="admin-button is-secondary"
                disabled={busy}
                onClick={() => setPendingBaseDelete(null)}
                type="button"
              >
                取消
              </button>
              <button
                className="admin-button is-danger"
                disabled={busy}
                onClick={() => void deleteBase()}
                type="button"
              >
                {busy ? "正在删除…" : "删除整个知识库"}
              </button>
            </div>
          </dialog>
        </div>
      ) : null}
    </>
  );
}
