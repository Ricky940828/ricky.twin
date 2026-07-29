import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { TargetLock } from "./target-lock";

describe("TargetLock", () => {
  it("keeps the native cursor and exposes four decorative corners", () => {
    render(
      <TargetLock>
        <button type="button">查看项目</button>
      </TargetLock>,
    );

    const wrapper = screen.getByTestId("target-lock");
    const button = screen.getByRole("button", { name: "查看项目" });
    const corners = wrapper.querySelectorAll("[data-target-corner]");

    expect(wrapper.getAttribute("style")).toContain("cursor: inherit");
    expect(corners).toHaveLength(4);
    corners.forEach((corner) => {
      expect(corner).toHaveAttribute("aria-hidden", "true");
    });
    button.focus();
    expect(button).toHaveFocus();
  });

  it("supports an explicitly active state", () => {
    render(
      <TargetLock active>
        <span>当前项目</span>
      </TargetLock>,
    );

    expect(screen.getByTestId("target-lock")).toHaveAttribute(
      "data-active",
      "true",
    );
  });
});
