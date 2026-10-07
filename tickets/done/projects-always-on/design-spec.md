# Design Spec — `projects-always-on`

## Solution And Approval Basis
- Current solution revision ID: `SR-003` (SR-002 flag removal + Projects tab)
- Approved requirements: `requirements-doc.md` SR-003 (user, 2026-10-07; the tab was added at the user's direction)
- Supplements: none
- Design status: `Ready`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/projects-always-on/tickets/in-progress/projects-always-on/investigation-notes.md`
- Authorities read (2026-10-07): `references/architecture-design.md`, `design-principles.md`, `/DESIGN.md`, `autobyteus-server-ts/docs/design/data_migration_guideline.md`
- Conflicts or discrepancies: None

## Current-State Read
`ENABLE_PROJECTS` is a per-node server setting exposed as a GraphQL capability. The web uses it in three places:
- `projectsCapabilityStore` feeds the nav item filter (`useShellPrimaryNavigation`);
- the route middleware (`feature-flags.global.ts`) checks it;
- Settings uses it (Basics toggle card; the Advanced key → capability refresh map).

Backend features don't read it. Mobile hiding is a separate runtime gate (`mobileFeatureGates.ts`).

## Task Size And Architectural Risk (Mandatory)
- Task size: `Medium` (SR-003; it was `Small` before the tab). The flag removal is mostly deletion. The Projects tab adds one right-panel tool that reuses the existing board, stores, card, worker line and navigation, plus a panel picker and an in-panel Task detail. Web only.
- Previous rationale (flag removal): removal across one server capability slice (domain constant, service, GraphQL type and schema registration, tests) and the web capability slice (store, GraphQL documents, middleware entry, nav filter, settings card and map, localization, tests and probes, docs). It is mostly deletion.
- Architectural risk: `Low`. A web-only tool is added through the existing right-tool catalog and existing stores; no new contract, persistence or concurrency. A UI-visibility flag is removed. No data change (the stored key is ignored), no new contract, and the GraphQL capability removal only affects this web app's own documents.
- Escalation trigger: return a Design Impact if any non-UI code path is found that depends on the capability (e.g. an agent tool or API gate).

## Intended Change (clean-cut removal)
Server (`autobyteus-server-ts`), remove:
- `src/projects/domain/settings.ts`;
- `src/projects/services/projects-capability-service.ts`;
- `src/api/graphql/types/projects-capability.ts` and its registration in `src/api/graphql/schema.ts`;
- `tests/unit/projects/projects-capability-service.test.ts`;
- capability cases in `tests/unit/api/graphql/projects-schema.test.ts`, `types/projects.test.ts`, `tests/unit/services/server-settings-service.test.ts`;
- capability setup in `tests/e2e/projects/*.e2e.test.ts`.

Web (`autobyteus-web`):
- **Remove:**
  - `stores/projectsCapabilityStore.ts`;
  - `graphql/queries/projectsCapabilityQueries.ts`, `graphql/mutations/projectsCapabilityMutations.ts` (+ regenerate `generated/graphql.ts`);
  - `components/settings/ProjectsFeatureToggleCard.vue` + spec;
  - the Projects entry in `middleware/feature-flags.global.ts` (the Applications entry stays);
  - the `ENABLE_PROJECTS` entry in `stores/serverSettings.ts` `CAPABILITY_STORE_BY_SETTING_KEY`;
  - the Projects card usage in `ServerSettingsBasicsPanel.vue` + specs;
  - the settings localization keys for the card (en/zh-CN) + catalog spec.
- **Modify:**
  - `composables/useShellPrimaryNavigation.ts`: the Projects item is filtered only by `isFeatureAvailableInRuntime('projects')`;
  - `useShellPrimaryNavigation.capabilities.spec.ts`, `middleware/__tests__/feature-flags.global.spec.ts`;
  - probes `projects-feature-probe.mjs`, `projects-primary-navigation-probe.mjs`, `fresh-run-auto-approval-probe.mjs` (drop capability stubs and toggling);
  - `tests/e2e/fixtures/projects-primary-navigation.page.vue`;
  - any Projects probes or E2E scripts that set `ENABLE_PROJECTS` (search `ENABLE_PROJECTS` repo-wide; zero hits must remain outside archived tickets).

Docs:
- `autobyteus-web/docs/projects.md` "Scope And Gating" → "always available on desktop; not on mobile";
- `docs/settings.md`;
- `autobyteus-web/AGENTS.md` catalog line;
- server `docs/modules/projects.md`;
- `TESTING.md` if it mentions the flag.

## Persisted Data / State Transition
- Subject: the server settings store key `ENABLE_PROJECTS` (true/false) on existing nodes.
- Decision: `Not Affected — ignored` (user DEC-001: "we just don't read it"). There is no reader after removal. Advanced Settings lists every stored key, so the old key can appear as an ordinary, deletable custom setting without effect (AC-002). No migration or deletion; no startup work.
- Projects/Task data: untouched.

## Behavior Map
| BEH | REQ/AC | Path |
| --- | --- | --- |
| BEH-001 | REQ-001; AC-001, 002 | Nav filter → runtime gate only; middleware no longer gates `/projects` |
| BEH-002 | REQ-002; AC-003 | Settings card, map and capability API removed |
| BEH-003 | REQ-004; AC-004 | `mobileFeatureGates` unchanged |
| BEH-004 | REQ-005; AC-005 | Unchanged |

## Design Health
- Posture: `Cleanup`
- Issue: `No`
- Refactor: `No`. Clean-cut removal; no compatibility shim (no "always true" capability endpoint kept).

## Backward-Compatibility Rejection Log
| Candidate | Decision |
| --- | --- |
| Keep the capability query returning `enabled: true` | Rejected: remove the API |
| Startup deletion of the stored key | Rejected by the user (DEC-001) |

## Change Sequence
1. Server removals + tests.
2. Web removals/modifications + codegen + tests.
3. Probes.
4. Docs.
5. Verify:
   - repo-wide `grep ENABLE_PROJECTS|projectsCapability` (outside `tickets/done`) is empty;
   - server unit/E2E Projects;
   - web nuxt tests;
   - the Projects and navigation probes, including a node with stored `ENABLE_PROJECTS=false` (AC-002).

## Risks
- Older desktop builds talking to a newer server would no longer find the capability query and would hide Projects. Accepted: desktop and its bundled server ship together. A remote server node running an older build is outside this scope.


## SR-003 Addition: Projects Tab (design)

### Current state
- The right-panel tools are declared once in `utils/layout/workspaceSurfaceOrder.ts` (`WorkspaceToolName`, `WORKSPACE_TOOL_ORDER`) and consumed by `composables/useRightSideTabs.ts` (labels/visibility), `components/layout/RightSideTabs.vue` (content), `RightSidebarStrip.vue` (icons) and `WorkspaceRightToolDrawer.vue`. `docs/workspace_layout.md` holds the canonical order.
- The board stack already exists: `ProjectTaskBoard.vue` / `TempTaskBoard.vue`, `ProjectTaskRow.vue`, `ProjectTaskWorkers.vue`, `TaskRootSection.vue`, `useTaskRootNavigation`, the live `projectTaskStore` / `projectStore` and the change feed. The board stacks its lanes below a 752 px container.

### Changes (file mapping)
| Path | Change | Responsibility |
| --- | --- | --- |
| `utils/layout/workspaceSurfaceOrder.ts` | Modify | Add `'projects'` to `WorkspaceToolName`, **first** in `WORKSPACE_TOOL_ORDER`; `includeProjects` input |
| `composables/useRightSideTabs.ts` | Modify | Label `shell.rightTabs.projects`. Visible when `isFeatureAvailableInRuntime('projects')` (desktop). It is not the contextual default (Team/Activity defaults unchanged). |
| `components/layout/RightSideTabs.vue`, `RightSidebarStrip.vue` (icon `heroicons:folder`, as the Projects nav item), `WorkspaceRightToolDrawer.vue` | Modify | Render, icon and drawer entry |
| `components/projects/panel/ProjectsPanel.vue` | Add | Tab body: picker + board or Task detail (local view state `{kind: 'board'} \| {kind: 'task', taskId}`); search kept when returning |
| `components/projects/panel/ProjectsPanelPicker.vue` | Add | Select of Projects (from `projectStore`, live) + "Temp tasks"; empty state with a link to `/projects` |
| `stores/projectsPanelStore.ts` | Add | The remembered choice per node, persisted in `localStorage` (key includes the bound node id); resolves the default (most recently updated Project, else Temp tasks); falls back when the chosen Project was deleted |
| `components/projects/panel/ProjectsPanelTaskDetail.vue` | Add | Read-only Task detail: back arrow, full description (`whitespace-pre-wrap`), `TaskContextFiles` / reference paths, `TaskRootSection`, "Open in Projects" link to the full Task page |
| `ProjectTaskBoard.vue`, `TempTaskBoard.vue` | Modify | Accept a `compact` mode for the panel: no page header/back link/New task (New task stays on the Projects page). Card activation emits `select-task` instead of routing. |
| `ProjectTaskRow.vue` | Modify | Prop `activation: 'route' \| 'select'` (default `route`). In `select` it renders a button-like stretched control that emits `select`, same visuals. The worker line keeps opening the conversation (`useTaskRootNavigation`). |
| localization en/zh-CN (`shell`, `projects`) | Modify | "Projects", picker, empty state, "Open in Projects", back label |
| `docs/workspace_layout.md`, `docs/projects.md` | Modify | Tool order (Projects first) and panel behavior |
| Tests | Add/Modify | Order (unit), panel store default/persistence/fallback (unit), panel components (component), and a browser probe journey on `/workspace` or `/chat`: the tab is first, live arrival while chatting, worker click keeps the tab, card → detail → back, picker remembered after reload |

### Ownership and rules
- The panel uses the same stores and the change feed as the Projects pages: no second data path. The feed connects when either the Projects pages or the panel needs it.
- `useTaskRootNavigation` stays the only way to open a worker. The right panel persists across `/workspace` ↔ `/chat` navigation, so the tab stays selected (`activeTab` is global).
- No server change for the tab.

### Change sequence (whole ticket)
1. Flag removal (as above).
2. Tool order and tab wiring.
3. Panel store, picker, panel body, in-panel detail; board and row modes.
4. Localization and docs.
5. Tests and the browser probe.
