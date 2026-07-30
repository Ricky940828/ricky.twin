"use client";

import Image from "next/image";
import { LockKeyhole, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";

interface IdentityCardDialogProps {
  open: boolean;
  onClose: () => void;
}

const knowledgeAccess = [
  {
    name: "职业路径与公开项目",
    detail: "公开访问",
    status: "open",
  },
  {
    name: "AI 应用与知识资产化",
    detail: "公开访问",
    status: "open",
  },
  {
    name: "金融产品与行业方法",
    detail: "受邀可见",
    status: "locked",
  },
  {
    name: "原始证据与敏感判断",
    detail: "单独授权",
    status: "locked",
  },
] as const;

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
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  const goToSection = (sectionId: string) => {
    onClose();
    window.requestAnimationFrame(() => {
      document
        .getElementById(sectionId)
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

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
        <div className="identity-dialog__actions">
          <button
            className="identity-dialog__flip"
            onClick={() => setFlipped((current) => !current)}
            type="button"
          >
            {flipped
              ? "翻回正面：个人身份"
              : "翻到背面：知识与权限"}
          </button>
          <button
            aria-label="关闭身份卡"
            className="identity-dialog__close"
            onClick={onClose}
            type="button"
          >
            关闭
          </button>
        </div>

        <div
          className="identity-card"
          data-flipped={flipped ? "true" : "false"}
        >
          <section
            aria-hidden={flipped}
            className="identity-card__face identity-card__front"
          >
            <div className="identity-card__portrait">
              <Image
                alt="李富豪数字形象"
                fill
                sizes="360px"
                src="/character/ricky-hero-idle-poster.png"
              />
            </div>

            <div className="identity-card__profile">
              <span className="identity-card__eyebrow">
                LI FUHAO / DIGITAL ID 0717
              </span>
              <h2 id="identity-card-title">李富豪 · Ricky</h2>
              <p className="identity-card__role">
                金融产品经理 / AI 应用实战者 / 上海
              </p>
              <p className="identity-card__summary">
                7年+信贷行业经验，擅长机构资金资产对接、交易结构、信贷全流程产品设计与落地；正在将历史工作资产转化为可验证、可迁移的数字分身。
              </p>
              <div className="identity-card__tags">
                <span>机构信贷</span>
                <span>产品设计</span>
                <span>项目落地</span>
                <span>AI 应用</span>
              </div>
              <div className="identity-card__primary-actions">
                <button
                  onClick={() => goToSection("lounge")}
                  type="button"
                >
                  进入 AI 会客厅
                </button>
                <button
                  onClick={() => goToSection("career")}
                  type="button"
                >
                  查看职业路线
                </button>
              </div>
            </div>
          </section>

          <section
            aria-hidden={!flipped}
            className="identity-card__face identity-card__back"
          >
            <header className="identity-card__access-header">
              <div>
                <span className="identity-card__eyebrow">
                  KNOWLEDGE ACCESS
                </span>
                <h2>知识与访问权限</h2>
              </div>
              <span className="identity-card__access-status">
                <i aria-hidden="true" />
                RAG READY
              </span>
            </header>

            <div className="identity-card__access-grid">
              {knowledgeAccess.map((item) => (
                <article
                  data-access={item.status}
                  key={item.name}
                >
                  <span className="identity-card__access-icon">
                    {item.status === "open" ? (
                      <ShieldCheck aria-hidden="true" size={17} />
                    ) : (
                      <LockKeyhole aria-hidden="true" size={17} />
                    )}
                  </span>
                  <div>
                    <strong>{item.name}</strong>
                    <small>{item.detail}</small>
                  </div>
                </article>
              ))}
            </div>

            <footer className="identity-card__access-footer">
              <span>PUBLIC PROFILE / CONTROLLED KNOWLEDGE</span>
              <p>
                深度内容会根据访客身份与授权范围检索，不公开真实文件路径。
              </p>
            </footer>
          </section>
        </div>
      </dialog>
    </div>
  );
}
