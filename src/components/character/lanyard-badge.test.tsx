import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { getIdentityCardContent } from "@/content/identity-card";

import { IdentityCardDialog } from "./identity-card-dialog";
import { LanyardBadge } from "./lanyard-badge";

function IdentityHarness() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <LanyardBadge onOpenIdentity={() => setOpen(true)} />
      <IdentityCardDialog
        content={getIdentityCardContent()}
        open={open}
        onClose={() => setOpen(false)}
      />
    </>
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("LanyardBadge", () => {
  it("renders a neck loop with two independently curved cords", () => {
    render(<LanyardBadge onOpenIdentity={vi.fn()} />);

    expect(
      document.querySelectorAll("[data-lanyard-cord]"),
    ).toHaveLength(2);
    expect(
      document.querySelector(".lanyard-neck-loop"),
    ).toBeInTheDocument();
  });

  it("moves while dragged and returns to rest on release", () => {
    render(<LanyardBadge onOpenIdentity={vi.fn()} />);
    const badge = screen.getByRole("button", { name: "打开 Ricky 数字身份卡" });

    fireEvent.pointerDown(badge, {
      pointerId: 1,
      clientX: 100,
      clientY: 100,
    });
    fireEvent.pointerMove(badge, {
      pointerId: 1,
      clientX: 130,
      clientY: 118,
    });

    expect(badge).toHaveAttribute("data-dragging", "true");
    expect(badge.getAttribute("style")).toContain("translate");

    fireEvent.pointerUp(badge, {
      pointerId: 1,
      clientX: 130,
      clientY: 118,
    });

    expect(badge).toHaveAttribute("data-dragging", "false");
  });

  it("opens the identity card after a short press and Escape closes it", () => {
    render(<IdentityHarness />);
    const badge = screen.getByRole("button", { name: "打开 Ricky 数字身份卡" });

    fireEvent.pointerDown(badge, {
      pointerId: 1,
      clientX: 100,
      clientY: 100,
    });
    fireEvent.pointerUp(badge, {
      pointerId: 1,
      clientX: 103,
      clientY: 102,
    });

    expect(
      screen.getByRole("dialog", { name: "Ricky 数字身份卡" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: "李富豪数字形象" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: "翻到背面：知识与权限",
      }),
    ).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "Escape" });
    expect(
      screen.queryByRole("dialog", { name: "Ricky 数字身份卡" }),
    ).not.toBeInTheDocument();
  });

  it("renders configured copy and real knowledge-base access cards", async () => {
    const content = getIdentityCardContent();
    content.front.name = "后台配置的名片姓名";
    content.front.role = "后台配置的职业身份";
    content.back.title = "后台配置的权限标题";
    content.back.flipToFront = "返回自定义正面";
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({
          ok: true,
          knowledge: [
            {
              id: "real-public",
              name: "真实公开知识库",
              description: "来自知识库后台",
              access: "public",
              accessLabel: "公开",
              ragEnabled: true,
            },
            {
              id: "real-private",
              name: "真实受限知识库",
              description: "来自知识库后台",
              access: "request",
              accessLabel: "需申请访问权限",
              ragEnabled: true,
            },
          ],
        }),
      ),
    );

    render(
      <IdentityCardDialog content={content} open onClose={vi.fn()} />,
    );

    expect(screen.getByText("后台配置的名片姓名")).toBeInTheDocument();
    expect(screen.getByText("后台配置的职业身份")).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", {
        name: content.front.flipToBack,
      }),
    );

    expect(screen.getByText("后台配置的权限标题")).toBeInTheDocument();
    expect(
      await screen.findByText("真实公开知识库"),
    ).toBeInTheDocument();
    expect(screen.getByText("真实受限知识库")).toBeInTheDocument();
    expect(screen.getByText("需申请访问权限")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "返回自定义正面" }))
      .toBeInTheDocument();
    expect(
      screen.queryByText("职业路径与公开项目"),
    ).not.toBeInTheDocument();
  });
});
