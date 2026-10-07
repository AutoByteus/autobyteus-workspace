# Design Spec — `project-manager-ux`

## Solution And Approval Basis

- Current solution revision ID: `SR-005` (design revision after ARCH-REV-001; requirements basis SR-003 unchanged)
- Approved requirements baseline / user-approval reference: `requirements-doc.md` SR-003, approved by the user 2026-10-07 ("…other requirements are already clear, clarified. Yes, now you can go ahead now."). The user delegated the event design: "it's up to you how you design this for events".
- Behavior-defining supplements: Product UI/UX spec `project-manager-ux`, rounds 1 and 2 (design repo `/Users/normy/autobyteus_org/autobyteus-web-design`, `tickets/done/project-manager-ux/ui-ux-spec.md`, VIS-001..018; round 1 `1fcf8f8`/`eb60aba`, round 2 `492d37a`/`8cd41f8`). User-confirmed. DEC-006 deviation: worker status replaces "Stopped".
- Design status: `Ready`
- Canonical investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-manager-ux/tickets/in-progress/project-manager-ux/investigation-notes.md` (Architecture Investigation Findings A1–A14)
- Authorities read (2026-10-07): `references/architecture-design.md`, `design-principles.md`, `/DESIGN.md`, `autobyteus-server-ts/docs/design/data_migration_guideline.md`
- Project design-principle conflicts or discrepancies: None

## Current-State Read

- **Writes:** Projects and Tasks are written only through `ProjectService` and `ProjectTaskService` (A2). Every run-resource change commits through `TaskAgentResourceService.swap()` (A3).
- **No push:** the web reads Projects and Tasks by GraphQL snapshot and refreshes manually (A12). The server has app-level websocket hubs but none for Projects (A1).
- **No worker on the Task view:** Task views carry no worker (A14). Run resources hold the worker's identity and start/closed state but no name (A4).
- **Live status:** worker statuses live in active roots (A7). Each root reports changes through one root-neutral chokepoint (A6).
- **Left-panel navigation:** owned by `resolveSelectionRoute` and the history selection actions. The standalone task-row click skips navigation when its host is already selected (F-006, A11).

The owners are healthy. The change adds a change-publication concern beside the existing write owners and a live-status query on the existing active-root boundary.

## Task Size And Architectural Risk (Mandatory)

- Task size: `Large`
- Size rationale:
  - Server: a new websocket route and hub; publication from two Project services and the resource service; a Task-view root DTO; a new list query; an AdHocTaskStore list; the recipient address on assignments (domain/schema/link input); a root boundary status query (three roots plus the lifecycle); status-change notification; composition wiring.
  - Shared contracts: the team status fold moves into the contracts package.
  - Web: a change-feed client, the task and project stores, the Temp tasks route/board/page, the root line component, root navigation, the F-006 fix, localization.
  - Docs.
- Architectural risk: `High`
- Risk rationale:
  - a new realtime contract;
  - a persisted shape change (optional field and reader);
  - a cross-subsystem dependency (Task side asks the runtime for status);
  - concurrency between snapshot reads and pushed events.
- Escalation trigger: return a Design Impact if any of these turns out true:
  - any Task or Project write path bypasses the two services or `swap()`;
  - a root cannot answer `taskExecutionStatus` without new runtime state;
  - publication volume from status changes is measurably harmful.

## Architecture Investigation Evidence

See investigation notes A1–A14. Key mapping:

| Evidence | Decision Supported |
| --- | --- |
| A1 | `/ws/projects` + `ProjectChangeHub`, following the notification-hub pattern |
| A2, A3 | Publish from the services' committed writes and `swap()` |
| A4, A5 | Record `recipientAddress` on assigned entries; no stored-tree lookups |
| A6–A9 | Worker status computed on demand by the hosting root; changes announced from `onAgentStatus`; one shared team fold |
| A10 | Server-computed worker status, not left-panel state |
| A11 | Fix F-006 in `AgentRunTaskRows`; root opening reuses selection actions and `resolveSelectionRoute` |
| A12–A14 | Generic store scope (Project or no Project); `tasksWithoutProject` query; `root` on the Task view |

## Intended Change

1. **Task view with root (server):** Every Task view (Project Task and Task with no Project) gains `root`, derived from the Task's latest `assigned` entry:
   - identity: kind, ingress run, team run, host root;
   - assignment state: started/starting/failed + error, closed;
   - display address;
   - the worker's live status.

   A new `tasksWithoutProject` query lists Tasks with no Project.
2. **One generic change feed (server → web):** A per-node websocket `/ws/projects` carries:
   - `project_upserted` / `project_removed`;
   - `task_upserted` / `task_removed`, the same for every Task with a scope `{projectId}` or `{noProject}`;
   - `task_worker_status`.

   The web keeps one task model and applies the events. Boards, the Temp tasks board, Task pages and counts are views of it.
3. **Worker status = the worker's own status** (DEC-006):
   - The hosting root answers on demand (agent: its status; team: the shared fold over its members).
   - Inactive root or closed worker = offline.
   - Changes are announced from the status chokepoint.
4. **Temp tasks UI:** header button, board, read-only page (round 2).
5. **Root line UI:** round 1 with DEC-006 statuses; opening reuses left-panel selection and navigation.
6. **F-006 fix:** in `AgentRunTaskRows`.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Requirement / AC | Trigger | Existing Behavior | Approved Change | Target Path / Spine |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-002 | User | REQ-002, 003, 015; AC-001..004, 019..021 | Agent or UI write of a Project/Task | Manual Refresh only | Live pages | DS-001, DS-003 |
| BEH-003 | User | REQ-004, 009, 013, 016; AC-005..011, 023 | Delegation / start / DONE / reactivation / worker status change | No root shown | Root line with live worker status; open | DS-001, DS-002, DS-004 |
| BEH-004 | User | REQ-004, 016; AC-008, 023 | DONE | Rows leave the left panel | Root Offline, not openable | DS-001 |
| BEH-005 | User | REQ-007, 008; AC-012, 013 | Left-panel row click | F-006 | Every click opens | DS-005 |
| BEH-006 | User | REQ-011..015; AC-016..022 | Projects page, Temp tasks | Not shown | Button, board, page, live | DS-003, DS-006 |

## Relevant Supplemental Task Artifacts

| Artifact | Purpose | Relationship |
| --- | --- | --- |
| `ui-ux-spec.md` (rounds 1–2) + VIS-001..018 | Normative UI | The web realizes it. Mocked boundaries map to DS-001..DS-004. The illustrative route `/projects/no-project` is replaced by `/projects/temp-tasks` (permitted). |
| `product-design-request.md`, `product-design-request-r2.md` | Handoff context | Not normative |

## Task Design Health Assessment (Mandatory)

- Change posture: `Feature`
- Current design issue found: `Yes` (local). F-006 is a `Local Implementation Defect` in `AgentRunTaskRows.select`.
- Structural triggers:
  - **Repeated coordination:** fires if every write site publishes ad hoc. Avoided: publication is a single off-spine concern (`ProjectChangePublisher`) called by the two services and `swap()` only.
  - **Authoritative boundary:** the Task side must ask the runtime for status only through the active-root boundary, never reaching root internals.
  - **Shared-structure tightness:** the team status fold exists only on the web. Moving it into the shared contracts package removes a would-be duplicate.
  - **Ambiguous boundary:** two explicit queries (`projectTasks(projectId)`, `tasksWithoutProject`) instead of one guessing selector. Events carry an explicit scope union.
- Root cause classification: `No Design Issue Found` for the feature; `Local Implementation Defect` for F-006.
- Refactor needed now: `No`, apart from the fold extraction (a move, not a redesign).
- Evidence: A1–A14
- Design response: extend the owners; add one publisher and one hub; move the fold.
- Deferrals:
  - listing helpers on a Task (DEC-007);
  - automatic IN_PROGRESS (DEC-009);
  - names for assignments recorded before this release show the kind only (see Persisted Data).

## Terminology

- **Root:** the Task's latest `assigned` entry: the agent or team the Task was handed to.
- **Worker status:** the root run's own live status (agent: its status; team: folded member status).
- **Scope:** `{projectId}` for a Project Task, `{noProject: true}` for a Task with no Project ("Temp task").
- **Change feed:** the per-node `/ws/projects` stream.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Removed and replaced:
  - the "manual Refresh is the only freshness path" behavior (Refresh stays as an explicit fallback, not as legacy);
  - the duplicated web-only team fold (moved);
  - the `AgentRunTaskRows` conditional emit.
- No dual readers: older entries without `recipientAddress` are read tolerantly and shown without a name; there is no fallback read of trees.

## Persisted Data / State Transition Decision

- Stored subject: `agent_run_resources.json` per Task (Project Task folder or `ad-hoc-tasks/<taskId>/`).
- Change: `assigned` entries gain optional `recipientAddress: string` (the canonical address the assigner delegated to, e.g. `/product_team`). It is written for new assignments only.
- Reader/writer: the current reader is strict (`task-agent-resource-schema.ts`). Per the guideline (§3, "convert strict readers when you touch them") it accepts the optional key: a nonblank string, allowed only on `assigned`. Other unknown keys keep their current handling. The writer emits it exactly when present.
- Semantics: present = the delegated address; absent = "not recorded" (assignments made before this release). No reuse of an existing field.
- Decision: `Directly Usable — No Migration`.
- Rationale:
  - an optional field whose absence has a truthful meaning;
  - no historical fact needs to be backfilled for correctness (a name is presentation);
  - a backfill from stored trees would need per-root reads and still could not name failed starts.
- Accepted consequence: a root recorded before this release shows its kind ("Agent"/"Team") instead of a name. Volume is small: the features are recent betas.
- Guideline §2 checklist:
  1. Need: none.
  2. Availability: unaffected.
  3. Source/target: inspected the released schema and local data (2 ad hoc Tasks).
  4. Disposition: old entries are used as-is.
  5. Commit: the existing atomic update.
  6. Current-only boundary: no old-shape decoder.
  7. Cost: none at startup.
  8. References: an address string only, validated as nonblank.
  9. Evidence: reader/writer key-set tests, plus a mixed old/new file test.
  10. Review: Architecture Reviewer.
- Docs: `docs/modules/projects.md` "Agent Run Resources" (the address is now recorded on assignments).

## Data-Flow Spine Inventory

| Spine ID | Scope | Behavior | Start | End | Governing Owner | Why |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary | BEH-002/003/004/006 | Committed Project/Task/resource write (UI GraphQL, agent tool, delegation, DONE, reactivation, chat deletion) | Web views updated | `ProjectChangePublisher` → `ProjectChangeHub` → web feed client → stores | Live pages |
| DS-002 | Primary | BEH-003 | Agent status change in a root | Root line status updated | `RootTaskExecutionLifecycle` → Task side → publisher | Live worker status |
| DS-003 | Primary (read) | BEH-002/006 | Page load / Refresh / reconnect | Snapshot with roots | GraphQL resolvers → `ProjectTaskService` | Initial and recovery state |
| DS-004 | Primary | BEH-003 | User clicks a root | Worker conversation open, selected | Web `useTaskRootNavigation` → selection actions → `resolveSelectionRoute` | REQ-009 |
| DS-005 | Primary | BEH-005 | Left-panel task row click | Conversation open | `AgentRunTaskRows` → `onSelectRun` → AppLeftPanel route push | F-006 |
| DS-006 | Bounded local | BEH-002/006 | Feed message or snapshot | Consistent store state | Web task store | Ordering with in-flight reads |

## Primary Execution Spine(s)

- DS-001: `Write owner (ProjectService / ProjectTaskService / TaskAgentResourceService.swap) → ProjectChangePublisher (build view) → ProjectChangeHub (broadcast) → /ws/projects → web projectChangeFeed → projectStore / projectTaskStore → Projects list / board / Temp board / Task page`
- DS-002: `Root onAgentExecutionEvent → RootTaskExecutionLifecycle.onAgentStatus → TaskAgentResourcePort.taskExecutionsStatusChanged(hostRoot, chain) → ProjectTaskService → ProjectChangePublisher.workerStatus (status from ActiveCollaborationRootDirectory → root.taskExecutionStatus) → hub → web store → root line`
- DS-003: `Page → projectTaskStore.read → GraphQL projectTasks / tasksWithoutProject → ProjectTaskService.listTasks / listTasksWithoutProject → TaskView (+ root via TaskRootViewBuilder) → store snapshot`
- DS-004: `Root line click → useTaskRootNavigation.open(root) → (agent host: runHistory.openRun + collaboration.selectChild | team host: runHistory.selectTreeRun(member focus) + expand | org host: the existing org actions in WorkspaceAgentOrgHistoryCollection.vue — onInspectAgentOrgExecution(run, agentRunId, address) for a task agent, selectTaskTeam for a task team, extracted into a shared org selection composable when reused) → resolveSelectionRoute → router push`

## Spine Narratives (Mandatory)

| Spine | Narrative | Owner | Off-Spine |
| --- | --- | --- | --- |
| DS-001 | After a write commits, its owner tells the publisher what changed. The publisher builds the current view (re-read after commit, so never speculative) and the hub broadcasts it to every connected client of the node. Task events carry the full Task view with its root; project events carry the Project view with counts. Removals carry identity only. | Publisher (view building), hub (fan-out) | Root view builder; status resolver |
| DS-002 | Every agent status change already reaches the lifecycle. It forwards the task executions containing that agent to the Task side, which picks out those that are assignment roots of a Task. For each, it asks the hosting root for the current worker status and publishes `task_worker_status`. Root shutdown announces all its task executions after it stops admitting, so they report offline. | Lifecycle (detection), Task side (relevance), root (status authority) | Shared fold |
| DS-003 | Reads return the same Task view as events, so the store applies one shape. | `ProjectTaskService` | Root view builder |
| DS-004 | The root carries its host root kind and run, the ingress run and the team run. Navigation reuses exactly what the left panel does for that row type, then the shared route resolution. | Web navigation composable | — |
| DS-006 | The store applies events in arrival order. While a snapshot read for a scope is in flight, events for that scope are queued and replayed onto the arriving snapshot. A reconnect re-reads every loaded scope. | Task store | — |

## Ownership Map

- `ProjectService` / `ProjectTaskService`: write owners; after each committed write they call the publisher (`projectChanged`, `projectRemoved`, `taskChanged(location)`, `taskRemoved(location)`).
- `TaskAgentResourceService`: after `swap()` it calls `taskChanged(location)` (root changes). After `forget()` the owner of the deletion publishes `taskRemoved`.
- `ProjectChangePublisher` (new, `projects/changes/`): owns the message contract and the **publication contract** (AR-001, see "Publication Contract" below):
  - Triggers only mark a subject as changed.
  - Views are built after the triggering dispatch has finished, serialized per subject, and coalesced.
  - State: the pending marks and per-subject chains only; no copies of Task data.
- `ProjectChangeHub` (new): connection registry and broadcast; no business logic.
- `TaskRootViewBuilder` (new, `projects/services/`): picks the latest `assigned` entry and builds the root DTO. Asks the status resolver for live status unless the entry is closed or failed.
- Status resolver (composition-bound function): `(hostRoot, reference) → AgentStatus` via `ActiveCollaborationRootDirectory.resolve(hostRoot)?.taskExecutionStatus?.(reference) ?? "offline"`.
- `RootTaskExecutionLifecycle`: detects status changes per task execution chain; exposes `taskExecutionStatus(reference)` through the adapter (agent: live snapshot; team: shared fold over the copy's members). Not accepting → offline.
- Web `projectChangeFeed` (new service): one socket per window node while Projects is available, with reconnect and re-read signalling.
- Web `projectTaskStore`: snapshots per scope; applies events; computes lanes/counts. Web `projectStore` applies project events.

## Thin Entry Facades

| Facade | Owner Behind | Must Not Own |
| --- | --- | --- |
| `/ws/projects` route | `ProjectChangeHub` | Business logic, auth beyond the shared remote-access check |
| GraphQL `ProjectTaskResolver` | `ProjectTaskService` | Root derivation |
| Root boundary `taskExecutionStatus` (×3 roots) | Lifecycle/adapter | Task facts |

## Removal / Decommission Plan (Mandatory)

| Item | Why | Replaced By | Scope |
| --- | --- | --- | --- |
| `autobyteus-web/utils/workspaceTeamAggregateStatus.ts` fold body | Needed by server and web | `@autobyteus/collaboration-stream-contracts` export; the web module re-exports or imports directly | In This Change |
| `AgentRunTaskRows.select` conditional emit | F-006 | Always emit `select-run`; re-selecting the current run only navigates | In This Change |
| Docs stating "No polling, status push or live subscription" and "no automatic board synchronization" (`autobyteus-web/docs/projects.md`) | Superseded | Live feed section | In This Change |
| Docs "never stores … addresses" (`task-agent-resources.ts` comment, server `projects.md`) | Superseded by `recipientAddress` | Updated text | In This Change |

## Return Or Event Spine(s)

DS-001/DS-002 messages (JSON, one per websocket frame):

```ts
type ProjectChangeMessage =
  | { type: "project_upserted"; project: ProjectView }            // incl. taskCount/openTaskCount
  | { type: "project_removed"; projectId: string }
  | { type: "task_upserted"; scope: TaskScope; task: TaskView }   // TaskView includes root
  | { type: "task_removed"; scope: TaskScope; taskId: string }
  | { type: "task_worker_status"; scope: TaskScope; taskId: string; status: AgentStatus };
type TaskScope = { kind: "project"; projectId: string } | { kind: "no_project" };
```

- A Project Task change also publishes `project_upserted` for its Project (fresh counts).
- `TaskView` matches the GraphQL shapes field for field:
  - Project Task: contextFiles;
  - Task with no Project: referenceFiles.
- `root` (nullable):

```ts
type TaskRootView = {
  kind: "agent" | "team";
  recipientAddress: string | null;     // display name source; null = recorded before this release
  ingressAgentRunId: string;           // agent run, or team coordinator
  teamRunId: string | null;
  hostRoot: { kind: "agent" | "agent_team" | "agent_org"; runId: string };
  start: "starting" | "started" | "failed";
  startError: { code: string; message: string } | null;
  closed: boolean;
  status: "running" | "initializing" | "idle" | "error" | "offline";  // offline when closed/failed/inactive
};
```

Web presentation rule (one function, AR-002; realizes REQ-009 "openable when its worker is listed in the left panel"):
- label:
  - `start === "failed"` → Couldn't start;
  - `closed` → Offline (muted);
  - otherwise the worker `status` (e.g. Initializing while `starting`).
- openable: `start === "started"` && `!closed` && the host run is present in the web run-history state (the left panel lists it).
- not openable: no chevron, not focusable. This covers:
  - `starting` roots (P-003; no left-panel row until activation commits);
  - roots whose host chat was permanently deleted while the Project Task is open (P-004; the entry keeps `started` with no `closedAt`, and the server reports offline because the root is inactive).

## Bounded Local / Internal Spines

DS-006 (web task store, per scope): `event arrives → scope read in flight? queue : apply (upsert by taskId / remove / patch root.status) → snapshot arrives → replace list → replay queue → compute lanes/counts → mark arrived/moved rows for 2.4 s highlight`. Highlight detection: a new taskId → arrived; changed status lane → moved.

## Off-Spine Concerns Around The Spine

| Concern | Serves | Responsibility |
| --- | --- | --- |
| `TaskRootViewBuilder` | Publisher, resolvers | Latest assigned entry → `TaskRootView` |
| Status resolver | Root view builder, publisher | Active-root status query |
| Shared team fold | Roots (server), left panel (web) | One aggregation rule |
| `AdHocTaskStore.list()` | `listTasksWithoutProject` | Enumerate; skip and log damaged files |
| Web `taskRootPresentation` | Root line component | The label and openable rule above (reads host presence from the run-history store) |

## Publication Contract (AR-001)

Problem being solved:
- **P-001:** a wake publishes the run's first `AGENT_STATUS` before the handle clears its "initializing" overlay (`configured-agent-execution-handle.ts:383-384`), and roots call `onAgentStatus` synchronously. A read inside that dispatch would publish a stale `initializing`.
- **P-002:** DONE triggers two publications (resource `swap()`, then the status write) with no ordering between them.

Contract:
1. **Mark, don't read.** `taskChanged(location)`, `workerStatusChanged(location)`, `taskRemoved(location)`, `projectChanged(projectId)` and `projectRemoved(projectId)` only record a mark in `pending: Map<subjectKey, MarkKinds>`:
   - subject key: `task:<scope>:<taskId>` or `project:<projectId>`;
   - mark kinds: `view` | `status` | `removed`;
   - a Project Task mark also marks its Project.

   They are synchronous, never throw, and never read state.
2. **Read after the dispatch.** The first mark of a subject schedules a flush for it with `setImmediate`, i.e. after the current synchronous dispatch and its microtasks. At that point the handle's overlay has been cleared, so the build reads the committed, settled state:
   - Task files through the services' current readers;
   - root entries from the resource view;
   - live status through the status resolver.
3. **Serialized and coalesced per subject.** Each subject has one chain: at most one build in flight. Marks that arrive during a build are merged and cause exactly one further build after it. Emission order per subject is therefore build order. Each build reads state at least as new as the previous one, so DONE's two triggers emit views in commit order, and a final view always reflects the last commit.
4. **What a build emits:**
   - `removed` → `task_removed` / `project_removed`; pending view/status marks for that subject are dropped. Task IDs are never reused.
   - `view` → `task_upserted` (full view with root and live status) or `project_upserted` (with counts).
   - `status` only → `task_worker_status` (no file read).
5. **Failures:** a build error is logged; the subject's chain continues; the client recovers through re-read on reconnect or Refresh (QR-002). A publisher failure never fails a write.
6. **Startup (AR-003):** `TaskAgentResourceService.load()` swaps without notifying. Only swaps of committed writes after load notify.

Tests:
- the first turn after a wake (idle-paused and reactivated) publishes Running, not Initializing;
- DONE emits Task and Project views in commit order, ending with the DONE view and Offline root;
- marks during a build coalesce into exactly one further build;
- no publication during `load()`.

## Ownership Boundaries / Encapsulation

| Boundary | Encapsulates | Callers | Forbidden Bypass |
| --- | --- | --- | --- |
| `ProjectChangePublisher` | Hub, message shapes | `ProjectService`, `ProjectTaskService`, `TaskAgentResourceService` | Services calling the hub directly; resolvers publishing |
| `ActiveCollaborationRootDirectory` boundary | Root internals | Status resolver | Projects code importing root classes or adapters |
| `TaskAgentResourcePort` | Task side | Lifecycle | Lifecycle importing the publisher |
| Web `projectChangeFeed` | Socket | Stores | Components opening sockets |

## Dependency Rules

- `projects/*` may depend on the active-root directory only through the composition-bound status resolver, never on root classes.
- `agent-collaboration/*` notifies the Task side only through `TaskAgentResourcePort.taskExecutionsStatusChanged(hostRoot, references)` (new port method).
- The web stores depend on the feed service; components depend on stores only.

## Interface Boundary Mapping

| Interface | Subject | Identity Shape | Notes |
| --- | --- | --- | --- |
| GraphQL `projectTasks(projectId)` | Project Tasks | projectId | Adds `root: TaskRoot` |
| GraphQL `tasksWithoutProject` | Tasks with no Project | — | `[TaskWithoutProject {taskId, description, status, referenceFiles, createdAt, updatedAt, root}]`, ordered like Project Tasks |
| `/ws/projects` | Node Projects changes | — | Remote-access auth as other app sockets; server → client only |
| `TaskAgentResourcePort.taskExecutionsStatusChanged(hostRoot, references)` | Task-side relevance | root + refs | Never throws |
| `ActiveRootMessageBoundary.taskExecutionStatus(reference)` | Root live status | `TaskExecutionReference` | Optional on the interface (like `releaseTaskAgentResources`); implemented by all three roots |
| `TaskAgentResourceLinkInput` (assigned) | Assignment | + `recipientAddress` | Set by dispatch from the resolved placement address |
| Web `useTaskRootNavigation().open(root)` | Navigation | `TaskRootView` | Per host kind |

## Interface / Naming Checks

All interfaces are single-subject with explicit identities; ambiguity risk is Low. Names: `ProjectChangePublisher`, `ProjectChangeHub`, `TaskRootViewBuilder`, `taskExecutionStatus`, `taskExecutionsStatusChanged`, `tasksWithoutProject`, "Temp tasks" (UI only).

## Existing Capability / Subsystem Reuse Check

| Need | Existing | Decision |
| --- | --- | --- |
| Websocket hub | Application notification hub pattern, remote-access auth | Reuse pattern |
| Live statuses | Root status snapshots | Extend (query) |
| Team fold | Web util | Extend → move to shared contracts |
| Navigation | `resolveSelectionRoute`, history selection actions, collaboration `selectChild` | Reuse |
| Board UI | `ProjectTaskBoard`, `ProjectTaskRow`, `ProjectTaskDetail` | Extend (lanes config, read-only mode) |
| Task list reads | `ProjectTaskService` | Extend |

## Subsystem Allocation And File Mapping

Server (`autobyteus-server-ts/src`):

| Path | Change | Responsibility |
| --- | --- | --- |
| `projects/changes/project-change-messages.ts` | Add | Message/scope/view types and the zod schema (the exact writer) |
| `projects/changes/project-change-hub.ts` | Add | connect/disconnect/broadcast |
| `projects/changes/project-change-publisher.ts` | Add | Mark triggers; `setImmediate` flush; per-subject serialized, coalesced builds; emission (Publication Contract) |
| `projects/services/task-root-view-builder.ts` | Add | Root DTO from entries + status resolver |
| `projects/services/project-service.ts` | Modify | Publish after committed writes |
| `projects/services/project-task-service.ts` | Modify | Publish after writes; `listTasksWithoutProject()`; Task views include root; `taskExecutionsStatusChanged`; pass `recipientAddress` through linking |
| `projects/services/task-agent-resource-service.ts` | Modify | Notify `taskChanged` after `swap()` (via an injected callback, not a publisher import cycle); expose `latestAssignment(taskId)` |
| `projects/domain/task-agent-resources.ts`, `stores/task-agent-resource-schema.ts` | Modify | `recipientAddress` on assigned entries |
| `projects/stores/ad-hoc-task-store.ts` | Modify | `list()` |
| `agent-collaboration/execution/task/task-agent-resource-port.ts` | Modify | `recipientAddress` in the assigned link input; `taskExecutionsStatusChanged` |
| `agent-collaboration/execution/task/root-task-dispatch.ts` | Modify | Supply `recipientAddress` from the plan's placement address |
| `agent-collaboration/execution/task/root-task-execution-lifecycle.ts` (+ adapter interface) | Modify | Forward status changes; `taskExecutionStatus(reference)`; announce all task executions on close/fail-stop |
| Three adapters | Modify | `taskExecutionStatus` (agent snapshot / team fold via the shared fold) |
| `agent-collaboration/execution/services/active-collaboration-root-directory.ts` | Modify | Optional `taskExecutionStatus` on the boundary |
| Three roots (`standalone-agent-run-root.ts`, `root-team-run.ts`, `agent-org-run.ts`) | Modify | Implement the boundary member by delegating to the lifecycle |
| `compositions/project-task-agent-resource-composition.ts` | Modify | Bind the status resolver and the publisher |
| `api/graphql/types/project-tasks.ts` | Modify | `TaskRoot` type, `root` field, `TaskWithoutProject`, `tasksWithoutProject` |
| `api/websocket/projects.ts` + `index.ts` | Add/Modify | Route |

Shared: `autobyteus-collaboration-stream-contracts/src/` gains a team status fold module (exported). The web imports it.

Web (`autobyteus-web`):

| Path | Change | Responsibility |
| --- | --- | --- |
| `services/projects/projectChangeFeed.ts` | Add | Socket per node; reconnect; dispatch to stores |
| `stores/projectTaskStore.ts` | Modify | Scope-keyed lists (`project:<id>`, `no_project`); event application (DS-006); highlight marks |
| `stores/projectStore.ts` | Modify | Apply project events |
| `types/project.ts` | Modify | `TaskRootView`, `TaskWithoutProject`, change messages (mirror; contract test against server sample payloads) |
| `graphql/queries` + generated | Modify | `root`, `tasksWithoutProject` |
| `utils/projects/taskRootPresentation.ts` | Add | Presentation rule |
| `composables/projects/useTaskRootNavigation.ts` | Add | DS-004 |
| `components/projects/ProjectTaskWorkers.vue` | Add | Root line (board/page densities) per the spec, with DEC-006 statuses |
| `ProjectTaskRow.vue`, `ProjectTaskBoard.vue`, `ProjectTaskDetail.vue` | Modify | Root line, highlight, lanes configuration (three columns vs Open/Done), read-only mode for Temp tasks |
| `ProjectsList.vue` | Modify | Temp tasks header button + open pill |
| `pages/projects/temp-tasks/index.vue`, `pages/projects/temp-tasks/tasks/[taskId]/index.vue` | Add | Temp board / page routes |
| `components/workspace/history/AgentRunTaskRows.vue` | Modify | F-006 |
| `utils/workspaceTeamAggregateStatus.ts` | Modify | Use the shared fold |
| localization en/zh-CN `projects` | Modify | Round 1 and 2 copy; statuses reuse `workspace.history.hierarchy.status.*` wording, capitalized per spec |

Docs:
- `autobyteus-web/docs/projects.md` (live feed, root line, Temp tasks, F-006);
- `autobyteus-server-ts/docs/modules/projects.md` (feed, `recipientAddress`, `tasksWithoutProject`, root view).

## Concrete Examples

| Topic | Good | Avoided |
| --- | --- | --- |
| Publication | `await store.updateTask(...); this.changes.taskChanged(location)` inside the owner, after commit | A GraphQL resolver or tool publishing; publishing before commit |
| Status | `taskExecutionStatus({teamRunId})` → `foldTeamAggregateStatus(members' live statuses, "live")` | The web guessing from left-panel contexts (A10) |
| Root line | `failed → Couldn't start · closed → Offline (muted, no ›) · else status (›)` | Separate "Stopped" label |
| Name | `recipientAddress` → `memberDisplayName(address)`; null → "Agent"/"Team" | Reading stored trees per Task |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate | Decision | Replacement |
| --- | --- | --- |
| Tree lookup fallback for names of old entries | Rejected | Kind-only label for old entries |
| Keep polling or manual-only freshness alongside the feed | Rejected | Feed; Refresh stays only as an explicit user action |
| Separate status vocabulary for the root ("Stopped") | Rejected (DEC-006) | Worker status |

## Change / Refactor Sequence

1. Shared fold → contracts package; the web util uses it.
2. Server persisted field + link input + dispatch (`recipientAddress`); reader/writer tests.
3. Root boundary `taskExecutionStatus` (lifecycle/adapters/roots) + status-change forwarding; unit tests per root kind.
4. `TaskRootViewBuilder`, Task views with root, `listTasksWithoutProject`, `AdHocTaskStore.list`, GraphQL.
5. Publisher (mark/flush/serialize/coalesce contract) + hub + `/ws/projects`; wire it into the services and committed `swap()` only (not `load()`); composition.
6. Web: feed service, stores (DS-006), types/queries, root line, navigation, board/page changes, Temp tasks routes/button, F-006, localization.
7. Docs.
8. API/E2E: AC-001..023, including real agent tool writes, delegation failure, DONE, reactivation (`reactivate-done-task-runs`), chat deletion, reconnect, and root opening for agent and team hosts; visual checks against VIS-001..018 with the DEC-006 deviation.

## Key Tradeoffs

- **Server-computed worker status** costs a runtime query per publish/read. It is truthful for every root, not only the selected one.
- **Separate `task_worker_status` messages** avoid re-reading Task files on every agent status change, while staying generic (every Task, either scope).
- **Storing `recipientAddress`** adds one optional field. In exchange, failed starts get names and reads need no tree I/O.

## Risks

- **Publication volume during busy runs.** Mitigation: status messages are tiny, and only for assignment roots. Measure in E2E; batching is deferred unless shown necessary (DESIGN.md).
- **Missing a write path.** Mitigation: publication sits in the owners and `swap()`; E2E covers tool, UI, delegation, DONE, reactivation and chat deletion.
- **Event/snapshot races.** Mitigation: the publication contract (per-subject serialized, read after dispatch) plus DS-006 queue-and-replay and re-read on reconnect.
- **Org-hosted root navigation:** resolved; reuses `onInspectAgentOrgExecution` / `selectTaskTeam` (ARCH-REV-001 residual note).

## Guidance For Implementation

- Do not change agent tool contracts or Task status semantics.
- Never publish before commit. Triggers only mark (Publication Contract); publisher failures are logged and never fail the write.
- `taskExecutionStatus` must not restore or wake anything.
- Keep `teamExecutionViewState.ts` (494/500 lines) untouched.
- Follow TESTING.md: browser probes for the Projects pages; API/E2E with real backend nodes.
