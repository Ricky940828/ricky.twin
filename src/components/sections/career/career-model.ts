import type { CapabilityRadar } from "@/content/types";

export type InterpolatedRadar = [
  number,
  number,
  number,
  number,
  number,
  number,
];

function clampProgress(progress: number) {
  if (!Number.isFinite(progress)) {
    return 0;
  }
  return Math.min(1, Math.max(0, progress));
}

export function getStageIndex(progress: number, stageCount: number) {
  if (stageCount <= 1) {
    return 0;
  }

  const bounded = clampProgress(progress);
  return Math.min(stageCount - 1, Math.floor(bounded * stageCount));
}

export function interpolateRadar(
  previous: CapabilityRadar | InterpolatedRadar,
  current: CapabilityRadar | InterpolatedRadar,
  localProgress: number,
): InterpolatedRadar {
  const bounded = clampProgress(localProgress);
  return previous.map(
    (value, index) => value + (current[index] - value) * bounded,
  ) as InterpolatedRadar;
}

export function splitCareerProgress(progress: number, stageCount: number) {
  if (stageCount <= 1) {
    return { fromIndex: 0, toIndex: 0, localProgress: 0 };
  }

  const bounded = clampProgress(progress);
  if (bounded <= 0) {
    return { fromIndex: 0, toIndex: 0, localProgress: 0 };
  }
  if (bounded >= 1) {
    const lastIndex = stageCount - 1;
    return {
      fromIndex: lastIndex,
      toIndex: lastIndex,
      localProgress: 0,
    };
  }

  const scaled = bounded * (stageCount - 1);
  const fromIndex = Math.floor(scaled);
  return {
    fromIndex,
    toIndex: Math.min(stageCount - 1, fromIndex + 1),
    localProgress: scaled - fromIndex,
  };
}
