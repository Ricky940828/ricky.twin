import { describe, expect, it, vi } from "vitest";

import type { UpdateManifest } from "./update-types";
import { createUpdateService } from "./update-service";

const manifest: UpdateManifest = {
  schemaVersion: 1,
  version: "0.2.0",
  releaseTag: "v0.2.0",
  image: "ghcr.io/ricky940828/ricky.twin@sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  publishedAt: "2026-08-12T00:00:00.000Z",
  minimumDataSchemaVersion: 1,
  maximumDataSchemaVersion: 1,
  requiredUpdaterVersion: "1.0.0",
  notes: ["更新功能"],
};

describe("update service", () => {
  it("detects a compatible newer release", async () => {
    const service = createUpdateService({
      currentVersion: "0.1.0",
      currentCommit: "abc123",
      dataSchemaVersion: 1,
      releaseProvider: { getLatest: vi.fn(async () => manifest) },
      store: {
        getState: vi.fn(async () => ({ updaterVersion: "1.0.0", job: null, lastBackupId: null })),
        saveCheck: vi.fn(async () => undefined),
        requestUpdate: vi.fn(),
        requestRollback: vi.fn(),
      },
    });

    await expect(service.check()).resolves.toMatchObject({
      updateAvailable: true,
      compatible: true,
      updaterEnabled: true,
      latestManifest: { version: "0.2.0" },
    });
  });

  it("blocks an update that cannot read the current data schema", async () => {
    const incompatible = { ...manifest, minimumDataSchemaVersion: 2 };
    const service = createUpdateService({
      currentVersion: "0.1.0",
      currentCommit: "abc123",
      dataSchemaVersion: 1,
      releaseProvider: { getLatest: vi.fn(async () => incompatible) },
      store: {
        getState: vi.fn(async () => ({ updaterVersion: "1.0.0", job: null, lastBackupId: null })),
        saveCheck: vi.fn(async () => undefined),
        requestUpdate: vi.fn(),
        requestRollback: vi.fn(),
      },
    });

    const status = await service.check();
    expect(status.compatible).toBe(false);
    await expect(service.apply()).rejects.toThrow("数据结构版本不兼容");
  });
});

