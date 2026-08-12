# Admin Content Sectioning Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reorganize the admin content editor into page-content and global-settings groups, while preserving existing content data and making the live preview jump directly to the edited region.

**Architecture:** Introduce a typed editor-navigation model shared by the admin rail, editor router, and preview-focus mapping. Split the current overview editor into focused page/global editors without changing `SiteContent`, and extend the preview postMessage contract with a request-scoped focus target so content updates do not repeatedly reposition the iframe.

**Tech Stack:** Next.js 16, React 19, TypeScript, Vitest, Testing Library, CSS.

---

## File Structure

- Create `src/components/admin/content-editor-config.ts`: typed two-level editor navigation, page-panel definitions, and preview target metadata.
- Create `src/components/admin/content-editor-config.test.ts`: verifies navigation grouping and unique editor/panel identifiers.
- Create `src/components/admin/editor-page-guide.tsx`: breadcrumb and compact page-panel navigation.
- Create `src/components/admin/editors/home-editor.tsx`: homepage-only fields formerly mixed into the overview editor.
- Create `src/components/admin/editors/conversion-editor.tsx`: bottom action area fields.
- Create `src/components/admin/editors/global-settings-editors.tsx`: brand, navigation, capability axes, and site-footer editors.
- Modify `src/components/admin/content-editor.tsx`: route the ten editor destinations and report active preview focus.
- Modify `src/components/admin/editor-fields.tsx`: give editor panels stable anchors and activation callbacks.
- Modify `src/components/admin/admin-shell.tsx`: render separate “页面内容” and “全局设置” navigation groups.
- Modify `src/app/admin/admin-workspace.tsx`: maintain preview focus requests without mutating the content draft.
- Modify `src/components/admin/live-preview.tsx`: include focus metadata in the preview message.
- Modify `src/app/admin/preview/preview-client.tsx`: preserve focus requests across live content updates.
- Modify `src/components/layout/section-renderer.tsx`: jump and highlight preview targets only when the request id changes.
- Modify existing editor files: assign panel ids and split the AI lounge into clearer panels.
- Modify `src/app/globals.css`: style navigation groups, page guide, breadcrumb, and preview focus highlight.
- Modify existing admin tests: cover new labels, data preservation, direct preview focus, and no repeated repositioning.

### Task 1: Typed two-level editor navigation

**Files:**
- Create: `src/components/admin/content-editor-config.ts`
- Create: `src/components/admin/content-editor-config.test.ts`

- [ ] **Step 1: Write the failing navigation model tests**

```ts
import { describe, expect, it } from "vitest";
import {
  ADMIN_EDITOR_GROUPS,
  ADMIN_EDITOR_META,
} from "./content-editor-config";

describe("admin content editor configuration", () => {
  it("separates page content from global settings", () => {
    expect(ADMIN_EDITOR_GROUPS.map((group) => group.label)).toEqual([
      "页面内容",
      "全局设置",
    ]);
    expect(ADMIN_EDITOR_GROUPS[0].items.map((item) => item.label)).toEqual([
      "首页",
      "职业路线",
      "项目与能力",
      "实践现场",
      "AI 会客厅",
      "底部行动区",
    ]);
  });

  it("keeps every editor id and panel id unique", () => {
    const ids = ADMIN_EDITOR_GROUPS.flatMap((group) =>
      group.items.map((item) => item.id),
    );
    expect(new Set(ids).size).toBe(ids.length);
    Object.values(ADMIN_EDITOR_META).forEach((editor) => {
      const panelIds = editor.panels.map((panel) => panel.id);
      expect(new Set(panelIds).size).toBe(panelIds.length);
    });
  });
});
```

- [ ] **Step 2: Run the test and verify it fails because the config module is missing**

Run: `pnpm test src/components/admin/content-editor-config.test.ts`

Expected: FAIL with module resolution error for `content-editor-config`.

- [ ] **Step 3: Implement the typed config**

Define `AdminEditorId`, `AdminEditorPanel`, `AdminPreviewTarget`, `ADMIN_EDITOR_GROUPS`, `ADMIN_EDITOR_META`, and `getDefaultEditorFocus()`. Use these editor ids:

```ts
export type AdminEditorId =
  | "home"
  | "career"
  | "projects"
  | "practice"
  | "lounge"
  | "conversion"
  | "brand"
  | "navigation"
  | "capabilities"
  | "site-footer";
```

Each panel definition contains a stable admin panel id plus a safe preview selector and section fallback. Global settings point to the nearest meaningful frontend area.

- [ ] **Step 4: Run the config test and verify it passes**

Run: `pnpm test src/components/admin/content-editor-config.test.ts`

Expected: 2 tests PASS.

### Task 2: Split fields into page and global editors

**Files:**
- Create: `src/components/admin/editor-page-guide.tsx`
- Create: `src/components/admin/editors/home-editor.tsx`
- Create: `src/components/admin/editors/conversion-editor.tsx`
- Create: `src/components/admin/editors/global-settings-editors.tsx`
- Modify: `src/components/admin/editor-fields.tsx`
- Modify: `src/components/admin/content-editor.tsx`
- Modify: `src/components/admin/editors/career-editor.tsx`
- Modify: `src/components/admin/editors/projects-editor.tsx`
- Modify: `src/components/admin/editors/practice-editor.tsx`
- Modify: `src/components/admin/editors/lounge-editor.tsx`
- Replace test: `src/components/admin/editors/overview-editor.test.tsx`

- [ ] **Step 1: Write failing tests for field ownership and page guidance**

Test these behaviors through `ContentEditor`:

```tsx
render(
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

rerender(/* activeEditor="brand" */);
expect(screen.getByText("前台位置：全局设置 > 品牌与身份")).toBeInTheDocument();
expect(screen.getByLabelText("网站名称")).toBeInTheDocument();
expect(screen.queryByLabelText("首页主张")).not.toBeInTheDocument();
```

Also verify the bottom action editor owns `页尾标题`, while the site-footer editor owns `页尾底部说明` and does not duplicate `页尾标题`.

- [ ] **Step 2: Run the focused editor tests and verify the new editor ids fail**

Run: `pnpm test src/components/admin/editors/overview-editor.test.tsx`

Expected: FAIL because `ContentEditor` does not yet support the new ids and focus callback.

- [ ] **Step 3: Add stable panel activation and the page guide**

Extend `EditorPanel` with optional `panelId` and `onActivate` props. Render `data-editor-panel-id`, call `onActivate` from `onFocusCapture` and `onPointerDownCapture`, and retain all existing styles and children.

Implement `EditorPageGuide` with:

- current location text;
- compact buttons for each panel;
- direct admin-form scrolling with `behavior: "smooth"`;
- `onPanelChange(panelId)` callback for preview focus.

- [ ] **Step 4: Implement focused editors without changing `SiteContent`**

Move existing fields as follows:

- `HomeEditor`: hero copy, hero tags, hero CTA, hero proof, hero practice headings.
- `ConversionEditor`: `presentation.footer.eyebrow` plus `content.footer` action fields.
- `BrandEditor`: `content.brand` fields.
- `NavigationEditor`: section labels, short labels, enabled state, order, and header CTA.
- `CapabilitiesEditor`: six capability-axis names.
- `SiteFooterEditor`: `presentation.footer.bottomNote`, with brand/location/year shown as inherited context rather than duplicated fields.

Leave the data keys unchanged. Remove `OverviewEditor` from routing after all fields have a new owner.

- [ ] **Step 5: Split existing page editors into stable panels**

Assign the panel ids defined in config. Split lounge fields into page guide, reception copy, conversation guide, and answer boundary panels. Keep all existing list editing, ordering, addition, deletion, and validation behavior.

- [ ] **Step 6: Run editor tests and verify they pass**

Run: `pnpm test src/components/admin/editors/overview-editor.test.tsx src/components/admin/editors/projects-editor.test.tsx`

Expected: all focused editor tests PASS.

### Task 3: Render two navigation groups and preserve drafts

**Files:**
- Modify: `src/components/admin/admin-shell.tsx`
- Modify: `src/app/admin/admin-workspace.tsx`
- Modify: `src/components/admin/admin-workspace.test.tsx`

- [ ] **Step 1: Update the workspace test first**

Change the integration test to assert:

```ts
expect(await screen.findByText("页面内容")).toBeInTheDocument();
expect(screen.getByText("全局设置")).toBeInTheDocument();

await user.click(screen.getByRole("button", { name: "首页" }));
// edit 首页主张
await user.click(screen.getByRole("button", { name: "导航与页面" }));
// toggle 展示实践现场
await user.click(screen.getByRole("button", { name: "项目与能力" }));
// inspect and save project data
```

Keep the final request-payload assertions proving the complete snapshot retains hero, sections, career, projects, and practice data.

- [ ] **Step 2: Run the workspace test and verify old navigation fails**

Run: `pnpm test src/components/admin/admin-workspace.test.tsx`

Expected: FAIL because the rail still renders the old flat items.

- [ ] **Step 3: Render grouped navigation and update workspace defaults**

Use `ADMIN_EDITOR_GROUPS` in `AdminShell`, render one named navigation group per configuration group, and initialize `activeEditor` to `home`. When an editor changes, update preview focus but do not replace or reload `draft`.

- [ ] **Step 4: Run the workspace test and verify it passes**

Run: `pnpm test src/components/admin/admin-workspace.test.tsx`

Expected: all workspace integration tests PASS.

### Task 4: Direct preview targeting without repeated jumps

**Files:**
- Modify: `src/components/admin/live-preview.tsx`
- Modify: `src/components/admin/live-preview.test.tsx`
- Modify: `src/app/admin/preview/preview-client.tsx`
- Modify: `src/components/layout/section-renderer.tsx`
- Modify: `src/components/layout/section-renderer.test.tsx`

- [ ] **Step 1: Write failing tests for focus message semantics**

Add a live-preview test asserting that the posted message includes:

```ts
focus: {
  requestId: 3,
  section: "projects",
  selector: ".projects-stage__cards",
  label: "项目卡片",
}
```

Rerender with changed content and the same `requestId`; assert the focus identity remains unchanged. Rerender with a new focus request and assert the new request is posted.

Add a renderer test asserting preview focus uses an immediate scroll and applies `is-admin-preview-focus` to the target, without dispatching the normal direct-navigation transition.

- [ ] **Step 2: Run preview tests and verify they fail because focus is absent**

Run: `pnpm test src/components/admin/live-preview.test.tsx src/components/layout/section-renderer.test.tsx`

Expected: FAIL on missing `focus` payload/prop and missing highlight behavior.

- [ ] **Step 3: Extend the preview protocol**

Add `focus?: AdminPreviewFocusRequest` to `ContentPreviewMessage`. Preserve it in `PreviewState`, pass it to `SectionRenderer`, and validate only known section ids. Do not treat a missing focus target as an invalid content message.

- [ ] **Step 4: Implement direct focus in the renderer**

In preview mode only, react to `focus.requestId` changes:

1. select the requested element or fall back to the section root/footer;
2. call `scrollIntoView({ behavior: "auto", block: "center" })`;
3. add `is-admin-preview-focus`;
4. remove the class after 800ms;
5. do nothing when only content changes with the same request id.

Missing/closed targets must be ignored safely, leaving the full preview rendered.

- [ ] **Step 5: Run preview tests and verify they pass**

Run: `pnpm test src/components/admin/live-preview.test.tsx src/components/layout/section-renderer.test.tsx`

Expected: all preview protocol and renderer tests PASS.

### Task 5: Styling, regression verification, and runtime check

**Files:**
- Modify: `src/app/globals.css`
- Modify: `docs/superpowers/plans/2026-08-09-admin-content-sectioning.md`

- [ ] **Step 1: Add restrained admin styles**

Style:

- distinct rail group labels and spacing;
- page guide breadcrumb and compact panel chips;
- active panel chip;
- preview focus with a thin purple outline and restrained glow;
- responsive wrapping at tablet/mobile widths.

Do not alter public-site layout or motion styling except the preview-only highlight class.

- [ ] **Step 2: Run focused tests**

Run:

```bash
pnpm test \
  src/components/admin/content-editor-config.test.ts \
  src/components/admin/editors/overview-editor.test.tsx \
  src/components/admin/admin-workspace.test.tsx \
  src/components/admin/live-preview.test.tsx \
  src/components/layout/section-renderer.test.tsx
```

Expected: all focused tests PASS.

- [ ] **Step 3: Run the full verification suite**

Run:

```bash
pnpm test
pnpm typecheck
pnpm lint
pnpm build
```

Expected: all commands exit 0 with no test failures, type errors, lint errors, or build errors.

- [ ] **Step 4: Verify the running application**

Check both endpoints:

```bash
curl -I http://127.0.0.1:52180/
curl -I http://127.0.0.1:52180/admin
```

Expected: both return HTTP 200. Manually confirm the admin rail shows both groups, switching editors preserves unsaved edits, and preview targeting does not black-screen.

- [ ] **Step 5: Mark each completed plan checkbox and summarize evidence**

Update this plan as execution proceeds, then report changed behavior, verification output, and any remaining manual visual checks.
