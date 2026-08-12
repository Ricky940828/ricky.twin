import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { UPDATE_PHASES, type UpdateJob, type UpdateManifest } from "./update-types";

export interface UpdateStoreState {
  updaterVersion: string | null;
  job: UpdateJob | null;
  lastBackupId: string | null;
  latestManifest?: UpdateManifest | null;
  lastCheckedAt?: string | null;
}

export interface UpdateStore {
  getState(): Promise<UpdateStoreState>;
  saveCheck(manifest: UpdateManifest, checkedAt: string): Promise<void>;
  requestUpdate(input: { fromVersion: string; manifest: UpdateManifest }): Promise<UpdateJob>;
  requestRollback(input: { fromVersion: string; targetVersion: string }): Promise<UpdateJob>;
}

interface FileUpdateStoreOptions {
  dataDir?: string;
  now?: () => Date;
  makeId?: () => string;
}

const activePhases = new Set(UPDATE_PHASES.slice(1, 8));

function isActive(job: UpdateJob | null) {
  return Boolean(job && activePhases.has(job.phase));
}

export function createFileUpdateStore(options: FileUpdateStoreOptions = {}): UpdateStore {
  const dataDir = options.dataDir ?? process.env.RICKY_CONTENT_DATA_DIR ?? join(process.cwd(), ".ricky-twin-data");
  const now = options.now ?? (() => new Date());
  const makeId = options.makeId ?? (() => `update-${randomUUID()}`);
  const updateDir = join(dataDir, "system-update");
  const statePath = join(updateDir, "state.json");
  const requestPath = join(updateDir, "request.json");
  let queue: Promise<unknown> = Promise.resolve();

  const atomicWrite = async (path: string, value: unknown) => {
    await mkdir(updateDir, { recursive: true });
    const temporary = `${path}.tmp-${randomUUID()}`;
    await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
    await rename(temporary, path);
  };
  const readState = async (): Promise<UpdateStoreState> => {
    await mkdir(updateDir, { recursive: true });
    try {
      const value = JSON.parse(await readFile(statePath, "utf8")) as UpdateStoreState;
      return {
        updaterVersion: typeof value.updaterVersion === "string" ? value.updaterVersion : null,
        job: value.job ?? null,
        lastBackupId: typeof value.lastBackupId === "string" ? value.lastBackupId : null,
        latestManifest: value.latestManifest ?? null,
        lastCheckedAt: value.lastCheckedAt ?? null,
      };
    } catch (error) {
      if (typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT") {
        return { updaterVersion: null, job: null, lastBackupId: null, latestManifest: null, lastCheckedAt: null };
      }
      throw new Error("系统更新状态无法读取");
    }
  };
  const exclusive = <T>(operation: () => Promise<T>) => {
    const next = queue.then(operation, operation);
    queue = next.then(() => undefined, () => undefined);
    return next;
  };
  const writeRequest = async (state: UpdateStoreState, job: UpdateJob) => {
    if (isActive(state.job)) throw new Error("已有更新任务正在执行");
    const next = { ...state, job };
    await atomicWrite(statePath, next);
    await atomicWrite(requestPath, job);
    return structuredClone(job);
  };

  return {
    getState: readState,
    saveCheck(manifest, checkedAt) {
      return exclusive(async () => {
        const state = await readState();
        await atomicWrite(statePath, { ...state, latestManifest: manifest, lastCheckedAt: checkedAt });
      });
    },
    requestUpdate({ fromVersion, manifest }) {
      return exclusive(async () => {
        const timestamp = now().toISOString();
        return writeRequest(await readState(), {
          id: makeId(), action: "update", phase: "requested", requestedAt: timestamp, updatedAt: timestamp,
          fromVersion, targetVersion: manifest.version, targetImage: manifest.image, message: "更新请求已提交，等待宿主更新器处理",
        });
      });
    },
    requestRollback({ fromVersion, targetVersion }) {
      return exclusive(async () => {
        const state = await readState();
        if (!state.lastBackupId) throw new Error("没有可用的升级前备份");
        const timestamp = now().toISOString();
        return writeRequest(state, {
          id: makeId(), action: "rollback", phase: "requested", requestedAt: timestamp, updatedAt: timestamp,
          fromVersion, targetVersion, backupId: state.lastBackupId, message: "回滚请求已提交，等待宿主更新器处理",
        });
      });
    },
  };
}

