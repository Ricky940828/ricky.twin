import {
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import { siteContent } from "@/content/site-content";

import { LoungeSection } from "./lounge-section";

afterEach(() => {
  vi.unstubAllGlobals();
});

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) =>
      Response.json(
        String(input).endsWith("/api/knowledge-status")
          ? {
              ok: true,
              configured: true,
              knowledge: siteContent.lounge.knowledge,
            }
          : {
        ok: true,
        mode: "live",
        answer:
          "我通常先看四件事：主体、资产、风险收益和产品落地条件。",
        nextAction: "none",
        meta: { retrievalCount: 1, latencyMs: 120 },
            },
      ),
    ),
  );
});

describe("LoungeSection", () => {
  it("uses knowledge names and permission signals managed by the backend", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        if (String(input).endsWith("/api/knowledge-status")) {
          return Response.json({
            ok: true,
            knowledge: [
              {
                id: "knowledge-1",
                name: "后台配置知识库",
                description: "由知识库模块统一维护",
                access: "request",
                accessLabel: "需申请",
                ragEnabled: true,
              },
            ],
          });
        }
        return Response.json({
          ok: true,
          mode: "demo",
          answer: "透明演示",
          nextAction: "none",
          meta: { retrievalCount: 0, latencyMs: 1 },
        });
      }),
    );

    render(<LoungeSection content={siteContent.lounge} />);

    expect(
      await screen.findByText("后台配置知识库"),
    ).toBeInTheDocument();
    expect(screen.getByText("由知识库模块统一维护")).toBeInTheDocument();
    expect(screen.getByText("需申请")).toBeInTheDocument();
  });

  it("refreshes knowledge badges after the admin adds another visible base", async () => {
    let statusRequests = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        if (String(input).endsWith("/api/knowledge-status")) {
          statusRequests += 1;
          return Response.json({
            ok: true,
            configured: true,
            knowledge:
              statusRequests === 1
                ? [
                    {
                      id: "kb-public",
                      name: "公开职业资料",
                      description: "公开职业内容",
                      access: "public",
                      accessLabel: "公开",
                      ragEnabled: true,
                    },
                  ]
                : [
                    {
                      id: "kb-public",
                      name: "公开职业资料",
                      description: "公开职业内容",
                      access: "public",
                      accessLabel: "公开",
                      ragEnabled: true,
                    },
                    {
                      id: "kb-capability",
                      name: "能力单元库",
                      description: "受限能力内容",
                      access: "request",
                      accessLabel: "需申请访问权限",
                      ragEnabled: true,
                    },
                  ],
          });
        }
        return Response.json({
          ok: true,
          mode: "demo",
          answer: "透明演示",
          nextAction: "none",
          meta: { retrievalCount: 0, latencyMs: 1 },
        });
      }),
    );

    render(<LoungeSection content={siteContent.lounge} />);
    expect(await screen.findByText("公开职业资料")).toBeInTheDocument();
    expect(screen.queryByText("能力单元库")).not.toBeInTheDocument();

    window.dispatchEvent(new Event("focus"));

    expect(await screen.findByText("能力单元库")).toBeInTheDocument();
    expect(screen.getByText("需申请访问权限")).toBeInTheDocument();
  });

  it("allows the backend to hide every managed knowledge badge", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        if (String(input).endsWith("/api/knowledge-status")) {
          return Response.json({
            ok: true,
            configured: true,
            knowledge: [],
          });
        }
        return Response.json({
          ok: true,
          mode: "demo",
          answer: "透明演示",
          nextAction: "none",
          meta: { retrievalCount: 0, latencyMs: 1 },
        });
      }),
    );

    render(<LoungeSection content={siteContent.lounge} />);

    await waitFor(() => {
      for (const knowledge of siteContent.lounge.knowledge) {
        expect(screen.queryByText(knowledge.name)).not.toBeInTheDocument();
      }
    });
  });

  it("知识库接口失败时不再回退展示前台占位标签", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        if (String(input).endsWith("/api/knowledge-status")) {
          throw new Error("offline");
        }
        return Response.json({
          ok: true,
          mode: "demo",
          answer: "透明演示",
          nextAction: "none",
          meta: { retrievalCount: 0, latencyMs: 1 },
        });
      }),
    );

    render(<LoungeSection content={siteContent.lounge} />);

    await waitFor(() => {
      expect(
        screen.queryByLabelText("当前可展示的知识库"),
      ).not.toBeInTheDocument();
    });
    for (const knowledge of siteContent.lounge.knowledge) {
      expect(screen.queryByText(knowledge.name)).not.toBeInTheDocument();
    }
  });

  it("shows exact quick questions and knowledge permission status once", async () => {
    render(<LoungeSection content={siteContent.lounge} />);

    await screen.findByText(siteContent.lounge.knowledge[0]!.name);

    siteContent.lounge.quickQuestions.forEach((question) => {
      expect(
        screen.getByRole("button", { name: question }),
      ).toBeInTheDocument();
    });
    siteContent.lounge.knowledge.forEach((knowledge) => {
      expect(screen.getAllByText(knowledge.name)).toHaveLength(1);
      expect(screen.getByText(knowledge.accessLabel)).toBeInTheDocument();
    });
  });

  it("answers in the lounge without showing file paths or source-topic lists", async () => {
    render(<LoungeSection content={siteContent.lounge} />);

    fireEvent.click(
      screen.getByRole("button", {
        name: "你如何判断一个机构合作是否值得推进？",
      }),
    );

    expect(
      await screen.findByText(/我通常先看四件事/),
    ).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/\/Users\/|00-工作台/);
    expect(document.body.textContent).not.toContain("本回答使用知识库");
    expect(screen.getByText("LIVE AGENT · RAG")).toBeInTheDocument();
  });

  it("renders model markdown as readable headings, emphasis and lists", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        if (String(input).endsWith("/api/knowledge-status")) {
          return Response.json({
            ok: true,
            configured: true,
            knowledge: [],
          });
        }
        return Response.json({
          ok: true,
          mode: "live",
          answer:
            "## 核心判断\n\n**项目上线不是终点。**\n\n- 先统一关键口径\n- 再建立复盘机制",
          nextAction: "none",
          meta: { retrievalCount: 1, latencyMs: 120 },
        });
      }),
    );
    render(<LoungeSection content={siteContent.lounge} />);

    fireEvent.click(
      screen.getByRole("button", {
        name: "你如何判断一个机构合作是否值得推进？",
      }),
    );

    expect(
      await screen.findByRole("heading", { name: "核心判断" }),
    ).toBeInTheDocument();
    expect(screen.getByText("项目上线不是终点。").tagName).toBe("STRONG");
    expect(screen.getByText("先统一关键口径").closest("li")).not.toBeNull();
  });

  it("renders streamed markdown before the model finishes the full answer", async () => {
    const encoder = new TextEncoder();
    let streamController:
      | ReadableStreamDefaultController<Uint8Array>
      | undefined;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        if (String(input).endsWith("/api/knowledge-status")) {
          return Response.json({
            ok: true,
            configured: true,
            knowledge: [],
          });
        }
        return new Response(
          new ReadableStream<Uint8Array>({
            start(controller) {
              streamController = controller;
              controller.enqueue(
                encoder.encode(
                  'event: delta\ndata: {"text":"## 实时判断\\n\\n**先看主体。**"}\n\n',
                ),
              );
            },
          }),
          {
            headers: {
              "Content-Type": "text/event-stream; charset=utf-8",
            },
          },
        );
      }),
    );
    render(<LoungeSection content={siteContent.lounge} />);

    fireEvent.click(
      screen.getByRole("button", {
        name: "你如何判断一个机构合作是否值得推进？",
      }),
    );

    expect(
      await screen.findByRole("heading", { name: "实时判断" }),
    ).toBeInTheDocument();
    expect(screen.getByText("先看主体。").tagName).toBe("STRONG");

    streamController?.enqueue(
      encoder.encode(
        `event: done\ndata: ${JSON.stringify({
          result: {
            ok: true,
            mode: "live",
            answer:
              "## 实时判断\n\n**先看主体。**\n\n- 再看资产\n- 最后看落地条件",
            nextAction: "none",
            meta: { retrievalCount: 1, latencyMs: 120 },
          },
        })}\n\n`,
      ),
    );
    streamController?.close();

    expect(await screen.findByText("最后看落地条件")).toBeInTheDocument();
    expect(screen.getByText("LIVE AGENT · RAG")).toBeInTheDocument();
  });

  it("opens permission and submits a real contact lead", async () => {
    render(<LoungeSection content={siteContent.lounge} />);

    await screen.findByText(siteContent.lounge.knowledge[0]!.name);

    fireEvent.click(
      screen.getByRole("button", {
        name: "申请访问：金融产品与机构业务",
      }),
    );
    expect(
      screen.getByRole("dialog", { name: "申请更多知识权限" }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "关闭权限申请" }));

    fireEvent.click(
      screen.getByRole("button", { name: "留下联系方式进一步沟通" }),
    );
    expect(
      screen.getByRole("dialog", { name: "留下联系方式" }),
    ).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("怎么称呼"), {
      target: { value: "合作访客" },
    });
    fireEvent.change(screen.getByLabelText("联系方式"), {
      target: { value: "visitor@example.com" },
    });
    fireEvent.click(
      screen.getByLabelText("同意仅将上述信息用于本次进一步沟通"),
    );
    fireEvent.click(
      screen.getByRole("button", { name: /提交沟通意向/ }),
    );
    expect(
      await screen.findByText("沟通意向已提交"),
    ).toBeInTheDocument();
  });

  it("increments the Magic Rings pulse key only once", async () => {
    render(<LoungeSection content={siteContent.lounge} />);

    const first = screen.getByRole("button", {
      name: siteContent.lounge.quickQuestions[0],
    });
    fireEvent.click(first);
    expect(screen.getByTestId("magic-rings")).toHaveAttribute(
      "data-pulse-key",
      "1",
    );
    await screen.findByText(/我通常先看四件事/);
    fireEvent.click(
      screen.getByRole("button", {
        name: siteContent.lounge.quickQuestions[1],
      }),
    );
    expect(screen.getByTestId("magic-rings")).toHaveAttribute(
      "data-pulse-key",
      "1",
    );
  });
});
