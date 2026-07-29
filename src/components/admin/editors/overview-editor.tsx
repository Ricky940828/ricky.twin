"use client";

import type { SiteContent } from "@/content/types";

import {
  EditorPanel,
  linesToList,
  TextAreaField,
  TextField,
  ToggleField,
} from "../editor-fields";

interface OverviewEditorProps {
  content: SiteContent;
  onChange: (content: SiteContent) => void;
}

export function OverviewEditor({
  content,
  onChange,
}: OverviewEditorProps) {
  const updateBrand = (
    field: keyof SiteContent["brand"],
    value: string,
  ) => {
    onChange({
      ...content,
      brand: { ...content.brand, [field]: value },
    });
  };
  const updateHero = (
    field: keyof SiteContent["hero"],
    value: string | string[],
  ) => {
    onChange({
      ...content,
      hero: { ...content.hero, [field]: value },
    });
  };
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
        description="品牌名和首页核心表达，修改后会立即进入右侧草稿预览。"
        title="首页与身份"
      >
        <div className="admin-form-grid is-two">
          <TextField
            label="网站名称"
            onChange={(event) => updateBrand("name", event.target.value)}
            value={content.brand.name}
          />
          <TextField
            label="英文标识"
            onChange={(event) =>
              updateBrand("wordmark", event.target.value)
            }
            value={content.brand.wordmark}
          />
        </div>
        <TextField
          label="首页主张"
          maxLength={60}
          onChange={(event) =>
            updateHero("statement", event.target.value)
          }
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
        <TextAreaField
          hint="每行一个标签"
          label="身份标签"
          onChange={(event) =>
            updateHero("tags", linesToList(event.target.value))
          }
          rows={4}
          value={content.hero.tags.join("\n")}
        />
      </EditorPanel>

      <EditorPanel
        description="关闭板块后，前台导航和滚动路线会同步跳过。"
        title="板块开关与顺序"
      >
        <div className="admin-section-configs">
          {[...content.sections]
            .sort((left, right) => left.order - right.order)
            .map((section) => (
              <div key={section.id} className="admin-section-config">
                <ToggleField
                  checked={section.enabled}
                  description={section.id}
                  label={`展示${section.label}`}
                  onChange={(enabled) =>
                    onChange({
                      ...content,
                      sections: content.sections.map((item) =>
                        item.id === section.id
                          ? { ...item, enabled }
                          : item,
                      ),
                    })
                  }
                />
                <TextField
                  aria-label={`${section.label}顺序`}
                  label="顺序"
                  min={1}
                  onChange={(event) =>
                    onChange({
                      ...content,
                      sections: content.sections.map((item) =>
                        item.id === section.id
                          ? {
                              ...item,
                              order: Number(event.target.value),
                            }
                          : item,
                      ),
                    })
                  }
                  type="number"
                  value={section.order}
                />
              </div>
            ))}
        </div>
      </EditorPanel>

      <EditorPanel
        description="雷达图固定六个维度，职业阶段分别维护成熟度数值。"
        title="能力雷达维度"
      >
        <div className="admin-form-grid is-two">
          {content.capabilityAxes.map((axis, index) => (
            <TextField
              key={`${axis}-${index}`}
              label={`维度 ${index + 1}`}
              onChange={(event) => {
                const next = [...content.capabilityAxes] as SiteContent["capabilityAxes"];
                next[index] = event.target.value;
                onChange({ ...content, capabilityAxes: next });
              }}
              value={axis}
            />
          ))}
        </div>
      </EditorPanel>

      <EditorPanel title="页尾转化">
        <TextField
          label="页尾标题"
          onChange={(event) =>
            updateFooter("headline", event.target.value)
          }
          value={content.footer.headline}
        />
        <TextAreaField
          label="页尾说明"
          onChange={(event) => updateFooter("body", event.target.value)}
          rows={3}
          value={content.footer.body}
        />
      </EditorPanel>
    </div>
  );
}
