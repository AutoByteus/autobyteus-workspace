# Investigation Notes

## Investigation Meta

- Package identifier: `PROJ-TASKS-20260926-001`
- Request / ticket: `project-tasks` — Tasks that belong to a Project, with a simple To Do / In Progress / Done lifecycle; no assignment or task admission
- Workspace root: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-tasks`
- Repository mode: `Git`
- Task worktree / branch: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-tasks` on `codex/project-tasks`
- Resolved base remote / branch / revision: `origin` / `personal` / `e06080b0027636cecf20b5e437c496d423c7f26b` (fetched 2026-09-26; "chore(release): bump workspace release version to 1.4.86", which follows "Merge Projects concept introduction")
- Finalization target remote / branch: `origin` / `personal`
- Bootstrap result: `Succeeded` — `git worktree add -b codex/project-tasks … origin/personal`; ticket folder `tickets/in-progress/project-tasks/`
- Bootstrap blocker: None
- Current solution revision ID: `SR-004`
- Investigation status: Requirements and architecture investigation complete (2026-09-26)

## Initial Request And Clarifications

- Original request (user, 2026-09-26, voice transcription, lightly condensed): Projects is released. Next, work on Tasks that belong to a Project. Task admission — how a task is assigned or delegated to an agent, agent team or agent org, and what that UI looks like — has not been thought through and is complicated, so it is not part of this work. Build the Task domain model, like Project. A Task has stages, like Jira columns. Keep it simple: three states, To Do / In Progress / Done. Tasks belong to a Project, so when Projects is hidden, Tasks are hidden automatically. Bootstrap from the `personal` branch.
- Transcription ambiguity recorded: the phrase "So we will work on the task admission part for now" contradicts the surrounding statements ("we first do not", "there's no task admission part", "we don't do the task admission part"). Interpreted as "we **won't**"; to be confirmed at approval (`DEC-011`).
- User-supplied facts and constraints: no assignment; no admission; exactly three states; Project-owned; hidden with Projects (no new flag).
- Initial ambiguity: board interaction (drag vs explicit move), fields beyond title/description, placement inside Project detail, behavior when a Project with Tasks is deleted.

## Product And Domain Understanding

- Product area: Projects module (released v1.4.86, behind `ENABLE_PROJECTS`).
- Affected actors: desktop user planning and tracking work inside a Project.
- Terminology:
  - **Project Task** (new): a user-created unit of work inside one Project, with a status of To Do, In Progress or Done.
  - **Delegated task** (existing, unrelated): execution-internal work an agent delegates inside a TeamRun. It is surfaced as "Task team", "Task / Run" and "Task · {{timestamp}}" labels, the Team tab "Active Tasks", and GraphQL `TaskDelegationRecordObject`.
  - **Task admission** (future, out of scope): how a Project Task is given to an agent, agent team or agent org for execution.

## Source Log

| Date | Source Type | Exact Source / Command / Query | Why Consulted | Relevant Finding | Follow-Up |
| --- | --- | --- | --- | --- | --- |
| 2026-09-26 | Command | `git fetch origin personal`; `git log origin/personal -8` | Base and release state | `4dd37f75b Merge Projects concept introduction`; `e06080b00` release bump 1.4.86 | Base = `e06080b00` |
| 2026-09-26 | Code | `git ls-tree origin/personal -- autobyteus-server-ts/src/projects autobyteus-web/components/projects autobyteus-web/pages/projects` | Released Projects surfaces | Server `projects/{domain,services,stores}`; web `ProjectsList`, `ProjectCard`, `ProjectDetail`, `ProjectFormDialog`, `ProjectWorkspaceLinkDialog`, `ProjectWorkspaceRow`, `ProjectDialogFrame`; pages `projects/index.vue`, `projects/[id].vue` | Tasks extend these |
| 2026-09-26 | Code | `origin/personal:autobyteus-server-ts/src/projects/services/project-service.ts` | Project invariants and persistence pattern | `ProjectService` validates inside the locked `ProjectStore.updateRecords`; ids `project_<uuid>`; `deleteProject` removes only the Project record | Task deletion cascade must be decided (`DEC-006`) |
| 2026-09-26 | Code | `origin/personal:autobyteus-server-ts/src/api/graphql/types/projects.ts` | GraphQL surface | `projects`, `project(projectId)`, create/update/delete, workspace link mutations; `ProjectError` → `extensions.code` | Task operations extend this API family |
| 2026-09-26 | Doc | `origin/personal:autobyteus-web/docs/projects.md`; `tickets/done/projects-concept-introduction/requirements-doc.md` `REQ-014`, `AC-012` | Released constraint | Slice 1 required "no Task vocabulary, task counts, or placeholders on Project surfaces" | This package intentionally supersedes `REQ-014`/`AC-012` of `PROJ-CONCEPT-20260926-001` |
| 2026-09-26 | Code | `autobyteus-web/components/projects/__tests__/ProjectDetail.spec.ts:81` `expect(wrapper.text()).not.toMatch(/\btasks?\b/i)` | Test enforcing released `AC-012` | Test must be replaced when Tasks are introduced | Design/implementation update |
| 2026-09-26 | Code | `grep` of `localization/messages/en/*.ts` for "task" | Existing user-visible "Task" vocabulary | "Task team", "Task · {{timestamp}}", "Task / Run", "task agent {{id}}", "System Task Notification", "Loading task history..." — all execution/delegation meanings | Project Task surfaces must stay visually and contractually distinct (`REQ-011`) |
| 2026-09-26 | Code | `autobyteus-server-ts/src/api/graphql/types/task-delegation.ts` | Existing GraphQL "Task" types | `TaskDelegationRecordObject` and related types | Project Task GraphQL names must not collide |
| 2026-09-26 | Doc | container `autobyteus-server-0:…/REQ-ATPTN-001/…/visual-references/VIS-024-project-task-board-production-desktop-1510x777.png`, `VIS-025-…list…png` (copied to `/tmp/req-atptn-vis/`, viewed) | Prior exploratory Task UI | Board with Backlog/Ready/In progress/Done columns and counts; card = title, description excerpt, priority, due, worker, active executions; Board/List toggle; search; worker filter; "New task" | Directional only; the user simplified this to three states and no worker |
| 2026-09-26 | Doc | container `…/agent-team-project-task-navigation/…/requirements-doc.md` `REQ-003`, `REQ-005`, `REQ-009`, `DEC-002`, `DEC-003` | Draft parent model | Task = identity, Project placement, title, description, lifecycle, assigned worker, timestamps, linked executions; open decisions on executions and Inbox | This slice takes identity/title/description/lifecycle/timestamps; worker and executions are deferred to admission |
| 2026-09-26 | User | Conversation 2026-09-26 (Projects storage question) | Storage preference | User prefers file-based storage like other per-node records and approved the JSON design for Projects | Architecture decides storage; file-based is the default preference |

## Relevant Existing Behavior And Supported Product Paths

| Behavior ID | Kind | Supported Trigger Or Governing Contract | Current Supported Product Behavior Path / Lifecycle | Current Outcome / Invariants | Evidence | Confidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | Project detail (`/projects/[id]`) | Shows name, description, Edit, Delete, and a Workspaces section with described links. No Task concept exists | Released `AC-012` forbids Task wording on Project surfaces | `ProjectDetail.vue`; `ProjectDetail.spec.ts:81` | High |
| BEH-002 | User | Delete Project | Confirmation → the Project record and its workspace links are removed; workspaces and history are untouched | Deletion scope is the Project record only | `project-service.ts` `deleteProject` | High |
| BEH-003 | User/Operational | `ENABLE_PROJECTS` capability | Off → no nav item, `/projects*` redirects to `/`, data retained; on → visible. API not gated | Visibility switch only | `docs/projects.md` | High |
| BEH-004 | User | Projects index (`/projects`) | Cards show name, description and linked-workspace count | No Task counts | `ProjectCard.vue`; released `REQ-014` | High |
| BEH-005 | Contract | Execution-internal delegated tasks | Visible as "Task team", "Task · …", Team tab "Active Tasks"; GraphQL `TaskDelegation*` | Independent of Projects | locales; `task-delegation.ts` | High |
| BEH-006 | User | Project Tasks | `No current supported behavior` | — | — | High |

## Relevant Codebase And Technical Facts

| Path / Component / Contract | Current Responsibility | Requirement Implication | Architecture Question |
| --- | --- | --- | --- |
| `autobyteus-server-ts/src/projects/**` | Project domain, JSON store `<appDataDir>/projects/projects.json`, `ProjectService` | Tasks are Project-owned; Project deletion must handle Tasks | Embed Tasks in `projects.json`, or use separate file(s)/table; cascade inside one lock vs two stores |
| `autobyteus-server-ts/src/api/graphql/types/projects.ts` | Project API | Add Task operations | `ProjectTask` naming; does `Project` expose task counts? |
| `autobyteus-web/components/projects/ProjectDetail.vue`, `ProjectCard.vue`, `stores/projectStore.ts` | Project UI and client cache | Host the Task board; show counts | Tabs vs sections; separate `projectTaskStore` |
| `autobyteus-web/components/projects/__tests__/ProjectDetail.spec.ts:81` | Enforces released `AC-012` | Superseded | Replace with Task assertions |
| `autobyteus-web/components/common/ConfirmationModal.vue`, `ProjectDialogFrame.vue` | Dialog conventions | Task create/edit/delete dialogs | Reuse |

## Structural And Payload Surface Inventory

### Payload Or Content Surfaces

- New Project Task records; the released `projects.json` may change shape if Tasks are embedded (architecture decision).

### Structural Surfaces

- New GraphQL operations; new or extended persistence subject; new web components and store; changed Project detail and card; changed Project deletion semantics.

### Potential Structural Impacts To Investigate

- API: additive (present).
- Persistence: new subject; possible change to `projects.json` shape (present or unknown, pending design).
- Security, concurrency, deployment: absent beyond locked writes.
- Data transition: released `projects.json` data must remain readable (design decision required).

## Runtime, Probe, Or Reproduction Findings

| Method | Scenario | Observation | Requirement Implication | Evidence |
| --- | --- | --- | --- | --- |
| `cat ~/.autobyteus/server-data/projects/projects.json` (earlier today) | Live released data | One user Project exists (`AutoByteus`) on the user's node | Released Project data must be preserved (`REQ-012`) | Conversation evidence |

## Stakeholder And User Evidence

| Source | Need / Constraint | Strength | Requirement Implication | Open Question |
| --- | --- | --- | --- | --- |
| User 2026-09-26 | Tasks belong to a Project; three states; Jira-like columns; no assignment or admission; hidden with Projects | Direct | `REQ-001`–`REQ-005`, `REQ-009` | `DEC-002`, `DEC-003` |
| User 2026-09-26 | Keep it simple | Direct | Minimal fields (`DEC-004`); no priority, due date, labels, or custom columns | — |
| Prototype `REQ-ATPTN-001` (exploratory) | Board + list, 4 columns, priority, worker | Non-normative | Board layout direction only | — |

## External Contracts, Standards, And Dependencies

| Contract | Authority | Constraint | Evidence | Risk |
| --- | --- | --- | --- | --- |
| Released Projects API and data (v1.4.86) | `origin/personal@e06080b00` | Must remain compatible for existing Projects | Source Log | Shape change if Tasks are embedded |
| Execution-internal delegated tasks | current code | Must stay unchanged and distinct | Source Log | Naming collision |

## Persisted Data And State Facts

- Affected subject: new Project Task records; released Project records.
- Location: `<appDataDir>/projects/projects.json` exists today (JSON array). Task location is decided by architecture.
- Volume: tens of Projects; target at least 100 Tasks per Project (carried over from the Draft `REQ-ATPTN-001` scale goal).
- Readers and writers: `ProjectStore` / `ProjectService` only.
- Must preserve: every existing Project and its workspace links.
- Acceptable loss: none.
- Remaining gap: storage mechanism (architecture).

## Product Design Request Context

- Product Design request in the current input: `Not stated`. Exploratory `REQ-ATPTN-001` board evidence exists and is linked; no new Product request is proposed unless the user asks for one (`DEC-010`).

## Product Design Findings

- The exploratory package is the same as for `PROJ-CONCEPT-20260926-001`: container-only and unpushed (`RISK-001` carried over). The relevant screens are `VIS-024` (board) and `VIS-025` (list). They are non-normative.

## Supplemental Artifact Inventory

| Artifact Path | Owner | Purpose | Related IDs | Status | Approval Applicability |
| --- | --- | --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/project-tasks/tickets/done/projects-concept-introduction/` | Solution Designer (archived) | Released Projects package; `REQ-014`/`AC-012` superseded here | `REQ-010` | Done | Context |
| container `…/REQ-ATPTN-001/…/visual-references/VIS-024…png`, `VIS-025…png` | Product Prototyper | Exploratory board/list | `REQ-005` | Awaiting User Review (external) | Non-normative |
| `/tmp/req-atptn-vis/VIS-024…png`, `VIS-025…png` | Disposable copies | Viewing | — | Disposable | Not promoted |

## Assumptions, Unknowns, And Risks

| ID | Type | Description | Why It Matters | Resolution / Owner | Status |
| --- | --- | --- | --- | --- | --- |
| ASM-001 | Assumption | Task admission, assignment, executions, priority, due dates and custom columns are excluded | Scope | User approval | Open |
| ASM-002 | Assumption | Tasks are hidden by the existing `ENABLE_PROJECTS` flag; no separate flag | User statement | User approval | Open |
| UNK-001 | Unknown | Transcription "we will work on task admission" vs "won't" | Scope | `DEC-011` at approval | Open |
| RISK-001 | Risk | Exploratory prototype and Draft requirements still exist only in container `autobyteus-server-0`, unpushed | Evidence loss | User action | Open (carried over) |
| RISK-002 | Risk | "Task" already means execution-internal delegated tasks in the UI and API | User confusion or contract collision | `REQ-011` | Mitigated by requirement |

## Architecture Investigation Findings

Performed after approval `APPROVAL-PROJ-TASKS-20260926-001` at base `e06080b00`.

| Source / Command | Observation | Design implication |
| --- | --- | --- |
| `autobyteus-server-ts/src/projects/stores/project-store.ts` | `isValidProject` requires a `workspaces` array; `normalizeRecords` filters links; locked `updateJsonArrayFile` | Embed `tasks`; the normaliser defaults a missing `tasks` to `[]` (directly usable) |
| `autobyteus-server-ts/src/projects/services/project-service.ts` L150–240 | `updateProjectRecord` bumps Project `updatedAt`; `deleteProject` filters the record; `toView` spreads the record | Separate `ProjectTaskService` updater (no Project `updatedAt` bump); cascade inherent; `toView` computes `openTaskCount` |
| `autobyteus-server-ts/src/projects/domain/project-errors.ts` | Six codes | Add `TASK_DESCRIPTION_REQUIRED`, `TASK_NOT_FOUND` |
| `autobyteus-server-ts/src/api/graphql/types/projects.ts` L20–160 | `Project`/`ProjectWorkspace` types, `withProjectErrors`, `ProjectResolver` | New `project-tasks.ts` resolver reusing the error mapping; `Project.openTaskCount` |
| `grep registerEnumType / ObjectType` in `api/graphql/types` | No `ProjectTask*` or `TaskStatus` names; delegated tasks use `TaskDelegation*` | Collision-free naming |
| `ls autobyteus-web/pages`; `grep -l "<NuxtPage"` | Only `app.vue` hosts `<NuxtPage>`; no nested-route parent exists yet | New `pages/projects.vue` parent keeps the left pane mounted |
| `autobyteus-web/pages/settings.vue` L1–14 | `flex-col md:flex-row` two-pane layout that stacks on narrow widths | Mirror it for the Projects page |
| `grep -rl "ProjectsList\|ProjectCard\|ProjectDetail"` in web | Used only by `pages/projects/*`, their specs, the i18n catalogues and `tests/e2e/projects-feature-probe.mjs` | Safe removal of the grid components |
| `autobyteus-web/stores/projectStore.ts` (246 lines) | Binding-revision request sequencing; `ProjectRequestError` with codes | `projectTaskStore` mirrors the pattern; `setOpenTaskCount` action |
| `autobyteus-web/components/projects/ProjectDetail.vue` L257 | Delete navigates to `/projects` | Preserved in the two-pane shell |

Storage decision: embed Tasks in each Project row of `projects.json` (atomic cascade, single lock). The released data is `Directly Usable — No Migration`.

## Requirement Implications

- Released `REQ-014`/`AC-012` of `PROJ-CONCEPT-20260926-001` must be explicitly superseded for Project surfaces, while the separation from delegated tasks is kept as its own requirement.
- Project deletion semantics change: deleting a Project now also removes its Tasks (`DEC-006`).
- No new visibility flag is needed.

## Notes For Architecture Design

- Reuse the Projects subsystem, its locked JSON persistence and error conventions.
- Keep all Project Task API and type names distinct from `TaskDelegation*`.
- Released `projects.json` must stay readable without a migration unless the design proves one is needed.


## UX Analysis For SR-005/SR-006 (2026-09-27)

Trigger: the user rejected the delivered two-pane UI as "super squeezed" and asked the Solution Designer to think deeply about the best UX, validate it, and continue.

### Root cause of "squeezed" (measured)

| Evidence | Value |
| --- | --- |
| `autobyteus-web/electron/…` `new BrowserWindow` | default window 1200×800 |
| `autobyteus-web/utils/layout/responsiveLayoutPolicy.ts:19-20` | app left panel default 320 px (min 260) |
| delivered `components/projects/ProjectListPane.vue` | project list pane `w-80` = 320 px |
| delivered `components/projects/ProjectDetail.vue` | right-pane content capped at `max-w-[1100px]` |
| delivered `components/projects/ProjectTaskRow.vue` | summary `truncate` (single line) |

At the default window, 1200 − 320 − 320 = **~560 px** was left for Tasks, and every row was cut to one line. Two nested navigation columns consumed more than half of the window.

### Validation of the chosen layout

- Full-width Project page: 1200 − 320 = 880 px content; minus ~48 px padding = ~830 px.
- Three columns with 16 px gaps give ≈ **266 px each**. That is comparable to the Trello standard column width (272 px) and holds about 35 characters per line, so three clamped lines show ~100 characters of a description.
- With the app menu collapsed to its 50 px strip (`LeftSidebarStrip.vue` `w-[50px]`), columns are ≈ 360 px.
- Height budget at 800 px: title bar and header (Back, name, 2-line description) plus one combined toolbar row ≈ 200 px, leaving about 550 px for the board. Stacking tabs and toolbar on separate rows would cost about 50 px more; this is why they share one row.
- Independent column scrolling keeps the header and toolbar visible with 100+ To Do cards (`REQ-014`).
- Below ~720 px of content width, three columns would drop below ~220 px. At that point columns stack vertically. *(Superseded by the ARCH-REV-002 reconciliation below: minimum column 240 px; three columns need ≥ 752 px of board width.)*
- Existing conventions reused:
  - `line-clamp-*` is already used in `ToolCard.vue` and `AgentTeamCard.vue`;
  - the released grid (`ProjectsList.vue`, `ProjectCard.vue` at `origin/personal@e06080b00`) is restored;
  - dialogs follow `ProjectDialogFrame`.

### Choices and rationale

1. **Released grid restored** (user direction). It is familiar, and the card count gives progress at a glance.
2. **Separate full-width Project page with "← Projects"** (user direction). Naming the destination makes Back unambiguous.
3. **Tabs Tasks | Workspaces (n)**: Tasks are the daily view and workspaces are setup. The count shows workspaces exist without taking space.
4. **Cards without a status label**: the column already conveys status, so a label would be redundant noise on narrow cards.
5. **Three-line description clamp**: without titles, the description is the identity, and one truncated line was unreadable.
6. **Explanatory empty-column copy**: humans cannot move cards (`REQ-003`), so empty In Progress and Done columns must read as intentional, not broken.
7. **The Task dialog is kept** (built and reviewed). A side drawer was considered for future agent activity, but it is a new pattern in this app (no existing slide-over component). Deferred to the admission ticket.
8. **An inline quick-add in the To Do column was considered.** Rejected for now: one discoverable "+ New task" in the toolbar plus the empty-state action cover capture without two parallel creation paths.

### Simplification (2026-09-27, user: "Don't make the UI complicated. The UI should stay clean enough.")

Dropped from the SR-006 UX proposal:
- per-column scrolling (the page scrolls instead);
- relative updated time on cards;
- explanatory empty-column copy (now a muted "No tasks");
- counts on tab labels;
- combining tabs and toolbar on one row (the board owns its own search + New task row).

The project card merges the open-task count into its released bottom line. The width analysis above still holds: the full-width page gives ≈ 266 px columns at the 1200×800 default.

### ARCH-REV-002 evidence (2026-09-27, SR-008)

| Source | Observation | Implication |
| --- | --- | --- |
| `autobyteus-web/utils/layout/responsiveLayoutPolicy.ts:21` `LEFT_PANEL_MAX_WIDTH_PX = 520`; `composables/useLeftPanel.ts:31` clamp | The user can widen the app left panel to 520 px | At 1200 px the board gets ~580 px, so viewport breakpoints would keep three columns at ~190 px |
| Electron `new BrowserWindow` has no `minWidth` | The window can be made small while the viewport stays at or above `md` | Same squeeze |
| `components/settings/providerApiKey/GeminiConfigurationOptionCard.vue:224` `@container (min-width: 400px)` | Plain-CSS container queries are already used; no Tailwind container plugin in `tailwind.config.js`/`package.json` | The board switches on its own width via a scoped `@container` |

Reconciliation: the earlier estimate of "~720 px content / ~220 px columns" is replaced by a single rule. The minimum column is **240 px**, so three columns need ≥ 752 px of board width (3 × 240 + 2 × 16); below that the columns stack.
