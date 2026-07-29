"use client";

import { MessageCircle } from "lucide-react";

import type {
  BrandContent,
  SectionConfig,
  SiteSectionId,
} from "@/content/types";
import { cn } from "@/lib/cn";
import { TargetLock } from "@/components/motion/target-lock";

interface SiteHeaderProps {
  brand: BrandContent;
  sections: SectionConfig[];
  activeSection?: SiteSectionId;
  onNavigate: (section: SiteSectionId) => void;
}

export function SiteHeader({
  brand,
  sections,
  activeSection,
  onNavigate,
}: SiteHeaderProps) {
  const enabledSections = [...sections]
    .filter((section) => section.enabled)
    .sort((a, b) => a.order - b.order);

  return (
    <header className="site-header">
      <button
        aria-label={`返回${brand.name}首页`}
        className="site-header__brand"
        onClick={() => onNavigate("hero")}
        type="button"
      >
        {brand.wordmark}
      </button>

      <nav aria-label="主导航" className="site-header__nav">
        {enabledSections.map((section) => (
          <button
            key={section.id}
            aria-current={
              activeSection === section.id ? "location" : undefined
            }
            className={cn(
              "site-header__link",
              activeSection === section.id && "is-active",
            )}
            onClick={() => onNavigate(section.id)}
            type="button"
          >
            {section.label}
          </button>
        ))}
      </nav>

      <TargetLock className="site-header__cta-lock">
        <button
          className="site-header__cta"
          onClick={() => onNavigate("lounge")}
          type="button"
        >
          <MessageCircle aria-hidden="true" size={16} />
          进入 AI 会客厅
        </button>
      </TargetLock>
    </header>
  );
}
