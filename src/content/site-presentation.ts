import type { SitePresentation } from "./types";

export const DEFAULT_SITE_PRESENTATION: SitePresentation = {
  headerCta: "进入 AI 会客厅",
  heroProof: [
    { value: "7年+", label: "信贷行业" },
    { value: "4段", label: "职业路线" },
    { value: "复合", label: "金融 × AI" },
  ],
  heroPracticeEyebrow: "LIVE PRACTICE",
  heroPracticeLabel: "实践入口",
  heroScrollHint: "SCROLL TO WALK THE CAREER ROUTE",
  career: {
    eyebrow: "CAREER ROUTE · CAPABILITY GROWTH",
    title: "能力不是并列堆出来的，而是一路复合生长。",
    body: "从机构与资产现场，到交易结构、系统产品，再到持牌机构的完整约束；每一段经历都扩大了同一张能力雷达的覆盖面积。",
    nextStagePrefix: "下一站：",
    projectsCta: "查看代表项目 →",
    radarCaption: "覆盖面积代表能力成熟度增量",
  },
  projects: {
    eyebrow: "SELECTED WORK · PROBLEM SOLVING",
    title: "项目不是清单，而是能力如何解决问题。",
    body: "向下滚动或拖动卡片切换项目主题，右侧同步点亮这个项目调用的能力组合。",
    activeCardCta: "查看项目完整说明",
    inactiveCardCta: "切换到这个项目",
    detailCta: "查看项目完整说明",
    mapEyebrow: "LIVE CAPABILITY MAP",
    mapCaption: "当前项目调用的能力正在联动点亮",
    mapCore: "项目能力\n调用",
  },
  practice: {
    eyebrow: "LIVE PRACTICE · BUILD IN PUBLIC",
    title: "不只谈方法，也把想法做成正在运行的东西。",
    body: "这里集中放置可访问的产品、工具和代码实践。入口与状态由后台维护，新的实践无需重写页面即可加入。",
    openCta: "进入实践",
    pendingCta: "即将开放",
  },
  lounge: {
    displayTitle: "AI 会客厅",
    onlineLabel: "数字分身在线",
    visitorLabel: "当前访客：匿名",
    statusHint: "知识范围与权限由后台配置",
    chatTitle: "Ricky 数字接待台",
    boundary: "不作合作承诺、不报价；私密材料需登录后申请权限。",
  },
  footer: {
    eyebrow: "THE CONVERSATION CAN CONTINUE",
    bottomNote: "公开内容由结构化配置生成",
  },
};

export function getSitePresentation(
  presentation?: SitePresentation,
): SitePresentation {
  return presentation ?? DEFAULT_SITE_PRESENTATION;
}
