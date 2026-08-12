import type { CSSProperties } from "react";

import type { ProjectTheme, SitePresentation } from "@/content/types";
import { getProjectCapabilityLevels } from "@/lib/project-capabilities";

const NODE_POSITIONS = [
  { x: 50, y: 9 },
  { x: 84, y: 28 },
  { x: 84, y: 70 },
  { x: 50, y: 91 },
  { x: 16, y: 70 },
  { x: 16, y: 28 },
] as const;

interface ProjectCapabilityMapProps {
  axes: readonly string[];
  project: ProjectTheme;
  activeIndex: number;
  total: number;
  presentation?: SitePresentation["projects"];
}

export function ProjectCapabilityMap({
  axes,
  project,
  activeIndex,
  total,
  presentation,
}: ProjectCapabilityMapProps) {
  const levels = getProjectCapabilityLevels(project);
  const strongCapabilityCount = levels.filter((level) => level >= 3).length;

  return (
    <aside
      key={project.id}
      aria-live="polite"
      className="project-capability-map glass-panel"
    >
      <div className="project-capability-map__heading">
        <span>{presentation?.mapEyebrow ?? "LIVE CAPABILITY MAP"}</span>
        <h3>{project.title}</h3>
        <p>{presentation?.mapCaption ?? "当前项目调用的能力正在联动点亮"}</p>
      </div>

      <div className="project-capability-map__graph">
        <svg aria-hidden="true" viewBox="0 0 100 100">
          {NODE_POSITIONS.map((position, index) => (
            <line
              key={axes[index]}
              data-level={levels[index]}
              x1="50"
              x2={position.x}
              y1="50"
              y2={position.y}
            />
          ))}
        </svg>
        <div className="project-capability-map__core">
          {(presentation?.mapCore ?? "项目能力\n调用")
            .split("\n")
            .map((line, index) => (
              <span key={`${line}-${index}`}>
                {index > 0 ? <br /> : null}
                {line}
              </span>
            ))}
        </div>
        {axes.map((axis, index) => (
          <div
            key={axis}
            className="project-capability-map__node"
            data-level={levels[index]}
            style={
              {
                "--capability-level": levels[index],
                left: `${NODE_POSITIONS[index].x}%`,
                top: `${NODE_POSITIONS[index].y}%`,
              } as CSSProperties
            }
            title={`${axis} · ${levels[index]}级`}
          >
            <small>{String(index + 1).padStart(2, "0")}</small>
            <span>{axis}</span>
          </div>
        ))}
      </div>

      <div className="project-capability-map__summary">
        <span>
          项目{" "}
          <b>
            {String(activeIndex + 1).padStart(2, "0")} /{" "}
            {String(total).padStart(2, "0")}
          </b>
        </span>
        <span>
          深度调用 <b>{strongCapabilityCount}</b> 项能力
        </span>
      </div>
    </aside>
  );
}
