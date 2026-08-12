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

import type { ProjectTheme, SitePresentation } from "@/content/types";
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
import { ProjectCapabilityMap } from "./project-capability-map";

interface ProjectsSectionProps {
  projects: ProjectTheme[];
  capabilityAxes?: readonly string[];
  presentation?: SitePresentation["projects"];
}

const FALLBACK_CAPABILITY_AXES = [
  "机构与资产评估",
  "交易结构设计与盈利模型测算",
  "金融产品方案设计与跨部门协同",
  "业务规则系统化与 PRD 落地",
  "项目上线运营与数据经营分析",
  "标准化沉淀与 AI 赋能",
] as const;

export function ProjectsSection({
  projects,
  capabilityAxes = FALLBACK_CAPABILITY_AXES,
  presentation,
}: ProjectsSectionProps) {
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
  const visibleProjectCount = visibleProjects.length;
  const hasScrollableProjects = visibleProjectCount > 1;
  const visibleProjectCountRef = useRef(visibleProjectCount);
  const [state, dispatch] = useReducer(
    cardSwapReducer,
    visibleProjectCount,
    createCardSwapState,
  );
  const [openProject, setOpenProject] = useState<ProjectTheme | null>(null);
  const activeIndex =
    visibleProjects.length === 0
      ? 0
      : Math.min(visibleProjects.length - 1, state.activeIndex);
  const activeIndexRef = useRef(activeIndex);

  useEffect(() => {
    visibleProjectCountRef.current = visibleProjectCount;
    dispatch({
      type: "set-count",
      count: visibleProjectCount,
    });
    const refreshFrame = window.requestAnimationFrame(() => {
      ScrollTrigger.refresh();
    });
    return () => window.cancelAnimationFrame(refreshFrame);
  }, [visibleProjectCount]);

  useEffect(() => {
    activeIndexRef.current = activeIndex;
  }, [activeIndex]);

  useEffect(() => {
    const resetForFreshEntry = () => {
      activeIndexRef.current = 0;
      dispatch({ type: "select", index: 0 });
    };
    window.addEventListener("ricky:projects-enter", resetForFreshEntry);
    return () =>
      window.removeEventListener(
        "ricky:projects-enter",
        resetForFreshEntry,
      );
  }, []);

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
        visibleProjectCountRef.current <= 1
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
              (visibleProjectCountRef.current - 1),
          )}`,
        pin: true,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          const projectCount = visibleProjectCountRef.current;
          const nextIndex = getCardIndexForScroll(
            self.progress,
            projectCount,
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
    {
      dependencies: [hasScrollableProjects],
      revertOnUpdate: true,
      scope: stageRef,
    },
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
        <span className="eyebrow">{presentation?.eyebrow ?? "SELECTED WORK · PROBLEM SOLVING"}</span>
        <h2 className="section-title">{presentation?.title ?? "项目不是清单，而是能力如何解决问题。"}</h2>
        <div className="projects-section__intro-side">
          <p className="section-copy">{presentation?.body ?? "向下滚动或拖动卡片切换项目主题，右侧同步点亮这个项目调用的能力组合。"}</p>
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
            presentation={presentation}
            projects={visibleProjects}
          />
          <div className="projects-stage__footer">
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
        </div>

        <ProjectCapabilityMap
          activeIndex={activeIndex}
          axes={capabilityAxes}
          project={currentProject}
          presentation={presentation}
          total={visibleProjects.length}
        />
      </div>

      <ProjectDetailDialog
        onClose={() => setOpenProject(null)}
        project={openProject}
      />
    </section>
  );
}
