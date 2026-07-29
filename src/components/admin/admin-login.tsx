"use client";

import { LockKeyhole } from "lucide-react";
import { useState, type FormEvent } from "react";

export function AdminLogin({
  localFallback,
  onAuthenticated,
}: {
  localFallback: boolean;
  onAuthenticated: () => void;
}) {
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "error">(
    "idle",
  );
  const [message, setMessage] = useState("");

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus("submitting");
    setMessage("");
    try {
      const response = await fetch("/api/admin/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const result = (await response.json()) as {
        ok: boolean;
        message?: string;
      };
      if (!response.ok || !result.ok) {
        setStatus("error");
        setMessage(result.message ?? "登录失败");
        return;
      }
      setStatus("idle");
      onAuthenticated();
    } catch {
      setStatus("error");
      setMessage("暂时无法连接管理后台");
    }
  };

  return (
    <main className="admin-login-page">
      <section className="admin-login-card">
        <span className="admin-login-card__icon">
          <LockKeyhole aria-hidden size={22} />
        </span>
        <span className="admin-kicker">RICKY.TWIN / ADMIN</span>
        <h1>进入管理后台</h1>
        <p>维护前台内容、预览最终效果，并在确认后发布完整版本。</p>
        <form onSubmit={submit}>
          <label className="admin-field">
            <span>
              <strong>管理员密码</strong>
            </span>
            <input
              autoComplete="current-password"
              autoFocus
              onChange={(event) => setPassword(event.target.value)}
              placeholder="输入管理员密码"
              required
              type="password"
              value={password}
            />
          </label>
          {localFallback ? (
            <small className="admin-login-card__hint">
              本地开发密码：ricky-local
            </small>
          ) : null}
          {message ? (
            <div className="admin-form-error" role="alert">
              {message}
            </div>
          ) : null}
          <button
            className="admin-button is-primary"
            disabled={status === "submitting"}
            type="submit"
          >
            {status === "submitting" ? "正在验证…" : "登录后台"}
          </button>
        </form>
      </section>
    </main>
  );
}
