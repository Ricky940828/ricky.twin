"use client";

import { ArrowLeft, ArrowRight } from "lucide-react";
import { useMemo, useReducer, useState } from "react";

import type { ProjectTheme } from "@/content/types";

import { CardSwap } from "./card-swap";
import {
  cardSwapReducer,
  createCardSwapState,
} from "./card-swap-model";
import { ProjectDetailDialog } from "./project-detail-dialog";

interface ProjectsSectionProps {
  projects: ProjectTheme[];
}

export function ProjectsSection({ projects }: ProjectsSectionProps) {
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

  if (visibleProjects.length === 0) {
    return null;
  }

  const activeIndex = Math.min(
    visibleProjects.length - 1,
    state.activeIndex,
  );
  const currentProject = visibleProjects[activeIndex];

  return (
    <section className="projects-section site-section" id="projects">
      <div className="projects-section__intro">
        <span className="eyebrow">SELECTED WORK · PROBLEM SOLVING</span>
        <h2 className="section-title">项目不是清单，而是能力如何解决问题。</h2>
        <div className="projects-section__intro-side">
          <p className="section-copy">
            点击卡片切换项目主题，右侧同步展开从业务问题到抽象成果的解题路径。
          </p>
          <span className="projects-section__counter">
            {String(activeIndex + 1).padStart(2, "0")} /{" "}
            {String(visibleProjects.length).padStart(2, "0")}
          </span>
        </div>
      </div>

      <div className="projects-stage">
        <div className="projects-stage__cards glass-panel">
          <CardSwap
            activeIndex={activeIndex}
            onChange={(index) => dispatch({ type: "select", index })}
            onOpen={setOpenProject}
            projects={visibleProjects}
          />
          <div className="projects-stage__controls">
            <button
              aria-label="上一个项目"
              disabled={activeIndex === 0}
              onClick={() => dispatch({ type: "previous" })}
              type="button"
            >
              <ArrowLeft aria-hidden size={17} />
            </button>
            <button
              aria-label="下一个项目"
              disabled={activeIndex === visibleProjects.length - 1}
              onClick={() => dispatch({ type: "next" })}
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
