# Ricky Twin Public Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the high-fidelity, responsive public frontend of Ricky 会客厅 with real character assets, data-driven sections, authored motion, and a simulated AI lounge ready for later backend integration.

**Architecture:** Use a single Next.js App Router application. Public content lives behind a typed `SiteContent` contract so the first milestone can use verified seed data and later switch to published backend snapshots without rewriting components. Motion is split into small client components; content and pure state models remain testable without a browser.

**Tech Stack:** Next.js 16.2.12, React 19.2.8, TypeScript, Tailwind CSS 4, GSAP/ScrollTrigger, Vitest, Testing Library, Playwright, pnpm.

## Global Constraints

- Site name is `Ricky 会客厅`.
- Public career route is `点融网 → 还呗 → 小象优品 → 海尔消费金融`.
- Purple is the only primary highlight; background is near-black purple; text is cold white.
- Dot Field stays across the whole site and weakens behind dense content.
- Only the visible character clip plays; reduced-motion mode uses PNG posters.
- Magic Rings appears only behind the AI lounge character.
- Target Cursor is not installed globally; only local four-corner target-lock feedback is used.
- Public components consume typed content; company names, project counts, links, knowledge-base names, and section order are not hard-coded into layout algorithms.
- Desktop, mobile, keyboard, and `prefers-reduced-motion` paths must remain usable.
- Milestone one uses simulated lounge answers and performs no external model calls.

---

## Planned File Map

```text
src/
  app/
    globals.css                       global tokens, reset, typography and motion fallbacks
    layout.tsx                        metadata and root document
    page.tsx                          public page composition
  components/
    background/
      dot-field-math.ts               pure dot displacement model
      dot-field.tsx                   fixed global canvas
    character/
      character-video.tsx             browser-specific transparent video and visibility control
      identity-card-dialog.tsx        flip identity card
      lanyard-badge.tsx               draggable badge and spring return
    layout/
      section-renderer.tsx            enabled-section sorting, component mapping and preview-ready content injection
      site-header.tsx                 sticky navigation and lounge CTA
      site-footer.tsx                 final contact actions
    motion/
      magic-rings.tsx                 localized lounge ring field
      pressure-title.tsx              pointer-responsive RICKY title
      target-lock.tsx                 local four-corner hover/focus affordance
    sections/
      hero-section.tsx                identity, CTAs, character and practice dock
      career/
        capability-radar.tsx          six-axis staged radar
        career-model.ts               pure progress and radar functions
        career-route.tsx              SVG route, avatar and guided scrolling
        career-section.tsx            career section composition
      projects/
        card-swap-model.ts             pure project index reducer
        card-swap.tsx                  GSAP card stack
        project-detail-dialog.tsx      project details
        projects-section.tsx           problem-to-outcome panel
      practice-section.tsx             full live-project grid
      lounge/
        lounge-model.ts                simulated reply state
        lounge-section.tsx             knowledge status, quick questions and chat
  content/
    site-content.ts                   verified milestone-one content
    site-content.test.ts              contract and copy checks
    types.ts                          public content types
  hooks/
    use-intersection-active.ts        visible section and media activation
    use-prefers-reduced-motion.ts     shared reduced-motion signal
  lib/
    cn.ts                             class-name helper
    gsap-client.ts                    registered browser-only GSAP plugins
    section-navigation.ts             anchor and ordered-section helpers
public/
  character/                          copied WebM, MOV and PNG files
tests/
  e2e/public-home.spec.ts             public narrative and interaction smoke tests
  e2e/reduced-motion.spec.ts          motion fallback checks
vitest.config.ts
vitest.setup.ts
playwright.config.ts
```

---

### Task 1: Initialize the Next.js application and test harness

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `next.config.ts`
- Create: `postcss.config.mjs`
- Create: `eslint.config.mjs`
- Create: `src/app/layout.tsx`
- Create: `src/app/page.tsx`
- Create: `src/app/globals.css`
- Create: `vitest.config.ts`
- Create: `vitest.setup.ts`
- Create: `playwright.config.ts`
- Create: `src/app/page.test.tsx`

**Interfaces:**
- Produces: runnable Next.js app and commands `pnpm dev`, `pnpm build`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:e2e`.

- [x] **Step 1: Create package and framework configuration**

Create scripts:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint .",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test"
  }
}
```

Install runtime dependencies:

```bash
pnpm add next@16.2.12 react@19.2.8 react-dom@19.2.8 gsap @gsap/react lucide-react clsx
```

Install development dependencies:

```bash
pnpm add -D typescript @types/node @types/react @types/react-dom tailwindcss @tailwindcss/postcss eslint eslint-config-next vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event @playwright/test
```

- [x] **Step 2: Write the failing root-page test**

```tsx
import { render, screen } from "@testing-library/react";
import HomePage from "./page";

it("renders the Ricky 会客厅 shell", () => {
  render(<HomePage />);
  expect(screen.getByRole("main")).toBeInTheDocument();
  expect(screen.getByText("Ricky 会客厅")).toBeInTheDocument();
});
```

- [x] **Step 3: Run the test and verify the empty shell fails**

Run:

```bash
pnpm test src/app/page.test.tsx
```

Expected: FAIL because the page shell and label do not exist.

- [x] **Step 4: Implement the minimal root layout and page**

`layout.tsx` must export Chinese metadata and load `globals.css`. `page.tsx` must render:

```tsx
export default function HomePage() {
  return (
    <main>
      <span className="sr-only">Ricky 会客厅</span>
    </main>
  );
}
```

- [x] **Step 5: Verify the baseline**

Run:

```bash
pnpm test src/app/page.test.tsx
pnpm lint
pnpm typecheck
pnpm build
```

Expected: all commands pass.

- [x] **Step 6: Commit**

```bash
git add package.json pnpm-lock.yaml tsconfig.json next.config.ts postcss.config.mjs eslint.config.mjs src vitest.config.ts vitest.setup.ts playwright.config.ts
git commit -m "build: initialize Ricky Twin frontend"
```

---

### Task 2: Define the public content contract and verified seed data

**Files:**
- Create: `src/content/types.ts`
- Create: `src/content/site-content.ts`
- Create: `src/content/site-content.test.ts`
- Create: `src/lib/section-navigation.ts`
- Create: `src/lib/section-navigation.test.ts`

**Interfaces:**
- Produces: `SiteContent`, `SiteSectionId`, `CareerStage`, `ProjectTheme`, `PracticeLink`, `KnowledgeBadge`.
- Produces: `siteContent: SiteContent`.
- Produces: `getEnabledSectionIds(content: SiteContent): SiteSectionId[]`.

- [x] **Step 1: Write contract tests**

Test exact public labels:

```ts
expect(siteContent.brand.name).toBe("Ricky 会客厅");
expect(siteContent.career.map(stage => stage.publicBrand)).toEqual([
  "点融网",
  "还呗",
  "小象优品",
  "海尔消费金融",
]);
expect(siteContent.capabilityAxes).toHaveLength(6);
expect(siteContent.projects.map(project => project.title)).toEqual([
  "机构业务商业判断与产品落地",
  "资产资金标准化",
  "自营 H5 信贷产品落地",
  "AI 知识资产化与 FDE 实践",
]);
```

Also assert every enabled section has a unique ID, every career stage has six radar values, every project has four solution-path steps, and no public text contains `即科` or `源石云`.

- [x] **Step 2: Run tests and verify failure**

Run:

```bash
pnpm test src/content/site-content.test.ts src/lib/section-navigation.test.ts
```

Expected: FAIL because the contract and seed data do not exist.

- [x] **Step 3: Implement typed content**

Use discriminated IDs:

```ts
export type SiteSectionId =
  | "hero"
  | "career"
  | "projects"
  | "practice"
  | "lounge";

export interface CareerStage {
  id: string;
  publicBrand: string;
  period: string;
  role: string;
  positioning: string;
  highlights: string[];
  radar: [number, number, number, number, number, number];
  nextStageId?: string;
}
```

Set the hero seed exactly:

```ts
hero: {
  eyebrow: "DIGITAL TWIN · SHANGHAI · ONLINE",
  welcome:
    "这里是 Ricky 的 AI 会客厅，我是 Ricky 的数字分身。您可以在这里了解我的职业路径与项目经验，也可以进入 AI 会客厅与我对话，继续了解更多哦～",
  tags: [
    "金融产品经理",
    "AI 应用实战者",
    "人工智能训练师（三级）",
    "企业知识库落地咨询",
  ],
  primaryCta: "进入 AI 会客厅",
  secondaryCta: "沿职业路线认识我",
}
```

Populate the career narrative from:

`/Users/ricky/Library/Mobile Documents/iCloud~md~obsidian/Documents/Obsidian/00-工作台/海尔消费金融公司项目/工作影分身/数字分身专项 V1.1/40-能力证据/00-四阶段职业能力与知识演进总览.md`

Translate the second public brand to `还呗` while retaining only the approved abstracted capability content. Use maturity values `1, 2, 3, 4` for 接触、形成、深化、体系化.

- [x] **Step 4: Implement section ordering**

```ts
export function getEnabledSectionIds(content: SiteContent) {
  return [...content.sections]
    .filter(section => section.enabled)
    .sort((a, b) => a.order - b.order)
    .map(section => section.id);
}
```

- [x] **Step 5: Verify content contract**

Run:

```bash
pnpm test src/content/site-content.test.ts src/lib/section-navigation.test.ts
```

Expected: PASS.

- [x] **Step 6: Commit**

```bash
git add src/content src/lib/section-navigation.ts src/lib/section-navigation.test.ts
git commit -m "feat: add typed public content contract"
```

---

### Task 3: Build the global visual system, Dot Field, and target-lock primitive

**Files:**
- Modify: `src/app/globals.css`
- Create: `src/lib/cn.ts`
- Create: `src/hooks/use-prefers-reduced-motion.ts`
- Create: `src/components/background/dot-field-math.ts`
- Create: `src/components/background/dot-field-math.test.ts`
- Create: `src/components/background/dot-field.tsx`
- Create: `src/components/motion/target-lock.tsx`
- Create: `src/components/motion/target-lock.test.tsx`

**Interfaces:**
- Produces: `computeDotOffset(dot, pointer, options): { x: number; y: number; intensity: number }`.
- Produces: `<DotField density="normal" | "subtle" />`.
- Produces: `<TargetLock as="div" active?: boolean>`.

- [x] **Step 1: Write Dot Field math tests**

```ts
expect(computeDotOffset({x: 0, y: 0}, {x: 1000, y: 1000, speed: 0}, options))
  .toEqual({x: 0, y: 0, intensity: 0});

expect(computeDotOffset({x: 10, y: 10}, {x: 10, y: 10, speed: 1}, options).intensity)
  .toBeGreaterThan(0);
```

- [x] **Step 2: Write target-lock accessibility test**

Render a keyboard-focusable child and assert the wrapper keeps the native cursor and exposes four decorative corners with `aria-hidden="true"`.

- [x] **Step 3: Verify tests fail**

Run:

```bash
pnpm test src/components/background/dot-field-math.test.ts src/components/motion/target-lock.test.tsx
```

Expected: FAIL because both components are absent.

- [x] **Step 4: Implement visual tokens**

Define CSS variables:

```css
:root {
  --ink: #09070f;
  --ink-soft: #100c19;
  --panel: rgb(28 18 42 / 0.68);
  --line: rgb(182 127 255 / 0.22);
  --text: #f5f2fa;
  --muted: #aaa2b8;
  --purple: #a855f7;
  --purple-bright: #c084fc;
  --mint: #77e3bf;
}
```

Add glass panels, section spacing, focus rings, `sr-only`, and reduced-motion rules.

- [x] **Step 5: Implement Dot Field**

Use one fixed `pointer-events: none` canvas. Draw a deterministic grid, displace dots with a quadratic distance curve, scale force by pointer speed, and ease each dot back to origin. In reduced-motion mode, draw one static frame.

- [x] **Step 6: Implement local target-lock**

Render four absolutely positioned corner spans. Activate on `:hover`, `:focus-within`, or explicit `active`; preserve the system cursor.

- [x] **Step 7: Verify**

Run:

```bash
pnpm test src/components/background/dot-field-math.test.ts src/components/motion/target-lock.test.tsx
pnpm lint
pnpm typecheck
```

Expected: PASS.

- [x] **Step 8: Commit**

```bash
git add src/app/globals.css src/lib/cn.ts src/hooks src/components/background src/components/motion/target-lock*
git commit -m "feat: add global visual and pointer response system"
```

---

### Task 4: Integrate character assets, visibility playback, and draggable identity badge

**Files:**
- Create: `public/character/ricky-hero-idle.webm`
- Create: `public/character/ricky-hero-idle.mov`
- Create: `public/character/ricky-hero-idle-poster.png`
- Create: `public/character/ricky-career-walk.webm`
- Create: `public/character/ricky-career-walk.mov`
- Create: `public/character/ricky-career-walk-poster.png`
- Create: `public/character/ricky-project-guide.webm`
- Create: `public/character/ricky-project-guide.mov`
- Create: `public/character/ricky-project-guide-poster.png`
- Create: `public/character/ricky-lounge-welcome.webm`
- Create: `public/character/ricky-lounge-welcome.mov`
- Create: `public/character/ricky-lounge-welcome-poster.png`
- Create: `src/hooks/use-intersection-active.ts`
- Create: `src/components/character/character-video.tsx`
- Create: `src/components/character/character-video.test.tsx`
- Create: `src/components/character/lanyard-badge.tsx`
- Create: `src/components/character/lanyard-badge.test.tsx`
- Create: `src/components/character/identity-card-dialog.tsx`

**Interfaces:**
- Produces: `<CharacterVideo scene="hero" | "career" | "projects" | "lounge" active />`.
- Produces: `<LanyardBadge onOpenIdentity={() => void 0} />`.
- Produces: `<IdentityCardDialog open onClose />`.

- [x] **Step 1: Copy approved assets**

Copy from:

```text
/Users/ricky/Library/Mobile Documents/iCloud~md~obsidian/Documents/Obsidian/我的知识库/50-项目库/网站设计/数字双生会客厅/人物动态素材/02-网页透明素材
```

Verify twelve expected files and reject source MP4 previews.

- [x] **Step 2: Write media behavior tests**

Mock `IntersectionObserver` and `matchMedia`. Assert:

- reduced motion renders the poster and no autoplay video;
- inactive video is paused;
- active video is muted, looped, and `playsInline`;
- Safari selects MOV and other browsers select WebM.

- [x] **Step 3: Write badge interaction tests**

Assert pointer movement updates badge translation, pointer release returns it to rest, a movement below six pixels opens the identity dialog, and Escape closes the dialog.

- [x] **Step 4: Verify tests fail**

Run:

```bash
pnpm test src/components/character
```

Expected: FAIL because the character components are absent.

- [x] **Step 5: Implement media and badge components**

Use pointer capture for dragging. Clamp movement to the character safety area. Derive badge rotation from horizontal velocity and animate return with GSAP. Keep the badge as a DOM layer above the transparent character video.

- [x] **Step 6: Implement identity card**

Use an accessible native dialog. Front face shows name, location, and identity tags; back face shows public knowledge scope and current RAG status. Provide a visible flip control and close control.

- [x] **Step 7: Verify**

Run:

```bash
pnpm test src/components/character
pnpm lint
pnpm typecheck
```

Expected: PASS.

- [x] **Step 8: Commit**

```bash
git add public/character src/hooks/use-intersection-active.ts src/components/character
git commit -m "feat: integrate digital twin character and identity badge"
```

---

### Task 5: Build the site header and hero reception

**Files:**
- Create: `src/components/layout/site-header.tsx`
- Create: `src/components/motion/pressure-title.tsx`
- Create: `src/components/motion/pressure-title.test.tsx`
- Create: `src/components/sections/hero-section.tsx`
- Create: `src/components/sections/hero-section.test.tsx`

**Interfaces:**
- Consumes: `siteContent.brand`, `siteContent.hero`, `siteContent.practice`.
- Produces: `<SiteHeader sections activeSection />`.
- Produces: `<HeroSection content practiceLinks onNavigate />`.

- [x] **Step 1: Write hero copy and navigation tests**

Assert the exact welcome copy, four identity tags, AI lounge primary button, career secondary button, four initial practice links, and accessible labels.

- [x] **Step 2: Verify failure**

Run:

```bash
pnpm test src/components/sections/hero-section.test.tsx src/components/motion/pressure-title.test.tsx
```

Expected: FAIL because hero components do not exist.

- [x] **Step 3: Implement `PressureTitle`**

Split `RICKY` into letters. Convert pointer distance into bounded `scaleX`, `translateY`, and weight changes. Disable pointer transformation in reduced-motion mode.

- [x] **Step 4: Implement hero composition**

Use a two-column desktop composition and a single-column mobile composition. Place the practice dock below the character. Wrap each practice link in `TargetLock`. Open external links in a new tab with `rel="noreferrer"`.

- [x] **Step 5: Implement sticky header**

Generate navigation from enabled section IDs. Keep `进入 AI 会客厅` visually primary and synchronize active section without hard-coding disabled sections.

- [x] **Step 6: Verify**

Run:

```bash
pnpm test src/components/sections/hero-section.test.tsx src/components/motion/pressure-title.test.tsx
pnpm lint
pnpm typecheck
```

Expected: PASS.

- [x] **Step 7: Commit**

```bash
git add src/components/layout/site-header.tsx src/components/motion/pressure-title* src/components/sections/hero-section*
git commit -m "feat: build digital twin reception hero"
```

---

### Task 6: Build the guided career route and staged capability radar

**Files:**
- Create: `src/lib/gsap-client.ts`
- Create: `src/components/sections/career/career-model.ts`
- Create: `src/components/sections/career/career-model.test.ts`
- Create: `src/components/sections/career/capability-radar.tsx`
- Create: `src/components/sections/career/career-route.tsx`
- Create: `src/components/sections/career/career-section.tsx`
- Create: `src/components/sections/career/career-section.test.tsx`

**Interfaces:**
- Produces: `getStageIndex(progress: number, stageCount: number): number`.
- Produces: `interpolateRadar(previous, current, localProgress): RadarTuple`.
- Produces: `<CareerSection stages axes />`.

- [x] **Step 1: Write career model tests**

Cover progress `0`, node boundaries, progress `1`, radar interpolation, and invalid input clamping.

```ts
expect(getStageIndex(0, 4)).toBe(0);
expect(getStageIndex(1, 4)).toBe(3);
expect(interpolateRadar([1,1,1,1,1,1], [2,2,2,2,2,2], 0.5))
  .toEqual([1.5,1.5,1.5,1.5,1.5,1.5]);
```

- [x] **Step 2: Write interaction test**

Assert the first stage card opens initially, `下一站：还呗 →` activates the second stage, and the last stage displays `查看代表项目 →`.

- [x] **Step 3: Verify failure**

Run:

```bash
pnpm test src/components/sections/career
```

Expected: FAIL because the route and radar are absent.

- [x] **Step 4: Implement radar**

Use responsive SVG. Render four grid levels, six axis labels, a low-opacity previous-stage outline, and a purple current polygon. Display maturity labels instead of numeric scores.

- [x] **Step 5: Implement scroll-driven route**

Register GSAP and ScrollTrigger only in the browser. Pin the desktop route during its scroll range. On update:

- calculate active stage;
- sample the SVG path with `getPointAtLength`;
- move the walking character;
- illuminate completed path;
- update the stage card and radar.

- [x] **Step 6: Implement guided movement**

The stage CTA scrolls to the next stage’s progress point. Manual wheel, touch, or keyboard scrolling cancels the active guided animation. Mobile uses vertical nodes and native smooth scrolling.

- [x] **Step 7: Verify**

Run:

```bash
pnpm test src/components/sections/career
pnpm lint
pnpm typecheck
```

Expected: PASS.

- [x] **Step 8: Commit**

```bash
git add src/lib/gsap-client.ts src/components/sections/career
git commit -m "feat: add guided career route and capability radar"
```

---

### Task 7: Build Card Swap projects and detail panels

**Files:**
- Create: `src/components/sections/projects/card-swap-model.ts`
- Create: `src/components/sections/projects/card-swap-model.test.ts`
- Create: `src/components/sections/projects/card-swap.tsx`
- Create: `src/components/sections/projects/project-detail-dialog.tsx`
- Create: `src/components/sections/projects/projects-section.tsx`
- Create: `src/components/sections/projects/projects-section.test.tsx`

**Interfaces:**
- Produces: `cardSwapReducer(state, event): CardSwapState`.
- Produces: `<CardSwap projects activeIndex onChange onOpen />`.
- Produces: `<ProjectsSection projects />`.

- [x] **Step 1: Write reducer tests**

Test next, previous, direct selection, wraparound prevention, and dynamic project counts from one through eight.

- [x] **Step 2: Write project-section tests**

Assert four initial titles, the four-step path labels, `01 / 04`, click-driven card change, and detail-dialog opening.

- [x] **Step 3: Verify failure**

Run:

```bash
pnpm test src/components/sections/projects
```

Expected: FAIL because project components do not exist.

- [x] **Step 4: Implement Card Swap**

Render at most four visible layers. Use a GSAP timeline:

1. current card drops and fades;
2. remaining cards advance;
3. previous current card returns to the back;
4. right-side solution path updates after the midpoint.

Respond to click, keyboard arrows, and bounded wheel intent. Do not use an interval.

- [x] **Step 5: Implement detail dialog and project character**

Wrap the current card with `TargetLock`. Add the project-guide character outside the card stack. The dialog displays definition, judgment, application, representative cases, and abstracted outcomes without exposing evidence paths.

- [x] **Step 6: Verify**

Run:

```bash
pnpm test src/components/sections/projects
pnpm lint
pnpm typecheck
```

Expected: PASS.

- [x] **Step 7: Commit**

```bash
git add src/components/sections/projects
git commit -m "feat: add project card swap narrative"
```

---

### Task 8: Build the complete practice section

**Files:**
- Create: `src/components/sections/practice-section.tsx`
- Create: `src/components/sections/practice-section.test.tsx`

**Interfaces:**
- Consumes: `PracticeLink[]`.
- Produces: `<PracticeSection links />`.

- [x] **Step 1: Write practice tests**

Assert every visible item renders title, description, type, and status. Items with a configured URL render an external link; items awaiting a URL render a disabled `即将开放` action. Assert hidden items do not render and reordered data changes visual order.

- [x] **Step 2: Verify failure**

Run:

```bash
pnpm test src/components/sections/practice-section.test.tsx
```

Expected: FAIL because the practice section is absent.

- [x] **Step 3: Implement the practice grid**

Render deep-purple glass cards with icon, short explanation, live status, and external-action affordance. Use `TargetLock` on each card. The component must consume the same objects used by the hero practice dock. Configure AI Token 中转站 as `https://api.aicenter.net.cn`; keep AIGC 工具站、咖啡操作台和 GitHub visible with `即将开放` until their destination URLs enter the content record.

- [x] **Step 4: Verify**

Run:

```bash
pnpm test src/components/sections/practice-section.test.tsx
pnpm lint
pnpm typecheck
```

Expected: PASS.

- [x] **Step 5: Commit**

```bash
git add src/components/sections/practice-section*
git commit -m "feat: add live practice showcase"
```

---

### Task 9: Build the simulated AI lounge and localized Magic Rings

**Files:**
- Create: `src/components/motion/magic-rings.tsx`
- Create: `src/components/motion/magic-rings.test.tsx`
- Create: `src/components/sections/lounge/lounge-model.ts`
- Create: `src/components/sections/lounge/lounge-model.test.ts`
- Create: `src/components/sections/lounge/lounge-section.tsx`
- Create: `src/components/sections/lounge/lounge-section.test.tsx`

**Interfaces:**
- Produces: `<MagicRings active pulseKey reducedMotion />`.
- Produces: `getSimulatedReply(questionId): LoungeReply`.
- Produces: `<LoungeSection content knowledgeBadges />`.

- [ ] **Step 1: Write Magic Rings tests**

Assert four or five rings render, mouse-follow handlers are absent, pulse state changes only after the first submitted question, and reduced-motion mode uses static rings.

- [ ] **Step 2: Write lounge behavior tests**

Assert:

- four exact quick questions render;
- knowledge semantic names and permission states render once at the top;
- individual replies do not show source paths or source-topic lists;
- restricted action opens the permission prompt;
- contact action opens the lead form;
- first question increments the ring pulse key once.

- [ ] **Step 3: Verify failure**

Run:

```bash
pnpm test src/components/motion/magic-rings.test.tsx src/components/sections/lounge
```

Expected: FAIL because lounge components are absent.

- [ ] **Step 4: Implement Magic Rings**

Use SVG arcs with four to five staggered rings. Animate a slow scale/rotation cycle and one explicit pulse timeline. Keep opacity below the character and chat hierarchy. Render a static low-opacity ring field for reduced motion.

- [ ] **Step 5: Implement simulated lounge**

Use a small state machine with `idle`, `thinking`, and `answered`. Simulated replies must follow:

```ts
interface LoungeReply {
  answer: string;
  boundary?: string;
  nextAction?: "none" | "request-access" | "leave-contact";
}
```

Do not call external APIs. Keep the UI contract ready for a later `/api/chat` stream.

- [ ] **Step 6: Verify**

Run:

```bash
pnpm test src/components/motion/magic-rings.test.tsx src/components/sections/lounge
pnpm lint
pnpm typecheck
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/components/motion/magic-rings* src/components/sections/lounge
git commit -m "feat: add simulated AI reception lounge"
```

---

### Task 10: Integrate data-driven section rendering and final public page

**Files:**
- Create: `src/components/layout/section-renderer.tsx`
- Create: `src/components/layout/section-renderer.test.tsx`
- Create: `src/components/layout/site-footer.tsx`
- Modify: `src/app/page.tsx`
- Modify: `src/app/page.test.tsx`

**Interfaces:**
- Consumes: any complete `SiteContent` snapshot and section component map.
- Produces: complete one-page public route.

- [ ] **Step 1: Write section-renderer tests**

Given an ordered configuration with one disabled section, assert:

- only enabled sections render;
- order follows configuration;
- navigation receives the same order;
- replacing the supplied content snapshot immediately changes rendered copy without rebuilding the component map;
- unknown section IDs fail at compile time through `satisfies Record<SiteSectionId, ...>`.

- [ ] **Step 2: Verify failure**

Run:

```bash
pnpm test src/components/layout/section-renderer.test.tsx src/app/page.test.tsx
```

Expected: FAIL because the public sections are not integrated.

- [ ] **Step 3: Implement the renderer**

Use an exhaustive map of adapters that all accept the same `site` prop:

```ts
const sectionComponents = {
  hero: ({ site }) => (
    <HeroSection content={site.hero} practiceLinks={site.practice} />
  ),
  career: ({ site }) => (
    <CareerSection stages={site.career} axes={site.capabilityAxes} />
  ),
  projects: ({ site }) => <ProjectsSection projects={site.projects} />,
  practice: ({ site }) => <PracticeSection links={site.practice} />,
  lounge: ({ site }) => (
    <LoungeSection
      content={site.lounge}
      knowledgeBadges={site.knowledgeBadges}
    />
  ),
} satisfies Record<
  SiteSectionId,
  React.ComponentType<{ site: SiteContent }>
>;
```

Mount one global `DotField`, sticky `SiteHeader`, ordered sections, and `SiteFooter`. `SectionRenderer` must receive `site: SiteContent` through props and must not import the singleton seed data internally. This lets the public page pass the published snapshot and the future admin preview pass its current draft through the exact same renderer.

- [ ] **Step 4: Implement transitions**

The hero lounge CTA runs one short character-glitch overlay, then scrolls to the lounge. It must not replay during ordinary scrolling. Section transitions update the header and preload the next character clip.

- [ ] **Step 5: Verify**

Run:

```bash
pnpm test
pnpm lint
pnpm typecheck
pnpm build
```

Expected: all commands pass.

- [ ] **Step 6: Commit**

```bash
git add src/components/layout src/app
git commit -m "feat: integrate Ricky Twin public experience"
```

---

### Task 11: Add browser-level acceptance tests and visual verification

**Files:**
- Create: `tests/e2e/public-home.spec.ts`
- Create: `tests/e2e/reduced-motion.spec.ts`
- Create: `tests/e2e/mobile.spec.ts`
- Modify: `playwright.config.ts`

**Interfaces:**
- Produces: repeatable browser acceptance for desktop, mobile, and reduced motion.

- [ ] **Step 1: Write desktop acceptance test**

Cover:

```ts
await expect(page.getByText("Ricky 会客厅")).toBeVisible();
await page.getByRole("button", { name: "沿职业路线认识我" }).click();
await expect(page.getByText("点融网")).toBeVisible();
await page.getByRole("button", { name: "下一站：还呗 →" }).click();
await expect(page.getByText("还呗")).toBeVisible();
await expect(page.getByText("机构业务商业判断与产品落地")).toBeVisible();
await page.getByRole("button", { name: "你如何判断一个机构合作是否值得推进？" }).click();
await expect(page.getByTestId("lounge-answer")).toBeVisible();
```

- [ ] **Step 2: Write reduced-motion test**

Emulate reduced motion, assert character posters are visible, videos do not autoplay, and all navigation/actions remain available.

- [ ] **Step 3: Write mobile test**

Use a 390 × 844 viewport. Assert vertical career order, readable project cards, horizontal practice dock, and unobstructed lounge input.

- [ ] **Step 4: Run tests and fix product defects**

Run:

```bash
pnpm exec playwright install chromium
pnpm test:e2e
```

Expected: all tests pass without timing retries.

- [ ] **Step 5: Perform local visual inspection**

Run:

```bash
pnpm dev
```

Inspect desktop and mobile in the browser. Confirm:

- no horizontal overflow;
- Dot Field remains subtle in dense sections;
- character alpha edges are clean;
- badge drag remains independent from the video;
- career scrolling and CTA guidance stay synchronized;
- Card Swap does not trap page scrolling;
- Magic Rings stays behind content;
- native cursor remains visible;
- focus states and reduced-motion fallbacks are clear.

- [ ] **Step 6: Run the completion gate**

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

Expected: tests, lint, type check, and build pass; only intentional files remain.

- [ ] **Step 7: Commit**

```bash
git add tests playwright.config.ts
git commit -m "test: verify public frontend experience"
```
