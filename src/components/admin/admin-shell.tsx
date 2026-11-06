"use client";

import {
  Activity,
  Bot,
  Cable,
  Check,
  CircleAlert,
  Database,
  LogOut,
  Save,
  RefreshCw,
} from "lucide-react";
import type { ReactNode } from "react";

import {
  ADMIN_EDITOR_GROUPS,
  type AdminEditorId,
} from "./content-editor-config";

export type SaveState =
  | "saved"
  | "dirty"
  | "saving"
  | "error";

export type AdminModuleId =
  | "content"
  | "knowledge"
  | "agent"
  | "models"
  | "activity"
  | "update";

const MODULE_META: Record<
  AdminModuleId,
  { eyebrow: string; label: string }
> = {
  content: { eyebrow: "FRONTEND CONTENT", label: "前台内容" },
  knowledge: { eyebrow: "KNOWLEDGE RAG", label: "知识库" },
  agent: { eyebrow: "AGENT PROTOCOL", label: "Agent 管理" },
  models: { eyebrow: "MODEL CONNECTIONS", label: "模型连接" },
  activity: { eyebrow: "OPERATIONS & OBSERVABILITY", label: "运营与运行中心" },
  update: { eyebrow: "VERSION & RECOVERY", label: "系统更新" },
};

const MODULE_ITEMS: Array<{
  id: Exclude<AdminModuleId, "content">;
  label: string;
  icon: typeof Database;
}> = [
  { id: "knowledge", label: "知识库", icon: Database },
  { id: "agent", label: "Agent 管理", icon: Bot },
  { id: "models", label: "模型连接", icon: Cable },
  { id: "activity", label: "运营与运行中心", icon: Activity },
  { id: "update", label: "系统更新", icon: RefreshCw },
];

const SAVE_LABEL: Record<SaveState, string> = {
  saved: "已保存",
  dirty: "未保存",
  saving: "保存中",
  error: "保存失败",
};

export function AdminShell({
  activeEditor,
  activeModule,
  children,
  onEditorChange,
  onLogout,
  onModuleChange,
  onSave,
  saveState,
  versionLabel,
}: {
  activeEditor: AdminEditorId;
  activeModule: AdminModuleId;
  children: ReactNode;
  onEditorChange: (editor: AdminEditorId) => void;
  onLogout: () => void;
  onModuleChange: (module: AdminModuleId) => void;
  onSave: () => void;
  saveState: SaveState;
  versionLabel: string;
}) {
  return (
    <main className="admin-root">
      <aside className="admin-rail">
        <div className="admin-rail__brand">
          <strong>RICKY.TWIN</strong>
          <small>CONTENT ADMIN</small>
        </div>
        <nav aria-label="内容编辑导航">
          <span>前台内容</span>
          {ADMIN_EDITOR_GROUPS.map((group) => (
            <div
              key={group.id}
              aria-label={group.label}
              className="admin-rail__content-group"
              role="group"
            >
              <strong>{group.label}</strong>
              {group.items.map((item) => (
                <button
                  key={item.id}
                  aria-label={item.label}
                  aria-current={
                    activeModule === "content" && activeEditor === item.id
                      ? "page"
                      : undefined
                  }
                  className={
                    activeModule === "content" && activeEditor === item.id
                      ? "is-active"
                      : ""
                  }
                  onClick={() => {
                    onModuleChange("content");
                    onEditorChange(item.id);
                  }}
                  type="button"
                >
                  <small>{item.eyebrow}</small>
                  {item.label}
                </button>
              ))}
            </div>
          ))}
        </nav>
        <div className="admin-rail__later">
          <span>系统能力</span>
          {MODULE_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                aria-current={
                  activeModule === item.id ? "page" : undefined
                }
                className={
                  activeModule === item.id ? "is-active" : ""
                }
                onClick={() => onModuleChange(item.id)}
                type="button"
              >
                <Icon aria-hidden size={15} />
                {item.label}
              </button>
            );
          })}
        </div>
        <button
          className="admin-rail__logout"
          onClick={onLogout}
          type="button"
        >
          <LogOut aria-hidden size={15} />
          退出管理
        </button>
      </aside>

      <section className="admin-workspace">
        <header className="admin-topbar">
          <div>
            <span className="admin-kicker">
              {MODULE_META[activeModule].eyebrow}
            </span>
            <h1>{MODULE_META[activeModule].label}</h1>
          </div>
          <div className="admin-topbar__actions">
            {activeModule === "content" ? (
              <>
                <span
                  className={`admin-save-status is-${saveState}`}
                  role="status"
                >
                  {saveState === "saved" ? (
                    <Check aria-hidden size={14} />
                  ) : saveState === "error" ? (
                    <CircleAlert aria-hidden size={14} />
                  ) : (
                    <i aria-hidden="true" />
                  )}
                  {SAVE_LABEL[saveState]}
                </span>
                <small>{versionLabel}</small>
                <button
                  className="admin-button is-primary"
                  disabled={
                    saveState === "saving" || saveState === "saved"
                  }
                  onClick={onSave}
                  type="button"
                >
                  <Save aria-hidden size={16} />
                  保存草稿
                </button>
              </>
            ) : (
              <span className="admin-module-boundary">
                <i aria-hidden="true" />
                服务端权限保护已启用
              </span>
            )}
          </div>
        </header>
        <div className="admin-workspace__body">{children}</div>
      </section>
    </main>
  );
}
