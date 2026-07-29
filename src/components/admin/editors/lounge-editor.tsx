"use client";

import { useState } from "react";

import type {
  KnowledgeBadge,
  LoungeContent,
  SiteContent,
} from "@/content/types";

import {
  EditorPanel,
  linesToList,
  TextAreaField,
  TextField,
  ToggleField,
} from "../editor-fields";

export function LoungeEditor({
  content,
  onChange,
}: {
  content: SiteContent;
  onChange: (content: SiteContent) => void;
}) {
  const [selectedKnowledgeId, setSelectedKnowledgeId] = useState(
    content.lounge.knowledge[0]?.id,
  );
  const selectedKnowledgeIndex = Math.max(
    0,
    content.lounge.knowledge.findIndex(
      (item) => item.id === selectedKnowledgeId,
    ),
  );
  const knowledge = content.lounge.knowledge[selectedKnowledgeIndex];

  const updateLounge = (
    field: keyof LoungeContent,
    value: LoungeContent[keyof LoungeContent],
  ) => {
    onChange({
      ...content,
      lounge: { ...content.lounge, [field]: value },
    });
  };

  const updateKnowledge = (patch: Partial<KnowledgeBadge>) => {
    onChange({
      ...content,
      lounge: {
        ...content.lounge,
        knowledge: content.lounge.knowledge.map((item, index) =>
          index === selectedKnowledgeIndex
            ? { ...item, ...patch }
            : item,
        ),
      },
    });
  };

  return (
    <div className="admin-editor-stack">
      <EditorPanel
        description="这里维护会客厅引导文案；Agent 的系统提示词在后续 Agent 管理中独立维护。"
        title="AI 会客厅展示"
      >
        <TextField
          label="眉题"
          onChange={(event) =>
            updateLounge("eyebrow", event.target.value)
          }
          value={content.lounge.eyebrow}
        />
        <TextField
          label="标题"
          onChange={(event) => updateLounge("title", event.target.value)}
          value={content.lounge.title}
        />
        <TextAreaField
          label="引导说明"
          onChange={(event) => updateLounge("intro", event.target.value)}
          rows={4}
          value={content.lounge.intro}
        />
        <TextAreaField
          hint="每行一个问题"
          label="快捷问题"
          onChange={(event) =>
            updateLounge(
              "quickQuestions",
              linesToList(event.target.value),
            )
          }
          rows={6}
          value={content.lounge.quickQuestions.join("\n")}
        />
        <TextAreaField
          hint="每行一条"
          label="回答边界"
          onChange={(event) =>
            updateLounge("boundaries", linesToList(event.target.value))
          }
          rows={5}
          value={content.lounge.boundaries.join("\n")}
        />
      </EditorPanel>

      {knowledge ? (
        <EditorPanel
          description="仅在“知识库”模块尚未创建任何会客厅展示项时使用；正式知识库名称、权限和 RAG 状态以“知识库”模块为准。"
          title="知识库标识占位内容"
        >
          <label className="admin-field">
            <span>
              <strong>选择知识库标识</strong>
            </span>
            <select
              onChange={(event) =>
                setSelectedKnowledgeId(event.target.value)
              }
              value={knowledge.id}
            >
              {content.lounge.knowledge.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <TextField
            label="语义名称"
            onChange={(event) =>
              updateKnowledge({ name: event.target.value })
            }
            value={knowledge.name}
          />
          <TextAreaField
            label="公开说明"
            onChange={(event) =>
              updateKnowledge({ description: event.target.value })
            }
            rows={3}
            value={knowledge.description}
          />
          <div className="admin-form-grid is-two">
            <label className="admin-field">
              <span>
                <strong>访问级别</strong>
              </span>
              <select
                onChange={(event) =>
                  updateKnowledge({
                    access: event.target
                      .value as KnowledgeBadge["access"],
                  })
                }
                value={knowledge.access}
              >
                <option value="public">公开</option>
                <option value="available">可访问</option>
                <option value="request">需申请</option>
              </select>
            </label>
            <TextField
              label="权限文案"
              onChange={(event) =>
                updateKnowledge({ accessLabel: event.target.value })
              }
              value={knowledge.accessLabel}
            />
          </div>
          <ToggleField
            checked={knowledge.ragEnabled}
            description="仅用于无后台知识库时的占位展示，不控制真实检索。"
            label="占位状态显示可用"
            onChange={(ragEnabled) => updateKnowledge({ ragEnabled })}
          />
        </EditorPanel>
      ) : null}
    </div>
  );
}
