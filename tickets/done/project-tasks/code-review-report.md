# Code Review Report

Package `PROJ-TASKS-20260926-001` — `project-tasks`: description-only Project Tasks with an agent-owned status, on a two-pane Projects page.

## Review Round Meta

Latest round: **round 2 (`CRR-003`), `Implementation Review`** of `IR-002` (Rework after the user rejected `DR-001`; basis `SR-008` / `ARCH-REV-003`).

- The round 2 section below is authoritative for the web UI.
- The round 1 content remains valid for everything `IR-002` did not touch: the server subsystem, storage, GraphQL, `projectTaskStore`, `projectStore`, `ProjectTaskDialog`, `ProjectWorkspacesPanel` and `ProjectDialogFrame`, all confirmed unchanged since `e8fca7771`.
- Round 1 statements about the two-pane UI (`pages/projects.vue`, `ProjectListPane`/`ProjectListItem`, `ProjectTasksPanel`/`ProjectTaskRow`, the status filter, the relative-time util) are superseded.

Round 2 meta:

- Current Code Review Revision ID: `CRR-003`
- Current Review Round: `2`
- Trigger: `/implementation_engineer` handoff of `IR-002`, commit `ae0cd4755`. Its parent `a0fd103af` is delivery's merge of `origin/personal`, which brought no Projects changes.
- Requirements: `requirements-doc.md`, Approved `SR-008` basis (`APPROVAL-PROJ-TASKS-20260927-002`). The changed IDs are `REQ-006`, `REQ-007`, `REQ-009`, `REQ-016`, `AC-002`, `AC-005`, `AC-007`, `AC-011`, `SCN-007`, `DEC-012`–`DEC-016`, and the UI normative rules.
- Design: `design-spec.md` (`SR-008`). Architecture review: `design-review-report.md` (`ARCH-REV-003`, Pass, with its residual risks).
- Implementation: `implementation-handoff.md` and `implementation-revision-record.md` (`IR-002`).
- Prior round reviewed: `CRR-001` (Pass) and `CRR-002` (test review, Pass), both for the now-rejected two-pane UI.
- Delta reviewed: `git show ae0cd4755`, 24 web paths. I also checked the cumulative Projects scope.

Round 1 meta:

- Review Entry Point: `Implementation Review`
- Requirements Doc Reviewed As Context: `requirements-doc.md` (Approved, `SR-003`, `APPROVAL-PROJ-TASKS-20260926-001`)
- Investigation Notes Reviewed As Context: `investigation-notes.md`
- Solution Revision Record Reviewed As Context: `solution-revision-record.md`
- Design Spec Reviewed As Context: `design-spec.md` (`SR-004`)
- Supplemental Task Artifacts Reviewed As Context: `handoff-to-architecture-review-sr-004.md`. The released `tickets/done/projects-concept-introduction/` package was used as context.
- Relevant Solution Revision IDs: `SR-003`, `SR-004`
- Design Review Report Reviewed As Context: `design-review-report.md` (`ARCH-REV-001`, Pass, with residual notes 1–6)
- Architecture Review Revision Record Reviewed As Context: `architecture-review-revision-record.md`
- Relevant Architecture Review Revision IDs: `ARCH-REV-001`
- Implementation Handoff Reviewed As Context: `implementation-handoff.md`
- Implementation Revision Record Reviewed As Context: `implementation-revision-record.md`
- Relevant Implementation Revision IDs: `IR-001`
- Code Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-tasks/tickets/in-progress/project-tasks/code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-001`
- Current Review Round: `1`
- Trigger: `/implementation_engineer` handoff of `IR-001`. Commits `8d3de39a6` (server) and `e8fca7771` (web) on base `e06080b00`.
- Prior Review Round Reviewed: N/A
- Latest Authoritative Round: `1`
- Failure-origin and delivery fields: N/A

## Routing Classification Review

- Task size: `Medium`
- Architectural risk: `High`
- Selected route: `Implementation Review`
- Independent source review required by the classification: `Yes`
- Classification evidence or correction required: Confirmed.
  - The change touches 54 files, about half of them specs, all within the Projects subsystem.
  - It changes the released persisted shape additively, the GraphQL contract additively, and the released UI structure.
  - No escalation trigger was hit: there is no migration or row rewrite, no delegated-task code changed, and there is no status mutation.

## Round 2 — `IR-002` Review (Released Grid, Full-Width Project Page, Three-Column Board)

### Behavior basis (round 2)

| Behavior / Requirement | Status | Implementation Path And Evidence |
| --- | --- | --- |
| REQ-016, AC-011, SCN-007 (released grid, then a separate Project page with Back) | Confirmed | `pages/projects/index.vue`, `[id].vue` and `ProjectsList.vue` are byte-identical to `e06080b00` (`git diff e06080b00 ae0cd4755` shows no difference). `ProjectDetail` is full width (no `max-w`). A "← Projects" `NuxtLink` to `/projects` sits at the top-left in every state, including loading, error and not-found. Its accessible name, "Back to projects", contains the visible label. The Project name is now an `h1`, and the description is clamped to 2 lines. Edit and Delete are unchanged. The Tasks tab is the default, and `?tab=workspaces` selects Workspaces, as before. `pages/projects.vue` (the nested route) is removed, so the released route structure is back. |
| REQ-009, AC-007, DEC-015 (not-done count on the card) | Confirmed | The `ProjectCard` bottom line uses `ProjectCard.counts` = "{{tasks}} · {{workspaces}}", with none, singular and plural variants from `openTaskCount` and `workspaces.length`. Zero reads "No open tasks", which follows the released "No …" wording pattern. |
| REQ-006, AC-002, DEC-016 (three-column board) | Confirmed | `ProjectTaskBoard` has three columns, in the order of `PROJECT_TASK_STATUSES`: To Do, In Progress, Done. Each is a `section` labelled by an `h2` showing the column name and count as text. Cards come from the store, which is already sorted newest-updated first. An empty column shows a muted "No tasks". The page scrolls normally, with no per-column scroll. **Layout rule (the `ARCH-REV-002` finding `AR-001`, checked against `ARCH-REV-003`'s residual note):** `container-type: inline-size; container-name: project-task-board` sits on the board root. That root is a block child of the tabpanel, so its width comes from its parent. The grid is its child: one column by default, switching to `repeat(3, minmax(0, 1fr))` via `@container project-task-board (min-width: 752px)` (3 × 240 px + 2 × 16 px gaps). There is no viewport breakpoint. `ProjectTaskCard` is a button showing the description only (`line-clamp-3 whitespace-pre-line break-words`), with no status, time, icon or drag. Its accessible name is the summary, and the status is conveyed by the column heading (QR-003). |
| REQ-007, AC-005 (search across columns, no status filter) | Confirmed | One case-insensitive substring search over the description, applied before grouping, so the column counts reflect the result. A single no-match state appears only when Tasks exist; its Clear search button refocuses the search input. There is no status filter. An empty Project shows the three "No tasks" columns and New task. |
| REQ-003 (no human status change) | Confirmed | There is no status control on the card, board or dialog; the dialog is unchanged. |
| Server, storage, GraphQL, cascade, AC-010, REQ-012 | Confirmed (unchanged) | No changes under `autobyteus-server-ts/src` since `8d3de39a6`. `projectTaskStore`, `projectStore`, `ProjectTaskDialog`, `ProjectWorkspacesPanel` and `ProjectDialogFrame` are unchanged since `e8fca7771`. |

Behavior-basis status: `Confirmed`. No new or contradicted behavior.

### Removal verification (design Removal / Decommission Plan)

- `pages/projects.vue`, `ProjectListPane`, `ProjectListItem`, `ProjectTasksPanel`, `ProjectTaskRow`, `utils/projects/relativeTime.ts` and their specs are all removed.
- The stale en/zh-CN keys (`ProjectListPane.*`, `ProjectListItem.*`, `ProjectTasksPanel.*`, `ProjectTaskRow.*`, `projects.time.*`, `pages.projects.index.*`) are removed. The catalogue spec asserts they are absent, and grep finds no stale source references.
- `ProjectsList.spec.ts` is restored and updated.

### Round 2 candidates

| Candidate ID | Observation | Scenario / Contract | Evidence | Disposition | Reason |
| --- | --- | --- | --- | --- | --- |
| C-11 | The uncommitted delivery docs edits (`autobyteus-web/docs/projects.md`, `autobyteus-web/AGENTS.md`, `autobyteus-server-ts/docs/modules/projects.md`) still describe the rejected two-pane UI. | Design step 7 (docs sync, owned by delivery) | `git status` shows them modified and uncommitted; they are not part of `ae0cd4755` | Reject (not an implementation defect) | Delivery must redo them in docs sync. Routed as a residual note to delivery through the chain. |
| C-12 | The card's accessible name is the first line only, while the visible card shows up to 3 lines. | QR-003, REQ-002 | `ProjectTaskCard` | Reject | This is designed. The summary is the approved scanning unit, and the full description is in the dialog. |
| C-13 | The zero count reads "No open tasks" rather than "0 open tasks". | AC-007 ("shows 0 without error") | en/zh-CN keys | Reject | It communicates zero without error, and it follows the released card wording pattern for none, singular and plural. |
| C-14 | Column layout cannot be exercised in jsdom unit tests. | AC-002 width guards | The specs are layout-agnostic | Reject (as a defect) | The design assigns the width guards to e2e. The handoff reports E2E-027 plus measurements at 1200×800 (260/260/260), with the 520 px panel, and at 1000 and 700 px (stacked). API/E2E will confirm. |
| C-15 | Delete-count source (`openTaskCount`). | REQ-008, `P-001` | Unchanged | Reject | Carried from round 1 (C-01). The admission ticket must revisit it. |

### Round 2 structural notes (the round 1 table otherwise carries forward)

- **Ownership and SoC:** `ProjectTaskBoard` takes over from `ProjectTasksPanel` as the only board-level consumer of `projectTaskStore` and the owner of the dialog. The grouping is a pure computed. `ProjectTaskCard` is purely presentational. `ProjectDetail` holds only the header, Back link, tabs and delete. Pass.
- **Reuse:** it follows the existing plain-CSS `@container` pattern from `GeminiConfigurationOptionCard.vue`, with no new plugin. It reuses `TASK_STATUS_LABEL_KEYS`, `taskSummary`, `ProjectTaskDialog` and `ProjectWorkspacesPanel`. Pass.
- **Legacy and cleanup:** the rejected UI is removed, not hidden, and no toggle or redirect is kept. Pass.
- **Size (effective lines):**
  - `ProjectTaskBoard.vue`: 164, a new file.
  - `ProjectTaskCard.vue`: 20, a new file.
  - `ProjectDetail.vue`: about 255 (+23/−10).
  - `ProjectsList.vue` and `ProjectCard.vue`: restored, and small.
  - No file exceeds 500, and no delta exceeds 220 except the new files, which each have a single concern. Pass.

### Verification run by the reviewer (round 2)

- Web: 62 files / 403 tests pass. The run covered:
  - Projects components, stores, utils and catalogues (including the new `ProjectTaskBoard` and `ProjectTaskCard` specs and the restored `ProjectsList` spec);
  - the middleware, composables and mobile gates;
  - `components/common` and `components/workspace/config`.
- Server: the Projects unit tests, the Task schema test, the architecture test and `tests/e2e/projects` pass (6 files / 65 tests), with the developer shell's `ENABLE_*` variables set.
- `guard:localization-boundary` and `audit:localization-literals` both exit 0.

## Review Scope

- Changed implementation and behavior reviewed: the full diff `e06080b00..e8fca7771`.
- Files and areas reviewed:
  - Server:
    - `src/projects/domain/{models,project-errors}.ts`
    - `src/projects/stores/project-store.ts`
    - `src/projects/services/{project-service,project-task-service}.ts`
    - `src/api/graphql/types/{projects,project-tasks}.ts` and `schema.ts`
  - Web:
    - `pages/projects.vue` and `pages/projects/{index,[id]}.vue`
    - `components/projects/{ProjectListPane,ProjectListItem,ProjectDetail,ProjectTasksPanel,ProjectTaskRow,ProjectTaskDialog,ProjectWorkspacesPanel}.vue`
    - `stores/{projectStore,projectTaskStore}.ts`
    - `utils/projects/{projectRequestError,relativeTime,taskStatusLabelKey,taskSummary,projectErrorMessageKey}.ts`
    - `types/project.ts` and the GraphQL documents
    - the en and zh-CN catalogues and `docs/projects.md`
  - Tests: changed and added specs, reviewed proportionately.
- Explicit exclusions:
  - the body of `generated/graphql.ts` (I checked that it is a Projects/Tasks-only delta; the removed lines are the Project types re-emitted with `openTaskCount`);
  - `tests/e2e/projects-feature-probe.mjs`, the adapted released probe, which belongs to API/E2E test review;
  - docs sync.
- Independent verification run by the reviewer:
  - Server: the changed-area suites (`tests/unit/projects`, both Project GraphQL schema tests, `types/projects.test.ts`, `tests/architecture/projects-boundaries.test.ts`) pass: 7 files, 66 tests.
  - Server: the released `tests/e2e/projects` suite passes 6/6 when run with the shell's `ENABLE_*` variables unset.
  - Web: 62 files / 408 tests pass. The run covered:
    - Projects components, stores and utils;
    - the catalogue specs;
    - the middleware, composables and mobile gates;
    - `components/common` and `components/workspace/config`.
  - Web: `guard:localization-boundary` and `audit:localization-literals` both exit 0.

## Upstream Behavior And Production-Path Basis Confirmation

- Approved requirements basis understood: `Yes`.
  - Tasks are description-only, and new Tasks are always `TODO`. No human changes status.
  - Supported actions are create, view, edit description, delete, search and status filter.
  - Deleting a Project cascades to its Tasks, and the confirmation shows the Task count.
  - Each list-pane entry shows its count of not-done Tasks.
  - Selection is one click on a two-pane page with Tasks and Workspaces tabs.
  - Released data stays readable without migration.
  - Project Tasks stay separate from delegated tasks.
- Design-spec behavior map verified against the implementation: `Yes`.
- Design review report and round confirmed: `ARCH-REV-001`, Pass. Residual notes 1–6 were each checked; see the Candidate Gate.
- Behavior-basis status: `Confirmed`
- Changed or newly discovered behavior: None.
- Remaining material ambiguity: None.

| Behavior ID | Current Status | Current Implementation Path And Lifecycle Evidence | Contradicting / Newly Discovered Evidence |
| --- | --- | --- | --- |
| BEH-001 / BEH-006 | Confirmed | **Write path:** `ProjectTaskDialog` (create, view, edit and confirmDelete modes in one `ProjectDialogFrame`) → `projectTaskStore.createTask`, `updateTaskDescription` or `deleteTask` → `ProjectTaskResolver` (`withProjectErrors`) → `ProjectTaskService`. The service trims the description and requires it to be non-empty. It creates ids as `project_task_<uuid>` with status `TODO` and timestamps. `updateTasks` replaces only `Project.tasks` inside `ProjectStore.updateRecords`. After a write, the store calls `projectStore.setOpenTaskCount`. **List path:** `ProjectTasksPanel` → `fetchTasks`, deduplicated by an inflight map and guarded by binding revision → `projectTasks`, sorted by `updatedAt` desc then `taskId`. Search and the status filter run client-side. Rows show the status as text, the `taskSummary` first line, and a localised relative time. The dialog shows the full `pre-wrap` description. There is no status control anywhere; a server test asserts that no status-change method exists. | — |
| BEH-002 | Confirmed | Deleting a Project from `ProjectDetail` opens a confirmation. It reads the count from `openTaskCount`, which is commented as equal to the total while no status mutation exists; this is the second option the architecture review allowed. `projectStore.deleteProject` is followed by `projectTaskStore.forget` and then `navigateTo('/projects')`. On the server, `ProjectService.deleteProject` removes the record and its embedded Tasks in one locked write, which the cascade test covers. | — |
| BEH-003 | Confirmed | The Task routes live under `/projects*`, which the existing route gate already covers. No new flag was added. | — |
| BEH-004 | Confirmed | `pages/projects.vue` renders `ProjectListPane` and `<NuxtPage>`. The children are the select prompt and `ProjectDetail`. `ProjectListItem` is a `NuxtLink` with `aria-current` and a text count ("N open"). Creating a Project navigates to it. The tabs follow the WAI tab pattern (roving `tabindex`, Arrow/Home/End keys) and use `?tab=workspaces` in the URL. `ProjectDetail.load` depends only on `projectId` and `bindingRevision`, and a cached Project renders at once. | — |
| BEH-005 | Confirmed | The architecture test forbids imports between `projects/**` and the delegated-task, agent-team, collaboration, agent-execution and org-execution roots in both directions. The resolver names are `ProjectTask*`. | — |
| AC-010 (released data) | Confirmed | `normalizeRecords` reads a missing `tasks` as `[]` and filters invalid Tasks. A fixture test reads a v1.4.86 row and checks that the file is not rewritten on read. | — |

## Supported Product Scenario And Reachability Gate (Mandatory)

| Scenario ID | Related IDs | Kind | Actor | Goal / Event | Entry Surface | Shape | Forward Path | Expected Outcome | Evidence | Validity | Review Use |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | REQ-001–003, 005, 009; AC-001, AC-007 | User | Work owner | Capture work | Selected Project › New task | Normal | DS-001 | Task created as To Do; count updates | Approved requirements | Supported Normal Scenario | Use |
| SCN-002 | REQ-006, 007, 014; AC-002, AC-005 | User | Work owner | See and find work | Tasks tab | Normal | DS-002 / DS-005 | Sorted list with status text; search and filter; no-match state | Approved requirements | Supported Normal Scenario | Use |
| SCN-003 | REQ-005; AC-003, AC-004 | User | Work owner | Correct or remove work | Task dialog | Normal | DS-001 | Edit persisted; delete after confirmation; Cancel keeps the Task | Approved requirements | Supported Normal Scenario | Use |
| SCN-004 | REQ-008; AC-006 | User | Work owner | Remove a Project | Project › Delete | Normal | DS-003 | Confirmation states the count; Project and Tasks removed atomically | Approved requirements | Supported Normal Scenario | Use |
| SCN-005 | REQ-010; AC-008 | User/Operational | Operator | Hide the module | Settings toggle | Normal | Existing gate | Hidden, then shown with the same Tasks | Released flag | Supported Normal Scenario | Use |
| SCN-006 | REQ-013; AC-010 | Operational | Upgrade | Keep released data | Upgrade from v1.4.86 | Explicit Edge | Normaliser | Released rows intact, with no Tasks | Released data | Supported Explicit Edge Scenario | Use |
| SCN-007 | REQ-016, 009; AC-007, AC-011 | User | Work owner | Switch between Projects | List pane / deep link | Normal | DS-004 | One click; left pane stays; not-found shown in the right pane | Approved requirements | Supported Normal Scenario | Use |
| SCN-008 | REQ-012; AC-009 | Contract | Team execution | Delegated tasks unchanged | Existing runs | Normal | Untouched | No crossover | Approved requirements plus the architecture test | Supported Normal Scenario | Use |
| SCN-X01 | REQ-003 | User | — | Human changes a Task's status | — | — | — | — | Rejected by the user | Technically Possible but Unsupported/Contrived | Reject (confirmed absent in the code) |

### Candidate Finding And Mechanism Gate

| Candidate ID | Observation Or Mechanism | Scenario / Contract ID | Independent Trigger | Forward Path / Consequence | Evidence | Disposition | Reason / Proportionate Response |
| --- | --- | --- | --- | --- | --- | --- | --- |
| C-01 | The Project delete confirmation counts `openTaskCount` rather than the total number of Tasks. | SCN-004, REQ-008; architecture review note 1 (`P-001`) | Deleting a Project that has Tasks | In this ticket no Task can become `DONE`: there is no status mutation, and `isValidTask` accepts only the fixed statuses. So `openTaskCount` equals the total for every supported path, including landing directly on `?tab=workspaces`. | `ProjectDetail.vue` comment; the architecture review explicitly allowed this option | Reject | This is the approved option, with the required code comment. The admission ticket must revisit it; noted in Residual Risks. |
| C-02 | The list pane and the detail pane share `projectStore` `loading`/`error`. | SCN-007, REQ-016; architecture review note 2 | Selecting a Project, or a detail load failing | `fetchProject` no longer sets `loading`/`error`. `ProjectDetail` owns its own state. The list pane shows loading/error only while no Projects are loaded. | `projectStore.ts` diff; `ProjectListPane.vue` | Reject (resolved as recommended) | — |
| C-03 | Catalogue keys and doc references orphaned by removing `ProjectsList` and `ProjectCard`. | Architecture review note 3 | — | Removed. The catalogue spec asserts that no `ProjectsList.`, `ProjectCard.` or `backToProjects` keys remain, and grep finds no stale references. | Catalogue spec; grep | Reject (resolved) | — |
| C-04 | First nested route: nav active state, the gates, remounting, and refetching on a `?tab=` change. | Architecture review note 4 | — | The parent route has no parameters, so it keeps a stable key. `load` watches only `projectId` and `bindingRevision`. The existing `startsWith('/projects')` checks in the nav, the route gate and the mobile gate still match. | Code; handoff live checks | Reject | Browser confirmation belongs to API/E2E. |
| C-05 | Binding-revision request sequencing is duplicated in `projectStore` and `projectTaskStore`. | Architecture review note 5 | — | The two stores serve two subjects; the design accepted this and set a trigger to extract it if a third copy appears. The error helpers were also extracted into `projectRequestError.ts`, removing one duplicate. | Design and architecture review | Reject | Non-blocking, as approved. |
| C-06 | Dates use the browser's default locale (`toLocaleString`/`toLocaleDateString`) rather than the app's language setting: in the dialog's "Updated" line, and in a row once a Task is more than 4 weeks old. | REQ-015 (strings), AC-012 | A zh-CN app user on an OS or browser set to English | The date format follows the browser locale. All text strings are localised. | `ProjectTaskDialog.formatDateTime`; `ProjectTaskRow`; the same convention is used by most existing components (Memory, Settings cards) | Reject | REQ-015 covers strings, and the code follows the prevailing repository convention. Formatting dates by the app locale would be optional polish; noted as residual. |
| C-07 | `ProjectTaskDialog` emits `deleted`, but nobody listens. | Engineering contract | — | No consequence. | Code | Reject | Trivial. |
| C-08 | `ProjectStore` drops invalid Tasks from a row, and the next write persists without them. | Design (the normaliser filters invalid Tasks) | Only hand-editing `projects.json` can produce invalid Tasks | — | The product exposes no editing path | Reject | Technically possible but unsupported, and consistent with the approved normaliser. |
| C-09 | Switching back to the Tasks tab remounts `ProjectTasksPanel`, which calls `fetchTasks(force)` again. | SCN-002 | — | One extra small request per tab switch, with no visible flash because cached Tasks are kept while loading. | Code | Reject | Not material at the approved scale. |
| C-10 | The narrow stacked layout (below `md`) was not rendered live. | REQ-016 | A narrow window | It mirrors the Settings `flex-col md:flex-row` structure, and the left pane is capped at `max-h-[38dvh]`. | Code; the handoff states the limitation | Reject (as a defect) | The layout is structurally sound. Browser confirmation belongs to API/E2E. |

## Structural / Design Checks

| Check | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Task design health assessment present and preserved | Pass | `No Design Issue Found` for server ownership. Tasks are embedded in the Project record, and one Task service sits over the same store, as designed. | — |
| Matches behavior-defining supplemental artifacts | Pass | None define behavior. The Task delete confirmation is a mode inside `ProjectDialogFrame` instead of `ConfirmationModal`. That deviation is justified: `ConfirmationModal` has no focus trap, and REQ-015/AC-012 require keyboard operation (the same reasoning as the released package's C-01). | — |
| Data-flow spine inventory clarity and preservation | Pass | DS-001 through DS-005 each map to code. | — |
| Ownership boundary preservation | Pass | `ProjectTaskService` owns Task invariants and writes only `tasks`, keeping `updatedAt` (tested). `ProjectService` never manipulates individual Tasks. `toView` excludes `tasks`. | — |
| Off-spine concern clarity | Pass | `taskSummary`, `relativeTimeMessage`, `TASK_STATUS_LABEL_KEYS` and `projectRequestError` each serve one owner. | — |
| Existing capability/subsystem reuse | Pass | Reuses `ProjectStore`, `withProjectErrors` (now exported), `ProjectDialogFrame`, `ProjectFormDialog` and the workspace components. The new relative-time util is justified because the existing formatters are English-only. | — |
| Reusable owned structures | Pass | `projectRequestError.ts` was extracted and is shared by both stores, with no re-export shim left in `projectStore`. The summary rule lives in one place. | — |
| Shared-structure / data-model tightness | Pass | The stored Task has no title, no summary and no `projectId`. `ProjectView` omits `tasks` and adds `openTaskCount`. The GraphQL `ProjectTask` adds `projectId` for clients, as the design documents. | — |
| Repeated coordination ownership | Pass | The duplicated binding sequencing was accepted by the design (C-05). | — |
| Empty indirection | Pass | The page files are thin compositions, as designed. | — |
| Separation of concerns and file responsibility | Pass | `ProjectDetail` now holds only the header, tabs and delete. The Workspaces section moved to `ProjectWorkspacesPanel`, and the Task UI is split into panel, row and dialog. | — |
| Ownership-driven dependency | Pass | Enforced in both directions by the architecture test. Components never call Apollo. `projectTaskStore` reaches `projectStore` only through `setOpenTaskCount`. | — |
| Authoritative Boundary Rule | Pass | The resolver uses the service, the service uses the store, and `projectTaskStore` goes through the `projectStore` action. | — |
| File placement | Pass | Files sit in the existing folders plus `pages/projects.vue`, as designed. | — |
| Flat-vs-over-split layout | Pass | `components/projects/` grows by 6 files for one feature. | — |
| Interface/API boundary clarity | Pass | Every Task operation takes an explicit `projectId` plus `taskId`. There is no bare `Task` name and no status mutation. | — |
| Naming quality | Pass | `ProjectTask*`, `openTaskCount`, `setOpenTaskCount`, `taskSummary`. | — |
| No unjustified duplication | Pass | The error helpers were deduplicated. | — |
| Patch-on-patch complexity control | Pass | `ProjectDetail` was reworked cleanly rather than extended. | — |
| Dead/obsolete code cleanup | Pass | `ProjectsList`, `ProjectCard`, their spec, their catalogue keys, the Back link and the no-Task-text assertion are all removed. No stale references remain (grep). | — |
| Test scenarios and assertions clear and requirement-aligned | Pass | The server tests map to REQ and AC IDs, covering the AC-010 fixture, the cascade, `updatedAt` preservation, the QR-001 injected failure and the absence of a status mutation. The web specs cover the panel states, filters, dialog modes, validation and the delete confirmation count. | — |
| Test fixtures and structure coherent | Pass | — | — |
| No stale or compatibility-only tests | Pass | `ProjectsList.spec.ts` was removed. The released probe was adapted, not deleted. | — |
| API/E2E readiness | Pass | Stable test ids throughout (`project-list-item-*`, `project-tab-*`, `project-task-*`). The new Task browser cases are left to API/E2E, as planned. | — |

## Source File Size And Structure Audit

These are the changed implementation-source files of 150 effective lines or more, plus new files with more than 200 added lines.

| Source File | Effective Non-Empty Lines | `>500` Hard-Limit | `>220` Delta | SoC / Ownership | Placement | Classification | Required Action |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `autobyteus-web/components/projects/ProjectDetail.vue` | 245 | Pass | Pass (+101/−102) | Pass | Pass | Acceptable | — |
| `autobyteus-server-ts/src/projects/services/project-service.ts` | 222 | Pass | Pass (+12/−3) | Pass | Pass | Acceptable | — |
| `autobyteus-web/components/projects/ProjectTaskDialog.vue` | 203 | Pass | Reviewed (+224, new file) | Pass: one dialog, four modes | Pass | Acceptable | — |
| `autobyteus-web/stores/projectStore.ts` | 199 | Pass | Pass (+20/−39) | Pass | Pass | Net reduction | — |
| `autobyteus-web/stores/projectTaskStore.ts` | 179 | Pass | Pass (+200) | Pass | Pass | Acceptable | — |
| `autobyteus-web/components/projects/ProjectTasksPanel.vue` | 147 | Pass | Pass | Pass | Pass | Acceptable | — |

## Legacy / Backward-Compatibility Verdict

| Check | Result | Notes |
| --- | --- | --- |
| No backward-compatibility mechanisms in changed scope | Pass | There is no redirect shim and no card grid kept alongside the new page. |
| No legacy old-behavior retention | Pass | — |
| Dead/obsolete code cleanup completeness | Pass | — |
| Approved persisted-data transition followed | Pass | `Directly Usable — No Migration`. The version-agnostic normaliser reads a missing `tasks` as `[]`, and a read never rewrites the file (tested). |
| No version-specific dual reads/writes | Pass | — |
| Transition mechanics match the reviewed design | Pass | — |

## Dead / Obsolete / Legacy Items Requiring Removal

None.

## Docs-Impact Verdict

- Docs impact: `Yes`
- Why: a new Tasks concept, a new storage shape and the two-pane UI.
- Files likely affected (design step 10, delivery):
  - `autobyteus-web/docs/projects.md` (partly updated by the implementation: stale file references removed);
  - `autobyteus-server-ts/docs/modules/projects.md`.

## Additional Material Premise Validation

### Upstream Design-Review Material-Premise Decisions

| Premise ID | Current Status | Changed Evidence / Reason |
| --- | --- | --- |
| P-001 | Confirmed | The implementation chose `openTaskCount` with the required comment (C-01). |

No new or reclassified premises.

## Review Scorecard (Mandatory)

- Overall score (`/10`): 9.3
- Overall score (`/100`): 93

| Priority | Category | Score | Why This Score | What Is Weak / Holding It Down | What Should Improve |
| --- | --- | --- | --- | --- | --- |
| 1 | Data-Flow Spine Inventory and Clarity | 9.5 | Every spine is traceable end to end, including the URL-driven master-detail. | — | — |
| 2 | Ownership Clarity and Boundary Encapsulation | 9.5 | One owner per subject over one lock. Task writes cannot touch Project fields. Both boundary directions are enforced by a test. | — | — |
| 3 | API / Interface / Query / Command Clarity | 9.5 | Additive, explicitly identified operations with no status mutation and collision-free names. | — | — |
| 4 | Separation of Concerns and File Placement | 9.0 (round 2: unchanged) | Round 2: the board, the card and the restored grid are single-concern files, the grouping is a pure computed, and `ProjectDetail` holds only the header and tabs. | `ProjectTaskDialog` still combines four modes in about 200 lines. It is coherent for now. | Split it if the admission ticket adds more modes. |
| 5 | Shared-Structure / Data-Model Tightness | 9.5 | Tight stored model; views are separate from storage. | — | — |
| 6 | Naming Quality and Local Readability | 9.0 | Clear, commented intent, such as the delete-count comment. | The `deleted` event is emitted but unused (C-07). | — |
| 7 | API/E2E Readiness | 9.0 (round 2) | Stable test ids (`project-task-board`, `project-task-column-*`, `project-task-card-*`, `project-back-link`, `project-card-counts`). The implementation updated the probe to 26/26, including the E2E-027 width guard. | The board width guards still need independent API/E2E confirmation. The probe edits are implementation-authored and await the test-code review. | Covered downstream. |
| 8 | Runtime Correctness And Behavioral Fidelity | 9.0 (round 2) | Every changed AC path (AC-002, AC-005, AC-007, AC-011) was traced and matches the SR-008 rules. The board-width container query follows the `ARCH-REV-003` residual note (container on the block-level wrapper, not on the grid). Server behavior is unchanged. | Layout can only be verified in a browser (C-14). The delete count still depends on no status mutation existing (C-15). | Covered downstream; revisit at admission. |
| 9 | No Backward-Compatibility / No Legacy Retention | 9.5 | Clean replacement of the grid and page; no migration. | — | — |
| 10 | Cleanup Completeness | 9.5 | Components, spec, catalogue keys and docs references removed. | — | — |

## Findings

None. No candidate was promoted.

## Classification

N/A — the review passes.

## Recommended Recipient

`/api_e2e_engineer`

## Residual Risks

- **Delete-count source:** the Project delete confirmation uses `openTaskCount`. It is correct only while no status mutation exists, and the Task-admission ticket must switch to the total count (the code comment says so).
- **Date formatting:** it follows the browser locale, not the app language. This is the prevailing repository convention; formatting with the app locale is optional polish.
- **Not yet executed in a browser (API/E2E):**
  - the narrow (below `md`) stacked layout;
  - the new Task journeys: create, view, edit, delete, search, filter, the 100-Task search timing, the delete-with-count, and one-click switching.
- **Test environment:** the released `tests/e2e/projects` API-001 fails when developer-shell `ENABLE_*` variables are set, on the base as well. Run it with them unset.
- **Carried from the design:**
  - single-file lock contention once agents write status frequently, deferred to admission with a recorded trigger;
  - no description length limit, as approved.
- **Integration:** the branch is based on `e06080b00`, and delivery owns integration.

## Latest Authoritative Result

- Review Decision: `Pass` (round 2, `CRR-003`, for `IR-002` / `ae0cd4755`)
- Review Entry Point: `Implementation Review`
- Supported Product Scenario Gate: `Pass` (SR-008 scenarios; SCN-007 revised)
- Material-Premise Gate: `Pass` (`P-001` from `ARCH-REV-002`/`ARCH-REV-003` is resolved by the board-width container query)
- Score Summary: 9.3/10 (93/100). Every category is at least 9.0.
- Failure Origin: N/A
- Recommended Recipient: `/api_e2e_engineer`
- Notes:
  - Task size `Medium` and architectural risk `High` are preserved.
  - `DR-001` must not be finalized.
  - The uncommitted delivery docs edits describe the rejected two-pane UI and must be redone in delivery's docs sync (C-11).
  - API/E2E should re-verify the board journeys and width guards and the restored grid/page journeys. The rewritten probe (`tests/e2e/projects-feature-probe.mjs`) is implementation-authored in `ae0cd4755` and gets the proportional test-code review after a passing run.
