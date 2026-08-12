import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { createFileUpdateStore } from "./file-update-store";

describe("file update store", () => {
  it("persists only a server-created update request", async () => {
    const dataDir = await mkdtemp(join(tmpdir(), "ricky-update-store-"));
    const store = createFileUpdateStore({
      dataDir,
      now: () => new Date("2026-08-12T01:00:00.000Z"),
      makeId: () => "update-1",
    });

    const job = await store.requestUpdate({
      fromVersion: "0.1.0",
      manifest: {
        schemaVersion: 1,
        version: "0.2.0",
        releaseTag: "v0.2.0",
        image: "ghcr.io/ricky940828/ricky.twin@sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        publishedAt: "2026-08-12T00:00:00.000Z",
        minimumDataSchemaVersion: 1,
        maximumDataSchemaVersion: 1,
        requiredUpdaterVersion: "1.0.0",
        notes: [],
      },
    });

    expect(job).toMatchObject({ phase: "requested", targetVersion: "0.2.0" });
    const persisted = await readFile(
      join(dataDir, "system-update", "request.json"),
      "utf8",
    );
    expect(persisted).toContain('"targetVersion": "0.2.0"');
    expect(persisted).not.toContain("github-read-token");
  });

  it("rejects a second request while a job is active", async () => {
    const dataDir = await mkdtemp(join(tmpdir(), "ricky-update-store-"));
    const store = createFileUpdateStore({ dataDir });
    const manifest = {
      schemaVersion: 1 as const,
      version: "0.2.0",
      releaseTag: "v0.2.0",
      image: "ghcr.io/ricky940828/ricky.twin@sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      publishedAt: "2026-08-12T00:00:00.000Z",
      minimumDataSchemaVersion: 1,
      maximumDataSchemaVersion: 1,
      requiredUpdaterVersion: "1.0.0",
      notes: [],
    };
    await store.requestUpdate({ fromVersion: "0.1.0", manifest });

    await expect(
      store.requestUpdate({ fromVersion: "0.1.0", manifest }),
    ).rejects.toThrow("已有更新任务正在执行");
  });
});

