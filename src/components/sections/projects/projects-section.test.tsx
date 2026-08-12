import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { siteContent } from "@/content/site-content";
import { ScrollTrigger } from "@/lib/gsap-client";

import { ProjectsSection } from "./projects-section";

describe("ProjectsSection", () => {
  it("renders dynamic project cards and links the active project to the capability map", () => {
    render(<ProjectsSection projects={siteContent.projects} />);

    siteContent.projects.forEach((project) => {
      expect(screen.getAllByText(project.title).length).toBeGreaterThan(0);
    });
    siteContent.capabilityAxes.forEach((axis) => {
      expect(screen.getByText(axis)).toBeInTheDocument();
    });
    expect(screen.getAllByText("01 / 04")).toHaveLength(2);
    expect(
      screen.getByRole("button", { name: "查看项目完整说明" }),
    ).toBeInTheDocument();
    const activeCard = document.querySelector<HTMLElement>(
      '.project-card[data-active="true"]',
    );
    expect(activeCard).not.toBeNull();
    expect(
      within(activeCard!).getByRole("button", {
        name: "查看项目完整说明",
      }),
    ).toBeInTheDocument();
    expect(
      document.querySelector(".projects-stage__footer .projects-stage__detail"),
    ).toBeNull();
    expect(screen.queryByText("业务问题")).not.toBeInTheDocument();
  });

  it("changes the active card by click and opens its detail dialog", () => {
    render(<ProjectsSection projects={siteContent.projects} />);

    fireEvent.click(
      screen.getByRole("button", {
        name: "选择项目：资产资金标准化",
      }),
    );
    expect(screen.getAllByText("02 / 04")).toHaveLength(2);

    fireEvent.click(
      screen.getByRole("button", { name: "查看项目完整说明" }),
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

    expect(screen.getAllByText("02 / 04")).toHaveLength(2);
  });

  it("makes a newly configured fifth project reachable without remounting", () => {
    const { rerender } = render(
      <ProjectsSection projects={siteContent.projects} />,
    );
    const addedProject = {
      ...siteContent.projects[0],
      id: "new-project",
      eyebrow: "NEW PROJECT",
      title: "新增项目主题",
      order: 5,
    };

    rerender(
      <ProjectsSection
        projects={[...siteContent.projects, addedProject]}
      />,
    );

    for (let index = 0; index < 4; index += 1) {
      fireEvent.click(
        screen.getByRole("button", { name: "下一个项目" }),
      );
    }

    expect(
      screen.getByRole("button", {
        name: "打开项目详情：新增项目主题",
      }),
    ).toBeInTheDocument();
    expect(screen.getAllByText("05 / 05")).toHaveLength(2);
  });

  it("keeps one pinned project narrative while live preview projects change", () => {
    vi.spyOn(window, "matchMedia").mockImplementation(
      (query: string) =>
        ({
          matches: query.includes("min-width: 901px"),
          media: query,
          onchange: null,
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          addListener: vi.fn(),
          removeListener: vi.fn(),
          dispatchEvent: vi.fn(),
        }) as MediaQueryList,
    );
    const kill = vi.fn();
    const create = vi
      .spyOn(ScrollTrigger, "create")
      .mockReturnValue({ kill, progress: 0 } as unknown as ScrollTrigger);
    vi.spyOn(ScrollTrigger, "refresh").mockImplementation(() => undefined);

    const { rerender } = render(
      <ProjectsSection projects={siteContent.projects} />,
    );
    const addedProject = {
      ...structuredClone(siteContent.projects.at(-1)!),
      id: "preview-added-project",
      title: "预览新增项目",
      order: siteContent.projects.length + 1,
    };

    rerender(
      <ProjectsSection
        projects={[...siteContent.projects, addedProject]}
      />,
    );

    expect(create).toHaveBeenCalledTimes(1);
    expect(kill).not.toHaveBeenCalled();
  });
});
