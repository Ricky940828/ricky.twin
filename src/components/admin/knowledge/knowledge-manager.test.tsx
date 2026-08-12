import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { AdminKnowledgeWorkspace } from "@/server/knowledge/knowledge-service";

import { KnowledgeManager } from "./knowledge-manager";

const emptyWorkspace: AdminKnowledgeWorkspace = {
  bases: [],
  documents: [],
  updatedAt: "2026-07-30T00:00:00.000Z",
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("KnowledgeManager", () => {
  it("把最外层文件夹建成知识库，并上传其中 Markdown 的库内路径", async () => {
    const requests: Array<{ url: string; init?: RequestInit }> = [];
    const base = {
      id: "kb-folder",
      name: "金融产品方法",
      description: "由文件夹导入",
      defaultAccess: "private" as const,
      ragEnabled: true,
      loungeVisible: true,
      indexStatus: "empty" as const,
      documentCount: 0,
      chunkCount: 0,
      createdAt: "2026-08-05T00:00:00.000Z",
      updatedAt: "2026-08-05T00:00:00.000Z",
    };
    let current = emptyWorkspace;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        requests.push({ url, init });
        if (url.endsWith("/api/admin/knowledge") && init?.method === "POST") {
          current = { ...emptyWorkspace, bases: [base] };
          return Response.json({ ok: true, workspace: current });
        }
        if (url.endsWith(`/api/admin/knowledge/${base.id}/documents`)) {
          const body = init?.body as FormData;
          const file = body.get("file") as File;
          current = {
            ...current,
            bases: [{ ...base, documentCount: 1, chunkCount: 1 }],
            documents: [
              {
                id: "doc-folder",
                baseId: base.id,
                fileName: file.name,
                relativePath: String(body.get("relativePath")),
                title: "机构准入",
                sizeBytes: file.size,
                checksum: "masked-in-admin",
                status: "ready",
                chunkCount: 1,
                createdAt: base.createdAt,
                updatedAt: base.updatedAt,
              },
            ],
          };
          return Response.json({ ok: true, workspace: current });
        }
        return Response.json({ ok: true, workspace: current });
      }),
    );
    const user = userEvent.setup();
    render(<KnowledgeManager />);
    await screen.findByText("还没有知识库");

    const markdown = new File(
      ["# 机构准入\n\n先识别主体与资产。"],
      "机构准入.md",
      { type: "text/markdown" },
    );
    Object.defineProperty(markdown, "webkitRelativePath", {
      value: "金融产品方法/机构业务/机构准入.md",
    });
    await user.upload(screen.getByLabelText("选择 Markdown 文件夹"), [
      markdown,
    ]);

    expect(await screen.findByText("金融产品方法")).toBeInTheDocument();
    expect(
      await screen.findByText("1 个知识库、1 份 Markdown 已导入"),
    ).toBeInTheDocument();
    const uploadRequest = requests.find(({ url }) =>
      url.endsWith(`/api/admin/knowledge/${base.id}/documents`),
    );
    expect(
      (uploadRequest?.init?.body as FormData).get("relativePath"),
    ).toBe("机构业务/机构准入.md");
  });

  it("creates a knowledge base and uploads a markdown document", async () => {
    const requests: Array<{ url: string; init?: RequestInit }> = [];
    const base = {
      id: "kb-public",
      name: "公开职业资料",
      description: "职业路线与公开项目",
      defaultAccess: "public" as const,
      ragEnabled: true,
      indexStatus: "empty" as const,
      documentCount: 0,
      chunkCount: 0,
      createdAt: "2026-07-30T00:00:00.000Z",
      updatedAt: "2026-07-30T00:00:00.000Z",
    };
    let current = emptyWorkspace;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        requests.push({ url, init });
        if (init?.method === "POST" && url.endsWith("/api/admin/knowledge")) {
          current = { ...emptyWorkspace, bases: [base] };
          return Response.json({ ok: true, workspace: current });
        }
        if (url.includes("/documents") && init?.method === "POST") {
          current = {
            ...current,
            bases: [
              {
                ...base,
                documentCount: 1,
                chunkCount: 1,
                indexStatus: "ready",
              },
            ],
            documents: [
              {
                id: "doc-1",
                baseId: base.id,
                fileName: "职业资料.md",
                title: "职业资料",
                sizeBytes: 64,
                checksum: "masked-in-admin",
                status: "ready",
                chunkCount: 1,
                createdAt: "2026-07-30T00:00:00.000Z",
                updatedAt: "2026-07-30T00:00:00.000Z",
              },
            ],
          };
          return Response.json({ ok: true, workspace: current });
        }
        return Response.json({ ok: true, workspace: current });
      }),
    );
    const user = userEvent.setup();
    render(<KnowledgeManager />);

    await screen.findByText("还没有知识库");
    await user.click(screen.getByRole("button", { name: "新建知识库" }));
    await user.type(screen.getByLabelText("知识库名称"), "公开职业资料");
    await user.type(
      screen.getByLabelText("知识库说明"),
      "职业路线与公开项目",
    );
    await user.click(screen.getByRole("button", { name: "创建知识库" }));

    await screen.findByText("公开职业资料");
    const file = new File(
      ["# 职业资料\n\n七年多金融产品与 AI 应用实践。"],
      "职业资料.md",
      { type: "text/markdown" },
    );
    await user.upload(screen.getByLabelText("上传 Markdown"), file);

    await screen.findByText("职业资料.md");
    const uploadRequest = requests.find((request) =>
      request.url.includes("/documents"),
    );
    expect(uploadRequest?.init?.body).toBeInstanceOf(FormData);
    await waitFor(() =>
      expect(screen.getByText(/1 个片段/)).toBeInTheDocument(),
    );
  });

  it("opens the uploaded markdown and deletes an incorrect document after confirmation", async () => {
    const base = {
      id: "kb-public",
      name: "公开职业资料",
      description: "职业路线与公开项目",
      defaultAccess: "public" as const,
      ragEnabled: true,
      loungeVisible: true,
      indexStatus: "ready" as const,
      documentCount: 1,
      chunkCount: 2,
      createdAt: "2026-07-30T00:00:00.000Z",
      updatedAt: "2026-07-30T00:00:00.000Z",
    };
    const document = {
      id: "doc-1",
      baseId: base.id,
      fileName: "职业资料.md",
      title: "职业资料",
      sizeBytes: 128,
      checksum: "masked-in-admin",
      status: "ready" as const,
      chunkCount: 2,
      createdAt: "2026-07-30T00:00:00.000Z",
      updatedAt: "2026-07-30T00:00:00.000Z",
    };
    let current: AdminKnowledgeWorkspace = {
      bases: [base],
      documents: [document],
      updatedAt: "2026-07-30T00:00:00.000Z",
    };
    const requests: Array<{ url: string; init?: RequestInit }> = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        requests.push({ url, init });
        if (url.endsWith(`/documents/${document.id}`) && init?.method === "DELETE") {
          current = {
            ...current,
            bases: [
              {
                ...base,
                documentCount: 0,
                chunkCount: 0,
                indexStatus: "empty",
              },
            ],
            documents: [],
          };
          return Response.json({ ok: true, workspace: current });
        }
        if (url.endsWith(`/documents/${document.id}`)) {
          return Response.json({
            ok: true,
            document,
            content: "# 职业资料\n\n## 核心判断\n\n先判断主体与资产。",
          });
        }
        return Response.json({ ok: true, workspace: current });
      }),
    );
    const user = userEvent.setup();
    render(<KnowledgeManager />);

    await screen.findByText("职业资料.md");
    await user.click(
      screen.getByRole("button", { name: "查看内容：职业资料.md" }),
    );
    expect(
      await screen.findByRole("dialog", { name: "查看文档：职业资料.md" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "核心判断" }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "关闭文档内容" }));

    const updateInput = screen.getByLabelText(
      "选择替换文件：职业资料.md",
    );
    const chooserClick = vi.spyOn(updateInput, "click");
    await user.click(
      screen.getByRole("button", { name: "更新内容：职业资料.md" }),
    );
    expect(chooserClick).toHaveBeenCalledOnce();

    const replacement = new File(
      ["# 职业资料\n\n更新后的内容。"],
      "职业资料.md",
      { type: "text/markdown" },
    );
    await user.upload(updateInput, replacement);
    await screen.findByText("职业资料.md 已更新并重新索引");
    const updateRequest = requests.find(
      (request) =>
        request.url ===
          `/api/admin/knowledge/${base.id}/documents` &&
        request.init?.method === "POST",
    );
    expect(updateRequest?.init?.body).toBeInstanceOf(FormData);
    expect(
      (updateRequest?.init?.body as FormData).get("documentId"),
    ).toBe(document.id);

    await user.click(
      screen.getByRole("button", { name: "删除文档：职业资料.md" }),
    );
    expect(
      screen.getByRole("dialog", { name: "确认删除文档" }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "确认删除" }));

    await waitFor(() => {
      expect(screen.queryByText("职业资料.md")).not.toBeInTheDocument();
    });
    expect(requests).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          url: `/api/admin/knowledge/${base.id}/documents/${document.id}`,
          init: expect.objectContaining({ method: "DELETE" }),
        }),
      ]),
    );
  });

  it("deletes a whole knowledge base after showing its impact", async () => {
    const base = {
      id: "kb-removable",
      name: "40-能力证据",
      description: "能力证据资料",
      defaultAccess: "private" as const,
      ragEnabled: true,
      loungeVisible: true,
      indexStatus: "ready" as const,
      documentCount: 38,
      chunkCount: 1319,
      createdAt: "2026-08-05T00:00:00.000Z",
      updatedAt: "2026-08-05T00:00:00.000Z",
    };
    const document = {
      id: "doc-evidence",
      baseId: base.id,
      fileName: "证据覆盖地图.md",
      title: "证据覆盖地图",
      sizeBytes: 128,
      checksum: "masked-in-admin",
      status: "ready" as const,
      chunkCount: 12,
      createdAt: base.createdAt,
      updatedAt: base.updatedAt,
    };
    let current: AdminKnowledgeWorkspace = {
      bases: [base],
      documents: [document],
      updatedAt: base.updatedAt,
    };
    const requests: Array<{ url: string; init?: RequestInit }> = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        requests.push({ url, init });
        if (
          url === `/api/admin/knowledge/${base.id}` &&
          init?.method === "DELETE"
        ) {
          current = { ...emptyWorkspace, updatedAt: base.updatedAt };
          return Response.json({ ok: true, workspace: current });
        }
        return Response.json({ ok: true, workspace: current });
      }),
    );
    const user = userEvent.setup();
    render(<KnowledgeManager />);

    await screen.findByText("40-能力证据");
    await user.click(
      screen.getByRole("button", { name: "删除知识库：40-能力证据" }),
    );
    const dialog = screen.getByRole("dialog", {
      name: "确认删除知识库",
    });
    expect(dialog).toHaveTextContent("38 份文档");
    expect(dialog).toHaveTextContent("1319 个检索片段");
    await user.click(
      screen.getByRole("button", { name: "删除整个知识库" }),
    );

    expect(await screen.findByText("还没有知识库")).toBeInTheDocument();
    expect(requests).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          url: `/api/admin/knowledge/${base.id}`,
          init: expect.objectContaining({ method: "DELETE" }),
        }),
      ]),
    );
  });
});
