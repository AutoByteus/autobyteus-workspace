# Investigation Notes — workspaces-sidebar-dock

## Investigation Meta
- Task: Project project_f34a9537-07d7-449a-b78f-16368f1aa619 / project_task_082715d8-9e38-4dc4-b89c-7a6b7d2a00ba.
- Workspace: `/home/autobyteus/workspace/.codex/worktrees/workspaces-sidebar-dock`; git branch `codex/workspaces-sidebar-dock`.
- Bootstrap: `git fetch origin personal`; `git worktree add -b codex/workspaces-sidebar-dock <workspace> origin/personal`; base `d9bccf2550b918ab138e30486ef4dbf1d5e9d1ff`; finalization origin/personal. Original shared personal checkout is behind remote and has unrelated untracked work; untouched.
- No prior authoritative package found. Initial worktree-relative template copy failed because skill root is untracked; corrected to `/home/autobyteus/workspace/autobyteus-workspace/.codex/skills/solution-designer/templates/`. No failed-copy documents used.
- Requirements R1 / SR-001 approved; architecture evidence round SR-002.
- Authorities read in full 2026-10-13: skill SKILL.md, requirements-engineering.md and initial templates; architecture-design.md, design-principles.md and design-spec/revision templates at above skill root; root AGENTS.md, DESIGN.md (unchanged vs fetched base), TESTING.md; autobyteus-web/AGENTS.md; workspace_layout.md. No closer DESIGN*.md found under autobyteus-web. Root RELEASE.md read for delivery context; no finalization performed.
- Status: source cause established by source trace and unchanged policy execution, not yet rendered baseline acceptance. Exact installed affected client pending direct user answer.

## Initial Request And Clarifications
Urgent bug: with left navigation collapsed, move conversation/right divider then click Workspaces. Sidebar covers content and gray scrim appears in wide Team and Activity layouts. Must push/reallocate beside content, preserve narrow behavior, all user work and running services. Distinct from completed team-collapse/PDF Tasks.
Direct user question submitted in this conversation: desktop app (version) or browser (address), and whether port8001 is the connected server. No answer at authoring completion. Screenshots have macOS-style titlebar; this is a platform lead, NOT verified installed platform/build. Backend port does not pin renderer version.

## Source Log
All source paths below are relative to the isolated workspace above unless explicitly absolute.
| ID | Exact source / command | Observation / confidence |
| --- | --- | --- |
| INV-001 | `autobyteus-web/utils/layout/responsiveLayoutPolicy.ts`, `responsiveStripActivation.ts` | Full production resolver read. `createState` defines `fits` using the current right width; left redock candidate changes left strip to dock but keeps same right width. `resolveStripActivation` returns open-drawer when that exact rectangle cannot fit. High confidence |
| INV-002 | Three original supplied screenshots (inventory below) | Collapsed rail, divider near one-third of width; open left panel over content and gray scrim across both center/tools, Team and Activity. Images cannot establish CSS viewport/dpr/installed build; high confidence visual symptom, unconfirmed cause in exact binary |
| INV-003 | `composables/useRightPanel.ts`; `composables/layout/useResponsiveWorkspaceShell.ts`; `components/layout/WorkspaceToolShell.vue` | Right preference is retained separately; drag sets user-sized intent and clamps against measured center+right flow. Shell passes already-clamped `rightPanelWidth` as preferred width. Flow ResizeObserver updates only after geometry changes. Right container renders policy `rightPanel.preferredWidth`; measured width therefore feeds back to fit policy. High confidence source |
| INV-004 | `layouts/default.vue`; `components/layout/LeftSidebarStrip.vue`; `composables/useAccessibleDrawer.ts`; `stores/appLayoutStore.ts` | Workspaces follows supplied activation. open-drawer sets mobile menu flag, layout renders fixed aside + fixed black/30 backdrop and registers modal focus. redock sets left visible and clears mobile menu. Policy activation watcher clears obsolete mobile-menu state; shared drawer lifecycle unregisters key listener/modal ownership. High confidence |
| INV-005 | `components/layout/WorkspaceAdaptiveLayout.vue`; `pages/chat.vue`; `docs/workspace_layout.md`; public collapse/drag controls | Team, agent and Org center owners share WorkspaceToolShell under default provider, also chat run. No view-specific scrim cause found. Existing collapse/focus and tool-tab selection are separate owners |
| INV-006 | `utils/layout/__tests__/responsiveLayoutPolicy.spec.ts`; `composables/__tests__/useRightPanel.spec.ts`; `layouts/__tests__/default-drawer.spec.ts`; `components/layout/__tests__/WorkspaceAdaptiveLayout.spec.ts`; `WorkspaceToolShell.spec.ts`; `WorkspaceToolShell.taskLocate.spec.ts`; `tests/e2e/workspace-responsive-probe.mjs` | Existing normal/narrow/user-sized coverage; policy tests currently require strip fallback at current oversized-right preference rather than considering reallocation. Several tests build policy input manually from measured right width. Rendered responsive probe exists but needs a test-owned stack |
| INV-007 | `corepack pnpm install --frozen-lockfile > <ticket>/evidence/dependency-install.log 2>&1` | Exit0, 1680 packages, cached reuse, ~66s. Warnings: devkit CLI dist missing before its build; ignored @google/genai build scripts. Not behavioral validation; neither is necessary to prove this renderer's capacity policy |
| INV-008 | `node_modules/.pnpm/esbuild@0.27.3/node_modules/esbuild/bin/esbuild autobyteus-web/utils/layout/responsiveLayoutPolicy.ts --bundle --platform=node --format=cjs --outfile=/tmp/workspaces-sidebar-baseline-policy.cjs`; run unchanged resolver via Node; delete temp bundle | Baseline-policy-reproduction.json records 9 width/drag samples. Warning .nuxt/tsconfig.json absent (prepare not yet run); bundle executed. No production code modified. Not screenshot or full UI proof |
| INV-009 | `id`; `ss -lntp` filtered for8001/3000; source package.json | This agent is Linux root container; Chromium and corepack available. No matching local listeners found. Source package version 1.5.3-beta.3; NOT evidence of user's installed version. No live endpoint tested or changed |

## Relevant Existing Behavior And Supported Product Paths
BEH-001: user collapse→public divider drag→Workspaces activation→dock OR drawer. BEH-002: mouse drag records width preference/intent; viewport resize observes capacity and repaints geometry. BEH-003: narrow strip→drawer→Escape/backdrop→focus return. BEH-004: selection/loading from history remains owned by navigation/run stores, not layout geometry. Independent scenario origin is user report and exposed product controls, not synthetic policy calls.

## Runtime, Probe, Or Reproduction Findings
Baseline unchanged production policy at1000/1280/1440×800 CSS px,320 navigation and explicit drag intent:
- At a modest right preference (450px) activation is redock-panel.
- At collapsed maximum right widths746/1026/1186 respectively (viewport−50 strip−4 handle−200 center), activation is open-drawer despite feasible minimum both-dock capacity930px.
- Forcing left preference visible at those larger right widths docks left but collapses right to strip; merely forcing a click branch is insufficient to keep the right panel visible.
- User-supported reachable example includes1440px viewport and right width1000: left strip/right dock fit; both current rectangles demand1530px; both usable docks with right shrink can fit. Exact user's screenshots cannot pin these numbers.
- This is an executed source-level reproduction and complete UI path trace, not claimed rendered/native pass. Implementation must capture rendered baseline before altering source; API/E2E must validate changed build.

## Architecture Investigation Findings (post R1 approval)
Reconfirmed isolated branch/approval; searched all right-panel callers and read complete accessible drawer lifecycle. The authoritative responsive resolver already owns effective presentation/capacity; wrong fit input prevents prospective allocation. Existing composable retains preferredRightPanelWidth but provider passes measured effective width, making policy decisions dependent on prior geometry. Drag and viewport ResizeObserver form a feedback loop; derive candidate geometry without waiting for a DOM resize. Existing layout gates backdrop on true drawer only, so removing the false drawer decision should remove scrim without CSS opacity hacks. Preserve actual transient drawer and its lifecycle. BrowserPanel also observes useRightPanel effective width; retain measured drag/browser resizing path, do not indiscriminately delete it. Target choices belong only in design-spec.md.

## Structural And Payload Surface Inventory
- Structural: existing frontend responsive policy, provider wiring, measured drag preference and drawer render/lifecycle. No API, persistence reader/writer/schema, security, provider, worker, runtime or deployment change needed.
- Payload: evidence screenshots/logs and docs; volume irrelevant to architectural size.
- Data: layout refs are module-local in memory; no backend storage writes in these owners. Conversations/Tasks/documents/worker state not transformed, no acceptable reset. Source fix is renderer; backend update alone cannot establish deployment to user.

## Supplemental Artifact Inventory
Canonical ticket directory is `/home/autobyteus/workspace/.codex/worktrees/workspaces-sidebar-dock/tickets/in-progress/workspaces-sidebar-dock`.
| Artifact | Owner / purpose / scope / IDs | Status / approval |
| --- | --- | --- |
| `<ticket>/evidence/baseline-policy-reproduction.json` | Solution Designer; unchanged production policy samples; SCN-001 / REQ-001–002, AC-001–002 | Executed investigation only, no rendered runtime pass; evidence not normative |
| `<ticket>/evidence/dependency-install.log` | Solution Designer; setup provenance | Exit0 with described warnings; not normative |
| `/home/autobyteus/data/projects/project_f34a9537-07d7-449a-b78f-16368f1aa619/tasks/project_task_082715d8-9e38-4dc4-b89c-7a6b7d2a00ba/context/ctx_b3caff25e2ad__ctx_59398b9e7575_image.png` | User; Activity open sidebar + scrim; SCN-001 | Inspected via view_image; symptom evidence |
| `/home/autobyteus/data/projects/project_f34a9537-07d7-449a-b78f-16368f1aa619/tasks/project_task_082715d8-9e38-4dc4-b89c-7a6b7d2a00ba/context/ctx_386ca1eb95fa__ctx_0159deaf76ee_image.png` | User; collapsed strip and Team split; SCN-001 | Inspected via view_image; symptom evidence |
| `/home/autobyteus/data/projects/project_f34a9537-07d7-449a-b78f-16368f1aa619/tasks/project_task_082715d8-9e38-4dc4-b89c-7a6b7d2a00ba/context/ctx_fa20e0c69462__ctx_32de7335b1e2_image.png` | User; open Team sidebar+scrim; SCN-001 | Inspected via view_image; symptom evidence |

## Assumptions, Unknowns, Risks And Requirement Implications
- INV-001/003 make candidate-relative reallocation necessary, not a viewport measurement/breakpoint guess.
- Exact client/version/connection unknown: direct user question pending; downstream do not label user's8001 app updated. macOS titlebar lead cannot substitute for native proof.
- Baseline rendered/native interaction not yet run. Required before fix completion; fixtures must render actual shell owners and satisfy reachable GraphQL/WS boundaries, not hand-drawn shell replacements.
- Doc uses stale measured-width capacity wording and some old component/test-path names. Sync affected capacity/ownership sentences in this ticket, not a general documentation rewrite.
- Existing policy oversized-width expectations must be updated to guard true insufficient-minimum capacity, not preserve this bug.
- Product Design request not stated; UI bug direction is explicit. Product-owned specifications/approval/artifacts: N/A — not applicable.

## Cleanup / Worktree State
Temporary policy bundle removed; dependency installation completed. No app/browser/dev-server/display/test container started; no user services,data,credentials or shared config touched. Isolated branch/worktree/dependencies intentionally retained for downstream implementation; final cleanup remains Delivery-owned. No source or test implementation authored by Solution Designer.

### Additional architecture constraint: automatic capacity
Post-approval trace of automatic useRightPanel clamping shows why merely switching provider to raw preferred width is unsafe: with320px navigation and480px automatic center, ordinary both-dock minimum is1210px (400right+10logical handles). Existing measured clamping can render right400–449px at1210–1259px even when preferred450px. Candidate allocation must preserve that automatic bound as well as user-sized behavior. Target algorithm/verification are in design-spec.md.
