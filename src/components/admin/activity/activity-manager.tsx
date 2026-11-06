"use client";

import {
  Activity,
  Bot,
  CheckCircle2,
  Database,
  Eye,
  Gauge,
  MessageSquareText,
  RefreshCw,
  ServerCog,
  UsersRound,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { EditorPanel } from "@/components/admin/editor-fields";
import type {
  AiRunDetail,
  ObservabilityDashboard,
  ObservabilitySettings,
} from "@/server/observability/observability-types";
import type {
  RuntimeLeadStatus,
  RuntimeWorkspace,
} from "@/server/runtime/runtime-types";

type ActivityTab = "overview" | "visitors" | "ai" | "requests" | "system";
type ActivityResponse =
  | { ok: true; workspace: RuntimeWorkspace; dashboard: ObservabilityDashboard }
  | { ok: false; message: string };

const TABS: Array<{ id: ActivityTab; label: string }> = [
  { id: "overview", label: "运营总览" },
  { id: "visitors", label: "访客与转化" },
  { id: "ai", label: "AI 与 RAG" },
  { id: "requests", label: "请求与审计" },
  { id: "system", label: "系统性能" },
];

const LEAD_STATUS_LABEL: Record<RuntimeLeadStatus, string> = {
  new: "待跟进",
  contacted: "已联系",
  closed: "已关闭",
};

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.valueOf())
    ? value
    : new Intl.DateTimeFormat("zh-CN", {
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      }).format(date);
}

function shortVisitor(value: string) {
  return value.length > 15 ? `${value.slice(0, 8)}…${value.slice(-5)}` : value;
}

function formatBytes(value: number) {
  if (value < 1_024) return `${value} B`;
  if (value < 1_048_576) return `${(value / 1_024).toFixed(1)} KB`;
  if (value < 1_073_741_824) return `${(value / 1_048_576).toFixed(1)} MB`;
  return `${(value / 1_073_741_824).toFixed(1)} GB`;
}

export function ActivityManager() {
  const [workspace, setWorkspace] = useState<RuntimeWorkspace | null>(null);
  const [dashboard, setDashboard] = useState<ObservabilityDashboard | null>(null);
  const [activeTab, setActiveTab] = useState<ActivityTab>("overview");
  const [rangeDays, setRangeDays] = useState(7);
  const [settings, setSettings] = useState<ObservabilitySettings>({
    transcriptEnabled: true,
    retentionDays: 30,
  });
  const [runDetail, setRunDetail] = useState<AiRunDetail | null>(null);
  const [busyRunId, setBusyRunId] = useState("");
  const [busyLeadId, setBusyLeadId] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [readiness, setReadiness] = useState("");

  const load = useCallback(async (silent = false) => {
    try {
      const response = await fetch(`/api/admin/activity?range=${rangeDays}`, {
        cache: "no-store",
      });
      const result = (await response.json()) as ActivityResponse;
      if (!result.ok) {
        setError(result.message);
        return;
      }
      if (!silent) setError("");
      setWorkspace(result.workspace);
      setDashboard(result.dashboard);
      setSettings(result.dashboard.settings);
    } catch {
      if (!silent) setError("运营与运行数据暂时无法加载");
    }
  }, [rangeDays]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    if (activeTab !== "system") return;
    const timer = window.setInterval(() => void load(true), 30_000);
    return () => window.clearInterval(timer);
  }, [activeTab, load]);

  const conversion = useMemo(() => {
    if (!workspace || !dashboard) return 0;
    const newestObservedAt = [
      workspace.updatedAt,
      dashboard.recentBehaviorEvents[0]?.createdAt,
      dashboard.recentAiRuns[0]?.createdAt,
      dashboard.recentRequests[0]?.createdAt,
    ].reduce(
      (latest, value) => Math.max(latest, value ? Date.parse(value) : 0),
      0,
    );
    const cutoff = newestObservedAt - rangeDays * 86_400_000;
    const leadsInRange = workspace.leads.filter(
      (lead) => new Date(lead.createdAt).valueOf() >= cutoff,
    ).length;
    return dashboard.overview.uniqueVisitors > 0
      ? (leadsInRange / dashboard.overview.uniqueVisitors) * 100
      : 0;
  }, [dashboard, rangeDays, workspace]);

  const updateLead = async (id: string, status: RuntimeLeadStatus) => {
    setBusyLeadId(id);
    setError("");
    try {
      const response = await fetch(`/api/admin/activity/leads/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const result = (await response.json()) as
        | { ok: true; workspace: RuntimeWorkspace }
        | { ok: false; message: string };
      if (!result.ok) throw new Error(result.message);
      setWorkspace(result.workspace);
      setMessage("线索状态已更新");
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "线索状态更新失败");
    } finally {
      setBusyLeadId("");
    }
  };

  const openRun = async (id: string) => {
    setBusyRunId(id);
    setError("");
    try {
      const response = await fetch(`/api/admin/activity/runs/${id}`, {
        cache: "no-store",
      });
      const result = (await response.json()) as
        | { ok: true; run: AiRunDetail }
        | { ok: false; message: string };
      if (!result.ok) throw new Error(result.message);
      setRunDetail(result.run);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "问答详情读取失败");
    } finally {
      setBusyRunId("");
    }
  };

  const saveSettings = async () => {
    setError("");
    setMessage("");
    if (
      !Number.isInteger(settings.retentionDays) ||
      settings.retentionDays < 1 ||
      settings.retentionDays > 90
    ) {
      setError("日志保留天数必须在 1 到 90 天之间");
      return;
    }
    try {
      const response = await fetch("/api/admin/activity/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const result = (await response.json()) as
        | { ok: true; settings: ObservabilitySettings }
        | { ok: false; message: string };
      if (!result.ok) throw new Error(result.message);
      setSettings(result.settings);
      setMessage("留存设置已保存");
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "留存设置保存失败");
    }
  };

  const cleanup = async () => {
    if (!window.confirm("确认立即清理超过当前保留期的监测记录？")) return;
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/admin/activity/cleanup", { method: "POST" });
      const result = (await response.json()) as { ok: boolean; message?: string };
      if (!result.ok) throw new Error(result.message ?? "清理失败");
      setMessage("到期监测记录已清理");
      await load(true);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "清理失败");
    }
  };

  const checkReadiness = async () => {
    setReadiness("检查中…");
    try {
      const response = await fetch("/api/health/ready", { cache: "no-store" });
      const result = (await response.json()) as { ok: boolean };
      setReadiness(result.ok ? "内容、知识库、Agent 与运行数据均可读取" : "存在不可读取的数据空间");
    } catch {
      setReadiness("深度检查暂时失败");
    }
  };

  if (!workspace || !dashboard) {
    return <section className="admin-module-loading"><span aria-hidden="true" />{error || "正在读取运营与运行数据…"}</section>;
  }

  const latestSystem = dashboard.systemSamples.at(-1);

  return (
    <div className="admin-activity-stack admin-operations-center">
      <section className="admin-activity-hero">
        <div>
          <span className="admin-kicker">OPERATIONS & OBSERVABILITY</span>
          <h2>运营总览</h2>
          <p>把访客转化、AI 与 RAG、请求审计和系统健康放在同一条可追踪链路中。</p>
        </div>
        <Activity aria-hidden size={34} />
      </section>

      <div className="admin-operations-toolbar">
        <div aria-label="运营与运行视图" className="admin-operations-tabs" role="tablist">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              aria-selected={activeTab === tab.id}
              className={activeTab === tab.id ? "is-active" : ""}
              onClick={() => setActiveTab(tab.id)}
              role="tab"
              type="button"
            >
              {tab.label}
            </button>
          ))}
        </div>
        <label>
          <span>统计范围</span>
          <select value={rangeDays} onChange={(event) => setRangeDays(Number(event.target.value))}>
            <option value={1}>近 24 小时</option>
            <option value={7}>近 7 天</option>
            <option value={30}>近 30 天</option>
            <option value={90}>近 90 天</option>
          </select>
        </label>
      </div>

      {error ? <div className="admin-form-error" role="alert">{error}</div> : null}
      {message ? <div className="admin-module-message" role="status"><CheckCircle2 aria-hidden size={15} />{message}</div> : null}

      {activeTab === "overview" ? (
        <>
          <section className="admin-activity-metrics">
            <article><UsersRound aria-hidden size={18} /><span><strong>{dashboard.overview.uniqueVisitors}</strong><small>独立访客</small></span></article>
            <article><Bot aria-hidden size={18} /><span><strong>{dashboard.overview.aiRuns}</strong><small>AI 问答</small></span></article>
            <article><MessageSquareText aria-hidden size={18} /><span><strong>{dashboard.overview.totalTokens.toLocaleString("zh-CN")}</strong><small>Token 消耗</small></span></article>
            <article><Gauge aria-hidden size={18} /><span><strong>{conversion.toFixed(1)}%</strong><small>访客留资率</small></span></article>
            <article><Activity aria-hidden size={18} /><span><strong>{dashboard.overview.requestErrors}</strong><small>异常请求</small></span></article>
          </section>
          <EditorPanel title="需要关注" description="只展示可行动的异常，不展示敏感正文。">
            {dashboard.alerts.length ? (
              <ul className="admin-operations-alerts">{dashboard.alerts.map((alert) => <li key={alert}>{alert}</li>)}</ul>
            ) : <div className="admin-activity-empty">当前没有需要处理的运行异常。</div>}
          </EditorPanel>
          <EditorPanel title="最近动态" description="用请求编号把访问、问答与异常串联起来。">
            <div className="admin-run-list">
              {dashboard.recentAiRuns.slice(0, 5).map((run) => (
                <article key={run.id} data-status={run.status}>
                  <div><span data-mode={run.mode}>{run.status}</span><small>{formatDate(run.createdAt)}</small></div>
                  <strong>{run.questionPreview}</strong>
                  <p>{run.actualModel ?? "未调用模型"} · {run.latencyMs ?? 0} ms · {run.totalTokens} Token</p>
                </article>
              ))}
            </div>
          </EditorPanel>
        </>
      ) : null}

      {activeTab === "visitors" ? (
        <>
          <EditorPanel title="访客路径" description="匿名访客标识仅用于站内行为串联，不采集完整 IP。">
            <div className="admin-activity-table">
              <div className="admin-activity-table__head"><span>时间</span><span>访客</span><span>行为</span><span>位置</span></div>
              {dashboard.recentBehaviorEvents.map((event) => (
                <article key={event.id}><span>{formatDate(event.createdAt)}</span><strong>{shortVisitor(event.visitorId)}</strong><span>{event.eventType}</span><span>{event.section ?? event.path}</span></article>
              ))}
            </div>
          </EditorPanel>
          <EditorPanel title="沟通线索" description="仅展示访客主动提交并同意处理的信息。">
            <div className="admin-lead-list">
              {workspace.leads.map((lead) => (
                <article key={lead.id} data-status={lead.status}>
                  <header><span><strong>{lead.name}</strong><small>{lead.role || "未填写角色"}</small></span><select aria-label={`${lead.name}的跟进状态`} disabled={busyLeadId === lead.id} value={lead.status} onChange={(event) => void updateLead(lead.id, event.target.value as RuntimeLeadStatus)}>{Object.entries(LEAD_STATUS_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></header>
                  <a href={`mailto:${lead.contact}`}>{lead.contact}</a><p>{lead.direction}</p>
                </article>
              ))}
            </div>
          </EditorPanel>
        </>
      ) : null}

      {activeTab === "ai" ? (
        <EditorPanel title="AI 与 RAG 运行" description="列表只展示摘要；完整问答仅在管理员主动查看时解密。">
          <div className="admin-run-list">
            {dashboard.recentAiRuns.map((run) => (
              <article key={run.id} data-status={run.status}>
                <div><span data-mode={run.mode}>{run.status}</span><small>{formatDate(run.createdAt)}</small></div>
                <strong>{run.questionPreview}</strong>
                <p>{run.configuredModel ?? "未配置"} → {run.actualModel ?? "未调用"} · RAG {run.retrievalCount} 段 · 首字 {run.firstTokenMs ?? 0} ms · 总耗时 {run.latencyMs ?? 0} ms</p>
                <footer><span>{run.promptTokens}/{run.completionTokens} Token</span><button className="admin-button" disabled={!run.transcriptAvailable || busyRunId === run.id} onClick={() => void openRun(run.id)} type="button">查看完整问答</button></footer>
              </article>
            ))}
          </div>
          {runDetail ? (
            <section aria-label="完整问答" className="admin-transcript-detail">
              <header><strong>完整问答</strong><button onClick={() => setRunDetail(null)} type="button">关闭</button></header>
              <div><small>访客问题</small><p>{runDetail.question || "未保存"}</p></div>
              <div><small>数字分身回答</small><p>{runDetail.answer || "未保存"}</p></div>
            </section>
          ) : null}
        </EditorPanel>
      ) : null}

      {activeTab === "requests" ? (
        <>
          <EditorPanel title="日志与问答留存" description="完整问答加密保存；到期记录可自动或立即清理。">
            <div className="admin-retention-settings">
              <label><span>保存完整访客问答</span><input checked={settings.transcriptEnabled} onChange={(event) => setSettings((current) => ({ ...current, transcriptEnabled: event.target.checked }))} type="checkbox" /></label>
              <label><span>日志保留天数</span><input aria-label="日志保留天数" min={1} max={90} type="number" value={settings.retentionDays} onChange={(event) => setSettings((current) => ({ ...current, retentionDays: Number(event.target.value) }))} /></label>
              <div><button className="admin-button is-primary" onClick={() => void saveSettings()} type="button">保存留存设置</button><button className="admin-button" onClick={() => void cleanup()} type="button">立即清理到期记录</button></div>
            </div>
          </EditorPanel>
          <EditorPanel title="请求与审计日志" description="不记录 Cookie、API Key、完整 IP、提示词或真实文件路径。">
            <div className="admin-activity-table">
              <div className="admin-activity-table__head"><span>时间</span><span>请求编号</span><span>状态</span><span>接口 / 耗时</span></div>
              {dashboard.recentRequests.map((request) => <article key={request.id}><span>{formatDate(request.createdAt)}</span><strong>{request.requestId.slice(-12)}</strong><span>{request.status}{request.errorType ? ` · ${request.errorType}` : ""}</span><span>{request.method} {request.route} · {request.durationMs} ms</span></article>)}
            </div>
          </EditorPanel>
        </>
      ) : null}

      {activeTab === "system" ? (
        <>
          <section className="admin-activity-metrics">
            <article><ServerCog aria-hidden size={18} /><span><strong>{latestSystem ? Math.round(latestSystem.uptimeSeconds / 60) : 0} 分钟</strong><small>运行时间</small></span></article>
            <article><Gauge aria-hidden size={18} /><span><strong>{latestSystem ? formatBytes(latestSystem.memoryBytes) : "--"}</strong><small>进程内存</small></span></article>
            <article><Activity aria-hidden size={18} /><span><strong>{latestSystem ? `${(latestSystem.eventLoopUtilization * 100).toFixed(1)}%` : "--"}</strong><small>事件循环负载</small></span></article>
            <article><Database aria-hidden size={18} /><span><strong>{latestSystem ? formatBytes(latestSystem.dbSizeBytes) : "--"}</strong><small>监测库体积</small></span></article>
            <article><Eye aria-hidden size={18} /><span><strong>{latestSystem ? formatBytes(latestSystem.diskFreeBytes) : "--"}</strong><small>磁盘可用</small></span></article>
          </section>
          <EditorPanel title="深度就绪检查" description="按需读取内容、知识库、Agent 和运行工作区，不参与每 20 秒存活探测。">
            <div className="admin-readiness-check"><button className="admin-button" onClick={() => void checkReadiness()} type="button"><RefreshCw aria-hidden size={15} />立即检查</button><span>{readiness || "尚未执行深度检查"}</span></div>
          </EditorPanel>
        </>
      ) : null}
    </div>
  );
}
