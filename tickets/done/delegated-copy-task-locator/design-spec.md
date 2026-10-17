# Design Spec — delegated-copy-task-locator

## Solution And Approval Basis

- Current solution revision ID: `SR-004` (change-sequence update on user direction; structure unchanged from SR-003, ARCH-REV-002 Pass)
- Approved requirements baseline: `requirements-doc.md` at SR-002. User approval 2026-10-11: the direction was
  approved, and the open details were delegated to the Solution Designer's reasoning (DEC-001 → b: Agent and Team
  runs; DEC-002 → a). `/project_task_manager` confirmed both.
- Behavior-defining supplements: Product `ui-ux-spec.md` + `VIS-001..014`, design repo
  `/Users/normy/autobyteus_org/autobyteus-web-design` `personal` @ `b08ddf6`. User-approved 2026-10-11 ("I like the
  summary version… Let's do it").
- Design status: `Ready`
- Canonical investigation notes:
  `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copy-task-locator/tickets/in-progress/delegated-copy-task-locator/investigation-notes.md`
  (architecture findings AF-001..AF-014).
- Authorities read (2026-10-11): `references/architecture-design.md`, `references/design-principles.md`, and the
  repository `DESIGN.md` (no closer `DESIGN*.md` in `autobyteus-web` / `autobyteus-server-ts`).
  `references/design-examples.md` was not used.
- Project design-principle conflicts: none. `DESIGN.md` rules applied:
  - smallest coherent owner;
  - no global work per row (no scan of all Task lists);
  - new client state only with concrete lifecycle and invalidation;
  - no speculative machinery.

## Current-State Read

- **Rows.** The in-scope hosts share one row component:
  - Agent runs: `AgentRunTaskRows` → `WorkspaceTransientExecutionRow`;
  - Team runs: `WorkspaceTeamExecutionTree` → the same row component.

  Every row is one line and has no Task data (BEH-001). Org runs have their own inline rows; they are out of scope
  (DEC-001).
- **Copy → Task data.** This lives only on the server. `TaskExecutionResourceService` keeps an in-memory per-copy
  index with an O(1) lookup, `rootTaskLocationOf(execution)`: the copy's current Task, when this copy is that Task's
  latest assignment (AF-002). `ProjectTaskService` is the Projects API owner (AF-001).
- **Liveness.** Every assignment write and every description or status write already publishes `task_upserted`,
  carrying the full Task and its `root`, on `/ws/projects`. Task deletes publish `task_removed`. A Project delete
  publishes only `project_removed`; its Tasks' files go, but their execution resources stay, so `rootTaskLocationOf`
  still resolves (ARCH-REV-001 P-001). The client feed is a
  ref-counted singleton that delivers to `projectStore` and `projectTaskStore` (AF-004, AF-005).
- **Right panel.**
  - `WorkspaceToolShell` owns the panel and provides `revealTool` by inject, so only its own subtree can reach it.
    The tree is outside that subtree.
  - The shell mounts only on `/workspace` and on `/chat?id=…`. Its start-surface variants hide tools until they are
    opened (AF-006, AF-007).
- **Projects tab.** It has these parts (AF-008):
  - `ProjectsPanel`: board or Task view;
  - `projectsPanelStore`: the picker choice;
  - `ProjectTaskBoard` and `TempTaskBoard`: filters local to each board; search held in `projectTaskStore`;
  - `ProjectTaskRow`: the card, with the live highlight from `projectTaskStore.liveChanges`.
- **Constraints.**
  - QR-003: the row structure from the aggregate-status and collapsed-left-panel teams.
  - Landing after `codex/delegated-team-aggregate-status`.
  - No browser scan of Task lists.

## Task Size And Architectural Risk (Mandatory)

- Task size: `Large`
- Size rationale:
  - Spans two packages: the server, with a domain view, a service method and a GraphQL query; and the web app.
  - In the web app, three subsystems are touched:
    - the workspace-history tree, in the Agent and Team host trees;
    - the layout shell;
    - the Projects tab: panel, both boards and the card.
  - Two new client stores, one composable, one new component, about 14 modified files, plus localization and the
    Tailwind config.
- Architectural risk: `High`
- Risk rationale:
  - A new public GraphQL query contract.
  - New client cached state with live invalidation and lifecycle (feed retention, node rebinding).
  - A cross-surface request/response flow between the tree, the shell, the panel, the boards and the cards.
  - A shared tree row that another branch changes at the same time (blast radius, ordering).
  - No persistence or security change.
- Escalation trigger: any need to change server assignment rules, the `/ws/projects` schema or persisted data; a
  reveal path that needs the center route changed in cases other than REQ-012; or a conflict with the merged
  aggregate-status row structure that QR-003 can't satisfy. Each of these returns as a Design Impact.

## Architecture Investigation Evidence

| Source / Command / Probe | Exact Path / Reference | Observation | Design Decision Supported | Remaining Uncertainty |
| --- | --- | --- | --- | --- |
| Code read | AF-001, AF-002 | Server index + Projects owner | Server read on `ProjectTaskService` | None |
| Code read | AF-004, AF-005 | Feed carries `root`; ref-counted | Client invalidation via the feed; no new event | None |
| Code read | AF-006, AF-007 | Inject-scoped reveal; start surfaces | Store-mediated request; shell registers presence | None |
| Code read | AF-008 | Board-local filters | Boards consume the visibility step | None |
| Code read | AF-009, AF-010 | Host open actions; Team toggles | `onOpenTeamRun` | None |
| Code read | AF-011 | Org rows are separate buttons | Org out of scope (DEC-001 b); no change to them | None |
| Code read | AF-012 | Elbow at 50 % | `WorkspaceHierarchyBranches` anchor prop | None |
| Design repo diff | `b08ddf6` | Reference mechanics | Visible behaviour only; mechanics redesigned | None |

## Intended Change

1. The server answers "what is the current Task of each of these Task workers" in one call. The answer is
   `{ taskId, projectId | null, description, status }` or null.
2. A client store caches those answers for the workers the tree is showing. It keeps them live from the Projects
   change feed.
3. Task-worker rows under Agent and Team runs show the summary as a separate button. A click places one locate
   request.
4. One locate request flows through:
   - the shell (reveal);
   - the panel (show the board);
   - the board (make the Task visible);
   - the card (scroll, focus, highlight).

   On a page with no shell, the row's host opens its run first.
5. Strings in en and zh-CN; the Tailwind content glob gains `utils/`.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Approved Requirement / ACs | Approved Trigger | Existing Behavior / Evidence | Approved Change Or Preserved Outcome | Target Production Path / Spine |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | REQ-001, REQ-002, REQ-010; AC-001..003, AC-017 | Host tree shows Task workers | One line (inv. BEH-001) | Summary line | DS-001 |
| BEH-002 | User | REQ-003; AC-004 | Row click | Opens the copy | Preserved; the summary is a separate target | Unchanged row activation |
| BEH-003 | User | REQ-004; AC-008 | Summary click | Strip reveal | Reused for locate | DS-002 |
| BEH-004 | Contract | REQ-008; AC-012 | `delegate_task` assign / reassign | Server current-entry rule | Used as the authority | DS-001 (server) |
| BEH-005 | System | REQ-009; AC-015, AC-016 | Task / assignment change | Feed | Summary kept live | DS-003 |
| BEH-006 | System | REQ-007; AC-010 | DONE / CANCELLED | Row leaves the tree | Preserved; locate still works | DS-002 (board step) |
| BEH-008 | User | QR-003; AC-019 | Reveal of the selected row | `useRevealSelectedTreeRow` | Preserved | Marker only on the outer row |
| BEH-009 | User | REQ-003..REQ-007, REQ-012; AC-005..AC-014, AC-020 | Summary click / Enter / Space | None | New | DS-002, DS-004 |

## Relevant Supplemental Task Artifacts

| Artifact Path | Purpose | Related IDs | Relationship To This Design | Status |
| --- | --- | --- | --- | --- |
| design repo `tickets/done/delegated-copy-task-locator/ui-ux-spec.md` | Normative UI/UX | REQ-001..007, REQ-010 | Visible behaviour and values; the reference mechanics are non-normative | Approved |
| design repo `.../visual-references/VIS-001..014` | Normative visuals | same | Implementation and validation targets | Approved |
| design repo `components/workspace/history/WorkspaceTransientExecutionRow.vue` (diff `a55ced2..b08ddf6`) | Reference markup and classes for the summary | REQ-002 | Copy the summary classes and the name-line offsets (1.075rem elbow, `mt-[0.4375rem]` chevron) | Reference |

## Task Design Health Assessment (Mandatory)

- Change posture: `Feature`
- Current design issue found: `No`. There is one small duplication risk in team opening (AF-010).
- Structural triggers:
  - **Responsibility overload (ruled out).** The row gains one child component and one prop. The Org collection,
    which would have needed an extraction, is out of scope.
  - **Authoritative boundary (ruled out by design).** The resolver calls `ProjectTaskService`, never
    `TaskExecutionResourceService`.
  - **Capability-area reuse (applied).**
    - Live updates reuse `/ws/projects`.
    - The highlight reuses the existing `task-live` keyframes and `LIVE_HIGHLIGHT_MS`.
    - The summary text reuses `taskSummaryLabel`.
    - The reveal reuses `revealTool` / start tools.
  - **Repeated coordination (applied).**
    - Two host trees need the same worker → Task lookup and the same locate call. One composable owns that.
    - The summary button is its own component, so the row stays focused on row anatomy.
  - **Ambiguous boundary (ruled out).** The query takes explicitly typed agent and team run-ID lists. It never takes
    one generic ID.
  - **Empty indirection (ruled out).** Each new file owns state, a lifecycle or a presentation.
- Root cause classification: `No Design Issue Found`.
- Refactor needed now: `Yes`, limited to the `onSelectTeam` core split (AF-010). It avoids duplicating the
  team-opening sequence in a new action.
- Evidence: AF-010.
- Design response: see file mapping and sequence.
- Intentional deferrals: none.

## Terminology

- **Task worker:** a delegated Agent or Team copy that is the latest assignment (root) of a Task. Only workers get a
  summary. Members and sub-work copies don't.
- **Worker reference:** `{ kind: 'agent', agentRunId }` or `{ kind: 'team', teamRunId }`.
- **Worker Task:** `{ taskId, projectId: string | null, description, status }`, the current Task of a worker.
- **Locate request:** one user locate action, identified by `seq`, that moves through the steps
  `revealed` → `visible` → `done`.

## Legacy Removal Policy (Mandatory)

- Obsolete legacy paths in scope: none. This change only adds; nothing it introduces replaces an existing path.
- Compatibility wrappers / dual paths kept: `None`.

## Persisted Data / State Transition Decision

- Decision: `Not Affected`.
  - Server: read only (Task files and the execution-resource view).
  - Client: the Projects tab choice is written through the existing `projectsPanelStore.choose`. It uses the same
    key and the same shape.

## Data-Flow Spine Inventory

| Spine ID | Scope | Related Behavior | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | BEH-001, BEH-004 | Agent / Team host tree renders Task-worker rows | Summary line under the name | `taskWorkerTaskStore` (client) / `ProjectTaskService` (server) | Shows the worker's current Task from server data |
| DS-002 | Primary End-to-End | BEH-003, BEH-006, BEH-009 | Summary click / Enter / Space | Card centred, focused, highlighted | `taskLocatorStore` | The locate journey |
| DS-003 | Return-Event | BEH-005 | Server commit (`task_upserted` / `task_removed` / `project_removed` / `connected`) | Summary updated or removed | `taskWorkerTaskStore` | Liveness |
| DS-004 | Primary End-to-End | BEH-009 (REQ-012) | Summary click on a page with no shell | Run opened, then DS-002 continues | host tree component + `taskLocatorStore` | Pages without a right panel |
| DS-005 | Bounded Local | BEH-009 | Locate request `seq` | `done` or superseded / expired | `taskLocatorStore` | The step order across the surfaces |

## Primary Execution Spine(s)

- DS-001:
  `Host tree (AgentRunTaskRows | WorkspaceTeamExecutionTree) -> useTaskWorkerTasks -> taskWorkerTaskStore (batched) -> GraphQL taskWorkerTasks -> ProjectTaskService.currentTasksOfTaskWorkers -> TaskExecutionResourceService.rootTaskLocationOf + Task read -> row summary`
- DS-002:
  `TaskWorkerTaskSummary (button) -> host tree locate -> taskLocatorStore.locate (picker choice + request) -> WorkspaceToolShell reveal -> ProjectsPanel board view -> Project/Temp board makes Task visible -> ProjectTaskRow scroll + focus -> located highlight (2.4 s)`
- DS-004:
  `TaskWorkerTaskSummary -> host tree locate -> taskLocatorStore (no shell registered) -> host "open run" action (onSelectRun | onOpenTeamRun) -> route with shell mounts -> DS-002 from the reveal step`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | A host tree derives worker references from its listed Task-worker rows and registers interest. The store sends one query per batch of unknown workers. The server answers each worker from its index and reads that Task. Rows render the summary when the answer is non-null. | Worker reference, Worker Task | `taskWorkerTaskStore`; server `ProjectTaskService` | Feed retention, node rebinding, row → reference mapping |
| DS-002 | The click places a request: the picker choice is saved and the request is stored. The shell reveals Projects (opening start tools when needed). The panel leaves a Task view. The board for the chosen scope waits for its list, makes the Task visible (search, Cancelled lane, Show all) and marks it `visible`. The matching card scrolls to the centre, focuses its button and completes the request, which sets the located highlight for 2.4 s. | Locate request, located highlight | `taskLocatorStore` | Reduced motion, drawer presentation |
| DS-003 | Every feed message reaches the store. `connected` re-reads every interested worker. `task_upserted` re-reads the workers whose cached `taskId` equals the Task's ID, or whom the Task's `root` names. `task_removed` re-reads the workers caching that Task. `project_removed` re-reads the workers whose cached Task has that `projectId`. A response for a key is applied only if it answers that key's latest request (per-key read epoch). | Worker Task | `taskWorkerTaskStore` | — |
| DS-004 | With no shell registered, the host tree also opens its run, as clicking the run row does, without collapsing. The request waits; when the route's shell mounts and registers, it reveals Projects and DS-002 continues. | Locate request | host tree + `taskLocatorStore` | Request expiry |
| DS-005 | `locate` → step `pending`; shell reveal → `revealed` (idempotent per seq); board → `visible`; card → `done` (request cleared, highlight set). A newer locate replaces the request and clears the previous highlight. A request that isn't `done` within 10 s expires. The board's step runs only when no read of its list is in flight (a board that just mounted waits for the read its mount started; an already-open board uses its live list); if the Task is absent from that list, the board does nothing and the request expires (no separate `drop` branch: AR-004, P-002). | — | `taskLocatorStore` | — |

## Spine Actors / Main-Line Nodes

- Host tree components (Agent, Team)
- `useTaskWorkerTasks`
- `taskWorkerTaskStore`
- GraphQL `taskWorkerTasks`
- `ProjectTaskService.currentTasksOfTaskWorkers`
- `TaskWorkerTaskSummary`
- `taskLocatorStore`
- `WorkspaceToolShell`
- `ProjectsPanel`
- `ProjectTaskBoard` / `TempTaskBoard`
- `ProjectTaskRow`

## Ownership Map

- **`ProjectTaskService.currentTasksOfTaskWorkers`**
  - Owns: the authoritative answer per worker. It waits for `resources.load()`, uses `rootTaskLocationOf`, reads the
    Task and maps it to the Worker Task view.
  - Never: writes, wakes runs or scans Tasks.
- **GraphQL `taskWorkerTasks` resolver**
  - A thin transport: it maps argument lists to worker references and the result to GraphQL types, and wraps the call
    in `withProjectErrors`.
- **`taskWorkerTaskStore`** (client)
  - Owns: the cache, per-worker interest counts, batched fetching, invalidation from the feed, feed retention while
    any interest exists, and clearing on node rebinding.
  - It is the single client authority for the worker → Task answer.
- **`useTaskWorkerTasks`**
  - Owns: the component lifecycle of interest (register / release with the listed rows) and the row → reference
    mapping.
  - Exposes `taskOf(row)` and `locate(task, openRun)`.
- **`TaskWorkerTaskSummary.vue`**
  - Owns: the summary button's presentation, label, tooltip and accessible name, and its event isolation (stops
    click / Enter / Space from reaching the row).
- **`taskLocatorStore`**
  - Owns: the locate request lifecycle (DS-005), the shell-presence count, the located highlight with its timer, and
    the picker choice at locate time (through `projectsPanelStore.choose`).
- **`WorkspaceToolShell`**
  - Owns: the reveal (docked / drawer / start tools). It registers presence.
- **`ProjectsPanel`**: owns the board / Task view switch.
- **Boards**: own the visibility of a Task within their filters.
- **`ProjectTaskRow`**: owns scroll, focus and the located styling of its card.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| GraphQL `taskWorkerTasks` resolver | `ProjectTaskService` | Transport | Lookup rules, Task reads |
| `useTaskWorkerTasks` | `taskWorkerTaskStore`, `taskLocatorStore` | Component lifecycle and row mapping shared by two hosts | Caching or invalidation |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By | Scope | Notes |
| --- | --- | --- | --- | --- |
| Already-selected branch of `onSelectTeam` duplicated in the new open path | Shared core | `openTeam` core inside `useWorkspaceHistorySelectionActions.ts` | In This Change | `onSelectTeam` behaviour unchanged |
| Dead code in touched files | Implementer checks touched files (Core Principle 7) | — | In This Change | Record any finding with evidence in the implementation handoff |

## Return Or Event Spine(s) (If Applicable)

- DS-003:
  `ProjectChangePublisher (server commit) -> /ws/projects -> projectChangeFeed.deliver -> taskWorkerTaskStore.applyChange -> batched re-read -> rows re-render`

## Bounded Local / Internal Spines (If Applicable)

- **Parent `taskLocatorStore`.**
  - Chain: `locate(seq) -> pending -> revealed (shell) -> visible (board) -> done (card) | superseded | expired (10 s)`
  - Why it matters: the surfaces mount at different times (tab switch, drawer, route change in DS-004, list load). One
    explicit step order replaces the reference's timing window. It also stops a stale request from making the panel
    jump later.
- **Parent `taskWorkerTaskStore`.**
  - Chain: `interest(+) -> queue unknown keys -> microtask flush -> one query (bindingRevision-guarded; each key stamped with its read epoch) -> cache (apply a key's answer only if its epoch is still the latest)`
  - Invalidation: `applyChange (connected | task_upserted | task_removed | project_removed) -> requeue affected keys (new epoch)`.
  - Release: `interest(0) -> drop the entry; last interest -> release the feed`.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Feed retention | DS-001, DS-003 | `taskWorkerTaskStore` | `getProjectChangeFeed().retain()` while interest > 0 | The feed is open only while it is retained | Rows silently stale |
| Node rebinding | DS-001 | `taskWorkerTaskStore` | Clear the cache and re-read the interested workers on a `bindingRevision` change | Remote nodes | Wrong node's data |
| Row → worker reference mapping | DS-001 | `useTaskWorkerTasks` | Transient row: `task_agent` (with `agentRunId`) → agent, `task_team` (with `teamRunIdForNode`) → team, otherwise null; the server answers null for sub-work copies and collaborators | Single rule for which rows can have a summary | Members get summaries |
| Name-line elbow anchor | DS-001 | Row components | `WorkspaceHierarchyBranches` prop `anchor: 'center' \| 'name-line'` | REQ-002 | Deep CSS overrides duplicated |
| Reduced motion | DS-002 | `ProjectTaskRow` | Instant scroll; static highlight (existing CSS pattern) | Spec | — |

## Ownership Boundaries

- **Server.** The resolver depends only on `ProjectTaskService`. `ProjectTaskService` depends on
  `TaskExecutionResourceService` (already does) and on its Task store reads.
- **Client data.** Components never call the GraphQL query. They depend on `useTaskWorkerTasks`, which depends on
  `taskWorkerTaskStore`.
- **Client locate.**
  - Rows emit `locate-task`. The host tree calls `useTaskWorkerTasks().locate(task, openRun)`, which calls
    `taskLocatorStore.locate`.
  - Projects surfaces read `taskLocatorStore` and advance their own step.
  - The tree never touches Projects components, and Projects components never touch the tree.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `ProjectTaskService.currentTasksOfTaskWorkers` | `TaskExecutionResourceService.rootTaskLocationOf`, Task store | GraphQL resolver | Resolver → `TaskExecutionResourceService` | Extend the service method |
| `taskWorkerTaskStore` | Cache, queue, Apollo query, feed retention | `useTaskWorkerTasks` (and `projectChangeFeed.deliver`) | Components → Apollo query; components → feed | Extend the store API |
| `taskLocatorStore` | Request steps, highlight timer, shell count, picker choice | Host trees (via the composable), shell, panel, boards, card | Tree → `projectsPanelStore.choose` directly; boards → shell | Extend the store API |

## Dependency Rules

- Allowed:
  - `components/workspace/history/*` → `composables/projects/useTaskWorkerTasks`.
  - `useTaskWorkerTasks` → `taskWorkerTaskStore` and `taskLocatorStore`.
  - `taskLocatorStore` → `projectsPanelStore`.
  - `WorkspaceToolShell`, `components/projects/**` → `taskLocatorStore`.
  - `projectChangeFeed` → `taskWorkerTaskStore.applyChange`.
- Forbidden:
  - Tree components importing Projects components or `projectTaskStore`.
  - Projects components importing tree components.
  - Any component running the `taskWorkerTasks` query directly.
  - Adding Task data to `AgentRunTaskTreeRow` or collaboration contexts. That is a different subject.
  - Changing the `teamStatus` computation.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| GraphQL `taskWorkerTasks(agentRunIds: [String!]!, teamRunIds: [String!]!): [TaskWorkerTask!]!` | Worker → current Task | One batched read | Two explicitly typed lists | `TaskWorkerTask { workerKind: String! ("agent" \| "team"), workerRunId: String!, task: TaskWorkerTaskView }`; `TaskWorkerTaskView { taskId: String!, projectId: String, description: String!, status: ProjectTaskStatus! }` (nullable `task`) |
| `ProjectTaskService.currentTasksOfTaskWorkers(workers: readonly TaskExecutionReference[]): Promise<TaskWorkerTaskResult[]>` | same | Await load; per worker: `rootTaskLocationOf` → `readTaskChangeView(location)` → view. Null when the worker has no root Task, or when the Task **or its Project** no longer exists (`readTaskChangeView` already maps `PROJECT_NOT_FOUND` to null). One worker never fails the batch: an unexpected error for a worker is logged and that worker answers null | `TaskExecutionReference` (`{agentRunId}` \| `{teamRunId}`) | Domain types in `projects/domain/models.ts`: `TaskWorkerTaskView`, `TaskWorkerTaskResult = { execution, task: TaskWorkerTaskView \| null }` |
| `taskWorkerTaskStore.retain(refs): () => void`, `taskOf(ref)`, `applyChange(message)` | Client cache | Interest, read, invalidation | `TaskWorkerRef` (`{kind:'agent',agentRunId}` \| `{kind:'team',teamRunId}`) | `taskOf` → `TaskWorkerTask \| null \| undefined` (undefined = not known yet) |
| `useTaskWorkerTasks(rows: () => readonly TaskWorkerRow[])` → `{ taskOf(row), locate(task, openRun) }` | Host lifecycle | Interest tied to listed rows | Row objects of the host | — |
| `taskLocatorStore.locate(task, openRun)`, `registerShell(): () => void`, `markRevealed(seq)`, `markVisible(seq)`, `complete(seq)`, state `request`, `located` | Locate request | DS-005 | `TaskWorkerTask` | `openRun` is called only when no shell is registered |
| `TaskWorkerTaskSummary` props `{ task, selected }`, emits `locate` | Summary button | Presentation and event isolation | — | — |
| `WorkspaceHierarchyBranches` prop `anchor?: 'center' \| 'name-line'` (default `center`) | Elbow placement | REQ-002 | — | `name-line`: elbow at 1.075rem; the ancestor-less `::before` ends at `calc(1.075rem + 0.5px)` (reference values) |
| `useWorkspaceHistorySelectionActions.onOpenTeamRun(team, workspaceId)` | Opening a team run | REQ-012 | `TeamTreeNode` | Like `onSelectTeam`, but an already-selected team only navigates (no toggle) |

## Interface Boundary Check

| Interface | Responsibility Is Singular? | Identity Shape Is Explicit? | Ambiguous Selector Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `taskWorkerTasks` | Yes | Yes (two typed lists; result carries `workerKind`) | Low | — |
| `currentTasksOfTaskWorkers` | Yes | Yes | Low | — |
| `taskLocatorStore` API | Yes | Yes (seq) | Low | — |
| `onOpenTeamRun` | Yes | Yes | Low | — |

## Main Domain Subject Naming Check

| Node / Subject | Proposed Name | Natural? | Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Worker → Task read | `taskWorkerTasks` / `currentTasksOfTaskWorkers` | Yes ("Task worker" is used by product and spec) | Low | — |
| Client cache | `taskWorkerTaskStore` | Yes | Low | — |
| Locate state | `taskLocatorStore` | Yes (matches the reference's name; new semantics) | Low | — |
| Summary component | `TaskWorkerTaskSummary.vue` | Yes | Low | — |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area | Decision | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Worker → Task answer | `TaskExecutionResourceService` index | Reuse via `ProjectTaskService` | Authoritative, O(1) | — |
| Liveness | `/ws/projects` + `projectChangeFeed` | Reuse / extend `deliver` | Carries `root` | — |
| Summary text | `utils/projects/taskSummary.taskSummaryLabel` | Reuse | Spec names it | — |
| Reveal | `WorkspaceToolShell.revealTool`, start tools | Reuse | Spec: "like the strip" | — |
| Picker persistence | `projectsPanelStore.choose` | Reuse | "Remembered like a manual pick" | — |
| Highlight values | `ProjectTaskRow` `task-live` keyframes, `LIVE_HIGHLIGHT_MS` | Reuse | Spec | — |
| Worker cache | `projectTaskStore` | Create new store | `projectTaskStore` caches whole lists per scope; a per-worker answer is a different subject with its own interest lifecycle | Mixing them would overload `projectTaskStore` |
| Locate request | none | Create new store | Spans the tree and Projects surfaces that don't share a component tree | — |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision | Notes |
| --- | --- | --- | --- | --- | --- |
| Server Projects (`src/projects`, `src/api/graphql/types/project-tasks.ts`) | Worker → current Task read | DS-001 | `ProjectTaskService` | Extend | Additive |
| Web Projects data (`stores/`, `graphql/queries/projectTaskQueries.ts`, `services/projects/projectChangeFeed.ts`) | Worker cache, locate request | DS-001..005 | new stores | Extend | — |
| Web Projects UI (`components/projects/**`) | Panel, boards, card steps | DS-002 | `taskLocatorStore` | Extend | Compact mode only |
| Web layout (`components/layout/WorkspaceToolShell.vue`) | Reveal + presence | DS-002, DS-004 | `taskLocatorStore` | Extend | — |
| Web workspace history (`components/workspace/history/**`, `composables/useWorkspaceHistorySelectionActions.ts`) | Rows, summary, host open actions | DS-001, DS-002, DS-004 | `useTaskWorkerTasks` | Extend | Agent and Team hosts |
| Localization, Tailwind config | Strings, CSS generation | — | — | Extend | — |

## Draft File Responsibility Mapping

See the final mapping (no material change after extraction).

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? | Overlapping Representations Removed? | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Summary button | `components/workspace/history/TaskWorkerTaskSummary.vue` | Workspace history | Own presentation and event isolation; ready for reuse by a later Org follow-up | Yes | Yes | A row component |
| Worker lookup + locate wiring (2 hosts) | `composables/projects/useTaskWorkerTasks.ts` | Web Projects data | Same lifecycle | Yes | Yes | A cache |
| `TaskWorkerRef` / `TaskWorkerTask` types | `types/project.ts` (beside the Task types) | Web Projects data | Used by store, composable, components | Yes | Yes (no copy of `ProjectTask`) | A Task list type |

## Shared Structure / Data Model Tightness Check

| Shared Structure | One Clear Meaning Per Field? | Redundant Attributes Removed? | Overlap Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `TaskWorkerTaskView` (server / GraphQL) | Yes: `projectId` null ⇔ Temp task | Yes (no root, files, timestamps) | Low | — |
| `TaskWorkerTask` (client) | Yes | Yes | Low | — |
| `TaskWorkerRef` | Yes (discriminated) | Yes | Low | — |

## Final File Responsibility Mapping

| File | Owning Subsystem | Owner / Boundary | Concrete Concern | Why One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/projects/domain/models.ts` (Modify) | Server Projects | Domain types | `TaskWorkerTaskView`, `TaskWorkerTaskResult` | Domain view types live here | `TaskExecutionReference` |
| `autobyteus-server-ts/src/projects/services/project-task-service.ts` (Modify) | Server Projects | `ProjectTaskService` | `currentTasksOfTaskWorkers` | Projects API owner | Task read helpers already there |
| `autobyteus-server-ts/src/api/graphql/types/project-tasks.ts` (Modify) | Server API | Resolver | `taskWorkerTasks` query + types | Projects Task transport | `ProjectTaskStatus` enum |
| `autobyteus-web/graphql/queries/projectTaskQueries.ts` (Modify) | Web Projects data | — | `GetTaskWorkerTasks` document | Existing query file | — |
| `autobyteus-web/types/project.ts` (Modify) | Web Projects data | — | `TaskWorkerRef`, `TaskWorkerTask` | Task types live here | — |
| `autobyteus-web/stores/taskWorkerTaskStore.ts` (Add) | Web Projects data | `taskWorkerTaskStore` | Cache, interest, batching, per-key read epochs, invalidation (`connected`, `task_upserted`, `task_removed`, `project_removed`), feed retention, rebinding | One owner | types |
| `autobyteus-web/stores/taskLocatorStore.ts` (Add) | Web Projects data | `taskLocatorStore` | Request steps, shell presence, highlight, picker choice | One owner | types |
| `autobyteus-web/composables/projects/useTaskWorkerTasks.ts` (Add) | Web Projects data | Composable | Interest lifecycle, row → ref mapping, locate wiring | Shared by the Agent and Team hosts | types |
| `autobyteus-web/services/projects/projectChangeFeed.ts` (Modify) | Web Projects data | Feed | Deliver also to `taskWorkerTaskStore` | One line | — |
| `autobyteus-web/components/workspace/history/TaskWorkerTaskSummary.vue` (Add) | Workspace history | Summary button | Visuals, strings, isolation | Own concern | `taskSummaryLabel` |
| `autobyteus-web/components/workspace/history/WorkspaceTransientExecutionRow.vue` (Modify) | Workspace history | Row | `task` prop, `locate-task` emit, summary under the name, name-line chevron/elbow, accessible name | — | Summary component, branches anchor |
| `autobyteus-web/components/workspace/history/WorkspaceHierarchyBranches.vue` (Modify) | Workspace history | Branches | `anchor` prop | — | — |
| `autobyteus-web/components/workspace/history/AgentRunTaskRows.vue` (Modify) | Workspace history | Agent host | Use composable; pass `task`; locate with `openRun = emit('open-run')`. `open-run` is a new emit, distinct from the existing `select-run`, which keeps the last selected child (AR-002) | — | Composable |
| `autobyteus-web/components/workspace/history/WorkspaceTeamExecutionTree.vue` (Modify) | Workspace history | Team host | Use composable; pass `task`; emit `open-run` for REQ-012 | — | Composable |
| `autobyteus-web/components/workspace/history/WorkspaceHistoryWorkspaceSection.vue` (Modify) | Workspace history | Section | Wire `AgentRunTaskRows`' `open-run` → `selectAgentRun(run)` (the run row's own open path: clears the selected child, then `onSelectRun`). Wire the Team tree's `open-run` → `actions.onOpenTeamRun(team, workspaceId)` | — | — |
| `autobyteus-web/components/workspace/history/workspaceHistorySectionContracts.ts` (Modify) | Workspace history | Contracts | Add `onOpenTeamRun` | — | — |
| `autobyteus-web/composables/useWorkspaceHistorySelectionActions.ts` (Modify) | Workspace history | Actions | Split the `openTeam` core; add `onOpenTeamRun` | — | — |
| Wiring site that builds the section actions (Modify; implementer locates the caller of `useWorkspaceHistorySelectionActions`) | Workspace history | — | Pass `onOpenTeamRun` | — | — |
| `autobyteus-web/components/layout/WorkspaceToolShell.vue` (Modify) | Layout | Shell | `registerShell`; on a request in `pending`: open start tools on a start surface, then `revealTool('projects')`, then `markRevealed` | — | — |
| `autobyteus-web/components/projects/panel/ProjectsPanel.vue` (Modify) | Projects UI | Panel | New request seq → `view = board` | — | — |
| `autobyteus-web/components/projects/ProjectTaskBoard.vue` (Modify) | Projects UI | Board | In compact mode, for its Project: wait until no read of its list is in flight (`initialPending` and `refreshPending` false). A board that just mounted therefore waits for the read its mount started; an already-open board uses its live list. Then, if the Task is in the list: Cancelled → `showCancelled`; clear a hiding search; `markVisible`. If the Task is absent, do nothing (the request expires). Never decide on the cached snapshot shown while the read is in flight | — | — |
| `autobyteus-web/components/projects/TempTaskBoard.vue` (Modify) | Projects UI | Board | As above (same wait until no read is in flight), plus Done past `DONE_LIMIT` → `showAllDone` | — | — |
| `autobyteus-web/components/projects/ProjectTaskRow.vue` (Modify) | Projects UI | Card | In `select` activation, on `visible` for its Task: after the DOM settles, scroll to the centre (smooth / instant), focus the button, `complete(seq)`; `is-located` class from `located` (the `task-live` animation, restarted per seq; reduced-motion static) | — | — |
| `autobyteus-web/localization/messages/{en,zh-CN}/workspace.ts` (+ generated catalogs per the repo's localization workflow) (Modify) | Localization | — | `workspace.history.copyTask.locate`, `workspace.history.copyTask.accessible` | — | — |
| `autobyteus-web/tailwind.config.js` (Modify) | Build | — | Add `"./utils/**/*.{js,ts}"` to `content` | — | — |
| Tests (Add / Modify) | — | — | See guidance | — | — |
| Docs: `autobyteus-web/docs/projects.md`, `autobyteus-server-ts/docs/modules/projects.md` | Docs | — | Delivery syncs | — | — |

## Applied Patterns (If Any)

- **Small state machine** in `taskLocatorStore` (DS-005), owned by one store.
- **Ref-counted interest + batched read** in `taskWorkerTaskStore`. It is required: Agent-host and Team-host trees,
  and several tree instances per workspace, list and unlist rows independently, and QR-001 calls for one read per
  batch. Per-key read epochs (the `projectTaskStore` pattern) keep an older answer from overwriting a newer one.

## Target Subsystem / Folder / File Mapping

The final file mapping above is the folder mapping. New files sit beside their peers:
- stores in `autobyteus-web/stores/`;
- the composable in `composables/projects/`;
- the components in `components/workspace/history/`.

The layout is flat, which matches the existing structure; no new folders.

## Folder Boundary Check

| Path / Folder | Intended Structural Depth | Ownership Boundary Is Clear? | Mixed-Layer Or Over-Split Risk | Justification |
| --- | --- | --- | --- | --- |
| `autobyteus-web/stores/` | Main-line state | Yes | Low | Existing convention |
| `autobyteus-web/composables/projects/` | Off-spine lifecycle | Yes | Low | Existing Projects composables |
| `components/workspace/history/` | Presentation | Yes | Low | Existing |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Data source | `taskWorkerTasks(agentRunIds:["a1"], teamRunIds:["t1"])` → `[{workerKind:"agent",workerRunId:"a1",task:{taskId,projectId:null,description,status:"IN_PROGRESS"}}, {workerKind:"team",workerRunId:"t1",task:null}]` | Each row fetching every Project's Task list and matching `root` in the browser (the reference) | REQ-009, QR-001, `DESIGN.md` |
| Invalidation | `task_upserted` for Task B with `root.kind==='agent' && root.ingressAgentRunId==='a1'` → re-read `agent:a1` (it now shows B) | Patching the cached Task from the message without asking the server which Task is current | A rename of an old closed Task must not steal the summary |
| Project deleted | `project_removed {projectId:'p1'}` → re-read every worker whose cached Task has `projectId==='p1'` → server answers `task:null` → summary removed; other workers in the batch still resolve | Ignoring `project_removed`; letting `PROJECT_NOT_FOUND` fail the whole batched query | REQ-009, AC-015, QR-001 (AR-001) |
| Row markup (transient) | `<div role="treeitem" aria-selected …>` → name column `<span class="min-w-0 flex-1"><span class="block truncate">name</span><TaskWorkerTaskSummary/>…</span>`; dot and icon stay in `h-5` boxes | Summary as a sibling row element; `aria-selected` on the summary; dot centred across both lines | QR-003, PMU-018/019 |
| Locate request | `locate()` → `{seq:7, step:'pending', taskId, scope}`; shell → `revealed`; board → `visible`; card → `done` + `located={taskId, seq:7}` | Timers that wait 180 ms and hope the board has loaded | Deterministic and testable |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| A client fallback scan of the Task lists when the query fails | Resilience | Rejected | No summary until the next successful read (`connected` re-reads) |

## Derived Layering (If Useful)

N/A. The spines are sufficient.

## Change / Refactor Sequence

1. **Server, independent of other branches.**
   - Add the domain types, `ProjectTaskService.currentTasksOfTaskWorkers` and the GraphQL query and types.
   - Add unit tests for: agent / team root; follow-up Task; a sub-work copy → null; a closed current Task; a deleted
     Task → null; a deleted Project → null while the other workers in the same call still resolve; an unknown ID → null.
   - Add a GraphQL API test.
2. **Web data, independent.** Types, the query document, `taskWorkerTaskStore` (with feed `deliver`),
   `taskLocatorStore`, `useTaskWorkerTasks`; unit tests.
3. **Web Projects surfaces, independent.** Shell registration and reveal, panel, boards, card; component tests.
   Tailwind `content`.
4. **Tree rows, now, in this worktree (user direction 2026-10-11: each team works in its own worktree in
   parallel; nothing waits on another branch).**
   - Branches anchor; `TaskWorkerTaskSummary`; transient row; Agent and Team hosts.
   - `onOpenTeamRun` split and wiring.
   - Strings; component tests.
   - Write the row change so it merges cleanly with the aggregate-status work: keep QR-003 exactly. The summary goes
     inside the name column only, under the name text. Don't touch the status-dot box, `teamStatus` or
     `AgentRunTaskTreeRow`. Keep the diff to `WorkspaceTransientExecutionRow.vue` minimal and local.
5. **Integration.** Before the branch goes to delivery, rebase on the latest `origin/personal`. If
   `codex/delegated-team-aggregate-status` has merged by then, resolve the overlap (expected to be small: their
   `TeamAggregateStatusDot` / `teamStatus` prop beside our `task` prop and summary) and re-run the row specs. If it
   merges after us, that branch rebases on ours. Either order is fine.
6. **Validate end to end** (on the rebased branch).
   - Browser checks against VIS-001..014.
   - REQ-012 from the Agents page.
   - Live update checks.
   - Existing reveal specs and PMU-018/019.

## Key Tradeoffs

- **Separate per-worker server read vs. Task data on the collaboration views.** The collaboration views belong to
  the root-execution domain. Adding Task descriptions there would couple the Projects data into three stream
  contracts and need new events for renames. The Projects read plus the existing feed keeps one owner and needs no
  schema change.
- **Re-read on invalidation vs. patching from the message.** One small batched read per relevant change keeps the
  server rule authoritative (follow-up vs. old Task). The cost is bounded by the number of shown workers.
- **Opening the host run on pages without a panel (REQ-012).** This changes the center on those pages only, and it
  matches every other tree click.

## Risks

- RSK-001: the overlapping branch. Mitigated by the QR-003 constraints (disjoint parts of the row) and a rebase at
  integration (step 5), whichever branch lands second.
- Drawer and tab mount timing for scroll/focus. The card waits for its `visible` step and for the DOM to settle (for
  example, the next animation frame after `nextTick`); browser validation covers the docked, drawer and reopened
  cases.
- Feed socket held while Task workers are shown. Accepted; it is ref-counted and already used by the Projects
  surfaces.

## Guidance For Implementation

- **Visible values.** Take every visible value from the spec. Copy the summary classes from the reference row:
  `-mx-1 mt-0.5 block max-w-full truncate rounded px-1 text-left text-[0.6875rem] font-normal leading-4 underline-offset-2 hover:text-indigo-700 hover:underline focus-visible:ring-2 focus-visible:ring-indigo-500`;
  `text-indigo-700` when selected, else `text-gray-500`.
- **Row constraints (QR-003).**
  - `aria-current` / `aria-selected` stay on the outer row only.
  - The summary never carries them.
  - The row stays focusable.
  - Click / Enter / Space on the summary are stopped from reaching the row.
- **Accessible names.** The row's accessible name appends `, ${t('workspace.history.copyTask.accessible', { title })}`
  only when a summary is shown. The summary's `title` and `aria-label` use `workspace.history.copyTask.locate`.
- **Projects availability.** Show summaries only when the Projects tab is available
  (`isFeatureAvailableInRuntime('projects')`).
- **Request expiry.** 10 s. Only the latest request matters.
- **Highlight.** `located` is cleared after `LIVE_HIGHLIGHT_MS`; a new `complete` replaces it immediately.
- **Org rows.** Don't change them. Org-run Task workers are out of scope (DEC-001 b) and are a follow-up candidate.
- **Localization.** Follow the repository's localization workflow for the generated catalogs and their checks.
- **Tests, following TESTING.md.**
  - Server: unit tests for `currentTasksOfTaskWorkers`, and a GraphQL test.
  - Web unit tests:
    - store batching, interest release and invalidation (`connected` / `upserted` root match / cached `taskId` /
      `task_removed` / `project_removed` / rebinding), and that a stale response for a key never overwrites a newer one;
    - the locator steps (supersede, expire).
  - Web component tests:
    - summary presence per row kind under Agent and Team hosts (worker / member / collaborator / sub-work / unknown);
    - event isolation and accessible names in en and zh-CN;
    - boards: search cleared or kept, Cancelled, Show all;
    - card focus and highlight, with only the latest highlighted;
    - shell reveal: docked, hidden, drawer, start surface;
    - REQ-012 `openRun` called only without a shell; for the Agent host it opens the run's own conversation (the
      selected child is cleared, as for a run-row click), and the Team host never collapses an already-selected team;
    - boards act only when no read of their list is in flight (a stale cached snapshot never drives Cancelled / Show all).
  - Keep the existing reveal / tree-state specs and PMU-018 / PMU-019 green.
- **Dead code.** Record any dead code found in touched files, with evidence, in the implementation handoff.
