"use client";

import { useGSAP } from "@gsap/react";
import {
  useRef,
  type KeyboardEvent,
  type PointerEvent,
} from "react";

import { TargetLock } from "@/components/motion/target-lock";
import type { ProjectTheme } from "@/content/types";
import { gsap } from "@/lib/gsap-client";

interface CardSwapProps {
  projects: ProjectTheme[];
  activeIndex: number;
  onChange: (index: number) => void;
  onOpen: (project: ProjectTheme) => void;
}

const CARD_STEP_X = 42;
const CARD_STEP_Y = 24;

interface PointerDrag {
  pointerId: number;
  startX: number;
  startY: number;
  deltaX: number;
  deltaY: number;
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
}: CardSwapProps) {
  const stackRef = useRef<HTMLDivElement>(null);
  const previousIndexRef = useRef(activeIndex);
  const dragRef = useRef<PointerDrag | null>(null);
  const suppressClickRef = useRef(false);
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
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
    event.currentTarget.dataset.dragging = "true";
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) {
      return;
    }
    drag.deltaX = event.clientX - drag.startX;
    drag.deltaY = event.clientY - drag.startY;
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

    event.currentTarget.releasePointerCapture?.(event.pointerId);
    event.currentTarget.dataset.dragging = "false";
    dragRef.current = null;

    const moved = Math.hypot(drag.deltaX, drag.deltaY);
    suppressClickRef.current = moved > 8;
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
        const card = (
          <button
            aria-label={
              isActive
                ? `打开项目详情：${project.title}`
                : `选择项目：${project.title}`
            }
            className="project-card"
            data-layer={layer}
            data-project-card
            data-project-index={index}
            draggable={false}
            onClick={() => {
              if (suppressClickRef.current) {
                suppressClickRef.current = false;
                return;
              }
              if (isActive) {
                onOpen(project);
              } else {
                onChange(index);
              }
            }}
            type="button"
          >
            <span className="project-card__eyebrow">{project.eyebrow}</span>
            <span className="project-card__number">
              {String(index + 1).padStart(2, "0")}
            </span>
            <h3>{project.title}</h3>
            <p>{project.summary}</p>
            <span className="project-card__tags">
              {project.tags.slice(0, 4).map((tag) => (
                <i key={tag}>{tag}</i>
              ))}
            </span>
            <span className="project-card__action">
              {isActive ? "点击查看完整解题路径" : "切换到这个项目"}
              <b aria-hidden="true">↗</b>
            </span>
          </button>
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
