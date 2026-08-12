"use client";

import Image from "next/image";
import { LockKeyhole, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";

import { getIdentityCardContent } from "@/content/identity-card";
import type {
  IdentityCardContent,
  KnowledgeBadge,
} from "@/content/types";

export type IdentityCardFace = "front" | "back";

interface IdentityCardDialogProps {
  content?: IdentityCardContent;
  faceRequestId?: number;
  initialFace?: IdentityCardFace;
  open: boolean;
  onClose: () => void;
}

export function IdentityCardDialog({
  content,
  faceRequestId,
  initialFace = "front",
  open,
  onClose,
}: IdentityCardDialogProps) {
  if (!open) {
    return null;
  }

  return (
    <OpenIdentityCard
      key={`${faceRequestId ?? "interactive"}:${initialFace}`}
      content={getIdentityCardContent(content)}
      initialFace={initialFace}
      onClose={onClose}
    />
  );
}

function OpenIdentityCard({
  content,
  initialFace,
  onClose,
}: {
  content: IdentityCardContent;
  initialFace: IdentityCardFace;
  onClose: () => void;
}) {
  const [flipped, setFlipped] = useState(initialFace === "back");
  const [knowledgeAccess, setKnowledgeAccess] = useState<KnowledgeBadge[]>([]);

  useEffect(() => {
    let active = true;
    const loadKnowledgeAccess = async () => {
      try {
        const response = await fetch("/api/knowledge-status", {
          cache: "no-store",
        });
        const result = (await response.json()) as {
          ok?: boolean;
          knowledge?: KnowledgeBadge[];
        };
        if (active && result.ok && Array.isArray(result.knowledge)) {
          setKnowledgeAccess(result.knowledge);
        }
      } catch {
        // Keep the card truthful and empty instead of falling back to placeholders.
      }
    };
    const refresh = () => void loadKnowledgeAccess();

    void loadKnowledgeAccess();
    window.addEventListener("focus", refresh);
    window.addEventListener("ricky:knowledge-changed", refresh);
    return () => {
      active = false;
      window.removeEventListener("focus", refresh);
      window.removeEventListener("ricky:knowledge-changed", refresh);
    };
  }, []);

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
              ? content.back.flipToFront
              : content.front.flipToBack}
          </button>
          <button
            aria-label="关闭身份卡"
            className="identity-dialog__close"
            onClick={onClose}
            type="button"
          >
            {content.closeLabel}
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
                priority
                sizes="360px"
                src="/character/ricky-hero-idle-poster.png"
              />
            </div>

            <div className="identity-card__profile">
              <span className="identity-card__eyebrow">
                {content.front.eyebrow}
              </span>
              <h2 id="identity-card-title">{content.front.name}</h2>
              <p className="identity-card__role">
                {content.front.role}
              </p>
              <p className="identity-card__summary">
                {content.front.summary}
              </p>
              <div className="identity-card__tags">
                {content.front.tags.map((tag) => (
                  <span key={tag}>{tag}</span>
                ))}
              </div>
              <div className="identity-card__primary-actions">
                <button
                  onClick={() => goToSection("lounge")}
                  type="button"
                >
                  {content.front.primaryCta}
                </button>
                <button
                  onClick={() => goToSection("career")}
                  type="button"
                >
                  {content.front.secondaryCta}
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
                  {content.back.eyebrow}
                </span>
                <h2>{content.back.title}</h2>
              </div>
              <span className="identity-card__access-status">
                <i aria-hidden="true" />
                {content.back.statusLabel}
              </span>
            </header>

            <div className="identity-card__access-grid">
              {knowledgeAccess.map((item) => {
                const open = item.access === "public" && item.ragEnabled;
                return (
                  <article
                    data-access={open ? "open" : "locked"}
                    key={item.id}
                  >
                    <span className="identity-card__access-icon">
                      {open ? (
                        <ShieldCheck aria-hidden="true" size={17} />
                      ) : (
                        <LockKeyhole aria-hidden="true" size={17} />
                      )}
                    </span>
                    <div>
                      <strong>{item.name}</strong>
                      <small>{item.accessLabel}</small>
                    </div>
                  </article>
                );
              })}
            </div>

            <footer className="identity-card__access-footer">
              <span>{content.back.footerEyebrow}</span>
              <p>{content.back.footerBody}</p>
            </footer>
          </section>
        </div>
      </dialog>
    </div>
  );
}
