import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { siteContent } from "@/content/site-content";

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
  });
});
