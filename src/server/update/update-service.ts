import { CURRENT_DATA_SCHEMA_VERSION } from "@/server/data/data-schema";
import { resolveApplicationRuntime, type RuntimeEnvironment } from "@/server/app-runtime";

import { compareVersions } from "./semver";
import { createFileUpdateStore, type UpdateStore } from "./file-update-store";
import { createGitHubReleaseProvider, type ReleaseProvider } from "./github-release-provider";
import type { UpdateManifest, UpdateSystemStatus } from "./update-types";

interface CreateUpdateServiceOptions {
  currentVersion: string;
  currentCommit: string;
  runtimeEnvironment?: RuntimeEnvironment;
  dataSchemaVersion: number;
  releaseCheckEnabled?: boolean;
  releaseProvider: ReleaseProvider;
  store: UpdateStore;
  now?: () => Date;
}

function compatibility(manifest: UpdateManifest | null, dataSchemaVersion: number, updaterVersion: string | null) {
  if (!manifest) return { compatible: true, message: "尚未检查最新版本" };
  if (dataSchemaVersion < manifest.minimumDataSchemaVersion || dataSchemaVersion > manifest.maximumDataSchemaVersion) {
    return { compatible: false, message: `数据结构版本不兼容：当前 ${dataSchemaVersion}，新版支持 ${manifest.minimumDataSchemaVersion}—${manifest.maximumDataSchemaVersion}` };
  }
  if (!updaterVersion) return { compatible: false, message: "宿主更新器尚未安装或未上报状态" };
  if (compareVersions(updaterVersion, manifest.requiredUpdaterVersion) < 0) {
    return { compatible: false, message: `宿主更新器版本过低，需要 ${manifest.requiredUpdaterVersion}` };
  }
  return { compatible: true, message: "数据与更新器兼容，可以安全更新" };
}

export function createUpdateService(options: CreateUpdateServiceOptions) {
  const now = options.now ?? (() => new Date());
  let checkedManifest: UpdateManifest | null = null;
  let checkedAt: string | null = null;
  const status = async (): Promise<UpdateSystemStatus> => {
    const state = await options.store.getState();
    const latest = state.latestManifest ?? checkedManifest;
    const result = compatibility(latest, options.dataSchemaVersion, state.updaterVersion);
    return {
      currentVersion: options.currentVersion,
      currentCommit: options.currentCommit,
      runtimeEnvironment: options.runtimeEnvironment ?? "production",
      dataSchemaVersion: options.dataSchemaVersion,
      updaterVersion: state.updaterVersion,
      updaterEnabled: Boolean(state.updaterVersion),
      releaseCheckEnabled: options.releaseCheckEnabled ?? true,
      latestManifest: latest,
      updateAvailable: Boolean(latest && compareVersions(latest.version, options.currentVersion) > 0),
      compatible: result.compatible,
      compatibilityMessage: result.message,
      lastCheckedAt: state.lastCheckedAt ?? checkedAt,
      lastBackupId: state.lastBackupId,
      job: state.job,
    };
  };
  return {
    status,
    async check() {
      const manifest = await options.releaseProvider.getLatest();
      checkedManifest = manifest;
      checkedAt = now().toISOString();
      await options.store.saveCheck(manifest, checkedAt);
      return status();
    },
    async apply() {
      const current = await status();
      if (!current.latestManifest) throw new Error("请先检查最新版本");
      if (!current.updateAvailable) throw new Error("当前已经是最新版本");
      if (!current.compatible) throw new Error(current.compatibilityMessage);
      await options.store.requestUpdate({ fromVersion: options.currentVersion, manifest: current.latestManifest });
      return status();
    },
    async rollback() {
      const current = await status();
      if (!current.lastBackupId) throw new Error("没有可用的升级前备份");
      await options.store.requestRollback({ fromVersion: options.currentVersion, targetVersion: "previous" });
      return status();
    },
  };
}

let singleton: ReturnType<typeof createUpdateService> | undefined;

export function getUpdateService() {
  const repository = process.env.RICKY_UPDATE_REPOSITORY ?? "Ricky940828/ricky.twin";
  const releaseToken = process.env.RICKY_GITHUB_RELEASE_TOKEN ?? "";
  const runtime = resolveApplicationRuntime();
  singleton ??= createUpdateService({
    currentVersion: runtime.version,
    currentCommit: runtime.commit,
    runtimeEnvironment: runtime.environment,
    dataSchemaVersion: CURRENT_DATA_SCHEMA_VERSION,
    releaseCheckEnabled: true,
    releaseProvider: createGitHubReleaseProvider({ repository, token: releaseToken }),
    store: createFileUpdateStore(),
  });
  return singleton;
}
