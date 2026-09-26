# Design Spec

## Solution And Approval Basis

- Current solution revision ID: `SR-004`
- Approved requirements baseline: `SR-003` — `REQ-001`–`REQ-016` (`REQ-004` withdrawn), `AC-001`–`AC-012`, `SCN-001`–`SCN-008` (`SCN-X01` rejected); `DEC-012` = B (two-pane page), `DEC-013` = list. Approval `APPROVAL-PROJ-TASKS-20260926-001` (user, 2026-09-26).
- Behavior-defining supplements: none
- Design status: `Ready`
- Canonical investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-tasks/tickets/in-progress/project-tasks/investigation-notes.md`
- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-tasks`, branch `codex/project-tasks`, base `origin/personal@e06080b0027636cecf20b5e437c496d423c7f26b`, finalization target `origin/personal`

## Current-State Read

- Server `src/projects/` (released v1.4.86) is structured as follows:
  - `ProjectStore` does locked, atomic read-modify-write of `<appDataDir>/projects/projects.json`, a JSON array of `Project` records. The row validator drops rows lacking a `workspaces` array.
  - `ProjectService` owns Project invariants. `updateProjectRecord` bumps `updatedAt` on any change. `deleteProject` removes the record. `toView` resolves workspace availability.
  - `ProjectResolver` maps `ProjectError.code` into `extensions.code`.
- Web:
  - `pages/projects/index.vue` renders `ProjectsList` (card grid with search, New Project, `ProjectCard`).
  - `pages/projects/[id].vue` renders `ProjectDetail` (Back link, header, Edit/Delete, Workspaces section, dialogs). Deleting there navigates to `/projects`.
  - `projectStore` caches `Project[]` per bound node and owns requests.
  - No Nuxt nested routes exist: `app.vue` is the only `<NuxtPage>` host.
- The two-pane precedent is Settings: `pages/settings.vue` is `flex-col md:flex-row`, with a left navigation that stacks above the content on narrow widths.
- The released test `ProjectDetail.spec.ts:81` asserts that no "task" text appears. That is superseded by `REQ-011`.
- Delegated-task GraphQL types are `TaskDelegation*`. No `ProjectTask*` name exists.

## Task Size And Architectural Risk (Mandatory)

- Task size: `Medium`
- Size rationale: The work stays inside the existing Projects subsystem on server and web.
  - Server: a model extension, one new service, additive GraphQL, and a store-normaliser change.
  - Web: the page structure is reorganised into a parent route with two children. There are about 7 new or reworked components; 2 released components are removed. There is one new store, plus i18n, unit specs and an update to the e2e probe.
  - About 25 files. No new subsystem and no cross-subsystem refactor.
- Architectural risk: `High`
- Risk rationale:
  - The persisted shape of the released `projects.json` changes (additive `tasks` array).
  - The GraphQL contract gains `ProjectTask` operations and `Project.openTaskCount`.
  - Released UI behavior is replaced: the card grid and separate Project page become the two-pane page.
  - Existing data is `Directly Usable — No Migration`, but the change touches persisted data and a released contract.
- Escalation triggers:
  - any need to migrate or rewrite existing `projects.json` rows;
  - any change to delegated-task code;
  - a need for a user-facing status mutation;
  - evidence that one file cannot meet `QR-002`/`REQ-014` at the approved scale.

## Architecture Investigation Evidence

| Source | Path / Reference | Observation | Design Decision Supported | Uncertainty |
| --- | --- | --- | --- | --- |
| Code | `autobyteus-server-ts/src/projects/stores/project-store.ts` | Locked `updateJsonArrayFile`; `isValidProject` requires `workspaces` array; `normalizeRecords` filters links | Embed Tasks; normaliser defaults a missing `tasks` to `[]` and filters invalid tasks | None |
| Code | `autobyteus-server-ts/src/projects/services/project-service.ts` (`updateProjectRecord`, `deleteProject`, `toView`) | All Project writes go through one locked updater; delete filters the record | Cascade is inherent once Tasks are embedded; Task writes use the same lock | None |
| Code | `autobyteus-server-ts/src/api/graphql/types/projects.ts` | `Project` type; error mapping helper | Add `openTaskCount`; add a Task resolver in the same file family | None |
| `grep` | `src/api/graphql/types/*.ts` for Task/Status type and enum names | Only `TaskDelegation*`; no `ProjectTask*` | Names `ProjectTask`, `ProjectTaskStatus`, `projectTasks` are collision-free (`REQ-012`) | None |
| Code | `autobyteus-web/pages/projects/*.vue`, `components/projects/*` | Grid page + detail page; `ProjectsList`/`ProjectCard` used only by `pages/projects/index.vue`, their spec, and the e2e probe | Replace with a parent route and two panes; remove the grid components | None |
| Code | `autobyteus-web/pages/settings.vue` | Two-pane `md:flex-row`, stacks on narrow | Mirror its responsive structure (non-resizable left pane) | None |
| Code | `autobyteus-web/app.vue` | Only `<NuxtPage>` host | A new `pages/projects.vue` parent with `<NuxtPage>` keeps the left pane mounted | Nested-route precedent absent; standard Nuxt feature |
| Test | `components/projects/__tests__/ProjectDetail.spec.ts:81`; `ProjectsList.spec.ts`; `tests/e2e/projects-feature-probe.mjs` | Enforce released UI | Update or replace | None |
| User | Storage conversation (2026-09-26) | Prefers files like other stores | JSON file, no SQLite | None |

## Intended Change

Add description-only Project Tasks, embedded in each Project record in `projects.json`, with a fixed status (`TODO`, `IN_PROGRESS`, `DONE`). In this ticket the status is only ever set to `TODO` on creation.

- The server exposes Task list/create/update-description/delete operations and a computed `openTaskCount` on `Project`. There is no status mutation.
- The web replaces the released grid and detail pages with one two-pane Projects page: a Project list pane, and the selected Project with Tasks (default) and Workspaces tabs.
- The Tasks tab is a searchable, filterable list; Tasks open in a dialog.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Requirement / AC IDs | Trigger | Existing Behavior / Evidence | Approved Change / Preserved Outcome | Target Path / Spine |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | `REQ-001`–`REQ-003`, `REQ-005`–`REQ-007`, `REQ-014`, `REQ-015`; `AC-001`–`AC-005`, `AC-012` | Right pane › Tasks | No Tasks | Create, view, edit description, delete, search, filter | `DS-001`, `DS-002` |
| BEH-002 | User | `REQ-008`; `AC-006` | Right pane › Delete | Record-only delete | Cascade to embedded Tasks; the confirmation shows the count | `DS-003` |
| BEH-003 | User/Operational | `REQ-010`; `AC-008` | Flag | Visibility switch | Unchanged; Task routes live under `/projects*` and are gated by the existing middleware | Existing gate |
| BEH-004 | User | `REQ-009`, `REQ-016`; `AC-007`, `AC-011` | Projects module | Grid → page → Back | Two-pane page; counts in the list pane | `DS-004` |
| BEH-005 | Contract | `REQ-012`; `AC-009` | Delegated tasks | Separate subsystem | Untouched; distinct names | — |
| BEH-006 | User | `REQ-001` | — | None | New Task model | `DS-001` |

## Relevant Supplemental Task Artifacts

| Artifact | Purpose | Related IDs | Relationship | Status |
| --- | --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/project-tasks/tickets/done/projects-concept-introduction/design-spec.md` | Released Projects design | — | This design extends its subsystem and supersedes its web page structure | Done |

## Task Design Health Assessment (Mandatory)

- Change posture: `Feature` (plus a `Behavior Change` of the released Projects UI)
- Current design issue found: `No`
- Root cause classification: `No Design Issue Found`
- Refactor needed now: `No` for server ownership. The web page structure is replaced as part of the approved behavior change, not as a health refactor.
- Evidence:
  - `ProjectStore` and `ProjectService` already give one locked write path for the Project aggregate.
  - Tasks are part of that aggregate: they are deleted with it and cannot exist without it.
  - A separate `ProjectTaskService` owns Task invariants without growing `ProjectService` into a mixed-subject class.
- Design response: extend the aggregate record and add one Task service over the same store.
- Intentional deferrals and residual risk: single-file write amplification once agents update status frequently (the future admission ticket). The trigger is recorded under Risks.

## Terminology

- **Project Task**: `{ taskId, description, status, createdAt, updatedAt }` stored in `Project.tasks`.
- **Summary**: the first non-empty line of `description`. It is computed on the client for display and never stored.
- **Open Task**: status ≠ `DONE`. `openTaskCount` is computed on the server at read time.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Removed in scope:
  - `ProjectsList.vue` and `ProjectCard.vue`, with their spec;
  - the Back link and page-level layout in `ProjectDetail.vue`;
  - the "no task text" assertion.
- No compatibility wrappers. No redirect from old URLs is needed: `/projects` and `/projects/<id>` keep their meaning.

## Persisted Data / State Transition Decision (Mandatory)

- Stored subject: `<appDataDir>/projects/projects.json` (JSON array of Projects; the user's node has 1 Project today).
- Change: each Project gains `tasks: ProjectTask[]` (additive).
- Reader and writer behavior:
  - `ProjectStore.normalizeRecords` projects each valid row into the current model: `tasks` becomes `Array.isArray(row.tasks) ? row.tasks.filter(isValidTask) : []`.
  - Every write persists the normalised record, so `tasks` is present after the first write to that Project.
- Semantics and invariants under direct use: a released row with no `tasks` field means "no Tasks", which is exactly its meaning. Workspaces and all other fields are unchanged.
- Decision: `Directly Usable — No Migration`.
- Rationale:
  - The normal version-agnostic reader reads released rows correctly.
  - Absence of the collection is semantically an empty collection. It is not an old-version branch, and it is identical to how malformed links are already filtered.
  - A migration would rewrite user data for no benefit.
- Supports: `REQ-013`, `AC-010`, `QR-001`.

## Data-Flow Spine Inventory

| Spine ID | Scope | Behavior IDs | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary | `BEH-001`, `BEH-006` | Task dialog submit (create/edit) or delete confirm | `projects.json` updated; list and count refreshed | `ProjectTaskService` / `projectTaskStore` | Core Task writes |
| DS-002 | Primary | `BEH-001` | Select Project / open Tasks tab | Filtered, searched list rendered | `ProjectTaskService.listTasks` / `projectTaskStore` | Viewing, search, filter |
| DS-003 | Primary | `BEH-002` | Project Delete confirm (with count) | Project and embedded Tasks gone | `ProjectService.deleteProject` | Atomic cascade |
| DS-004 | Primary | `BEH-004` | `/projects` or `/projects/<id>` navigation, or a list-pane click | Left pane persistent; right pane shows the selection | `pages/projects.vue` + `ProjectListPane` + `projectStore` | One-click switching |
| DS-005 | Bounded local | `BEH-001` | Search text / status filter change | Visible rows | `ProjectTasksPanel` (computed) | Client filtering (`QR-002`) |

## Primary Execution Spine(s)

- `DS-001`: `ProjectTaskDialog -> projectTaskStore.create|updateDescription|delete -> ProjectTaskResolver -> ProjectTaskService (validate description, id, timestamps, under lock) -> ProjectStore.updateRecords -> projects.json`, returning a `ProjectTask`. `projectTaskStore` updates its list, then calls `projectStore.setOpenTaskCount(projectId, n)`.
- `DS-002`: `pages/projects/[id].vue -> ProjectDetail(Tasks tab) -> ProjectTasksPanel -> projectTaskStore.fetchTasks(projectId) -> projectTasks(projectId) -> ProjectTaskService.listTasks -> ProjectStore.listRecords -> sorted ProjectTask[] -> rows (summary computed client-side)`.
- `DS-003`: `ProjectDetail Delete -> ConfirmationModal("…and its N tasks") -> projectStore.deleteProject -> deleteProject mutation -> ProjectService.deleteProject (record filter under lock; tasks go with it) -> projectStore removes entry + projectTaskStore.forget(projectId) -> navigateTo('/projects')`.
- `DS-004`: `route /projects[/:id] -> pages/projects.vue (ProjectListPane + <NuxtPage>) -> child index.vue (SelectPrompt) | [id].vue (ProjectDetail)`. A list-pane click is a `NuxtLink` to `/projects/<id>`; the parent and left pane stay mounted.

## Spine Narratives (Mandatory)

| Spine ID | Narrative | Main Nodes | Owner | Off-Spine |
| --- | --- | --- | --- | --- |
| DS-001 | The dialog sends only the description. The server trims it and requires it to be non-empty. Inside the locked updater it finds the Project and appends or edits or removes the Task, setting timestamps and status `TODO` on create. Task writes do not change the Project's `updatedAt`. The store updates its per-Project list and pushes the new open count to `projectStore`. | Project Task | `ProjectTaskService` | Error codes; i18n |
| DS-002 | Tasks for one Project load on demand and are sorted by `updatedAt` desc. Search (case-insensitive substring of the description) and the status filter are computed client-side over the loaded list. | Project Task list | `projectTaskStore`, `ProjectTasksPanel` | Summary util |
| DS-003 | The confirmation reads `openTaskCount` and total Task count from the loaded data. Because Tasks are embedded, the existing single-record delete removes them atomically. | Project | `ProjectService` | — |
| DS-004 | A parent route renders the list pane once. Child routes swap the right pane. Selection is URL-driven, so deep links and browser back work. | Project selection | route + `ProjectListPane` | Responsive stacking |

## Spine Actors / Main-Line Nodes

Server: `ProjectTaskResolver`, `ProjectTaskService`, `ProjectService`, `ProjectStore`. Web: `pages/projects.vue`, `ProjectListPane`, `ProjectDetail`, `ProjectTasksPanel`, `ProjectTaskDialog`, `projectTaskStore`, `projectStore`.

## Ownership Map

- `ProjectTaskService` (new, governing owner of Task invariants):
  - description normalisation and requirement;
  - `taskId` = `project_task_<uuid>`;
  - timestamps and initial status `TODO`;
  - listing order;
  - `TASK_NOT_FOUND` and `TASK_DESCRIPTION_REQUIRED` errors.
  - It writes only through `ProjectStore.updateRecords` and never changes non-Task fields of a Project.
- `ProjectService` (extended):
  - `createProject` initialises `tasks: []`;
  - `toView` computes `openTaskCount` and excludes `tasks` from `ProjectView`;
  - all other methods preserve `tasks` by spreading the record;
  - `deleteProject` is unchanged (the cascade is inherent).
- `ProjectStore` (extended): its normaliser covers `tasks`. Still persistence only.
- `ProjectTaskResolver` (new): thin transport over `ProjectTaskService`; reuses the `withProjectErrors` mapping.
- `projectTaskStore` (web, new):
  - per-Project Task lists keyed by `projectId`;
  - request sequencing and binding-revision invalidation, mirroring `projectStore`;
  - `forget(projectId)`;
  - after each successful write it pushes `openTaskCount` to `projectStore` via one explicit action.
- `projectStore` (web, extended): `Project.openTaskCount`; new action `setOpenTaskCount(projectId, count)`.
- `pages/projects.vue` (web, new parent route): the two-pane shell; owns responsive layout only.
- `ProjectListPane` (web, new): search, New Project, list items with counts, selection highlight. It owns the create-Project dialog trigger, which moves here from the removed `ProjectsList`.
- `ProjectDetail` (web, reworked): header (name, description, Edit, Delete) and tabs. Workspaces content moves into `ProjectWorkspacesPanel` unchanged.
- `ProjectTasksPanel` (web, new): toolbar (search, status filter, New Task), list, empty, no-match, loading and error states, and client filtering.
- `ProjectTaskDialog` (web, new): modes `create`, `view`, `edit`; delete through `ConfirmationModal`.

## Thin Entry Facades / Public Wrappers

| Facade | Governing Owner | Why | Must Not Own |
| --- | --- | --- | --- |
| `ProjectTaskResolver` | `ProjectTaskService` | GraphQL transport | Validation, ordering |
| `pages/projects/index.vue`, `[id].vue` | route composition | Child routes | Data fetching logic beyond passing `projectId` |

## Removal / Decommission Plan (Mandatory)

| Item | Why Unnecessary | Replaced By | Scope | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-web/components/projects/ProjectsList.vue` | Grid replaced by list pane (`REQ-016`) | `ProjectListPane.vue`, `ProjectListItem.vue` | In This Change | Create-Project dialog trigger moves to the pane |
| `autobyteus-web/components/projects/ProjectCard.vue` | Cards removed | `ProjectListItem.vue` | In This Change | — |
| `autobyteus-web/components/projects/__tests__/ProjectsList.spec.ts` | Component removed | `ProjectListPane.spec.ts` | In This Change | — |
| Back link and page wrapper in `ProjectDetail.vue` | Two-pane selection replaces them | `pages/projects.vue` | In This Change | — |
| Workspaces section markup inside `ProjectDetail.vue` | Moved into a tab | `ProjectWorkspacesPanel.vue` | In This Change | Behavior unchanged; existing test ids kept |
| `ProjectDetail.spec.ts:81` "no task text" assertion | `REQ-011` supersedes released `AC-012` | Task assertions in the new specs | In This Change | — |
| Grid/detail journeys in `tests/e2e/projects-feature-probe.mjs` | UI changed | Updated probe cases | In This Change | Keep the released AC coverage, adapted to the two panes |

## Return Or Event Spine(s)

N/A — request/response only.

## Bounded Local / Internal Spines

- `ProjectTasksPanel`: `loaded tasks -> status filter -> search match (description, case-insensitive) -> sort updatedAt desc -> rows`. Pure computed; no requests.

## Off-Spine Concerns Around The Spine

| Concern | Spines | Serves | Responsibility | Why | Risk If Misplaced |
| --- | --- | --- | --- | --- | --- |
| Summary extraction | DS-002 | rows, dialog title | `utils/projects/taskSummary.ts`: `taskSummary(description)` returns the first non-empty trimmed line | One rule, reused | Divergent summaries |
| Relative time | DS-002 | rows | Reuse the existing relative-time formatter if present (implementation locates it); otherwise a small localised util in `utils/projects/` | — | — |
| Status labels | DS-002 | rows, filter | i18n keys `projects.task.status.{TODO,IN_PROGRESS,DONE}` | `REQ-015` | Hard-coded strings |
| Error codes | DS-001 | dialog | Extend `ProjectErrorCode` (server + web) and `projectErrorMessageKey` | Field messages | String matching |

## Ownership Boundaries

- Task writes go only through `ProjectTaskService` → `ProjectStore`.
- `ProjectService` never manipulates individual Tasks. `ProjectTaskService` never changes name, description, workspaces or `updatedAt` of a Project.
- Web components never call Apollo. `projectTaskStore` is the only Task request owner.

## Boundary Encapsulation Map

| Boundary | Encapsulates | Callers | Forbidden Bypass | Fix If Too Thin |
| --- | --- | --- | --- | --- |
| `ProjectTaskService` | Task validation, ids, ordering | `ProjectTaskResolver` | Resolver → `ProjectStore` | Add a service method |
| `ProjectStore` | File I/O, normalisation | `ProjectService`, `ProjectTaskService` | Services reading the file directly | — |
| `projectTaskStore` | Apollo, Task documents | Task components | Component → Apollo | Add an action |
| `projectStore.setOpenTaskCount` | Project cache mutation | `projectTaskStore` | `projectTaskStore` writing `projectStore.projects` directly | — |

## Dependency Rules

- Allowed (server): `api/graphql/types/project-tasks.ts` → `projects/services/project-task-service.ts` → `projects/stores/project-store.ts`, `projects/domain/*`.
- Forbidden (server): `projects/**` importing any `task-delegation` or `agent-team-execution` code; delegated-task code importing `projects/**` (`REQ-012`).
- Allowed (web): `pages/projects*` → `components/projects/**` → `stores/projectTaskStore.ts`, `stores/projectStore.ts`, `utils/projects/**`; `projectTaskStore` → `projectStore` (the `setOpenTaskCount` action only).
- Forbidden (web): Project components importing delegated-task components or stores (e.g. collaboration task views).

## Interface Boundary Mapping

| Interface | Subject | Responsibility | Identity Shape | Notes |
| --- | --- | --- | --- | --- |
| `Project.openTaskCount: Int!` | Project | Count of Tasks with status ≠ DONE | — | Computed in `toView` |
| `query projectTasks(projectId: String!): [ProjectTask!]!` | Task list | One Project's Tasks, `updatedAt` desc | `projectId` | `PROJECT_NOT_FOUND` if missing |
| `mutation createProjectTask(input: CreateProjectTaskInput!): ProjectTask!` | Task | Create with status TODO | `{ projectId, description }` | `TASK_DESCRIPTION_REQUIRED`, `PROJECT_NOT_FOUND` |
| `mutation updateProjectTask(input: UpdateProjectTaskInput!): ProjectTask!` | Task | Edit description only | `{ projectId, taskId, description }` | `TASK_NOT_FOUND`, `TASK_DESCRIPTION_REQUIRED` |
| `mutation deleteProjectTask(input: DeleteProjectTaskInput!): Boolean!` | Task | Remove | `{ projectId, taskId }` | `false` if Task missing; `PROJECT_NOT_FOUND` if Project missing |
| (none) status mutation | — | Deliberately absent (`REQ-003`) | — | The future admission ticket adds an agent-facing operation |

```graphql
type ProjectTask { taskId: String!, projectId: String!, description: String!, status: ProjectTaskStatus!, createdAt: String!, updatedAt: String! }
enum ProjectTaskStatus { TODO IN_PROGRESS DONE }
```

(`projectId` is included in the GraphQL view for client keying; it is not stored inside each Task.)

## Interface Boundary Check

| Interface | Singular? | Identity Explicit? | Ambiguity Risk | Action |
| --- | --- | --- | --- | --- |
| Task operations | Yes | Yes (`projectId` + `taskId`) | Low | — |
| `openTaskCount` | Yes | N/A | Low | — |

## Main Domain Subject Naming Check

| Subject | Name | Natural? | Drift Risk | Action |
| --- | --- | --- | --- | --- |
| Project Task | `ProjectTask`, `project_task_<uuid>`, `projectTasks` | Yes | Low; distinct from `TaskDelegation*` | Never use bare `Task` in new GraphQL names |
| Status | `ProjectTaskStatus` `TODO`/`IN_PROGRESS`/`DONE`; labels "To Do", "In Progress", "Done" | Yes | Low | — |

## Existing Capability / Subsystem Reuse Check

| Need | Existing | Decision | Why |
| --- | --- | --- | --- |
| Persistence | `ProjectStore` / `store-utils` | Extend | Same aggregate and lock |
| Error mapping | `ProjectError`, `withProjectErrors`, `projectErrorMessageKey` | Extend | Same conventions |
| Dialogs | `ProjectDialogFrame`, `ConfirmationModal` | Reuse | Conventions |
| Workspaces UI | `ProjectWorkspaceRow`, `ProjectWorkspaceLinkDialog` | Reuse (moved into a tab) | Unchanged behavior |
| Two-pane responsive shell | `pages/settings.vue` pattern | Mirror (no shared component exists) | Consistent look; the Settings resize composable is not needed |
| Task service | none | Create New | Distinct subject invariants |

## Subsystem / Capability-Area Allocation

| Area | Owns | Spines | Decision |
| --- | --- | --- | --- |
| server `src/projects/` | Task domain, Task service, store normalisation, open count | DS-001–DS-003 | Extend |
| server `src/api/graphql/types/` | Task transport | DS-001, DS-002 | Extend |
| web `pages/projects*` | Two-pane routing | DS-004 | Rework |
| web `components/projects/` | Panes, tabs, Task UI | DS-001–DS-004 | Extend and rework |
| web `stores/` | `projectTaskStore`; `projectStore` count | DS-001–DS-003 | Create / extend |

## Draft File Responsibility Mapping

Drafted and then tightened. The summary rule was extracted to a util. Workspaces markup was extracted to a panel so that `ProjectDetail` owns only the header and tabs.

## Reusable Owned Structures Check

| Repeated Logic | Shared File | Owner | Why | Tight? |
| --- | --- | --- | --- | --- |
| First-line summary | `autobyteus-web/utils/projects/taskSummary.ts` | web projects | Row and dialog | Yes |
| Binding-revision request sequencing | pattern in `projectStore` | web stores | `projectTaskStore` mirrors it | Duplication accepted: two stores, and a generic extraction would be premature (residual note) |

## Shared Structure / Data Model Tightness Check

| Structure | One Meaning Per Field | Redundant Removed | Overlap Risk | Action |
| --- | --- | --- | --- | --- |
| Stored `ProjectTask` `{ taskId, description, status, createdAt, updatedAt }` | Yes | Yes (no title, no stored summary, no projectId inside the embedded Task) | Low | — |
| `ProjectView` | Yes | Yes (`tasks` excluded; `openTaskCount` added) | Low | — |
| GraphQL `ProjectTask` | Yes | `projectId` added for the client only | Low | Documented |

## Final File Responsibility Mapping

| File | Area | Owner | Concern |
| --- | --- | --- | --- |
| `autobyteus-server-ts/src/projects/domain/models.ts` | server | domain | Add `ProjectTaskStatus`, `ProjectTask`, `Project.tasks`; `ProjectView` = Project minus `tasks`/`workspaces` + workspace views + `openTaskCount`; Task commands |
| `autobyteus-server-ts/src/projects/domain/project-errors.ts` | server | domain | Add `TASK_DESCRIPTION_REQUIRED`, `TASK_NOT_FOUND` |
| `autobyteus-server-ts/src/projects/stores/project-store.ts` | server | persistence | `isValidTask`; normalise `tasks` (missing → `[]`) |
| `autobyteus-server-ts/src/projects/services/project-service.ts` | server | Project owner | `createProject` sets `tasks: []`; `toView` adds `openTaskCount`, omits `tasks` |
| `autobyteus-server-ts/src/projects/services/project-task-service.ts` | server | Task owner | `listTasks`, `createTask`, `updateTaskDescription`, `deleteTask`; locked writes; `getProjectTaskService`/reset |
| `autobyteus-server-ts/src/api/graphql/types/projects.ts` | server | transport | `openTaskCount` field; export the `withProjectErrors` helper for reuse |
| `autobyteus-server-ts/src/api/graphql/types/project-tasks.ts` | server | transport | `ProjectTask`, enum, inputs, `ProjectTaskResolver` |
| `autobyteus-server-ts/src/api/graphql/schema.ts` | server | registration | Register `ProjectTaskResolver` |
| `autobyteus-server-ts/tests/unit/projects/project-task-service.test.ts`, updates to `project-service.test.ts`, store normalisation test | server | tests | Invariants, cascade, released-row fixture (`AC-010`), failure atomicity |
| `autobyteus-web/pages/projects.vue` | web | route shell | `flex-col md:flex-row`; `<ProjectListPane>` + `<NuxtPage>` |
| `autobyteus-web/pages/projects/index.vue` | web | child route | Select-or-create prompt (empty state when no Projects) |
| `autobyteus-web/pages/projects/[id].vue` | web | child route | `<ProjectDetail :project-id>` |
| `autobyteus-web/components/projects/ProjectListPane.vue` | web | list pane | Search, New Project (`ProjectFormDialog`), items, loading, error, empty |
| `autobyteus-web/components/projects/ProjectListItem.vue` | web | list item | `NuxtLink` to `/projects/<id>`, name, open count badge (text), `aria-current` when selected |
| `autobyteus-web/components/projects/ProjectDetail.vue` | web | right pane | Header (name, description, Edit, Delete with Task count), tabs Tasks (default) / Workspaces via `?tab=`, not-found state |
| `autobyteus-web/components/projects/ProjectWorkspacesPanel.vue` | web | tab | Moved Workspaces section (rows, link dialog, unlink) |
| `autobyteus-web/components/projects/ProjectTasksPanel.vue` | web | tab | Toolbar (search, status filter, New Task), rows, states, client filtering |
| `autobyteus-web/components/projects/ProjectTaskRow.vue` | web | row | Status label, summary (truncate), relative updated time; click or Enter opens the dialog |
| `autobyteus-web/components/projects/ProjectTaskDialog.vue` | web | dialog | Modes create, view (full description, Edit, Delete), edit (one textarea); validation; delete confirmation |
| `autobyteus-web/stores/projectTaskStore.ts` | web | Task client owner | `fetchTasks`, `createTask`, `updateTaskDescription`, `deleteTask`, `forget`; binding invalidation; pushes the open count |
| `autobyteus-web/stores/projectStore.ts` | web | Project client owner | `openTaskCount` in the type and query; `setOpenTaskCount` |
| `autobyteus-web/graphql/queries/projectQueries.ts`, `mutations/projectMutations.ts` | web | documents | `openTaskCount` in the Project fragment |
| `autobyteus-web/graphql/queries/projectTaskQueries.ts`, `mutations/projectTaskMutations.ts` | web | documents | Task ops |
| `autobyteus-web/types/project.ts` | web | types | `ProjectTask`, `ProjectTaskStatus`, error codes, `openTaskCount` |
| `autobyteus-web/utils/projects/taskSummary.ts`, `projectErrorMessageKey.ts` | web | utils | Summary; new error keys |
| `autobyteus-web/localization/messages/{en,zh-CN}/projects.ts` | web | i18n | List pane, tabs, Task strings, status labels, delete-with-count |
| `autobyteus-web/components/projects/__tests__/*` | web | tests | New specs; update `ProjectDetail.spec.ts`; remove `ProjectsList.spec.ts` |
| `autobyteus-web/tests/e2e/projects-feature-probe.mjs` | web | e2e | Adapt released cases to two panes; add Task cases |
| `autobyteus-web/docs/projects.md`, `autobyteus-server-ts/docs/modules/projects.md` | docs | docs-sync | Tasks, storage shape, two-pane UI |

## Applied Patterns

Aggregate-embedded child records under one locked store; URL-driven master-detail with a persistent parent route.

## Target Subsystem / Folder / File Mapping

All files stay in the existing folders: `src/projects/{domain,stores,services}`, `api/graphql/types`, `components/projects`, `pages/projects*`, `stores`, `utils/projects`. No new folders except the page parent file `pages/projects.vue`.

## Folder Boundary Check

| Folder | Depth | Clear? | Risk | Note |
| --- | --- | --- | --- | --- |
| `components/projects/` | Mixed Justified (feature UI) | Yes | Low | Grows by 6 files |
| `src/projects/services/` | Domain | Yes | Low | Two sibling services, one per subject |

## Concrete Examples / Shape Guidance

| Topic | Good | Avoided | Why |
| --- | --- | --- | --- |
| Stored record | `{"projectId":"project_7fc…","name":"AutoByteus","description":"Hello","createdAt":"…","updatedAt":"…","workspaces":[],"tasks":[{"taskId":"project_task_1a…","description":"Write release notes for 1.4.87\nInclude Projects and Tasks","status":"TODO","createdAt":"…","updatedAt":"…"}]}` | A separate `tasks.json` with `projectId` foreign keys | One lock gives an atomic cascade (`QR-001`) |
| Released row read | `{…,"workspaces":[]}` (no `tasks`) → normalised `tasks: []` | Startup migration rewriting the file | `Directly Usable` |
| Row | `[To Do]  Write release notes for 1.4.87        2h ago` | Coloured dot only; truncated full text blob | `REQ-006`, `QR-003` |
| Delete Project | "Delete AutoByteus? This also deletes its 4 tasks. Workspaces and files are not affected." | Generic confirm | `REQ-008` |
| Switch Project | Click "Marketing" in the list pane → URL `/projects/<id>`; left pane unchanged; Tasks tab shown | Navigating to a separate page with a Back link | `REQ-016` |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate | Why Considered | Decision | Replacement |
| --- | --- | --- | --- |
| Keep the card grid alongside the two-pane page | Lower churn | Rejected | Remove the grid (`REQ-016`) |
| Migration adding `tasks: []` to released rows | Explicit shape | Rejected | The normaliser treats absence as empty (directly usable) |
| Keep the Back link | Familiarity | Rejected | List-pane selection |

## Derived Layering

Server: GraphQL types → services → store. Web: route shell → panes/tabs → stores → GraphQL documents.

## Change / Refactor Sequence

1. Server domain, errors and store normalisation (+ released-row fixture test).
2. `ProjectService` changes (`tasks: []` on create, `openTaskCount`, preservation tests, cascade test).
3. `ProjectTaskService` + unit tests: validation, ordering, not-found, Project `updatedAt` unchanged by Task writes, a failing updater leaves the file intact.
4. GraphQL `project-tasks.ts`, `openTaskCount`, schema registration; resolver tests; regenerate `generated/graphql.ts`.
5. Web types, documents, `projectStore` count, `projectTaskStore` (+ specs).
6. Web route shell `pages/projects.vue`, children, `ProjectListPane`/`ProjectListItem`; remove `ProjectsList`/`ProjectCard` and their spec.
7. `ProjectDetail` rework, `ProjectWorkspacesPanel` extraction (existing test ids kept), `ProjectTasksPanel`, `ProjectTaskRow`, `ProjectTaskDialog`, `taskSummary` (+ specs; replace the line-81 assertion).
8. Localisation (`en`, `zh-CN`) passing the localisation guards.
9. E2E probe update: released cases on two panes, plus Task create/view/edit/delete/search/filter, Project delete with count, one-click switching, deep link, flag off/on, a 100-Task search timing, and a released-data fixture.
10. Docs sync (delivery).

## Key Tradeoffs

- **Embedded vs separate Task storage.** Embedded gives an atomic cascade and a single lock with no migration. The cost is rewriting the whole file on every Task write (KB-scale at the approved size). Chosen for this ticket.
- **Client-side search and filter** is simple and instant at hundreds of Tasks, but loads all Tasks of the selected Project. That is acceptable at the approved scale (`REQ-014`).
- **Mirroring the Settings layout without a shared component** avoids a premature abstraction across unrelated pages.

## Risks

- **Future write frequency.** When the admission ticket lets agents update status often, one shared `projects.json` lock may contend and file rewrites grow. Trigger: if a node exceeds ~1,000 Tasks or agent writes become frequent, move Tasks to per-Project files or SQLite in that ticket, with a recorded migration decision.
- **Very long descriptions** inflate the file. No length limit is approved; this is recorded as a residual note, not enforced.
- **Nested-route introduction** is the first in the repo. The route middleware already matches the `/projects*` prefix, so gating is unaffected; implementation must verify that `useShellPrimaryNavigation` active-state and the mobile gate still match.
- **Released e2e probe churn.** Adapt it; don't delete coverage.

## Guidance For Implementation

- Never add a user-facing status mutation. Status is always `TODO` on creation.
- Task writes must not change the Project's `updatedAt`. Use a dedicated updater in `ProjectTaskService`, not `ProjectService.updateProjectRecord`.
- Sort Tasks by `updatedAt` desc, then `taskId`, on the server. The client re-applies the same order after local writes.
- Search matches the full description, case-insensitive. Filter "All" is the default.
- Use `?tab=workspaces` for the Workspaces tab; no query means Tasks.
- The list-pane item must show its count as text (for example "4 open"), not as a coloured dot only.
- Keep all existing Workspaces test ids when moving that section into `ProjectWorkspacesPanel`.
- Do not introduce bare `Task` GraphQL type names.
