import type { SiteSectionId } from "@/content/types";

export type AdminEditorId =
  | "home"
  | "identity-card"
  | "career"
  | "projects"
  | "practice"
  | "lounge"
  | "conversion"
  | "brand"
  | "navigation"
  | "capabilities"
  | "site-footer";

export type AdminPreviewSection =
  | SiteSectionId
  | "footer"
  | "identity-card";

export interface AdminPreviewTarget {
  identityFace?: "front" | "back";
  section: AdminPreviewSection;
  selector?: string;
  label: string;
}

export interface AdminPreviewFocusRequest extends AdminPreviewTarget {
  requestId: number;
}

export interface AdminEditorPanel {
  id: string;
  label: string;
  preview: AdminPreviewTarget;
}

export interface AdminEditorMeta {
  id: AdminEditorId;
  label: string;
  eyebrow: string;
  location: string;
  panels: AdminEditorPanel[];
}

export interface AdminEditorGroup {
  id: "page-content" | "global-settings";
  label: string;
  items: AdminEditorMeta[];
}

export const ADMIN_EDITOR_META: Record<AdminEditorId, AdminEditorMeta> = {
  home: {
    id: "home",
    label: "首页",
    eyebrow: "HOME",
    location: "首页",
    panels: [
      {
        id: "hero-visual",
        label: "首屏主视觉",
        preview: { section: "hero", selector: ".hero-copy", label: "首屏主视觉" },
      },
      {
        id: "hero-tags",
        label: "身份标签",
        preview: { section: "hero", selector: ".hero-tags", label: "身份标签" },
      },
      {
        id: "hero-actions",
        label: "行动按钮",
        preview: { section: "hero", selector: ".hero-actions", label: "行动按钮" },
      },
      {
        id: "hero-proof",
        label: "经历数字",
        preview: { section: "hero", selector: ".hero-proof", label: "经历数字" },
      },
      {
        id: "hero-practice",
        label: "首页实践入口",
        preview: { section: "hero", selector: ".practice-dock", label: "首页实践入口" },
      },
    ],
  },
  "identity-card": {
    id: "identity-card",
    label: "身份名片",
    eyebrow: "IDENTITY CARD",
    location: "身份名片",
    panels: [
      {
        id: "identity-card-front",
        label: "名片正面",
        preview: {
          section: "identity-card",
          identityFace: "front",
          label: "名片正面",
        },
      },
      {
        id: "identity-card-back",
        label: "知识与权限",
        preview: {
          section: "identity-card",
          identityFace: "back",
          label: "知识与权限",
        },
      },
    ],
  },
  career: {
    id: "career",
    label: "职业路线",
    eyebrow: "CAREER",
    location: "职业路线",
    panels: [
      {
        id: "career-intro",
        label: "板块引导",
        preview: { section: "career", selector: ".career-section__intro", label: "职业路线引导" },
      },
      {
        id: "career-stages",
        label: "职业阶段",
        preview: { section: "career", selector: ".career-route", label: "职业阶段" },
      },
      {
        id: "career-radar",
        label: "雷达能力值",
        preview: { section: "career", selector: ".career-radar-panel", label: "能力雷达" },
      },
    ],
  },
  projects: {
    id: "projects",
    label: "项目与能力",
    eyebrow: "PROJECTS",
    location: "项目与能力",
    panels: [
      {
        id: "projects-intro",
        label: "板块引导",
        preview: { section: "projects", selector: ".projects-section__intro", label: "项目板块引导" },
      },
      {
        id: "project-cards",
        label: "项目卡片",
        preview: { section: "projects", selector: ".projects-stage__cards", label: "项目卡片" },
      },
      {
        id: "project-path",
        label: "项目解题路径",
        preview: { section: "projects", selector: ".projects-stage__cards", label: "项目解题路径" },
      },
      {
        id: "project-capabilities",
        label: "项目关联能力",
        preview: { section: "projects", selector: ".project-capability-map", label: "项目关联能力" },
      },
    ],
  },
  practice: {
    id: "practice",
    label: "实践现场",
    eyebrow: "PRACTICE",
    location: "实践现场",
    panels: [
      {
        id: "practice-intro",
        label: "板块引导",
        preview: { section: "practice", selector: ".practice-section__intro", label: "实践板块引导" },
      },
      {
        id: "practice-links",
        label: "实践入口卡片",
        preview: { section: "practice", selector: ".practice-grid", label: "实践入口卡片" },
      },
    ],
  },
  lounge: {
    id: "lounge",
    label: "AI 会客厅",
    eyebrow: "LOUNGE",
    location: "AI 会客厅",
    panels: [
      {
        id: "lounge-intro",
        label: "页面引导",
        preview: { section: "lounge", selector: ".lounge-section__intro", label: "会客厅页面引导" },
      },
      {
        id: "lounge-reception",
        label: "数字接待台",
        preview: { section: "lounge", selector: ".lounge-status-bar", label: "数字接待台" },
      },
      {
        id: "lounge-conversation",
        label: "对话引导",
        preview: { section: "lounge", selector: ".lounge-chat", label: "对话引导" },
      },
      {
        id: "lounge-boundaries",
        label: "回答边界",
        preview: { section: "lounge", selector: ".lounge-chat__boundary", label: "回答边界" },
      },
    ],
  },
  conversion: {
    id: "conversion",
    label: "底部行动区",
    eyebrow: "BOTTOM CTA",
    location: "底部行动区",
    panels: [
      {
        id: "conversion-copy",
        label: "收束与行动",
        preview: { section: "footer", selector: ".site-footer__main", label: "底部行动区" },
      },
    ],
  },
  brand: {
    id: "brand",
    label: "品牌与身份",
    eyebrow: "BRAND",
    location: "全局设置 > 品牌与身份",
    panels: [
      {
        id: "brand-identity",
        label: "品牌与身份",
        preview: { section: "hero", selector: ".site-header", label: "全站品牌与身份" },
      },
    ],
  },
  navigation: {
    id: "navigation",
    label: "导航与页面",
    eyebrow: "NAVIGATION",
    location: "全局设置 > 导航与页面",
    panels: [
      {
        id: "navigation-sections",
        label: "导航与页面",
        preview: { section: "hero", selector: ".site-header", label: "顶部导航" },
      },
    ],
  },
  capabilities: {
    id: "capabilities",
    label: "共用能力维度",
    eyebrow: "CAPABILITIES",
    location: "全局设置 > 共用能力维度",
    panels: [
      {
        id: "capability-axes",
        label: "六项能力维度",
        preview: { section: "career", selector: ".career-radar-panel", label: "共用能力维度" },
      },
    ],
  },
  "site-footer": {
    id: "site-footer",
    label: "网站页脚",
    eyebrow: "SITE FOOTER",
    location: "全局设置 > 网站页脚",
    panels: [
      {
        id: "site-footer-meta",
        label: "网站页脚",
        preview: { section: "footer", selector: ".site-footer__bottom", label: "网站页脚" },
      },
    ],
  },
};

export const ADMIN_EDITOR_GROUPS: AdminEditorGroup[] = [
  {
    id: "page-content",
    label: "页面内容",
    items: [
      ADMIN_EDITOR_META.home,
      ADMIN_EDITOR_META["identity-card"],
      ADMIN_EDITOR_META.career,
      ADMIN_EDITOR_META.projects,
      ADMIN_EDITOR_META.practice,
      ADMIN_EDITOR_META.lounge,
      ADMIN_EDITOR_META.conversion,
    ],
  },
  {
    id: "global-settings",
    label: "全局设置",
    items: [
      ADMIN_EDITOR_META.brand,
      ADMIN_EDITOR_META.navigation,
      ADMIN_EDITOR_META.capabilities,
      ADMIN_EDITOR_META["site-footer"],
    ],
  },
];

export function getDefaultEditorTarget(
  editorId: AdminEditorId,
): AdminPreviewTarget {
  return ADMIN_EDITOR_META[editorId].panels[0].preview;
}
