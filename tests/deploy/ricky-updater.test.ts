// @vitest-environment node
import { chmod, mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { execFile } from "node:child_process";

import { describe, expect, it } from "vitest";

const run = promisify(execFile);
const updater = join(process.cwd(), "deploy", "ricky-updater.sh");
const digest = "a".repeat(64);

async function fixture(options: { healthFails?: boolean } = {}) {
  const root = await mkdtemp(join(tmpdir(), "ricky-updater-"));
  const dataDir = join(root, "data");
  const updateDir = join(dataDir, "system-update");
  const deployDir = join(root, "deploy");
  const backupDir = join(root, "backups");
  const binDir = join(root, "bin");
  await Promise.all([mkdir(updateDir, { recursive: true }), mkdir(deployDir), mkdir(backupDir), mkdir(binDir)]);
  await writeFile(join(dataDir, "knowledge-marker.md"), "must survive\n", "utf8");
  await writeFile(join(dataDir, "meta.json"), JSON.stringify({ dataSchemaVersion: 1, appVersion: "0.1.0", updatedAt: "2026-08-12T00:00:00.000Z" }) + "\n", "utf8");
  await writeFile(join(deployDir, "image.env"), "RICKY_TWIN_IMAGE=ghcr.io/ricky940828/ricky.twin@sha256:" + "b".repeat(64) + "\nRICKY_APP_VERSION=0.1.0\nRICKY_TWIN_HOST_PORT=3100\n", "utf8");
  await writeFile(join(deployDir, "compose.yaml"), "services: {}\n", "utf8");
  await writeFile(join(updateDir, "state.json"), JSON.stringify({ updaterVersion: "1.0.0", job: null, lastBackupId: null }) + "\n", "utf8");
  await writeFile(join(updateDir, "request.json"), JSON.stringify({
    id: "update-job-1", action: "update", phase: "requested", requestedAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    fromVersion: "0.1.0", targetVersion: "0.2.0", targetImage: `ghcr.io/ricky940828/ricky.twin@sha256:${digest}`, message: "queued",
  }) + "\n", "utf8");
  const docker = join(binDir, "docker");
  await writeFile(docker, `#!/bin/sh\necho "$@" >> "${join(root, "docker.log")}"\nexit 0\n`, "utf8");
  await chmod(docker, 0o755);
  const curl = join(binDir, "curl");
  await writeFile(curl, options.healthFails
    ? `#!/bin/sh\ncount_file="${join(root, "curl-count")}"\ncount=0; [ -f "$count_file" ] && count=$(cat "$count_file"); count=$((count+1)); echo "$count" > "$count_file"; if [ "$count" -eq 1 ]; then echo '{"ok":false}'; else echo '{"ok":true,"version":"0.1.0","dataSchemaVersion":1}'; fi\n`
    : `#!/bin/sh\necho "$@" >> "${join(root, "curl.log")}"\necho '{"ok":true,"version":"0.2.0","dataSchemaVersion":1}'\n`, "utf8");
  await chmod(curl, 0o755);
  return { root, dataDir, updateDir, deployDir, backupDir, binDir };
}

describe("host managed updater", () => {
  it("backs up data, switches the immutable image and records success", async () => {
    const item = await fixture();
    await run("bash", [updater], { env: { ...process.env, PATH: `${item.binDir}:${process.env.PATH}`, RICKY_UPDATE_ROOT: item.root, RICKY_UPDATE_HEALTH_RETRIES: "1", RICKY_UPDATE_HEALTH_DELAY: "0" } });

    const state = JSON.parse(await readFile(join(item.updateDir, "state.json"), "utf8")) as { job: { phase: string }; lastBackupId: string };
    expect(state.job.phase).toBe("succeeded");
    expect(state.lastBackupId).toBeTruthy();
    expect(await readFile(join(item.dataDir, "knowledge-marker.md"), "utf8")).toBe("must survive\n");
    expect(await readFile(join(item.deployDir, "image.env"), "utf8")).toContain(`RICKY_TWIN_IMAGE=ghcr.io/ricky940828/ricky.twin@sha256:${digest}`);
  });

  it("preserves the cached release manifest while the host writes progress", async () => {
    const item = await fixture();
    const statePath = join(item.updateDir, "state.json");
    await writeFile(statePath, JSON.stringify({
      updaterVersion: "1.0.0",
      job: null,
      lastBackupId: null,
      lastCheckedAt: "2026-08-12T00:00:00.000Z",
      latestManifest: { version: "0.2.0", notes: ["keep"] },
    }), "utf8");

    await run("bash", [updater], { env: { ...process.env, PATH: `${item.binDir}:${process.env.PATH}`, RICKY_UPDATE_ROOT: item.root, RICKY_UPDATE_HEALTH_RETRIES: "1", RICKY_UPDATE_HEALTH_DELAY: "0" } });

    const state = JSON.parse(await readFile(statePath, "utf8")) as Record<string, unknown>;
    expect(state.lastCheckedAt).toBe("2026-08-12T00:00:00.000Z");
    expect(state.latestManifest).toEqual({ version: "0.2.0", notes: ["keep"] });
  });

  it("uses and preserves the dedicated host port across updates", async () => {
    const item = await fixture();

    await run("bash", [updater], { env: { ...process.env, PATH: `${item.binDir}:${process.env.PATH}`, RICKY_UPDATE_ROOT: item.root, RICKY_UPDATE_HEALTH_RETRIES: "1", RICKY_UPDATE_HEALTH_DELAY: "0" } });

    expect(await readFile(join(item.root, "curl.log"), "utf8")).toContain("http://127.0.0.1:3100/api/health");
    expect(await readFile(join(item.deployDir, "image.env"), "utf8")).toContain("RICKY_TWIN_HOST_PORT=3100");
  });

  it("restores the old image and data when the new version fails health checks", async () => {
    const item = await fixture({ healthFails: true });
    await run("bash", [updater], { env: { ...process.env, PATH: `${item.binDir}:${process.env.PATH}`, RICKY_UPDATE_ROOT: item.root, RICKY_UPDATE_HEALTH_RETRIES: "1", RICKY_UPDATE_HEALTH_DELAY: "0" } });

    const state = JSON.parse(await readFile(join(item.updateDir, "state.json"), "utf8")) as { job: { phase: string } };
    expect(state.job.phase).toBe("rolled_back");
    expect(await readFile(join(item.deployDir, "image.env"), "utf8")).toContain("RICKY_APP_VERSION=0.1.0");
    expect(await readFile(join(item.dataDir, "knowledge-marker.md"), "utf8")).toBe("must survive\n");
  });

  it("rejects an unsafe job identifier before invoking Docker", async () => {
    const item = await fixture();
    const requestPath = join(item.updateDir, "request.json");
    const request = JSON.parse(await readFile(requestPath, "utf8")) as Record<string, unknown>;
    request.id = "../../escape";
    await writeFile(requestPath, JSON.stringify(request), "utf8");

    await expect(run("bash", [updater], {
      env: { ...process.env, PATH: `${item.binDir}:${process.env.PATH}`, RICKY_UPDATE_ROOT: item.root, RICKY_UPDATE_HEALTH_RETRIES: "1", RICKY_UPDATE_HEALTH_DELAY: "0" },
    })).rejects.toThrow();
    await expect(readFile(join(item.root, "docker.log"), "utf8")).rejects.toThrow();
    await expect(readFile(join(item.updateDir, "request.json"), "utf8")).rejects.toThrow();
  });
});
