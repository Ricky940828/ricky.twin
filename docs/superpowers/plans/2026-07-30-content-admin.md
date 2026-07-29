# Ricky Twin Content Admin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a lightweight, authenticated content backend where Ricky can edit a draft, see the exact public result instantly at desktop/tablet/mobile sizes, and explicitly publish a complete version.

**Architecture:** Keep `SiteContent` as the single public content contract. A server-only repository stores `draft`, `published`, and immutable version snapshots through a narrow storage interface; the first implementation uses atomic JSON files for a zero-setup local/Docker workflow and leaves the repository boundary ready for PostgreSQL. The admin editor and `/admin/preview` communicate through `postMessage`, while both preview and public routes render the existing `SectionRenderer`.

**Tech Stack:** Next.js App Router 16, React 19, TypeScript, Node filesystem APIs, Vitest, Testing Library, Playwright, existing GSAP frontend.

## Global Constraints

- The public site reads only a complete published `SiteContent` snapshot; an invalid or missing file falls back to the checked-in seed snapshot.
- Draft edits never alter the public site until an explicit publish action succeeds.
- Preview and public output must use the exact same `SectionRenderer`; no duplicate preview markup.
- Preview supports desktop, tablet, and mobile frame widths, shows “草稿预览”, and disables external navigation, analytics, and real AI calls.
- The admin is a focused content tool, not a drag-and-drop low-code page builder.
- Admin APIs require a separate signed admin session; public visitor login is not reused.
- Content writes use atomic replacement and every publish creates an immutable version snapshot.
- No PostgreSQL dependency is required for local prototype startup; persistence stays behind an interface so PostgreSQL can replace the JSON adapter without changing routes or UI.

---

### Task 1: Define and validate the persisted content workspace

**Files:**
- Create: `src/server/content/content-workspace.ts`
- Create: `src/server/content/content-validation.ts`
- Create: `src/server/content/content-validation.test.ts`
- Modify: `src/content/types.ts`

**Interfaces:**
- Consumes: `SiteContent` and the checked-in `siteContent` seed.
- Produces: `ContentWorkspace`, `ContentVersionMeta`, `validateSiteContent(value): ValidationResult`, and `cloneSiteContent(content): SiteContent`.

- [x] **Step 1: Write failing validation tests**

Assert that validation accepts the complete seed, rejects duplicate section orders, rejects a missing required section, rejects a radar value outside `1..4`, and returns field-level issue paths.

- [x] **Step 2: Run the focused test and verify failure**

Run:

```bash
pnpm test src/server/content/content-validation.test.ts
```

Expected: FAIL because the workspace and validator do not exist.

- [x] **Step 3: Implement the content workspace types**

Define:

```ts
export interface ContentVersionMeta {
  id: string;
  createdAt: string;
  note: string;
}

export interface ContentWorkspace {
  draft: SiteContent;
  published: SiteContent;
  publishedVersion: ContentVersionMeta;
  versions: ContentVersionMeta[];
  draftUpdatedAt: string;
}
```

Add a discriminated validation result with `{ ok: true; value }` and `{ ok: false; issues }`.

- [x] **Step 4: Implement deterministic runtime validation**

Validate the complete `SiteContent` shape, all five required section IDs, unique orders and IDs, six radar axes, six radar values per stage, four ordered solution-path labels, supported practice statuses/icons, and supported knowledge access states. Return paths such as `career[1].radar[3]`.

- [x] **Step 5: Verify and commit**

Run:

```bash
pnpm test src/server/content/content-validation.test.ts
pnpm typecheck
```

Commit:

```bash
git add src/content/types.ts src/server/content
git commit -m "feat: define validated content workspace"
```

---

### Task 2: Add atomic draft, publish, and version persistence

**Files:**
- Create: `src/server/content/content-store.ts`
- Create: `src/server/content/file-content-store.ts`
- Create: `src/server/content/file-content-store.test.ts`
- Modify: `.gitignore`

**Interfaces:**
- Consumes: valid `SiteContent`, `ContentWorkspace`, and an injected data directory.
- Produces:

```ts
export interface ContentStore {
  getWorkspace(): Promise<ContentWorkspace>;
  saveDraft(content: SiteContent): Promise<ContentWorkspace>;
  publish(note: string): Promise<ContentWorkspace>;
  getPublished(): Promise<SiteContent>;
}

export function createFileContentStore(options?: {
  dataDir?: string;
}): ContentStore;
```

- [x] **Step 1: Write failing repository tests**

Use a test-scoped temporary directory. Assert first read seeds both draft and published content, draft save does not change published content, publish copies the draft to published, a publish creates a version file and metadata entry, and a fresh store instance reads the saved state.

- [x] **Step 2: Run the focused test and verify failure**

Run:

```bash
pnpm test src/server/content/file-content-store.test.ts
```

Expected: FAIL because the store does not exist.

- [x] **Step 3: Implement the filesystem adapter**

Use `fs.mkdir`, `fs.readFile`, `fs.writeFile`, and `fs.rename`. Write to a sibling temporary file before renaming. Store:

```text
.ricky-twin-data/content/workspace.json
.ricky-twin-data/content/versions/<version-id>.json
```

Generate version IDs from UTC timestamps plus a short random suffix. Never mutate the imported seed object.

- [x] **Step 4: Add corruption fallback**

If the workspace file is missing, seed it. If it is invalid JSON or fails validation, retain the broken file, return the checked-in seed as the safe public fallback, and surface a repository warning for the admin response.

- [x] **Step 5: Verify and commit**

Run:

```bash
pnpm test src/server/content/file-content-store.test.ts
pnpm lint
pnpm typecheck
```

Commit:

```bash
git add .gitignore src/server/content
git commit -m "feat: persist content drafts and published versions"
```

---

### Task 3: Protect admin APIs with a lightweight signed session

**Files:**
- Create: `src/server/admin/admin-auth.ts`
- Create: `src/server/admin/admin-auth.test.ts`
- Create: `src/app/api/admin/session/route.ts`
- Create: `src/app/api/admin/session/status/route.ts`
- Create: `src/app/api/admin/session/logout/route.ts`
- Create: `.env.example`

**Interfaces:**
- Consumes: `RICKY_ADMIN_PASSWORD` and `RICKY_ADMIN_SESSION_SECRET`.
- Produces: `createAdminSessionCookie()`, `verifyAdminRequest(request)`, and three session endpoints.

- [x] **Step 1: Write failing authentication tests**

Assert correct and incorrect password handling, signature tamper rejection, expiry rejection, and `HttpOnly`, `SameSite=Lax`, `Path=/`, and production-only `Secure` cookie attributes.

- [x] **Step 2: Run the focused test and verify failure**

Run:

```bash
pnpm test src/server/admin/admin-auth.test.ts
```

Expected: FAIL because authentication helpers do not exist.

- [x] **Step 3: Implement signed sessions**

Use Node `crypto.createHmac("sha256", secret)` and `timingSafeEqual`. The cookie payload contains only an issued-at and expiry timestamp. In local development only, expose `ricky-local` as the documented fallback password and a development signing secret; production must refuse to create a session when either environment variable is missing.

- [x] **Step 4: Implement session routes**

`POST /api/admin/session` accepts `{ password }`; status returns `{ authenticated }`; logout clears the cookie. Return generic `401` messages without revealing which credential failed.

- [x] **Step 5: Verify and commit**

Run:

```bash
pnpm test src/server/admin/admin-auth.test.ts
pnpm lint
pnpm typecheck
```

Commit:

```bash
git add .env.example src/server/admin src/app/api/admin/session
git commit -m "feat: protect admin workspace with signed session"
```

---

### Task 4: Expose content draft and publish APIs and serve the published snapshot

**Files:**
- Create: `src/app/api/admin/content/route.ts`
- Create: `src/app/api/admin/content/publish/route.ts`
- Create: `src/app/api/admin/content/versions/route.ts`
- Create: `src/server/content/content-service.ts`
- Create: `src/server/content/content-service.test.ts`
- Modify: `src/app/page.tsx`

**Interfaces:**
- Consumes: `ContentStore`, signed admin requests, and validation results.
- Produces: authenticated draft/save/publish/version APIs and a dynamic public page backed by `getPublished()`.

- [x] **Step 1: Write failing service tests**

Assert saving rejects invalid content without writing, valid draft save returns updated metadata, blank publish notes are normalized to “内容更新”, and public reads remain on the old snapshot until publish.

- [x] **Step 2: Run the focused test and verify failure**

Run:

```bash
pnpm test src/server/content/content-service.test.ts
```

Expected: FAIL because the service does not exist.

- [x] **Step 3: Implement content service and API responses**

Return:

```ts
type AdminContentResponse =
  | { ok: true; workspace: ContentWorkspace }
  | { ok: false; message: string; issues?: ValidationIssue[] };
```

Require admin authentication before reading the draft or any version metadata.

- [x] **Step 4: Switch the public page to the published store**

Make the root route dynamic, read `getPublished()` on the server, and pass the result to:

```tsx
<SectionRenderer site={published} />
```

The public route must never import draft state.

- [x] **Step 5: Verify and commit**

Run:

```bash
pnpm test src/server/content/content-service.test.ts src/app/page.test.tsx
pnpm lint
pnpm typecheck
pnpm build
```

Commit:

```bash
git add src/app/api/admin/content src/app/page.tsx src/server/content
git commit -m "feat: connect public content publishing workflow"
```

---

### Task 5: Build the focused admin editor

**Files:**
- Create: `src/app/admin/page.tsx`
- Create: `src/app/admin/admin-workspace.tsx`
- Create: `src/components/admin/admin-login.tsx`
- Create: `src/components/admin/admin-shell.tsx`
- Create: `src/components/admin/content-editor.tsx`
- Create: `src/components/admin/editors/overview-editor.tsx`
- Create: `src/components/admin/editors/career-editor.tsx`
- Create: `src/components/admin/editors/projects-editor.tsx`
- Create: `src/components/admin/editors/practice-editor.tsx`
- Create: `src/components/admin/editors/lounge-editor.tsx`
- Create: `src/components/admin/admin-workspace.test.tsx`
- Modify: `src/app/globals.css`

**Interfaces:**
- Consumes: `ContentWorkspace` from `/api/admin/content`.
- Produces: an authenticated editor that emits a complete `SiteContent` draft on every field change and saves explicitly.

- [ ] **Step 1: Write failing admin interaction tests**

Mock the session and content APIs. Assert unauthenticated users see the admin login, authenticated users see version/draft status, hero copy edits update local draft state, a section can be enabled/disabled, career/project/practice array items can be selected and edited, and save sends a complete `SiteContent`.

- [ ] **Step 2: Run the focused test and verify failure**

Run:

```bash
pnpm test src/components/admin/admin-workspace.test.tsx
```

Expected: FAIL because the admin UI does not exist.

- [ ] **Step 3: Implement admin shell and editor navigation**

Use a compact left rail with “内容概览、职业路线、项目主题、实践入口、AI 会客厅”. Keep persistent save/publish status in the top bar. Forms use explicit labels, character-count guidance, and inline validation messages.

- [ ] **Step 4: Implement typed immutable draft updates**

Provide small update helpers for object fields and array items. Do not mutate nested arrays in place. Keep all five section configs present; “关闭” changes only `enabled`.

- [ ] **Step 5: Implement save state**

Show “未保存、保存中、已保存、保存失败” states. Save only on an explicit button; editing never auto-publishes.

- [ ] **Step 6: Verify and commit**

Run:

```bash
pnpm test src/components/admin/admin-workspace.test.tsx
pnpm lint
pnpm typecheck
```

Commit:

```bash
git add src/app/admin src/components/admin src/app/globals.css
git commit -m "feat: add focused frontend content editor"
```

---

### Task 6: Add exact live preview, device switching, and publishing

**Files:**
- Create: `src/app/admin/preview/page.tsx`
- Create: `src/app/admin/preview/preview-client.tsx`
- Create: `src/components/admin/live-preview.tsx`
- Create: `src/components/admin/live-preview.test.tsx`
- Modify: `src/components/layout/section-renderer.tsx`
- Modify: `src/app/admin/admin-workspace.tsx`
- Modify: `src/app/globals.css`

**Interfaces:**
- Consumes: the editor’s current complete draft.
- Produces: `LivePreview` with `desktop | tablet | mobile`, full-screen preview, replay, and explicit publish workflow.

- [ ] **Step 1: Write failing preview tests**

Assert device buttons set frame widths `1440`, `820`, and `390`; draft changes post a `ricky:content-preview` message; full-screen opens `/admin/preview`; and publish requires a note confirmation.

- [ ] **Step 2: Run the focused test and verify failure**

Run:

```bash
pnpm test src/components/admin/live-preview.test.tsx
```

Expected: FAIL because the preview bridge does not exist.

- [ ] **Step 3: Implement the preview route**

Fetch the authenticated draft once, listen only to same-origin messages shaped as:

```ts
{
  type: "ricky:content-preview";
  payload: SiteContent;
  replayKey: number;
}
```

Render `<SectionRenderer key={replayKey} mode="preview" site={draft} />`.

- [ ] **Step 4: Disable preview side effects**

In preview mode prevent external anchors from navigating and keep the lounge on simulated answers. Do not emit visit events. Keep internal section navigation and all visual interactions active.

- [ ] **Step 5: Implement device and publish controls**

The parent admin page sizes the iframe, posts every draft change, exposes “重播动效” and “全屏预览”, and calls the publish endpoint only after a confirmation dialog with a release note.

- [ ] **Step 6: Verify and commit**

Run:

```bash
pnpm test src/components/admin/live-preview.test.tsx src/components/layout/section-renderer.test.tsx
pnpm lint
pnpm typecheck
pnpm build
```

Commit:

```bash
git add src/app/admin/preview src/components/admin src/components/layout/section-renderer.tsx src/app/globals.css
git commit -m "feat: add exact draft preview and publishing"
```

---

### Task 7: Verify the complete content-management loop in a browser

**Files:**
- Create: `tests/e2e/admin-content.spec.ts`
- Modify: `playwright.config.ts`
- Modify: `docs/superpowers/plans/2026-07-30-content-admin.md`

**Interfaces:**
- Produces: repeatable acceptance coverage for login, edit, exact preview, device switching, save, publish, and public isolation.

- [ ] **Step 1: Add authenticated browser setup**

Start the test server with:

```text
RICKY_ADMIN_PASSWORD=test-admin
RICKY_ADMIN_SESSION_SECRET=test-session-secret
RICKY_CONTENT_DATA_DIR=.ricky-twin-data/playwright
```

- [ ] **Step 2: Write the end-to-end content workflow**

Log in, change the hero statement, assert the preview iframe updates before saving, switch to 390px preview, save the draft, verify the public page still shows the published statement, publish with a note, and verify the public page now shows the new statement. Restore the original snapshot at the end.

- [ ] **Step 3: Verify preview boundaries**

Assert “草稿预览” is visible, an external practice link cannot navigate the iframe, and the preview does not request any analytics or real chat endpoint.

- [ ] **Step 4: Run the completion gate**

Run:

```bash
pnpm test
pnpm test:e2e
pnpm lint
pnpm typecheck
pnpm build
git diff --check
git status --short
```

Expected: all checks pass; only intentional source and plan files remain.

- [ ] **Step 5: Commit**

```bash
git add tests/e2e/admin-content.spec.ts playwright.config.ts docs/superpowers/plans/2026-07-30-content-admin.md
git commit -m "test: verify content admin publishing loop"
```
