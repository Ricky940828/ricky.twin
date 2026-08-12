"use client";

import { useState } from "react";

import type { PracticeLink, SiteContent } from "@/content/types";
import { getSitePresentation } from "@/content/site-presentation";
import {
  moveOrderedItem,
  normalizeOrderedItems,
} from "@/lib/ordered-content";

import {
  EditorPanel,
  TextAreaField,
  TextField,
  ToggleField,
} from "../editor-fields";

function newPractice(order: number): PracticeLink {
  return {
    id: `practice-${Date.now()}`,
    title: "新实践入口",
    description: "补充这个实践项目的用途和当前状态。",
    type: "PRACTICE",
    status: "planned",
    statusLabel: "待配置",
    icon: "sparkles",
    featured: false,
    visible: true,
    order,
  };
}

export function PracticeEditor({
  content,
  onChange,
  onPanelChange,
}: {
  content: SiteContent;
  onChange: (content: SiteContent) => void;
  onPanelChange?: (panelId: string) => void;
}) {
  const [selectedId, setSelectedId] = useState(content.practice[0]?.id);
  const selectedIndex = Math.max(
    0,
    content.practice.findIndex((item) => item.id === selectedId),
  );
  const practice = content.practice[selectedIndex];
  const presentation = getSitePresentation(content.presentation);
  const updatePracticeCopy = (
    field: keyof typeof presentation.practice,
    value: string,
  ) =>
    onChange({
      ...content,
      presentation: {
        ...presentation,
        practice: { ...presentation.practice, [field]: value },
      },
    });

  if (!practice) {
    return null;
  }

  const updatePractice = (patch: Partial<PracticeLink>) => {
    onChange({
      ...content,
      practice: content.practice.map((item, index) =>
        index === selectedIndex ? { ...item, ...patch } : item,
      ),
    });
  };
  const orderedPractice = normalizeOrderedItems(content.practice);
  const orderedIndex = orderedPractice.findIndex(
    (item) => item.id === practice.id,
  );

  return (
    <div className="admin-editor-stack">
      <EditorPanel
        description="维护实践板块的总标题、说明和通用按钮文案。"
        onActivate={onPanelChange}
        panelId="practice-intro"
        title="实践板块文案"
      >
        <TextField
          label="实践板块眉题"
          onChange={(event) => updatePracticeCopy("eyebrow", event.target.value)}
          value={presentation.practice.eyebrow}
        />
        <TextField
          label="实践板块标题"
          onChange={(event) => updatePracticeCopy("title", event.target.value)}
          value={presentation.practice.title}
        />
        <TextAreaField
          label="实践板块说明"
          onChange={(event) => updatePracticeCopy("body", event.target.value)}
          rows={4}
          value={presentation.practice.body}
        />
        <div className="admin-form-grid is-two">
          <TextField
            label="可访问项目按钮"
            onChange={(event) => updatePracticeCopy("openCta", event.target.value)}
            value={presentation.practice.openCta}
          />
          <TextField
            label="未开放项目按钮"
            onChange={(event) => updatePracticeCopy("pendingCta", event.target.value)}
            value={presentation.practice.pendingCta}
          />
        </div>
      </EditorPanel>

      <EditorPanel
        action={
          <button
            className="admin-button is-secondary"
            onClick={() => {
              const created = newPractice(content.practice.length + 1);
              onChange({
                ...content,
                practice: normalizeOrderedItems([
                  ...content.practice,
                  created,
                ]),
              });
              setSelectedId(created.id);
            }}
            type="button"
          >
            新增入口
          </button>
        }
        description="首页快捷入口和实践现场读取同一份配置。"
        onActivate={onPanelChange}
        panelId="practice-links"
        title="实践入口"
      >
        <label className="admin-field">
          <span>
            <strong>选择实践入口</strong>
          </span>
          <select
            aria-label="选择实践入口"
            onChange={(event) => setSelectedId(event.target.value)}
            value={practice.id}
          >
            {orderedPractice.map((item) => (
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
                practice: moveOrderedItem(
                  content.practice,
                  practice.id,
                  -1,
                ),
              })
            }
            type="button"
          >
            前移
          </button>
          <button
            disabled={orderedIndex === orderedPractice.length - 1}
            onClick={() =>
              onChange({
                ...content,
                practice: moveOrderedItem(
                  content.practice,
                  practice.id,
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
            disabled={content.practice.length === 1}
            onClick={() => {
              const remaining = content.practice.filter(
                (_, index) => index !== selectedIndex,
              );
              onChange({
                ...content,
                practice: normalizeOrderedItems(remaining),
              });
              setSelectedId(remaining[0]?.id);
            }}
            type="button"
          >
            删除入口
          </button>
        </div>

        <div className="admin-form-grid is-two">
          <TextField
            label="入口名称"
            onChange={(event) =>
              updatePractice({ title: event.target.value })
            }
            value={practice.title}
          />
          <TextField
            label="类型标识"
            onChange={(event) =>
              updatePractice({ type: event.target.value })
            }
            value={practice.type}
          />
        </div>
        <TextAreaField
          label="入口说明"
          onChange={(event) =>
            updatePractice({ description: event.target.value })
          }
          rows={4}
          value={practice.description}
        />
        <TextField
          label="访问链接"
          onChange={(event) =>
            updatePractice({
              href: event.target.value.trim() || undefined,
            })
          }
          placeholder="https://"
          value={practice.href ?? ""}
        />
        <div className="admin-form-grid is-two">
          <label className="admin-field">
            <span>
              <strong>状态</strong>
            </span>
            <select
              onChange={(event) =>
                updatePractice({
                  status: event.target.value as PracticeLink["status"],
                })
              }
              value={practice.status}
            >
              <option value="online">在线</option>
              <option value="building">建设中</option>
              <option value="planned">待配置</option>
            </select>
          </label>
          <TextField
            label="状态文案"
            onChange={(event) =>
              updatePractice({ statusLabel: event.target.value })
            }
            value={practice.statusLabel}
          />
        </div>
        <div className="admin-form-grid is-two">
          <ToggleField
            checked={practice.featured}
            label="首页精选入口"
            onChange={(featured) => updatePractice({ featured })}
          />
          <ToggleField
            checked={practice.visible}
            label="前台展示"
            onChange={(visible) => updatePractice({ visible })}
          />
        </div>
      </EditorPanel>
    </div>
  );
}
