"use client";

import { useState } from "react";

import type { ProjectTheme, SiteContent } from "@/content/types";

import {
  EditorPanel,
  linesToList,
  TextAreaField,
  TextField,
  ToggleField,
} from "../editor-fields";

function newProject(order: number): ProjectTheme {
  return {
    id: `project-${Date.now()}`,
    eyebrow: "NEW PROJECT",
    title: "新项目主题",
    summary: "补充这个项目解决了什么问题，以及形成了什么抽象成果。",
    solutionPath: [
      { label: "业务问题", content: "补充需要解决的业务问题。" },
      { label: "核心判断", content: "补充最关键的判断依据。" },
      { label: "解决路径", content: "补充从判断到落地的执行路径。" },
      { label: "抽象成果", content: "补充可复用的能力或方法。" },
    ],
    tags: ["待补充"],
    cases: [],
    published: false,
    featured: false,
    order,
  };
}

export function ProjectsEditor({
  content,
  onChange,
}: {
  content: SiteContent;
  onChange: (content: SiteContent) => void;
}) {
  const [selectedId, setSelectedId] = useState(content.projects[0]?.id);
  const selectedIndex = Math.max(
    0,
    content.projects.findIndex((project) => project.id === selectedId),
  );
  const project = content.projects[selectedIndex];

  if (!project) {
    return null;
  }

  const updateProject = (patch: Partial<ProjectTheme>) => {
    onChange({
      ...content,
      projects: content.projects.map((item, index) =>
        index === selectedIndex ? { ...item, ...patch } : item,
      ),
    });
  };

  return (
    <div className="admin-editor-stack">
      <EditorPanel
        action={
          <button
            className="admin-button is-secondary"
            onClick={() => {
              const created = newProject(content.projects.length + 1);
              onChange({
                ...content,
                projects: [...content.projects, created],
              });
              setSelectedId(created.id);
            }}
            type="button"
          >
            新增项目
          </button>
        }
        description="新增项目后，Card Swap 会自动生成新卡片，无需修改前端。"
        title="项目主题"
      >
        <label className="admin-field">
          <span>
            <strong>选择项目主题</strong>
          </span>
          <select
            aria-label="选择项目主题"
            onChange={(event) => setSelectedId(event.target.value)}
            value={project.id}
          >
            {content.projects.map((item) => (
              <option key={item.id} value={item.id}>
                {item.title}
              </option>
            ))}
          </select>
        </label>

        <div className="admin-inline-actions">
          <button
            className="is-danger"
            disabled={content.projects.length === 1}
            onClick={() => {
              const remaining = content.projects.filter(
                (_, index) => index !== selectedIndex,
              );
              onChange({ ...content, projects: remaining });
              setSelectedId(remaining[0]?.id);
            }}
            type="button"
          >
            删除项目
          </button>
        </div>

        <div className="admin-form-grid is-two">
          <TextField
            label="项目标题"
            onChange={(event) =>
              updateProject({ title: event.target.value })
            }
            value={project.title}
          />
          <TextField
            label="英文眉题"
            onChange={(event) =>
              updateProject({ eyebrow: event.target.value })
            }
            value={project.eyebrow}
          />
        </div>
        <TextAreaField
          label="项目摘要"
          onChange={(event) =>
            updateProject({ summary: event.target.value })
          }
          rows={4}
          value={project.summary}
        />
        <TextAreaField
          hint="每行一个"
          label="项目标签"
          onChange={(event) =>
            updateProject({ tags: linesToList(event.target.value) })
          }
          rows={4}
          value={project.tags.join("\n")}
        />
        <div className="admin-form-grid is-two">
          <ToggleField
            checked={project.published}
            label="项目可发布"
            onChange={(published) => updateProject({ published })}
          />
          <ToggleField
            checked={project.featured}
            label="首页代表项目"
            onChange={(featured) => updateProject({ featured })}
          />
          <TextField
            label="展示顺序"
            min={1}
            onChange={(event) =>
              updateProject({ order: Number(event.target.value) })
            }
            type="number"
            value={project.order}
          />
        </div>
      </EditorPanel>

      <EditorPanel
        description="项目区右侧按这四步呈现，不直接堆原始证据。"
        title="项目解题路径"
      >
        <div className="admin-solution-editors">
          {project.solutionPath.map((step, index) => (
            <TextAreaField
              key={step.label}
              label={`${index + 1}. ${step.label}`}
              onChange={(event) => {
                const solutionPath = project.solutionPath.map(
                  (item, itemIndex) =>
                    itemIndex === index
                      ? { ...item, content: event.target.value }
                      : item,
                ) as ProjectTheme["solutionPath"];
                updateProject({ solutionPath });
              }}
              rows={4}
              value={step.content}
            />
          ))}
        </div>
      </EditorPanel>
    </div>
  );
}
