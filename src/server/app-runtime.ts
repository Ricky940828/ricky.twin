import packageJson from "../../package.json";

export type RuntimeEnvironment = "development" | "production";

type RuntimeEnvironmentVariables = Record<string, string | undefined>;

export interface ApplicationRuntime {
  version: string;
  commit: string;
  environment: RuntimeEnvironment;
}

export function resolveApplicationRuntime(
  environmentVariables: RuntimeEnvironmentVariables = process.env,
): ApplicationRuntime {
  return {
    version:
      environmentVariables.RICKY_APP_VERSION?.trim() || packageJson.version,
    commit:
      environmentVariables.RICKY_BUILD_COMMIT?.trim() || "development",
    environment:
      environmentVariables.NODE_ENV === "development"
        ? "development"
        : "production",
  };
}
