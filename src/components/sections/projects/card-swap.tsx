"use client";

import { useGSAP } from "@gsap/react";
import {
  useRef,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
} from "react";

import { TargetLock } from "@/components/motion/target-lock";
import type { ProjectTheme, SitePresentation } from "@/content/types";
import { gsap } from "@/lib/gsap-client";

interface CardSwapProps {
  projects: ProjectTheme[];
  activeIndex: number;
  onChange: (index: number) => void;
  onOpen: (project: ProjectTheme) => void;
  presentation?: SitePresentation["projects"];
}

const CARD_STEP_X = 42;
const CARD_STEP_Y = 24;

interface PointerDrag {
  pointerId: number;
  startX: number;
  startY: number;
  deltaX: number;
  deltaY: number;
  captured: boolean;
}

function getVisibleProjects(projects: ProjectTheme[], activeIndex: number) {
  return [
    ...projects.slice(activeIndex),
    ...projects.slice(0, activeIndex),
  ].slice(0, 4);
}

export function CardSwap({
  projects,
  activeIndex,
  onChange,
  onOpen,
  presentation,
}: CardSwapProps) {
  const stackRef = useRef<HTMLDivElement>(null);
  const previousIndexRef = useRef(activeIndex);
  const dragRef = useRef<PointerDrag | null>(null);
  const visibleProjects = getVisibleProjects(projects, activeIndex);

  useGSAP(
    () => {
      const root = stackRef.current;
      if (!root) {
        return;
      }

      const cards = Array.from(
        root.querySelectorAll<HTMLElement>("[data-project-card]"),
      );
      const previousIndex = previousIndexRef.current;
      const outgoing = root.querySelector<HTMLElement>(
        `[data-project-index="${previousIndex}"]`,
      );
      const incoming = root.querySelector<HTMLElement>(
        `[data-project-index="${activeIndex}"]`,
      );

      cards.forEach((card, layer) => {
        gsap.set(card, {
          x: layer * CARD_STEP_X,
          y: layer * CARD_STEP_Y,
          scale: 1 - layer * 0.025,
          rotation: layer * 1.05,
          opacity: 1 - layer * 0.08,
          zIndex: 20 - layer,
          force3D: true,
        });
      });

      if (previousIndex !== activeIndex && incoming) {
        const timeline = gsap.timeline({ defaults: { overwrite: true } });
        if (outgoing) {
          timeline.fromTo(
            outgoing,
            { y: 0, opacity: 1 },
            {
              y: 120,
              opacity: 0,
              duration: 0.26,
              ease: "power2.in",
            },
            0,
          );
        }
        timeline.fromTo(
          incoming,
          { x: 38, y: 34, scale: 0.94, opacity: 0.52 },
          {
            x: 0,
            y: 0,
            scale: 1,
            opacity: 1,
            duration: 0.48,
            ease: "power3.out",
          },
          0.16,
        );
        if (outgoing) {
          timeline.set(
            outgoing,
            {
              y: Math.min(3, cards.length - 1) * CARD_STEP_Y,
              opacity: 0.76,
            },
            0.44,
          );
        }
      }

      previousIndexRef.current = activeIndex;
    },
    { dependencies: [activeIndex, projects] },
  );

  const changeBy = (direction: -1 | 1) => {
    const nextIndex = Math.min(
      projects.length - 1,
      Math.max(0, activeIndex + direction),
    );
    if (nextIndex !== activeIndex) {
      onChange(nextIndex);
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      event.preventDefault();
      changeBy(1);
    }
    if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      event.preventDefault();
      changeBy(-1);
    }
  };

  const activeCard = () =>
    stackRef.current?.querySelector<HTMLElement>(
      '[data-layer="0"][data-project-card]',
    ) ?? null;

  const settleActiveCard = () => {
    const card = activeCard();
    if (!card) {
      return;
    }
    gsap.to(card, {
      x: 0,
      y: 0,
      rotation: 0,
      duration: 0.48,
      ease: "elastic.out(0.8, 0.68)",
      overwrite: true,
    });
  };

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (
      typeof event.button === "number" &&
      event.button !== 0
    ) {
      return;
    }
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      deltaX: 0,
      deltaY: 0,
      captured: false,
    };
    event.currentTarget.dataset.dragging = "false";
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) {
      return;
    }
    drag.deltaX = event.clientX - drag.startX;
    drag.deltaY = event.clientY - drag.startY;
    if (!drag.captured) {
      if (Math.hypot(drag.deltaX, drag.deltaY) <= 8) {
        return;
      }
      event.currentTarget.setPointerCapture?.(event.pointerId);
      drag.captured = true;
      event.currentTarget.dataset.dragging = "true";
    }
    const card = activeCard();
    if (!card) {
      return;
    }
    gsap.set(card, {
      x: drag.deltaX * 0.32,
      y: drag.deltaY * 0.08,
      rotation: drag.deltaX * 0.018,
      force3D: true,
    });
  };

  const finishPointer = (
    event: PointerEvent<HTMLDivElement>,
    cancelled = false,
  ) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) {
      return;
    }

    if (
      drag.captured &&
      event.currentTarget.hasPointerCapture?.(event.pointerId)
    ) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    event.currentTarget.dataset.dragging = "false";
    dragRef.current = null;

    if (!drag.captured) {
      return;
    }
    if (!cancelled && Math.abs(drag.deltaX) >= 64) {
      changeBy(drag.deltaX < 0 ? 1 : -1);
      return;
    }
    settleActiveCard();
  };

  return (
    <div
      ref={stackRef}
      aria-label="代表项目卡片"
      className="card-swap"
      onKeyDown={handleKeyDown}
      onPointerCancel={(event) => finishPointer(event, true)}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={(event) => finishPointer(event)}
      role="region"
      tabIndex={0}
    >
      {visibleProjects.map((project, layer) => {
        const index = projects.findIndex((item) => item.id === project.id);
        const isActive = index === activeIndex;
        const activate = () => {
          if (isActive) {
            onOpen(project);
          } else {
            onChange(index);
          }
        };
        const card = (
          <article
            aria-label={
              isActive
                ? `打开项目详情：${project.title}`
                : `选择项目：${project.title}`
            }
            className="project-card"
            data-active={isActive ? "true" : "false"}
            data-layer={layer}
            data-project-card
            data-project-index={index}
            draggable={false}
            onClick={activate}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                activate();
              }
            }}
            role="button"
            tabIndex={0}
          >
            <span className="project-card__topline">
              <span className="project-card__number">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className="project-card__eyebrow">
                {project.eyebrow}
              </span>
            </span>
            <h3>{project.title}</h3>
            <p>{project.summary}</p>
            <span className="project-card__tags">
              {project.tags.slice(0, 4).map((tag) => (
                <i key={tag}>{tag}</i>
              ))}
            </span>
            <button
              aria-label={
                isActive
                  ? (presentation?.detailCta ?? "查看项目完整说明")
                  : `${presentation?.inactiveCardCta ?? "切换到这个项目"}：${project.title}`
              }
              className="project-card__action"
              onClick={(event: MouseEvent<HTMLButtonElement>) => {
                event.stopPropagation();
                if (isActive) {
                  onOpen(project);
                } else {
                  onChange(index);
                }
              }}
              type="button"
            >
              {isActive
                ? (presentation?.activeCardCta ?? "查看项目完整说明")
                : (presentation?.inactiveCardCta ?? "切换到这个项目")}
              <b aria-hidden="true">↗</b>
            </button>
          </article>
        );

        return isActive ? (
          <TargetLock key={project.id} active className="project-card__lock">
            {card}
          </TargetLock>
        ) : (
          <div key={project.id} className="project-card__lock">
            {card}
          </div>
        );
      })}
    </div>
  );
}
