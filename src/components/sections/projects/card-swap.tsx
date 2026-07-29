"use client";

import { useGSAP } from "@gsap/react";
import { useRef, type KeyboardEvent, type WheelEvent } from "react";

import { TargetLock } from "@/components/motion/target-lock";
import type { ProjectTheme } from "@/content/types";
import { gsap } from "@/lib/gsap-client";

interface CardSwapProps {
  projects: ProjectTheme[];
  activeIndex: number;
  onChange: (index: number) => void;
  onOpen: (project: ProjectTheme) => void;
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
  const lastWheelTimeRef = useRef(0);
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
          x: layer * 22,
          y: layer * 18,
          scale: 1 - layer * 0.035,
          rotation: layer * 0.8,
          opacity: 1 - layer * 0.13,
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
              y: Math.min(3, cards.length - 1) * 18,
              opacity: 0.58,
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

  const handleWheel = (event: WheelEvent<HTMLDivElement>) => {
    const now = Date.now();
    if (Math.abs(event.deltaY) < 24 || now - lastWheelTimeRef.current < 520) {
      return;
    }

    const direction = event.deltaY > 0 ? 1 : -1;
    const nextIndex = Math.min(
      projects.length - 1,
      Math.max(0, activeIndex + direction),
    );
    if (nextIndex === activeIndex) {
      return;
    }

    event.preventDefault();
    lastWheelTimeRef.current = now;
    onChange(nextIndex);
  };

  return (
    <div
      ref={stackRef}
      aria-label="代表项目卡片"
      className="card-swap"
      onKeyDown={handleKeyDown}
      onWheel={handleWheel}
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
            onClick={() => {
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
