"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { CareerStage, SitePresentation } from "@/content/types";

import { CapabilityRadar } from "./capability-radar";
import { CareerRoute } from "./career-route";

interface CareerSectionProps {
  stages: CareerStage[];
  axes: readonly string[];
  onNavigateProjects?: () => void;
  presentation?: SitePresentation["career"];
}

export function CareerSection({
  stages,
  axes,
  onNavigateProjects,
  presentation,
}: CareerSectionProps) {
  const [activeStage, setActiveStage] = useState({
    id: stages[0]?.id ?? "",
    index: 0,
  });
  const selectedIndex = stages.findIndex(
    (stage) => stage.id === activeStage.id,
  );
  const safeActiveIndex =
    selectedIndex >= 0
      ? selectedIndex
      : Math.min(activeStage.index, Math.max(stages.length - 1, 0));
  const currentStage = stages[safeActiveIndex];
  const previousStage =
    safeActiveIndex > 0 ? stages[safeActiveIndex - 1] : undefined;
  const stagesRef = useRef(stages);
  useEffect(() => {
    stagesRef.current = stages;
  }, [stages]);

  const selectStage = useCallback((index: number) => {
    const next = stagesRef.current[index];
    if (next) {
      setActiveStage((current) =>
        current.id === next.id && current.index === index
          ? current
          : { id: next.id, index },
      );
    }
  }, []);

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
    <section className="career-section site-section" id="career">
      <div className="career-section__intro">
        <span className="eyebrow">{presentation?.eyebrow ?? "CAREER ROUTE · CAPABILITY GROWTH"}</span>
        <h2 className="section-title">{presentation?.title ?? "能力不是并列堆出来的，而是一路复合生长。"}</h2>
        <p className="section-copy">{presentation?.body ?? "从机构与资产现场，到交易结构、系统产品，再到持牌机构的完整约束；每一段经历都扩大了同一张能力雷达的覆盖面积。"}</p>
      </div>

      <div className="career-experience">
        <CareerRoute
          activeIndex={safeActiveIndex}
          onNavigateProjects={navigateToProjects}
          onStageChange={selectStage}
          presentation={presentation}
          stages={stages}
        />
        <aside className="career-radar-panel glass-panel">
          <CapabilityRadar
            axes={axes}
            current={currentStage.radar}
            previous={previousStage?.radar}
            caption={presentation?.radarCaption}
            stageLabel={currentStage.publicBrand}
          />
        </aside>
      </div>
    </section>
  );
}
