import { describe, expect, it } from "vitest";

import { compareVersions, normalizeVersion } from "./semver";

describe("managed update semantic versions", () => {
  it("normalizes release tags and compares numeric segments", () => {
    expect(normalizeVersion("v1.12.0")).toBe("1.12.0");
    expect(compareVersions("1.12.0", "1.9.9")).toBeGreaterThan(0);
    expect(compareVersions("v1.2.0", "1.2.0")).toBe(0);
  });

  it("orders prereleases before a stable release", () => {
    expect(compareVersions("1.2.0-rc.2", "1.2.0")).toBeLessThan(0);
    expect(compareVersions("1.2.0-rc.10", "1.2.0-rc.2")).toBeGreaterThan(0);
  });

  it("rejects ambiguous or incomplete versions", () => {
    expect(() => normalizeVersion("latest")).toThrow("版本号格式无效");
    expect(() => normalizeVersion("1.2")).toThrow("版本号格式无效");
  });
});

