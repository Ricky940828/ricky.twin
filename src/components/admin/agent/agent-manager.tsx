"use client";

import {
  BookOpenCheck,
  Bot,
  CheckCircle2,
  Gauge,
  LockKeyhole,
  Save,
  Send,
  ShieldCheck,
  Wrench,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import {
  EditorPanel,
  TextAreaField,
  TextField,
  ToggleField,
} from "@/components/admin/editor-fields";
import type { AdminAgentResponse } from "@/server/agent/agent-service";
import type {
  AdminAgentWorkspace,
  AgentConfig,
  AgentPromptProtocol,
  AgentUsagePolicy,
} from "@/server/agent/agent-types";
import type {
  AdminKnowledgeResponse,
  AdminKnowledgeWorkspace,
} from "@/server/knowledge/knowledge-service";

const PROMPT_FIELDS: Array<{
  key: keyof AgentPromptProtocol;
  label: string;
  hint: string;
  rows: number;
}> = [
  {
    key: "identity",
    label: "身份与角色",
    hint: "模型首先理解“我是谁”",
    rows: 3,
  },
  {
    key: "scope",
    label: "主要回答范围",
    hint: "定义擅长回答与应谨慎回答的主题",
    rows: 3,
  },
  {
    key: "style",
    label: "表达风格",
    hint: "换模型后仍保持统一表达",
    rows: 3,
  },
  {
    key: "knowledgeRules",
    label: "知识使用规则",
    hint: "如何引用、如何处理证据不足",
    rows: 3,
  },
  {
    key: "permissionBoundary",
    label: "知识权限边界",
    hint: "未授权内容如何回应",
    rows: 3,
  },
  {
    key: "commitmentBoundary",
    label: "承诺边界",
    hint: "不得替本人作出承诺或报价",
    rows: 3,
  },
  {
    key: "responseStructure",
    label: "回答结构",
    hint: "控制回答组织方式",
    rows: 3,
  },
  {
    key: "conversionRules",
    label: "进一步沟通引导",
    hint: "何时留资、何时申请知识权限",
    rows: 3,
  },
  {
    key: "prohibited",
    label: "禁止事项",
    hint: "系统提示词、密钥、真实路径等",
    rows: 3,
  },
];

const USAGE_FIELDS: Array<{
  key: keyof AgentUsagePolicy;
  label: string;
  hint: string;
}> = [
  {
    key: "anonymousPerMinute",
    label: "匿名访客 / 分钟",
    hint: "防止短时刷问",
  },
  {
    key: "anonymousDailyQuestions",
    label: "匿名访客 / 日",
    hint: "单访客每日问题数",
  },
  {
    key: "registeredDailyQuestions",
    label: "登录访客 / 日",
    hint: "已注册但未授权",
  },
  {
    key: "authorizedDailyQuestions",
    label: "授权访客 / 日",
    hint: "获得扩展知识权限",
  },
  {
    key: "maxInputChars",
    label: "单次输入字数",
    hint: "超出时前端提示精简",
  },
  {
    key: "maxOutputTokens",
    label: "单次输出 Token",
    hint: "最终仍受模型上限约束",
  },
  {
    key: "maxSessionTurns",
    label: "单会话轮数",
    hint: "限制带入的历史轮次",
  },
  {
    key: "maxConcurrentRuns",
    label: "并发请求数",
    hint: "保护模型服务",
  },
  {
    key: "siteDailyTokenBudget",
    label: "全站每日 Token",
    hint: "总预算熔断线",
  },
];

const TOOL_MODE_LABEL = {
  required: "必需",
  optional: "可配置",
  forbidden: "禁止",
} as const;

function formatVersionDate(value: string) {
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

export function AgentManager() {
  const [workspace, setWorkspace] =
    useState<AdminAgentWorkspace | null>(null);
  const [knowledge, setKnowledge] =
    useState<AdminKnowledgeWorkspace | null>(null);
  const [draft, setDraft] = useState<AgentConfig | null>(null);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const activeModel = useMemo(
    () =>
      workspace?.models.find(
        (model) => model.id === workspace.activeModelId,
      ),
    [workspace],
  );

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const [agentResponse, knowledgeResponse] = await Promise.all([
          fetch("/api/admin/agent", { cache: "no-store" }),
          fetch("/api/admin/knowledge", { cache: "no-store" }),
        ]);
        const agentResult =
          (await agentResponse.json()) as AdminAgentResponse;
        const knowledgeResult =
          (await knowledgeResponse.json()) as AdminKnowledgeResponse;
        if (!active) {
          return;
        }
        if (!agentResult.ok) {
          setError(agentResult.message);
          return;
        }
        setWorkspace(agentResult.workspace);
        setDraft(structuredClone(agentResult.workspace.draft));
        if (knowledgeResult.ok) {
          setKnowledge(knowledgeResult.workspace);
        }
      } catch {
        if (active) {
          setError("Agent 工作区暂时无法加载");
        }
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, []);

  const change = (next: AgentConfig) => {
    setDraft(next);
    setDirty(true);
    setMessage("");
    setError("");
  };

  const save = async () => {
    if (!draft) {
      return;
    }
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/admin/agent", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config: draft }),
      });
      const result = (await response.json()) as AdminAgentResponse;
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setWorkspace(result.workspace);
      setDraft(structuredClone(result.workspace.draft));
      setDirty(false);
      setMessage(result.message ?? "Agent 草稿已保存");
    } catch {
      setError("Agent 草稿保存失败，当前修改仍保留在页面中");
    } finally {
      setBusy(false);
    }
  };

  const publish = async () => {
    if (dirty) {
      setError("请先保存 Agent 草稿，再发布到 AI 会客厅");
      return;
    }
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/admin/agent/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          note: `Agent 行为协议更新 · ${new Date().toLocaleDateString("zh-CN")}`,
        }),
      });
      const result = (await response.json()) as AdminAgentResponse;
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setWorkspace(result.workspace);
      setDraft(structuredClone(result.workspace.draft));
      setMessage(result.message ?? "Agent 配置已发布");
    } catch {
      setError("Agent 发布失败，线上仍使用上一版本");
    } finally {
      setBusy(false);
    }
  };

  if (!workspace || !draft) {
    return (
      <section className="admin-module-loading">
        <span aria-hidden="true" />
        {error || "正在读取 Agent 行为协议…"}
      </section>
    );
  }

  return (
    <div className="admin-agent-stack">
      <section className="admin-agent-hero">
        <div>
          <span className="admin-kicker">MODEL-INDEPENDENT BEHAVIOR</span>
          <h2>先固定行为协议，再自由切换模型</h2>
          <p>
            身份、知识边界、工具权限和用量保护由服务端执行；模型只负责理解与生成。
          </p>
        </div>
        <div className="admin-agent-hero__actions">
          <button
            aria-label="保存 Agent 草稿"
            className="admin-button is-secondary"
            disabled={busy || !dirty}
            onClick={() => void save()}
            type="button"
          >
            <Save aria-hidden size={15} />
            保存草稿
          </button>
          <button
            aria-label="发布 Agent 配置"
            className="admin-button is-primary"
            disabled={busy || dirty}
            onClick={() => void publish()}
            type="button"
          >
            <Send aria-hidden size={15} />
            发布到会客厅
          </button>
        </div>
      </section>

      <section className="admin-agent-metrics">
        <article>
          <Bot aria-hidden />
          <span>
            <small>线上行为版本</small>
            <strong>{workspace.publishedVersion.note}</strong>
            <em>
              {formatVersionDate(workspace.publishedVersion.createdAt)}
            </em>
          </span>
        </article>
        <article>
          <BookOpenCheck aria-hidden />
          <span>
            <small>关联知识边界</small>
            <strong>{draft.knowledgeBaseIds.length} 个知识库</strong>
            <em>检索前先校验访客权限</em>
          </span>
        </article>
        <article>
          <Gauge aria-hidden />
          <span>
            <small>当前会客厅模型</small>
            <strong>{activeModel?.name ?? "尚未启用"}</strong>
            <em>{activeModel?.modelId ?? "请到模型连接中配置"}</em>
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
        description="这些字段会被服务端编译成统一系统协议，不依赖具体模型厂商。"
        title="角色与回答规范"
      >
        <TextField
          aria-label="Agent 名称"
          label="Agent 名称"
          onChange={(event) =>
            change({ ...draft, name: event.target.value })
          }
          value={draft.name}
        />
        <div className="admin-agent-prompt-grid">
          {PROMPT_FIELDS.map((field) => (
            <TextAreaField
              key={field.key}
              aria-label={field.label}
              hint={field.hint}
              label={field.label}
              onChange={(event) =>
                change({
                  ...draft,
                  prompt: {
                    ...draft.prompt,
                    [field.key]: event.target.value,
                  },
                })
              }
              rows={field.rows}
              value={draft.prompt[field.key]}
            />
          ))}
        </div>
      </EditorPanel>

      <EditorPanel
        description="只关联允许 Agent 使用的语义知识库。实际检索还会再次与访客权限取交集。"
        title="知识库关联"
      >
        {knowledge?.bases.length ? (
          <div className="admin-agent-knowledge-grid">
            {knowledge.bases.map((base) => {
              const checked = draft.knowledgeBaseIds.includes(base.id);
              return (
                <label key={base.id}>
                  <input
                    aria-label={base.name}
                    checked={checked}
                    onChange={(event) =>
                      change({
                        ...draft,
                        knowledgeBaseIds: event.target.checked
                          ? [...draft.knowledgeBaseIds, base.id]
                          : draft.knowledgeBaseIds.filter(
                              (id) => id !== base.id,
                            ),
                      })
                    }
                    type="checkbox"
                  />
                  <span>
                    <strong>{base.name}</strong>
                    <small>
                      {base.ragEnabled ? "参与 RAG" : "已暂停 RAG"} ·{" "}
                      {base.defaultAccess === "public"
                        ? "公开"
                        : base.defaultAccess === "authorized"
                          ? "需授权"
                          : "仅本人"}
                    </small>
                  </span>
                  <i aria-hidden="true" />
                </label>
              );
            })}
          </div>
        ) : (
          <div className="admin-agent-empty">
            <BookOpenCheck aria-hidden size={22} />
            <p>还没有可关联的知识库，请先在“知识库”模块创建。</p>
          </div>
        )}
      </EditorPanel>

      <EditorPanel
        description="必需项由服务端强制执行；禁止项不会出现在模型可调用工具中。"
        title="工具权限"
      >
        <div className="admin-agent-tools">
          {draft.tools.map((tool, index) => (
            <article key={tool.id} data-mode={tool.mode}>
              <div className="admin-agent-tools__icon">
                {tool.mode === "required" ? (
                  <ShieldCheck aria-hidden size={17} />
                ) : tool.mode === "forbidden" ? (
                  <LockKeyhole aria-hidden size={17} />
                ) : (
                  <Wrench aria-hidden size={17} />
                )}
              </div>
              <span>
                <strong>{tool.label}</strong>
                <small>{tool.description}</small>
              </span>
              <em>{TOOL_MODE_LABEL[tool.mode]}</em>
              <ToggleField
                checked={tool.enabled}
                label={`${tool.label}状态`}
                onChange={(enabled) => {
                  if (tool.mode !== "optional") {
                    return;
                  }
                  const tools = [...draft.tools];
                  tools[index] = { ...tool, enabled };
                  change({ ...draft, tools });
                }}
              />
            </article>
          ))}
        </div>
      </EditorPanel>

      <EditorPanel
        description="限额在模型调用前执行，不依赖模型是否遵守提示词。"
        title="用量与成本保护"
      >
        <div className="admin-form-grid is-three">
          {USAGE_FIELDS.map((field) => (
            <TextField
              key={field.key}
              aria-label={field.label}
              hint={field.hint}
              label={field.label}
              min={1}
              onChange={(event) =>
                change({
                  ...draft,
                  usage: {
                    ...draft.usage,
                    [field.key]: Number(event.target.value),
                  },
                })
              }
              type="number"
              value={draft.usage[field.key]}
            />
          ))}
        </div>
      </EditorPanel>
    </div>
  );
}
