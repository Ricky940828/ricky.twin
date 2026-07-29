import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import HomePage from "./page";

describe("HomePage", () => {
  it("renders the Ricky 会客厅 shell", () => {
    render(<HomePage />);

    expect(screen.getByRole("main")).toBeInTheDocument();
    expect(screen.getByText("Ricky 会客厅")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "RICKY" })).toBeInTheDocument();
    expect(
      screen.getByText(
        "这里是 Ricky 的 AI 会客厅，我是 Ricky 的数字分身。您可以在这里了解我的职业路径与项目经验，也可以进入 AI 会客厅与我对话，继续了解更多哦～",
      ),
    ).toBeInTheDocument();
  });
});
