import { readFile, readdir, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";

const CURRENT_SCHEMA = 1;
const dataDir = process.env.RICKY_CONTENT_DATA_DIR || "/app/data";
const command = process.argv[2] || "check";

async function parseJson(path, label) {
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch (error) {
    if (error && error.code === "ENOENT") return null;
    throw new Error(`${label}无法读取`);
  }
}

async function checkWorkspace(directory, required) {
  const value = await parseJson(join(dataDir, directory, "workspace.json"), directory);
  if (!value) return;
  for (const field of required) {
    if (!(field in value)) throw new Error(`${directory} 工作区缺少 ${field}`);
  }
}

async function main() {
  const meta = await parseJson(join(dataDir, "meta.json"), "数据目录元信息");
  const schema = meta?.dataSchemaVersion ?? 1;
  if (!Number.isInteger(schema) || schema !== CURRENT_SCHEMA) {
    throw new Error(`数据结构版本 ${schema} 与应用支持版本 ${CURRENT_SCHEMA} 不兼容`);
  }
  await checkWorkspace("content", ["draft", "published", "publishedVersion"]);
  await checkWorkspace("knowledge", ["bases", "documents", "chunks"]);
  await checkWorkspace("agent", ["draft", "published", "models"]);
  await checkWorkspace("runtime", ["runs"]);
  if (command === "migrate") {
    const metaPath = join(dataDir, "meta.json");
    const temporary = `${metaPath}.tmp-${process.pid}`;
    await writeFile(temporary, `${JSON.stringify({ ...meta, dataSchemaVersion: CURRENT_SCHEMA, appVersion: process.env.RICKY_APP_VERSION || "unknown", updatedAt: new Date().toISOString() }, null, 2)}\n`, "utf8");
    await rename(temporary, metaPath);
  } else if (command !== "check") {
    throw new Error(`不支持的数据维护命令：${command}`);
  }
  const roots = await readdir(dataDir).catch(() => []);
  process.stdout.write(JSON.stringify({ ok: true, dataSchemaVersion: schema, roots: roots.filter((name) => !name.startsWith(".")) }) + "\n");
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : "数据检查失败"}\n`);
  process.exitCode = 1;
});
