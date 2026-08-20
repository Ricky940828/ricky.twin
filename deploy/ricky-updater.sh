#!/usr/bin/env bash
set -Eeuo pipefail

UPDATER_VERSION="1.0.0"
ROOT="${RICKY_UPDATE_ROOT:-/opt/ricky-twin}"
case "$ROOT" in
  ""|"/"|"/opt"|"/home"|"/Users") echo "Unsafe update root" >&2; exit 2 ;;
esac
DATA_DIR="$ROOT/data"
UPDATE_DIR="$DATA_DIR/system-update"
DEPLOY_DIR="$ROOT/deploy"
BACKUP_DIR="$ROOT/backups"
REQUEST_PATH="$UPDATE_DIR/request.json"
STATE_PATH="$UPDATE_DIR/state.json"
LOCK_PATH="$UPDATE_DIR/updater.lock"
IMAGE_ENV="$DEPLOY_DIR/image.env"
COMPOSE_FILE="$DEPLOY_DIR/compose.yaml"
HOST_PORT="$(sed -n 's/^RICKY_TWIN_HOST_PORT=//p' "$IMAGE_ENV" 2>/dev/null | head -1)"
HOST_PORT="${HOST_PORT:-3000}"
[[ "$HOST_PORT" =~ ^[0-9]{1,5}$ ]] || { echo "Invalid Ricky Twin host port" >&2; exit 2; }
HEALTH_URL="${RICKY_UPDATE_HEALTH_URL:-http://127.0.0.1:$HOST_PORT/api/health}"
HEALTH_RETRIES="${RICKY_UPDATE_HEALTH_RETRIES:-30}"
HEALTH_DELAY="${RICKY_UPDATE_HEALTH_DELAY:-2}"
ALLOWED_IMAGE_PREFIX="ghcr.io/ricky940828/ricky.twin@sha256:"

mkdir -p "$UPDATE_DIR" "$BACKUP_DIR"
if ! mkdir "$LOCK_PATH" 2>/dev/null; then
  exit 0
fi
trap 'rmdir "$LOCK_PATH" 2>/dev/null || true' EXIT
[ -f "$REQUEST_PATH" ] || exit 0
reject_request() {
  local reason="$1" rejected
  rejected="$UPDATE_DIR/request.rejected-$(date -u +%Y%m%dT%H%M%SZ).json"
  mv "$REQUEST_PATH" "$rejected" 2>/dev/null || rm -f "$REQUEST_PATH"
  echo "$reason" >&2
  exit 2
}
[ ! -L "$REQUEST_PATH" ] || reject_request "Refusing symlinked update request"

request="$(cat "$REQUEST_PATH")"
jq -e 'type == "object"' >/dev/null 2>&1 <<<"$request" || reject_request "Invalid update request JSON"
job_id="$(jq -er '.id' <<<"$request" 2>/dev/null)" || reject_request "Missing update job id"
action="$(jq -er '.action' <<<"$request" 2>/dev/null)" || reject_request "Missing update action"
from_version="$(jq -er '.fromVersion' <<<"$request" 2>/dev/null)" || reject_request "Missing source version"
target_version="$(jq -er '.targetVersion' <<<"$request" 2>/dev/null)" || reject_request "Missing target version"
requested_at="$(jq -er '.requestedAt' <<<"$request" 2>/dev/null)" || reject_request "Missing request timestamp"
target_image="$(jq -r '.targetImage // ""' <<<"$request" 2>/dev/null)" || reject_request "Invalid target image"

[[ "$job_id" =~ ^update-[A-Za-z0-9-]{1,120}$ ]] || reject_request "Invalid update job id"
[[ "$action" == "update" || "$action" == "rollback" ]] || reject_request "Invalid update action"
[[ "$from_version" =~ ^[0-9]+\.[0-9]+\.[0-9]+([+-][0-9A-Za-z.-]+)?$ ]] || reject_request "Invalid source version"
[[ "$requested_at" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}T ]] || reject_request "Invalid request timestamp"
if [ "$action" = "update" ]; then
  [[ "$target_version" =~ ^[0-9]+\.[0-9]+\.[0-9]+([+-][0-9A-Za-z.-]+)?$ ]] || reject_request "Invalid target version"
fi
backup_id="$(date -u +%Y%m%dT%H%M%SZ)-$job_id"
backup_path="$BACKUP_DIR/$backup_id"

write_state() {
  local phase="$1" message="$2" backup="${3:-}"
  local now previous last_backup
  now="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  previous="$(cat "$STATE_PATH" 2>/dev/null || printf '{}')"
  jq -e 'type == "object"' >/dev/null 2>&1 <<<"$previous" || previous='{}'
  last_backup="$(jq -r '.lastBackupId // ""' <<<"$previous")"
  if [ -n "$backup" ] && [ -f "$BACKUP_DIR/$backup/.complete" ]; then
    last_backup="$backup"
  fi
  jq -n --arg updater "$UPDATER_VERSION" --arg id "$job_id" --arg action "$action" --arg phase "$phase" \
    --arg requested "$requested_at" --arg updated "$now" --arg from "$from_version" --arg last "$last_backup" \
    --arg target "$target_version" --arg image "$target_image" --arg message "$message" --arg backup "$backup" --argjson previous "$previous" \
    '$previous + {updaterVersion:$updater,lastBackupId:(if $last=="" then null else $last end),job:{id:$id,action:$action,phase:$phase,requestedAt:$requested,updatedAt:$updated,fromVersion:$from,targetVersion:$target,targetImage:(if $image=="" then null else $image end),backupId:(if $backup=="" then null else $backup end),message:$message}}' \
    > "$STATE_PATH.tmp"
  mv "$STATE_PATH.tmp" "$STATE_PATH"
}

compose() { docker compose --env-file "$IMAGE_ENV" -f "$COMPOSE_FILE" "$@"; }
health_ok() {
  local expected="$1" body
  for ((attempt=1; attempt<=HEALTH_RETRIES; attempt++)); do
    body="$(curl -fsS "$HEALTH_URL" 2>/dev/null || true)"
    if jq -e --arg version "$expected" '.ok == true and .version == $version and .dataSchemaVersion == 1' >/dev/null 2>&1 <<<"$body"; then return 0; fi
    sleep "$HEALTH_DELAY"
  done
  return 1
}

restore_backup() {
  local restore_path="$ROOT/.restore-$job_id"
  local failed_path="$ROOT/failed-data-$job_id"
  [ ! -e "$restore_path" ] || return 1
  [ ! -e "$failed_path" ] || return 1
  [ -f "$backup_path/.complete" ] || return 1
  compose stop ricky-twin >/dev/null 2>&1 || true
  mkdir -p "$restore_path"
  cp -a "$backup_path/data/." "$restore_path/"
  mv "$DATA_DIR" "$failed_path"
  mv "$restore_path" "$DATA_DIR"
  cp "$backup_path/image.env" "$IMAGE_ENV.restore"
  mv "$IMAGE_ENV.restore" "$IMAGE_ENV"
  compose up -d --remove-orphans
}

handle_failure() {
  local exit_code=$?
  trap - ERR
  set +e
  if [ -f "$backup_path/.complete" ]; then
    write_state rolling_back "更新过程异常，正在恢复旧镜像和完整数据" "$backup_id"
    restore_backup
    if health_ok "$from_version"; then
      write_state rolled_back "更新过程异常，已自动恢复上一版本" "$backup_id"
      rm -f "$REQUEST_PATH"
      exit 0
    fi
  else
    compose up -d --remove-orphans >/dev/null 2>&1 || true
  fi
  write_state failed "更新失败，未修改现有持久数据；请检查更新器日志" "${backup_id:-}"
  rm -f "$REQUEST_PATH"
  exit "$exit_code"
}

trap handle_failure ERR

if [ "$action" = "rollback" ]; then
  requested_backup="$(jq -er '.backupId' <<<"$request" 2>/dev/null)" || reject_request "Missing backup id"
  [[ "$requested_backup" =~ ^[A-Za-z0-9][A-Za-z0-9-]{0,191}$ ]] || { write_state failed "备份编号格式无效"; exit 1; }
  backup_path="$BACKUP_DIR/$requested_backup"
  [ -f "$backup_path/.complete" ] || { write_state failed "指定备份不存在或不完整"; exit 1; }
  write_state rolling_back "正在恢复升级前版本" "$requested_backup"
  restore_backup
  rollback_version="$(sed -n 's/^RICKY_APP_VERSION=//p' "$IMAGE_ENV" | head -1)"
  if health_ok "$rollback_version"; then
    write_state rolled_back "已恢复上一版本" "$requested_backup"
    rm -f "$REQUEST_PATH"
    exit 0
  fi
  write_state failed "回滚版本未通过健康检查，请人工检查服务" "$requested_backup"
  rm -f "$REQUEST_PATH"
  exit 1
fi

[[ "$target_image" == "$ALLOWED_IMAGE_PREFIX"* ]] && [[ "$target_image" =~ @sha256:[a-f0-9]{64}$ ]] || { write_state failed "目标镜像不在允许范围内"; exit 1; }

write_state pulling "正在下载不可变版本镜像" "$backup_id"
docker pull "$target_image"

write_state backing_up "正在冻结写入并备份全部持久数据" "$backup_id"
compose stop ricky-twin
mkdir -p "$backup_path/data"
cp -a "$DATA_DIR/." "$backup_path/data/"
cp "$IMAGE_ENV" "$backup_path/image.env"
touch "$backup_path/.complete"

write_state validating "正在校验数据和部署配置" "$backup_id"
docker run --rm --network none --read-only --cap-drop ALL --security-opt no-new-privileges \
  -e RICKY_CONTENT_DATA_DIR=/data -e RICKY_APP_VERSION="$target_version" -v "$DATA_DIR:/data:ro" \
  "$target_image" node /app/deploy/data-maintenance.mjs check

write_state migrating "正在执行受控数据迁移" "$backup_id"
docker run --rm --network none --read-only --cap-drop ALL --security-opt no-new-privileges \
  -e RICKY_CONTENT_DATA_DIR=/data -e RICKY_APP_VERSION="$target_version" -v "$DATA_DIR:/data" \
  "$target_image" node /app/deploy/data-maintenance.mjs migrate

printf 'RICKY_TWIN_IMAGE=%s\nRICKY_APP_VERSION=%s\nRICKY_TWIN_HOST_PORT=%s\n' "$target_image" "$target_version" "$HOST_PORT" > "$IMAGE_ENV.tmp"
mv "$IMAGE_ENV.tmp" "$IMAGE_ENV"
write_state restarting "正在重启应用" "$backup_id"
compose up -d --remove-orphans
write_state health_check "正在验证新版和全部持久数据" "$backup_id"
if health_ok "$target_version"; then
  write_state succeeded "更新完成，配置与知识库已保留" "$backup_id"
  rm -f "$REQUEST_PATH"
  exit 0
fi

write_state rolling_back "新版健康检查失败，正在自动恢复" "$backup_id"
trap - ERR
restore_backup
if health_ok "$from_version"; then
  write_state rolled_back "新版未通过检查，已恢复上一版本" "$backup_id"
  rm -f "$REQUEST_PATH"
  exit 0
fi
write_state failed "自动回滚后健康检查仍未通过，请人工检查服务" "$backup_id"
rm -f "$REQUEST_PATH"
exit 1
