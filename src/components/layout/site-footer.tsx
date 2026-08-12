"use client";

import { ArrowRight, MessageCircle } from "lucide-react";

import type {
  BrandContent,
  FooterContent,
  SiteSectionId,
  SitePresentation,
} from "@/content/types";
import { TargetLock } from "@/components/motion/target-lock";

interface SiteFooterProps {
  brand: BrandContent;
  content: FooterContent;
  onNavigate: (section: SiteSectionId) => void;
  presentation?: SitePresentation["footer"];
}

export function SiteFooter({
  brand,
  content,
  onNavigate,
  presentation,
}: SiteFooterProps) {
  const openContact = () => {
    onNavigate("lounge");
    window.setTimeout(() => {
      window.dispatchEvent(new CustomEvent("ricky:open-contact"));
    }, 620);
  };

  return (
    <footer className="site-footer">
      <div className="site-footer__main">
        <span className="eyebrow">{presentation?.eyebrow ?? "THE CONVERSATION CAN CONTINUE"}</span>
        <h2>{content.headline}</h2>
        <p>{content.body}</p>
        <div className="site-footer__actions">
          <TargetLock>
            <button
              className="button-primary"
              onClick={() => onNavigate("lounge")}
              type="button"
            >
              <MessageCircle aria-hidden size={18} />
              {content.primaryCta}
            </button>
          </TargetLock>
          <button
            className="button-secondary"
            onClick={openContact}
            type="button"
          >
            {content.secondaryCta}
            <ArrowRight aria-hidden size={17} />
          </button>
        </div>
      </div>
      <div className="site-footer__bottom">
        <strong>{brand.wordmark}</strong>
        <span>SHANGHAI · DIGITAL TWIN · {new Date().getFullYear()}</span>
        <span>{presentation?.bottomNote ?? "公开内容由结构化配置生成"}</span>
      </div>
    </footer>
  );
}
