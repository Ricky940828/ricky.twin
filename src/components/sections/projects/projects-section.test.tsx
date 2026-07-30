import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { siteContent } from "@/content/site-content";

import { ProjectsSection } from "./projects-section";

describe("ProjectsSection", () => {
  it("renders dynamic project cards and the current four-step solution path", () => {
    render(<ProjectsSection projects={siteContent.projects} />);

    siteContent.projects.forEach((project) => {
      expect(screen.getAllByText(project.title).length).toBeGreaterThan(0);
    });
    ["业务问题", "核心判断", "解决路径", "抽象成果"].forEach((label) => {
      expect(screen.getByText(label)).toBeInTheDocument();
    });
    expect(screen.getByText("01 / 04")).toBeInTheDocument();
  });

  it("changes the active card by click and opens its detail dialog", () => {
    render(<ProjectsSection projects={siteContent.projects} />);

    fireEvent.click(
      screen.getByRole("button", {
        name: "选择项目：资产资金标准化",
      }),
    );
    expect(screen.getByText("02 / 04")).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", {
        name: "打开项目详情：资产资金标准化",
      }),
    );
    expect(
      screen.getByRole("dialog", {
        name: "资产资金标准化项目详情",
      }),
    ).toBeInTheDocument();
  });

  it("supports mouse dragging across the card stack", () => {
    render(<ProjectsSection projects={siteContent.projects} />);

    const stack = document.querySelector<HTMLElement>(".card-swap");
    expect(stack).not.toBeNull();

    fireEvent.pointerDown(stack!, {
      pointerId: 7,
      clientX: 560,
      clientY: 320,
    });
    fireEvent.pointerMove(stack!, {
      pointerId: 7,
      clientX: 410,
      clientY: 324,
    });
    fireEvent.pointerUp(stack!, {
      pointerId: 7,
      clientX: 410,
      clientY: 324,
    });

    expect(screen.getByText("02 / 04")).toBeInTheDocument();
  });
});
