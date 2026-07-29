"use client";

import {
  Check,
  CircleAlert,
  LogOut,
  Save,
} from "lucide-react";
import type { ReactNode } from "react";

import {
  ADMIN_EDITOR_ITEMS,
  type AdminEditorId,
} from "./content-editor";

export type SaveState =
  | "saved"
  | "dirty"
  | "saving"
  | "error";

const SAVE_LABEL: Record<SaveState, string> = {
  saved: "已保存",
  dirty: "未保存",
  saving: "保存中",
  error: "保存失败",
};

export function AdminShell({
  activeEditor,
  children,
  onEditorChange,
  onLogout,
  onSave,
  saveState,
  versionLabel,
}: {
  activeEditor: AdminEditorId;
  children: ReactNode;
  onEditorChange: (editor: AdminEditorId) => void;
  onLogout: () => void;
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
          {ADMIN_EDITOR_ITEMS.map((item) => (
            <button
              key={item.id}
              aria-label={item.label}
              aria-current={
                activeEditor === item.id ? "page" : undefined
              }
              className={activeEditor === item.id ? "is-active" : ""}
              onClick={() => onEditorChange(item.id)}
              type="button"
            >
              <small>{item.eyebrow}</small>
              {item.label}
            </button>
          ))}
        </nav>
        <div className="admin-rail__later">
          <span>后续模块</span>
          <p>知识库</p>
          <p>Agent 管理</p>
          <p>访客与额度</p>
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
            <span className="admin-kicker">FRONTEND CONTENT</span>
            <h1>前台内容</h1>
          </div>
          <div className="admin-topbar__actions">
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
          </div>
        </header>
        <div className="admin-workspace__body">{children}</div>
      </section>
    </main>
  );
}
