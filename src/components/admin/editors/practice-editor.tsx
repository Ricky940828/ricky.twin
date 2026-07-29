"use client";

import { useState } from "react";

import type { PracticeLink, SiteContent } from "@/content/types";

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
}: {
  content: SiteContent;
  onChange: (content: SiteContent) => void;
}) {
  const [selectedId, setSelectedId] = useState(content.practice[0]?.id);
  const selectedIndex = Math.max(
    0,
    content.practice.findIndex((item) => item.id === selectedId),
  );
  const practice = content.practice[selectedIndex];

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

  return (
    <div className="admin-editor-stack">
      <EditorPanel
        action={
          <button
            className="admin-button is-secondary"
            onClick={() => {
              const created = newPractice(content.practice.length + 1);
              onChange({
                ...content,
                practice: [...content.practice, created],
              });
              setSelectedId(created.id);
            }}
            type="button"
          >
            新增入口
          </button>
        }
        description="首页快捷入口和实践现场读取同一份配置。"
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
            {content.practice.map((item) => (
              <option key={item.id} value={item.id}>
                {item.title}
              </option>
            ))}
          </select>
        </label>

        <div className="admin-inline-actions">
          <button
            className="is-danger"
            disabled={content.practice.length === 1}
            onClick={() => {
              const remaining = content.practice.filter(
                (_, index) => index !== selectedIndex,
              );
              onChange({ ...content, practice: remaining });
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
          <TextField
            label="展示顺序"
            min={1}
            onChange={(event) =>
              updatePractice({ order: Number(event.target.value) })
            }
            type="number"
            value={practice.order}
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
