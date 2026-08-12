import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  CURRENT_DATA_SCHEMA_VERSION,
  ensureCompatibleDataRoot,
} from "./data-schema";

describe("persistent data schema", () => {
  it("adopts an existing V1 data directory without rewriting workspaces", async () => {
    const dataDir = await mkdtemp(join(tmpdir(), "ricky-data-schema-"));
    const marker = join(dataDir, "existing.json");
    await writeFile(marker, '{"keep":true}\n', "utf8");

    const meta = await ensureCompatibleDataRoot(dataDir, {
      appVersion: "0.2.0",
      now: () => new Date("2026-08-12T00:00:00.000Z"),
    });

    expect(meta.dataSchemaVersion).toBe(CURRENT_DATA_SCHEMA_VERSION);
    expect(await readFile(marker, "utf8")).toBe('{"keep":true}\n');
  });

  it("rejects a future data schema without modifying its metadata", async () => {
    const dataDir = await mkdtemp(join(tmpdir(), "ricky-data-schema-"));
    const metaPath = join(dataDir, "meta.json");
    const original = '{"dataSchemaVersion":99,"appVersion":"9.0.0","updatedAt":"2026-08-12T00:00:00.000Z"}\n';
    await writeFile(metaPath, original, "utf8");

    await expect(
      ensureCompatibleDataRoot(dataDir, { appVersion: "0.2.0" }),
    ).rejects.toThrow("数据结构版本 99 高于当前应用支持版本");
    expect(await readFile(metaPath, "utf8")).toBe(original);
  });

  it("rejects corrupt metadata instead of replacing it", async () => {
    const dataDir = await mkdtemp(join(tmpdir(), "ricky-data-schema-"));
    const metaPath = join(dataDir, "meta.json");
    await writeFile(metaPath, "not-json\n", "utf8");

    await expect(
      ensureCompatibleDataRoot(dataDir, { appVersion: "0.2.0" }),
    ).rejects.toThrow("数据目录元信息无法读取");
    expect(await readFile(metaPath, "utf8")).toBe("not-json\n");
  });
});

