"use client";

import {
  Maximize2,
  Monitor,
  RefreshCw,
  Rocket,
  Smartphone,
  Tablet,
  X,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import type { SiteContent } from "@/content/types";

type PreviewDevice = "desktop" | "tablet" | "mobile";

interface PreviewDeviceConfig {
  id: PreviewDevice;
  label: string;
  width: number;
  height: number;
}

const DEVICES: PreviewDeviceConfig[] = [
  { id: "desktop", label: "桌面端", width: 1440, height: 920 },
  { id: "tablet", label: "平板端", width: 820, height: 920 },
  { id: "mobile", label: "移动端", width: 390, height: 844 },
];

export interface ContentPreviewMessage {
  type: "ricky:content-preview";
  payload: SiteContent;
  replayKey: number;
}

export interface ContentPreviewReadyMessage {
  type: "ricky:content-preview-ready";
}

export function LivePreview({
  canPublish,
  content,
  onPublish,
}: {
  canPublish: boolean;
  content: SiteContent;
  onPublish: (note: string) => Promise<boolean | void>;
}) {
  const [device, setDevice] = useState<PreviewDevice>("desktop");
  const [replayKey, setReplayKey] = useState(0);
  const [scale, setScale] = useState(0.5);
  const [publishOpen, setPublishOpen] = useState(false);
  const [publishNote, setPublishNote] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState("");
  const frameRef = useRef<HTMLIFrameElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const selectedDevice =
    DEVICES.find((item) => item.id === device) ?? DEVICES[0];

  const postDraft = useCallback(() => {
    const message: ContentPreviewMessage = {
      type: "ricky:content-preview",
      payload: content,
      replayKey,
    };
    frameRef.current?.contentWindow?.postMessage(
      message,
      window.location.origin,
    );
  }, [content, replayKey]);

  useEffect(() => {
    postDraft();
  }, [postDraft]);

  useEffect(() => {
    const receivePreviewReady = (event: MessageEvent<unknown>) => {
      if (
        event.origin !== window.location.origin ||
        event.source !== frameRef.current?.contentWindow ||
        typeof event.data !== "object" ||
        event.data === null ||
        (event.data as ContentPreviewReadyMessage).type !==
          "ricky:content-preview-ready"
      ) {
        return;
      }
      postDraft();
    };

    window.addEventListener("message", receivePreviewReady);
    return () =>
      window.removeEventListener("message", receivePreviewReady);
  }, [postDraft]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) {
      return;
    }

    const fitPreview = () => {
      const available = stage.clientWidth - 24;
      if (available > 0) {
        setScale(Math.min(1, available / selectedDevice.width));
      }
    };
    fitPreview();

    if (typeof ResizeObserver === "function") {
      const observer = new ResizeObserver(fitPreview);
      observer.observe(stage);
      return () => observer.disconnect();
    }

    window.addEventListener("resize", fitPreview);
    return () => window.removeEventListener("resize", fitPreview);
  }, [selectedDevice.width]);

  const publish = async () => {
    const note = publishNote.trim();
    if (!note || publishing) {
      return;
    }
    setPublishing(true);
    setPublishError("");
    try {
      const result = await onPublish(note);
      if (result === false) {
        setPublishError("发布失败，请检查页面提示后重试");
        return;
      }
      setPublishOpen(false);
      setPublishNote("");
    } catch {
      setPublishError("发布失败，正式站仍保持上一版本");
    } finally {
      setPublishing(false);
    }
  };

  return (
    <aside className="admin-live-preview" aria-label="前台实时预览面板">
      <header className="admin-live-preview__header">
        <div>
          <span className="admin-kicker">LIVE PREVIEW</span>
          <strong>前台实时预览</strong>
        </div>
        <span className="admin-live-preview__signal">
          <i aria-hidden="true" />
          改动即时同步
        </span>
      </header>

      <div className="admin-preview-toolbar">
        <div aria-label="预览设备" className="admin-preview-devices" role="group">
          {DEVICES.map((item) => {
            const Icon =
              item.id === "desktop"
                ? Monitor
                : item.id === "tablet"
                  ? Tablet
                  : Smartphone;
            return (
              <button
                key={item.id}
                aria-pressed={device === item.id}
                className={device === item.id ? "is-active" : ""}
                onClick={() => setDevice(item.id)}
                type="button"
              >
                <Icon aria-hidden size={14} />
                {item.label}
              </button>
            );
          })}
        </div>

        <div className="admin-preview-actions">
          <button
            aria-label="重播动效"
            onClick={() => setReplayKey((value) => value + 1)}
            title="从头播放当前预览中的入场动效"
            type="button"
          >
            <RefreshCw aria-hidden size={14} />
          </button>
          <button
            aria-label="全屏预览"
            disabled={!canPublish}
            onClick={() =>
              window.open(
                "/admin/preview",
                "_blank",
                "noopener,noreferrer",
              )
            }
            title={
              canPublish
                ? "在新标签页查看已保存草稿"
                : "请先保存草稿，再打开全屏预览"
            }
            type="button"
          >
            <Maximize2 aria-hidden size={14} />
          </button>
        </div>
      </div>

      <div
        ref={stageRef}
        className="admin-preview-stage"
        data-device={device}
        data-preview-width={selectedDevice.width}
      >
        <div
          className="admin-preview-viewport"
          style={{
            height: selectedDevice.height * scale,
            width: selectedDevice.width * scale,
          }}
        >
          <iframe
            ref={frameRef}
            height={selectedDevice.height}
            onLoad={postDraft}
            sandbox="allow-forms allow-modals allow-same-origin allow-scripts"
            src="/admin/preview"
            style={{
              height: selectedDevice.height,
              transform: `scale(${scale})`,
              width: selectedDevice.width,
            }}
            title="前台实时预览"
            width={selectedDevice.width}
          />
        </div>
      </div>

      <footer className="admin-live-preview__footer">
        <div>
          <span>当前为草稿沙盒</span>
          <small>
            外部跳转已关闭；保存草稿不会改变正式站。
          </small>
        </div>
        <button
          className="admin-button is-primary"
          disabled={!canPublish}
          onClick={() => setPublishOpen(true)}
          title={canPublish ? undefined : "请先保存草稿"}
          type="button"
        >
          <Rocket aria-hidden size={15} />
          发布到正式站
        </button>
      </footer>

      {publishOpen ? (
        <div className="admin-publish-overlay" role="presentation">
          <dialog
            aria-labelledby="admin-publish-title"
            className="admin-publish-dialog"
            open
          >
            <button
              aria-label="关闭发布确认"
              className="admin-publish-dialog__close"
              onClick={() => setPublishOpen(false)}
              type="button"
            >
              <X aria-hidden size={17} />
            </button>
            <span className="admin-kicker">PUBLISH RELEASE</span>
            <h2 id="admin-publish-title">发布正式版本</h2>
            <p>
              发布后，公开首页会读取这份草稿。上一版本仍会保留在版本记录中。
            </p>
            <label className="admin-field">
              <span>
                <strong>发布说明</strong>
                <small>{publishNote.length}/80</small>
              </span>
              <textarea
                aria-label="发布说明"
                autoFocus
                maxLength={80}
                onChange={(event) => setPublishNote(event.target.value)}
                placeholder="例如：补充职业路线与代表项目"
                rows={3}
                value={publishNote}
              />
            </label>
            {publishError ? (
              <p className="admin-publish-dialog__error" role="alert">
                {publishError}
              </p>
            ) : null}
            <div className="admin-publish-dialog__actions">
              <button
                className="admin-button is-secondary"
                onClick={() => setPublishOpen(false)}
                type="button"
              >
                继续检查
              </button>
              <button
                className="admin-button is-primary"
                disabled={!publishNote.trim() || publishing}
                onClick={() => void publish()}
                type="button"
              >
                {publishing ? "正在发布…" : "确认发布"}
              </button>
            </div>
          </dialog>
        </div>
      ) : null}
    </aside>
  );
}
