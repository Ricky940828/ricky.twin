import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { siteContent } from "@/content/site-content";
import type { ContentWorkspace } from "@/server/content/content-workspace";

import { AdminWorkspace } from "@/app/admin/admin-workspace";

function workspace(): ContentWorkspace {
  return {
    draft: structuredClone(siteContent),
    published: structuredClone(siteContent),
    publishedVersion: {
      id: "seed-v1",
      createdAt: "2026-07-30T00:00:00.000Z",
      note: "初始公开版本",
    },
    versions: [
      {
        id: "seed-v1",
        createdAt: "2026-07-30T00:00:00.000Z",
        note: "初始公开版本",
      },
    ],
    draftUpdatedAt: "2026-07-30T00:00:00.000Z",
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("AdminWorkspace", () => {
  it("shows a separate admin login when there is no session", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({
          authenticated: false,
          configured: true,
          localFallback: true,
        }),
      ),
    );

    render(<AdminWorkspace />);

    expect(
      await screen.findByRole("heading", { name: "进入管理后台" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/本地开发密码/)).toBeInTheDocument();
  });

  it("edits structured content, marks it unsaved and sends a complete snapshot", async () => {
    const initialWorkspace = workspace();
    const requests: Array<{ url: string; init?: RequestInit }> = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        requests.push({ url, init });
        if (url.endsWith("/api/admin/session/status")) {
          return Response.json({
            authenticated: true,
            configured: true,
            localFallback: false,
          });
        }
        if (url.endsWith("/api/admin/content") && init?.method === "PUT") {
          const body = JSON.parse(String(init.body)) as {
            content: typeof siteContent;
          };
          return Response.json({
            ok: true,
            workspace: {
              ...initialWorkspace,
              draft: body.content,
              draftUpdatedAt: "2026-07-30T01:00:00.000Z",
            },
          });
        }
        return Response.json({ ok: true, workspace: initialWorkspace });
      }),
    );
    const user = userEvent.setup();

    render(<AdminWorkspace />);

    const statement = await screen.findByLabelText("首页主张");
    await user.clear(statement);
    await user.type(statement, "后台实时修改后的首页主张");
    await user.click(screen.getByLabelText("展示实践现场"));
    expect(screen.getByText("未保存")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "职业路线" }));
    await user.selectOptions(screen.getByLabelText("选择职业阶段"), "haibei");
    await user.clear(screen.getByLabelText("阶段定位"));
    await user.type(
      screen.getByLabelText("阶段定位"),
      "新的交易结构与商业判断定位",
    );

    await user.click(screen.getByRole("button", { name: "项目主题" }));
    await user.selectOptions(
      screen.getByLabelText("选择项目主题"),
      "asset-fund-standardization",
    );
    expect(
      screen.getByLabelText("项目标题"),
    ).toHaveValue("资产资金标准化");

    await user.click(screen.getByRole("button", { name: "保存草稿" }));

    await waitFor(() =>
      expect(screen.getByText("已保存")).toBeInTheDocument(),
    );
    const saveRequest = requests.find(
      (request) =>
        request.url.endsWith("/api/admin/content") &&
        request.init?.method === "PUT",
    );
    const payload = JSON.parse(String(saveRequest?.init?.body)) as {
      content: typeof siteContent;
    };
    expect(payload.content.hero.statement).toBe(
      "后台实时修改后的首页主张",
    );
    expect(
      payload.content.sections.find((section) => section.id === "practice")
        ?.enabled,
    ).toBe(false);
    expect(payload.content.career[1].positioning).toBe(
      "新的交易结构与商业判断定位",
    );
    expect(payload.content.projects).toHaveLength(4);
    expect(payload.content.practice).toHaveLength(4);
  });
});
