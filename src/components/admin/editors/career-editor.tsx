"use client";

import { useState } from "react";

import type { CareerStage, SiteContent } from "@/content/types";
import { getSitePresentation } from "@/content/site-presentation";

import {
  EditorPanel,
  linesToList,
  TextAreaField,
  TextField,
} from "../editor-fields";

function normalizeStages(stages: CareerStage[]) {
  return stages.map((stage, index) => ({
    ...stage,
    nextStageId: stages[index + 1]?.id,
  }));
}

function newStage(): CareerStage {
  return {
    id: `career-${Date.now()}`,
    publicBrand: "新职业阶段",
    period: "时间待配置",
    role: "职位待配置",
    positioning: "补充这一阶段形成的能力增量",
    highlights: ["补充这一阶段的重点工作内容。"],
    radar: [1, 1, 1, 1, 1, 1],
  };
}

export function CareerEditor({
  content,
  onChange,
  onPanelChange,
}: {
  content: SiteContent;
  onChange: (content: SiteContent) => void;
  onPanelChange?: (panelId: string) => void;
}) {
  const [selectedId, setSelectedId] = useState(content.career[0]?.id);
  const selectedIndex = Math.max(
    0,
    content.career.findIndex((stage) => stage.id === selectedId),
  );
  const stage = content.career[selectedIndex];
  const presentation = getSitePresentation(content.presentation);
  const updateCareerCopy = (
    field: keyof typeof presentation.career,
    value: string,
  ) =>
    onChange({
      ...content,
      presentation: {
        ...presentation,
        career: { ...presentation.career, [field]: value },
      },
    });

  if (!stage) {
    return null;
  }

  const updateStage = (patch: Partial<CareerStage>) => {
    onChange({
      ...content,
      career: content.career.map((item, index) =>
        index === selectedIndex ? { ...item, ...patch } : item,
      ),
    });
  };

  const move = (offset: -1 | 1) => {
    const target = selectedIndex + offset;
    if (target < 0 || target >= content.career.length) {
      return;
    }
    const stages = [...content.career];
    [stages[selectedIndex], stages[target]] = [
      stages[target],
      stages[selectedIndex],
    ];
    onChange({ ...content, career: normalizeStages(stages) });
  };

  return (
    <div className="admin-editor-stack">
      <EditorPanel
        description="当前对外展示文案均可调整，不改变职业阶段数据和动画逻辑。"
        onActivate={onPanelChange}
        panelId="career-intro"
        title="职业路线板块文案"
      >
        <TextField
          label="职业路线眉题"
          onChange={(event) => updateCareerCopy("eyebrow", event.target.value)}
          value={presentation.career.eyebrow}
        />
        <TextField
          label="职业路线标题"
          onChange={(event) => updateCareerCopy("title", event.target.value)}
          value={presentation.career.title}
        />
        <TextAreaField
          label="职业路线说明"
          onChange={(event) => updateCareerCopy("body", event.target.value)}
          rows={4}
          value={presentation.career.body}
        />
        <div className="admin-form-grid is-two">
          <TextField
            label="下一阶段按钮前缀"
            onChange={(event) => updateCareerCopy("nextStagePrefix", event.target.value)}
            value={presentation.career.nextStagePrefix}
          />
          <TextField
            label="最终阶段项目按钮"
            onChange={(event) => updateCareerCopy("projectsCta", event.target.value)}
            value={presentation.career.projectsCta}
          />
          <TextField
            label="雷达图说明"
            onChange={(event) => updateCareerCopy("radarCaption", event.target.value)}
            value={presentation.career.radarCaption}
          />
        </div>
      </EditorPanel>

      <EditorPanel
        action={
          <button
            className="admin-button is-secondary"
            onClick={() => {
              const created = newStage();
              onChange({
                ...content,
                career: normalizeStages([...content.career, created]),
              });
              setSelectedId(created.id);
            }}
            type="button"
          >
            新增阶段
          </button>
        }
        description="阶段顺序同时决定人物行走路线和能力雷达增量。"
        onActivate={onPanelChange}
        panelId="career-stages"
        title="职业路线"
      >
        <label className="admin-field">
          <span>
            <strong>选择职业阶段</strong>
          </span>
          <select
            aria-label="选择职业阶段"
            onChange={(event) => setSelectedId(event.target.value)}
            value={stage.id}
          >
            {content.career.map((item) => (
              <option key={item.id} value={item.id}>
                {item.publicBrand}
              </option>
            ))}
          </select>
        </label>

        <div className="admin-inline-actions">
          <button
            disabled={selectedIndex === 0}
            onClick={() => move(-1)}
            type="button"
          >
            前移
          </button>
          <button
            disabled={selectedIndex === content.career.length - 1}
            onClick={() => move(1)}
            type="button"
          >
            后移
          </button>
          <button
            className="is-danger"
            disabled={content.career.length === 1}
            onClick={() => {
              const remaining = content.career.filter(
                (_, index) => index !== selectedIndex,
              );
              onChange({
                ...content,
                career: normalizeStages(remaining),
              });
              setSelectedId(remaining[0]?.id);
            }}
            type="button"
          >
            删除阶段
          </button>
        </div>

        <div className="admin-form-grid is-two">
          <TextField
            label="对外名称"
            onChange={(event) =>
              updateStage({ publicBrand: event.target.value })
            }
            value={stage.publicBrand}
          />
          <TextField
            label="阶段时间"
            onChange={(event) => updateStage({ period: event.target.value })}
            value={stage.period}
          />
          <TextField
            label="职位"
            onChange={(event) => updateStage({ role: event.target.value })}
            value={stage.role}
          />
          <TextField
            label="阶段定位"
            onChange={(event) =>
              updateStage({ positioning: event.target.value })
            }
            value={stage.positioning}
          />
        </div>
        <TextAreaField
          hint="每行一条，建议 3–5 条"
          label="重点工作内容"
          onChange={(event) =>
            updateStage({ highlights: linesToList(event.target.value) })
          }
          rows={6}
          value={stage.highlights.join("\n")}
        />
      </EditorPanel>

      <EditorPanel
        description="1 接触、2 形成、3 深化、4 体系化。"
        onActivate={onPanelChange}
        panelId="career-radar"
        title="这一阶段的能力覆盖"
      >
        <div className="admin-form-grid is-two">
          {content.capabilityAxes.map((axis, index) => (
            <TextField
              key={axis}
              label={axis}
              max={4}
              min={1}
              onChange={(event) => {
                const radar = [...stage.radar] as CareerStage["radar"];
                radar[index] = Number(
                  event.target.value,
                ) as CareerStage["radar"][number];
                updateStage({ radar });
              }}
              type="number"
              value={stage.radar[index]}
            />
          ))}
        </div>
      </EditorPanel>
    </div>
  );
}
