import type { CapabilityRadar } from "@/content/types";

const CENTER = 210;
const RADIUS = 126;
const LEVELS = [1, 2, 3, 4];
const MATURITY = ["接触", "形成", "深化", "体系化"];
const AXIS_POSITIONS = [
  "top",
  "top-right",
  "bottom-right",
  "bottom",
  "bottom-left",
  "top-left",
] as const;

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
  caption?: string;
}

export function CapabilityRadar({
  axes,
  current,
  previous,
  stageLabel,
  caption = "覆盖面积代表能力成熟度增量",
}: CapabilityRadarProps) {
  const score = Math.round(
    (current.reduce((total, value) => total + value, 0) /
      (current.length * 4)) *
      100,
  );
  const previousScore = previous
    ? Math.round(
        (previous.reduce((total, value) => total + value, 0) /
          (previous.length * 4)) *
          100,
      )
    : undefined;
  const maturityIndex = Math.min(
    MATURITY.length - 1,
    Math.max(0, Math.ceil((score / 100) * 4) - 1),
  );

  return (
    <div className="capability-radar">
      <div className="capability-radar__heading">
        <div>
          <span>CAPABILITY MATRIX</span>
          <strong>{stageLabel}</strong>
        </div>
        <small>{caption}</small>
      </div>

      <div className="capability-radar__visual">
        <div className="capability-radar__chart">
          <svg
            aria-label={`${stageLabel}能力雷达：${axes.join("、")}`}
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
                const angle =
                  -Math.PI / 2 + (index * Math.PI * 2) / axes.length;
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
              const angle =
                -Math.PI / 2 + (index * Math.PI * 2) / current.length;
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
            <g
              aria-label={`综合能力指数 ${score} 分`}
              className="capability-radar__score"
              role="group"
            >
              <circle cx={CENTER} cy={CENTER} r="47" />
              <text
                className="capability-radar__score-value"
                textAnchor="middle"
                x={CENTER}
                y={CENTER + 3}
              >
                {score}
              </text>
              <text
                className="capability-radar__score-unit"
                textAnchor="middle"
                x={CENTER}
                y={CENTER + 22}
              >
                / 100 · {MATURITY[maturityIndex]}
              </text>
            </g>
          </svg>

          {axes.map((axis, index) => (
            <span
              key={axis}
              className="capability-radar__axis-label"
              data-position={AXIS_POSITIONS[index]}
            >
              <small>{String(index + 1).padStart(2, "0")}</small>
              <b>{axis}</b>
              <em>{current[index]?.toFixed(1)} / 4</em>
            </span>
          ))}
        </div>
      </div>

      <div className="capability-radar__summary">
        <span>
          当前指数 <strong>{score}</strong>
        </span>
        <span>
          阶段增量{" "}
          <strong>
            {previousScore === undefined
              ? "能力起点"
              : `+${Math.max(0, score - previousScore)}`}
          </strong>
        </span>
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
