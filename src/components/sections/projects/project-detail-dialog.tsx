"use client";

import { X } from "lucide-react";
import { useEffect } from "react";

import type { ProjectTheme } from "@/content/types";

interface ProjectDetailDialogProps {
  project: ProjectTheme | null;
  onClose: () => void;
}

export function ProjectDetailDialog({
  project,
  onClose,
}: ProjectDetailDialogProps) {
  useEffect(() => {
    if (!project) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, project]);

  if (!project) {
    return null;
  }

  return (
    <div
      className="project-dialog-overlay"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
      role="presentation"
    >
      <dialog
        aria-label={`${project.title}项目详情`}
        className="project-dialog"
        open
      >
        <button
          aria-label="关闭项目详情"
          className="project-dialog__close"
          onClick={onClose}
          type="button"
        >
          <X aria-hidden size={19} />
        </button>
        <span className="project-dialog__eyebrow">{project.eyebrow}</span>
        <h2>{project.title}</h2>
        <p className="project-dialog__summary">{project.summary}</p>

        <div className="project-dialog__path">
          {project.solutionPath.map((step, index) => (
            <article key={step.label}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <div>
                <h3>{step.label}</h3>
                <p>{step.content}</p>
              </div>
            </article>
          ))}
        </div>

        <div className="project-dialog__bottom">
          <div>
            <strong>代表实践</strong>
            {project.cases.map((item) => (
              <p key={item.title}>
                <b>{item.title}</b>
                {item.summary}
              </p>
            ))}
          </div>
          <div>
            <strong>能力标签</strong>
            <span>
              {project.tags.map((tag) => (
                <i key={tag}>{tag}</i>
              ))}
            </span>
          </div>
        </div>
      </dialog>
    </div>
  );
}
