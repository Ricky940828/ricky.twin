import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { resolveApplicationRuntime } from "@/server/app-runtime";

export const CURRENT_DATA_SCHEMA_VERSION = 1;

export interface DataSchemaMeta {
  dataSchemaVersion: number;
  appVersion: string;
  updatedAt: string;
}

interface DataSchemaOptions {
  appVersion: string;
  now?: () => Date;
}

const initializations = new Map<string, Promise<DataSchemaMeta>>();

function parseMeta(value: unknown): DataSchemaMeta {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value)
  ) {
    throw new Error("数据目录元信息格式无效");
  }
  const candidate = value as Record<string, unknown>;
  if (
    !Number.isInteger(candidate.dataSchemaVersion) ||
    (candidate.dataSchemaVersion as number) < 1 ||
    typeof candidate.appVersion !== "string" ||
    typeof candidate.updatedAt !== "string"
  ) {
    throw new Error("数据目录元信息格式无效");
  }
  return candidate as unknown as DataSchemaMeta;
}

function isMissing(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "ENOENT"
  );
}

export async function ensureCompatibleDataRoot(
  dataDir: string,
  options: DataSchemaOptions,
) {
  await mkdir(dataDir, { recursive: true });
  const metaPath = join(dataDir, "meta.json");
  let meta: DataSchemaMeta;
  try {
    meta = parseMeta(JSON.parse(await readFile(metaPath, "utf8")) as unknown);
  } catch (error) {
    if (!isMissing(error)) {
      const detail = error instanceof Error ? error.message : "未知错误";
      throw new Error(`数据目录元信息无法读取：${detail}`);
    }
    meta = {
      dataSchemaVersion: CURRENT_DATA_SCHEMA_VERSION,
      appVersion: options.appVersion,
      updatedAt: (options.now ?? (() => new Date()))().toISOString(),
    };
    const temporary = `${metaPath}.tmp-${process.pid}-${Date.now()}`;
    await writeFile(temporary, `${JSON.stringify(meta, null, 2)}\n`, "utf8");
    await rename(temporary, metaPath);
  }

  if (meta.dataSchemaVersion > CURRENT_DATA_SCHEMA_VERSION) {
    throw new Error(
      `数据结构版本 ${meta.dataSchemaVersion} 高于当前应用支持版本 ${CURRENT_DATA_SCHEMA_VERSION}`,
    );
  }
  if (meta.dataSchemaVersion < CURRENT_DATA_SCHEMA_VERSION) {
    throw new Error(
      `数据结构版本 ${meta.dataSchemaVersion} 需要迁移到 ${CURRENT_DATA_SCHEMA_VERSION}`,
    );
  }
  return meta;
}

export function initializeApplicationDataRoot(
  dataDir =
    process.env.RICKY_CONTENT_DATA_DIR ??
    join(process.cwd(), ".ricky-twin-data"),
  appVersion =
    resolveApplicationRuntime().version,
) {
  let pending = initializations.get(dataDir);
  if (!pending) {
    pending = ensureCompatibleDataRoot(dataDir, { appVersion });
    initializations.set(dataDir, pending);
    pending.catch(() => initializations.delete(dataDir));
  }
  return pending;
}
