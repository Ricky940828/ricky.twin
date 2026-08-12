"use client";

import { getSitePresentation } from "@/content/site-presentation";
import type { SiteContent } from "@/content/types";

import {
  EditorPanel,
  linesToList,
  TextAreaField,
  TextField,
} from "../editor-fields";

interface HomeEditorProps {
  content: SiteContent;
  onChange: (content: SiteContent) => void;
  onPanelChange?: (panelId: string) => void;
}

export function HomeEditor({
  content,
  onChange,
  onPanelChange,
}: HomeEditorProps) {
  const presentation = getSitePresentation(content.presentation);
  const updatePresentation = (
    next: SiteContent["presentation"],
  ) => onChange({ ...content, presentation: next });
  const updateHero = (
    field: keyof SiteContent["hero"],
    value: string | string[],
  ) => {
    onChange({
      ...content,
      hero: { ...content.hero, [field]: value },
    });
  };

  return (
    <div className="admin-editor-stack">
      <EditorPanel
        description="首页首屏的大字标题、核心主张和欢迎说明。"
        onActivate={onPanelChange}
        panelId="hero-visual"
        title="首屏主视觉"
      >
        <div className="admin-form-grid is-two">
          <TextField
            label="首页眉题"
            onChange={(event) => updateHero("eyebrow", event.target.value)}
            value={content.hero.eyebrow}
          />
          <TextField
            label="首页大字标题"
            onChange={(event) => updateHero("title", event.target.value)}
            value={content.hero.title}
          />
        </div>
        <TextField
          label="首页主张"
          maxLength={60}
          onChange={(event) => updateHero("statement", event.target.value)}
          value={content.hero.statement}
        />
        <TextAreaField
          hint={`${content.hero.welcome.length}/180`}
          label="欢迎语"
          maxLength={180}
          onChange={(event) => updateHero("welcome", event.target.value)}
          rows={4}
          value={content.hero.welcome}
        />
        <TextField
          label="首页滚动提示"
          onChange={(event) =>
            updatePresentation({
              ...presentation,
              heroScrollHint: event.target.value,
            })
          }
          value={presentation.heroScrollHint}
        />
      </EditorPanel>

      <EditorPanel
        description="首屏用于快速识别职业身份的标签，每行一个。"
        onActivate={onPanelChange}
        panelId="hero-tags"
        title="身份标签"
      >
        <TextAreaField
          hint="每行一个标签"
          label="身份标签"
          onChange={(event) =>
            updateHero("tags", linesToList(event.target.value))
          }
          rows={5}
          value={content.hero.tags.join("\n")}
        />
      </EditorPanel>

      <EditorPanel
        description="首屏的两个核心行动入口；顶部导航按钮在“全局设置 > 导航与页面”维护。"
        onActivate={onPanelChange}
        panelId="hero-actions"
        title="首页行动按钮"
      >
        <div className="admin-form-grid is-two">
          <TextField
            label="首页主按钮文案"
            onChange={(event) =>
              updateHero("primaryCta", event.target.value)
            }
            value={content.hero.primaryCta}
          />
          <TextField
            label="首页次按钮文案"
            onChange={(event) =>
              updateHero("secondaryCta", event.target.value)
            }
            value={content.hero.secondaryCta}
          />
        </div>
      </EditorPanel>

      <EditorPanel
        description="首页按钮下方的经历数字与对应说明。"
        onActivate={onPanelChange}
        panelId="hero-proof"
        title="经历数字"
      >
        <div className="admin-form-grid is-two">
          {presentation.heroProof.flatMap((proof, index) => [
            <TextField
              key={`proof-value-${index}`}
              label={`首页数据 ${index + 1}`}
              onChange={(event) => {
                const heroProof = structuredClone(presentation.heroProof);
                heroProof[index].value = event.target.value;
                updatePresentation({ ...presentation, heroProof });
              }}
              value={proof.value}
            />,
            <TextField
              key={`proof-label-${index}`}
              label={`首页数据说明 ${index + 1}`}
              onChange={(event) => {
                const heroProof = structuredClone(presentation.heroProof);
                heroProof[index].label = event.target.value;
                updatePresentation({ ...presentation, heroProof });
              }}
              value={proof.label}
            />,
          ])}
        </div>
      </EditorPanel>

      <EditorPanel
        description="首页右侧的实践项目快捷入口标题；具体卡片在“实践现场”维护。"
        onActivate={onPanelChange}
        panelId="hero-practice"
        title="首页实践入口"
      >
        <div className="admin-form-grid is-two">
          <TextField
            label="实践快捷区眉题"
            onChange={(event) =>
              updatePresentation({
                ...presentation,
                heroPracticeEyebrow: event.target.value,
              })
            }
            value={presentation.heroPracticeEyebrow}
          />
          <TextField
            label="实践快捷区名称"
            onChange={(event) =>
              updatePresentation({
                ...presentation,
                heroPracticeLabel: event.target.value,
              })
            }
            value={presentation.heroPracticeLabel}
          />
        </div>
        <p className="admin-form-note">
          首页入口与“实践现场”共用同一组实践项目，不在这里重复维护。
        </p>
      </EditorPanel>
    </div>
  );
}
