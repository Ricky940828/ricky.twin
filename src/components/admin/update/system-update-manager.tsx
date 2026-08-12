"use client";

import { AlertTriangle, CheckCircle2, History, RefreshCw, Rocket, ShieldCheck } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { ACTIVE_UPDATE_PHASES, type UpdateSystemStatus } from "@/server/update/update-types";

interface UpdateResponse {
  ok: boolean;
  status?: UpdateSystemStatus;
  message?: string;
}

const phaseLabels: Record<string, string> = {
  requested: "等待宿主更新器",
  backing_up: "正在备份全部数据",
  pulling: "正在下载新版本",
  validating: "正在校验发布物",
  migrating: "正在验证数据兼容性",
  restarting: "正在重启应用",
  health_check: "正在进行健康检查",
  succeeded: "更新成功",
  rolling_back: "正在自动回滚",
  rolled_back: "已恢复上一版本",
  failed: "更新失败",
};

function formatTime(value: string | null) {
  return value ? new Intl.DateTimeFormat("zh-CN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "尚未检测";
}

export function SystemUpdateManager() {
  const [status, setStatus] = useState<UpdateSystemStatus | null>(null);
  const [busy, setBusy] = useState<"check" | "apply" | "rollback" | null>(null);
  const [error, setError] = useState("");

  const request = useCallback(async (path: string, method = "GET") => {
    const response = await fetch(path, { method, cache: "no-store" });
    const result = (await response.json()) as UpdateResponse;
    if (!result.ok || !result.status) throw new Error(result.message || "系统更新状态读取失败");
    setStatus(result.status);
    setError("");
    return result.status;
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void request("/api/admin/system/update").catch((reason) =>
        setError(
          reason instanceof Error
            ? reason.message
            : "系统更新状态读取失败",
        ),
      );
    }, 0);
    return () => window.clearTimeout(timer);
  }, [request]);

  useEffect(() => {
    if (!status?.job || !["requested", "backing_up", "pulling", "validating", "migrating", "restarting", "health_check", "rolling_back"].includes(status.job.phase)) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try {
        await request("/api/admin/system/update");
      } catch {
        // A short outage is expected while the application restarts.
      }
      if (!stopped) timer = setTimeout(poll, 2_000);
    };
    timer = setTimeout(poll, 2_000);
    return () => { stopped = true; clearTimeout(timer); };
  }, [request, status?.job]);

  const run = async (action: "check" | "apply" | "rollback") => {
    if (action === "apply" && !window.confirm("系统会先自动备份全部配置和知识库，再更新并重启应用。确认继续吗？")) return;
    if (action === "rollback" && !window.confirm("将恢复最近一次升级前备份并重启应用。确认回滚吗？")) return;
    setBusy(action);
    try {
      await request(`/api/admin/system/update/${action === "check" ? "check" : action}`, "POST");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "操作失败");
    } finally {
      setBusy(null);
    }
  };

  if (!status) {
    return <section className="admin-update"><div className="admin-loading"><p>{error || "正在读取系统版本…"}</p></div></section>;
  }

  const hasActiveJob = Boolean(status.job && ACTIVE_UPDATE_PHASES.has(status.job.phase));
  const canApply = status.updateAvailable && status.compatible && status.updaterEnabled && !hasActiveJob;
  const releaseTitle = !status.latestManifest
    ? "尚未检查更新"
    : status.updateAvailable
      ? `发现新版本 ${status.latestManifest.version}`
      : "当前已经是最新版本";
  return (
    <section className="admin-update">
      {error ? <div className="admin-form-error" role="alert">{error}</div> : null}
      <header className="admin-update__hero">
        <div><span className="admin-kicker">VERSION &amp; RECOVERY</span><h2>系统更新</h2><p>在一个地方检查版本、备份数据、更新重启和恢复上一版本。</p></div>
        <div className="admin-update__version"><small>当前运行</small><strong>当前版本 {status.currentVersion}</strong><span>构建 {status.currentCommit.slice(0, 12)} · 数据结构 v{status.dataSchemaVersion}</span></div>
      </header>

      <div className="admin-update__grid">
        <article className="admin-update__card">
          <div className="admin-update__card-title"><Rocket size={18} aria-hidden /><div><small>LATEST RELEASE</small><h3>{releaseTitle}</h3></div></div>
          <p className={status.compatible ? "is-safe" : "is-warning"}>{status.compatible ? <ShieldCheck size={16} aria-hidden /> : <AlertTriangle size={16} aria-hidden />}{status.compatibilityMessage}</p>
          {status.latestManifest?.notes.length ? <ul>{status.latestManifest.notes.map((note) => <li key={note}>{note}</li>)}</ul> : <p>检查更新后将在此显示版本说明。</p>}
          <small>上次检测：{formatTime(status.lastCheckedAt)}</small>
        </article>
        <article className="admin-update__card">
          <div className="admin-update__card-title"><History size={18} aria-hidden /><div><small>DATA PROTECTION</small><h3>配置与知识库保护</h3></div></div>
          <ul><li>应用镜像与持久数据完全分离</li><li>更新前备份内容、知识库、Agent、模型和运行记录</li><li>健康检查失败自动恢复旧镜像和完整数据</li></ul>
          <small>最近备份：{status.lastBackupId || "首次更新时创建"}</small>
        </article>
      </div>

      {status.job ? <div className={`admin-update__progress is-${status.job.phase}`} role="status"><RefreshCw size={18} aria-hidden /><div><strong>{phaseLabels[status.job.phase] || status.job.phase}</strong><p>{status.job.message}</p></div></div> : null}

      <div className="admin-update__actions">
        <button className="admin-button" disabled={busy !== null || hasActiveJob} onClick={() => void run("check")} type="button"><RefreshCw size={16} aria-hidden />{busy === "check" ? "正在检测" : "检查更新"}</button>
        <button className="admin-button is-primary" disabled={!canApply || busy !== null} onClick={() => void run("apply")} type="button"><Rocket size={16} aria-hidden />一键更新并重启</button>
        <button className="admin-button" disabled={!status.lastBackupId || busy !== null || hasActiveJob} onClick={() => void run("rollback")} type="button"><History size={16} aria-hidden />回滚上一版本</button>
      </div>
      <div className="admin-update__updater"><CheckCircle2 size={15} aria-hidden /><span>{status.updaterEnabled ? `宿主更新器 ${status.updaterVersion} 已连接` : "宿主更新器未启用；当前只能查看版本"}</span></div>
    </section>
  );
}
