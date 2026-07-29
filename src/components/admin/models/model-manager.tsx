"use client";

import {
  Cable,
  CheckCircle2,
  CircleAlert,
  KeyRound,
  Play,
  Plus,
  Radio,
  Save,
  TestTube2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import {
  EditorPanel,
  TextField,
  ToggleField,
} from "@/components/admin/editor-fields";
import type { AdminAgentResponse } from "@/server/agent/agent-service";
import type {
  AdminAgentWorkspace,
  AdminModelConnection,
  ModelConnectionInput,
} from "@/server/agent/agent-types";

interface ModelDraft extends ModelConnectionInput {
  apiKey: string;
}

const EMPTY_MODEL: ModelDraft = {
  name: "",
  baseUrl: "",
  apiKey: "",
  modelId: "",
  enabled: true,
  timeoutMs: 30_000,
  maxOutputTokens: 1_200,
};

function draftFromModel(model: AdminModelConnection): ModelDraft {
  return {
    id: model.id,
    name: model.name,
    baseUrl: model.baseUrl,
    apiKey: "",
    modelId: model.modelId,
    enabled: model.enabled,
    timeoutMs: model.timeoutMs,
    maxOutputTokens: model.maxOutputTokens,
  };
}

function formatTestTime(value?: string) {
  if (!value) {
    return "尚未测试";
  }
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

export function ModelManager() {
  const [workspace, setWorkspace] =
    useState<AdminAgentWorkspace | null>(null);
  const [selectedId, setSelectedId] = useState("");
  const [draft, setDraft] = useState<ModelDraft>(EMPTY_MODEL);
  const [creating, setCreating] = useState(true);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const selected = useMemo(
    () => workspace?.models.find((model) => model.id === selectedId),
    [selectedId, workspace],
  );

  const applyWorkspace = (
    value: AdminAgentWorkspace,
    preferredId?: string,
  ) => {
    setWorkspace(value);
    const nextId =
      value.models.find((model) => model.id === preferredId)?.id ??
      value.models.find((model) => model.id === selectedId)?.id ??
      value.models[0]?.id ??
      "";
    if (nextId) {
      const next = value.models.find((model) => model.id === nextId);
      setSelectedId(nextId);
      setCreating(false);
      if (next) {
        setDraft(draftFromModel(next));
      }
    } else {
      setCreating(true);
      setSelectedId("");
      setDraft(EMPTY_MODEL);
    }
    setDirty(false);
  };

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const response = await fetch("/api/admin/models", {
          cache: "no-store",
        });
        const result = (await response.json()) as AdminAgentResponse;
        if (!active) {
          return;
        }
        if (!result.ok) {
          setError(result.message);
          return;
        }
        applyWorkspace(result.workspace);
      } catch {
        if (active) {
          setError("模型连接工作区暂时无法加载");
        }
      }
    };
    void load();
    return () => {
      active = false;
    };
    // Initial load must not rerun when selection changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const select = (model: AdminModelConnection) => {
    setSelectedId(model.id);
    setDraft(draftFromModel(model));
    setCreating(false);
    setDirty(false);
    setError("");
    setMessage("");
  };

  const change = (patch: Partial<ModelDraft>) => {
    setDraft((value) => ({ ...value, ...patch }));
    setDirty(true);
    setError("");
    setMessage("");
  };

  const save = async () => {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const target = creating
        ? "/api/admin/models"
        : `/api/admin/models/${selectedId}`;
      const response = await fetch(target, {
        method: creating ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const result = (await response.json()) as AdminAgentResponse;
      if (!result.ok) {
        setError(result.message);
        return;
      }
      const newest =
        creating
          ? result.workspace.models.at(-1)?.id
          : selectedId;
      applyWorkspace(result.workspace, newest);
      setMessage(result.message ?? "模型连接已保存");
    } catch {
      setError("模型连接保存失败");
    } finally {
      setBusy(false);
    }
  };

  const runAction = async (
    action: "test" | "activate",
    successFallback: string,
  ) => {
    if (!selectedId || dirty) {
      setError("请先保存当前模型连接");
      return;
    }
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch(
        `/api/admin/models/${selectedId}/${action}`,
        { method: "POST" },
      );
      const result = (await response.json()) as AdminAgentResponse;
      if (result.workspace) {
        applyWorkspace(result.workspace, selectedId);
      }
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setMessage(result.message ?? successFallback);
    } catch {
      setError(
        action === "test" ? "模型连接测试失败" : "主模型切换失败",
      );
    } finally {
      setBusy(false);
    }
  };

  if (!workspace) {
    return (
      <section className="admin-module-loading">
        <span aria-hidden="true" />
        {error || "正在读取模型连接…"}
      </section>
    );
  }

  return (
    <div className="admin-model-layout">
      <aside className="admin-model-list">
        <header>
          <div>
            <span className="admin-kicker">CONNECTIONS</span>
            <h2>模型连接</h2>
          </div>
          <button
            aria-label="新建模型连接"
            onClick={() => {
              setCreating(true);
              setSelectedId("");
              setDraft(EMPTY_MODEL);
              setDirty(false);
              setError("");
              setMessage("");
            }}
            type="button"
          >
            <Plus aria-hidden size={16} />
          </button>
        </header>
        {workspace.models.length ? (
          <div className="admin-model-list__items">
            {workspace.models.map((model) => (
              <button
                key={model.id}
                className={selectedId === model.id ? "is-active" : ""}
                onClick={() => select(model)}
                type="button"
              >
                <span>
                  <strong>{model.name}</strong>
                  {workspace.activeModelId === model.id ? (
                    <em>
                      <Radio aria-hidden size={10} />
                      会客厅使用中
                    </em>
                  ) : null}
                </span>
                <small>{model.modelId}</small>
                <i data-status={model.lastTestStatus ?? "idle"}>
                  {model.lastTestStatus === "success"
                    ? "连接正常"
                    : model.lastTestStatus === "error"
                      ? "测试失败"
                      : "尚未测试"}
                </i>
              </button>
            ))}
          </div>
        ) : (
          <div className="admin-model-empty">
            <Cable aria-hidden size={23} />
            <strong>还没有模型连接</strong>
            <p>配置一个 OpenAI 兼容接口，即可为 AI 会客厅提供回答能力。</p>
          </div>
        )}
      </aside>

      <div className="admin-editor-stack">
        <section className="admin-model-guide">
          <KeyRound aria-hidden size={20} />
          <div>
            <strong>轻量模型管理</strong>
            <p>
              只维护连接、模型 ID 和 API Key。Agent
              行为协议独立保存，所以切换模型不会丢失角色和权限规则。
            </p>
          </div>
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
          action={
            <button
              aria-label="保存模型连接"
              className="admin-button is-primary"
              disabled={busy || (!dirty && !creating)}
              onClick={() => void save()}
              type="button"
            >
              <Save aria-hidden size={15} />
              保存连接
            </button>
          }
          description="支持 OpenAI API 兼容格式。API Key 仅在服务端加密保存，页面不会再次返回明文。"
          title={creating ? "新建模型连接" : "编辑模型连接"}
        >
          <div className="admin-form-grid is-two">
            <TextField
              aria-label="连接名称"
              label="连接名称"
              onChange={(event) => change({ name: event.target.value })}
              placeholder="例如：会客厅主模型"
              value={draft.name}
            />
            <TextField
              aria-label="模型 ID"
              label="模型 ID"
              onChange={(event) => change({ modelId: event.target.value })}
              placeholder="例如：gpt-5-mini"
              value={draft.modelId}
            />
          </div>
          <TextField
            aria-label="Base URL"
            hint="填写到 /v1，系统自动调用 /chat/completions"
            label="Base URL"
            onChange={(event) => change({ baseUrl: event.target.value })}
            placeholder="https://api.example.com/v1"
            value={draft.baseUrl}
          />
          <TextField
            aria-label="API Key"
            hint={
              selected?.apiKeyConfigured
                ? `当前密钥 ${selected.apiKeyHint}；留空表示不更换`
                : "首次保存必须填写"
            }
            label="API Key"
            onChange={(event) => change({ apiKey: event.target.value })}
            placeholder={
              selected?.apiKeyConfigured
                ? "留空保留当前密钥"
                : "sk-..."
            }
            type="password"
            value={draft.apiKey}
          />
          {selected?.apiKeyConfigured ? (
            <div className="admin-model-secret">
              <KeyRound aria-hidden size={14} />
              已安全配置：<strong>{selected.apiKeyHint}</strong>
            </div>
          ) : null}
          <div className="admin-form-grid is-two">
            <TextField
              aria-label="连接超时毫秒"
              hint="建议 30000–60000"
              label="连接超时（毫秒）"
              min={1}
              onChange={(event) =>
                change({ timeoutMs: Number(event.target.value) })
              }
              type="number"
              value={draft.timeoutMs}
            />
            <TextField
              aria-label="最大输出 Token"
              hint="同时受 Agent 规则限制"
              label="最大输出 Token"
              min={1}
              onChange={(event) =>
                change({
                  maxOutputTokens: Number(event.target.value),
                })
              }
              type="number"
              value={draft.maxOutputTokens}
            />
          </div>
          <ToggleField
            checked={draft.enabled}
            description="停用后无法设为会客厅当前模型"
            label="启用这个连接"
            onChange={(enabled) => change({ enabled })}
          />
          {!creating && selected ? (
            <div className="admin-model-runtime">
              <article data-status={selected.lastTestStatus ?? "idle"}>
                {selected.lastTestStatus === "success" ? (
                  <CheckCircle2 aria-hidden size={17} />
                ) : (
                  <CircleAlert aria-hidden size={17} />
                )}
                <span>
                  <strong>
                    {selected.lastTestStatus === "success"
                      ? "最近测试成功"
                      : selected.lastTestStatus === "error"
                        ? "最近测试失败"
                        : "尚未执行连接测试"}
                  </strong>
                  <small>
                    {formatTestTime(selected.lastTestAt)}
                    {selected.lastTestMessage
                      ? ` · ${selected.lastTestMessage}`
                      : ""}
                  </small>
                </span>
              </article>
              <div>
                <button
                  className="admin-button is-secondary"
                  disabled={busy || dirty}
                  onClick={() =>
                    void runAction("test", "模型连接测试成功")
                  }
                  type="button"
                >
                  <TestTube2 aria-hidden size={15} />
                  测试连接
                </button>
                <button
                  className="admin-button is-primary"
                  disabled={
                    busy ||
                    dirty ||
                    !selected.enabled ||
                    workspace.activeModelId === selected.id
                  }
                  onClick={() =>
                    void runAction("activate", "会客厅主模型已切换")
                  }
                  type="button"
                >
                  <Play aria-hidden size={15} />
                  {workspace.activeModelId === selected.id
                    ? "当前主模型"
                    : "设为主模型"}
                </button>
              </div>
            </div>
          ) : null}
        </EditorPanel>
      </div>
    </div>
  );
}
