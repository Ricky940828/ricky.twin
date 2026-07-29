import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { siteContent } from "@/content/site-content";
import type { SiteContent } from "@/content/types";

import { LivePreview } from "./live-preview";

describe("LivePreview", () => {
  it("switches among the exact public breakpoints and posts live draft changes", async () => {
    const { rerender } = render(
      <LivePreview
        canPublish
        content={siteContent}
        onPublish={vi.fn(async () => true)}
      />,
    );
    const frame = screen.getByTitle<HTMLIFrameElement>("前台实时预览");

    expect(frame).toHaveAttribute("width", "1440");
    await userEvent.click(screen.getByRole("button", { name: "平板端" }));
    expect(frame).toHaveAttribute("width", "820");
    await userEvent.click(screen.getByRole("button", { name: "移动端" }));
    expect(frame).toHaveAttribute("width", "390");

    const postMessage = vi.spyOn(frame.contentWindow!, "postMessage");
    const changed: SiteContent = {
      ...siteContent,
      hero: {
        ...siteContent.hero,
        statement: "实时预览中的新首页主张",
      },
    };
    rerender(
      <LivePreview
        canPublish
        content={changed}
        onPublish={vi.fn(async () => true)}
      />,
    );

    await waitFor(() =>
      expect(postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "ricky:content-preview",
          payload: changed,
        }),
        window.location.origin,
      ),
    );
  });

  it("replays, opens a full preview, and requires a release note before publishing", async () => {
    const publish = vi.fn(async () => true);
    const open = vi.spyOn(window, "open").mockImplementation(() => null);
    const user = userEvent.setup();

    render(
      <LivePreview
        canPublish
        content={siteContent}
        onPublish={publish}
      />,
    );

    await user.click(screen.getByRole("button", { name: "全屏预览" }));
    expect(open).toHaveBeenCalledWith(
      "/admin/preview",
      "_blank",
      "noopener,noreferrer",
    );

    const frame = screen.getByTitle<HTMLIFrameElement>("前台实时预览");
    const postMessage = vi.spyOn(frame.contentWindow!, "postMessage");
    await user.click(screen.getByRole("button", { name: "重播动效" }));
    await waitFor(() =>
      expect(postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "ricky:content-preview",
          replayKey: 1,
        }),
        window.location.origin,
      ),
    );

    await user.click(screen.getByRole("button", { name: "发布到正式站" }));
    const confirm = screen.getByRole("button", { name: "确认发布" });
    expect(confirm).toBeDisabled();

    fireEvent.change(screen.getByLabelText("发布说明"), {
      target: { value: "完善首页公开表述" },
    });
    await user.click(confirm);

    await waitFor(() =>
      expect(publish).toHaveBeenCalledWith("完善首页公开表述"),
    );
  });
});
