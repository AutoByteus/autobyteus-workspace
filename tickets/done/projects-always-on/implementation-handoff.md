# Implementation Handoff — `projects-always-on`

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: direct implementation route (SR-003: Medium / Low; no independent architecture review). Routing comes from `get_handoff_rules` at handoff time.
- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/projects-always-on/tickets/in-progress/projects-always-on/requirements-doc.md` (SR-003; SR-002 approved by the user on 2026-10-07; the tab was added at the user's direction)
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/projects-always-on/tickets/in-progress/projects-always-on/investigation-notes.md`
- Solution revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/projects-always-on/tickets/in-progress/projects-always-on/solution-revision-record.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/projects-always-on/tickets/in-progress/projects-always-on/design-spec.md` (SR-003)
- Supplemental task artifacts: none
- Design review report: `N/A — not applicable` (direct route)
- Architecture review revision record: `N/A — not applicable` (direct route)
- Triggering rework report: N/A (initial implementation)

## Current Implementation Summary

**1. The Projects feature flag is gone (SR-002).** Projects is always available on desktop; the mobile runtime still hides it.
- Server: removed the capability domain constant, service, GraphQL resolver and its schema registration (`projectsCapability` / `setProjectsEnabled`), and the predefined setting registration.
  - A stored `ENABLE_PROJECTS` value is not read (DEC-001). It now lists as an ordinary, deletable custom setting.
  - No migration and no deletion of stored data.
- Web: removed `projectsCapabilityStore`, the GraphQL documents, `ProjectsFeatureToggleCard` and its copy, the `/projects` middleware entry and the settings refresh-map entry.
  - The nav item is filtered only by `isFeatureAvailableInRuntime('projects')`.
  - `generated/graphql.ts` was regenerated against a private backend built from this worktree; the diff is deletions only.

**2. A Projects tab in the right panel (SR-003).**
- `'projects'` is first in `WORKSPACE_TOOL_ORDER`, before Files, and is visible on desktop only. It appears in the tab row, the collapsed strip (folder icon) and the drawer.
- It is never a contextual default. A scope change (opening a worker in another run) keeps it selected.
- `ProjectsPanel` contains:
  - **Picker:** `stores/projectsPanelStore.ts` remembers the choice per node in `localStorage`. The default is the most recently updated Project, else Temp tasks; it falls back if the remembered Project was deleted; an empty state links to `/projects`.
  - **Board:** `ProjectTaskBoard` / `TempTaskBoard` in a new `compact` mode, with lanes stacked.
  - **Cards:** `ProjectTaskRow` `activation="select"`; a card opens the Task inside the tab instead of navigating.
  - **Task detail:** `ProjectsPanelTaskDetail` shows the description, files and Assigned to, updates live, has a back arrow (search is kept), and an **Open in Projects** link.
- The worker line is unchanged (`useTaskRootNavigation`): the conversation opens in the center.
- The panel uses the same stores and change feed as the Projects pages; there is no second data path.

**3. Baseline fixes (new TESTING.md rule 9)** — separate commits, listed below. 22 files that also failed on `personal` now pass. The remaining server baseline failures are reported as their own item (see Known Risks).

**Implementation metadata**
- Implementation cycle: `Initial`
- Implementation revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/projects-always-on/tickets/in-progress/projects-always-on/implementation-revision-record.md`
- Current implementation revision ID: `IR-001`
- Related solution revision IDs: `SR-002`, `SR-003`
- Related architecture-review, code-review, API/E2E and delivery revision IDs: `N/A`
- Triggering finding IDs: `N/A`

## Routing Classification (Mandatory)

- Task size: `Medium`
- Architecture risk: `Low`
- Design classification section / evidence reference: design-spec.md "Task Size And Architectural Risk (Mandatory)" (SR-003)
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale:
  - The server change is removal only.
  - The web adds one right-panel tool that reuses the existing stores, boards, row, worker line and navigation.
  - There is no new data path, contract or persisted shape. The only new client state is one `localStorage` choice per node.
  - The design's escalation trigger ("a non-UI code path depends on the capability") did not fire: no agent tool or API gate read it.
- Selected route: `Direct API/E2E`
- Lightweight implementation self-review completed for the direct route: `Yes`
- New design impact or escalation trigger: `None`

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-001 | Projects always on (REQ-001; AC-001/002) | `composables/useShellPrimaryNavigation.ts` (runtime gate only), `middleware/feature-flags.global.ts` (no `/projects` entry) | Unit tests (nav, middleware), probe PT-E2E-001 (fresh node: nav after Agent Orgs, `/projects` opens), PT-E2E-015 (stored `false`: Projects opens) |
| BEH-002 | Settings card, refresh map and capability API removed (REQ-002/003; AC-002/003) | Server: `schema.ts`, `server-settings-service.ts`, deleted capability files. Web: `ServerSettingsBasicsPanel.vue`, `stores/serverSettings.ts`, deleted store/card/documents | Unit tests (schema has neither field; stored key is custom and deletable; Basics has no Projects), server e2e API-001, PT-E2E-015 (Basics has no switch; Advanced lists the key and the user deletes it) |
| BEH-003 | Mobile hides Projects (REQ-004; AC-004) | `mobileFeatureGates` unchanged; the nav and the new tab use it | Unit tests (nav and tab hidden in the mobile runtime) |
| BEH-004 | Existing Projects/Tasks unchanged (REQ-005; AC-005) | No data change | Server e2e API-006 (restart keeps Projects); PT-E2E-010 |
| SR-003 tab | REQ-006..011; AC-006..011 | `utils/layout/workspaceSurfaceOrder.ts`, `composables/useRightSideTabs.ts`, `components/layout/{RightSideTabs,RightSidebarStrip}.vue`, `components/projects/panel/{ProjectsPanel,ProjectsPanelPicker,ProjectsPanelTaskDetail}.vue`, `stores/projectsPanelStore.ts`, `ProjectTaskBoard.vue` / `TempTaskBoard.vue` (`compact`), `ProjectTaskRow.vue` (`activation`) | Unit and component tests (order, tab visibility, scope change keeps Projects, store default/persistence/fallback/empty, panel picker/board/detail/back/links/empty/missing). Browser PMU-015: first tab, live arrival beside the chat, worker opens with the tab kept, card → detail → back with search kept, Temp choice remembered after reload, lanes stacked |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`.
  - Applications and Skill Improvement capabilities are untouched.
  - The Projects pages are unchanged apart from the shared row/board modes, whose defaults behave as before (AC-011; PT-E2E-001..016 pass).

## Key Files Or Areas

- Server:
  - deleted `src/projects/domain/settings.ts`, `src/projects/services/projects-capability-service.ts`, `src/api/graphql/types/projects-capability.ts`, `tests/unit/projects/projects-capability-service.test.ts`;
  - modified `src/api/graphql/schema.ts`, `src/services/server-settings-service.ts`;
  - tests `tests/unit/services/server-settings-service.test.ts`, `tests/unit/api/graphql/{projects-schema.test.ts,types/projects.test.ts}`, `tests/e2e/projects/{projects-graphql,project-task-boundaries}.e2e.test.ts`;
  - docs `docs/modules/projects.md`.
- Web, flag removal:
  - deleted `stores/projectsCapabilityStore.ts`, `graphql/{queries,mutations}/projectsCapability*.ts`, `components/settings/ProjectsFeatureToggleCard.vue` (+ spec);
  - modified `composables/useShellPrimaryNavigation.ts`, `middleware/feature-flags.global.ts`, `stores/serverSettings.ts`, `components/settings/ServerSettingsBasicsPanel.vue`, localization `settings` en/zh-CN, `generated/graphql.ts`.
- Web, tab:
  - new `components/projects/panel/*`, `stores/projectsPanelStore.ts`;
  - modified `utils/layout/workspaceSurfaceOrder.ts`, `composables/useRightSideTabs.ts`, `components/layout/RightSideTabs.vue`, `RightSidebarStrip.vue`, `components/projects/{ProjectTaskBoard,TempTaskBoard,ProjectTaskRow}.vue`, localization `shell` / `projects` en/zh-CN.
- Probes:
  - `tests/e2e/projects-feature-probe.mjs` (PT-E2E-001/010/015 rewritten for always-on and stored `false`);
  - `tests/e2e/projects-primary-navigation-probe.mjs` (+ fixture: no Projects toggle; wait for the initial mount);
  - `tests/e2e/project-manager-ux-probe.mjs` (PMU-015; no capability enabling);
  - `tests/e2e/fresh-run-auto-approval-probe.mjs`.
- Docs: `autobyteus-web/docs/{projects,settings,workspace_layout}.md`, `autobyteus-web/AGENTS.md`.

## Important Assumptions

- **Projects survives a scope change.** `applyContextualDefault` keeps `projects` selected when the conversation scope changes. Otherwise opening a worker in another run would reset the tab to Team/Activity, which contradicts REQ-009.
- **Grep check reconciled.** The handoff asked for a repo-wide `ENABLE_PROJECTS|projectsCapability` check outside `tickets/done` to be empty. The only remaining hits are AC-002/003 regression assertions, which need the literal key, plus this ticket folder:
  - server unit and e2e tests: the stored key lists as custom/deletable; the schema has no `projectsCapability`/`setProjectsEnabled`;
  - the web serverSettings store test;
  - `projects-feature-probe` PT-E2E-015.
  No source, doc or catalog code mentions them.

## Known Risks

- **Intermittent PT-E2E-006 (narrow-layout check).** The first branch run failed PT-E2E-006 (zh-CN, 390 px: "Form/actions fit") and left the page in zh-CN. 007–009, 011, 014 and 015 then failed as a knock-on (they match English text). The rerun passed 16/16, and the base passed 16/16.
  - The check measures immediately after `setViewportSize`, so a layout-settle timing flake is the likely cause. It is not proven, so I added no speculative wait.
  - Evidence: `implementation-evidence/ir-001/projects-feature-probe-run1-intermittent-fail/` and `projects-feature-probe-run2/`.
- **Remaining server baseline failures (reported under rule 9).** A full `tests/unit` run on the server: 49 tests in 19 files also fail on `personal`. They are too broad for this ticket, so I recommend a dedicated baseline-repair ticket. First-level causes:
  - application-platform/orchestration: `AgentRunManager` now requires all execution-family dependencies, and the prepare-run API was renamed (`prepareNewAgentRun`);
  - agent-memory location / team memory explorer and the memory-view resolver: the explorers return empty, likely reading a changed layout;
  - `workspace-converter` and `workspace-manager`: a metadata shape change and an uninitialized `AgentRunManager`;
  - `studio-application-api-services`: requires the complete services;
  - `package-root-summary`: a new summary field;
  - `prisma-query-log-policy`: a pinned version, 1.0.9 → 1.0.10;
  - `gemini-configuration-service` and `media-storage-service`: they appear to read the developer machine's environment, so results are machine-dependent;
  - `file-explorer`, `streaming-content-flush-interval-setting`, `media-url-transformer-processor`, `workspace-manager-skill-integration`: not yet diagnosed.
- **Web type check.** `vue-tsc` reports 385 errors in files this change didn't touch, many from missing `@apollo/client` / `@vue/apollo-composable` type declarations. That is a dependency-typing issue, also reported as its own item.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: `Cleanup` (flag) + small feature (tab)
- Reviewed root-cause classification: N/A (no defect)
- Reviewed refactor decision: `No Refactor Needed`
- Implementation matched the reviewed assessment: `Yes`
- If challenged, routed as `Design Impact`: `N/A`
- Evidence / notes: the tab reuses the existing owners. The board and row modes are props with unchanged defaults, and there is no second data path.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None` (no "always true" capability endpoint was kept)
- Legacy old-behavior retained in scope: `No`
- Dead/obsolete code removed in scope: `Yes` (store, documents, card, copy, map entry, middleware entry, service, resolver, domain constant, tests)
- Shared structures remain tight: `Yes`
- Canonical shared design guidance reapplied: `Yes`
- Changed source files within size guardrails: `Yes` (largest new file `ProjectsPanelTaskDetail.vue` ≈ 90 lines)

## Persisted Data Transition Check (When Applicable)

- Approved decision: `Not Affected — ignored` (DEC-001). The stored key has no reader; there is no migration or startup work.
- Implementation follows the decision: `Yes`. Server unit and e2e tests and PT-E2E-015 show a stored `false` is not read, lists as an ordinary custom setting, and the user can delete it.
- New client state: `localStorage` key `autobyteus.projectsPanel.choice.<nodeId>`. An unreadable value is ignored.

## Environment Or Dependency Notes

- The fresh worktree needed `pnpm install --frozen-lockfile`, `nuxi prepare`, and a server `prebuild` (Prisma client) + `build` (for the built-server e2e suites and the probes).
- Codegen ran against a private backend built from this worktree, through a strict script (temp data dir; schema verified to have no `ProjectsCapability`).
- The untracked `autobyteus-application-*-sdk*/dist/` folders are build output and are not committed.

## Local Implementation Checks Run

- **Server:**
  - `tsc` (build config) clean.
  - Unit `services/server-settings-service`, `api/graphql/projects-schema`, `types/projects`, `tests/unit/projects`, plus e2e `tests/e2e/projects`: all pass, including the built-server suites after `build`.
- **Contracts:** `autobyteus-collaboration-stream-contracts` 22/22 (after the baseline fix).
- **Web:**
  - Full `pnpm test:nuxt --run` after the tab: **582 files / 3900 tests pass, exit 0**, no unhandled errors. Before the baseline fixes it was 8 failing files / 32 tests plus 1 unhandled rejection; all of those also failed on `personal`.
  - Projects, panel, layout and tab specs: all pass.
  - `guard:localization-boundary` and `audit:localization-literals`: pass with zero unresolved findings.
  - `vue-tsc`: no errors in changed files.
- **Lightweight self-review (direct route):**
  - The diff matches the design file mapping.
  - The flag removal is clean-cut, with no shims.
  - The tab reuses existing owners; the board/row defaults are unchanged.
  - Literal localization keys; the scope-change rule is documented.
  - Baseline fixes are separate commits, and each was checked to contain only its own files (one accidental inclusion was found and the local commits were rebuilt before handoff).

## Frontend Rendered-Result Check (When Applicable)

- Affected surfaces: the left nav; the `/projects*` routes; Settings › Server Settings (Basics, Advanced); the right panel on `/chat` and `/workspace` (tab row, strip, drawer); the Projects tab (picker, board, Task detail).
- References: requirements AC-001..011; existing board/row visuals (unchanged).
- Rendered surfaces used (TESTING.md): `test:e2e:project-manager-ux`, `test:e2e:projects`, `test:e2e:projects-navigation`. They use real built backends with private data roots (and scripted AGY agents for the PMU probe), Nuxt dev and headless Chrome 154. No user data.
- Inspected:
  - nav order and first-paint behavior;
  - `/projects` on a fresh node and on a stored-`false` node;
  - Basics (no switch) and Advanced (key listed, then deleted);
  - the tab: first position, picker default, live arrival while chatting, worker opening in the center with the tab kept, card → detail (description, status, Assigned to, Open in Projects) → back with search kept, Temp choice after reload, lanes stacked.
- Issues found and corrected:
  - the header icons in the tab's Task detail were not yet loaded at first paint. The probe now waits for drawn paths, and the screenshot confirms both 16 px icons render;
  - the nav probe clicked Projects before Nuxt finished its initial mount (Projects now paints immediately). The probe now waits for the mount.
- Evidence: `/Users/normy/autobyteus_org/autobyteus-worktrees/projects-always-on/tickets/in-progress/projects-always-on/implementation-evidence/ir-001/`
  - `pmu-probe/`: PMU-001..015 **Pass**;
  - `pmu-015-rerun/`: icon check;
  - `projects-feature-probe-run2/`: PT-E2E-001..016 **Pass**; run1 is the intermittent failure above;
  - `projects-navigation-probe/` and `-repeat/`: B-001..005 **Pass** twice.
- Not verified: the packaged Electron app; the drawer presentation (the drawer renders the same `RightSideTabs`); zh-CN rendering of the new panel copy (catalog parity only).

## Downstream Coverage Hints / Suggested Scenarios

- The Projects tab at the constrained width where the right panel becomes the drawer: open from the strip, picker and board usable.
- The Projects tab in a Team or Org conversation (`/workspace`): worker opening for Team- and Org-hosted roots keeps the tab.
- Two nodes: the per-node picker memory follows the bound node.
- The narrow-layout check in PT-E2E-006, to see whether the intermittent failure recurs.

## API / E2E / Executable Coverage Investigation And Execution Still Required

- AC-001..011 at API/E2E level.
- A packaged-desktop check that Projects is available without any setting.
