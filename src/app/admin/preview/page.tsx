import type { Metadata } from "next";

import { PreviewClient } from "./preview-client";

export const metadata: Metadata = {
  title: "草稿预览 · Ricky Twin",
  robots: { index: false, follow: false },
};

export default function AdminPreviewPage() {
  return <PreviewClient />;
}
