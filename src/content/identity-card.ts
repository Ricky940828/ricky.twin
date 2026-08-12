import type { IdentityCardContent } from "./types";

export const DEFAULT_IDENTITY_CARD_CONTENT: IdentityCardContent = {
  front: {
    eyebrow: "LI FUHAO / DIGITAL ID 0717",
    name: "李富豪 · Ricky",
    role: "金融产品经理 / AI 应用实战者 / 上海",
    summary:
      "7年+信贷行业经验，擅长机构资金资产对接、交易结构、信贷全流程产品设计与落地；正在将历史工作资产转化为可验证、可迁移的数字分身。",
    tags: ["机构信贷", "产品设计", "项目落地", "AI 应用"],
    primaryCta: "进入 AI 会客厅",
    secondaryCta: "查看职业路线",
    flipToBack: "翻到背面：知识与权限",
  },
  back: {
    eyebrow: "KNOWLEDGE ACCESS",
    title: "知识与访问权限",
    statusLabel: "RAG READY",
    footerEyebrow: "PUBLIC PROFILE / CONTROLLED KNOWLEDGE",
    footerBody:
      "深度内容会根据访客身份与授权范围检索，不公开真实文件路径。",
    flipToFront: "翻回正面：个人身份",
  },
  closeLabel: "关闭",
};

export function getIdentityCardContent(
  content?: IdentityCardContent,
): IdentityCardContent {
  return structuredClone(content ?? DEFAULT_IDENTITY_CARD_CONTENT);
}
