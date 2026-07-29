"use client";

import {
  Activity,
  Bot,
  CheckCircle2,
  Clock3,
  Eye,
  MessageSquareText,
  UsersRound,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { EditorPanel } from "@/components/admin/editor-fields";
import type {
  RuntimeLeadStatus,
  RuntimeWorkspace,
} from "@/server/runtime/runtime-types";

type ActivityResponse =
  | { ok: true; workspace: RuntimeWorkspace }
  | { ok: false; message: string };

const LEAD_STATUS_LABEL: Record<RuntimeLeadStatus, string> = {
  new: "待跟进",
  contacted: "已联系",
  closed: "已关闭",
};

function dayKey(value: string | Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(typeof value === "string" ? new Date(value) : value);
}

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
  return value.length > 15
    ? `${value.slice(0, 8)}…${value.slice(-5)}`
    : value;
}

export function ActivityManager() {
  const [workspace, setWorkspace] =
    useState<RuntimeWorkspace | null>(null);
  const [busyLeadId, setBusyLeadId] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const response = await fetch("/api/admin/activity", {
          cache: "no-store",
        });
        const result = (await response.json()) as ActivityResponse;
        if (!active) {
          return;
        }
        if (!result.ok) {
          setError(result.message);
          return;
        }
        setWorkspace(result.workspace);
      } catch {
        if (active) {
          setError("访客与运行记录暂时无法加载");
        }
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, []);

  const metrics = useMemo(() => {
    const today = dayKey(new Date());
    const visits =
      workspace?.visits.filter(
        (visit) => dayKey(visit.createdAt) === today,
      ) ?? [];
    const runs =
      workspace?.runs.filter((run) => dayKey(run.createdAt) === today) ??
      [];
    const leads =
      workspace?.leads.filter(
        (lead) => dayKey(lead.createdAt) === today,
      ) ?? [];
    return {
      visits: visits.length,
      visitors: new Set(visits.map((visit) => visit.visitorId)).size,
      runs: runs.length,
      tokens: runs.reduce(
        (sum, run) => sum + (run.totalTokens ?? 0),
        0,
      ),
      leads: leads.length,
    };
  }, [workspace]);

  const updateLead = async (
    id: string,
    status: RuntimeLeadStatus,
  ) => {
    setBusyLeadId(id);
    setError("");
    setMessage("");
    try {
      const response = await fetch(`/api/admin/activity/leads/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const result = (await response.json()) as ActivityResponse;
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setWorkspace(result.workspace);
      setMessage("线索状态已更新");
    } catch {
      setError("线索状态更新失败");
    } finally {
      setBusyLeadId("");
    }
  };

  if (!workspace) {
    return (
      <section className="admin-module-loading">
        <span aria-hidden="true" />
        {error || "正在读取访客与运行记录…"}
      </section>
    );
  }

  const recentVisits = [...workspace.visits].reverse().slice(0, 20);
  const recentRuns = [...workspace.runs].reverse().slice(0, 20);
  const recentLeads = [...workspace.leads].reverse().slice(0, 20);

  return (
    <div className="admin-activity-stack">
      <section className="admin-activity-hero">
        <div>
          <span className="admin-kicker">TODAY · ASIA/SHANGHAI</span>
          <h2>访客、对话和沟通线索在同一处查看</h2>
          <p>
            只记录运营所需的最小信息，不保存模型完整回答；联系方式在磁盘中加密。
          </p>
        </div>
        <Activity aria-hidden size={34} />
      </section>

      <section className="admin-activity-metrics">
        <article>
          <Eye aria-hidden size={18} />
          <span>
            <strong>{metrics.visits}</strong>
            <small>今日浏览</small>
          </span>
        </article>
        <article>
          <UsersRound aria-hidden size={18} />
          <span>
            <strong>{metrics.visitors} 位</strong>
            <small>独立访客</small>
          </span>
        </article>
        <article>
          <Bot aria-hidden size={18} />
          <span>
            <strong>{metrics.runs}</strong>
            <small>AI 问题</small>
          </span>
        </article>
        <article>
          <MessageSquareText aria-hidden size={18} />
          <span>
            <strong>{metrics.tokens.toLocaleString("zh-CN")}</strong>
            <small>今日 Token</small>
          </span>
        </article>
        <article>
          <CheckCircle2 aria-hidden size={18} />
          <span>
            <strong>{metrics.leads}</strong>
            <small>新增线索</small>
          </span>
        </article>
      </section>

      {error ? (
        <div className="admin-form-error" role="alert">
          {error}
        </div>
      ) : null}
      {message ? (
        <div className="admin-module-message" role="status">
          <CheckCircle2 aria-hidden size={15} />
          {message}
        </div>
      ) : null}

      <EditorPanel
        description="页面加载即记录一次浏览；同一浏览器通过匿名访客标识统计，不采集 IP。"
        title="最近访客"
      >
        {recentVisits.length ? (
          <div className="admin-activity-table">
            <div className="admin-activity-table__head">
              <span>时间</span>
              <span>访客</span>
              <span>身份</span>
              <span>页面 / 设备</span>
            </div>
            {recentVisits.map((visit) => (
              <article key={visit.id}>
                <span>{formatDate(visit.createdAt)}</span>
                <strong>{shortVisitor(visit.visitorId)}</strong>
                <span>
                  {visit.authenticated ? "已登录" : "匿名访客"}
                </span>
                <span>
                  {visit.path} · {visit.userAgentGroup}
                </span>
              </article>
            ))}
          </div>
        ) : (
          <div className="admin-activity-empty">还没有公开站浏览记录。</div>
        )}
      </EditorPanel>

      <EditorPanel
        description="问题仅保留短预览；完整回答、提示词、API Key 和真实文件路径均不进入运行日志。"
        title="AI 对话运行"
      >
        {recentRuns.length ? (
          <div className="admin-run-list">
            {recentRuns.map((run) => (
              <article key={run.id} data-status={run.status}>
                <div>
                  <span data-mode={run.mode ?? "blocked"}>
                    {run.mode === "live"
                      ? "实时"
                      : run.mode === "demo"
                        ? "演示"
                        : "拦截"}
                  </span>
                  <small>{formatDate(run.createdAt)}</small>
                </div>
                <strong>{run.questionPreview || "空问题"}</strong>
                <p>
                  {run.modelName ?? "未调用模型"} · 召回{" "}
                  {run.retrievalCount ?? 0} · {run.latencyMs ?? 0} ms ·{" "}
                  {(run.totalTokens ?? 0).toLocaleString("zh-CN")} Token
                </p>
                <footer>
                  <span>{shortVisitor(run.visitorId)}</span>
                  <span>
                    动作：
                    {run.nextAction === "leave-contact"
                      ? "留资"
                      : run.nextAction === "request-access"
                        ? "权限申请"
                        : "无"}
                  </span>
                </footer>
              </article>
            ))}
          </div>
        ) : (
          <div className="admin-activity-empty">还没有 AI 对话运行记录。</div>
        )}
      </EditorPanel>

      <EditorPanel
        description="访客主动同意后提交。联系方式只在管理后台解密展示。"
        title="沟通线索"
      >
        {recentLeads.length ? (
          <div className="admin-lead-list">
            {recentLeads.map((lead) => (
              <article key={lead.id} data-status={lead.status}>
                <header>
                  <span>
                    <strong>{lead.name}</strong>
                    <small>{lead.role || "未填写机构或角色"}</small>
                  </span>
                  <label>
                    <span className="sr-only">{lead.name}的跟进状态</span>
                    <select
                      aria-label={`${lead.name}的跟进状态`}
                      disabled={busyLeadId === lead.id}
                      onChange={(event) =>
                        void updateLead(
                          lead.id,
                          event.target.value as RuntimeLeadStatus,
                        )
                      }
                      value={lead.status}
                    >
                      {Object.entries(LEAD_STATUS_LABEL).map(
                        ([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ),
                      )}
                    </select>
                  </label>
                </header>
                <a href={`mailto:${lead.contact}`}>{lead.contact}</a>
                <p>{lead.direction || "未填写具体沟通方向"}</p>
                <footer>
                  <Clock3 aria-hidden size={12} />
                  {formatDate(lead.createdAt)} ·{" "}
                  {shortVisitor(lead.visitorId)}
                </footer>
              </article>
            ))}
          </div>
        ) : (
          <div className="admin-activity-empty">还没有访客提交沟通意向。</div>
        )}
      </EditorPanel>
    </div>
  );
}
