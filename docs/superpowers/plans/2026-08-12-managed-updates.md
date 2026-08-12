# Ricky Twin Managed Updates Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a protected admin system-update page and a host-controlled transactional updater that can discover private releases, back up persistent data, update and restart the Docker application, and roll back safely.

**Architecture:** The Next.js service owns version discovery and request/status files but never controls Docker. A host systemd path unit invokes a narrowly scoped updater script that consumes validated requests from the persistent data volume. GitHub Actions publishes immutable private GHCR images and a release manifest containing compatibility metadata.

**Tech Stack:** Next.js 16, React 19, TypeScript, Vitest, Docker Compose, Bash/systemd, GitHub Actions and GitHub Releases/GHCR.

---

### Task 1: Version and persistent-data contracts

**Files:**
- Create: `src/server/update/update-types.ts`
- Create: `src/server/update/semver.ts`
- Create: `src/server/update/semver.test.ts`
- Create: `src/server/data/data-schema.ts`
- Create: `src/server/data/data-schema.test.ts`
- Modify: `src/server/content/file-content-store.ts`
- Modify: `src/server/knowledge/file-knowledge-store.ts`
- Modify: `src/server/agent/file-agent-store.ts`
- Modify: `src/server/runtime/file-runtime-store.ts`

- [ ] Write failing tests for semantic-version ordering, data metadata initialization, future-schema rejection and strict production parsing.
- [ ] Run the focused tests and confirm they fail because the contracts do not exist.
- [ ] Implement strict version parsing/comparison and data-root compatibility checks.
- [ ] Make every file store preserve corrupt files and throw in production instead of seeding over invalid data.
- [ ] Run store and data-schema tests and confirm they pass.

### Task 2: Release discovery and update request service

**Files:**
- Create: `src/server/update/github-release-provider.ts`
- Create: `src/server/update/github-release-provider.test.ts`
- Create: `src/server/update/file-update-store.ts`
- Create: `src/server/update/file-update-store.test.ts`
- Create: `src/server/update/update-service.ts`
- Create: `src/server/update/update-service.test.ts`
- Create: `src/app/api/admin/system/update/route.ts`
- Create: `src/app/api/admin/system/update/check/route.ts`
- Create: `src/app/api/admin/system/update/apply/route.ts`
- Create: `src/app/api/admin/system/update/rollback/route.ts`

- [ ] Write failing tests for private Release manifest retrieval, manifest validation, update availability, compatibility blocking, request generation and concurrent-operation rejection.
- [ ] Run focused tests and confirm the missing service behavior fails.
- [ ] Implement injected provider/store interfaces, strict manifest parsing and server-generated request files.
- [ ] Add administrator-protected status/check/apply/rollback routes; request bodies never accept image or shell input.
- [ ] Run focused service and route tests and confirm they pass.

### Task 3: System update admin page

**Files:**
- Create: `src/components/admin/update/system-update-manager.tsx`
- Create: `src/components/admin/update/system-update-manager.test.tsx`
- Modify: `src/components/admin/admin-shell.tsx`
- Modify: `src/app/admin/admin-workspace.tsx`
- Modify: `src/app/globals.css`

- [ ] Write failing component tests for current/latest version display, disabled reasons, update confirmation, progress polling and rollback confirmation.
- [ ] Run the focused component tests and confirm the new module is absent.
- [ ] Add a single “系统更新” module under system capabilities and implement the manager UI.
- [ ] Poll through transient restart failures with bounded backoff and resume from the persisted job state.
- [ ] Run admin component tests and confirm they pass.

### Task 4: Health and transactional host updater

**Files:**
- Create: `src/server/health/system-health.ts`
- Create: `src/server/health/system-health.test.ts`
- Create: `src/app/api/health/route.ts`
- Create: `deploy/data-maintenance.mjs`
- Create: `deploy/ricky-updater.sh`
- Create: `deploy/systemd/ricky-twin-update.path`
- Create: `deploy/systemd/ricky-twin-update.service`
- Create: `tests/deploy/ricky-updater.test.ts`

- [ ] Write failing tests for complete workspace validation, successful update sequencing, failed health-check rollback and request validation.
- [ ] Run focused tests and confirm the updater/health implementation is missing.
- [ ] Implement health reporting without secret leakage and data-maintenance check/migrate commands.
- [ ] Implement the locked host transaction: backup, pull, preflight, migrate, restart, health check, success or complete rollback.
- [ ] Add systemd units that watch only the fixed request path and expose no network listener.
- [ ] Run health and updater integration tests and confirm they pass.

### Task 5: Production image and private release pipeline

**Files:**
- Create: `Dockerfile`
- Create: `.dockerignore`
- Create: `compose.production.yaml`
- Create: `deploy/install-managed-updates.sh`
- Create: `.github/workflows/release.yml`
- Create: `update-manifest.example.json`
- Modify: `next.config.ts`
- Modify: `package.json`
- Modify: `.env.example`
- Modify: `README.md`

- [ ] Add a standalone production image that runs unprivileged and includes only runtime artifacts plus data maintenance.
- [ ] Add Compose mounts for `/app/data` and external environment configuration; never bake persisted data or secrets into the image.
- [ ] Add an idempotent installer for directories, updater/systemd units and private GHCR login prerequisites.
- [ ] Add the tag-triggered workflow that tests, builds, pushes by digest and uploads `update-manifest.json` to a private GitHub Release.
- [ ] Document first deployment, token scopes, release procedure, backup retention and disaster recovery.

### Task 6: Full verification and private GitHub delivery

**Files:**
- Modify: `docs/superpowers/plans/2026-08-12-managed-updates.md`

- [ ] Run `pnpm test` and require zero failures.
- [ ] Run `pnpm typecheck`, `pnpm lint` and `pnpm build` and require exit code 0.
- [ ] Run the focused deployment integration test with fake Docker/health commands and verify both success and rollback paths.
- [ ] Inspect `git diff`, scan staged files for credentials and verify `.ricky-twin-data`, `.env*` secrets and backups are excluded.
- [ ] Commit the feature, push `agent/managed-updates`, merge after verification, and push the resulting `main` commit to the existing private GitHub repository.

