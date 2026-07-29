import type { SiteContent } from "@/content/types";

function clean(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

export function buildPublicProfile(
  content: SiteContent,
  maxChars = 5_000,
) {
  const lines: string[] = [
    `网站：${content.brand.name}`,
    `本人：${content.brand.ownerName}｜${content.brand.location}`,
    `首页主张：${clean(content.hero.statement)}`,
    `公开介绍：${clean(content.hero.welcome)}`,
    `身份标签：${content.hero.tags.map(clean).join("、")}`,
  ];

  for (const stage of content.career) {
    lines.push(
      `职业阶段：${stage.publicBrand}｜${stage.period}｜${stage.role}`,
      `阶段定位：${clean(stage.positioning)}`,
      `重点工作：${stage.highlights.map(clean).join("；")}`,
    );
  }

  for (const project of content.projects
    .filter((item) => item.published)
    .sort((left, right) => left.order - right.order)) {
    lines.push(
      `公开项目：${project.title}`,
      `项目摘要：${clean(project.summary)}`,
      `解题路径：${project.solutionPath
        .map((step) => `${step.label}：${clean(step.content)}`)
        .join("；")}`,
    );
  }

  return lines.join("\n").slice(0, Math.max(1, maxChars));
}
