# Investigation Notes

## Investigation Status

- Bootstrap Status: Complete
- Current Status: Complete for solution design; expanded with comprehensive live responsive viewport/interaction testing after the user requested a broader testing-led investigation; ready for architecture re-review.
- Investigation Goal: Read setup documentation, start backend/frontend, reproduce responsive workspace failures at narrowed/shortened viewport sizes, inspect implementation ownership, and produce design-ready requirements plus a responsive-layout design spec.
- Scope Classification (`Small`/`Medium`/`Large`): Large
- Scope Classification Rationale: Affects the app shell, workspace route, desktop/mobile layout selection, left-side navigation/history panel, right-side tool panel, and responsive coverage. No backend domain change is required.
- Scope Summary: Replace fragmented standard `/workspace` responsive behavior with a single adaptive desktop-capability workspace policy while preserving wide desktop UX and leaving `/mobile` phone/PWA shell untouched.
- Primary Questions Resolved:
  - Setup docs: root/server/web READMEs explain install/build/run, but the web README endpoint env names are stale for current `nuxt.config.ts`.
  - `/workspace` owner: `autobyteus-web/pages/workspace.vue` currently owns route-level desktop/mobile switching.
  - Blank responsive band: caused by `640px` JS media query in `pages/workspace.vue` conflicting with Tailwind `md` (`768px`) visibility in the layout components.
  - Bad narrow UX: caused by legacy `WorkspaceMobileLayout` fallback below `640px` and lack of adaptive side-surface collapse at `md+` constrained widths.
  - Design issue: yes; root cause is duplicated responsive policy/coordination and unclear ownership between route, layout components, app shell, and side-panel composables.
  - Comprehensive probe severity model: P0 blank `640-767px`; P1 legacy `<640px` `/workspace` fallback; P1 cramped `768-1024px` side-panel docking; P2 short-height recovery; P2 accidental control/tool ordering.

## Request Context

User reports that frontend responsiveness is bad and likely never improved. Desktop UX is considered good. Narrower or shorter screens make the experience very bad, possibly because the app switches into a mobile layout. User requested live investigation by reading README and starting backend and frontend. Reference screenshot: `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_cf4a90aca58e4386a4a197a5ee57c986/solution_designer_85691d7a110248d8a149c739387c1619/context_files/ctx_d90ccf47e7cd__image.png` showing an embedded browser at `http://127.0.0.1:13002/workspace` with a black mobile-style header and blank gray body.

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): Git
- Task Workspace Root: /Users/normy/autobyteus_org/autobyteus-worktrees/frontend-responsive-ux-audit
- Task Artifact Folder: /Users/normy/autobyteus_org/autobyteus-worktrees/frontend-responsive-ux-audit/tickets/frontend-responsive-ux-audit
- Current Branch: codex/frontend-responsive-ux-audit
- Current Worktree / Working Directory: /Users/normy/autobyteus_org/autobyteus-worktrees/frontend-responsive-ux-audit
- Bootstrap Base Branch: origin/personal @ ff17d2bb051724375e7ee6b227ea71dfafe2ccd0
- Remote Refresh Result: `git fetch origin --prune` succeeded before worktree creation.
- Task Branch: codex/frontend-responsive-ux-audit
- Expected Base Branch (if known): personal / origin/personal
- Expected Finalization Target (if known): personal
- Bootstrap Blockers: None
- Notes For Downstream Agents: Authoritative work occurs in this dedicated worktree, not in `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo`.

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-06-24 | Command | `git status --short --branch` in `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo` | Determine starting branch and cleanliness | Starting checkout was `personal...origin/personal` with unrelated untracked `.article-work/` and `docs/articles/`. | No |
| 2026-06-24 | Command | `git remote show origin` | Resolve default base branch | Remote HEAD is `personal`. | No |
| 2026-06-24 | Command | `git fetch origin --prune` | Refresh remote refs before task branch creation | Succeeded. | No |
| 2026-06-24 | Command | `git worktree add -b codex/frontend-responsive-ux-audit /Users/normy/autobyteus_org/autobyteus-worktrees/frontend-responsive-ux-audit origin/personal` | Create dedicated task worktree/branch | Succeeded. | No |
| 2026-06-24 | Data | User screenshot reference file path listed above | Understand reported failure mode | Shows `/workspace` at narrow embedded width selecting black mobile-style top bar and blank gray body. | Reproduced with live `700x700` and `760x700` probes |
| 2026-06-24 | Doc | `/Users/normy/autobyteus_org/autobyteus-worktrees/frontend-responsive-ux-audit/README.md` | Read repo setup/run docs | Root setup is `pnpm install`; build examples show `pnpm --filter autobyteus-web build` and `pnpm --filter autobyteus-server-ts build`; README includes `pnpm -C autobyteus-server-ts dev` example but package has no `dev` script. | Record docs mismatch |
| 2026-06-24 | Doc | `autobyteus-server-ts/README.md` | Determine backend startup | Build with `pnpm -C autobyteus-server-ts build`; run `node autobyteus-server-ts/dist/app.js --host 0.0.0.0 --port 8000`; optional `--data-dir`. | Used for live startup |
| 2026-06-24 | Doc | `autobyteus-web/README.md` | Determine frontend startup | Documents `.env` with `NUXT_PUBLIC_GRAPHQL_BASE_URL`, `NUXT_PUBLIC_REST_BASE_URL`, `NUXT_PUBLIC_WS_BASE_URL`; development command `pnpm dev`. | Actual config uses `BACKEND_*`; doc needs sync |
| 2026-06-24 | Code | `autobyteus-web/nuxt.config.ts` | Verify frontend endpoint config | Development mode uses `/graphql` and `/rest` proxy plus `BACKEND_*` WebSocket endpoints derived from `BACKEND_NODE_BASE_URL`/`BACKEND_REST_BASE_URL`; production uses `BACKEND_GRAPHQL_BASE_URL`, etc. | Yes, docs update |
| 2026-06-24 | Command | `pnpm install` | Install dependencies in dedicated worktree | Succeeded; installed workspace dependencies. | No |
| 2026-06-24 | Command | `pnpm -C autobyteus-server-ts build` | Build backend before live startup | Succeeded; built shared packages, generated Prisma, compiled server. | No |
| 2026-06-24 | Setup | `node autobyteus-server-ts/dist/app.js --data-dir /tmp/autobyteus-responsive-ux-audit-server-data --host 127.0.0.1 --port 13001` with isolated env including `DATABASE_URL=file:/tmp/.../db/production.db` | Start backend for live probes | Succeeded; server listened on `127.0.0.1:13001`; isolated SQLite migrations applied. Initial attempt without clearing inherited env pointed Prisma to user DB; stopped and restarted with explicit isolated `DATABASE_URL`. | No |
| 2026-06-24 | Setup | `pnpm -C autobyteus-web dev --host 127.0.0.1 --port 13002` | Start frontend for live probes | Succeeded; Nuxt served `http://127.0.0.1:13002/`. First attempt using README `NUXT_PUBLIC_*` env produced connection refused; existing tracked `.env`/`nuxt.config.ts` use `BACKEND_*`, and restart with temporary `BACKEND_*` values fixed endpoint setup. | Docs sync |
| 2026-06-24 | Trace | `node tickets/frontend-responsive-ux-audit/probes/probe-responsive.mjs` | Browser-probe responsive layout at multiple viewport sizes | Generated screenshots and JSON under `tickets/frontend-responsive-ux-audit/probes/`; reproduced blank 640-767 band and cramped 800/1024 layouts. | Downstream can reuse |
| 2026-06-24 | Code | `autobyteus-web/pages/workspace.vue` | Inspect route layout selection | Uses `isDesktop` ref driven by `window.matchMedia('(min-width: 640px)')`; renders `WorkspaceDesktopLayout` if true, else `WorkspaceMobileLayout`. | Refactor required |
| 2026-06-24 | Code | `autobyteus-web/components/layout/WorkspaceDesktopLayout.vue` | Inspect desktop workspace layout | Root class `hidden md:flex`; right panel docked with `rightPanelWidth`; center min `200px`; no adaptive presentation. | Refactor/rename required |
| 2026-06-24 | Code | `autobyteus-web/components/layout/WorkspaceMobileLayout.vue` and `autobyteus-web/composables/useMobilePanels.ts` | Inspect mobile fallback | Legacy tab UI with `Running`, optional `Files`, optional `Content`, `Agent`; no standard right-side tools; `useMobilePanels` switches on `window.innerWidth < 768`. | Remove/decommission from standard `/workspace` |
| 2026-06-24 | Code | `autobyteus-web/layouts/default.vue` and `autobyteus-web/composables/useLeftPanel.ts` | Inspect app-shell responsive behavior | Outer shell switches at `md`; left panel defaults to `320px` and remains docked at `md+`; no responsive auto-collapse separate from user preference. | Refactor required |
| 2026-06-24 | Code | `autobyteus-web/composables/useRightPanel.ts` | Inspect right-panel width behavior | `DEFAULT_RIGHT_PANEL_WIDTH=450`, `MIN_RIGHT_PANEL_WIDTH=400`, `MIN_WORKSPACE_CENTER_WIDTH=200`; clamps width but never auto-collapses or presents as drawer/strip. | Refactor required |
| 2026-06-24 | Code | `autobyteus-web/pages/mobile.vue`, `components/mobile/*`, `utils/mobileFeatureGates.ts` | Confirm phone/PWA ownership | `/mobile` uses `MobileRemoteAccessShell` with `layout: false`; mobile feature gates explicitly treat `/workspace` as `desktopWorkspace` unavailable in mobile runtime. | Preserve boundary |
| 2026-06-24 | Other | User follow-up: `even the layout of those buttons orders, etc` | Clarify responsive design scope | User expects button/control layout and ordering to be addressed, not only panel breakpoints. | Updated requirements/design with canonical surface/tool order |
| 2026-06-24 | Other | User follow-up requesting comprehensive testing during investigation | Clarify investigation depth | User expects broad live testing before finalizing the UI plan, not just source inspection or one screenshot. | Added comprehensive viewport/interaction probe and report |
| 2026-06-24 | Trace | `node tickets/frontend-responsive-ux-audit/probes/comprehensive/probe-current-responsive-ui.mjs` | Run expanded responsive UI probe against live backend/frontend | Generated `current-responsive-ui-results.json`, `probe-summary-latest.json`, and screenshots for 17 `/workspace` viewports plus `/mobile` route boundary. Confirmed P0/P1/P2 issue classes. | Use as durable evidence and downstream validation template |
| 2026-06-24 | Data | `/Users/normy/autobyteus_org/autobyteus-worktrees/frontend-responsive-ux-audit/tickets/frontend-responsive-ux-audit/comprehensive-responsive-ui-test-report.md` | Summarize comprehensive probe findings and design impact | Records full matrix, screenshot paths, problem catalogue, adaptive UI mode plan, control-order plan, and durable validation requirements. | Include in handoff package |

## Current Behavior / Current Flow

- Current entrypoint or first observable boundary: Browser opens standard route `/workspace`; Nuxt applies `layouts/default.vue`; `pages/workspace.vue` selects desktop/mobile workspace layout by JS media query.
- Current execution flow:
  1. Viewport loads `/workspace`.
  2. `layouts/default.vue` independently switches app chrome at Tailwind `md` (`768px`): full docked left panel at `md+`, mobile header/off-canvas left panel below `md`.
  3. `pages/workspace.vue` independently evaluates `matchMedia('(min-width: 640px)')`.
  4. If `>=640`, Vue mounts `WorkspaceDesktopLayout`; that component then uses CSS `hidden md:flex`, so it is invisible until `>=768`.
  5. If `<640`, Vue mounts `WorkspaceMobileLayout`; that component uses CSS `md:hidden` and presents a legacy limited tab UI.
  6. At `md+`, `WorkspaceDesktopLayout` renders center and right tools; `useRightPanel` clamps right width but only preserves `200px` center.
- Ownership or boundary observations:
  - There is no single owner for standard workspace responsive behavior.
  - The route (`pages/workspace.vue`), component CSS (`WorkspaceDesktopLayout`, `WorkspaceMobileLayout`), outer app shell (`layouts/default.vue`), and panel composables (`useLeftPanel`, `useRightPanel`, `useMobilePanels`) all encode responsive decisions.
  - The true phone/PWA shell is already separately owned by `/mobile` and `components/mobile/*`; `WorkspaceMobileLayout` is not the authoritative mobile product owner.
- Current behavior summary:
  - `640-767px`: blank body because mounted desktop layout is CSS-hidden.
  - `<640px`: legacy limited workspace tabs appear but lose desktop tools/capabilities.
  - `768-1024px`: docked side surfaces squeeze the center to unusable widths.
  - Short heights: layout remains mounted but cramped; left/workspace split and center/right split need height-aware adaptation.

## Design Health Assessment Evidence

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Larger Requirement / Behavior Change / Responsive Layout Refactor
- Candidate root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Duplicated Policy Or Coordination; Boundary Or Ownership Issue; File Placement Or Responsibility Drift
- Refactor posture evidence summary: Refactor needed now. A local breakpoint fix would only address the blank band while leaving legacy mobile fallback and cramped side-panel behavior intact.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| `pages/workspace.vue:39-41` | JS desktop threshold is `640px`. | Route owns policy separate from CSS. | Replace with shared policy owner. |
| `WorkspaceDesktopLayout.vue:5` | Desktop layout root is `hidden md:flex`, hidden until `768px`. | Direct cause of blank `640-767px` band. | Remove duplicated CSS/route split. |
| `WorkspaceMobileLayout.vue:2` | Mobile layout root is `md:hidden`; only mounted below `640px`. | Confirms no visible layout at `640-767px`. | Decommission from standard route. |
| Live `700x700` probe | Header visible, main gray body blank; desktop layout mounted but `display:none`. | Reproduces reported failure. | Add browser-level coverage. |
| Live `800x700` probe | Left `320px`, center `200px`, right `273px`. | Side surfaces have no adaptive collapse; center minimum too low. | Refactor panel policy. |
| `useRightPanel.ts:5-8` | Right default/min widths and center min are hard-coded; center min `200px`. | Current policy optimizes keeping docked right panel over usable center. | Add presentation modes. |
| `/mobile` code path | Mature mobile shell exists independently. | Standard `/workspace` should not borrow stale mobile fallback. | Preserve `/mobile` boundary. |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-web/pages/workspace.vue` | Standard workspace route; fetches settings; selects desktop/mobile layout. | Owns `640px` breakpoint and imports legacy mobile layout. | Should delegate responsive layout to one workspace policy/layout owner; remove route-level mobile split. |
| `autobyteus-web/layouts/default.vue` | Global app shell, header, left panel, main slot. | Uses Tailwind `md` behavior and full left panel at `md+`; no width/height policy beyond CSS classes. | Needs app-shell responsive presentation that can auto-collapse or overlay left panel separately from user preference. |
| `autobyteus-web/components/layout/WorkspaceDesktopLayout.vue` | Current center + right tools desktop split. | Hidden below `md`; name/file responsibility is no longer accurate if it becomes all standard workspace layout. | Rename/reshape into adaptive standard workspace layout owner. |
| `autobyteus-web/components/layout/WorkspaceMobileLayout.vue` | Legacy mobile-tab fallback for `/workspace`. | Limited capabilities; only referenced by `pages/workspace.vue`; not the true `/mobile` product shell. | Remove/decommission from standard `/workspace`; delete if unused. |
| `autobyteus-web/composables/useMobilePanels.ts` | Legacy local active-mobile-panel state. | Only supports legacy workspace mobile component; uses `window.innerWidth < 768`. | Remove with legacy component unless another owner remains. |
| `autobyteus-web/composables/useRightPanel.ts` | Global right panel visible/preferred width and drag resizing. | Clamps docked right panel but does not switch presentation; preserves only `200px` center. | Extend to support responsive effective presentation/auto-collapse without overwriting user preference. |
| `autobyteus-web/composables/useLeftPanel.ts` | Global left panel visibility/width and drag resizing. | User visibility and responsive effective mode are not separated. | Add shell policy or separate effective presentation owner. |
| `autobyteus-web/components/layout/RightSideTabs.vue` | Right tool tabs and content. | Good candidate to reuse in docked and drawer/sheet presentations; has `mode='mobile-tools'` but filters files, so standard narrow workspace should not blindly use that mode if files must remain reachable. | Reuse as canonical right-tool content; adapt container/presentation around it. |
| `autobyteus-web/pages/mobile.vue` + `components/mobile/*` | True phone/PWA mobile remote access shell. | Uses `MobileRemoteAccessShell`, `layout:false`; tests assert it does not import `WorkspaceMobileLayout`. | Must remain separate and unaffected. |
| `autobyteus-web/README.md` | Frontend setup docs. | Documents `NUXT_PUBLIC_*` endpoint env names not used by current `nuxt.config.ts`. | Delivery docs sync needed. |

## Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-06-24 | Setup | `pnpm install` | Installed 1716 workspace packages in dedicated worktree. | Runtime probes can run in isolated worktree. |
| 2026-06-24 | Setup | `pnpm -C autobyteus-server-ts build` | Build passed. | Backend can run from source. |
| 2026-06-24 | Setup | `node autobyteus-server-ts/dist/app.js --data-dir /tmp/autobyteus-responsive-ux-audit-server-data --host 127.0.0.1 --port 13001` with explicit isolated env | Backend listened on `127.0.0.1:13001`; isolated DB created and migrated. | Live backend available. |
| 2026-06-24 | Setup | `pnpm -C autobyteus-web dev --host 127.0.0.1 --port 13002` | Frontend served at `127.0.0.1:13002`. | Live frontend available. |
| 2026-06-24 | Probe | `node tickets/frontend-responsive-ux-audit/probes/probe-responsive.mjs` using Chrome headless and Playwright Core | Generated `responsive-probe-results.json` and viewport screenshots. | Durable evidence for downstream. |
| 2026-06-24 | Repro | `gap-700x700.png`, `gap-760x700.png` | Black mobile header and blank gray workspace body; body text lacks workspace content except hidden off-canvas aside. | Confirms exact blank responsive band. |
| 2026-06-24 | Probe | `responsive-probe-results.json` for `700x700`/`760x700` | `mediaMin640=true`, `mediaMin768=false`, `desktopLayout.display='none'`, desktop layout rect `0x0`. | Root cause is `640` JS threshold vs `md` CSS threshold. |
| 2026-06-24 | Probe | `responsive-probe-results.json` for `800x700` | `aside.width=320`, `main.width=477`, `centerShell.width=200`, `rightPanel.width=273`. | Current constrained desktop is technically visible but unusably cramped. |
| 2026-06-24 | Probe | `responsive-probe-results.json` for `1024x768` | `aside.width=320`, `main.width=701`, `centerShell.width=247`, `rightPanel.width=450`. | Even 1024px width has poor center usability. |
| 2026-06-24 | Probe | `responsive-probe-results.json` for `500x700`/`639x700` | Legacy mobile layout visible with `Running`, `Agent`, `Running List`, `Configuration`, but no standard right-tool tabs. | Legacy fallback loses workspace capabilities. |
| 2026-06-24 | Probe | `short-800x420.png` | Docked three-pane layout remains, center is `200px`, right is `273px`, left vertical split is cramped. | Height should influence auto-collapse/strip behavior. |
| 2026-06-24 | Probe | `node tickets/frontend-responsive-ux-audit/probes/comprehensive/probe-current-responsive-ui.mjs` | Comprehensive matrix covered `390x844`, `390x640`, `500x700`, `500x420`, `639x700`, `640x700`, `700x700`, `767x700`, `768x700`, `800x700`, `800x420`, `900x700`, `1024x768`, `1024x480`, `1180x800`, `1280x800`, `1440x900`. | Confirms responsive problem is not isolated to one screenshot; failures span blank, legacy narrow fallback, cramped docked panes, short-height, and accidental control order. |
| 2026-06-24 | Probe | Comprehensive `/mobile` route check at `390x844` | `/mobile` rendered `AUTOBYTEUS REMOTE ACCESS` / `MobileRemoteAccessShell` without the standard workspace failure flags. | `/mobile` should remain the separate phone/PWA owner and not be reused as `/workspace` fallback. |

Probe artifacts:
- `/Users/normy/autobyteus_org/autobyteus-worktrees/frontend-responsive-ux-audit/tickets/frontend-responsive-ux-audit/probes/responsive-probe-results.json`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/frontend-responsive-ux-audit/tickets/frontend-responsive-ux-audit/probes/desktop-1440x900.png`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/frontend-responsive-ux-audit/tickets/frontend-responsive-ux-audit/probes/desktop-1024x768.png`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/frontend-responsive-ux-audit/tickets/frontend-responsive-ux-audit/probes/narrow-desktop-800x700.png`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/frontend-responsive-ux-audit/tickets/frontend-responsive-ux-audit/probes/gap-760x700.png`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/frontend-responsive-ux-audit/tickets/frontend-responsive-ux-audit/probes/gap-700x700.png`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/frontend-responsive-ux-audit/tickets/frontend-responsive-ux-audit/probes/mobile-639x700.png`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/frontend-responsive-ux-audit/tickets/frontend-responsive-ux-audit/probes/mobile-500x700.png`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/frontend-responsive-ux-audit/tickets/frontend-responsive-ux-audit/probes/short-1024x480.png`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/frontend-responsive-ux-audit/tickets/frontend-responsive-ux-audit/probes/short-800x420.png`

Comprehensive probe artifacts:
- `/Users/normy/autobyteus_org/autobyteus-worktrees/frontend-responsive-ux-audit/tickets/frontend-responsive-ux-audit/comprehensive-responsive-ui-test-report.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/frontend-responsive-ux-audit/tickets/frontend-responsive-ux-audit/probes/comprehensive/probe-current-responsive-ui.mjs`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/frontend-responsive-ux-audit/tickets/frontend-responsive-ux-audit/probes/comprehensive/current-responsive-ui-results.json`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/frontend-responsive-ux-audit/tickets/frontend-responsive-ux-audit/probes/comprehensive/probe-summary-latest.json`
- Representative screenshots: `gap-700x700-initial.png`, `phone-390x844-initial.png`, `tablet-800x700-initial.png`, `small-desktop-1024x768-initial.png`, `desktop-1180x800-initial.png`, `mobile-route-390x844.png` under the comprehensive probe folder.

## External / Public Source Findings

No external/public web sources were needed. Investigation used repository docs, source code, local runtime, and local browser probes.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: Source backend `autobyteus-server-ts` and source frontend `autobyteus-web`.
- Required config, feature flags, env vars, or accounts:
  - Backend isolated run used `APP_ENV=production`, `AUTOBYTEUS_SERVER_HOST=http://127.0.0.1:13001`, `DB_TYPE=sqlite`, `DATABASE_URL=file:/tmp/autobyteus-responsive-ux-audit-server-data/db/production.db`, `CODEX_APP_SERVER_SANDBOX=danger-full-access`, `CLAUDE_AGENT_SDK_PERMISSION_MODE=bypassPermissions`.
  - Frontend dev run temporarily changed the tracked `autobyteus-web/.env` to `BACKEND_*` endpoint values for `127.0.0.1:13001`; the file was restored after probes.
- External repos, samples, or artifacts cloned/downloaded for investigation: None.
- Setup commands materially used:
  - `pnpm install`
  - `pnpm -C autobyteus-server-ts build`
  - `node autobyteus-server-ts/dist/app.js --data-dir /tmp/autobyteus-responsive-ux-audit-server-data --host 127.0.0.1 --port 13001`
  - `pnpm -C autobyteus-web dev --host 127.0.0.1 --port 13002`
  - `node tickets/frontend-responsive-ux-audit/probes/probe-responsive.mjs`
- Cleanup notes for temporary investigation-only setup:
  - Backend/frontend sessions should be stopped after design handoff.
  - Temporary server data is under `/tmp/autobyteus-responsive-ux-audit-server-data`.
  - The tracked `autobyteus-web/.env` was restored after the investigation; no environment-file change is intended for handoff.

## Findings From Code / Docs / Data / Logs

1. Breakpoint ownership is duplicated and inconsistent; this directly causes the blank band.
2. The current legacy `WorkspaceMobileLayout` is not the same as the mature `/mobile` shell and should not govern standard workspace responsiveness.
3. Right panel and left panel policies optimize for keeping panels docked rather than preserving a usable center workspace in constrained windows.
4. Short-height behavior needs explicit policy because existing split panes can remain technically mounted while functionally cramped.
5. Startup docs are partially stale regarding frontend endpoint environment variable names.
6. Button/control order is also currently accidental: legacy narrow `/workspace` exposes ambiguous `Running`/`Agent` top-level buttons, while right-tool order exists only inside `useRightSideTabs` and is not promoted to a canonical cross-presentation order.
7. The comprehensive test matrix should become durable coverage: it is the only investigation artifact that simultaneously catches blank bands, legacy fallback, cramped panel math, short-height behavior, tool reachability/order, wide desktop non-regression, and `/mobile` isolation.

## Constraints / Dependencies / Compatibility Facts

- Wide desktop UX must remain materially unchanged.
- `/mobile` route must stay separate and unaffected.
- Tailwind `md` default is `768px`; JS logic must not independently drift from CSS visibility breakpoints.
- Existing `RightSideTabs` and right-tool components should be reused as canonical tool content instead of duplicating tool UI in a new mobile-specific standard workspace path.
- No backward-compatible dual standard-workspace mobile/desktop path should remain after the adaptive route is introduced; the old fallback should be removed/decommissioned.

## Open Unknowns / Risks

- Exact width/height threshold values need implementation tuning and visual review.
- Individual tool panes may reveal additional internal responsive defects after they become reachable in drawer/sheet presentations.
- Persisted user panel preferences need careful handling so responsive auto-collapse does not permanently overwrite user intent.

## Design-Impact Reconciliation — Right-Tool Tab Header

Date: 2026-07-16

The code reviewer returned the package to solution design after the CR-003 implementation fix enabled multi-row wrapping in the right-tool header. The user confirmed that the original design is preferred: one horizontal row, preserved visual styling, horizontal scrolling as the primary interaction, no added edge fade or directional chevron, and active-tab reachability.

### New source and evidence consulted

| Source | Finding | Consequence |
| --- | --- | --- |
| autobyteus-web/components/layout/RightSideTabs.vue at current HEAD | The CR-003 fix passes wrap=true to TabList and therefore changes the header into a multi-row presentation. | This is a design-impact implementation state, not the revised target. |
| autobyteus-web/components/tabs/TabList.vue at current HEAD | The current opt-in wrap prop switches from horizontal overflow to flex-wrap overflow-x-hidden. | The revised design must remove or reject this right-tool wrapping path and define a scrollable single-row owner. |
| autobyteus-web/components/tabs/Tab.vue at current HEAD | Tab visual treatment contains compact spacing, typography, whitespace preservation, and active underline behavior that should be preserved. | Tab visual styling remains stable; overflow behavior belongs to the tab-list/header owner. |
| autobyteus-web/tests/e2e/workspace-responsive-probe.mjs at current HEAD | The current browser assertion fails when any tab is outside the initial tab-list bounds. | Replace the initial-fit invariant with native scrollability, active-tab reachability, and canonical-order assertions; do not turn custom fades/chevrons into a new required invariant. |
| tickets/frontend-responsive-ux-audit/code-review-report.md, Round 8 and incoming Design Impact message | Source review passed the wrapping Local Fix, but the user later rejected wrapping as a visual/design change. | Previous CR-003 source pass is superseded for this behavior; architecture re-review is required before implementation resumes. |
| User-provided original UI reference path from code review: /Users/normy/.codex/server-data/memory/agent_teams/software_engineering_team_835fd076ad177b4677a0993e12fb0fae39/context_files/ctx_1247f857a89b__image.png | The requested reference establishes the preferred single-row right-tool header design. The path was not available for local visual loading in this run, so the design clarification message is the authoritative readable evidence. | Preserve the original header contract rather than infer a new multi-row visual solution. |

### Revised evidence-backed conclusion

The underlying failure remains real: the integrated tool catalog can exceed the initial visible header width in docked and drawer presentations. The failure is not proof that every tab must fit initially. A multi-row wrap repairs initial visibility by changing the established header design, while a scrollable single row preserves the original visual hierarchy and scales to future catalog growth. The latest user decision further restores the personal-branch visual behavior by removing the added fade/chevron layer. The target invariant is therefore: every available tab is reachable through native horizontal scrolling, active/focused tabs are brought into view, canonical order is preserved, and the header remains one row without custom overflow-indicator chrome.

### Supplemental artifact inventory

| Artifact | Purpose and scope | Status | Approval applicability | Related core artifacts |
| --- | --- | --- | --- | --- |
| right-tool-tabs-ux-spec.md | Defines the personal-branch single-row visual, native scrolling, active-tab, accessibility, ownership, and validation behavior for right-tool tabs; explicitly excludes added fade/chevron indicators. | Refined for architecture re-review | Required; defines intended user-visible behavior | Requirements doc, design spec |
| workspace-responsive-ui-ux-spec.md | Defines scenario-level workspace shell behavior: wide personal-branch hierarchy, symmetric left/right panel-strip-drawer ownership, route-scoped header suppression, non-workspace default-layout preservation, empty-state actions, accessibility, and `/mobile` isolation. | Refined for architecture re-review | Required; defines intended user-visible behavior | Requirements doc, design spec |
| comprehensive-responsive-ui-test-report.md | Historical responsive failure evidence and broad browser-matrix scope, including validation for symmetric strips and absence of header/top duplicate controls. | Evidence supplement, coherence-reconciled | N/A | Requirements doc, design spec |

### Open implementation questions for downstream design/implementation review

- No custom fade or chevron behavior remains an open implementation question; both are explicitly out of the standard right-tool header contract. The native scroll container and active-tab auto-scroll remain required.
- If a More menu is not needed, it may remain omitted; it is not a substitute for native scrolling and is not part of the latest visual reset.

## Historical Live Visual Recheck — Font Fidelity and Tab Affordances

Date: 2026-07-16

The user reported that the built responsive workspace has smaller right-tool tab typography than the original personal branch and that the overflow chevron/fade is hard to discover. A fresh frontend/backend run and browser inspection were performed against the current task branch.

### Exact sources and setup

- Compared current task branch with personal using:
  - git diff personal..HEAD -- autobyteus-web/components/tabs/Tab.vue autobyteus-web/components/tabs/TabList.vue autobyteus-web/components/layout/RightSideTabs.vue
  - git show personal:autobyteus-web/components/tabs/Tab.vue
  - git show personal:autobyteus-web/components/tabs/TabList.vue
- Started an isolated backend on port 13005 with a temporary data directory and the current built server.
- Started Nuxt dev frontend on port 13006 with BACKEND_NODE_BASE_URL pointing to port 13005.
- Opened http://127.0.0.1:13006/workspace with the browser tool, opened the Tools surface, captured before/after screenshots, inspected computed styles and scroll metrics, and clicked the right-scroll affordance.
- Durable evidence:
  - evidence/solution-designer-right-tabs-live-check.md
  - evidence/solution-designer-right-tabs-current-705x752-before-scroll.png
  - evidence/solution-designer-right-tabs-current-705x752-after-scroll.png

### Findings

- The personal branch Tab component uses the original text-base typography and px-5 py-3 spacing.
- At the time of this live check, the current RightSideTabs/Tab path used compact density, resolving to text-sm with px-2.5 py-2 spacing; subsequent implementation work restored the current `Tab.vue` classes to the personal-branch text-base/px-5 py-3 values.
- The historical source difference directly explained the user's smaller-font/smaller-spacing observation; it is retained as evidence, not as a new requirement in this latest chevron/fade-only change.
- The current scroll implementation is functionally present: at a 705px browser viewport the right-tool tab list measured clientWidth 396px and scrollWidth 439px; clicking the right chevron moved scrollLeft to 37px and brought VNC Viewer fully into view.
- The current right fade is present as a 32px white-to-transparent gradient, but it is weak against the white header.
- The current right chevron is present as a 24px white 90%-opacity button with a gray glyph. The live screenshot confirms it is technically present but visually easy to miss, matching the user's concern.

### Historical classification and routing implication

The 2026-07-16 visual check was performed against the then-approved
fade/chevron design. Its screenshot and geometry remain useful evidence of the
current implementation, but its recommendation to retune those indicators is
superseded by the user's later visual-reset decision below. The personal-branch
typography/spacing regression remains implementation-owned; the removal of the
custom indicators is now a design-impact change that must pass architecture
review before implementation rework.

## Latest User Decision — Restore Personal-Branch Right-Tab Overflow Behavior

Date: 2026-07-17

The user explicitly requested removal of the added chevron and edge-fading
effect from the top-right tool-tab navigation. This is intentionally narrower
than removing right-tab responsiveness: the single horizontal row, native
mouse/touchpad/touch/keyboard scrolling, active/focused-tab auto-scroll,
canonical order, personal-branch typography/spacing, active underline, and
fixed panel toggle remain required. Only the custom overflow-indicator layer is
removed.

### Source comparison and root cause

- `git show personal:autobyteus-web/components/tabs/TabList.vue` shows the
  personal branch rendering a plain single-row, horizontally scrollable tab
  container with no fade or scroll-button layer.
- Current `autobyteus-web/components/tabs/TabList.vue` adds an
  `affordance-layer`, conditional left/right gradient spans, overflow state
  tracking, and left/right scroll buttons.
- Current `autobyteus-web/components/layout/RightSideTabs.vue` opts into that
  layer with `show-overflow-affordances` and supplies the chevron labels.
- Therefore the visual difference is deliberate task-branch implementation,
  originally requested by the earlier design package, rather than an
  unexplained browser effect. The design package is responsible for
  authorizing it and must now be reconciled; implementation must later remove
  the opt-in and indicator rendering as one bounded cleanup.

### Required target and boundaries

1. Render no right-tab edge fade, directional chevron, floating scroll button,
   or equivalent overflow-indicator layer at any scroll position.
2. Preserve native horizontal scrolling and active/focused-tab reachability;
   do not wrap the row, require all tabs to fit initially, or reduce the
   personal-branch text scale to compensate.
3. Preserve the fixed right-panel toggle and all `/workspace` strip/drawer
   behavior already defined by the approved shell contract.
4. Do not change `/mobile` or `components/mobile/*`; the request is limited to
   the standard `/workspace` right-tool tab header.

This is a requirements/design reconciliation because the earlier approved
right-tool supplement required the indicators. The revised requirements,
design spec, and right-tool supplement now mark their absence as normative and
must return as a cumulative package through architecture review. No source,
test, or API/E2E implementation sign-off is requested before that gate.

## Notes For Architect Reviewer

The core architecture decision is whether to approve a single adaptive standard-workspace policy owner and decommission the legacy `/workspace` `WorkspaceMobileLayout` branch. A minimal `640 -> 768` breakpoint fix would not satisfy the user's complaint because it would merely show the poor legacy mobile layout in the failing band and keep constrained desktop cramped.

After the expanded comprehensive probe, the design direction remains the same but the evidence is stronger: the issue extends through `1024px` and short-height windows, and the test matrix should be treated as a downstream coverage requirement. The new report path is `/Users/normy/autobyteus_org/autobyteus-worktrees/frontend-responsive-ux-audit/tickets/frontend-responsive-ux-audit/comprehensive-responsive-ui-test-report.md`.

## Workspace Shell Design-Impact Investigation (2026-07-16)

### User-provided evidence

- The user supplied a full-screen screenshot at `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_835fd076ad954653b8ce99d7367f98ef/solution_designer_b6ccc40d7bf745b1acf4763200b4d5b8/context_files/ctx_46df39f35489__image.png` showing `Work / Runs / Files / Tools` above a workspace with the original right-side tabs still present.
- The user explicitly prefers the original personal-branch layout: the left panel is collapsed only by the user's collapse action; it must not be replaced by a confusing mid-page surface selector on a full-screen window.
- The user also requested a detailed scenario/user-journey UI/UX specification because the current implementation is confusing even where it is technically responsive.

### Exact current source path

The duplicate top row is not accidental styling; it is a direct condition in `autobyteus-web/components/layout/WorkspaceAdaptiveLayout.vue`:

```ts
const shouldShowPrimarySurfaceControls = computed(() =>
  workspaceResponsiveState.value.showPrimarySurfaceControls ||
  shellResponsiveState.value.leftPanelPresentation !== 'docked',
)
```

`resolveAppShellResponsiveState` in `autobyteus-web/utils/layout/responsiveLayoutPolicy.ts` returns `leftPanelPresentation: 'strip'` whenever the user has collapsed the left panel, the viewport is below `1280px`, or the window is short. Consequently, even a full-screen user-collapsed workspace satisfies `leftPanelPresentation !== 'docked'` and renders `WorkspacePrimarySurfaceControls`.

The control handlers in `WorkspaceAdaptiveLayout.vue` expose the mental-model mismatch:

- `work` only closes the left menu/right drawer and leaves the center unchanged;
- `runs` opens the left `AppLeftPanel` drawer;
- `files` and `tools` open the right tools drawer;
- the actual Agents/Agent Teams navigation remains inside `AppLeftPanel` and routes through `useShellPrimaryNavigation`.

Thus `Work` is a redundant label for the center, `Runs` is an ambiguous proxy for a left selection/history surface, and `Files`/`Tools` duplicate the right-side tool ownership. This explains the user's report that the Work surface can be empty while the selection path is not visible.

### Personal-branch comparison

Commands run:

```bash
git show personal:autobyteus-web/layouts/default.vue
git show personal:autobyteus-web/components/layout/WorkspaceDesktopLayout.vue
git diff personal..HEAD -- autobyteus-web/layouts/default.vue autobyteus-web/components/layout/WorkspaceAdaptiveLayout.vue autobyteus-web/components/layout/WorkspacePrimarySurfaceControls.vue autobyteus-web/utils/layout/responsiveLayoutPolicy.ts
```

The personal branch has no `WorkspacePrimarySurfaceControls` in the desktop workspace. Its wide layout is left panel + center + right panel; manual left collapse switches only to `LeftSidebarStrip`. The current branch adds the generic control row whenever the left effective presentation is not docked, including the manual-collapse case. This is a product/layout regression, not a breakpoint-only defect.

### Live reproduction

The existing isolated frontend/backend session was used for a browser check at approximately `705x752` CSS pixels:

- Screenshot: `evidence/solution-designer-workspace-current-narrow-empty-state.png`.
- The current page renders a black mobile header, a four-button `Work / Runs / Files / Tools` row, and the empty center message `Select or run an agent/team to begin.`.
- No left selection/navigation surface is visible until the hamburger or the `Runs` control is activated.
- The screenshot is a visual confirmation of the source path above; it is not a new blank-band failure.

### Root-cause classification

This finding is a **design-impact / missing UX invariant** layered on top of the prior implementation defects:

1. **Ownership drift:** a workspace-level control row duplicates left and right surface ownership.
2. **Responsive policy overreach:** `leftPanelPresentation !== 'docked'` is treated as permission to replace the wide layout, even when the user intentionally collapsed the panel.
3. **Empty-state discoverability gap:** the center placeholder does not provide direct selection/run actions.
4. **Validation gap:** prior acceptance intent treated `Work / Runs / Files / Tools` ordering as sufficient, rather than validating the original wide hierarchy and user journeys.

This requires revised requirements/design and architecture review before implementation resumes. It should not be routed as an isolated local CSS fix.

### Revised design basis

The intended behavior is recorded in `workspace-responsive-ui-ux-spec.md`:

- no generic surface row in wide default or wide manual-collapse states;
- explicit left navigation/selection affordance when the left panel becomes a strip/drawer;
- explicit right-tools affordance when tools become a strip/drawer;
- structured empty state with agent/team and run/history actions;
- preserved center/right hierarchy and personal-branch typography/spacing;
- `/mobile` remains a separate Android/iOS wrapper owner.

### Supplemental artifact inventory update

| Artifact | Purpose | Status | Approval |
|---|---|---|---|
| `workspace-responsive-ui-ux-spec.md` | Scenario-level behavior and visual/interaction contract for the standard workspace shell | Refined for architecture re-review | Required |
| `evidence/solution-designer-workspace-current-narrow-empty-state.png` | Live screenshot showing the current duplicate surface bar and ambiguous empty state | Evidence | N/A |

## Desktop Journey / Auto-Collapse Design Impact (2026-07-16)

### New user clarification

The user clarified that the original desktop journey must remain unchanged through ordinary small-to-moderate resizing. A window that is still visibly large must not immediately replace the left navigation/workspace-selection panel with a vertical icon strip. This is especially harmful because the left panel is where the user selects an agent, agent team, workspace, or run.

### Current source cause

`autobyteus-web/utils/layout/responsiveLayoutPolicy.ts` currently defines:

```ts
export const APP_SHELL_DOCKED_MIN_WIDTH_PX = 1280
...
if (!input.userLeftPanelVisible || isShortHeight || (viewportWidth > 0 && viewportWidth < APP_SHELL_DOCKED_MIN_WIDTH_PX)) {
  leftPanelPresentation: 'strip'
}
```

This makes the app shell collapse the left panel for every default-visible window below `1280px`, regardless of whether the left panel plus a practical center would still fit. It also conflates two different situations:

1. the user intentionally clicked the collapse button; and
2. the responsive policy decided to strip the panel because of a broad viewport threshold.

The current policy evaluates the shell independently from the workspace's actual right-tool capacity. That allows the less-critical right tool panel to remain docked while the more important agent/team selection surface is removed too early.

### Required priority correction

The revised design does not pick an arbitrary replacement breakpoint. It defines a measured priority order:

1. Preserve the original left navigation/workspace-selection panel while it and a practical center width fit.
2. If the full split does not fit, move the right tool panel to a strip/drawer first.
3. Only if the left panel plus center still cannot fit should the left panel move to a strip/drawer.
4. Keep manual user collapse separate from automatic responsive presentation.
5. Do not show the generic `Work / Runs / Files / Tools` row in any of these states.

This means `APP_SHELL_DOCKED_MIN_WIDTH_PX = 1280` must not remain a blanket “left panel becomes strip” rule. The policy should derive the effective presentation from measured available capacity and the surface-priority contract in `workspace-responsive-ui-ux-spec.md`.

### Design classification

This is a **design impact / missing responsive invariant**, not a local pixel tweak. The user-visible desktop journey is being changed by policy ownership and surface-priority decisions. Requirements FR-029/FR-030 and acceptance criteria AC-030/AC-031 now govern this clarification. The solution package must return through architecture review before implementation resumes.

## Architecture Review Round 6 Reconciliation (2026-07-16)

Architecture review identified DI-003: the previous package stated “measured capacity” and “right-tools-first” but left two independent executable policy paths (`useAppShellResponsiveLayout` and `useWorkspaceResponsiveLayout`) and did not define the fit inputs or phase order.

### Chosen authoritative boundary

The revised package chooses one composed boundary rather than a loose two-phase convention:

- Pure resolver: `resolveResponsiveWorkspaceShellState(input)` in `utils/layout/responsiveLayoutPolicy.ts`.
- Vue adapter: `useResponsiveWorkspaceShell()` in `composables/layout/useResponsiveWorkspaceShell.ts`.
- Owner/invocation: `layouts/default.vue` observes the viewport once, composes `useLeftPanel` and `useRightPanel` preferences, invokes the resolver, and provides the state to `WorkspaceAdaptiveLayout`.
- Consumer rule: `WorkspaceAdaptiveLayout` consumes the provided state; it must not independently resolve right-panel presentation from a separate container measurement.
- `useAppShellResponsiveLayout.ts` and `useWorkspaceResponsiveLayout.ts` are removed or reduced to non-resolving consumers; they are no longer policy owners.

### Exact composition rules

The resolver input contains viewport width/height, left/right preference values (`visible` or `hidden-by-user`), and preferred left/right widths. The policy owns the constants for left/right dock widths, 50px strips, resize handles, 480px practical center minimum, 768px narrow width, and 480px short height.

For each candidate presentation:

```text
requiredWidth = left consumed width + right consumed width + center minimum
              + docked resize handles
fits = viewport width >= requiredWidth
```

Phase order is authoritative: narrow edge-overlay strip precedence; preserve
user-hidden left strip on desktop; short-height right-tools yield; try both
docked; try left docked/right consuming strip; try left docked/right overlay
strip; only then adapt the left surface and choose the right strip behavior. A
drawer is opened only as transient local interaction from an `open-drawer`
strip action. A visible left panel is therefore not automatically stripped
merely because the viewport is below `1280px`.

The output distinguishes `preference: hidden-by-user` from effective
`presentation: docked|strip` and `presentationSource: user/responsive`, with
the nested `stripActivation` selecting re-dock versus transient drawer
interaction. Drawers are not effective policy presentations. This prevents a
responsive transition from rewriting user preference and lets tests prove
manual collapse versus automatic adaptation.

### Required policy scenarios

The design spec now includes executable boundary scenarios for wide default, large-but-constrained (left docked/right tools yield), constrained (left adapts only after right yield), manual left collapse, narrow, short-height, and repeated resize. The updated architecture package is ready for another review round; implementation remains blocked until that gate passes.

## Right-strip duplicate Tools trigger investigation (2026-07-16; source evidence, target superseded by guaranteed-strip decision)

### User-observed behavior

On a full-screen desktop workspace, the user collapses the right tool panel using its existing panel-toggle affordance. The current build leaves the expected right vertical tool strip visible, but also adds a top `Tools` button above the center. The personal branch shows only the right strip in this state. Evidence supplied for the comparison:

- `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_835fd076ad954653b8ce99d7367f98ef/solution_designer_b6ccc40d7bf745b1acf4763200b4d5b8/context_files/ctx_acd1f7642431__image.png`
- `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_835fd076ad954653b8ce99d7367f98ef/solution_designer_b6ccc40d7bf745b1acf4763200b4d5b8/context_files/ctx_5e5a41af08d3__image.png`

### Source trace and exact cause

The current implementation was inspected in the dedicated worktree:

- `autobyteus-web/components/layout/WorkspaceAdaptiveLayout.vue`
- `autobyteus-web/components/layout/WorkspacePrimarySurfaceControls.vue`
- `autobyteus-web/components/layout/RightSidebarStrip.vue`
- `autobyteus-web/utils/layout/responsiveLayoutPolicy.ts`
- `autobyteus-web/composables/layout/useResponsiveWorkspaceShell.ts`

The relevant render paths are:

```vue
<WorkspacePrimarySurfaceControls
  v-if="shouldShowSemanticSurfaceTriggers"
  :show-tools-trigger="showToolsTrigger"
  ...
/>
...
<RightSidebarStrip
  v-else-if="responsiveWorkspaceShellState.showRightStrip"
  open-as-drawer
  @request-open="openRightDrawer"
/>
```

and:

```ts
const showToolsTrigger = computed(() =>
  responsiveWorkspaceShellState.value.rightPanel.presentation !== 'docked',
)
```

After a user collapse, the composed state is `rightPanel.presentation === 'strip'`. The `v-else-if` therefore renders the right strip, while `presentation !== 'docked'` independently evaluates to `true` and renders the top `Tools` trigger. The implementation is treating “not docked” as equivalent to “needs a top drawer trigger,” although strip and drawer are distinct effective presentations. `RightSidebarStrip` already calls `setRightPanelVisible(true)` and emits `request-open` when a tab is selected, so the top button is a duplicate reopen path.

This explains why the screenshot shows exactly one top `Tools` button and the right icon strip after the right drawer is collapsed; the left navigation trigger is false because the left panel remains docked. The unwanted control is not caused by the right-tab overflow work, browser width, font density, or the dedicated `/mobile` route. It is a local presentation/affordance condition in the new adaptive workspace renderer.

### Design classification and required correction

This is a **Local Implementation Defect** against the already intended one-owned-right-surface behavior, made explicit as FR-032/AC-033 and in `workspace-responsive-ui-ux-spec.md`. It is not a requirement to remove `/mobile` or `components/mobile/*`, and it does not justify restoring a generic `Work / Runs / Files / Tools` row.

The earlier intermediate package proposed this executable invariant:

| Right presentation | Reopen affordance | Top semantic `Tools` trigger |
|---|---|---:|
| `docked` | Existing fixed panel toggle | No |
| `strip` | Right vertical strip; selecting a tool opens the drawer | No |
| `drawer` | One visible semantic `Tools`/`Open tools` action | Yes |

That intermediate correction is superseded. The implementation must remove
`showRightToolsTrigger` and the top trigger branch entirely. The current
executable invariant is: docked = fixed panel toggle only; consuming strip =
strip only; overlay strip = edge strip only. Both strip variants open the same
transient drawer without changing selected-run state. Component/browser
coverage must assert that every non-docked standard-workspace state has a
visible strip and no top Tools trigger.

### Supplemental artifact inventory update

`workspace-responsive-ui-ux-spec.md` remains the intended-behavior authority for this clarification; its status is **Refined — architecture re-review required**, and approval applicability is **Required**. This investigation entry and the supplied screenshots are evidence; they do not replace the requirements or UI/UX supplement.

## Right-panel divider drag disappearance investigation (2026-07-16)

### User reproduction

The user identified the trigger for the apparently random state: while the right tool panel is docked, they drag its divider leftward to make the right panel wider. After dragging far enough, the right panel suddenly disappears and the center expands; a top `Tools` action may appear. This is a normal supported interaction, not a test-only state or manual internal mutation. The supplied screenshot shows the original three-surface hierarchy immediately before/around the failure, with the right divider and docked right tabs visible:

- `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_835fd076ad954653b8ce99d7367f98ef/solution_designer_b6ccc40d7bf745b1acf4763200b4d5b8/context_files/ctx_fef102643b19__image.png`

### Exact current source path

In the current committed implementation:

- `autobyteus-web/components/layout/WorkspaceAdaptiveLayout.vue` renders the right panel only when `isRightPanelVisible` and the composed state presentation is `docked`.
- The same component passes `preferredRightPanelWidth` into the rendered policy state width.
- `autobyteus-web/composables/useRightPanel.ts:initDragRightPanel` computes `startWidth + (startX - currentX)` and applies only `Math.max(..., MIN_RIGHT_PANEL_WIDTH)`. There is no maximum based on the available center/right flow.
- `autobyteus-web/utils/layout/responsiveLayoutPolicy.ts` accepts the resulting oversized preferred width and uses it in `requiredWidth`. When the left-docked/right-docked candidate no longer fits, the right-first phase selects `right = 'drawer'` because a drawer consumes zero horizontal width.
- `WorkspaceAdaptiveLayout.vue` then removes the docked right panel. If the effective state is drawer rather than strip, no right strip is rendered and the semantic top `Tools` trigger becomes the remaining reopen path.

The causal chain is therefore:

```text
drag divider left
  -> preferredRightPanelWidth grows without an available-space maximum
  -> docked left + oversized docked right no longer fits
  -> responsive policy selects right drawer
  -> docked right panel is removed from the flex row
  -> center expands; top Tools trigger may appear
```

This is why the user sees the complete right side vanish instead of merely reaching a stable maximum width. The responsive policy is reacting deterministically to an invalid/unbounded drag width; the defect is that the drag owner permits that input and the renderer treats the resulting policy transition as if it were a normal resize outcome.

### Personal-branch comparison

`origin/personal:autobyteus-web/composables/useRightPanel.ts` previously maintained `workspacePanelContainerWidth`, computed `maxRightPanelWidth`, and clamped the actual right width against the available container while preserving a center minimum. The adaptive refactor removed that container bound and retained only the lower width clamp. The approved adaptive design already names the intended bounded local spine (`drag start -> preferred width update -> clamp against policy maximum -> effective presentation stays docked only if center remains usable`), so this finding is an implementation defect against the existing design basis.

### Required correction and boundary

Restore a container-aware docked resize bound using the approved `480px` practical center minimum and the right resize handle width. `WorkspaceAdaptiveLayout` should register its center-plus-right flow width with `useRightPanel`; the panel owner should expose a bounded actual width; and the composed adapter should pass that bounded width to the policy rather than an unbounded raw drag preference. Dragging beyond the maximum must stop at the bound, keep the right panel docked, keep the center at least `480px`, and not create a strip/drawer/top `Tools` transition. Genuine viewport/container resizing and explicit panel toggles may still change the effective presentation through the composed policy.

This is classified as a **Local Implementation Defect** (`FR-033`/`AC-034`), not a new `/mobile` question or a reason to weaken the measured right-tools-first policy. The user should never need to discover the responsive drawer by accidentally dragging a divider past the center-preserving limit.

## Personal-branch manual resize compatibility clarification (2026-07-16)

### User feedback after the first bounded-resize fix

The first local fix correctly stopped the right panel from disappearing, but the user then reported that the divider no longer moves as far left as it did on `origin/personal`. The current fix clamps the right panel using `WORKSPACE_CENTER_MIN_WIDTH_PX = 480`. The personal branch allowed a deliberate divider drag to leave a much smaller center, down to its historical `MIN_WORKSPACE_CENTER_WIDTH = 200` floor.

This is a meaningful behavior difference, not a mistaken user interaction. The original desktop journey includes an explicit manual sizing capability that must be preserved. The responsive refactor should not silently remove it merely because automatic responsive adaptation needs a larger center target.

### Revised design distinction

The requirements/design basis now distinguishes two modes:

| Mode | How it starts | Center floor | Presentation behavior |
|---|---|---:|---|
| `automatic` | Default state and ordinary viewport/container adaptation | `480px` practical target | Policy yields right tools before the center becomes cramped |
| `user-sized` | User explicitly drags the docked right divider | `200px` personal-branch compact floor | Right panel stays docked while the explicit geometry fits; drag does not create a drawer/strip |

The composed state must carry retained `rightPanelResizeIntent` and separately derived `centerProtectionMode` (`automatic`, `user-override`, or `responsive-yield`). `useRightPanel` owns the raw width preference and bounded actual width; `WorkspaceAdaptiveLayout` supplies the center-plus-right flow measurement; the single composed resolver remains the only owner of effective presentation. A viewport shrink retains `user-sized` intent but reports `responsive-yield` and uses the automatic `480px` target; recovery re-evaluates the retained intent and may return to `user-override` at the `200px` floor. If even the explicit `200px` floor cannot fit, normal strip/drawer adaptation is allowed. This preserves the original manual capability without weakening automatic center protection.

This clarification supersedes the previous interpretation of FR-033/AC-034 that applied the `480px` floor to explicit manual resizing. It is a design-impact follow-up requiring architecture review before the implementation changes the bound again. The `/mobile` route and `components/mobile/*` remain unchanged.

## Output/renderer authority clarification (2026-07-16)

Architecture Round 10 identified a remaining state-shape ambiguity: the
revised design described both top-level and nested representations for the
right resize lifecycle, while `WorkspaceAdaptiveLayout.vue` still read the
top-level `centerMinWidth`. That would allow policy state to report the
approved `200px` user override while the rendered center continued to enforce
`480px`.

The revised package removes the duplicate representation rather than
maintaining aliases. The composed output exposes the lifecycle only under
`rightPanel`:

- `rightPanel.resizeIntent` is the retained `automatic`/`user-sized` intent;
- `rightPanel.centerProtectionMode` is the effective
  `automatic`/`user-override`/`responsive-yield` mode; and
- `rightPanel.effectiveCenterMinWidth` is the sole current center floor.

`WorkspaceAdaptiveLayout` must consume the nested effective floor for
`centerPaneStyle`, docked-right feasibility, and dependent width calculations.
There is no top-level `centerMinWidth` or `rightPanelResizeIntent` output
field, and no renderer-side mode-to-floor fallback. Policy and component
assertions must cover automatic (`480px`), user-override (`200px`), and
responsive-yield (`480px` while retaining `user-sized`) states. This is a
design-boundary clarification; it does not authorize implementation changes
until architecture review passes.

## Right-strip-first fallback clarification (2026-07-16; superseded by guaranteed-strip decision below)

### User-observed behavior

After the first bounded-resize fix, the user reported a different but related mismatch: when the middle area becomes narrower, the current build sometimes shows a top `Tools` button and removes the right vertical strip. The user explicitly prefers the personal-branch interaction in which the right tools collapse into the stable vertical strip at the right edge, allowing the user to click a tool icon directly. A top Tools action is not the desired desktop fallback.

### Current source cause

The current composed policy's non-narrow right-first candidate order is:

```text
left=docked, right=docked
left=docked, right=drawer
left=docked, right=strip
```

When docked tools no longer fit, the policy therefore selects `drawer` whenever `left=docked + centerMin + drawer` fits, even if the right strip would be the more discoverable desktop fallback. `WorkspaceAdaptiveLayout.vue` correctly shows a semantic top Tools trigger for drawer-only state, so the visible result is the top Tools button in the supplied screenshot. This is not the earlier `presentation !== 'docked'` duplicate-trigger defect; the current condition is already `presentation === 'drawer'`. The new issue is the policy's fallback priority.

### Revised intended behavior

The earlier intermediate package defined the non-narrow priority as:

```text
docked -> strip -> drawer
```

If left navigation, the practical automatic center target (`480px`), and the `50px` right strip fit, the right strip must be rendered and it is the sole right-tools reopen affordance. The earlier allowance for a drawer/top `Tools` trigger when the strip candidate could not fit is now superseded: the strip switches to an edge overlay instead. The current approved priority is `docked -> consuming strip -> overlay strip` for standard `/workspace`.

This is added as FR-035/AC-036 and requires architecture re-review together with the manual resize-mode clarification. It does not change `/mobile`, the right-tab catalog, or the rule that a visible strip and top Tools trigger must never appear together.

## Right-tools top-trigger removal and guaranteed strip (2026-07-16)

### User decision

The user confirmed that a separate top `Tools` button is not useful for the
standard workspace. Normal desktop and laptop windows should not enter a
special drawer-only state merely because the right panel became narrow. The
right vertical strip is clearer, closer to the personal branch, and sufficient
as the direct tool-selection affordance.

### Revised target behavior

- Right tools remain docked while the measured center and side surfaces fit.
- When the docked right panel no longer fits, the policy returns a visible
  right strip. The strip consumes `50px` when that flow candidate fits.
- When the 50px strip cannot fit, the same strip becomes a fixed right-edge
  overlay with `consumedWidth = 0`; it does not disappear and does not create
  a top `Tools` button.
- Clicking any strip item opens the existing transient right-tools drawer.
  Drawer open/closed state is local interaction state, not a responsive right
  presentation.
- No standard `/workspace` state renders a separate top `Tools` trigger.
  `/mobile` and `components/mobile/*` remain unchanged.

### Why this simplifies the architecture

The previous contract had three effective right presentations and two possible
reopen affordances. The revised contract has two policy presentations
(`docked`, `strip`) and one interaction overlay (the drawer). It removes
`showRightToolsTrigger`, removes drawer-only right fallback ordering, and
eliminates the possibility of a strip/button duplicate. The composed policy
still owns whether the strip consumes flow width or overlays it, while
`WorkspaceAdaptiveLayout` owns only transient drawer open/close state.

### Capacity evidence

With the approved automatic center target, left docked + center + right strip
requires approximately `320 + 480 + 50 + 6 = 856px`. If that does not fit,
the right strip can become an overlay; if left navigation also cannot remain
docked, the policy adapts the left surface before ever removing the right
tools affordance. This keeps the center mounted across ordinary desktop,
embedded, and narrow standard-workspace widths without relying on an absolute
"truly narrow" breakpoint.

This is an intended-behavior design change covered by FR-024, FR-032,
FR-035, FR-037 and AC-025, AC-033, AC-036, AC-038. It requires architecture
re-review before implementation changes resume.

### Route-scoped header reconciliation (2026-07-16)

Architecture Review Round 15 identified that `layouts/default.vue` is a
global default-layout boundary, not a workspace-only renderer. The previous
package correctly prohibited the responsive header/hamburger for standard
`/workspace` but incorrectly removed `showHeader` from the shared shell
contract without defining what happens on other default-layout routes.

The revised route contract is:

| Route | Required behavior |
| --- | --- |
| `/workspace` (and supported workspace child routes) | Ignore the shared `showHeader` compatibility signal; render the symmetric left/right panel-strip-transient-drawer model with no responsive hamburger, breadcrumb, top `Agents & teams`, top `Tools`, or generic surface row. |
| `/agents`, `/agent-teams`, `/applications`, `/media`, `/memory`, `/nodes`, `/skills`, `/tools` | Preserve the existing default-layout responsive header/navigation behavior driven by `showHeader`. |
| `/mobile` | Remains `layout:false` and renders `MobileRemoteAccessShell`; it does not pass through the default layout. |

`default.vue` may gate the shared header on route identity, but it must not
measure the viewport, introduce a new breakpoint, or resolve another workspace
policy. The workspace resolver remains the sole capacity/priority owner. The
requirements now add FR-039/AC-040 and the core/supplement design specs add
route-scoped source/component/browser assertions for `/workspace`, a
representative `/agents` or `/tools` route, and `/mobile` isolation.

The reviewer also recorded LID-002: the current `LeftSidebarStrip` still
toggles left-panel preference rather than following the now-required
capacity-aware activation output. This remains a local implementation defect
for later source review: a fitting wide user-origin strip must re-dock, while
a constrained/responsive strip must open the transient left drawer.

### Symmetric side-strip simplification (2026-07-16)

The user confirmed a further simplification for standard `/workspace`: the
left and right compact surfaces should use the same interaction model rather
than introducing header-specific controls. The target is:

```text
left panel -> left strip -> left navigation drawer
right panel -> right strip -> right tools drawer
```

The left strip owns compact access to Agents, Agent Teams, workspaces, and run
history. The right strip owns compact access to Files and the tool catalog.
When a side is docked, its panel replaces its strip. When a side is not
docked, its strip remains visible, consumes flow width when possible, or uses
an edge overlay when necessary. Activating the strip opens that side's
transient drawer; the drawer is not a separate responsive policy state.

### Source evidence consulted

| Source | Current behavior/evidence | Design consequence |
| --- | --- | --- |
| `autobyteus-web/layouts/default.vue` | Standard shell still renders a black responsive header and `data-test="app-left-drawer-open"` hamburger when `responsiveWorkspaceShellState.showHeader` is true. | The reviewed implementation must remove the workspace header/hamburger navigation path; the left strip becomes the compact owner. |
| `autobyteus-web/components/layout/WorkspaceAdaptiveLayout.vue` | Standard workspace still renders `WorkspacePrimarySurfaceControls` for constrained/left-non-docked states. | Decommission that generic row from standard `/workspace`; side strips and empty-state actions own compact access. |
| `autobyteus-web/components/layout/LeftSidebarStrip.vue` | Existing left strip already exposes primary shell destinations and panel toggle behavior. | Reuse and make it the sole left compact affordance, with explicit drawer semantics and no companion top button. |
| `autobyteus-web/components/layout/RightSidebarStrip.vue` | Existing right strip already renders canonical tool icons and opens the right drawer. | Reuse as the sole right compact affordance in consuming and overlay variants. |
| `/mobile` and `components/mobile/*` | Dedicated Android/iOS/PWA shell remains separate. | No changes to the phone wrapper or its components. |

### Revised UI/UX decision and review consequence

The user-facing contract now forbids the responsive hamburger, breadcrumb
navigation trigger, top `Agents & teams` button, top `Tools` button, and
generic `Work / Runs / Files / Tools` row in standard `/workspace`. This is a
design-impact change because it alters shell composition and the policy output:
the composed state must expose left/right `docked` or `strip` presentations
with consuming/overlay behavior, while both drawers remain transient
interaction state. FR-038 and AC-039, plus the scenario supplement, record the
contract and its cross-side assertions. Implementation remains paused pending
architecture review of this revised package.

### Hybrid strip activation reconciliation (2026-07-16)

The user clarified the final desktop interaction semantics after the prior
all-strips-transient-drawer design was prepared. That earlier sentence is
superseded for activation behavior; the symmetric side ownership and visible
strip guarantee remain valid.

| Context | Required strip action | Preference lifecycle |
| --- | --- | --- |
| Wide desktop, explicit user collapse, docked panel fits | `redock-panel`: clicking a strip item restores the full panel | Restore the corresponding visible preference; close any temporary drawer |
| Constrained/narrow desktop or automatic responsive yield | `open-drawer`: clicking the strip opens a temporary overlay drawer | Do not rewrite the stored panel preference |
| User-collapsed panel after viewport shrink | `open-drawer` while the retained panel no longer fits | Retain `hidden-by-user` intent so recovery can return to re-dock behavior |
| User-collapsed panel after viewport recovery | `redock-panel` once the docked candidate fits | Restore the visible preference only when the user activates the strip |

This rule is symmetric for left navigation and right tools and preserves the
origin/personal desktop mental model: a manually hidden wide panel is reopened
by its own strip, while a policy-yield strip is a temporary drawer affordance.
`StripActivation = 'redock-panel' | 'open-drawer'` is now part of both nested
responsive side outputs. The renderer must consume that output rather than
infer behavior from `presentation !== 'docked'`.

Current source evidence explains why implementation review must be rerun after
the design change:

- `LeftSidebarStrip.vue` currently opens the overlay drawer for the strip path;
  it does not yet restore the full panel for a wide manual collapse. This is a
  later implementation/source-review finding, not a reason to alter the
  clarified contract.
- `RightSidebarStrip.vue` currently calls the right visibility action and is
  therefore closer to wide re-docking, while it opens the drawer when the
  effective panel still cannot fit. Its preference/event semantics must be
  aligned with the same explicit activation output.
- The prior code-review findings CR-013/CR-014 were evaluated against the
  stale all-strips-transient-drawer interpretation. They must be re-evaluated
  after architecture approves FR-040/AC-041; implementation and API/E2E sign-
  off remain paused.

The supplemental artifact inventory remains unchanged: the workspace UX
specification and right-tool tabs supplement still define intended behavior and
require approval; this section records the user clarification and source
evidence that support the revised requirements/design.

### Core output schema reconciliation (DI-010, 2026-07-16)

Code review identified a stale core pseudocode shape even though the executable
policy and both UX supplements already use the approved model. The design
output is now coherent with source:

- `ResponsivePresentation` is exactly `docked | strip`.
- `ResponsiveLeftPanelState` and `ResponsiveRightPanelState` carry nested
  `stripActivation`, which is the sole action authority for each side.
- `ResponsiveWorkspaceShellState` does not emit top-level
  `canOpenLeftDrawer`/`canOpenRightDrawer` fields.
- Drawer open/closed state belongs to local drawer composables/renderers and is
  not an effective responsive presentation. `open-drawer` permits that local
  interaction; `redock-panel` restores the panel preference and docked render.

This resolves DI-010 without changing `/mobile`, the responsive policy
priority, or the user-visible hybrid strip behavior. CR-015 (the dead
`request-open` declaration in `LeftSidebarStrip.vue`) remains a low local
implementation cleanup and is not addressed in the design package. It should
be handled by implementation after architecture approves this reconciliation.

### Personal-branch strip visual continuity reconciliation (2026-07-16)

The user clarified that both compact strips must remain visually and
interactionally the same strips as `origin/personal`. Only the result of an
activation may vary with measured capacity: a fitting wide user-origin strip
re-docks its panel, while a constrained, narrow, or responsive-yield strip
opens a transient drawer. The strip itself must not gain a new control.

#### Source comparison

| Source | `origin/personal` evidence | Current worktree evidence | Consequence |
| --- | --- | --- | --- |
| `autobyteus-web/components/layout/LeftSidebarStrip.vue` | The strip begins with the existing navigation/workspace/history items and settings; there is no leading hamburger/menu item | Earlier `fbc33091a` added `workspace-left-strip-open`; current `HEAD` removed it in `56ee3c3b0` and matches the personal-branch inventory | Preserve the current inventory while correcting drawer visibility and keeping `stripActivation` authoritative |
| `autobyteus-web/components/layout/RightSidebarStrip.vue` | The strip is the existing canonical tool-icon rail and side affordance | Current `HEAD` retains the icons and routes through explicit `request-open`/`request-redock` events | Keep the visual/control inventory unchanged and make the strip mutually exclusive with the opened drawer |
| `autobyteus-web/layouts/default.vue` | The personal desktop interaction does not add a visible `Agents & teams` drawer heading and separate close control | Earlier `f37df2187` added the visible heading/close; current `56ee3c3b0` removed that chrome and keeps only semantic dialog labeling | Preserve non-visual labeling; suppress the strip while the drawer is open |
| `autobyteus-web/components/layout/WorkspaceRightToolDrawer.vue` | The right tool surface is the existing tabs/content | Earlier `f37df2187` added visible `Tools`/close chrome; current `56ee3c3b0` starts directly with `RightSideTabs` | Preserve the content-only drawer and make it exclusive with the right strip |

#### Cause classification

This is both a design-package gap and implementation drift, not solely one
role's error. The earlier design explicitly defined the hybrid activation
lifecycle and symmetric side ownership, but it did not explicitly freeze the
personal-branch strip visual/control inventory or prohibit generic drawer
chrome. The implementation engineer did add a left hamburger and generic
drawer title/close controls in earlier commits to make the transient drawer
explicit and accessible. Those additions were then removed by `56ee3c3b0`
after the design clarification. The remaining defect is a separate
renderer-state mistake: the current implementation keeps the strip rendered
while the local drawer is open. The revised requirements and UX supplements
now cover both the absence of duplicate chrome and drawer/strip mutual
exclusion. `/mobile` and `components/mobile/*` remain unchanged and out of
scope.

#### Re-review consequence

Implementation remains paused. Architecture must review the revised
visual/control-inventory contract together with the already-approved hybrid
activation contract. After approval, implementation source review must handle
drawer/strip mutual exclusion and any remaining CR-015 cleanup. API/E2E must
then validate both wide re-docking and constrained/narrow drawer opening
without accepting duplicate visible chrome or simultaneous strip-plus-drawer
rendering.

### Drawer/strip mutual-exclusion reconciliation (2026-07-16)

#### User observation

The user tested the post-implementation Electron build and confirmed that the
extra hamburger/title/close controls are gone. A new visual defect remains:
when a constrained/narrow left or right strip opens its transient drawer, the
same strip remains visible beside the overlay. The supplied evidence is:

- `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_835fd076ad954653b8ce99d7367f98ef/solution_designer_b6ccc40d7bf745b1acf4763200b4d5b8/context_files/ctx_71a17f2aca5f__image.png`
- `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_835fd076ad954653b8ce99d7367f98ef/solution_designer_b6ccc40d7bf745b1acf4763200b4d5b8/context_files/ctx_85009d47f34c__image.png`

The desired state machine is mutually exclusive:

```text
docked panel -> no strip, no drawer
closed strip -> strip only
open drawer -> drawer only
dismissed drawer -> the same strip returns
```

The strip remains the original personal-branch control whenever it is visible.
Its activation still means wide fitting user-origin `redock-panel` or
constrained/narrow/responsive `open-drawer`. Opening the drawer temporarily
hides the strip; it does not change the stored panel preference or convert the
drawer into a new responsive policy presentation. Backdrop and Escape dismiss
the drawer, after which the policy output is rendered again. No visible close
button or extra drawer header is introduced.

#### Exact current source cause

The behavior is caused by independent renderer conditions, not by the pure
capacity resolver:

| Side | Current condition | Result |
| --- | --- | --- |
| Right | `WorkspaceAdaptiveLayout.vue` renders `RightSidebarStrip` whenever `responsiveWorkspaceShellState.showRightStrip` is true, while rendering `WorkspaceRightToolDrawer` separately when local `isRightDrawerOpen` is true | Right strip and right drawer render together |
| Left | `layouts/default.vue` computes `showLeftStrip` from the policy without excluding `showLeftDrawer`; the drawer and strip are sibling surfaces | Left strip and left drawer render together |

Commit `56ee3c3b0` (`fix(workspace): preserve personal strip controls`)
also raised the strip layer to `z-[60]` so the strip remains above the drawer
backdrop. That was consistent with the immediately preceding design revision,
which incorrectly required the strip to remain hit-testable while the drawer
was open. The user's new evidence rejects that visual state. The corrected
contract now makes drawer and strip mutually exclusive while preserving the
same strip controls whenever the drawer is closed.

#### Design and routing consequence

This is a renderer-state design impact, not a request to change `/mobile` or
the responsive policy owner. Requirements FR-041/AC-042 and the two UX
supplements now specify drawer-only visibility for the opened side,
backdrop/Escape dismissal, and strip restoration without preference mutation.
The package must return through architecture review before implementation
changes; after approval, source/component/browser coverage must assert mutual
exclusion for both sides, restoration after dismissal, and no cross-side
regression.
