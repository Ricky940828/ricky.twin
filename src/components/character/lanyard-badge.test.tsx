import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { IdentityCardDialog } from "./identity-card-dialog";
import { LanyardBadge } from "./lanyard-badge";

function IdentityHarness() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <LanyardBadge onOpenIdentity={() => setOpen(true)} />
      <IdentityCardDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
}

describe("LanyardBadge", () => {
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

    fireEvent.keyDown(window, { key: "Escape" });
    expect(
      screen.queryByRole("dialog", { name: "Ricky 数字身份卡" }),
    ).not.toBeInTheDocument();
  });
});
