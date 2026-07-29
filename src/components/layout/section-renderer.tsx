"use client";

import {
  type ComponentType,
  type MouseEvent as ReactMouseEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { DotField } from "@/components/background/dot-field";
import { VisitTracker } from "@/components/analytics/visit-tracker";
import { CareerSection } from "@/components/sections/career/career-section";
import { HeroSection } from "@/components/sections/hero-section";
import { LoungeSection } from "@/components/sections/lounge/lounge-section";
import { PracticeSection } from "@/components/sections/practice-section";
import { ProjectsSection } from "@/components/sections/projects/projects-section";
import type { SiteContent, SiteSectionId } from "@/content/types";
import { getEnabledSectionIds } from "@/lib/section-navigation";

import { SiteFooter } from "./site-footer";
import { SiteHeader } from "./site-header";

type RenderMode = "published" | "preview";

interface SectionRendererProps {
  site: SiteContent;
  mode?: RenderMode;
}

interface SectionAdapterProps {
  site: SiteContent;
  onNavigate: (section: SiteSectionId) => void;
}

const sectionComponents = {
  hero: ({ site, onNavigate }: SectionAdapterProps) => (
    <HeroSection
      content={site.hero}
      onNavigate={onNavigate}
      practiceLinks={site.practice}
    />
  ),
  career: ({ site, onNavigate }: SectionAdapterProps) => (
    <CareerSection
      axes={site.capabilityAxes}
      onNavigateProjects={() => onNavigate("projects")}
      stages={site.career}
    />
  ),
  projects: ({ site }: SectionAdapterProps) => (
    <ProjectsSection projects={site.projects} />
  ),
  practice: ({ site }: SectionAdapterProps) => (
    <PracticeSection links={site.practice} />
  ),
  lounge: ({ site }: SectionAdapterProps) => (
    <LoungeSection content={site.lounge} />
  ),
} satisfies Record<
  SiteSectionId,
  ComponentType<SectionAdapterProps>
>;

const NEXT_CHARACTER: Partial<Record<SiteSectionId, string>> = {
  hero: "ricky-career-walk",
  career: "ricky-project-guide",
  projects: "ricky-lounge-welcome",
  practice: "ricky-lounge-welcome",
};

export function SectionRenderer({
  site,
  mode = "published",
}: SectionRendererProps) {
  const enabledSectionIds = useMemo(
    () => getEnabledSectionIds(site),
    [site],
  );
  const [observedSection, setObservedSection] = useState<SiteSectionId>(
    enabledSectionIds[0] ?? "hero",
  );
  const [transitioning, setTransitioning] = useState(false);
  const transitionTimerRef = useRef<number | null>(null);
  const activeSection = enabledSectionIds.includes(observedSection)
    ? observedSection
    : (enabledSectionIds[0] ?? "hero");

  const keepPreviewInSandbox = (
    event: ReactMouseEvent<HTMLDivElement>,
  ) => {
    if (mode !== "preview") {
      return;
    }
    const target =
      event.target instanceof Element
        ? event.target.closest("a")
        : null;
    if (target) {
      event.preventDefault();
    }
  };

  const scrollToSection = useCallback((section: SiteSectionId) => {
    const element = document.getElementById(section);
    if (typeof element?.scrollIntoView === "function") {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    setObservedSection(section);
  }, []);

  const navigate = useCallback(
    (section: SiteSectionId) => {
      if (section !== "lounge") {
        scrollToSection(section);
        return;
      }

      if (transitionTimerRef.current !== null) {
        window.clearTimeout(transitionTimerRef.current);
      }
      setTransitioning(true);
      transitionTimerRef.current = window.setTimeout(() => {
        scrollToSection("lounge");
        setTransitioning(false);
        transitionTimerRef.current = null;
      }, 420);
    },
    [scrollToSection],
  );

  useEffect(() => {
    return () => {
      if (transitionTimerRef.current !== null) {
        window.clearTimeout(transitionTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!("IntersectionObserver" in window)) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort(
            (left, right) =>
              right.intersectionRatio - left.intersectionRatio,
          )[0];
        const sectionId = visible?.target.id as SiteSectionId | undefined;
        if (sectionId && enabledSectionIds.includes(sectionId)) {
          setObservedSection(sectionId);
        }
      },
      {
        rootMargin: "-22% 0px -60%",
        threshold: [0.08, 0.25, 0.5, 0.75],
      },
    );

    enabledSectionIds.forEach((id) => {
      const section = document.getElementById(id);
      if (section) {
        observer.observe(section);
      }
    });

    return () => observer.disconnect();
  }, [enabledSectionIds]);

  useEffect(() => {
    const stem = NEXT_CHARACTER[activeSection];
    if (!stem) {
      return;
    }

    const userAgent = window.navigator.userAgent;
    const safari =
      /Safari/i.test(userAgent) &&
      !/Chrome|Chromium|Android/i.test(userAgent);
    const extension = safari ? "mov" : "webm";
    const preload = document.createElement("link");
    preload.rel = "preload";
    preload.as = "video";
    preload.href = `/character/${stem}.${extension}`;
    document.head.appendChild(preload);

    return () => preload.remove();
  }, [activeSection]);

  return (
    <div
      className="site-shell"
      data-render-mode={mode}
      data-testid="site-renderer"
      onClickCapture={keepPreviewInSandbox}
    >
      <VisitTracker enabled={mode === "published"} />
      <DotField />
      <SiteHeader
        activeSection={activeSection}
        brand={site.brand}
        onNavigate={navigate}
        sections={site.sections}
      />

      {mode === "preview" ? (
        <div className="draft-preview-badge">
          <span aria-hidden="true" />
          草稿预览
        </div>
      ) : null}

      <main className="site-content">
        {enabledSectionIds.map((sectionId) => {
          const Section = sectionComponents[sectionId];
          return (
            <Section key={sectionId} onNavigate={navigate} site={site} />
          );
        })}
      </main>

      <SiteFooter
        brand={site.brand}
        content={site.footer}
        onNavigate={navigate}
      />

      {transitioning ? (
        <div
          aria-live="polite"
          className="lounge-transition"
          role="status"
        >
          <span data-text="CONNECTING">CONNECTING</span>
          <small>进入 Ricky 的 AI 会客厅</small>
        </div>
      ) : null}
    </div>
  );
}
