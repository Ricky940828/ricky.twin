import { render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { VisitTracker } from "./visit-tracker";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("VisitTracker", () => {
  it("only records published page views once per mount", async () => {
    const request = vi.fn(async () => Response.json({ ok: true }));
    vi.stubGlobal("fetch", request);

    const { rerender } = render(<VisitTracker enabled />);
    rerender(<VisitTracker enabled />);

    await waitFor(() => expect(request).toHaveBeenCalledTimes(1));
    expect(request).toHaveBeenCalledWith(
      "/api/visit",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("does not count admin preview as a public visit", () => {
    const request = vi.fn();
    vi.stubGlobal("fetch", request);

    render(<VisitTracker enabled={false} />);

    expect(request).not.toHaveBeenCalled();
  });
});
