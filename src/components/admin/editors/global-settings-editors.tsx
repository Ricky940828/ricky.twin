"use client";

import { getSitePresentation } from "@/content/site-presentation";
import type { SiteContent } from "@/content/types";
import { moveOrderedItem } from "@/lib/ordered-content";

import {
  EditorPanel,
  TextField,
  ToggleField,
} from "../editor-fields";

interface GlobalEditorProps {
  content: SiteContent;
  onChange: (content: SiteContent) => void;
  onPanelChange?: (panelId: string) => void;
}

export function BrandEditor({
  content,
  onChange,
  onPanelChange,
}: GlobalEditorProps) {
  const updateBrand = (
    field: keyof SiteContent["brand"],
    value: string,
  ) => {
    onChange({
      ...content,
      brand: { ...content.brand, [field]: value },
    });
  };

  return (
    <div className="admin-editor-stack">
      <EditorPanel
        description="这些信息会跨首页、导航、身份卡和网站页脚复用。"
        onActivate={onPanelChange}
        panelId="brand-identity"
        title="品牌与身份"
      >
        <div className="admin-form-grid is-two">
          <TextField
            label="网站名称"
            onChange={(event) => updateBrand("name", event.target.value)}
            value={content.brand.name}
          />
          <TextField
            label="英文标识"
            onChange={(event) => updateBrand("wordmark", event.target.value)}
            value={content.brand.wordmark}
          />
          <TextField
            label="对外姓名"
            onChange={(event) => updateBrand("ownerName", event.target.value)}
            value={content.brand.ownerName}
          />
          <TextField
            label="所在城市"
            onChange={(event) => updateBrand("location", event.target.value)}
            value={content.brand.location}
          />
          <TextField
            label="在线状态文案"
            onChange={(event) => updateBrand("onlineLabel", event.target.value)}
            value={content.brand.onlineLabel}
          />
        </div>
      </EditorPanel>
    </div>
  );
}

export function NavigationEditor({
  content,
  onChange,
  onPanelChange,
}: GlobalEditorProps) {
  const presentation = getSitePresentation(content.presentation);

  return (
    <div className="admin-editor-stack">
      <EditorPanel
        description="维护顶部会客厅按钮，以及各页面是否展示、导航名称和前台顺序。"
        onActivate={onPanelChange}
        panelId="navigation-sections"
        title="导航与页面"
      >
        <TextField
          label="顶部会客厅按钮文案"
          onChange={(event) =>
            onChange({
              ...content,
              presentation: {
                ...presentation,
                headerCta: event.target.value,
              },
            })
          }
          value={presentation.headerCta}
        />
        <p className="admin-form-note">
          关闭页面只影响公开前台，后台对应内容仍可继续编辑。调整顺序后预览会按新顺序重排。
        </p>
        <div className="admin-section-configs">
          {[...content.sections]
            .sort((left, right) => left.order - right.order)
            .map((section, index, orderedSections) => (
              <div key={section.id} className="admin-section-config">
                <ToggleField
                  checked={section.enabled}
                  description={section.id}
                  label={`展示${section.label}`}
                  onChange={(enabled) =>
                    onChange({
                      ...content,
                      sections: content.sections.map((item) =>
                        item.id === section.id ? { ...item, enabled } : item,
                      ),
                    })
                  }
                />
                <div className="admin-form-grid is-two">
                  <TextField
                    label="导航名称"
                    onChange={(event) =>
                      onChange({
                        ...content,
                        sections: content.sections.map((item) =>
                          item.id === section.id
                            ? { ...item, label: event.target.value }
                            : item,
                        ),
                      })
                    }
                    value={section.label}
                  />
                  <TextField
                    label="移动端简称"
                    onChange={(event) =>
                      onChange({
                        ...content,
                        sections: content.sections.map((item) =>
                          item.id === section.id
                            ? { ...item, shortLabel: event.target.value }
                            : item,
                        ),
                      })
                    }
                    value={section.shortLabel}
                  />
                </div>
                <div className="admin-inline-actions">
                  <button
                    disabled={index === 0}
                    onClick={() =>
                      onChange({
                        ...content,
                        sections: moveOrderedItem(
                          content.sections,
                          section.id,
                          -1,
                        ),
                      })
                    }
                    type="button"
                  >
                    前移
                  </button>
                  <button
                    disabled={index === orderedSections.length - 1}
                    onClick={() =>
                      onChange({
                        ...content,
                        sections: moveOrderedItem(
                          content.sections,
                          section.id,
                          1,
                        ),
                      })
                    }
                    type="button"
                  >
                    后移
                  </button>
                  <span>当前第 {index + 1} 位</span>
                </div>
              </div>
            ))}
        </div>
      </EditorPanel>
    </div>
  );
}

export function CapabilitiesEditor({
  content,
  onChange,
  onPanelChange,
}: GlobalEditorProps) {
  return (
    <div className="admin-editor-stack">
      <EditorPanel
        description="六个维度会同时用于职业雷达图和项目能力联动；这里只改名称，各阶段成熟度仍在职业路线维护。"
        onActivate={onPanelChange}
        panelId="capability-axes"
        title="共用能力维度"
      >
        <div className="admin-form-grid is-two">
          {content.capabilityAxes.map((axis, index) => (
            <TextField
              key={`${axis}-${index}`}
              label={`维度 ${index + 1}`}
              onChange={(event) => {
                const next = [
                  ...content.capabilityAxes,
                ] as SiteContent["capabilityAxes"];
                next[index] = event.target.value;
                onChange({ ...content, capabilityAxes: next });
              }}
              value={axis}
            />
          ))}
        </div>
      </EditorPanel>
    </div>
  );
}

export function SiteFooterEditor({
  content,
  onChange,
  onPanelChange,
}: GlobalEditorProps) {
  const presentation = getSitePresentation(content.presentation);

  return (
    <div className="admin-editor-stack">
      <EditorPanel
        description="网站最底部的共用信息；英文标识、城市和年份由品牌信息与系统时间自动生成。"
        onActivate={onPanelChange}
        panelId="site-footer-meta"
        title="网站页脚"
      >
        <div className="admin-inherited-content">
          <span>自动引用</span>
          <strong>{content.brand.wordmark}</strong>
          <small>
            {content.brand.location} · DIGITAL TWIN · {new Date().getFullYear()}
          </small>
        </div>
        <TextField
          label="页脚底部说明"
          onChange={(event) =>
            onChange({
              ...content,
              presentation: {
                ...presentation,
                footer: {
                  ...presentation.footer,
                  bottomNote: event.target.value,
                },
              },
            })
          }
          value={presentation.footer.bottomNote}
        />
      </EditorPanel>
    </div>
  );
}
