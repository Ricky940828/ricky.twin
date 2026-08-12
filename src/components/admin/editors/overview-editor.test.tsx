import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { siteContent } from "@/content/site-content";

import { ContentEditor } from "../content-editor";

describe("ContentEditor field ownership", () => {
  it("keeps homepage copy separate from global brand settings", () => {
    const { rerender } = render(
      <ContentEditor
        activeEditor="home"
        content={structuredClone(siteContent)}
        onChange={vi.fn()}
        onFocusChange={vi.fn()}
      />,
    );

    expect(screen.getByText("前台位置：首页")).toBeInTheDocument();
    expect(screen.getByLabelText("首页主张")).toBeInTheDocument();
    expect(screen.queryByLabelText("网站名称")).not.toBeInTheDocument();

    rerender(
      <ContentEditor
        activeEditor="brand"
        content={structuredClone(siteContent)}
        onChange={vi.fn()}
        onFocusChange={vi.fn()}
      />,
    );

    expect(
      screen.getByText("前台位置：全局设置 > 品牌与身份"),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("网站名称")).toBeInTheDocument();
    expect(screen.queryByLabelText("首页主张")).not.toBeInTheDocument();
  });

  it("separates the bottom action copy from the site footer note", () => {
    const { rerender } = render(
      <ContentEditor
        activeEditor="conversion"
        content={structuredClone(siteContent)}
        onChange={vi.fn()}
        onFocusChange={vi.fn()}
      />,
    );

    expect(screen.getByLabelText("底部行动区标题")).toBeInTheDocument();
    expect(screen.queryByLabelText("页脚底部说明")).not.toBeInTheDocument();

    rerender(
      <ContentEditor
        activeEditor="site-footer"
        content={structuredClone(siteContent)}
        onChange={vi.fn()}
        onFocusChange={vi.fn()}
      />,
    );

    expect(screen.getByLabelText("页脚底部说明")).toBeInTheDocument();
    expect(screen.queryByLabelText("底部行动区标题")).not.toBeInTheDocument();
  });

  it("owns all visible identity-card copy in a dedicated page-content editor", () => {
    render(
      <ContentEditor
        activeEditor="identity-card"
        content={structuredClone(siteContent)}
        onChange={vi.fn()}
        onFocusChange={vi.fn()}
      />,
    );

    expect(screen.getByText("前台位置：身份名片")).toBeInTheDocument();
    expect(screen.getByLabelText("名片编号")).toHaveValue(
      "LI FUHAO / DIGITAL ID 0717",
    );
    expect(screen.getByLabelText("对外姓名")).toHaveValue("李富豪 · Ricky");
    expect(screen.getByLabelText(/个人简介/)).toBeInTheDocument();
    expect(screen.getByLabelText(/能力标签/)).toBeInTheDocument();
    expect(screen.getByLabelText("翻到背面按钮文案")).toBeInTheDocument();
    expect(screen.getByLabelText("背面标题")).toHaveValue("知识与访问权限");
    expect(screen.getByLabelText("关闭按钮文案")).toHaveValue("关闭");
    expect(screen.queryByLabelText("首页主张")).not.toBeInTheDocument();
  });
});
