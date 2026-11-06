# Ricky Twin Observability Center V1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将现有访客与运行页升级为可追踪访客转化、AI/RAG、请求和系统性能的轻量运营与运行中心，并支持加密保存问答 1～90 天。

**Architecture:** 保留现有 `RuntimeStore` 负责限额和线索，新增基于 Node `node:sqlite` 的 `ObservabilityStore` 负责监测明细。关键路由和 `ChatService` 写入统一请求编号、运行指标与加密问答；后台通过独立查询和按需详情接口读取。

**Tech Stack:** Next.js 16、React 19、TypeScript、Vitest、Node SQLite、现有 AES-256-GCM 密钥体系。

---

### Task 1: SQLite 监测存储与保留策略

**Files:**
- Create: `src/server/observability/observability-types.ts`
- Create: `src/server/observability/observability-store.ts`
- Create: `src/server/observability/sqlite-observability-store.ts`
- Test: `src/server/observability/sqlite-observability-store.test.ts`

- [ ] **Step 1: Write failing tests**

覆盖默认 `transcriptEnabled=true`、`retentionDays=30`，保留期限制在 1～90 天，问答密文落盘、列表不返回正文、详情按需解密，以及到期数据分批清理。

- [ ] **Step 2: Run tests and verify RED**

Run: `pnpm test src/server/observability/sqlite-observability-store.test.ts`

Expected: FAIL because the observability store does not exist.

- [ ] **Step 3: Implement the store**

定义以下核心接口：

```ts
export interface ObservabilitySettings {
  transcriptEnabled: boolean;
  retentionDays: number;
}

export interface ObservabilityStore {
  getSettings(): Promise<ObservabilitySettings>;
  updateSettings(input: Partial<ObservabilitySettings>): Promise<ObservabilitySettings>;
  recordAiRun(input: RecordAiRunInput): Promise<void>;
  getAiRunDetail(id: string): Promise<AiRunDetail | undefined>;
  recordBehavior(input: RecordBehaviorInput): Promise<void>;
  recordRequest(input: RecordRequestInput): Promise<void>;
  sampleSystem(): Promise<void>;
  getDashboard(rangeDays: number): Promise<ObservabilityDashboard>;
  cleanupExpired(): Promise<CleanupResult>;
}
```

SQLite 启用 WAL、外键和忙等待；所有正文使用 `encryptSecret`/`decryptSecret`；单例路径为 `${RICKY_CONTENT_DATA_DIR}/observability/monitoring.sqlite`。

- [ ] **Step 4: Run tests and verify GREEN**

Run: `pnpm test src/server/observability/sqlite-observability-store.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/server/observability
git commit -m "feat: add persistent observability store"
```

### Task 2: AI、请求与行为采集

**Files:**
- Modify: `src/server/agent/agent-types.ts`
- Modify: `src/server/agent/model-adapter.ts`
- Modify: `src/server/chat/chat-types.ts`
- Modify: `src/server/chat/chat-engine.ts`
- Modify: `src/server/chat/chat-service.ts`
- Create: `src/server/observability/request-monitor.ts`
- Create: `src/app/api/events/route.ts`
- Modify: `src/app/api/chat/route.ts`
- Modify: `src/app/api/chat/stream/route.ts`
- Modify: `src/app/api/visit/route.ts`
- Modify: `src/app/api/leads/route.ts`
- Modify: `src/components/analytics/visit-tracker.tsx`
- Modify: `src/components/layout/section-renderer.tsx`
- Test: `src/server/agent/model-adapter.test.ts`
- Test: `src/server/chat/chat-service.test.ts`
- Test: `src/server/observability/request-monitor.test.ts`
- Test: `src/components/analytics/visit-tracker.test.tsx`

- [ ] **Step 1: Write failing tests**

验证流式首字耗时和重试次数、provider request id 后缀、输入/输出 Token、成功/失败/部分回答均写入监测库；关键请求具有 `X-Request-Id`；前台只发送白名单事件且不影响页面。

- [ ] **Step 2: Run tests and verify RED**

Run: `pnpm test src/server/agent/model-adapter.test.ts src/server/chat/chat-service.test.ts src/server/observability/request-monitor.test.ts src/components/analytics/visit-tracker.test.tsx`

Expected: FAIL for the new metadata and request monitoring behavior.

- [ ] **Step 3: Implement minimal instrumentation**

`UnifiedModelResponse` 新增：

```ts
firstTokenMs?: number;
attempts?: number;
```

`ChatMeta` 新增连接编号、provider request id、首字耗时、重试次数和错误类型。`ChatService` 使用同一 `runId` 写入加密问题与最终/部分回答，并以 `try/finally` 保证运行收口。关键 API 通过 `observeRequest()` 记录 route、method、status、duration 和 error type。

- [ ] **Step 4: Run tests and verify GREEN**

Run the command from Step 2 and expect PASS.

- [ ] **Step 5: Commit**

```bash
git add src/server src/app/api src/components/analytics src/components/layout
git commit -m "feat: instrument visitor and AI activity"
```

### Task 3: 健康检查与系统性能

**Files:**
- Modify: `src/server/health/system-health.ts`
- Modify: `src/app/api/health/route.ts`
- Create: `src/app/api/health/ready/route.ts`
- Test: `src/server/health/system-health.test.ts`

- [ ] **Step 1: Write failing tests**

验证轻量存活检查不会读取四个工作区，深度就绪检查仍返回各存储状态，系统采样包含运行时间、内存、事件循环、磁盘和数据库体积。

- [ ] **Step 2: Run tests and verify RED**

Run: `pnpm test src/server/health/system-health.test.ts`

Expected: FAIL for liveness/readiness split.

- [ ] **Step 3: Implement health split**

保留 `createSystemHealthCheck` 作为 readiness；`/api/health` 仅返回版本、运行时间和 `ok:true` 并触发节流采样；`/api/health/ready` 执行原深度探针。

- [ ] **Step 4: Run tests and verify GREEN**

Run the command from Step 2 and expect PASS.

- [ ] **Step 5: Commit**

```bash
git add src/server/health src/app/api/health
git commit -m "feat: add lightweight health and system sampling"
```

### Task 4: 后台运营与运行中心

**Files:**
- Modify: `src/components/admin/admin-shell.tsx`
- Modify: `src/app/admin/admin-workspace.tsx`
- Rewrite: `src/components/admin/activity/activity-manager.tsx`
- Create: `src/components/admin/activity/activity-types.ts`
- Create: `src/app/api/admin/activity/settings/route.ts`
- Create: `src/app/api/admin/activity/runs/[id]/route.ts`
- Create: `src/app/api/admin/activity/cleanup/route.ts`
- Modify: `src/app/api/admin/activity/route.ts`
- Modify: `src/app/globals.css`
- Test: `src/components/admin/activity/activity-manager.test.tsx`
- Test: `src/components/admin/admin-shell.test.tsx`

- [ ] **Step 1: Write failing tests**

验证侧栏名称为“运营与运行”；五个页签可切换；总览显示趋势和异常；AI 详情按需加载完整问答；设置支持开关和 1～90 天；立即清理需要确认。

- [ ] **Step 2: Run tests and verify RED**

Run: `pnpm test src/components/admin/activity/activity-manager.test.tsx src/components/admin/admin-shell.test.tsx`

Expected: FAIL because the new center does not exist.

- [ ] **Step 3: Implement the admin center**

列表接口仅返回摘要。`GET /api/admin/activity/runs/:id` 单独返回解密详情并产生审计请求记录。设置保存后展示明确状态；系统性能页按 30 秒刷新，其他页按需刷新。

- [ ] **Step 4: Run tests and verify GREEN**

Run the command from Step 2 and expect PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/admin src/app/admin src/app/api/admin/activity src/app/globals.css
git commit -m "feat: build operations and runtime center"
```

### Task 5: 全量回归与部署验证

**Files:**
- Modify when required by verification: `Dockerfile`, `compose.production.yaml`, `README.md`

- [ ] **Step 1: Run unit and component tests**

Run: `pnpm test`

Expected: all tests pass.

- [ ] **Step 2: Run static verification**

Run: `pnpm lint && pnpm typecheck && pnpm build`

Expected: all commands exit 0.

- [ ] **Step 3: Verify Node 22 production compatibility**

Run: `docker build -t ricky-twin:observability-test .`

Expected: image builds with Node 22 and `node:sqlite` available.

- [ ] **Step 4: Review data safety**

检查 Git 变更不包含 `.env`、数据库、问答正文、API Key 或现有 `deploy/Caddyfile.production`。

- [ ] **Step 5: Commit final documentation adjustments**

```bash
git add Dockerfile compose.production.yaml README.md docs
git commit -m "docs: document observability operations"
```

