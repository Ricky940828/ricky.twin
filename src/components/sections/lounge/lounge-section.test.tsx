import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { siteContent } from "@/content/site-content";

import { LoungeSection } from "./lounge-section";

afterEach(() => {
  vi.useRealTimers();
});

describe("LoungeSection", () => {
  it("shows exact quick questions and knowledge permission status once", () => {
    render(<LoungeSection content={siteContent.lounge} />);

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

  it("answers in the lounge without showing file paths or source-topic lists", () => {
    vi.useFakeTimers();
    render(<LoungeSection content={siteContent.lounge} />);

    fireEvent.click(
      screen.getByRole("button", {
        name: "你如何判断一个机构合作是否值得推进？",
      }),
    );
    act(() => {
      vi.advanceTimersByTime(700);
    });

    expect(screen.getByText(/我通常先看四件事/)).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/\/Users\/|00-工作台/);
    expect(document.body.textContent).not.toContain("本回答使用知识库");
  });

  it("opens permission and contact prompts from explicit actions", () => {
    render(<LoungeSection content={siteContent.lounge} />);

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
  });

  it("increments the Magic Rings pulse key only once", () => {
    vi.useFakeTimers();
    render(<LoungeSection content={siteContent.lounge} />);

    const first = screen.getByRole("button", {
      name: siteContent.lounge.quickQuestions[0],
    });
    fireEvent.click(first);
    expect(screen.getByTestId("magic-rings")).toHaveAttribute(
      "data-pulse-key",
      "1",
    );
    act(() => {
      vi.advanceTimersByTime(700);
    });
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
