# Design Spec

## Solution And Approval Basis

- Current solution revision ID: `SR-008`. It revises `SR-007` for `ARCH-REV-002` findings `AR-001` (board layout switches on the board's own width) and `AR-002` (requirements coherence). `SR-007` revised the `SR-004` web design; the `SR-004` server design is kept unchanged.
- Approved requirements baseline: `SR-008` requirements (`SR-008` is editorial plus the "narrow" clarification; no behavior change). `APPROVAL-PROJ-TASKS-20260927-002` (2026-09-27) covers two things:
  - the direction the user fixed: the released Projects grid, a separate full-width Project page with Back at the top-left, and a three-column Task board;
  - the detailed UX, which the user delegated and then simplified with the instruction "don't make the UI complicated".
- Superseded basis: `APPROVAL-PROJ-TASKS-20260926-001` (two-pane page + list), rejected by the user in verification on 2026-09-27.
- Behavior-defining supplements: none.
- Design status: `Ready`.
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-tasks/tickets/in-progress/project-tasks/investigation-notes.md`. See "UX Analysis For SR-005/SR-006" and "Simplification".
- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-tasks` on branch `codex/project-tasks`. Base is `origin/personal@e06080b00`; the current head `a0fd103af` includes the merge of `origin/personal@fa5919da1`. Finalization target: `origin/personal`.
- Review history: `ARCH-REV-002` Fail on `SR-007` (`AR-001` Design Impact, `AR-002` requirements coherence), resolved here. `ARCH-REV-001` Pass on `SR-004`. Implementation `8d3de39a6` (server) and `e8fca7771` (web). Reviews: CRR-001 Pass, API-REV-001 Pass, CRR-002 Pass. Delivery DR-001 was **rejected by the user in verification**.

## Current-State Read

The branch already contains the reviewed `SR-004` implementation.

- **Server (kept as-is):**
  - Tasks are embedded in each row of `projects.json`, and a row without a `tasks` field reads as an empty list.
  - `ProjectTaskService` handles list, create, update-description and delete. Task writes do not change the Project's `updatedAt`.
  - `Project.openTaskCount` is exposed.
  - The GraphQL types are `ProjectTask`, `ProjectTaskStatus` and `projectTasks`, plus create/update/delete mutations. There is no status mutation.
- **Web (two-pane implementation, rejected):**
  - A parent route `pages/projects.vue` renders `ProjectListPane` (w-80), `ProjectListItem`, and a right pane.
  - `ProjectDetail` sits in a `max-w-[1100px]` container, with tabs and no Back link.
  - `ProjectTasksPanel` provides search, a status filter and a list of `ProjectTaskRow` (single-line truncate).
  - The following are kept as they are: `ProjectTaskDialog`, `ProjectWorkspacesPanel`, `projectTaskStore`, `projectStore.setOpenTaskCount`, the `taskSummary` util and the status label keys.
- **Released grid at `e06080b00`:**
  - `ProjectsList.vue`: `max-w-[1400px]` header, search and New Project, over a card grid.
  - `ProjectCard.vue`: NuxtLink card showing name, a 3-line description, and a bottom line with the workspace count.
  - `pages/projects/index.vue` renders `ProjectsList`; `pages/projects/[id].vue` renders `ProjectDetail`.
- **Measured cause of "squeezed"** (from the investigation notes): at the default 1200×800 window, the app left panel (320 px) plus the list pane (320 px) left about 560 px for Tasks.

## Task Size And Architectural Risk (Mandatory)

- Task size: `Medium`.
  - The package as a whole stays within the Projects subsystem.
  - This revision touches only the web page structure: about 12 web files are restored, removed or reworked, plus specs and the e2e probe.
- Architectural risk: `High`. This is unchanged for the package, because it still adds fields to the persisted shape and to the GraphQL contract, and it changes the released UI. The `SR-007` delta itself is web-only and low-uncertainty.
- Escalation triggers:
  - any change to the server, storage or GraphQL;
  - any need for per-column scroll or drag;
  - a need for a new shared layout component.

## Architecture Investigation Evidence

| Source | Path / Reference | Observation | Decision |
| --- | --- | --- | --- |
| Measurement | `electron` `new BrowserWindow` 1200×800; `utils/layout/responsiveLayoutPolicy.ts:19` left panel 320 px; delivered `ProjectListPane.vue` `w-80`; `ProjectDetail.vue` `max-w-[1100px]` | Tasks were left about 560 px | Full-width page with no second navigation column and no max-width cap on the Project page |
| Code | `git show e06080b00:autobyteus-web/components/projects/{ProjectsList,ProjectCard}.vue`, `pages/projects/{index,[id]}.vue` | The released grid and page routes exist verbatim at base | Restore them from `e06080b00`; the card changes only its bottom line |
| Code | delivered `components/projects/ProjectTasksPanel.vue` | Owns the search state, the status filter, the list, the dialog state and loading | Replace it with `ProjectTaskBoard.vue`: same data/loading/dialog wiring, no status filter, three columns |
| Code | delivered `ProjectTaskRow.vue` (`truncate`) | Single-line row | Replace it with `ProjectTaskCard.vue` (`line-clamp-3`, `whitespace-pre-line`) |
| Code | `components/tools/ToolCard.vue`, `components/agentTeams/AgentTeamCard.vue` | `line-clamp-*` is already used | Reuse the utility class |
| Tests | `components/projects/__tests__/{ProjectListPane,ProjectTasksPanel,ProjectDetail}.spec.ts`; `tests/e2e/projects-feature-probe.mjs` E2E-001..026 | Encode the two-pane UI | Remove, replace or adapt them (see the removal plan) |

## Intended Change

- Undo the rejected two-pane web structure.
- Restore the released Projects grid, with one merged bottom line on each card.
- Restore the separate full-width Project page with "← Projects".
- Render Tasks as a simple three-column board of cards that show only the description.
- Server, storage, GraphQL and the Task dialog stay as reviewed.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Requirement / AC | Trigger | Approved Outcome | Target Path / Spine |
| --- | --- | --- | --- | --- |
| BEH-001 | `REQ-001`–`REQ-003`, `REQ-005`–`REQ-007`, `REQ-014`, `REQ-015`; `AC-001`–`AC-005`, `AC-012` | Project page › Tasks tab | Three-column board; description-only cards; search; New task; dialog view/edit/delete | `DS-001`, `DS-002` |
| BEH-002 | `REQ-008`; `AC-006` | Project page › Delete | Cascade delete, with the Task count in the confirmation (unchanged) | `DS-003` |
| BEH-003 | `REQ-010`; `AC-008` | Flag | Unchanged | existing gate |
| BEH-004 | `REQ-009`, `REQ-016`; `AC-007`, `AC-011` | `/projects`, card click, "← Projects" | Released grid with "N open tasks · N workspaces"; full-width Project page; Back | `DS-004` |
| BEH-005 | `REQ-012`; `AC-009` | Delegated tasks | Untouched | — |
| BEH-006 | `REQ-001` | — | Task model (unchanged) | `DS-001` |

## Relevant Supplemental Task Artifacts

None. The released predecessor `tickets/done/projects-concept-introduction/` is context only.

## Task Design Health Assessment (Mandatory)

- Change posture: `Behavior Change`. The approved UI was revised after user verification.
- Current design issue found: `Yes`, in the rejected web layout.
- Root cause classification: `No Design Issue Found` in ownership. The root cause is a layout decision, a nested navigation column that consumed the width. The approved behavior itself changed; this is not a structural defect.
- Refactor needed now: `No`. This is a clean-cut replacement of the rejected components with the released ones plus the board.
- Evidence: the width measurements above. The store, service and dialog ownership reviewed in `ARCH-REV-001` still fits.
- Design response: remove the two-pane components, restore the released pages, and add the board and card components.
- Deferrals: none.

## Terminology

- **Board**: three equal columns, To Do, In Progress and Done, derived from `ProjectTask.status`.
- **Card**: a button showing the Task description clamped to 3 lines.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- The rejected two-pane components are removed, not hidden. The released components are restored as the only Projects index.

## Persisted Data / State Transition Decision (Mandatory)

- Decision: `Directly Usable — No Migration`. This is unchanged from `SR-004`.
- Tasks are embedded in `projects.json` rows, and a missing `tasks` field reads as an empty list.
- `SR-007` makes no persistence change.

## Data-Flow Spine Inventory

| Spine ID | Scope | Behavior IDs | Start | End | Governing Owner | Why |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary | `BEH-001`, `BEH-006` | Task dialog create/edit/delete | `projects.json` updated; board and count refresh | `ProjectTaskService` / `projectTaskStore` | Task writes (unchanged) |
| DS-002 | Primary | `BEH-001` | Project page Tasks tab | Board rendered: grouped, sorted, searched | `ProjectTaskBoard` / `projectTaskStore` | Viewing |
| DS-003 | Primary | `BEH-002` | Project page Delete | Project and Tasks gone; navigate to `/projects` | `ProjectService` (unchanged) | Cascade |
| DS-004 | Primary | `BEH-004` | `/projects` → card → `/projects/<id>` → "← Projects" | Grid ↔ full-width Project page | route pages, `ProjectsList`, `ProjectDetail` | Navigation |
| DS-005 | Bounded local | `BEH-001` | Search text change | Visible cards per column | `ProjectTaskBoard` (computed) | Client filter |

## Primary Execution Spine(s)

- `DS-002`: `pages/projects/[id].vue -> ProjectDetail (Tasks tab, default) -> ProjectTaskBoard -> projectTaskStore.fetchTasks(projectId) -> projectTasks query -> ProjectTaskService.listTasks -> ProjectTask[] (updatedAt desc) -> computed: filter by search -> group by status into TODO | IN_PROGRESS | DONE -> ProjectTaskCard[] per column`.
- `DS-004`: `/projects -> pages/projects/index.vue -> ProjectsList -> ProjectCard (NuxtLink) -> /projects/<id> -> pages/projects/[id].vue -> ProjectDetail -> "← Projects" NuxtLink -> /projects`.
- `DS-001` and `DS-003`: unchanged from `SR-004`, except that the Task dialog is opened from `ProjectTaskBoard` instead of `ProjectTasksPanel`.

## Spine Narratives (Mandatory)

| Spine | Narrative | Owner |
| --- | --- | --- |
| DS-002 | The board loads the Project's Tasks through the existing store, applies the search to all Tasks, and splits them into three columns in fixed order. Each column shows its name and filtered count and lists cards newest-updated first. An empty column shows a muted "No tasks". If search matches nothing in any column, one message with "Clear search" replaces the columns. | `ProjectTaskBoard` |
| DS-004 | This is the released navigation. The grid is the index, a card opens the full-width Project page, and "← Projects" returns to the grid. There is no persistent second pane. | route pages |

## Spine Actors / Main-Line Nodes

Web: `pages/projects/index.vue`, `ProjectsList`, `ProjectCard`, `pages/projects/[id].vue`, `ProjectDetail`, `ProjectTaskBoard`, `ProjectTaskCard`, `ProjectTaskDialog`, `projectTaskStore`, `projectStore`.

Server: unchanged from `SR-004`.

## Ownership Map

- `ProjectsList` (restored released): index header, search, New Project, grid, and states.
- `ProjectCard` (restored released, one change): its bottom line is "N open tasks · N workspaces", from `project.openTaskCount` and `project.workspaces.length`, localised with singular/plural forms.
- `ProjectDetail` (reworked):
  - full-width container (padding only, no max-width);
  - "← Projects" NuxtLink at the top-left;
  - header with name, description (`line-clamp-2`), Edit and Delete (the delete confirmation keeps the Task count);
  - plain tabs **Tasks** (default) and **Workspaces** via `?tab=workspaces`;
  - not-found and error states with "← Projects".
- `ProjectTaskBoard` (new):
  - a toolbar row with search and "+ New task";
  - a three-column grid, with a heading "Label  count" per column. Whether the columns sit side by side is decided by the **board's own width**, not the viewport: the board wrapper is a CSS container (`container-type: inline-size; container-name: project-task-board`), the columns default to one stacked column, and a scoped `@container project-task-board (min-width: 752px)` rule switches to `repeat(3, minmax(0, 1fr))`. 752 px = 3 × 240 px minimum column + 2 × 16 px gap. This follows the existing plain-CSS `@container` use in `components/settings/providerApiKey/GeminiConfigurationOptionCard.vue`; the Tailwind container-query plugin is not installed and is not added;
  - cards, the muted "No tasks" empty state and the global no-match state;
  - loading and error states with retry;
  - it owns the Task dialog open state.
- `ProjectTaskCard` (new): a `<button>` showing the description with `line-clamp-3 whitespace-pre-line break-words`, with an accessible name taken from the summary (`taskSummary`). It emits `open`.
- `ProjectTaskDialog`, `ProjectWorkspacesPanel`, `projectTaskStore`, `projectStore`, `taskSummary`, and the server: unchanged ownership from `SR-004`.

## Thin Entry Facades / Public Wrappers

`pages/projects/index.vue` and `pages/projects/[id].vue` are route composition only.

## Removal / Decommission Plan (Mandatory)

| Item | Why | Replaced By | Scope |
| --- | --- | --- | --- |
| `autobyteus-web/pages/projects.vue` (parent two-pane route) | Two-pane rejected | Flat routes `pages/projects/index.vue`, `[id].vue` (restored) | In This Change |
| `components/projects/ProjectListPane.vue`, `ProjectListItem.vue`, `__tests__/ProjectListPane.spec.ts` | Two-pane rejected | `ProjectsList.vue`, `ProjectCard.vue` (restored from `e06080b00`) + restored `ProjectsList.spec.ts` updated for the count line | In This Change |
| `components/projects/ProjectTasksPanel.vue`, `__tests__/ProjectTasksPanel.spec.ts` | List and status filter replaced by the board | `ProjectTaskBoard.vue` + `ProjectTaskBoard.spec.ts` | In This Change |
| `components/projects/ProjectTaskRow.vue` | Single-line row replaced | `ProjectTaskCard.vue` | In This Change |
| Status-filter state, UI and i18n keys; list-pane and row i18n keys | No longer used | — | In This Change (both locales) |
| `max-w-[1100px]` wrapper in `ProjectDetail.vue` | Caused wasted width on the board | Full-width padding container | In This Change |
| Two-pane cases in `tests/e2e/projects-feature-probe.mjs` | UI changed | Released grid and page cases (E2E-001..013 restored to the v1.4.86 journeys) + board cases | In This Change |

## Return Or Event Spine(s)

N/A.

## Bounded Local / Internal Spines

`ProjectTaskBoard` computes the view: loaded tasks, which are already `updatedAt` desc, are filtered by the search (case-insensitive substring of the description) and then split by status. The result is `{ TODO: [], IN_PROGRESS: [], DONE: [] }`, which gives the column cards and counts. It is a pure computation with no requests.

## Off-Spine Concerns Around The Spine

| Concern | Serves | Responsibility |
| --- | --- | --- |
| `utils/projects/taskSummary.ts` (existing) | Card accessible name; dialog | First non-empty line |
| `utils/projects/taskStatusLabelKey.ts` (existing) | Column headings | Localised status names |
| i18n `projects.ts` (en, zh-CN) | All labels | New keys: board toolbar, "No tasks", no-match + clear, card count line with singular/plural forms, "← Projects". Unused keys removed |

## Ownership Boundaries

Unchanged from `SR-004`. Components never call Apollo, and `projectTaskStore` is the only owner of Task requests.

## Boundary Encapsulation Map

Unchanged from `SR-004`. One component changes: `ProjectTaskBoard` takes over from `ProjectTasksPanel` as a consumer of `projectTaskStore`.

## Dependency Rules

- Allowed:
  - `pages/projects/*` → `components/projects/*`;
  - `ProjectDetail` → `ProjectTaskBoard`, `ProjectWorkspacesPanel`;
  - `ProjectTaskBoard` → `ProjectTaskCard`, `ProjectTaskDialog`, `projectTaskStore`, `utils/projects/*`;
  - `ProjectCard` → `types/project`, i18n.
- Forbidden:
  - any reintroduction of a persistent list pane or nested Projects route;
  - Project components importing delegated-task UI.

## Interface Boundary Mapping

- No server or GraphQL changes. The `SR-004` interface mapping stands: `projectTasks`, `createProjectTask`, `updateProjectTask`, `deleteProjectTask`, `Project.openTaskCount`, and no status mutation.
- Web component props:
  - `ProjectTaskBoard { projectId: string }`;
  - `ProjectTaskCard { task: ProjectTask }`, emitting `open`;
  - `ProjectCard { project: Project }`.

## Interface Boundary Check

| Interface | Singular | Identity explicit | Risk |
| --- | --- | --- | --- |
| `ProjectTaskBoard` | Yes | `projectId` | Low |
| `ProjectTaskCard` | Yes | `task` | Low |

## Main Domain Subject Naming Check

Names match their concerns: `ProjectTaskBoard` and `ProjectTaskCard`. There is no bare `Task*` naming, which keeps them distinct from delegated tasks.

## Existing Capability / Subsystem Reuse Check

| Need | Existing | Decision |
| --- | --- | --- |
| Projects index | Released `ProjectsList`/`ProjectCard` at `e06080b00` | Restore |
| Project page route | Released `pages/projects/[id].vue` | Restore |
| Task data | `projectTaskStore` | Reuse |
| Task dialog | `ProjectTaskDialog` | Reuse |
| Workspaces tab | `ProjectWorkspacesPanel` | Reuse |
| Text clamp | Tailwind `line-clamp-*` (already used) | Reuse |
| Width-responsive columns | Plain CSS `@container` (as in `GeminiConfigurationOptionCard.vue`) | Reuse the pattern (no new plugin) |

## Subsystem / Capability-Area Allocation

All changes are in web `components/projects/`, `pages/projects/`, `localization/messages/*/projects.ts`, the specs and the e2e probe. The server has no change.

## Draft File Responsibility Mapping

Drafted, then tightened. The board owns grouping and search. The card is presentational only. The count line lives in the card rather than in a shared util, because it is used in exactly one place.

## Reusable Owned Structures Check

None new. The existing `taskSummary` and `taskStatusLabelKey` are reused.

## Shared Structure / Data Model Tightness Check

No model changes. The view state `{ TODO, IN_PROGRESS, DONE }` is local and computed.

## Final File Responsibility Mapping

| File | Action | Concern |
| --- | --- | --- |
| `autobyteus-web/pages/projects.vue` | Remove | Rejected parent route |
| `autobyteus-web/pages/projects/index.vue` | Restore from `e06080b00` | Renders `ProjectsList` |
| `autobyteus-web/pages/projects/[id].vue` | Restore from `e06080b00` (full-height scroll container) | Renders `ProjectDetail` |
| `autobyteus-web/components/projects/ProjectsList.vue` | Restore from `e06080b00` | Released index |
| `autobyteus-web/components/projects/ProjectCard.vue` | Restore + change the bottom line | "N open tasks · N workspaces" |
| `autobyteus-web/components/projects/ProjectListPane.vue`, `ProjectListItem.vue` | Remove | — |
| `autobyteus-web/components/projects/ProjectDetail.vue` | Rework | Full width; "← Projects"; header; plain tabs; board/workspaces |
| `autobyteus-web/components/projects/ProjectTaskBoard.vue` | New (replaces `ProjectTasksPanel.vue`) | Toolbar; columns laid out by a board-width container query (752 px threshold); states; dialog wiring |
| `autobyteus-web/components/projects/ProjectTaskCard.vue` | New (replaces `ProjectTaskRow.vue`) | Description-only card button |
| `autobyteus-web/components/projects/ProjectTasksPanel.vue`, `ProjectTaskRow.vue` | Remove | — |
| `autobyteus-web/components/projects/ProjectTaskDialog.vue`, `ProjectWorkspacesPanel.vue` | Keep | — |
| `autobyteus-web/localization/messages/{en,zh-CN}/projects.ts` | Update | Add board, card-count and back keys; remove list-pane, filter and row keys |
| `autobyteus-web/components/projects/__tests__/` | Update | Remove `ProjectListPane.spec.ts` and `ProjectTasksPanel.spec.ts`. Restore and update `ProjectsList.spec.ts`. Add `ProjectTaskBoard.spec.ts` and `ProjectTaskCard.spec.ts`. Update `ProjectDetail.spec.ts` for the Back link, full width and tabs |
| `autobyteus-web/tests/e2e/projects-feature-probe.mjs` | Update | Released grid/page cases; board cases (see sequence) |
| `autobyteus-web/docs/projects.md` | Docs sync (delivery) | Describe the grid → page → board |

## Applied Patterns

List → detail pages (the released pattern) and a simple computed kanban grouping.

## Target Subsystem / Folder / File Mapping

Existing folders only: `pages/projects/`, `components/projects/`, `localization/messages/*/`. Removing `pages/projects.vue` leaves no nested route.

## Folder Boundary Check

| Folder | Clear | Risk |
| --- | --- | --- |
| `components/projects/` | Yes | Low (net −1 file) |

## Concrete Examples / Shape Guidance

| Topic | Good | Avoided |
| --- | --- | --- |
| Project card bottom line | `4 open tasks · 2 workspaces`; `1 open task · No workspaces`; `No open tasks · 1 workspace` | A second footer line, badges, coloured dots |
| Project page top | `← Projects` / **AutoByteus** `[Edit] [Delete]` / two-line description / `Tasks   Workspaces` | Breadcrumb trails, a counts-in-tabs toolbar merged with the tabs |
| Board | `[🔍 Search tasks          ] [+ New task]`, then three equal columns `To Do  3` \| `In Progress  0` \| `Done  0`. Cards show only text. Empty columns show a muted `No tasks` | Status labels on cards, timestamps, per-column scrollbars, drag handles, explanatory banners |
| Layout classes | Board wrapper `container-type: inline-size; container-name: project-task-board`; columns `display: grid; gap: 1rem; grid-template-columns: 1fr`, and `@container project-task-board (min-width: 752px) { grid-template-columns: repeat(3, minmax(0, 1fr)) }` (scoped CSS); card `line-clamp-3 whitespace-pre-line break-words` | Viewport breakpoints such as `md:grid-cols-3` (three columns stay on when the side panel is widened or the window is small, `ARCH-REV-002` `P-001`); fixed-width columns with horizontal scroll; a `max-w` wrapper around the board |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate | Decision | Replacement |
| --- | --- | --- |
| Keep the two-pane route behind a toggle | Rejected | Remove it |
| Keep the list view as an alternative to the board | Rejected | Board only |

## Derived Layering

Pages → components → stores (unchanged).

## Change / Refactor Sequence

1. Remove `pages/projects.vue`. Restore `pages/projects/index.vue`, `[id].vue`, `ProjectsList.vue`, `ProjectCard.vue` and `ProjectsList.spec.ts` from `e06080b00`. Change the card's bottom line and its spec.
2. Remove `ProjectListPane.vue`, `ProjectListItem.vue` and their spec.
3. Rework `ProjectDetail.vue`: full width, "← Projects", `line-clamp-2` description, plain tabs, `ProjectTaskBoard` on the Tasks tab. Update its spec: Back link present; no Task text on the Workspaces tab; Tasks is the default tab.
4. Add `ProjectTaskCard.vue` and `ProjectTaskBoard.vue`, with specs covering:
   - three columns in order;
   - counts;
   - newest first;
   - search filtering and updated counts;
   - no-match with clear;
   - "No tasks" empty columns;
   - card opens the dialog;
   - no drag or move affordances;
   - keyboard activation.
   Remove `ProjectTasksPanel.vue`, `ProjectTaskRow.vue` and the panel spec.
5. Localisation: add and remove keys in `en` and `zh-CN`; pass `guard:localization-boundary` and `audit:localization-literals`.
6. E2E probe:
   - Restore the v1.4.86 grid and page journeys: create a project from the grid, open a card, "← Projects" returns, a deep link opens the page.
   - Add these board checks:
     - create a Task, which lands in To Do (count 1);
     - edit it and delete it;
     - search across columns;
     - the card count line updates after returning to the grid;
     - deleting a Project states the Task count;
     - flag off/on;
     - at 1200×800 with the default left panel, the three columns sit side by side and are each ≥ 240 px wide, and the Task description shows up to 3 lines (non-squeezed guard);
     - reduced width: at 1200×800 with the left panel dragged to its 520 px maximum, and separately at a 1000×800 window, every column is either ≥ 240 px wide or the columns are stacked (never side by side below 240 px);
     - at a narrow window, the columns stack.
7. Docs sync (delivery).

## Key Tradeoffs

- **Page scroll instead of per-column scroll.** Simpler, as the user requested. With very long To Do lists the header scrolls away, which is acceptable at the approved scale.
- **Board with two columns empty until task admission.** The user accepted this explicitly.

## Risks

- Test churn from restoring the released specs and probe cases. This is mitigated by restoring them from `e06080b00` rather than rewriting them.
- The width guards in the probe must use the real app shell: the default left panel, the panel at its 520 px maximum, and a 1000 px window.
- `@container` support: Chromium in Electron supports CSS container queries natively, and the repo already uses them.

## Guidance For Implementation

- Restore the released files with `git show e06080b00:<path>`, then change only what this spec says.
- No status labels, timestamps, icons or drag on cards. No per-column scroll. No `max-w` on the Project page or the board. No viewport breakpoint for the column switch; use the board container query only.
- Keep all existing Workspaces-tab test ids and the Task dialog behavior.
- The server, storage and GraphQL must not change. If a change seems necessary, return a `Design Impact`.
