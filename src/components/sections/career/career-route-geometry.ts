export const CAREER_ROUTE_VIEWBOX = {
  width: 760,
  height: 360,
} as const;

export interface CareerRoutePoint {
  x: number;
  y: number;
}

function clamp(value: number) {
  return Math.min(1, Math.max(0, value));
}

export function getCareerRoutePoint(progress: number): CareerRoutePoint {
  const bounded = clamp(progress);
  return {
    x: 58 + bounded * 644,
    y: 210 + Math.cos(bounded * Math.PI * 3) * 32,
  };
}

export function getCareerNodePositions(count: number) {
  if (count <= 1) {
    return [getCareerRoutePoint(0.5)];
  }

  return Array.from({ length: count }, (_, index) =>
    getCareerRoutePoint(index / (count - 1)),
  );
}

export function getCareerRoutePath(sampleCount = 64) {
  const samples = Math.max(8, sampleCount);
  return Array.from({ length: samples + 1 }, (_, index) => {
    const point = getCareerRoutePoint(index / samples);
    return `${index === 0 ? "M" : "L"}${point.x.toFixed(2)} ${point.y.toFixed(2)}`;
  }).join(" ");
}
