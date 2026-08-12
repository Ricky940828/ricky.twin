# Identity Card Content Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an independently managed identity-card content area with live front/back preview and real knowledge-base access cards.

**Architecture:** Add a backward-compatible identity-card content slice to `SiteContent`, normalize it during validation, pass it into the persistent character, and render the dialog from that data. Extend admin preview targeting with an identity-card overlay target so each editor panel opens the correct card face.

**Tech Stack:** Next.js 16, React 19, TypeScript, Vitest, Testing Library, Playwright

---

### Task 1: Define and normalize identity-card content

**Files:**
- Create: `src/content/identity-card.ts`
- Modify: `src/content/types.ts`
- Modify: `src/content/site-content.ts`
- Modify: `src/server/content/content-validation.ts`
- Test: `src/content/identity-card.test.ts`
- Test: `src/server/content/content-validation.test.ts`

- [ ] Write failing tests proving missing identity-card content receives current defaults and invalid configured fields fail validation.
- [ ] Run the focused tests and confirm they fail for the missing type/resolver/validator.
- [ ] Add `IdentityCardContent`, defaults, resolver, seed content, optional backward-compatible field, and validation normalization.
- [ ] Run focused tests and confirm they pass.

### Task 2: Render configured content and real knowledge states

**Files:**
- Modify: `src/components/character/identity-card-dialog.tsx`
- Modify: `src/components/character/persistent-character.tsx`
- Modify: `src/components/layout/section-renderer.tsx`
- Modify: `src/app/globals.css`
- Test: `src/components/character/lanyard-badge.test.tsx`

- [ ] Write failing component tests for configured front/back copy and `/api/knowledge-status` results.
- [ ] Run the focused test and confirm hard-coded content causes failure.
- [ ] Pass identity-card content through the renderer and replace fixed knowledge cards with the public knowledge-status response.
- [ ] Add overflow protection to the access grid and rerun the focused tests.

### Task 3: Add the dedicated admin editor and live overlay preview

**Files:**
- Create: `src/components/admin/editors/identity-card-editor.tsx`
- Modify: `src/components/admin/content-editor-config.ts`
- Modify: `src/components/admin/content-editor.tsx`
- Modify: `src/components/character/persistent-character.tsx`
- Modify: `src/components/layout/section-renderer.tsx`
- Test: `src/components/admin/content-editor-config.test.ts`
- Test: `src/components/admin/editors/overview-editor.test.tsx`
- Test: `src/components/layout/section-renderer.test.tsx`

- [ ] Write failing tests for the “身份名片” navigation item, owned fields, and front/back preview target.
- [ ] Run focused tests and confirm the editor and overlay target do not exist.
- [ ] Add two editor panels and extend preview focus with `identityFace` and `requestId`.
- [ ] Make the preview character reopen or flip the card whenever the selected panel changes.
- [ ] Run focused tests and confirm they pass.

### Task 4: Verify the complete flow

**Files:**
- Modify: `tests/e2e/admin-content.spec.ts`
- Modify: `tests/e2e/public-home.spec.ts`

- [ ] Add E2E assertions for editing the identity-card copy, seeing the overlay preview, saving, publishing, and opening the configured card on the public page.
- [ ] Run focused unit/component tests.
- [ ] Run typecheck and lint.
- [ ] Run the full test suite and identity-card E2E coverage.
- [ ] Review the diff to ensure no unrelated user changes were overwritten.
