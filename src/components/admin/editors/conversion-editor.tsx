"use client";

import { getSitePresentation } from "@/content/site-presentation";
import type { SiteContent } from "@/content/types";

import {
  EditorPanel,
  TextAreaField,
  TextField,
} from "../editor-fields";

export function ConversionEditor({
  content,
  onChange,
  onPanelChange,
}: {
  content: SiteContent;
  onChange: (content: SiteContent) => void;
  onPanelChange?: (panelId: string) => void;
}) {
  const presentation = getSitePresentation(content.presentation);
  const updateFooter = (
    field: keyof SiteContent["footer"],
    value: string,
  ) => {
    onChange({
      ...content,
      footer: { ...content.footer, [field]: value },
    });
  };

  return (
    <div className="admin-editor-stack">
      <EditorPanel
        description="页面内容结束后的收束表达和行动按钮；网站最底部的版权说明在“全局设置 > 网站页脚”维护。"
        onActivate={onPanelChange}
        panelId="conversion-copy"
        title="底部行动区"
      >
        <TextField
          label="底部行动区眉题"
          onChange={(event) =>
            onChange({
              ...content,
              presentation: {
                ...presentation,
                footer: {
                  ...presentation.footer,
                  eyebrow: event.target.value,
                },
              },
            })
          }
          value={presentation.footer.eyebrow}
        />
        <TextField
          label="底部行动区标题"
          onChange={(event) => updateFooter("headline", event.target.value)}
          value={content.footer.headline}
        />
        <TextAreaField
          label="底部行动区说明"
          onChange={(event) => updateFooter("body", event.target.value)}
          rows={3}
          value={content.footer.body}
        />
        <div className="admin-form-grid is-two">
          <TextField
            label="底部主按钮文案"
            onChange={(event) =>
              updateFooter("primaryCta", event.target.value)
            }
            value={content.footer.primaryCta}
          />
          <TextField
            label="底部次按钮文案"
            onChange={(event) =>
              updateFooter("secondaryCta", event.target.value)
            }
            value={content.footer.secondaryCta}
          />
        </div>
      </EditorPanel>
    </div>
  );
}
