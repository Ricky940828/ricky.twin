"use client";

import { ArrowLeftRight, MapPin, ShieldCheck, X } from "lucide-react";
import { useEffect, useState } from "react";

interface IdentityCardDialogProps {
  open: boolean;
  onClose: () => void;
}

export function IdentityCardDialog({
  open,
  onClose,
}: IdentityCardDialogProps) {
  if (!open) {
    return null;
  }

  return <OpenIdentityCard onClose={onClose} />;
}

function OpenIdentityCard({ onClose }: { onClose: () => void }) {
  const [flipped, setFlipped] = useState(false);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="identity-overlay"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
      role="presentation"
    >
      <dialog
        aria-label="Ricky 数字身份卡"
        className="identity-dialog"
        open
      >
        <div
          className="identity-card"
          data-flipped={flipped ? "true" : "false"}
        >
          <section
            aria-hidden={flipped}
            className="identity-card__face identity-card__front"
          >
            <span className="identity-card__eyebrow">RICKY.TWIN / 01</span>
            <h2 id="identity-card-title">李富豪 · Ricky</h2>
            <p>
              金融产品经理，也是 AI 应用深度实践者。正在把多年工作资产转化为可验证、可迁移的数字分身。
            </p>
            <div className="identity-card__location">
              <MapPin aria-hidden="true" size={15} />
              上海 · DIGITAL TWIN ONLINE
            </div>
            <div className="identity-card__tags">
              <span>金融产品</span>
              <span>AI 应用</span>
              <span>知识资产化</span>
            </div>
          </section>

          <section
            aria-hidden={!flipped}
            className="identity-card__face identity-card__back"
          >
            <span className="identity-card__eyebrow">KNOWLEDGE ACCESS</span>
            <h2>当前可访问范围</h2>
            <ul>
              <li>
                <ShieldCheck aria-hidden="true" size={16} />
                职业路径与公开项目
              </li>
              <li>
                <ShieldCheck aria-hidden="true" size={16} />
                AI 应用与知识资产化实践
              </li>
              <li className="is-locked">
                <ShieldCheck aria-hidden="true" size={16} />
                深度金融能力与案例 · 需申请
              </li>
            </ul>
            <div className="identity-card__rag">
              <span aria-hidden="true" />
              RAG KNOWLEDGE READY
            </div>
          </section>
        </div>

        <div className="identity-dialog__actions">
          <button
            aria-label="翻转身份卡"
            className="identity-dialog__icon"
            onClick={() => setFlipped((current) => !current)}
            type="button"
          >
            <ArrowLeftRight aria-hidden="true" size={18} />
          </button>
          <button
            aria-label="关闭身份卡"
            className="identity-dialog__icon"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" size={18} />
          </button>
        </div>
      </dialog>
    </div>
  );
}
