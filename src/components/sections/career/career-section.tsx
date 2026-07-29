"use client";

import { useRef, useState } from "react";

import type { CareerStage } from "@/content/types";
import { useIntersectionActive } from "@/hooks/use-intersection-active";

import { CapabilityRadar } from "./capability-radar";
import { CareerRoute } from "./career-route";

interface CareerSectionProps {
  stages: CareerStage[];
  axes: readonly string[];
  onNavigateProjects?: () => void;
}

export function CareerSection({
  stages,
  axes,
  onNavigateProjects,
}: CareerSectionProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const pinScopeRef = useRef<HTMLDivElement>(null);
  const { ref, active } = useIntersectionActive<HTMLElement>({
    threshold: 0.12,
  });
  const currentStage = stages[activeIndex];
  const previousStage = activeIndex > 0 ? stages[activeIndex - 1] : undefined;

  const navigateToProjects = () => {
    if (onNavigateProjects) {
      onNavigateProjects();
      return;
    }
    document
      .getElementById("projects")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  if (!currentStage) {
    return null;
  }

  return (
    <section ref={ref} className="career-section site-section" id="career">
      <div className="career-section__intro">
        <span className="eyebrow">CAREER ROUTE · CAPABILITY GROWTH</span>
        <h2 className="section-title">能力不是并列堆出来的，而是一路复合生长。</h2>
        <p className="section-copy">
          从机构与资产现场，到交易结构、系统产品，再到持牌机构的完整约束；每一段经历都扩大了同一张能力雷达的覆盖面积。
        </p>
      </div>

      <div ref={pinScopeRef} className="career-experience">
        <CareerRoute
          activeIndex={activeIndex}
          mediaActive={active}
          onNavigateProjects={navigateToProjects}
          onStageChange={setActiveIndex}
          pinScopeRef={pinScopeRef}
          stages={stages}
        />
        <aside className="career-radar-panel glass-panel">
          <CapabilityRadar
            axes={axes}
            current={currentStage.radar}
            previous={previousStage?.radar}
            stageLabel={currentStage.publicBrand}
          />
        </aside>
      </div>
    </section>
  );
}
