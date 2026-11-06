import { describe, expect, it, vi } from "vitest";
import type { ObservabilityStore } from "./observability-store";
import { observeRequest } from "./request-monitor";

function store() {
  return {
    recordRequest: vi.fn(),
  } as unknown as ObservabilityStore;
}

describe("observeRequest", () => {
  it("为请求追加关联编号并记录成功结果", async () => {
    const observabilityStore = store();
    const response = await observeRequest({
      request: new Request("https://ricky.test/api/chat?secret=hidden", {
        method: "POST",
      }),
      route: "/api/chat",
      actor: "anonymous",
      visitorId: "visitor-1",
      store: observabilityStore,
      handler: async () => Response.json({ ok: true }, { status: 201 }),
    });

    expect(response.status).toBe(201);
    expect(response.headers.get("X-Request-Id")).toMatch(/^req_/);
    expect(observabilityStore.recordRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        method: "POST",
        route: "/api/chat",
        status: 201,
        actor: "anonymous",
        visitorId: "visitor-1",
      }),
    );
  });

  it("记录异常类型后继续抛出原始错误", async () => {
    const observabilityStore = store();
    await expect(
      observeRequest({
        request: new Request("https://ricky.test/api/chat", {
          method: "POST",
        }),
        route: "/api/chat",
        actor: "anonymous",
        store: observabilityStore,
        handler: async () => {
          throw new TypeError("broken");
        },
      }),
    ).rejects.toThrow("broken");
    expect(observabilityStore.recordRequest).toHaveBeenCalledWith(
      expect.objectContaining({ status: 500, errorType: "TypeError" }),
    );
  });
});
