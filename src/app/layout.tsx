import type { Metadata } from "next";
import type { ReactNode } from "react";

import "@fontsource-variable/roboto-flex/full.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ricky 会客厅",
  description: "Ricky 的数字分身会客厅：职业路径、项目经验与 AI 对话入口。",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
