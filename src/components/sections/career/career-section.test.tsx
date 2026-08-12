import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { siteContent } from "@/content/site-content";
import { ScrollTrigger } from "@/lib/gsap-client";

import { CareerSection } from "./career-section";

describe("CareerSection", () => {
  it("guides visitors through each stage and ends at representative projects", () => {
    const onNavigateProjects = vi.fn();
    render(
      <CareerSection
        axes={siteContent.capabilityAxes}
        onNavigateProjects={onNavigateProjects}
        stages={siteContent.career}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "点融网" }),
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "下一站：还呗 →" }),
    );
    expect(screen.getByRole("heading", { name: "还呗" })).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "下一站：小象优品 →" }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "下一站：海尔消费金融 →" }),
    );

    const finalAction = screen.getByRole("button", {
      name: "查看代表项目 →",
    });
    expect(finalAction).toBeInTheDocument();
    fireEvent.click(finalAction);
    expect(onNavigateProjects).toHaveBeenCalledTimes(1);
  });

  it("shows all six capability axes and maturity language", () => {
    render(
      <CareerSection
        axes={siteContent.capabilityAxes}
        stages={siteContent.career}
      />,
    );

    siteContent.capabilityAxes.forEach((axis) => {
      expect(screen.getByText(axis)).toBeInTheDocument();
    });
    ["接触", "形成", "深化", "体系化"].forEach((label) => {
      expect(screen.getByText(label)).toBeInTheDocument();
    });
    expect(
      document.querySelector(".capability-radar__axes"),
    ).not.toBeInTheDocument();
    expect(
      document.querySelectorAll(".capability-radar__axis-label"),
    ).toHaveLength(6);
    expect(
      screen.getByLabelText("综合能力指数 38 分"),
    ).toBeInTheDocument();
    expect(screen.getByText("3.0 / 4")).toBeInTheDocument();
  });

  it("lays out any number of stages and recovers after the active new stage is deleted", () => {
    const addedStage = {
      ...structuredClone(siteContent.career.at(-1)!),
      id: "new-stage",
      publicBrand: "新增职业阶段",
      period: "2026.08 — 至今",
      nextStageId: undefined,
    };
    const extendedStages = [
      ...structuredClone(siteContent.career),
      addedStage,
    ];
    const { rerender } = render(
      <CareerSection
        axes={siteContent.capabilityAxes}
        stages={extendedStages}
      />,
    );

    const routeNodes = document.querySelectorAll<HTMLElement>(
      ".career-route__node",
    );
    expect(routeNodes).toHaveLength(5);
    routeNodes.forEach((node) => {
      expect(node.style.left).not.toContain("NaN");
      expect(node.style.top).not.toContain("NaN");
    });
    expect(
      screen.getByRole("button", {
        name: "按时间查看新增职业阶段阶段",
      }),
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "查看新增职业阶段阶段" }),
    );
    expect(
      screen.getByRole("heading", { name: "新增职业阶段" }),
    ).toBeInTheDocument();

    rerender(
      <CareerSection
        axes={siteContent.capabilityAxes}
        stages={siteContent.career}
      />,
    );
    expect(
      screen.getByRole("heading", { name: "海尔消费金融" }),
    ).toBeInTheDocument();
  });

  it("keeps one scroll narrative instance while live preview stages change", () => {
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
      <CareerSection
        axes={siteContent.capabilityAxes}
        stages={siteContent.career}
      />,
    );
    const addedStage = {
      ...structuredClone(siteContent.career.at(-1)!),
      id: "preview-added-stage",
      publicBrand: "预览新增阶段",
    };

    rerender(
      <CareerSection
        axes={siteContent.capabilityAxes}
        stages={[...siteContent.career, addedStage]}
      />,
    );

    expect(create).toHaveBeenCalledTimes(1);
    expect(kill).not.toHaveBeenCalled();
  });
});
