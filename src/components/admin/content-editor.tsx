"use client";

import type { SiteContent } from "@/content/types";

import { CareerEditor } from "./editors/career-editor";
import { LoungeEditor } from "./editors/lounge-editor";
import { OverviewEditor } from "./editors/overview-editor";
import { PracticeEditor } from "./editors/practice-editor";
import { ProjectsEditor } from "./editors/projects-editor";

export type AdminEditorId =
  | "overview"
  | "career"
  | "projects"
  | "practice"
  | "lounge";

export const ADMIN_EDITOR_ITEMS: Array<{
  id: AdminEditorId;
  label: string;
  eyebrow: string;
}> = [
  { id: "overview", label: "内容概览", eyebrow: "PUBLIC HOME" },
  { id: "career", label: "职业路线", eyebrow: "CAREER" },
  { id: "projects", label: "项目主题", eyebrow: "PROJECTS" },
  { id: "practice", label: "实践入口", eyebrow: "PRACTICE" },
  { id: "lounge", label: "AI 会客厅", eyebrow: "LOUNGE" },
];

export function ContentEditor({
  activeEditor,
  content,
  onChange,
}: {
  activeEditor: AdminEditorId;
  content: SiteContent;
  onChange: (content: SiteContent) => void;
}) {
  if (activeEditor === "career") {
    return <CareerEditor content={content} onChange={onChange} />;
  }
  if (activeEditor === "projects") {
    return <ProjectsEditor content={content} onChange={onChange} />;
  }
  if (activeEditor === "practice") {
    return <PracticeEditor content={content} onChange={onChange} />;
  }
  if (activeEditor === "lounge") {
    return <LoungeEditor content={content} onChange={onChange} />;
  }
  return <OverviewEditor content={content} onChange={onChange} />;
}
