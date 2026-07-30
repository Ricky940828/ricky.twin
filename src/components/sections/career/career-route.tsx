"use client";

import { useGSAP } from "@gsap/react";
import { ArrowRight } from "lucide-react";
import { useCallback, useRef, type RefObject } from "react";

import type { CareerStage } from "@/content/types";
import {
  ensureGsapPlugins,
  gsap,
  ScrollTrigger,
} from "@/lib/gsap-client";

import { getStageIndex } from "./career-model";

interface CareerRouteProps {
  stages: CareerStage[];
  activeIndex: number;
  onStageChange: (index: number) => void;
  onNavigateProjects: () => void;
  pinScopeRef: RefObject<HTMLDivElement | null>;
}

const NODE_POSITIONS = [
  { x: 68, y: 268 },
  { x: 270, y: 118 },
  { x: 484, y: 250 },
  { x: 688, y: 92 },
];

export function CareerRoute({
  stages,
  activeIndex,
  onStageChange,
  onNavigateProjects,
  pinScopeRef,
}: CareerRouteProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const progressPathRef = useRef<SVGPathElement>(null);
  const scrollTriggerRef = useRef<ScrollTrigger | null>(null);
  const guideTweenRef = useRef<gsap.core.Tween | null>(null);

  const setPathProgress = useCallback((progress: number) => {
    const path = pathRef.current;
    const progressPath = progressPathRef.current;
    if (!path || !progressPath) {
      return;
    }

    const bounded = Math.min(1, Math.max(0, progress));
    const hasGeometry =
      typeof path.getTotalLength === "function" &&
      typeof path.getPointAtLength === "function";
    if (hasGeometry) {
      const length = path.getTotalLength();
      progressPath.style.strokeDasharray = String(length);
      progressPath.style.strokeDashoffset = String(length * (1 - bounded));
    }
  }, []);

  useGSAP(
    () => {
      ensureGsapPlugins();
      setPathProgress(activeIndex / Math.max(1, stages.length - 1));
    },
    {
      dependencies: [activeIndex, setPathProgress, stages.length],
    },
  );

  useGSAP(
    () => {
      ensureGsapPlugins();
      const scope = pinScopeRef.current;
      const hasDesktopMedia =
        typeof window.matchMedia === "function" &&
        window.matchMedia("(min-width: 901px)").matches;
      if (!scope || !hasDesktopMedia) {
        return;
      }

      const trigger = ScrollTrigger.create({
        id: "career-route-pin",
        trigger: scope,
        start: "top top+=84",
        end: () => `+=${Math.round(window.innerHeight * 2.7)}`,
        pin: true,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          setPathProgress(self.progress);
          onStageChange(getStageIndex(self.progress, stages.length));
        },
      });
      scrollTriggerRef.current = trigger;

      const cancelGuidance = () => {
        guideTweenRef.current?.kill();
        guideTweenRef.current = null;
      };
      const cancelOnKeyboard = (event: KeyboardEvent) => {
        if (
          ["ArrowDown", "ArrowUp", "PageDown", "PageUp", " ", "Home", "End"].includes(
            event.key,
          )
        ) {
          cancelGuidance();
        }
      };

      window.addEventListener("wheel", cancelGuidance, { passive: true });
      window.addEventListener("touchstart", cancelGuidance, { passive: true });
      window.addEventListener("keydown", cancelOnKeyboard);
      window.requestAnimationFrame(() => ScrollTrigger.refresh());

      return () => {
        window.removeEventListener("wheel", cancelGuidance);
        window.removeEventListener("touchstart", cancelGuidance);
        window.removeEventListener("keydown", cancelOnKeyboard);
        scrollTriggerRef.current = null;
      };
    },
    {
      dependencies: [onStageChange, setPathProgress, stages.length],
    },
  );

  const guideToStage = (nextIndex: number) => {
    const boundedIndex = Math.min(stages.length - 1, Math.max(0, nextIndex));
    const from = activeIndex / Math.max(1, stages.length - 1);
    const to = boundedIndex / Math.max(1, stages.length - 1);
    const progress = { value: from };

    guideTweenRef.current?.kill();
    guideTweenRef.current = gsap.to(progress, {
      value: to,
      duration: 0.9,
      ease: "power2.inOut",
      onUpdate: () => setPathProgress(progress.value),
      onComplete: () => {
        guideTweenRef.current = null;
      },
    });
    onStageChange(boundedIndex);

    const trigger = scrollTriggerRef.current;
    if (trigger) {
      const targetScroll =
        trigger.start + (trigger.end - trigger.start) * to;
      window.scrollTo({ top: targetScroll, behavior: "smooth" });
    } else if (typeof mapRef.current?.scrollIntoView === "function") {
      mapRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  };

  const stage = stages[activeIndex];
  const nextStage = stages[activeIndex + 1];

  return (
    <div className="career-route">
      <div ref={mapRef} className="career-route__map">
        <svg
          aria-hidden="true"
          className="career-route__path"
          viewBox="0 0 760 360"
        >
          <path
            ref={pathRef}
            data-career-path="true"
            d="M68 268 C150 286 190 110 270 118 C350 126 390 274 484 250 C570 228 608 82 688 92"
          />
          <path
            ref={progressPathRef}
            className="career-route__path-progress"
            d="M68 268 C150 286 190 110 270 118 C350 126 390 274 484 250 C570 228 608 82 688 92"
          />
        </svg>

        {stages.map((item, index) => (
          <button
            key={item.id}
            aria-label={`查看${item.publicBrand}阶段`}
            className="career-route__node"
            data-active={activeIndex === index ? "true" : "false"}
            data-complete={activeIndex >= index ? "true" : "false"}
            onClick={() => guideToStage(index)}
            style={{
              left: `${(NODE_POSITIONS[index]?.x / 760) * 100}%`,
              top: `${(NODE_POSITIONS[index]?.y / 360) * 100}%`,
            }}
            type="button"
          >
            <i aria-hidden="true" />
            <span>{item.publicBrand}</span>
          </button>
        ))}
      </div>

      <div className="career-route__mobile-nodes">
        {stages.map((item, index) => (
          <button
            key={item.id}
            data-active={activeIndex === index ? "true" : "false"}
            onClick={() => guideToStage(index)}
            type="button"
          >
            <i aria-hidden="true" />
            <span>
              <small>{item.period}</small>
              {item.publicBrand}
            </span>
          </button>
        ))}
      </div>

      <article
        key={stage.id}
        aria-live="polite"
        className="career-stage-card glass-panel"
      >
        <div className="career-stage-card__meta">
          <span>{String(activeIndex + 1).padStart(2, "0")}</span>
          <small>{stage.period}</small>
        </div>
        <h3>{stage.publicBrand}</h3>
        <strong>{stage.role}</strong>
        <p>{stage.positioning}</p>
        <ul>
          {stage.highlights.map((highlight) => (
            <li key={highlight}>{highlight}</li>
          ))}
        </ul>
        <button
          className="career-stage-card__next"
          onClick={() => {
            if (nextStage) {
              guideToStage(activeIndex + 1);
            } else {
              onNavigateProjects();
            }
          }}
          type="button"
        >
          {nextStage
            ? `下一站：${nextStage.publicBrand} →`
            : "查看代表项目 →"}
          <ArrowRight aria-hidden size={16} />
        </button>
      </article>
    </div>
  );
}
