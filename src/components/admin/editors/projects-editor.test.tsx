import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { siteContent } from "@/content/site-content";

import { ProjectsEditor } from "./projects-editor";

describe("ProjectsEditor", () => {
  it("adds a project as immediately visible in the live preview", async () => {
    const onChange = vi.fn();
    render(
      <ProjectsEditor
        content={structuredClone(siteContent)}
        onChange={onChange}
      />,
    );

    await userEvent.click(
      screen.getByRole("button", { name: "新增项目" }),
    );

    const nextContent = onChange.mock.calls[0][0];
    const created = nextContent.projects.at(-1);
    expect(created.published).toBe(true);
    expect(created.featured).toBe(true);
    expect(created.capabilityLevels).toEqual([2, 2, 2, 2, 2, 2]);
  });
});
