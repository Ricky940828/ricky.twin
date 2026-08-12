// @vitest-environment node
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

import { describe, expect, it } from "vitest";

const run = promisify(execFile);
const maintenance = join(process.cwd(), "deploy", "data-maintenance.mjs");

describe("data maintenance", () => {
  it("updates application metadata without rewriting persisted workspaces", async () => {
    const dataDir = await mkdtemp(join(tmpdir(), "ricky-maintenance-"));
    await mkdir(join(dataDir, "knowledge"), { recursive: true });
    const workspace = '{"bases":[],"documents":[],"chunks":[],"updatedAt":"2026-08-12T00:00:00.000Z"}\n';
    await writeFile(join(dataDir, "knowledge", "workspace.json"), workspace, "utf8");
    await writeFile(join(dataDir, "meta.json"), JSON.stringify({ dataSchemaVersion: 1, appVersion: "0.1.0", updatedAt: "2026-08-12T00:00:00.000Z" }), "utf8");

    await run(process.execPath, [maintenance, "migrate"], {
      env: { ...process.env, RICKY_CONTENT_DATA_DIR: dataDir, RICKY_APP_VERSION: "0.2.0" },
    });

    expect(await readFile(join(dataDir, "knowledge", "workspace.json"), "utf8")).toBe(workspace);
    const meta = JSON.parse(await readFile(join(dataDir, "meta.json"), "utf8")) as { appVersion: string; dataSchemaVersion: number };
    expect(meta).toMatchObject({ appVersion: "0.2.0", dataSchemaVersion: 1 });
  });

  it("rejects a future schema without modifying metadata", async () => {
    const dataDir = await mkdtemp(join(tmpdir(), "ricky-maintenance-"));
    const metaPath = join(dataDir, "meta.json");
    const original = '{"dataSchemaVersion":99,"appVersion":"9.0.0","updatedAt":"2026-08-12T00:00:00.000Z"}\n';
    await writeFile(metaPath, original, "utf8");

    await expect(run(process.execPath, [maintenance, "migrate"], {
      env: { ...process.env, RICKY_CONTENT_DATA_DIR: dataDir, RICKY_APP_VERSION: "0.2.0" },
    })).rejects.toThrow();
    expect(await readFile(metaPath, "utf8")).toBe(original);
  });
});
