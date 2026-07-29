import type { Metadata } from "next";

import { AdminWorkspace } from "./admin-workspace";

export const metadata: Metadata = {
  title: "内容管理 · Ricky Twin",
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return <AdminWorkspace />;
}
