import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { UpdateSystemStatus } from "@/server/update/update-types";

import { SystemUpdateManager } from "./system-update-manager";

const baseStatus: UpdateSystemStatus = {
  currentVersion: "0.1.0",
  currentCommit: "33125af",
  runtimeEnvironment: "production",
  dataSchemaVersion: 1,
  updaterVersion: "1.0.0",
  updaterEnabled: true,
  releaseCheckEnabled: true,
  latestManifest: {
    schemaVersion: 1,
    version: "0.2.0",
    releaseTag: "v0.2.0",
    image: "ghcr.io/ricky940828/ricky.twin@sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    publishedAt: "2026-08-12T00:00:00.000Z",
    minimumDataSchemaVersion: 1,
    maximumDataSchemaVersion: 1,
    requiredUpdaterVersion: "1.0.0",
    notes: ["保护知识库和后台配置", "支持失败自动回滚"],
  },
  updateAvailable: true,
  compatible: true,
  compatibilityMessage: "数据与更新器兼容，可以安全更新",
  lastCheckedAt: "2026-08-12T01:00:00.000Z",
  lastBackupId: "backup-1",
  job: null,
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("SystemUpdateManager", () => {
  it("shows versions, compatibility, release notes and update controls", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ ok: true, status: baseStatus })));

    render(<SystemUpdateManager />);

    expect(await screen.findByText("当前版本 0.1.0")).toBeInTheDocument();
    expect(screen.getByText("发现新版本 0.2.0")).toBeInTheDocument();
    expect(screen.getByText("保护知识库和后台配置")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "检查更新" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "一键更新并重启" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "回滚上一版本" })).toBeEnabled();
  });

  it("requires confirmation before sending the update request", async () => {
    const fetcher = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input).endsWith("/apply") && init?.method === "POST") {
        return Response.json({
          ok: true,
          status: { ...baseStatus, job: { id: "job-1", action: "update", phase: "requested", requestedAt: "", updatedAt: "", fromVersion: "0.1.0", targetVersion: "0.2.0", message: "等待更新器" } },
        });
      }
      return Response.json({ ok: true, status: baseStatus });
    });
    vi.stubGlobal("fetch", fetcher);
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
    const user = userEvent.setup();
    render(<SystemUpdateManager />);
    await screen.findByText("当前版本 0.1.0");

    await user.click(screen.getByRole("button", { name: "一键更新并重启" }));

    expect(confirm).toHaveBeenCalledWith(expect.stringContaining("自动备份"));
    await waitFor(() =>
      expect(fetcher).toHaveBeenCalledWith(
        "/api/admin/system/update/apply",
        expect.objectContaining({ method: "POST" }),
      ),
    );
  });

  it("disables update when the host updater is unavailable", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ ok: true, status: { ...baseStatus, updaterEnabled: false, compatible: false, compatibilityMessage: "宿主更新器尚未安装或未上报状态" } })));

    render(<SystemUpdateManager />);

    expect(await screen.findByText("宿主更新器尚未安装或未上报状态")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "一键更新并重启" })).toBeDisabled();
  });

  it("explains that managed updates are intentionally unavailable in local development", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({
      ok: true,
      status: {
        ...baseStatus,
        currentVersion: "0.2.0",
        currentCommit: "development",
        runtimeEnvironment: "development",
        updaterEnabled: false,
        releaseCheckEnabled: false,
        compatible: true,
        compatibilityMessage: "尚未检查最新版本",
        latestManifest: null,
      },
    })));

    render(<SystemUpdateManager />);

    expect(await screen.findByText("本地开发预览")).toBeInTheDocument();
    expect(screen.getByText("当前版本 0.2.0")).toBeInTheDocument();
    expect(screen.getByText(/正式部署到服务器后启用/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "一键更新并重启" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "检查更新" })).toBeDisabled();
  });

  it("keeps version checks available after a previous update has finished", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({
      ok: true,
      status: {
        ...baseStatus,
        currentVersion: "0.2.0",
        updateAvailable: false,
        job: {
          id: "job-1",
          action: "update",
          phase: "succeeded",
          requestedAt: "2026-08-12T00:00:00.000Z",
          updatedAt: "2026-08-12T00:02:00.000Z",
          fromVersion: "0.1.0",
          targetVersion: "0.2.0",
          message: "更新完成",
        },
      },
    })));

    render(<SystemUpdateManager />);

    expect(await screen.findByText("更新成功")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "检查更新" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "一键更新并重启" })).toBeDisabled();
  });

  it("distinguishes an unchecked installation from the latest version", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({
      ok: true,
      status: {
        ...baseStatus,
        latestManifest: null,
        lastCheckedAt: null,
        updateAvailable: false,
        compatibilityMessage: "尚未检查最新版本",
      },
    })));

    render(<SystemUpdateManager />);

    expect(await screen.findByText("尚未检查更新")).toBeInTheDocument();
  });
});
