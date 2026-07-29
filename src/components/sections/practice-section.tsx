import {
  ArrowUpRight,
  Code2,
  Coffee,
  Route,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

import { TargetLock } from "@/components/motion/target-lock";
import type { PracticeLink } from "@/content/types";

interface PracticeSectionProps {
  links: PracticeLink[];
}

const ICONS: Record<PracticeLink["icon"], LucideIcon> = {
  route: Route,
  sparkles: Sparkles,
  coffee: Coffee,
  github: Code2,
};

export function PracticeSection({ links }: PracticeSectionProps) {
  const visibleLinks = [...links]
    .filter((item) => item.visible)
    .sort((a, b) => a.order - b.order);

  if (visibleLinks.length === 0) {
    return null;
  }

  return (
    <section className="practice-section site-section" id="practice">
      <div className="practice-section__intro">
        <span className="eyebrow">LIVE PRACTICE · BUILD IN PUBLIC</span>
        <h2 className="section-title">不只谈方法，也把想法做成正在运行的东西。</h2>
        <p className="section-copy">
          这里集中放置可访问的产品、工具和代码实践。入口与状态由后台维护，新的实践无需重写页面即可加入。
        </p>
      </div>

      <div className="practice-grid">
        {visibleLinks.map((item, index) => {
          const Icon = ICONS[item.icon];
          return (
            <TargetLock
              key={item.id}
              className="practice-card__lock"
              data-testid={`practice-card-${item.id}`}
            >
              <article className="practice-card">
                <div className="practice-card__top">
                  <span className="practice-card__icon">
                    <Icon aria-hidden size={22} />
                  </span>
                  <span
                    className={`practice-card__status is-${item.status}`}
                  >
                    <i aria-hidden="true" />
                    {item.statusLabel}
                  </span>
                </div>
                <div className="practice-card__index">
                  {String(index + 1).padStart(2, "0")}
                </div>
                <span className="practice-card__type">{item.type}</span>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
                <div className="practice-card__footer">
                  {item.href ? (
                    <a
                      aria-label={`打开 ${item.title}，在新标签页打开`}
                      href={item.href}
                      rel="noreferrer"
                      target="_blank"
                    >
                      进入实践
                      <ArrowUpRight aria-hidden size={17} />
                    </a>
                  ) : (
                    <button aria-label="即将开放" disabled type="button">
                      即将开放
                    </button>
                  )}
                  <span>{item.href ? "EXTERNAL" : "LINK PENDING"}</span>
                </div>
              </article>
            </TargetLock>
          );
        })}
      </div>
    </section>
  );
}
