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
import { PersistentCharacter } from "@/components/character/persistent-character";
import { CareerSection } from "@/components/sections/career/career-section";
import { HeroSection } from "@/components/sections/hero-section";
import { LoungeSection } from "@/components/sections/lounge/lounge-section";
import { PracticeSection } from "@/components/sections/practice-section";
import { ProjectsSection } from "@/components/sections/projects/projects-section";
import type { SiteContent, SiteSectionId } from "@/content/types";
import type { AdminPreviewFocusRequest } from "@/components/admin/content-editor-config";
import { getSitePresentation } from "@/content/site-presentation";
import { ensureGsapPlugins, ScrollTrigger } from "@/lib/gsap-client";
import { getEnabledSectionIds } from "@/lib/section-navigation";
import {
  DIRECT_NAVIGATION_EVENT,
  type DirectNavigationDetail,
} from "@/lib/direct-navigation";

import { SiteFooter } from "./site-footer";
import { SiteHeader } from "./site-header";
import { resolveActiveSection } from "./section-scrollspy";

type RenderMode = "published" | "preview";

interface SectionRendererProps {
  site: SiteContent;
  mode?: RenderMode;
  previewFocus?: AdminPreviewFocusRequest;
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
      presentation={getSitePresentation(site.presentation)}
      practiceLinks={site.practice}
    />
  ),
  career: ({ site, onNavigate }: SectionAdapterProps) => (
    <CareerSection
      axes={site.capabilityAxes}
      onNavigateProjects={() => onNavigate("projects")}
      presentation={getSitePresentation(site.presentation).career}
      stages={site.career}
    />
  ),
  projects: ({ site }: SectionAdapterProps) => (
    <ProjectsSection
      capabilityAxes={site.capabilityAxes}
      presentation={getSitePresentation(site.presentation).projects}
      projects={site.projects}
    />
  ),
  practice: ({ site }: SectionAdapterProps) => (
    <PracticeSection
      links={site.practice}
      presentation={getSitePresentation(site.presentation).practice}
    />
  ),
  lounge: ({ site }: SectionAdapterProps) => (
    <LoungeSection
      content={site.lounge}
      presentation={getSitePresentation(site.presentation).lounge}
    />
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
  previewFocus,
}: SectionRendererProps) {
  const enabledSectionIds = useMemo(
    () => getEnabledSectionIds(site),
    [site],
  );
  const sectionLayoutKey = enabledSectionIds.join("|");
  const [observedSection, setObservedSection] = useState<SiteSectionId>(
    enabledSectionIds[0] ?? "hero",
  );
  const [transitioning, setTransitioning] = useState(false);
  const transitionTimerRef = useRef<number | null>(null);
  const layoutRefreshFrameRef = useRef<number | null>(null);
  const previewFocusRequestId = previewFocus?.requestId;
  const previewFocusSection = previewFocus?.section;
  const previewFocusSelector = previewFocus?.selector;
  const identityPreview =
    mode === "preview"
      ? previewFocusSection === "identity-card" && previewFocusRequestId
        ? {
            face: previewFocus.identityFace ?? ("front" as const),
            requestId: previewFocusRequestId,
          }
        : null
      : undefined;
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
  }, []);

  const navigate = useCallback(
    (section: SiteSectionId) => {
      if (section !== "lounge") {
        if (section === "projects") {
          window.dispatchEvent(new Event("ricky:projects-enter"));
        }
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

  const jumpToSection = useCallback((section: SiteSectionId) => {
    const element = document.getElementById(section);
    if (!element) {
      return;
    }

    if (transitionTimerRef.current !== null) {
      window.clearTimeout(transitionTimerRef.current);
      transitionTimerRef.current = null;
    }
    setTransitioning(false);
    setObservedSection(section);

    if (section === "projects") {
      window.dispatchEvent(new Event("ricky:projects-enter"));
    }

    const header = document.querySelector<HTMLElement>(".site-header");
    const headerOffset = Math.max(72, (header?.offsetHeight ?? 0) + 18);
    const targetTop = Math.max(
      0,
      window.scrollY + element.getBoundingClientRect().top - headerOffset,
    );
    const root = document.documentElement;
    const previousBehavior = root.style.getPropertyValue("scroll-behavior");
    const previousPriority = root.style.getPropertyPriority("scroll-behavior");

    root.style.setProperty("scroll-behavior", "auto", "important");
    try {
      window.scrollTo({ behavior: "auto", top: targetTop });
      ScrollTrigger.update();
      window.dispatchEvent(
        new CustomEvent<DirectNavigationDetail>(DIRECT_NAVIGATION_EVENT, {
          detail: { section },
        }),
      );
    } finally {
      if (previousBehavior) {
        root.style.setProperty(
          "scroll-behavior",
          previousBehavior,
          previousPriority,
        );
      } else {
        root.style.removeProperty("scroll-behavior");
      }
    }
  }, []);

  useEffect(() => {
    return () => {
      if (transitionTimerRef.current !== null) {
        window.clearTimeout(transitionTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    let frame = 0;
    const updateObservedSection = () => {
      frame = 0;
      const header = document.querySelector<HTMLElement>(".site-header");
      const anchor = Math.max(84, (header?.offsetHeight ?? 0) + 18);
      const metrics = enabledSectionIds.flatMap((id) => {
        const section = document.getElementById(id);
        return section
          ? [{ id, top: section.getBoundingClientRect().top }]
          : [];
      });
      setObservedSection((current) =>
        resolveActiveSection(
          metrics,
          anchor,
          enabledSectionIds.includes(current)
            ? current
            : (enabledSectionIds[0] ?? "hero"),
        ),
      );
    };
    const requestUpdate = () => {
      if (!frame) {
        frame = window.requestAnimationFrame(updateObservedSection);
      }
    };

    requestUpdate();
    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate, { passive: true });
    return () => {
      window.removeEventListener("scroll", requestUpdate);
      window.removeEventListener("resize", requestUpdate);
      if (frame) {
        window.cancelAnimationFrame(frame);
      }
    };
  }, [enabledSectionIds, sectionLayoutKey]);

  useEffect(() => {
    ensureGsapPlugins();
    const firstFrame = window.requestAnimationFrame(() => {
      const secondFrame = window.requestAnimationFrame(() => {
        ScrollTrigger.refresh();
        layoutRefreshFrameRef.current = null;
      });
      layoutRefreshFrameRef.current = secondFrame;
    });

    return () => {
      window.cancelAnimationFrame(firstFrame);
      if (layoutRefreshFrameRef.current !== null) {
        window.cancelAnimationFrame(layoutRefreshFrameRef.current);
        layoutRefreshFrameRef.current = null;
      }
    };
  }, [sectionLayoutKey]);

  useEffect(() => {
    if (
      mode !== "preview" ||
      !previewFocusRequestId ||
      !previewFocusSection ||
      previewFocusSection === "identity-card"
    ) {
      return;
    }

    const sectionRoot =
      previewFocusSection === "footer"
        ? document.querySelector<HTMLElement>(".site-footer")
        : document.getElementById(previewFocusSection);
    const selectedTarget = previewFocusSelector
      ? document.querySelector<HTMLElement>(previewFocusSelector)
      : null;
    const target = selectedTarget ?? sectionRoot;
    if (!target) {
      return;
    }

    target.scrollIntoView({ behavior: "auto", block: "center" });
    target.classList.add("is-admin-preview-focus");
    const timer = window.setTimeout(() => {
      target.classList.remove("is-admin-preview-focus");
    }, 900);

    return () => {
      window.clearTimeout(timer);
      target.classList.remove("is-admin-preview-focus");
    };
  }, [
    mode,
    previewFocusRequestId,
    previewFocusSection,
    previewFocusSelector,
  ]);

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
      <VisitTracker
        activeSection={activeSection}
        enabled={mode === "published"}
      />
      <DotField />
      <PersistentCharacter
        identityCard={site.identityCard}
        identityPreview={identityPreview}
      />
      <SiteHeader
        activeSection={activeSection}
        brand={site.brand}
        ctaLabel={getSitePresentation(site.presentation).headerCta}
        onNavigate={jumpToSection}
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
            <Section
              key={`${sectionLayoutKey}:${sectionId}`}
              onNavigate={navigate}
              site={site}
            />
          );
        })}
      </main>

      <SiteFooter
        brand={site.brand}
        content={site.footer}
        onNavigate={navigate}
        presentation={getSitePresentation(site.presentation).footer}
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
