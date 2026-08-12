"use client";

import type {
  AdminEditorMeta,
  AdminPreviewTarget,
} from "./content-editor-config";

export function EditorPageGuide({
  activePanelId,
  meta,
  onPanelChange,
}: {
  activePanelId: string;
  meta: AdminEditorMeta;
  onPanelChange: (
    panelId: string,
    preview: AdminPreviewTarget,
  ) => void;
}) {
  const activePanel =
    meta.panels.find((panel) => panel.id === activePanelId) ??
    meta.panels[0];

  return (
    <section className="admin-editor-guide" aria-label="当前编辑位置">
      <div>
        <span className="admin-kicker">EDITING LOCATION</span>
        <strong>前台位置：{meta.location}</strong>
        <small>
          当前区域：{activePanel?.label ?? meta.label} · 右侧预览会直接定位
        </small>
      </div>
      {meta.panels.length > 1 ? (
        <div
          aria-label={`${meta.label}编辑区域`}
          className="admin-editor-guide__tabs"
          role="group"
        >
          {meta.panels.map((panel) => (
            <button
              key={panel.id}
              aria-pressed={panel.id === activePanelId}
              className={panel.id === activePanelId ? "is-active" : ""}
              onClick={() => {
                document
                  .querySelector(
                    `[data-editor-panel-id="${panel.id}"]`,
                  )
                  ?.scrollIntoView({ behavior: "smooth", block: "start" });
                onPanelChange(panel.id, panel.preview);
              }}
              type="button"
            >
              {panel.label}
            </button>
          ))}
        </div>
      ) : null}
    </section>
  );
}
