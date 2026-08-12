import type {
  KnowledgeAccess,
  PracticeLink,
  PracticeStatus,
  ProjectPathLabel,
  SiteContent,
  SiteSectionId,
} from "@/content/types";
import { getIdentityCardContent } from "@/content/identity-card";
import { getProjectCapabilityLevels } from "@/lib/project-capabilities";

export interface ValidationIssue {
  path: string;
  message: string;
}

export type ValidationResult =
  | { ok: true; value: SiteContent }
  | { ok: false; issues: ValidationIssue[] };

const REQUIRED_SECTIONS: SiteSectionId[] = [
  "hero",
  "career",
  "projects",
  "practice",
  "lounge",
];

const PROJECT_PATH_LABELS: ProjectPathLabel[] = [
  "业务问题",
  "核心判断",
  "解决路径",
  "抽象成果",
];

const PRACTICE_STATUSES: PracticeStatus[] = [
  "online",
  "building",
  "planned",
];

const PRACTICE_ICONS: PracticeLink["icon"][] = [
  "route",
  "sparkles",
  "coffee",
  "github",
];

const KNOWLEDGE_ACCESS: KnowledgeAccess[] = [
  "public",
  "available",
  "request",
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireRecord(
  value: unknown,
  path: string,
  issues: ValidationIssue[],
): Record<string, unknown> | undefined {
  if (!isRecord(value)) {
    issues.push({ path, message: "必须是对象" });
    return undefined;
  }
  return value;
}

function requireString(
  value: unknown,
  path: string,
  issues: ValidationIssue[],
) {
  if (typeof value !== "string" || value.trim().length === 0) {
    issues.push({ path, message: "必须填写文本" });
    return false;
  }
  return true;
}

function requireBoolean(
  value: unknown,
  path: string,
  issues: ValidationIssue[],
) {
  if (typeof value !== "boolean") {
    issues.push({ path, message: "必须是开关值" });
    return false;
  }
  return true;
}

function requireInteger(
  value: unknown,
  path: string,
  issues: ValidationIssue[],
) {
  if (!Number.isInteger(value)) {
    issues.push({ path, message: "必须是整数" });
    return false;
  }
  return true;
}

function requireStringArray(
  value: unknown,
  path: string,
  issues: ValidationIssue[],
  minimum = 0,
) {
  if (!Array.isArray(value)) {
    issues.push({ path, message: "必须是文本列表" });
    return;
  }
  if (value.length < minimum) {
    issues.push({ path, message: `至少需要 ${minimum} 项` });
  }
  value.forEach((item, index) =>
    requireString(item, `${path}[${index}]`, issues),
  );
}

function validateBrand(value: unknown, issues: ValidationIssue[]) {
  const brand = requireRecord(value, "brand", issues);
  if (!brand) {
    return;
  }
  ["name", "wordmark", "ownerName", "location", "onlineLabel"].forEach(
    (field) => requireString(brand[field], `brand.${field}`, issues),
  );
}

function validateHero(value: unknown, issues: ValidationIssue[]) {
  const hero = requireRecord(value, "hero", issues);
  if (!hero) {
    return;
  }
  [
    "eyebrow",
    "title",
    "statement",
    "welcome",
    "primaryCta",
    "secondaryCta",
  ].forEach((field) => requireString(hero[field], `hero.${field}`, issues));
  requireStringArray(hero.tags, "hero.tags", issues, 1);
}

function validateIdentityCard(
  value: unknown,
  issues: ValidationIssue[],
) {
  if (value === undefined) {
    return;
  }
  const identityCard = requireRecord(value, "identityCard", issues);
  if (!identityCard) {
    return;
  }
  const front = requireRecord(
    identityCard.front,
    "identityCard.front",
    issues,
  );
  if (front) {
    [
      "eyebrow",
      "name",
      "role",
      "summary",
      "primaryCta",
      "secondaryCta",
      "flipToBack",
    ].forEach((field) =>
      requireString(front[field], `identityCard.front.${field}`, issues),
    );
    requireStringArray(front.tags, "identityCard.front.tags", issues, 1);
  }

  const back = requireRecord(
    identityCard.back,
    "identityCard.back",
    issues,
  );
  if (back) {
    [
      "eyebrow",
      "title",
      "statusLabel",
      "footerEyebrow",
      "footerBody",
      "flipToFront",
    ].forEach((field) =>
      requireString(back[field], `identityCard.back.${field}`, issues),
    );
  }
  requireString(identityCard.closeLabel, "identityCard.closeLabel", issues);
}

function validateSections(value: unknown, issues: ValidationIssue[]) {
  if (!Array.isArray(value)) {
    issues.push({ path: "sections", message: "必须是板块列表" });
    return;
  }

  const seenIds = new Set<string>();
  const seenOrders = new Set<number>();
  value.forEach((item, index) => {
    const path = `sections[${index}]`;
    const section = requireRecord(item, path, issues);
    if (!section) {
      return;
    }
    if (
      typeof section.id !== "string" ||
      !REQUIRED_SECTIONS.includes(section.id as SiteSectionId)
    ) {
      issues.push({ path: `${path}.id`, message: "不是受支持的板块" });
    } else if (seenIds.has(section.id)) {
      issues.push({ path: `${path}.id`, message: "板块不能重复" });
    } else {
      seenIds.add(section.id);
    }
    ["label", "shortLabel"].forEach((field) =>
      requireString(section[field], `${path}.${field}`, issues),
    );
    if (requireInteger(section.order, `${path}.order`, issues)) {
      const order = section.order as number;
      if (seenOrders.has(order)) {
        issues.push({
          path: `${path}.order`,
          message: "板块顺序不能重复",
        });
      }
      seenOrders.add(order);
    }
    requireBoolean(section.enabled, `${path}.enabled`, issues);
  });

  REQUIRED_SECTIONS.forEach((section) => {
    if (!seenIds.has(section)) {
      issues.push({
        path: "sections",
        message: `缺少必需板块：${section}`,
      });
    }
  });
}

function validateCapabilityAxes(value: unknown, issues: ValidationIssue[]) {
  if (!Array.isArray(value) || value.length !== 6) {
    issues.push({
      path: "capabilityAxes",
      message: "能力雷达必须固定为 6 个维度",
    });
    return;
  }
  value.forEach((axis, index) =>
    requireString(axis, `capabilityAxes[${index}]`, issues),
  );
}

function validateCareer(value: unknown, issues: ValidationIssue[]) {
  if (!Array.isArray(value) || value.length === 0) {
    issues.push({ path: "career", message: "至少需要一个职业阶段" });
    return;
  }
  const ids = new Set<string>();
  value.forEach((item, index) => {
    const path = `career[${index}]`;
    const stage = requireRecord(item, path, issues);
    if (!stage) {
      return;
    }
    ["id", "publicBrand", "period", "role", "positioning"].forEach((field) =>
      requireString(stage[field], `${path}.${field}`, issues),
    );
    if (typeof stage.id === "string") {
      if (ids.has(stage.id)) {
        issues.push({ path: `${path}.id`, message: "职业阶段 ID 不能重复" });
      }
      ids.add(stage.id);
    }
    if (stage.nextStageId !== undefined) {
      requireString(stage.nextStageId, `${path}.nextStageId`, issues);
    }
    requireStringArray(stage.highlights, `${path}.highlights`, issues, 1);
    if (!Array.isArray(stage.radar) || stage.radar.length !== 6) {
      issues.push({
        path: `${path}.radar`,
        message: "每个职业阶段必须配置 6 个能力等级",
      });
      return;
    }
    stage.radar.forEach((level, radarIndex) => {
      if (
        !Number.isInteger(level) ||
        (level as number) < 1 ||
        (level as number) > 4
      ) {
        issues.push({
          path: `${path}.radar[${radarIndex}]`,
          message: "能力等级必须是 1 到 4 的整数",
        });
      }
    });
  });
}

function validateProjects(value: unknown, issues: ValidationIssue[]) {
  if (!Array.isArray(value)) {
    issues.push({ path: "projects", message: "必须是项目主题列表" });
    return;
  }
  const ids = new Set<string>();
  const orders = new Set<number>();
  value.forEach((item, index) => {
    const path = `projects[${index}]`;
    const project = requireRecord(item, path, issues);
    if (!project) {
      return;
    }
    ["id", "eyebrow", "title", "summary"].forEach((field) =>
      requireString(project[field], `${path}.${field}`, issues),
    );
    if (typeof project.id === "string") {
      if (ids.has(project.id)) {
        issues.push({ path: `${path}.id`, message: "项目 ID 不能重复" });
      }
      ids.add(project.id);
    }
    requireBoolean(project.published, `${path}.published`, issues);
    requireBoolean(project.featured, `${path}.featured`, issues);
    if (requireInteger(project.order, `${path}.order`, issues)) {
      const order = project.order as number;
      if (orders.has(order)) {
        issues.push({ path: `${path}.order`, message: "项目顺序不能重复" });
      }
      orders.add(order);
    }
    requireStringArray(project.tags, `${path}.tags`, issues, 1);
    if (project.capabilityLevels !== undefined) {
      if (
        !Array.isArray(project.capabilityLevels) ||
        project.capabilityLevels.length !== 6
      ) {
        issues.push({
          path: `${path}.capabilityLevels`,
          message: "项目调用能力必须配置 6 个等级",
        });
      } else {
        project.capabilityLevels.forEach((level, capabilityIndex) => {
          if (
            !Number.isInteger(level) ||
            (level as number) < 1 ||
            (level as number) > 4
          ) {
            issues.push({
              path: `${path}.capabilityLevels[${capabilityIndex}]`,
              message: "项目能力等级必须是 1 到 4 的整数",
            });
          }
        });
      }
    }

    if (!Array.isArray(project.solutionPath) || project.solutionPath.length !== 4) {
      issues.push({
        path: `${path}.solutionPath`,
        message: "项目解题路径必须包含 4 个固定步骤",
      });
    } else {
      project.solutionPath.forEach((stepValue, stepIndex) => {
        const stepPath = `${path}.solutionPath[${stepIndex}]`;
        const step = requireRecord(stepValue, stepPath, issues);
        if (!step) {
          return;
        }
        if (step.label !== PROJECT_PATH_LABELS[stepIndex]) {
          issues.push({
            path: `${stepPath}.label`,
            message: `第 ${stepIndex + 1} 步必须是“${PROJECT_PATH_LABELS[stepIndex]}”`,
          });
        }
        requireString(step.content, `${stepPath}.content`, issues);
      });
    }

    if (!Array.isArray(project.cases)) {
      issues.push({ path: `${path}.cases`, message: "必须是案例列表" });
    } else {
      project.cases.forEach((caseValue, caseIndex) => {
        const casePath = `${path}.cases[${caseIndex}]`;
        const projectCase = requireRecord(caseValue, casePath, issues);
        if (!projectCase) {
          return;
        }
        requireString(projectCase.title, `${casePath}.title`, issues);
        requireString(projectCase.summary, `${casePath}.summary`, issues);
      });
    }
  });
}

function validatePractice(value: unknown, issues: ValidationIssue[]) {
  if (!Array.isArray(value)) {
    issues.push({ path: "practice", message: "必须是实践入口列表" });
    return;
  }
  const ids = new Set<string>();
  const orders = new Set<number>();
  value.forEach((item, index) => {
    const path = `practice[${index}]`;
    const practice = requireRecord(item, path, issues);
    if (!practice) {
      return;
    }
    ["id", "title", "description", "type", "statusLabel"].forEach((field) =>
      requireString(practice[field], `${path}.${field}`, issues),
    );
    if (typeof practice.id === "string") {
      if (ids.has(practice.id)) {
        issues.push({ path: `${path}.id`, message: "实践入口 ID 不能重复" });
      }
      ids.add(practice.id);
    }
    if (
      typeof practice.status !== "string" ||
      !PRACTICE_STATUSES.includes(practice.status as PracticeStatus)
    ) {
      issues.push({ path: `${path}.status`, message: "不是受支持的实践状态" });
    }
    if (
      typeof practice.icon !== "string" ||
      !PRACTICE_ICONS.includes(practice.icon as PracticeLink["icon"])
    ) {
      issues.push({ path: `${path}.icon`, message: "不是受支持的入口图标" });
    }
    if (practice.href !== undefined && typeof practice.href !== "string") {
      issues.push({ path: `${path}.href`, message: "链接必须是文本" });
    }
    requireBoolean(practice.featured, `${path}.featured`, issues);
    requireBoolean(practice.visible, `${path}.visible`, issues);
    if (requireInteger(practice.order, `${path}.order`, issues)) {
      const order = practice.order as number;
      if (orders.has(order)) {
        issues.push({ path: `${path}.order`, message: "实践顺序不能重复" });
      }
      orders.add(order);
    }
  });
}

function validateLounge(value: unknown, issues: ValidationIssue[]) {
  const lounge = requireRecord(value, "lounge", issues);
  if (!lounge) {
    return;
  }
  ["eyebrow", "title", "intro", "inputPlaceholder", "sendLabel"].forEach(
    (field) => requireString(lounge[field], `lounge.${field}`, issues),
  );
  requireStringArray(
    lounge.quickQuestions,
    "lounge.quickQuestions",
    issues,
    1,
  );
  requireStringArray(lounge.boundaries, "lounge.boundaries", issues, 1);

  if (!Array.isArray(lounge.knowledge)) {
    issues.push({ path: "lounge.knowledge", message: "必须是知识库列表" });
    return;
  }
  const ids = new Set<string>();
  lounge.knowledge.forEach((item, index) => {
    const path = `lounge.knowledge[${index}]`;
    const knowledge = requireRecord(item, path, issues);
    if (!knowledge) {
      return;
    }
    ["id", "name", "description", "accessLabel"].forEach((field) =>
      requireString(knowledge[field], `${path}.${field}`, issues),
    );
    if (typeof knowledge.id === "string") {
      if (ids.has(knowledge.id)) {
        issues.push({ path: `${path}.id`, message: "知识库 ID 不能重复" });
      }
      ids.add(knowledge.id);
    }
    if (
      typeof knowledge.access !== "string" ||
      !KNOWLEDGE_ACCESS.includes(knowledge.access as KnowledgeAccess)
    ) {
      issues.push({ path: `${path}.access`, message: "不是受支持的访问级别" });
    }
    requireBoolean(knowledge.ragEnabled, `${path}.ragEnabled`, issues);
  });
}

function validateFooter(value: unknown, issues: ValidationIssue[]) {
  const footer = requireRecord(value, "footer", issues);
  if (!footer) {
    return;
  }
  ["headline", "body", "primaryCta", "secondaryCta"].forEach((field) =>
    requireString(footer[field], `footer.${field}`, issues),
  );
}

export function cloneSiteContent(content: SiteContent): SiteContent {
  return structuredClone(content);
}

export function validateSiteContent(value: unknown): ValidationResult {
  const issues: ValidationIssue[] = [];
  const root = requireRecord(value, "site", issues);
  if (!root) {
    return { ok: false, issues };
  }

  if (
    !Number.isInteger(root.schemaVersion) ||
    (root.schemaVersion as number) < 1
  ) {
    issues.push({
      path: "schemaVersion",
      message: "内容协议版本必须是正整数",
    });
  }

  validateBrand(root.brand, issues);
  validateHero(root.hero, issues);
  validateIdentityCard(root.identityCard, issues);
  validateSections(root.sections, issues);
  validateCapabilityAxes(root.capabilityAxes, issues);
  validateCareer(root.career, issues);
  validateProjects(root.projects, issues);
  validatePractice(root.practice, issues);
  validateLounge(root.lounge, issues);
  validateFooter(root.footer, issues);

  if (issues.length > 0) {
    return { ok: false, issues };
  }

  const content = cloneSiteContent(value as SiteContent);
  content.identityCard = getIdentityCardContent(content.identityCard);
  content.projects = content.projects.map((project) => ({
    ...project,
    capabilityLevels: getProjectCapabilityLevels(project),
  }));

  return {
    ok: true,
    value: content,
  };
}
