"use client";

import { useGSAP } from "@gsap/react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import {
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";

import type { ProjectTheme } from "@/content/types";
import {
  ensureGsapPlugins,
  gsap,
  ScrollTrigger,
} from "@/lib/gsap-client";

import { CardSwap } from "./card-swap";
import {
  cardSwapReducer,
  createCardSwapState,
  getCardIndexForScroll,
  getCardScrollProgress,
} from "./card-swap-model";
import { ProjectDetailDialog } from "./project-detail-dialog";

interface ProjectsSectionProps {
  projects: ProjectTheme[];
}

export function ProjectsSection({ projects }: ProjectsSectionProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const scrollTriggerRef = useRef<ScrollTrigger | null>(null);
  const guideTweenRef = useRef<gsap.core.Tween | null>(null);
  const visibleProjects = useMemo(
    () =>
      [...projects]
        .filter((project) => project.published && project.featured)
        .sort((a, b) => a.order - b.order),
    [projects],
  );
  const [state, dispatch] = useReducer(
    cardSwapReducer,
    visibleProjects.length,
    createCardSwapState,
  );
  const [openProject, setOpenProject] = useState<ProjectTheme | null>(null);
  const activeIndex =
    visibleProjects.length === 0
      ? 0
      : Math.min(visibleProjects.length - 1, state.activeIndex);
  const activeIndexRef = useRef(activeIndex);

  useEffect(() => {
    activeIndexRef.current = activeIndex;
  }, [activeIndex]);

  useGSAP(
    () => {
      ensureGsapPlugins();
      const stage = stageRef.current;
      const hasDesktopMedia =
        typeof window.matchMedia === "function" &&
        window.matchMedia("(min-width: 901px)").matches;
      if (
        !stage ||
        !hasDesktopMedia ||
        visibleProjects.length <= 1
      ) {
        return;
      }

      const trigger = ScrollTrigger.create({
        id: "projects-stage-pin",
        trigger: stage,
        start: "top top+=84",
        end: () =>
          `+=${Math.round(
            window.innerHeight *
              0.72 *
              (visibleProjects.length - 1),
          )}`,
        pin: true,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          const nextIndex = getCardIndexForScroll(
            self.progress,
            visibleProjects.length,
          );
          if (nextIndex !== activeIndexRef.current) {
            activeIndexRef.current = nextIndex;
            dispatch({ type: "select", index: nextIndex });
          }
        },
      });
      scrollTriggerRef.current = trigger;
      const refreshFrame = window.requestAnimationFrame(() => {
        ScrollTrigger.refresh();
      });

      return () => {
        window.cancelAnimationFrame(refreshFrame);
        trigger.kill();
        guideTweenRef.current?.kill();
        guideTweenRef.current = null;
        scrollTriggerRef.current = null;
      };
    },
    { dependencies: [visibleProjects.length] },
  );

  if (visibleProjects.length === 0) {
    return null;
  }

  const currentProject = visibleProjects[activeIndex];
  const selectProject = (index: number) => {
    const boundedIndex = Math.min(
      visibleProjects.length - 1,
      Math.max(0, index),
    );
    const trigger = scrollTriggerRef.current;
    const insidePinnedRange =
      trigger &&
      window.scrollY >= trigger.start - 2 &&
      window.scrollY <= trigger.end + 2;

    if (trigger && insidePinnedRange) {
      guideTweenRef.current?.kill();
      const progress = getCardScrollProgress(
        boundedIndex,
        visibleProjects.length,
      );
      const targetScroll =
        trigger.start + (trigger.end - trigger.start) * progress;
      const scrollState = { value: window.scrollY };
      guideTweenRef.current = gsap.to(scrollState, {
        value: targetScroll,
        duration: 0.72,
        ease: "power2.inOut",
        overwrite: true,
        onUpdate: () => window.scrollTo(0, scrollState.value),
        onComplete: () => {
          window.scrollTo(0, targetScroll);
          guideTweenRef.current = null;
        },
      });
      return;
    }

    activeIndexRef.current = boundedIndex;
    dispatch({ type: "select", index: boundedIndex });
  };

  return (
    <section className="projects-section site-section" id="projects">
      <div className="projects-section__intro">
        <span className="eyebrow">SELECTED WORK · PROBLEM SOLVING</span>
        <h2 className="section-title">项目不是清单，而是能力如何解决问题。</h2>
        <div className="projects-section__intro-side">
          <p className="section-copy">
            向下滚动或拖动卡片切换项目主题，右侧同步展开从业务问题到抽象成果的解题路径。
          </p>
          <span className="projects-section__counter">
            {String(activeIndex + 1).padStart(2, "0")} /{" "}
            {String(visibleProjects.length).padStart(2, "0")}
          </span>
        </div>
      </div>

      <div ref={stageRef} className="projects-stage">
        <div className="projects-stage__cards glass-panel">
          <CardSwap
            activeIndex={activeIndex}
            onChange={selectProject}
            onOpen={setOpenProject}
            projects={visibleProjects}
          />
          <div className="projects-stage__controls">
            <button
              aria-label="上一个项目"
              disabled={activeIndex === 0}
              onClick={() => selectProject(activeIndex - 1)}
              type="button"
            >
              <ArrowLeft aria-hidden size={17} />
            </button>
            <button
              aria-label="下一个项目"
              disabled={activeIndex === visibleProjects.length - 1}
              onClick={() => selectProject(activeIndex + 1)}
              type="button"
            >
              <ArrowRight aria-hidden size={17} />
            </button>
          </div>
        </div>

        <div
          key={currentProject.id}
          aria-live="polite"
          className="project-solution glass-panel"
        >
          <div className="project-solution__heading">
            <span>{currentProject.eyebrow}</span>
            <h3>{currentProject.title}</h3>
            <p>{currentProject.summary}</p>
          </div>
          <div className="project-solution__steps">
            {currentProject.solutionPath.map((step, index) => (
              <article key={step.label}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <div>
                  <h4>{step.label}</h4>
                  <p>{step.content}</p>
                </div>
              </article>
            ))}
          </div>
          <button
            className="project-solution__detail"
            onClick={() => setOpenProject(currentProject)}
            type="button"
          >
            查看项目完整说明
            <ArrowRight aria-hidden size={16} />
          </button>
        </div>
      </div>

      <ProjectDetailDialog
        onClose={() => setOpenProject(null)}
        project={openProject}
      />
    </section>
  );
}
