"use client";

import {
  ArrowDownRight,
  ArrowRight,
  Code2,
  Coffee,
  MessageCircle,
  Route,
  Sparkles,
} from "lucide-react";
import { type ComponentType } from "react";

import { PressureTitle } from "@/components/motion/pressure-title";
import { TargetLock } from "@/components/motion/target-lock";
import { DEFAULT_SITE_PRESENTATION } from "@/content/site-presentation";
import type {
  HeroContent,
  PracticeLink,
  SitePresentation,
  SiteSectionId,
} from "@/content/types";

interface HeroSectionProps {
  content: HeroContent;
  practiceLinks: PracticeLink[];
  onNavigate: (section: SiteSectionId) => void;
  presentation?: SitePresentation;
}

const PRACTICE_ICONS: Record<
  PracticeLink["icon"],
  ComponentType<{ size?: number; "aria-hidden"?: boolean }>
> = {
  route: Route,
  sparkles: Sparkles,
  coffee: Coffee,
  github: Code2,
};

function PracticeDockItem({ item }: { item: PracticeLink }) {
  const Icon = PRACTICE_ICONS[item.icon];
  const content = (
    <>
      <span className="practice-dock__icon">
        <Icon aria-hidden size={16} />
      </span>
      <span className="practice-dock__label">
        <strong>{item.title}</strong>
        <small>
          <span
            aria-hidden="true"
            className={`practice-status-dot is-${item.status}`}
          />
          {item.statusLabel}
        </small>
      </span>
      <ArrowDownRight aria-hidden className="practice-dock__arrow" size={15} />
    </>
  );

  return (
    <TargetLock
      className="practice-dock__target"
      data-testid="practice-dock-item"
    >
      {item.href ? (
        <a
          aria-label={`${item.title}，${item.statusLabel}，在新标签页打开`}
          className="practice-dock__item"
          href={item.href}
          rel="noreferrer"
          target="_blank"
        >
          {content}
        </a>
      ) : (
        <div
          aria-label={`${item.title}，${item.statusLabel}`}
          className="practice-dock__item is-unavailable"
          role="status"
        >
          {content}
        </div>
      )}
    </TargetLock>
  );
}

export function HeroSection({
  content,
  presentation = DEFAULT_SITE_PRESENTATION,
  practiceLinks,
  onNavigate,
}: HeroSectionProps) {
  const featuredPractice = [...practiceLinks]
    .filter((item) => item.visible && item.featured)
    .sort((a, b) => a.order - b.order)
    .slice(0, 5);

  return (
    <section className="hero-section site-section" id="hero">
      <div className="hero-grid">
        <div className="hero-copy">
          <span className="eyebrow">{content.eyebrow}</span>
          <PressureTitle text={content.title} />
          <p className="hero-statement">{content.statement}</p>
          <p className="hero-welcome">{content.welcome}</p>

          <div aria-label="身份标签" className="hero-tags">
            {content.tags.map((tag) => (
              <span key={tag}>{tag}</span>
            ))}
          </div>

          <div className="hero-actions">
            <TargetLock>
              <button
                className="button-primary"
                onClick={() => onNavigate("lounge")}
                type="button"
              >
                <MessageCircle aria-hidden size={18} />
                {content.primaryCta}
                <ArrowRight aria-hidden size={17} />
              </button>
            </TargetLock>
            <button
              className="button-secondary"
              onClick={() => onNavigate("career")}
              type="button"
            >
              {content.secondaryCta}
              <ArrowDownRight aria-hidden size={17} />
            </button>
          </div>

          <div className="hero-proof">
            {presentation.heroProof.map((proof) => (
              <span key={`${proof.value}-${proof.label}`}>
                <strong>{proof.value}</strong>
                {proof.label}
              </span>
            ))}
          </div>
        </div>

        <div className="hero-visual">
          <div aria-hidden="true" className="hero-character-glow" />

          <div aria-label="实践项目快捷入口" className="practice-dock">
            <div className="practice-dock__heading">
              <span>{presentation.heroPracticeEyebrow}</span>
              <small>{presentation.heroPracticeLabel}</small>
            </div>
            <div className="practice-dock__items">
              {featuredPractice.map((item) => (
                <PracticeDockItem key={item.id} item={item} />
              ))}
            </div>
          </div>
        </div>
      </div>

      <div aria-hidden="true" className="hero-scroll-hint">
        <span />
        {presentation.heroScrollHint}
      </div>
    </section>
  );
}
