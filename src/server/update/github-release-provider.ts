import { normalizeVersion } from "./semver";
import type { UpdateManifest } from "./update-types";

export interface ReleaseProvider {
  getLatest(): Promise<UpdateManifest>;
}

interface GitHubReleaseProviderOptions {
  repository: string;
  token: string;
  fetcher?: typeof fetch;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseUpdateManifest(
  value: unknown,
  repository: string,
): UpdateManifest {
  if (!isRecord(value)) {
    throw new Error("更新清单格式无效");
  }
  const version =
    typeof value.version === "string" ? normalizeVersion(value.version) : "";
  const releaseTag =
    typeof value.releaseTag === "string" ? value.releaseTag : "";
  const image = typeof value.image === "string" ? value.image : "";
  const imagePrefix = `ghcr.io/${repository.toLowerCase()}@sha256:`;
  if (!image.toLowerCase().startsWith(imagePrefix) || !/^.+@sha256:[a-f0-9]{64}$/i.test(image)) {
    throw new Error("发布镜像不在允许范围内或缺少固定摘要");
  }
  if (normalizeVersion(releaseTag) !== version) {
    throw new Error("Release 标签与更新版本不一致");
  }
  if (
    value.schemaVersion !== 1 ||
    typeof value.publishedAt !== "string" ||
    !Number.isInteger(value.minimumDataSchemaVersion) ||
    !Number.isInteger(value.maximumDataSchemaVersion) ||
    typeof value.requiredUpdaterVersion !== "string" ||
    !Array.isArray(value.notes) ||
    !value.notes.every((note) => typeof note === "string")
  ) {
    throw new Error("更新清单字段不完整");
  }
  return {
    schemaVersion: 1,
    version,
    releaseTag,
    image,
    publishedAt: value.publishedAt,
    minimumDataSchemaVersion: value.minimumDataSchemaVersion as number,
    maximumDataSchemaVersion: value.maximumDataSchemaVersion as number,
    requiredUpdaterVersion: normalizeVersion(value.requiredUpdaterVersion),
    notes: value.notes as string[],
  };
}

export function createGitHubReleaseProvider(
  options: GitHubReleaseProviderOptions,
): ReleaseProvider {
  const fetcher = options.fetcher ?? fetch;
  const headers = {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${options.token}`,
    "X-GitHub-Api-Version": "2022-11-28",
  };
  return {
    async getLatest() {
      if (!options.token.trim()) {
        throw new Error("未配置 GitHub Release 只读 Token");
      }
      const releaseResponse = await fetcher(
        `https://api.github.com/repos/${options.repository}/releases/latest`,
        { headers, cache: "no-store" },
      );
      if (!releaseResponse.ok) {
        throw new Error(`GitHub Release 查询失败（${releaseResponse.status}）`);
      }
      const release = (await releaseResponse.json()) as {
        tag_name?: string;
        assets?: Array<{ name?: string; url?: string }>;
      };
      const asset = release.assets?.find(
        (candidate) => candidate.name === "update-manifest.json",
      );
      if (!asset?.url) {
        throw new Error("最新 Release 缺少 update-manifest.json");
      }
      const manifestResponse = await fetcher(asset.url, {
        headers: { ...headers, Accept: "application/octet-stream" },
        cache: "no-store",
      });
      if (!manifestResponse.ok) {
        throw new Error(`更新清单下载失败（${manifestResponse.status}）`);
      }
      const manifest = parseUpdateManifest(
        await manifestResponse.json(),
        options.repository,
      );
      if (release.tag_name && normalizeVersion(release.tag_name) !== manifest.version) {
        throw new Error("GitHub Release 与更新清单版本不一致");
      }
      return manifest;
    },
  };
}

