import type { SiteContent } from "./types";
import { DEFAULT_IDENTITY_CARD_CONTENT } from "./identity-card";
import { DEFAULT_SITE_PRESENTATION } from "./site-presentation";

export const siteContent: SiteContent = {
  schemaVersion: 1,
  presentation: DEFAULT_SITE_PRESENTATION,
  brand: {
    name: "Ricky 会客厅",
    wordmark: "RICKY.TWIN",
    ownerName: "李富豪 / Ricky",
    location: "上海",
    onlineLabel: "数字分身在线",
  },
  hero: {
    eyebrow: "DIGITAL TWIN · SHANGHAI · ONLINE",
    title: "RICKY",
    statement: "把七年多金融产品经验，变成可以对话和调用的职业能力。",
    welcome:
      "这里是 Ricky 的 AI 会客厅，我是 Ricky 的数字分身。您可以在这里了解我的职业路径与项目经验，也可以进入 AI 会客厅与我对话，继续了解更多哦～",
    tags: [
      "金融产品经理",
      "AI 应用实战者",
      "人工智能训练师（三级）",
      "企业知识库落地咨询",
    ],
    primaryCta: "进入 AI 会客厅",
    secondaryCta: "沿职业路线认识我",
  },
  identityCard: DEFAULT_IDENTITY_CARD_CONTENT,
  sections: [
    {
      id: "hero",
      label: "首页",
      shortLabel: "首页",
      order: 1,
      enabled: true,
    },
    {
      id: "career",
      label: "职业路线",
      shortLabel: "职业",
      order: 2,
      enabled: true,
    },
    {
      id: "projects",
      label: "项目与能力",
      shortLabel: "项目",
      order: 3,
      enabled: true,
    },
    {
      id: "practice",
      label: "实践现场",
      shortLabel: "实践",
      order: 4,
      enabled: true,
    },
    {
      id: "lounge",
      label: "AI 会客厅",
      shortLabel: "AI",
      order: 5,
      enabled: true,
    },
  ],
  capabilityAxes: [
    "机构与资产评估",
    "交易结构设计与盈利模型测算",
    "金融产品方案设计与跨部门协同",
    "业务规则系统化与 PRD 落地",
    "项目上线运营与数据经营分析",
    "标准化沉淀与 AI 赋能",
  ],
  career: [
    {
      id: "dianrong",
      publicBrand: "点融网",
      period: "2016.11 — 2021.02",
      role: "高级产品运营经理",
      positioning: "从业务现场建立机构、资产与运营判断力",
      highlights: [
        "参与机构准入、资产尽调、协议、接口与贷后运营，建立对合作现场的真实感知。",
        "从数据分母、账龄、观察窗与回收过程判断资产表现，不被单一指标带走。",
        "理解协议和接口完成并不等于项目可运行，还需打通对账、代偿、回款与异常处理。",
        "开始把材料缺口还原为治理、系统、数据或合作成熟度问题。",
      ],
      radar: [3, 1, 1, 1, 2, 1],
      nextStageId: "haibei",
    },
    {
      id: "haibei",
      publicBrand: "还呗",
      period: "2021.03 — 2022.12",
      role: "高级产品经理",
      positioning: "从业务理解进入交易结构与经济判断",
      highlights: [
        "把资金方条件、资产特征、风险承担和收益分配放进同一套合作模型。",
        "从还款计划、现金流、IRR 与分润机制识别真实资金成本和盈利边界。",
        "比较不同合作结构的规模空间、风险责任与落地复杂度。",
        "将商务条件转成可计算、可讨论、可调整的金融产品机制。",
      ],
      radar: [3, 4, 3, 2, 2, 2],
      nextStageId: "xiaoxiang",
    },
    {
      id: "xiaoxiang",
      publicBrand: "小象优品",
      period: "阶段性项目实践",
      role: "信贷技术产品与平台实践",
      positioning: "把金融业务规则转成系统产品与平台能力",
      highlights: [
        "将业务 SOP 转为产品主数据、流程、字段、状态、接口和验收规则。",
        "系统考虑失败、超时、重复、乱序、补偿、对账与人工兜底。",
        "打通业务端、中台、风控、账务、支付、协议、贷后与数据之间的一致解释。",
        "识别项目差异与平台共性，沉淀产品中心、路由和配置化能力。",
      ],
      radar: [3, 4, 4, 4, 3, 3],
      nextStageId: "haier",
    },
    {
      id: "haier",
      publicBrand: "海尔消费金融",
      period: "2023.04 — 至今",
      role: "金融产品经理",
      positioning: "在持牌机构约束下形成端到端产品落地能力",
      highlights: [
        "统一考虑资产、资金、产品、系统、协议、消保、贷后、财务与经营结果。",
        "把交易结构和盈利判断转成可开发、可验收、可运营的完整产品方案。",
        "组织多部门与外部机构在复杂约束下形成决策并推动项目上线。",
        "将项目经验沉淀为标准方案、差异矩阵、产品要素和 AI 可调用的知识资产。",
      ],
      radar: [4, 4, 4, 4, 4, 4],
    },
  ],
  projects: [
    {
      id: "institution-business",
      eyebrow: "INSTITUTION BUSINESS",
      title: "机构业务商业判断与产品落地",
      summary:
        "把模糊的合作机会，推进为主体清楚、经济成立、产品完整且能够持续经营的机构业务。",
      capabilityLevels: [4, 4, 3, 3, 3, 2],
      solutionPath: [
        {
          label: "业务问题",
          content: "合作方、资产、资金和增信条件分散，表面需求无法直接回答是否值得推进。",
        },
        {
          label: "核心判断",
          content: "先识别主体与资产质量，再将风险责任、收益分配和落地约束放进同一结构。",
        },
        {
          label: "解决路径",
          content: "完成尽调与缺口判断、交易结构设计、盈利测算、产品机制编排和跨部门落地。",
        },
        {
          label: "抽象成果",
          content: "形成从机会识别到持续经营的机构业务端到端判断链。",
        },
      ],
      tags: ["机构评估", "交易结构", "盈利测算", "产品落地"],
      cases: [
        {
          title: "多模式机构合作评估",
          summary: "统一比较不同合作模式的风险、收益、系统与运营条件。",
        },
      ],
      published: true,
      featured: true,
      order: 1,
    },
    {
      id: "asset-fund-standardization",
      eyebrow: "ASSET × FUND",
      title: "资产资金标准化",
      summary:
        "把多机构、多资产与多资金条件拆成标准项、差异项和配置项，减少重复对接与重复建设。",
      capabilityLevels: [3, 3, 3, 4, 3, 4],
      solutionPath: [
        {
          label: "业务问题",
          content: "每个项目表述不同、材料不同、接口不同，容易让团队反复从头梳理。",
        },
        {
          label: "核心判断",
          content: "变化的是合作参数，不变的是主体、产品要素、资金路由与全生命周期约束。",
        },
        {
          label: "解决路径",
          content: "建立标准方案、差异矩阵、要素表、接口规范与配置化路由。",
        },
        {
          label: "抽象成果",
          content: "将一次性资产资金对接升级为可扩展、可复用的平台能力。",
        },
      ],
      tags: ["资产对接", "资金路由", "开放平台", "标准化"],
      cases: [
        {
          title: "资金路由与资产开放能力",
          summary: "让新增合作优先复用既有主数据、规则和接口能力。",
        },
      ],
      published: true,
      featured: true,
      order: 2,
    },
    {
      id: "self-operated-h5",
      eyebrow: "H5 CREDIT PRODUCT",
      title: "自营 H5 信贷产品落地",
      summary:
        "从客户旅程出发，把授信、支用、合同、放款、还款和贷后组织成真正可用的自营产品。",
      capabilityLevels: [2, 2, 4, 4, 4, 3],
      solutionPath: [
        {
          label: "业务问题",
          content: "多方规则要同时落在客户页面、后台流程、协议、数据和运营动作中。",
        },
        {
          label: "核心判断",
          content: "前台体验必须与授信规则、账户状态、资金动作和持牌合规保持一致。",
        },
        {
          label: "解决路径",
          content: "按全生命周期编排页面、流程、字段、状态、异常、PRD 与验收标准。",
        },
        {
          label: "抽象成果",
          content: "形成从业务方案到系统上线与首批运营验证的闭环交付方法。",
        },
      ],
      tags: ["H5", "信贷全流程", "PRD", "消保与合规"],
      cases: [
        {
          title: "融担 H5 自营产品",
          summary: "以持牌机构要求统筹产品体验、业务规则与多方协同。",
        },
      ],
      published: true,
      featured: true,
      order: 3,
    },
    {
      id: "ai-fde",
      eyebrow: "AI × KNOWLEDGE × FDE",
      title: "AI 知识资产化与 FDE 实践",
      summary:
        "把历史材料、业务方法与真实流程变成可检索、可调用、可验证的知识和 AI 应用。",
      capabilityLevels: [2, 2, 3, 3, 4, 4],
      solutionPath: [
        {
          label: "业务问题",
          content: "文件很多但知识分散，AI 能找到材料，却难以稳定复现专业判断与执行路径。",
        },
        {
          label: "核心判断",
          content: "先萃取知识、方法和能力，再以权限、检索、工具和验收机制支撑实际应用。",
        },
        {
          label: "解决路径",
          content: "构建证据资产、能力单元与方法论，并通过 CRM、模拟工作台和工具站验证。",
        },
        {
          label: "抽象成果",
          content: "形成从业务理解到 Demo、PoC 和持续迭代的 FDE 式交付能力。",
        },
      ],
      tags: ["知识资产", "RAG", "Agent", "FDE"],
      cases: [
        {
          title: "工作影分身",
          summary: "将多年工作材料整理为知识、方法、能力和可追溯证据。",
        },
        {
          title: "业务流程 AI 化",
          summary: "以真实日常流程验证 AI 方案是否可执行、可验收。",
        },
      ],
      published: true,
      featured: true,
      order: 4,
    },
  ],
  practice: [
    {
      id: "api-center",
      title: "AI Token 中转站",
      description: "面向 AI 应用实践的模型接口与 Token 运营验证。",
      type: "AI INFRA",
      status: "online",
      statusLabel: "在线",
      icon: "route",
      href: "https://api.aicenter.net.cn",
      featured: true,
      visible: true,
      order: 1,
    },
    {
      id: "aigc-studio",
      title: "AIGC 工具站",
      description: "把常用生成式 AI 工作流组合成可直接使用的工具入口。",
      type: "AI TOOLBOX",
      status: "building",
      statusLabel: "建设中",
      icon: "sparkles",
      featured: true,
      visible: true,
      order: 2,
    },
    {
      id: "coffee-console",
      title: "咖啡操作台",
      description: "围绕咖啡拼配、烘焙、冲煮与配方档案的产品模拟实践。",
      type: "PRODUCT LAB",
      status: "building",
      statusLabel: "迭代中",
      icon: "coffee",
      featured: true,
      visible: true,
      order: 3,
    },
    {
      id: "github",
      title: "GitHub",
      description: "查看公开代码、产品原型与持续实践记录。",
      type: "CODE",
      status: "planned",
      statusLabel: "待配置",
      icon: "github",
      featured: true,
      visible: true,
      order: 4,
    },
  ],
  lounge: {
    eyebrow: "AI RECEPTION · RAG READY",
    title: "和 Ricky 的数字分身聊聊",
    intro:
      "从公开职业资料开始对话；需要更深的知识范围时，我会说明边界并引导您申请权限。",
    inputPlaceholder: "输入你想了解的问题…",
    sendLabel: "发送问题",
    quickQuestions: [
      "你如何判断一个机构合作是否值得推进？",
      "你的金融能力如何使用 AI 解决方案实际应用？",
      "如何拆解业务，并将 AI 赋能到企业日常流程，形成可执行、可验收的产品方案？",
      "企业知识库为什么不只是把文件上传进去？",
    ],
    knowledge: [
      {
        id: "career-public",
        name: "职业路径与公开项目",
        description: "职业阶段、公开项目主题与实践信息。",
        access: "public",
        accessLabel: "公开",
        ragEnabled: true,
      },
      {
        id: "finance-authorized",
        name: "金融产品与机构业务",
        description: "能力方法、业务判断与经脱敏的案例知识。",
        access: "request",
        accessLabel: "需申请",
        ragEnabled: true,
      },
      {
        id: "ai-practice",
        name: "AI 应用与知识资产化",
        description: "知识库、Agent、FDE 与个人生产力实践。",
        access: "available",
        accessLabel: "可访问",
        ragEnabled: true,
      },
    ],
    boundaries: [
      "主要回答职业能力、金融产品、机构信贷和 AI 应用。",
      "私密材料不会直接展示，可在登录后申请对应知识权限。",
      "不替 Ricky 作出合作承诺、报价或未经确认的个人立场。",
      "证据不足时明确说明，并在适合时引导进一步沟通。",
    ],
  },
  footer: {
    headline: "想继续了解，欢迎坐下来聊聊。",
    body: "可以先与数字分身交流，也可以留下联系方式，进一步讨论合作、岗位或 AI 实践。",
    primaryCta: "进入 AI 会客厅",
    secondaryCta: "留下联系方式",
  },
};
