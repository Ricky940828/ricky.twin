import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { siteContent } from "@/content/site-content";
import type { PracticeLink } from "@/content/types";

import { PracticeSection } from "./practice-section";

describe("PracticeSection", () => {
  it("renders each visible practice item with its configured details and action", () => {
    render(<PracticeSection links={siteContent.practice} />);

    siteContent.practice.forEach((item) => {
      const card = screen.getByTestId(`practice-card-${item.id}`);
      expect(within(card).getByText(item.title)).toBeInTheDocument();
      expect(within(card).getByText(item.description)).toBeInTheDocument();
      expect(within(card).getByText(item.type)).toBeInTheDocument();
      expect(within(card).getByText(item.statusLabel)).toBeInTheDocument();
    });

    expect(
      screen.getByRole("link", { name: /打开 AI Token 中转站/ }),
    ).toHaveAttribute("href", "https://api.aicenter.net.cn");
    expect(
      screen.getAllByRole("button", { name: "即将开放" }),
    ).toHaveLength(3);
  });

  it("filters hidden records and follows backend order", () => {
    const links: PracticeLink[] = siteContent.practice.map((item) => ({
      ...item,
    }));
    links[0].visible = false;
    links[1].order = 9;
    links[2].order = 1;

    render(<PracticeSection links={links} />);
    const cards = screen.getAllByTestId(/^practice-card-/);

    expect(screen.queryByText("AI Token 中转站")).not.toBeInTheDocument();
    expect(within(cards[0]).getByText("咖啡操作台")).toBeInTheDocument();
  });
});
