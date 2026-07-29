import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { siteContent } from "@/content/site-content";

import { HeroSection } from "./hero-section";

describe("HeroSection", () => {
  it("renders the approved identity, reception copy, and practice dock", () => {
    render(
      <HeroSection
        content={siteContent.hero}
        onNavigate={vi.fn()}
        practiceLinks={siteContent.practice}
      />,
    );

    expect(screen.getByText(siteContent.hero.welcome)).toBeInTheDocument();
    siteContent.hero.tags.forEach((tag) => {
      expect(screen.getByText(tag)).toBeInTheDocument();
    });
    expect(
      screen.getByRole("button", { name: "进入 AI 会客厅" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "沿职业路线认识我" }),
    ).toBeInTheDocument();
    expect(screen.getAllByTestId("practice-dock-item")).toHaveLength(4);
    expect(
      screen.getByRole("link", { name: /AI Token 中转站/ }),
    ).toHaveAttribute("target", "_blank");
  });

  it("routes both hero actions through the shared section navigator", () => {
    const onNavigate = vi.fn();
    render(
      <HeroSection
        content={siteContent.hero}
        onNavigate={onNavigate}
        practiceLinks={siteContent.practice}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "进入 AI 会客厅" }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "沿职业路线认识我" }),
    );

    expect(onNavigate).toHaveBeenNthCalledWith(1, "lounge");
    expect(onNavigate).toHaveBeenNthCalledWith(2, "career");
  });
});
