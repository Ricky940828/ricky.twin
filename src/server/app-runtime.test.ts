import { describe, expect, it } from "vitest";

import { resolveApplicationRuntime } from "./app-runtime";

describe("application runtime metadata", () => {
  it("uses the package version when local development has no injected build metadata", () => {
    expect(
      resolveApplicationRuntime({ NODE_ENV: "development" }),
    ).toEqual({
      version: "0.2.0",
      commit: "development",
      environment: "development",
    });
  });

  it("prefers immutable metadata injected by a production image", () => {
    expect(
      resolveApplicationRuntime({
        NODE_ENV: "production",
        RICKY_APP_VERSION: "0.3.0",
        RICKY_BUILD_COMMIT: "abc123",
      }),
    ).toEqual({
      version: "0.3.0",
      commit: "abc123",
      environment: "production",
    });
  });
});
