"use client";

import { getSitePresentation } from "@/content/site-presentation";
import type { LoungeContent, SiteContent } from "@/content/types";

import {
  EditorPanel,
  linesToList,
  TextAreaField,
  TextField,
} from "../editor-fields";

export function LoungeEditor({
  content,
  onChange,
  onPanelChange,
}: {
  content: SiteContent;
  onChange: (content: SiteContent) => void;
  onPanelChange?: (panelId: string) => void;
}) {
  const presentation = getSitePresentation(content.presentation);

  const updateLounge = (
    field: keyof LoungeContent,
    value: LoungeContent[keyof LoungeContent],
  ) => {
    onChange({
      ...content,
      lounge: { ...content.lounge, [field]: value },
    });
  };

  const updateLoungeCopy = (
    field: keyof typeof presentation.lounge,
    value: string,
  ) => {
    onChange({
      ...content,
      presentation: {
        ...presentation,
        lounge: { ...presentation.lounge, [field]: value },
      },
    });
  };

  return (
    <div className="admin-editor-stack">
      <EditorPanel
        description="AI 会客厅页面开场区域的标题和说明。"
        onActivate={onPanelChange}
        panelId="lounge-intro"
        title="会客厅页面引导"
      >
        <div className="admin-form-grid is-two">
          <TextField
            label="会客厅眉题"
            onChange={(event) =>
              updateLounge("eyebrow", event.target.value)
            }
            value={content.lounge.eyebrow}
          />
          <TextField
            label="会客厅大标题"
            onChange={(event) =>
              updateLoungeCopy("displayTitle", event.target.value)
            }
            value={presentation.lounge.displayTitle}
          />
        </div>
        <TextField
          label="会客厅标题"
          onChange={(event) => updateLounge("title", event.target.value)}
          value={content.lounge.title}
        />
        <TextAreaField
          label="会客厅引导说明"
          onChange={(event) => updateLounge("intro", event.target.value)}
          rows={4}
          value={content.lounge.intro}
        />
      </EditorPanel>

      <EditorPanel
        description="知识库标签上方的数字分身和访客状态提示。"
        onActivate={onPanelChange}
        panelId="lounge-reception"
        title="数字接待台"
      >
        <div className="admin-form-grid is-two">
          <TextField
            label="在线状态文案"
            onChange={(event) =>
              updateLoungeCopy("onlineLabel", event.target.value)
            }
            value={presentation.lounge.onlineLabel}
          />
          <TextField
            label="访客状态文案"
            onChange={(event) =>
              updateLoungeCopy("visitorLabel", event.target.value)
            }
            value={presentation.lounge.visitorLabel}
          />
          <TextField
            label="知识权限提示"
            onChange={(event) =>
              updateLoungeCopy("statusHint", event.target.value)
            }
            value={presentation.lounge.statusHint}
          />
        </div>
        <p className="admin-form-note">
          会客厅知识库标签只读取“知识库”模块中的真实名称、权限和 RAG 状态。
        </p>
      </EditorPanel>

      <EditorPanel
        description="访客进入会客厅后看到的对话台名称、输入提示和快捷问题。"
        onActivate={onPanelChange}
        panelId="lounge-conversation"
        title="对话引导"
      >
        <TextField
          label="聊天台名称"
          onChange={(event) =>
            updateLoungeCopy("chatTitle", event.target.value)
          }
          value={presentation.lounge.chatTitle}
        />
        <div className="admin-form-grid is-two">
          <TextField
            label="输入框提示"
            onChange={(event) =>
              updateLounge("inputPlaceholder", event.target.value)
            }
            value={content.lounge.inputPlaceholder}
          />
          <TextField
            label="发送按钮文案"
            onChange={(event) =>
              updateLounge("sendLabel", event.target.value)
            }
            value={content.lounge.sendLabel}
          />
        </div>
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
      </EditorPanel>

      <EditorPanel
        description="这里维护对外可见的边界说明；Agent 系统提示词与工具权限仍在 Agent 管理中维护。"
        onActivate={onPanelChange}
        panelId="lounge-boundaries"
        title="回答边界"
      >
        <TextAreaField
          hint="每行一条"
          label="回答边界清单"
          onChange={(event) =>
            updateLounge("boundaries", linesToList(event.target.value))
          }
          rows={6}
          value={content.lounge.boundaries.join("\n")}
        />
        <TextAreaField
          label="聊天边界提示"
          onChange={(event) =>
            updateLoungeCopy("boundary", event.target.value)
          }
          rows={3}
          value={presentation.lounge.boundary}
        />
      </EditorPanel>
    </div>
  );
}
