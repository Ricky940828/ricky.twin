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
});
