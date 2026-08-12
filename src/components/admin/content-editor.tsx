"use client";

import { useState } from "react";

import type { SiteContent } from "@/content/types";

import {
  ADMIN_EDITOR_META,
  type AdminEditorId,
  type AdminPreviewTarget,
} from "./content-editor-config";
import { EditorPageGuide } from "./editor-page-guide";
import { CareerEditor } from "./editors/career-editor";
import { ConversionEditor } from "./editors/conversion-editor";
import {
  BrandEditor,
  CapabilitiesEditor,
  NavigationEditor,
  SiteFooterEditor,
} from "./editors/global-settings-editors";
import { HomeEditor } from "./editors/home-editor";
import { IdentityCardEditor } from "./editors/identity-card-editor";
import { LoungeEditor } from "./editors/lounge-editor";
import { PracticeEditor } from "./editors/practice-editor";
import { ProjectsEditor } from "./editors/projects-editor";

export type { AdminEditorId } from "./content-editor-config";

export function ContentEditor({
  activeEditor,
  content,
  onChange,
  onFocusChange,
}: {
  activeEditor: AdminEditorId;
  content: SiteContent;
  onChange: (content: SiteContent) => void;
  onFocusChange: (target: AdminPreviewTarget) => void;
}) {
  const meta = ADMIN_EDITOR_META[activeEditor];
  const [panelSelection, setPanelSelection] = useState<
    Partial<Record<AdminEditorId, string>>
  >({});
  const activePanelId =
    panelSelection[activeEditor] ?? meta.panels[0].id;

  const selectPanel = (panelId: string) => {
    const panel = meta.panels.find((item) => item.id === panelId);
    if (!panel) {
      return;
    }
    setPanelSelection((current) => ({
      ...current,
      [activeEditor]: panel.id,
    }));
    onFocusChange(panel.preview);
  };

  const editorProps = {
    content,
    onChange,
    onPanelChange: selectPanel,
  };

  let editor;
  if (activeEditor === "home") {
    editor = <HomeEditor {...editorProps} />;
  } else if (activeEditor === "identity-card") {
    editor = <IdentityCardEditor {...editorProps} />;
  } else if (activeEditor === "career") {
    editor = <CareerEditor {...editorProps} />;
  } else if (activeEditor === "projects") {
    editor = <ProjectsEditor {...editorProps} />;
  } else if (activeEditor === "practice") {
    editor = <PracticeEditor {...editorProps} />;
  } else if (activeEditor === "lounge") {
    editor = <LoungeEditor {...editorProps} />;
  } else if (activeEditor === "conversion") {
    editor = <ConversionEditor {...editorProps} />;
  } else if (activeEditor === "brand") {
    editor = <BrandEditor {...editorProps} />;
  } else if (activeEditor === "navigation") {
    editor = <NavigationEditor {...editorProps} />;
  } else if (activeEditor === "capabilities") {
    editor = <CapabilitiesEditor {...editorProps} />;
  } else {
    editor = <SiteFooterEditor {...editorProps} />;
  }

  return (
    <>
      <EditorPageGuide
        activePanelId={activePanelId}
        meta={meta}
        onPanelChange={(panelId) => selectPanel(panelId)}
      />
      {editor}
    </>
  );
}
