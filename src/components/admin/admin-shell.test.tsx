import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AdminShell } from "./admin-shell";

describe("AdminShell content navigation", () => {
  it("separates page content from global settings", () => {
    render(
      <AdminShell
        activeEditor="home"
        activeModule="content"
        onEditorChange={vi.fn()}
        onLogout={vi.fn()}
        onModuleChange={vi.fn()}
        onSave={vi.fn()}
        saveState="saved"
        versionLabel="正式版本 test"
      >
        <div>编辑区</div>
      </AdminShell>,
    );

    const pageGroup = screen.getByRole("group", { name: "页面内容" });
    const globalGroup = screen.getByRole("group", { name: "全局设置" });

    expect(
      within(pageGroup).getAllByRole("button").map((item) => item.textContent),
    ).toEqual([
      "HOME首页",
      "IDENTITY CARD身份名片",
      "CAREER职业路线",
      "PROJECTS项目与能力",
      "PRACTICE实践现场",
      "LOUNGEAI 会客厅",
      "BOTTOM CTA底部行动区",
    ]);
    expect(
      within(globalGroup).getAllByRole("button").map((item) => item.textContent),
    ).toEqual([
      "BRAND品牌与身份",
      "NAVIGATION导航与页面",
      "CAPABILITIES共用能力维度",
      "SITE FOOTER网站页脚",
    ]);
  });

  it("selects an editor without changing the system module", () => {
    const onEditorChange = vi.fn();
    const onModuleChange = vi.fn();
    render(
      <AdminShell
        activeEditor="home"
        activeModule="content"
        onEditorChange={onEditorChange}
        onLogout={vi.fn()}
        onModuleChange={onModuleChange}
        onSave={vi.fn()}
        saveState="saved"
        versionLabel="正式版本 test"
      >
        <div>编辑区</div>
      </AdminShell>,
    );

    fireEvent.click(screen.getByRole("button", { name: "品牌与身份" }));

    expect(onModuleChange).toHaveBeenCalledWith("content");
    expect(onEditorChange).toHaveBeenCalledWith("brand");
  });
});
