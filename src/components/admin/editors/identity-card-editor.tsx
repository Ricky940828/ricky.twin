"use client";

import { getIdentityCardContent } from "@/content/identity-card";
import type { IdentityCardContent, SiteContent } from "@/content/types";

import {
  EditorPanel,
  linesToList,
  TextAreaField,
  TextField,
} from "../editor-fields";

interface IdentityCardEditorProps {
  content: SiteContent;
  onChange: (content: SiteContent) => void;
  onPanelChange?: (panelId: string) => void;
}

export function IdentityCardEditor({
  content,
  onChange,
  onPanelChange,
}: IdentityCardEditorProps) {
  const identityCard = getIdentityCardContent(content.identityCard);

  const replaceIdentityCard = (next: IdentityCardContent) => {
    onChange({ ...content, identityCard: next });
  };
  const updateFront = (
    field: keyof IdentityCardContent["front"],
    value: string | string[],
  ) => {
    replaceIdentityCard({
      ...identityCard,
      front: { ...identityCard.front, [field]: value },
    });
  };
  const updateBack = (
    field: keyof IdentityCardContent["back"],
    value: string,
  ) => {
    replaceIdentityCard({
      ...identityCard,
      back: { ...identityCard.back, [field]: value },
    });
  };

  return (
    <div className="admin-editor-stack">
      <EditorPanel
        description="访客点击人物工牌后首先看到的身份信息与行动入口。"
        onActivate={onPanelChange}
        panelId="identity-card-front"
        title="名片正面"
      >
        <div className="admin-form-grid is-two">
          <TextField
            label="名片编号"
            onChange={(event) => updateFront("eyebrow", event.target.value)}
            value={identityCard.front.eyebrow}
          />
          <TextField
            label="对外姓名"
            onChange={(event) => updateFront("name", event.target.value)}
            value={identityCard.front.name}
          />
        </div>
        <TextField
          label="职业身份"
          onChange={(event) => updateFront("role", event.target.value)}
          value={identityCard.front.role}
        />
        <TextAreaField
          hint={`${identityCard.front.summary.length}/220`}
          label="个人简介"
          maxLength={220}
          onChange={(event) => updateFront("summary", event.target.value)}
          rows={5}
          value={identityCard.front.summary}
        />
        <TextAreaField
          hint="每行一个标签"
          label="能力标签"
          onChange={(event) =>
            updateFront("tags", linesToList(event.target.value))
          }
          rows={5}
          value={identityCard.front.tags.join("\n")}
        />
        <div className="admin-form-grid is-two">
          <TextField
            label="主按钮文案"
            onChange={(event) =>
              updateFront("primaryCta", event.target.value)
            }
            value={identityCard.front.primaryCta}
          />
          <TextField
            label="次按钮文案"
            onChange={(event) =>
              updateFront("secondaryCta", event.target.value)
            }
            value={identityCard.front.secondaryCta}
          />
          <TextField
            label="翻到背面按钮文案"
            onChange={(event) =>
              updateFront("flipToBack", event.target.value)
            }
            value={identityCard.front.flipToBack}
          />
        </div>
        <p className="admin-form-note">
          两个行动按钮的目标固定为 AI 会客厅和职业路线，避免误配无效链接。
        </p>
      </EditorPanel>

      <EditorPanel
        description="背面框架文案在这里维护；知识库名称与权限状态自动读取真实知识库。"
        onActivate={onPanelChange}
        panelId="identity-card-back"
        title="知识与权限"
      >
        <div className="admin-form-grid is-two">
          <TextField
            label="背面眉题"
            onChange={(event) => updateBack("eyebrow", event.target.value)}
            value={identityCard.back.eyebrow}
          />
          <TextField
            label="背面标题"
            onChange={(event) => updateBack("title", event.target.value)}
            value={identityCard.back.title}
          />
          <TextField
            label="状态文案"
            onChange={(event) =>
              updateBack("statusLabel", event.target.value)
            }
            value={identityCard.back.statusLabel}
          />
          <TextField
            label="底部英文说明"
            onChange={(event) =>
              updateBack("footerEyebrow", event.target.value)
            }
            value={identityCard.back.footerEyebrow}
          />
        </div>
        <TextAreaField
          label="权限说明"
          maxLength={160}
          onChange={(event) => updateBack("footerBody", event.target.value)}
          rows={4}
          value={identityCard.back.footerBody}
        />
        <div className="admin-form-grid is-two">
          <TextField
            label="翻回正面按钮文案"
            onChange={(event) =>
              updateBack("flipToFront", event.target.value)
            }
            value={identityCard.back.flipToFront}
          />
          <TextField
            label="关闭按钮文案"
            onChange={(event) =>
              replaceIdentityCard({
                ...identityCard,
                closeLabel: event.target.value,
              })
            }
            value={identityCard.closeLabel}
          />
        </div>
        <p className="admin-form-note">
          知识库增删、名称、RAG 状态和访问权限请在“系统能力 &gt; 知识库”维护。
        </p>
      </EditorPanel>
    </div>
  );
}
