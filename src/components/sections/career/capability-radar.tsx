import type { CapabilityRadar } from "@/content/types";

const CENTER = 210;
const RADIUS = 126;
const LEVELS = [1, 2, 3, 4];
const MATURITY = ["接触", "形成", "深化", "体系化"];

function radarPoints(values: readonly number[], radius = RADIUS) {
  return values
    .map((value, index) => {
      const angle = -Math.PI / 2 + (index * Math.PI * 2) / values.length;
      const distance = radius * (value / 4);
      return `${CENTER + Math.cos(angle) * distance},${
        CENTER + Math.sin(angle) * distance
      }`;
    })
    .join(" ");
}

interface CapabilityRadarProps {
  axes: readonly string[];
  current: CapabilityRadar;
  previous?: CapabilityRadar;
  stageLabel: string;
}

export function CapabilityRadar({
  axes,
  current,
  previous,
  stageLabel,
}: CapabilityRadarProps) {
  return (
    <div className="capability-radar">
      <div className="capability-radar__heading">
        <div>
          <span>CAPABILITY MATRIX</span>
          <strong>{stageLabel}</strong>
        </div>
        <small>覆盖面积代表能力成熟度增量</small>
      </div>

      <div className="capability-radar__visual">
        <svg
          aria-label={`${stageLabel}能力雷达`}
          role="img"
          viewBox="-20 -20 460 460"
        >
          <g className="capability-radar__grid">
            {LEVELS.map((level) => (
              <polygon
                key={level}
                points={radarPoints(Array(6).fill(level), RADIUS)}
              />
            ))}
            {axes.map((axis, index) => {
              const angle = -Math.PI / 2 + (index * Math.PI * 2) / axes.length;
              const x = CENTER + Math.cos(angle) * RADIUS;
              const y = CENTER + Math.sin(angle) * RADIUS;
              return (
                <line
                  key={axis}
                  x1={CENTER}
                  x2={x}
                  y1={CENTER}
                  y2={y}
                />
              );
            })}
          </g>

          {previous ? (
            <polygon
              className="capability-radar__previous"
              points={radarPoints(previous)}
            />
          ) : null}
          <polygon
            className="capability-radar__current"
            points={radarPoints(current)}
          />
          {current.map((value, index) => {
            const angle = -Math.PI / 2 + (index * Math.PI * 2) / current.length;
            const distance = RADIUS * (value / 4);
            return (
              <circle
                key={axes[index]}
                className="capability-radar__point"
                cx={CENTER + Math.cos(angle) * distance}
                cy={CENTER + Math.sin(angle) * distance}
                r="3.5"
              />
            );
          })}
        </svg>

        <div className="capability-radar__axes">
          {axes.map((axis, index) => (
            <span key={axis}>
              <small>{String(index + 1).padStart(2, "0")}</small>
              {axis}
            </span>
          ))}
        </div>
      </div>

      <div aria-label="能力成熟度图例" className="capability-radar__legend">
        {MATURITY.map((label, index) => (
          <span key={label}>
            <i aria-hidden="true">{index + 1}</i>
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}
