"use client";

import { useState } from "react";

import type { ProjectTheme, SiteContent } from "@/content/types";
import { getSitePresentation } from "@/content/site-presentation";
import {
  moveOrderedItem,
  normalizeOrderedItems,
} from "@/lib/ordered-content";
import { getProjectCapabilityLevels } from "@/lib/project-capabilities";

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
    capabilityLevels: [2, 2, 2, 2, 2, 2],
    solutionPath: [
      { label: "业务问题", content: "补充需要解决的业务问题。" },
      { label: "核心判断", content: "补充最关键的判断依据。" },
      { label: "解决路径", content: "补充从判断到落地的执行路径。" },
      { label: "抽象成果", content: "补充可复用的能力或方法。" },
    ],
    tags: ["待补充"],
    cases: [],
    published: true,
    featured: true,
    order,
  };
}

export function ProjectsEditor({
  content,
  onChange,
  onPanelChange,
}: {
  content: SiteContent;
  onChange: (content: SiteContent) => void;
  onPanelChange?: (panelId: string) => void;
}) {
  const [selectedId, setSelectedId] = useState(content.projects[0]?.id);
  const selectedIndex = Math.max(
    0,
    content.projects.findIndex((project) => project.id === selectedId),
  );
  const project = content.projects[selectedIndex];
  const presentation = getSitePresentation(content.presentation);
  const updateProjectsCopy = (
    field: keyof typeof presentation.projects,
    value: string,
  ) =>
    onChange({
      ...content,
      presentation: {
        ...presentation,
        projects: { ...presentation.projects, [field]: value },
      },
    });

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
  const orderedProjects = normalizeOrderedItems(content.projects);
  const orderedIndex = orderedProjects.findIndex(
    (item) => item.id === project.id,
  );

  return (
    <div className="admin-editor-stack">
      <EditorPanel
        description="维护项目板块的标题、说明和按钮，不影响项目卡片数据。"
        onActivate={onPanelChange}
        panelId="projects-intro"
        title="项目板块文案"
      >
        <TextField
          label="项目板块眉题"
          onChange={(event) => updateProjectsCopy("eyebrow", event.target.value)}
          value={presentation.projects.eyebrow}
        />
        <TextField
          label="项目板块标题"
          onChange={(event) => updateProjectsCopy("title", event.target.value)}
          value={presentation.projects.title}
        />
        <TextAreaField
          label="项目板块说明"
          onChange={(event) => updateProjectsCopy("body", event.target.value)}
          rows={4}
          value={presentation.projects.body}
        />
        <div className="admin-form-grid is-two">
          <TextField
            label="当前项目详情按钮"
            onChange={(event) => updateProjectsCopy("activeCardCta", event.target.value)}
            value={presentation.projects.activeCardCta}
          />
          <TextField
            label="其他项目切换按钮"
            onChange={(event) => updateProjectsCopy("inactiveCardCta", event.target.value)}
            value={presentation.projects.inactiveCardCta}
          />
          <TextField
            label="项目详情无障碍名称"
            onChange={(event) => updateProjectsCopy("detailCta", event.target.value)}
            value={presentation.projects.detailCta}
          />
          <TextField
            label="能力树眉题"
            onChange={(event) => updateProjectsCopy("mapEyebrow", event.target.value)}
            value={presentation.projects.mapEyebrow}
          />
          <TextField
            label="能力树说明"
            onChange={(event) => updateProjectsCopy("mapCaption", event.target.value)}
            value={presentation.projects.mapCaption}
          />
          <TextField
            label="能力树中心文案"
            onChange={(event) => updateProjectsCopy("mapCore", event.target.value)}
            value={presentation.projects.mapCore}
          />
        </div>
      </EditorPanel>

      <EditorPanel
        action={
          <button
            className="admin-button is-secondary"
            onClick={() => {
              const created = newProject(content.projects.length + 1);
              onChange({
                ...content,
                projects: normalizeOrderedItems([
                  ...content.projects,
                  created,
                ]),
              });
              setSelectedId(created.id);
            }}
            type="button"
          >
            新增项目
          </button>
        }
        description="新增项目后，Card Swap 会自动生成新卡片，无需修改前端。"
        onActivate={onPanelChange}
        panelId="project-cards"
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
            {orderedProjects.map((item) => (
              <option key={item.id} value={item.id}>
                {item.title}
              </option>
            ))}
          </select>
        </label>

        <div className="admin-inline-actions">
          <button
            disabled={orderedIndex <= 0}
            onClick={() =>
              onChange({
                ...content,
                projects: moveOrderedItem(
                  content.projects,
                  project.id,
                  -1,
                ),
              })
            }
            type="button"
          >
            前移
          </button>
          <button
            disabled={orderedIndex === orderedProjects.length - 1}
            onClick={() =>
              onChange({
                ...content,
                projects: moveOrderedItem(
                  content.projects,
                  project.id,
                  1,
                ),
              })
            }
            type="button"
          >
            后移
          </button>
          <button
            className="is-danger"
            disabled={content.projects.length === 1}
            onClick={() => {
              const remaining = content.projects.filter(
                (_, index) => index !== selectedIndex,
              );
              onChange({
                ...content,
                projects: normalizeOrderedItems(remaining),
              });
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
        </div>
      </EditorPanel>

      <EditorPanel
        description="完整说明中按这四步呈现，不直接堆原始证据。"
        onActivate={onPanelChange}
        panelId="project-path"
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

      <EditorPanel
        description="1 接触、2 形成、3 深化、4 体系化；前台能力树会按当前项目联动点亮。"
        onActivate={onPanelChange}
        panelId="project-capabilities"
        title="项目调用能力"
      >
        <div className="admin-form-grid is-two">
          {content.capabilityAxes.map((axis, index) => {
            const capabilityLevels = getProjectCapabilityLevels(project);
            return (
              <TextField
                key={axis}
                label={axis}
                max={4}
                min={1}
                onChange={(event) => {
                  const nextLevels = [
                    ...capabilityLevels,
                  ] as NonNullable<ProjectTheme["capabilityLevels"]>;
                  nextLevels[index] = Number(
                    event.target.value,
                  ) as NonNullable<
                    ProjectTheme["capabilityLevels"]
                  >[number];
                  updateProject({ capabilityLevels: nextLevels });
                }}
                type="number"
                value={capabilityLevels[index]}
              />
            );
          })}
        </div>
      </EditorPanel>
    </div>
  );
}
