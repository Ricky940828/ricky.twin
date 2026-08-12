#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="/opt/ricky-twin"
SOURCE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if [ "$(id -u)" -ne 0 ]; then
  echo "请使用 sudo 执行安装脚本。" >&2
  exit 1
fi

if ! command -v docker >/dev/null 2>&1 || ! docker compose version >/dev/null 2>&1; then
  echo "需要先安装 Docker Engine 与 Docker Compose 插件。" >&2
  exit 1
fi
for command in jq curl; do
  command -v "$command" >/dev/null 2>&1 || { echo "缺少系统命令：$command" >&2; exit 1; }
done

case "$ROOT" in
  ""|"/"|"/opt"|"/home"|"/Users") echo "拒绝使用过宽的安装目录。" >&2; exit 2 ;;
esac

install -d -m 0750 "$ROOT" "$ROOT/config" "$ROOT/deploy" "$ROOT/backups"
# The production container runs as uid/gid 1001 and only receives write access to data.
install -d -o 1001 -g 1001 -m 0750 "$ROOT/data"
install -d -o 1001 -g 1001 -m 0750 "$ROOT/data/system-update"
install -m 0750 "$SOURCE_DIR/deploy/ricky-updater.sh" "$ROOT/deploy/ricky-updater.sh"
install -m 0640 "$SOURCE_DIR/compose.production.yaml" "$ROOT/deploy/compose.yaml"

if [ ! -f "$ROOT/config/.env" ]; then
  install -m 0600 "$SOURCE_DIR/.env.example" "$ROOT/config/.env"
  echo "已生成 $ROOT/config/.env，请先填写后台密码、会话密钥、数据加密密钥和 GitHub Token。"
fi

if [ ! -f "$ROOT/deploy/image.env" ]; then
  install -m 0600 "$SOURCE_DIR/deploy/image.env.example" "$ROOT/deploy/image.env"
  echo "已生成 $ROOT/deploy/image.env，请将镜像摘要替换为首个正式 Release 的值。"
fi

if [ ! -f "$ROOT/data/system-update/state.json" ]; then
  printf '%s\n' '{"updaterVersion":"1.0.0","job":null,"lastBackupId":null,"latestManifest":null,"lastCheckedAt":null}' \
    > "$ROOT/data/system-update/state.json"
  chown 1001:1001 "$ROOT/data/system-update/state.json"
  chmod 0640 "$ROOT/data/system-update/state.json"
fi

install -m 0644 "$SOURCE_DIR/deploy/systemd/ricky-twin-update.service" /etc/systemd/system/ricky-twin-update.service
install -m 0644 "$SOURCE_DIR/deploy/systemd/ricky-twin-update.path" /etc/systemd/system/ricky-twin-update.path
systemctl daemon-reload
systemctl enable --now ricky-twin-update.path

echo "管理更新器已安装。首次启动前，请完成私有 GHCR 登录："
echo "  echo '<PACKAGE_READ_TOKEN>' | docker login ghcr.io -u '<GITHUB_USER>' --password-stdin"
echo "然后执行：docker compose --env-file $ROOT/deploy/image.env -f $ROOT/deploy/compose.yaml up -d"
