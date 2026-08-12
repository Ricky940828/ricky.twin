import type {
  CapabilityRadar,
  ProjectTheme,
} from "@/content/types";

const PROJECT_CAPABILITY_DEFAULTS: Record<string, CapabilityRadar> = {
  "institution-business": [4, 4, 3, 3, 3, 2],
  "asset-fund-standardization": [3, 3, 3, 4, 3, 4],
  "self-operated-h5": [2, 2, 4, 4, 4, 3],
  "ai-fde": [2, 2, 3, 3, 4, 4],
};

const GENERIC_CAPABILITY_LEVELS: CapabilityRadar = [2, 2, 2, 2, 2, 2];

export function getProjectCapabilityLevels(
  project: Pick<ProjectTheme, "id" | "capabilityLevels">,
): CapabilityRadar {
  return [
    ...(project.capabilityLevels ??
      PROJECT_CAPABILITY_DEFAULTS[project.id] ??
      GENERIC_CAPABILITY_LEVELS),
  ] as CapabilityRadar;
}
