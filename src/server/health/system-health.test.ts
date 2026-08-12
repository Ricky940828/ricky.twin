import { describe, expect, it, vi } from "vitest";

import { createSystemHealthCheck } from "./system-health";

describe("system health check", () => {
  it("reports healthy only after every persisted workspace is readable", async () => {
    const check = createSystemHealthCheck({
      version: "0.2.0",
      commit: "abc123",
      dataSchemaVersion: 1,
      probes: {
        content: vi.fn(async () => undefined),
        knowledge: vi.fn(async () => undefined),
        agent: vi.fn(async () => undefined),
        runtime: vi.fn(async () => undefined),
      },
    });

    await expect(check()).resolves.toEqual({
      ok: true,
      version: "0.2.0",
      commit: "abc123",
      dataSchemaVersion: 1,
      stores: {
        content: "ready",
        knowledge: "ready",
        agent: "ready",
        runtime: "ready",
      },
    });
  });

  it("fails without exposing persisted content when one workspace is unreadable", async () => {
    const check = createSystemHealthCheck({
      version: "0.2.0",
      commit: "abc123",
      dataSchemaVersion: 1,
      probes: {
        content: vi.fn(async () => undefined),
        knowledge: vi.fn(async () => {
          throw new Error("secret document body");
        }),
        agent: vi.fn(async () => undefined),
        runtime: vi.fn(async () => undefined),
      },
    });

    const result = await check();
    expect(result.ok).toBe(false);
    expect(result.stores.knowledge).toBe("error");
    expect(JSON.stringify(result)).not.toContain("secret document body");
  });
});
