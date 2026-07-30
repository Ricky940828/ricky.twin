import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { siteContent } from "@/content/site-content";
import type { SiteContent } from "@/content/types";

import { SectionRenderer } from "./section-renderer";

function configuredSite(): SiteContent {
  return {
    ...siteContent,
    sections: siteContent.sections.map((section) => {
      const order = {
        career: 1,
        projects: 2,
        hero: 3,
        lounge: 4,
        practice: 5,
      }[section.id];
      return {
        ...section,
        order,
        enabled: section.id !== "practice",
      };
    }),
  };
}

describe("SectionRenderer", () => {
  it("renders one persistent character stage instead of section-local copies", () => {
    render(<SectionRenderer site={siteContent} />);

    expect(screen.getByTestId("persistent-character")).toBeInTheDocument();
    expect(document.querySelectorAll(".persistent-character")).toHaveLength(1);
    expect(document.querySelector(".hero-character-stage")).toBeNull();
    expect(document.querySelector(".career-route__avatar")).toBeNull();
    expect(document.querySelector(".projects-stage__character")).toBeNull();
    expect(
      document.querySelector(".lounge-avatar-panel__character"),
    ).toBeNull();
  });

  it("renders only enabled sections in configured order and mirrors it in navigation", () => {
    render(<SectionRenderer site={configuredSite()} />);

    const sectionOrder = Array.from(
      document.querySelectorAll<HTMLElement>("main.site-content > section"),
    ).map((section) => section.id);
    expect(sectionOrder).toEqual(["career", "projects", "hero", "lounge"]);

    const navigation = screen.getByRole("navigation", { name: "主导航" });
    expect(
      within(navigation)
        .getAllByRole("button")
        .map((button) => button.textContent),
    ).toEqual(["职业路线", "项目与能力", "首页", "AI 会客厅"]);
    expect(screen.queryByText("实践现场")).not.toBeInTheDocument();
  });

  it("uses the supplied snapshot directly and supports a draft preview mode", () => {
    const draftSite: SiteContent = {
      ...siteContent,
      hero: {
        ...siteContent.hero,
        statement: "这是一条后台即时修改的预览文案。",
      },
    };
    const { rerender } = render(
      <SectionRenderer mode="preview" site={draftSite} />,
    );

    expect(
      screen.getByText("这是一条后台即时修改的预览文案。"),
    ).toBeInTheDocument();
    expect(screen.getByText("草稿预览")).toBeInTheDocument();

    rerender(<SectionRenderer mode="preview" site={siteContent} />);
    expect(
      screen.queryByText("这是一条后台即时修改的预览文案。"),
    ).not.toBeInTheDocument();
    expect(screen.getByText(siteContent.hero.statement)).toBeInTheDocument();
  });

  it("keeps external destinations inert in draft preview mode", () => {
    render(<SectionRenderer mode="preview" site={siteContent} />);

    const externalLink = screen.getByRole("link", {
      name: /打开 .*在新标签页打开/,
    });
    const click = new MouseEvent("click", {
      bubbles: true,
      cancelable: true,
    });
    externalLink.dispatchEvent(click);

    expect(click.defaultPrevented).toBe(true);
  });
});
