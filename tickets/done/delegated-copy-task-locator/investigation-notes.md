# Investigation Notes

## Investigation Meta

- Package identifier: `delegated-copy-task-locator`
- Request / ticket: Project Task `project_task_b541c02a-587d-4ebf-b315-15648cce9d4d` (implementation), from
  `/project_task_manager` (AgentRun `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`). Product design
  Task `project_task_be04657c-3a63-4215-b68f-dc2d0447baac`, Product ticket `delegated-copy-task-locator`.
- Workspace root: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copy-task-locator`
- Repository mode: `Git`
- Task worktree / branch: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copy-task-locator`,
  branch `codex/delegated-copy-task-locator`
- Resolved base remote / branch / revision: `origin/personal` @ `359d2c0efd08a2725c1aa994e69c2d04c56aea46`
  (fetched 2026-10-11; includes the merged collapsed-left-panel work `087de0c4c`).
- Finalization target remote / branch: `origin/personal`
- Bootstrap result: worktree created from refreshed `origin/personal`; ticket folder
  `tickets/in-progress/delegated-copy-task-locator/`.
- Bootstrap blocker: none.
- Current solution revision ID: `SR-003` (design revision; requirements unchanged at SR-002)
- Authorities read (requirements reading gate): `.claude/skills/solution-designer/references/requirements-engineering.md` (2026-10-11).
- Investigation status: requirements and architecture investigation complete (SR-002).

## Initial Request And Clarifications

- Original request: implement the approved UI/UX design "Navigate from a delegated agent/team copy back to its
  Task" as specified (design is fixed input). Task lookup must use server data and stay live; covered by tests;
  verified by the user in the desktop app.
- Clarifications received (relayed by `/project_task_manager`, 2026-10-11):
  - Overlap with Task `7a42fa46` (`delegated-team-aggregate-status`, branch `codex/delegated-team-aggregate-status`):
    **landing order theirs first**; this work rebases on it. Row-structure constraints: status dot and identity
    icon stay in `h-5` name-line boxes in the `items-start` row; the second line goes under the name text only
    (like the existing loading/error sub-line); Team rows render `TeamAggregateStatusDot` (`teamStatus` prop);
    any new field may go on `AgentRunTaskTreeRow` without changing how `teamStatus` is computed. Org rows are
    single-line `items-center` buttons and need a name-line box if a second line is added.
    Follow-up design note (not ticketed): `.../delegated-team-aggregate-status/target-status-design.md`.
    "Wait for their merge before implementing the row changes."
  - Overlap with Task `b2b0538a` (`collapsed-left-panel-expand-keeps-run`): already on `origin/personal`
    (merge `087de0c4c`, released v1.5.1-beta.1). No landing constraint. `useRevealSelectedTreeRow.ts` takes the
    **last** tree element matching `[aria-current="true"], [aria-selected="true"]`, scrolls it into view and
    focuses it. So: keep `aria-current` / `aria-selected` on the outer row; never on the summary or its button;
    keep the row focusable; the summary click must not change tree selection. Keep reveal/tree-state unit specs
    and probe cases PMU-018 / PMU-019 (`autobyteus-web/tests/e2e/project-manager-ux-probe.mjs`) passing.
- User-supplied facts and constraints: design approved by the user 2026-10-11 ("I like the summary version…
  Let's do it"); row icon and header chip rejected/withdrawn.
- Initial ambiguity: production data source (engineering decision); Org-run Task workers (scope to confirm with
  the user); behaviour when the page has no right panel (not designed); Team-run hosts (shared row component,
  not explicitly mentioned by the spec).

## Product And Domain Understanding

- Product area: `autobyteus-web` Workspaces tree (left panel) and the right panel's Projects tab; Projects Task
  execution data in `autobyteus-server-ts`.
- Actors: a user supervising delegated work (typically a Project Task Manager run that delegates Tasks to copies).
- Terminology:
  - **Copy / Task worker**: an Agent or Team copy spawned (or reassigned) by `delegate_task`; a Task's *root* is
    its latest `assigned` entry (`agent_run_resources.json`).
  - **Current Task of a copy** (server rule, `TaskExecutionResourceService.deriveCurrent`): its open entry, else
    its latest-linked entry.
  - **Sub-work copy**: a copy started by a Task worker's description-only delegation (role `delegated`) or brought
    in (`broughtIn`); it belongs to the worker's Task but is never that Task's root.

## Source Log

| Date | Source Type | Exact Source / Command / Query | Why Consulted | Relevant Finding | Follow-Up |
| --- | --- | --- | --- | --- | --- |
| 2026-10-11 | Doc | Product `ui-ux-spec.md`, `product-ticket.md` (context files of the Task) and VIS-002, VIS-005 | Approved behaviour | Normative behaviour and visuals; mocked boundary = browser scan | Map to REQs |
| 2026-10-11 | Code | design repo `/Users/normy/autobyteus_org/autobyteus-web-design` `git diff a55ced2 HEAD` (stores/taskLocatorStore.ts, composables/projects/useDelegatedCopyTask.ts, WorkspaceToolShell, boards, ProjectTaskRow, row) | How the reference behaves | Copy match = Task root (`ingressAgentRunId` with no `teamRunId` for agents; `teamRunId` for teams). Locate = store request watched by shell/panel/boards/card. On a page with no tool shell nothing visible happens (only the picker choice is saved) | DEC-002 |
| 2026-10-11 | Code | `autobyteus-server-ts/src/projects/services/task-execution-resource-service.ts` | Server-side copy → Task data | In-memory per-copy index `currentByExecution`; `rootTaskLocationOf(execution)` = the copy's current Task when its root is exactly this copy | Basis for the lookup |
| 2026-10-11 | Code | `src/projects/domain/task-execution-resources.ts`, `src/projects/services/task-root-view-builder.ts` | Root/current semantics | Root = latest `assigned` entry; current = open else latest `linkedAt` | Same visible result as the reference rule (see BEH-004) |
| 2026-10-11 | Code | `src/projects/changes/project-change-publisher.ts`, `project-change-messages.ts`, `project-task-service.ts:77` | Liveness | Every committed `agent_run_resources.json` write (assign, reassign, close, reopen) and every description/status write marks the Task → `/ws/projects` `task_upserted` with the full Task incl. `root`; deletes → `task_removed` | Live refresh trigger |
| 2026-10-11 | Code | `src/api/graphql/types/project-tasks.ts` | Existing GraphQL | Only per-Project and Temp-task list queries; no per-copy query | New read needed (no full-list scan per row) |
| 2026-10-11 | Code | `autobyteus-web/services/projects/projectChangeFeed.ts`, `composables/projects/useProjectChangeFeed.ts` | Client feed | Ref-counted `/ws/projects` socket, open only while retained (Projects pages, Projects tab, Temp board) | Tree must retain it while it shows Task workers |
| 2026-10-11 | Code | `autobyteus-web/stores/projectTaskStore.ts` | Board data/highlight | `liveChanges` highlight 2.4 s (`LIVE_HIGHLIGHT_MS`); per-list search in store; lists re-read on mount | Reuse highlight values |
| 2026-10-11 | Code | `autobyteus-web/stores/projectsPanelStore.ts` | Picker | `choose()` remembers per node in localStorage | "Remembered like a manual pick" |
| 2026-10-11 | Code | `components/projects/panel/ProjectsPanel.vue`, `ProjectTaskBoard.vue`, `TempTaskBoard.vue`, `ProjectTaskRow.vue`, `CancelledTasksToggle.vue` | Locate surfaces | Board-local `showCancelled`, `showAllDone` (DONE_LIMIT 10), search in store; panel `view` board/task | Edge-case hooks |
| 2026-10-11 | Code | `components/layout/WorkspaceToolShell.vue`, `composables/layout/useWorkspaceToolReveal.ts`, `layouts/default.vue` | Right panel reveal | `revealTool(tab)` provided via inject to the shell's subtree only; the left panel is outside it. Shell exists only on `/workspace` and `/chat?id=…` (start surfaces open tools via `useStartSurfaceTools`) | Store-mediated request; DEC-002 |
| 2026-10-11 | Code | `components/workspace/history/WorkspaceTransientExecutionRow.vue`, `AgentRunTaskRows.vue`, `WorkspaceTeamExecutionTree.vue`, `services/agentCollaboration/agentRunCollaborationContext.ts`, `stores/runHistoryTeamExecutionRows.ts` | Rows | Shared transient row renders Task workers under Agent-run hosts (`AgentRunTaskRows`) **and** Team-run hosts (`WorkspaceTeamExecutionTree`); kinds `task_agent`, `task_team`, `task_team_child` (members) | DEC-001 |
| 2026-10-11 | Code | `components/workspace/history/WorkspaceAgentOrgHistoryCollection.vue`, `utils/agentOrgHistoryRows.ts` | Org rows | Separate single-line `items-center` buttons for `task_agent` / `task_team` | DEC-001 |
| 2026-10-11 | Code | `git diff $(merge-base) codex/delegated-team-aggregate-status` | Overlap | Touches `WorkspaceTransientExecutionRow.vue` (+TeamAggregateStatusDot, `teamStatus`), `AgentRunTaskRows.vue`, `agentRunCollaborationContext.ts` (`teamStatus` on display entry), Org rows; branch merge-base `bd45af839` is 64 commits behind `origin/personal` | Rebase after their landing |
| 2026-10-11 | Code | `autobyteus-web/tailwind.config.js`, `utils/projects/taskStatusPresentation.ts:21` | Product observation | `content` globs omit `utils/`; `ring-slate-300` used only there, so never generated | REQ-011 |
| 2026-10-11 | Code | `autobyteus-web/utils/projects/taskSummary.ts` | Summary text | `taskSummaryLabel` = first non-empty line bounded to 120 chars at a word boundary | Reuse |

## Relevant Existing Behavior And Supported Product Paths

| Behavior ID | Kind | Supported Trigger Or Governing Contract | Current Supported Product Behavior Path / Lifecycle | Current Outcome / Invariants | Evidence | Confidence / Unknown |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | Expand a run with delegated copies in the Workspaces tree | Task Agent / task Team rows show one line: status/icon, name | Look-alike copies are indistinguishable (user screenshot 23.png) | `WorkspaceTransientExecutionRow.vue`; product-ticket "User evidence" | High |
| BEH-002 | User | Click / Enter / Space on a copy row | Opens the copy's conversation (team row: coordinator) and toggles a team row's disclosure | Unchanged by this work | `AgentRunTaskRows.vue select()`; row `activateRow` | High |
| BEH-003 | User | Click a right-strip tool icon | `revealTool(tab)`: tab selected explicitly, panel visible, drawer when not docked | Reused for locate | `WorkspaceToolShell.vue:90` | High |
| BEH-004 | Contract | `delegate_task` assignment / reassignment; DONE / CANCELLED | Server keeps per copy its current entry (open, else latest linked); a Task's root = latest `assigned` entry | A copy with an open Task has exactly one open entry; the open Task is therefore its current Task | `task-execution-resource-service.ts deriveCurrent`, `rootTaskLocationOf` | High; differs from the reference rule ("updated last") only when every Task of the copy is closed and an older one was edited later — contrived |
| BEH-005 | System | Task / assignment change | `/ws/projects` emits `task_upserted` (with `root`) or `task_removed`; boards apply live and highlight arrivals/moves 2.4 s | Reused as the live trigger | `project-change-publisher.ts`, `projectTaskStore.ts` | High |
| BEH-006 | System | Task DONE / CANCELLED | Copy rows of a closed Task leave the tree (`isListed` / closed subtrees) | A just-closed Task may still be on screen for an instant | `agentRunCollaborationContext.isListed`, `runHistoryTeamExecutionRows.ts` | High |
| BEH-007 | User | Task card → worker | Opens the copy's conversation from the card (reverse path) | Unchanged | `ProjectTaskWorkers.vue`, `useTaskRootNavigation.ts` | High |
| BEH-008 | User | Open run while left panel was collapsed / reveal from Task card | `useRevealSelectedTreeRow` scrolls/focuses the last `aria-current`/`aria-selected` row | Must keep working | relayed constraints; PMU-018/019 | High |
| BEH-009 | User | Copy row → Task | No current supported behavior | New (approved Product design) | spec | — |

## Relevant Codebase And Technical Facts

| Path / Component / Contract | Current Responsibility Or Behavior | Requirement Implication | Architecture Question / Design Implication |
| --- | --- | --- | --- |
| `TaskExecutionResourceService.rootTaskLocationOf` | O(1) copy → current-root Task location from the in-memory view | Server data exists; no persistence change | Expose a batched read by copy reference |
| `ProjectTaskService.readTaskChangeView(location)` | Reads the Task view for the feed | Same view shape for the new read | Reuse |
| `/ws/projects` feed | Live Task changes | Liveness on rename/reassign/close/delete | Client invalidates affected copies |
| `WorkspaceToolShell.revealTool` | Inject-scoped reveal | Tree is outside the shell | Store request observed by the shell |
| Start surfaces (`/chat` new, `/workspace` Org launch) | Tools hidden until opened (`useStartSurfaceTools`) | Locate must open tools there | Shell handles both |
| `ProjectTaskBoard` / `TempTaskBoard` | Board-local filter state | Make the Task visible | Board consumes the request after its list loads |
| `useRevealSelectedTreeRow.ts` | Selection reveal | Do not mark the summary as selected | Row constraint |

## Structural And Payload Surface Inventory

### Payload Or Content Surfaces

- Files/records: `agent_run_resources.json` per Task (read only via the service's view); Task files (read).
- Readers/writers: unchanged; read-only use.

### Structural Surfaces

- New read-only GraphQL query on the Projects API (server) and its client document.
- New client state for copy → Task cache and locate requests; changes to the shared tree row, the two row
  containers (Agent-run, Team-run), the shell, Projects panel, both boards, the Task card; en/zh-CN strings;
  Tailwind content globs.

### Potential Structural Impacts To Investigate

- API or external-contract change: additive GraphQL query (present).
- Persistence schema or invariant change: absent.
- Security or privacy boundary change: absent (same node, same Projects data already readable by the UI).
- Concurrency or lifecycle change: client cache invalidation and feed retention (present, local).
- Deployment/migration: absent.

## Runtime, Probe, Or Reproduction Findings

| Method / Command | Scenario | Observation | Requirement Implication | Artifact / Evidence Path |
| --- | --- | --- | --- | --- |
| Reading design repo diff (no runtime) | Reference behaviour | Matches spec; locate is a no-op without a tool shell | DEC-002 | design repo `b08ddf6` |

## Stakeholder And User Evidence

| Source / Actor | Need, Problem, Or Constraint | Evidence Strength | Requirement Implication | Open Question |
| --- | --- | --- | --- | --- |
| User (23.png, design approval quote) | Tell copies apart and reach their Task | Explicit | REQ-001..REQ-009 | — |
| User (rounds 1–3) | No row icon, no header chip | Explicit | Out of scope | — |
| PTM relays | Landing order, row constraints | Explicit | QR / preserved behaviour | — |

## External Contracts, Standards, And Dependencies

| Contract / Dependency | Version / Authority | Relevant Behavior Or Constraint | Evidence | Unknown / Risk |
| --- | --- | --- | --- | --- |
| `/ws/projects` message schema | `project-change-messages.ts` | Unchanged; used as invalidation trigger | source | — |
| Branch `codex/delegated-team-aggregate-status` | Task 7a42fa46 | Lands first; row structure | relay | Its merge timing |

## Persisted Data And State Facts

- Affected stored subject: none written. Reads Task files and the in-memory execution-resource view.
- Client storage: the Projects tab choice (existing localStorage key) is set by locate exactly like a manual pick.
- Remaining evidence gap: none.

## Product Design Request Context

- Product Design request in the current input: `Not stated` (design already completed and approved).

## Product Design Findings

- Product Design package path: `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/delegated-copy-task-locator/`
  (`personal` @ `b08ddf6`; final design revision `004d290`, ticket closed `18fa0ae`).
- UI reference source: same repo; runnable `corepack pnpm dev --port 3210` → `/chat?id=run-ptm-0001`,
  `/chat?id=run-research-001`.
- Approved UI/UX specification: `ui-ux-spec.md` (Status Approved).
- Explicit user-confirmation reference: 2026-10-11 "I also think summary is better. I like the summary version. I also think we use summary. Let's do it".
- Final visual references: `visual-references/VIS-001`…`VIS-014`.
- Mocked boundaries: browser-side scan of every Task list (must be replaced by server data); invented fixtures.
- Unresolved in the Product package: Org-run Task workers; production data source; (found here) behaviour on pages
  without the right panel.
- Consistency check: spec and product-ticket agree on repo, ticket, revisions and paths. The spec says
  "UI reference revision recorded in product-ticket.md", which records `004d290` / `18fa0ae`. Consistent.

## Supplemental Artifact Inventory

| Artifact Path | Owner | Purpose | Scope | Related Requirement / AC IDs | Status | Approval Applicability / State |
| --- | --- | --- | --- | --- | --- | --- |
| design repo `tickets/done/delegated-copy-task-locator/ui-ux-spec.md` | Product | Normative UI/UX | All UI | REQ-001..REQ-010, all UI ACs | Approved | User-approved 2026-10-11 |
| design repo `.../visual-references/VIS-*.png` | Product | Normative visuals | All UI | as above | Approved | User-approved 2026-10-11 |
| design repo `.../product-ticket.md` | Product | Decisions DEC-001..008, rejected alternatives | All | as above | Completed | Record |
| Task context copies `/Users/normy/.autobyteus/server-data/projects/project_a1377344-25db-482a-97cc-ecfdb0fb495a/tasks/project_task_b541c02a-587d-4ebf-b315-15648cce9d4d/context/*` | PTM | Copies of spec, ticket, 6 VIS | — | — | Reference | Same content |
| `.../delegated-team-aggregate-status/target-status-design.md` | Other team | Future status rule | Status only | — | Not ticketed | Not applicable |

## Assumptions, Unknowns, And Risks

| ID | Type | Description | Why It Matters | Resolution / Owner | Status |
| --- | --- | --- | --- | --- | --- |
| RSK-001 | Risk | Overlap with `delegated-team-aggregate-status` on the same row files | Merge conflicts / regressions | Rebase on it after it lands (PTM to notify) | Open |
| UNK-001 | Unknown | Org-run Task workers scope | Size and consistency | DEC-001 resolved (b): out of scope, follow-up candidate | Closed |
| UNK-002 | Unknown | Locate from a page without the right panel | Not designed | DEC-002 resolved (a) | Closed |
| RSK-002 | Risk | Feed must be open for liveness; tree retaining it opens a socket whenever Task workers are shown | Minor resource use | Accept; ref-counted existing feed | Accepted (design) |

## Architecture Investigation Findings

Authorities read for the design gate (2026-10-11): `.claude/skills/solution-designer/references/architecture-design.md`,
`references/design-principles.md`, repository `DESIGN.md` (no closer `DESIGN*.md` in `autobyteus-web` or
`autobyteus-server-ts`); `autobyteus-web/AGENTS.md`, `autobyteus-server-ts/AGENTS.md` noted.

| ID | Source | Observation | Design implication |
| --- | --- | --- | --- |
| AF-001 | `src/projects/services/project-task-service.ts` (constructor :70-86, `readTaskChangeView` :193) | `ProjectTaskService` is the Projects API owner; it holds `resources: TaskExecutionResourceService` and already reads Task views for the feed | The new read belongs on `ProjectTaskService`; the resolver must not reach `TaskExecutionResourceService` directly (authoritative boundary) |
| AF-002 | `task-execution-resource-service.ts rootTaskLocationOf` | Synchronous, never throws; damaged Tasks never enter the view → `null` | Per-worker answer is O(1) + one Task read; no global work |
| AF-003 | `src/api/graphql/types/project-tasks.ts` | Resolver pattern `withProjectErrors(...)`, type-graphql classes | Additive query in the same resolver file |
| AF-004 | `project-task-service.ts:77` + `project-change-publisher.ts` | Commit of any execution-resource write → `taskChanged` → `task_upserted` (full Task with `root`) | Client invalidation keyed on `root` and cached `taskId` is sufficient for rename / reassign / close / reopen; `task_removed` for delete |
| AF-005 | `services/projects/projectChangeFeed.ts getProjectChangeFeed` | Single `deliver` fan-out to `projectStore` and `projectTaskStore`; ref-counted `retain()` | Add the new client store to `deliver`; the store retains the feed while it has interested rows |
| AF-006 | `components/layout/WorkspaceToolShell.vue:90-100`, `layouts/default.vue` | `revealTool` is inject-scoped to the shell's subtree; the left panel (tree) is outside; shell mounted only on `/workspace` and `/chat?id=…` (start-surface variants on `/chat` new and Org launch) | Locate request must be store-mediated; the shell registers its presence so callers know whether a right panel exists (REQ-012) |
| AF-007 | `WorkspaceToolShell.vue:140-147`, `composables/layout/useStartSurfaceTools.ts` | On a start surface the docked panel shows only when `startTools.toolsOpen` | Shell's locate handler opens start tools first on a start surface |
| AF-008 | `components/projects/panel/ProjectsPanel.vue`, `ProjectTaskBoard.vue`, `TempTaskBoard.vue`, `ProjectTaskRow.vue` | Panel `view` (board / task); boards own `showCancelled`, `showAllDone` (Temp, `DONE_LIMIT` 10); search lives in `projectTaskStore.searchByProjectId`; cards keyed by `taskId`; compact mode = panel | Each surface consumes its step of one request; boards act only when `compact` |
| AF-009 | `components/workspace/history/AgentRunTaskRows.vue`, `WorkspaceTeamExecutionTree.vue`, `WorkspaceHistoryWorkspaceSection.vue:189-194, 331-341` | Agent host opens its run via `select-run` → `actions.onSelectRun(run)`; Team host emits `select` / `toggle` only | Team host needs an "open run" emit for REQ-012 |
| AF-010 | `composables/useWorkspaceHistorySelectionActions.ts onSelectTeam` | If the team run is already selected it **toggles** (collapses) the tree; otherwise expands and opens | REQ-012 needs an open-without-collapse variant: split an `openTeam` core shared by `onSelectTeam` and a new `onOpenTeamRun` |
| AF-011 | `WorkspaceAgentOrgHistoryCollection.vue` (aggregate-status branch version) | Org task rows are `<button>` elements, single-line `items-center`; open via `onInspectAgentOrgExecution` / `selectTaskTeam`; Org run opens via `actions.onOpenAgentOrgRun(run)` | If Org were in scope, the rows would need restructuring (nested `<button>` is invalid). Out of scope under DEC-001 (b); input for a follow-up ticket |
| AF-012 | `WorkspaceHierarchyBranches.vue` | Elbow at `top: 50%` of the row; used by transient, stable and Org rows | Add an explicit name-line anchor prop instead of deep CSS overrides in two row components |
| AF-013 | `composables/useRightSideTabs.ts:61`, `utils/mobileFeatureGates.ts` | `projects` tab gated by `isFeatureAvailableInRuntime('projects')` (mobile gates) | Summary shown only when the Projects tab is available |
| AF-014 | aggregate-status branch diff (`AgentRunTaskTreeRow.teamStatus`, `TeamAggregateStatusDot`, Org rows) | Same files touched | Row/template changes are written against their merged versions; Task data is not added to `AgentRunTaskTreeRow` (it is Projects data, owned by a separate store) |

## Requirement Implications

- The server already owns the copy → current-root-Task answer; the requirement "use server data, stay live" is
  feasible without persistence changes, using an additive read plus the existing change feed.
- The approved "current Task" rule maps onto the server's current-entry rule with identical results in supported
  scenarios (BEH-004); requirements state the visible rule and the server rule as its authority.
- Sub-work copies inside a Task worker's subtree are not Task roots and therefore show no summary — consistent
  with the reference (root match) and the spec's "copies whose Task is unknown" / members rule.
- The shared row is also used under Team-run hosts; Org rows are separate (DEC-001).
- Locating needs a right panel; pages without one need a decision (DEC-002).

## Notes For Architecture Design

- Row constraints from both overlapping teams (see Clarifications) are hard constraints.
- Implementation of row changes waits for the `delegated-team-aggregate-status` merge; server + Projects-side work
  can proceed independently.
