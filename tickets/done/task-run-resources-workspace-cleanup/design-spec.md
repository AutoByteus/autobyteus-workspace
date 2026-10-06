# Design Spec — task-run-resources-workspace-cleanup

## Solution And Approval Basis

- Package: `task-run-resources-workspace-cleanup`; solution revision `SR-009` (SR-009: protocol-doc sync and per-root closure index after a full `DESIGN.md` check; SR-008 resumed after SR-007; REQ-010 restyle removed from scope and delivered separately as `delegated-row-clean-style`, merged in `origin/personal` `24e00db81`).
- Approved requirements: `requirements-doc.md` (SR-003 content, approval SD-AP-001, 2026-10-06).
- Behavior-defining supplement: Product UI/UX spec `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/task-run-resources-workspace-cleanup/ui-ux-spec.md` @ design repo `a38bd6e` (VIS-001–008).
- Evidence: `investigation-notes.md` (Source Log, AE-01–AE-17).
- Workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-run-resources-workspace-cleanup`, branch `codex/task-run-resources-workspace-cleanup`, base `origin/personal@5c74fed71` (updated in SR-008 from `88851166f`), finalization target `origin/personal`.

## Current-State Read

The Task side (`TaskAgentResourceService`) is the only owner of closure (`closedAt`) per agent run resource, and every resource records its `hostRoot`. On DONE it closes the entries, writes the status, and asks each active host root to stop exactly its closed runs (`releaseTaskAgentResources`). Roots never learn that closure should change what the user sees. Each root's view (live snapshot, live events, stored read) projects the full durable execution tree. The browser lists every task execution as a row. Message correlation rules require every Team-tab message participant to stay in the projected tree (AE-01), so the tree itself must not be filtered.

## Task Size And Architectural Risk (Mandatory)

- `task_size`: **Large**.
- `architectural_risk`: **High**.
- Evidence:
  - Shared wire contracts change for all three root kinds:
    - `autobyteus-collaboration-stream-contracts` (Agent and Org view and event);
    - `autobyteus-team-stream-contracts` (Team snapshot and new server message);
    - Team resume-config GraphQL.
  - The neutral cross-subsystem `TaskAgentResourcePort` gains a read.
  - Server roots (standalone, Team, Org), their stored-read owners, and three separate web root contexts change.
  - Plus tree UI leave motion.
  - No persistence change, no security change, no new runtime owner.
- Escalation trigger: shared contract change spanning server and web across three root kinds.

## Architecture Investigation Evidence

See `investigation-notes.md` › Architecture Investigation Findings (AE-01–AE-17) and Source Log.

## Intended Change

A run's Task closure becomes a projected view fact, `closed task executions`, delivered beside the unchanged execution tree:
- in every live root snapshot;
- in every stored read;
- in a new live sequenced event emitted when an active root is asked to stop closed runs.

Each web root context keeps the full tree and participant index. It leaves out of the row list every closed task-execution node and its subtree, falls back selection, and animates the removal. Delegated rows get the approved cleaner style.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior / REQ | Trigger | Target production path | Lifecycle boundary | Spine |
| --- | --- | --- | --- | --- |
| BEH-002 / REQ-001–003, 005, 009 | Manager calls `update_project_task` with DONE | `ProjectTaskService.updateTask` → `TaskAgentResourceService.closeTask` (closedAt) → `TaskAgentResourceRelease` → `ActiveCollaborationRootDirectory.resolve(hostRoot).releaseTaskAgentResources(refs)` → `RootTaskAgentResourceScope` publishes **closed event** (before stopping) → root publisher → stream projector → web root context marks closed → rows leave with motion; selection falls back | Active host root | SP-1, EV-1 |
| BEH-003/004 / REQ-004, 005 | Reload, restart, open stopped root | Root snapshot / stored read → includes `closed_task_executions` from `TaskAgentResourcePort.closedAgentRunsIn(root)` → web context built with closed set → closed rows absent from first render | Snapshot or stored read | SP-2 |
| BEH-003 / REQ-004, 005 (Org history list, AR-001) | App load lists Org runs; user expands an Org run before its context hydrates | `CollaborationRootHistoryService.projectAgentOrg` → `AgentOrgRunManager.closedTaskExecutionsFor(orgRunId, tree)` → `agent_org` history item `closed_task_executions` → web `parseAgentOrgHistoryItem` → `projectAgentOrgHistoryRows` applies the shared predicate for either source (context closed set, else history item list) | History list read | SP-3 |
| BEH-001/005 / REQ-006 | Delegate / reopen + delegate | Unchanged start path; new runs are open → listed | — | unchanged |
| BEH-006 / REQ-007, 008 | Team tab | Tree and messages unchanged; participant index keeps closed runs | — | unchanged |

## Relevant Supplemental Task Artifacts

- UI/UX spec (normative for motion, focus, row style, selection fallback): see above.

## Task Design Health Assessment (Mandatory)

- Change posture: feature/behavior change.
- Root cause classification: `No Design Issue Found` for ownership.
  - Closure already has one owner (the Task side).
  - Roots already hold the neutral port and already have a shared release entry point.
  - The feature extends both without moving ownership.
- Refactor needed now: No broad refactor.
- One bounded consolidation is required: closure is computed through one shared function (`listClosedTaskExecutions`). This prevents three root-specific closure policies.
- Org task rows not using the shared row component is pre-existing duplication.
  - Decision: Deferred. Residual risk: future row-style drift.
  - The clean row style itself was delivered by `delegated-row-clean-style`; this package only adds the leave motion to both owners.

## Terminology

- **Closed task execution**: a task execution node (Agent or Team) whose agent run resource has `closedAt` set on the Task side.
- **Listed**: shown as a row in the Workspaces tree. Closed nodes and everything under them are not listed.

## Design Reading Order

Spines → contracts → server owners → web owners → UI → files.

## Legacy Removal Policy (Mandatory)

- No compatibility path. The new contract fields are required, not optional.
- Server and web ship together in one app build, so no cross-version support is needed (see the rejection log).

## Persisted Data / State Transition Decision

- Decision: `Not Affected`. Nothing new is written.
  - Closure is already persisted in `agent_run_resources.json`.
  - Execution trees and messages are unchanged.
- Damaged Task resource file: closure for that Task is unknown in memory. Its runs stay listed, which is the existing error surface (prior Q-3). `closedAgentRunsIn` never throws.

## Data-Flow Spine Inventory

| ID | Scope | Start | End | Owner | Why |
| --- | --- | --- | --- | --- | --- |
| SP-1 | Live DONE | Manager `update_project_task` DONE | Rows leave in the open root's tree | Task side (closure) → Root task scope (event) → web root context (listing) | REQ-001–003, 009 |
| SP-2 | Read | Snapshot or stored read | First render without closed rows | Root/manager snapshot assembly | REQ-004 |
| EV-1 | Event | Root scope publish | Web context `applyEvent` | Root publisher / stream projectors | Live signal |
| SP-3 | Org history list | Collaboration-root history list | Org rows rendered without context and without closed rows | Org run manager (closure read) → history service → web Org rows | AR-001, REQ-004 |
| LS-1 | Bounded local (web) | Closed set change | Row list recomputed; selection/focus fallback; leave transition | Web root context + tree component | Motion/focus |

## Primary Execution Spine(s)

- SP-1: `Manager tool (update_project_task DONE) → ProjectTaskService → TaskAgentResourceService.closeTask → TaskAgentResourceRelease → ActiveCollaborationRootDirectory → Root.releaseTaskAgentResources → RootTaskAgentResourceScope (publish closed, then stop) → Root event publisher → stream projector (Agent/Org/Team) → web root context → tree rows`
- SP-2: `Web hydration (stream snapshot or stored query) → Root.openPackageSnapshotConnection / Manager stored read → listClosedTaskExecutions(port.closedAgentRunsIn(root), tree contains) → view projector → web root context (closed set) → tree rows`

## Spine Narratives (Mandatory)

- **SP-1:**
  0. Event payload (AR-003): the event carries the `agentRuns` passed into this release request, kept only where they are closed per the port and present in this root's tree. It is **not** the root's cumulative closed list, so repeated DONE re-publishes only that Task's runs.
  1. DONE commits closure first (unchanged).
  2. The release request reaches the active host root's shared `RootTaskAgentResourceScope.releaseTaskAgentResources(refs)`.
  3. Synchronously, before any await, the scope computes the closed refs present in this root's tree (`listClosedTaskExecutions`). If the list is non-empty, it calls the adapter's `publishTaskExecutionsClosed(refs)`.
  4. Stopping proceeds as today.
  5. The root's sequenced publisher assigns a change sequence. Each stream projector maps the event to its wire form.
  6. The web context adds the refs to its closed set. Rows recompute; leaving rows animate. If the selected or focused run is now unlisted, selection and focus fall back.
  - Repeated DONE re-publishes the same refs (idempotent).
- **SP-3 (AR-001):** The collaboration-root history list carries the Org tree used to render rows before the Org context hydrates (`utils/agentOrgHistoryRows.ts` uses `context?.executionTree ?? run.executionTree`). The history item therefore carries `closed_task_executions` too, computed through the Org run manager with the same `listClosedTaskExecutions`. Team history items carry no task rows (`buildRunHistoryTeamExecutionRows` without a context returns stable rows only), and Agent-root rows only come from the collaboration context. So no other history-list path needs the field.
- **SP-2:** Snapshot assembly reads the closed refs at the same synchronous point as the tree. The live snapshot is therefore atomic with `baseChangeSequence`, and events after it are idempotent. Stored reads compute the closed refs against the stored tree.

## Spine Actors / Main-Line Nodes

`TaskAgentResourceService` (closure authority), `TaskAgentResourcePort` (neutral read), `RootTaskAgentResourceScope` (per-root Task policy, now also closure publication), root adapters (publish into the root publisher), root snapshot owners and stored-read owners, stream/view projectors (wire mapping), web root contexts (listing and selection), tree components (rendering and motion).

## Ownership Map

| Owner | Owns (new or changed) |
| --- | --- |
| `TaskAgentResourceService` | `closedAgentRunsIn(hostRoot)`: closed refs from the in-memory view; skips damaged Tasks; never throws. **SR-009:** answered from a private derived map, e.g. `closedRunsByHostRoot: Map<rootKey, TaskExecutionReference[]>`. The name must not collide with the existing public method `closedByHostRoot(taskId)` (ARCH-REV-004 R-5). The map is rebuilt only for the swapped Task inside the existing synchronous `swap()`: remove that Task's previous contributions, then add its entries with `closedAt !== null`. This is the same single update point and lifecycle as the existing `owners` map. No other invalidation, no persistence, no background work. |
| `TaskAgentResourcePort` | Exposes `closedAgentRunsIn(hostRoot): readonly TaskExecutionReference[]` |
| `listClosedTaskExecutions` (new shared function, `agent-collaboration/execution/task/`) | Single policy: port refs ∩ refs present in this root's tree (via a `contains(ref)` predicate) |
| `RootTaskAgentResourceScope` | Publishes the closed refs via the adapter before stopping |
| Root adapters (standalone, Org, Team) | `publishTaskExecutionsClosed(refs)`, `containsTaskExecution(ref)` |
| Root snapshot owners (`openPackageSnapshotConnection` ×3) | `closedTaskExecutions` in the package snapshot |
| Root-kind managers (`StandaloneAgentRunRootManager`, `AgentOrgRunManager`, `AgentTeamRunManager`) | Own the port and the only stored closure read: `closedTaskExecutionsFor(rootRunId, tree)` = `listClosedTaskExecutions` over the given tree. Used by their own `getInspection`, by `TeamRunHistoryService.getTeamRunResumeConfig` (through `AgentTeamRunManager`, which it already holds as `this.manager`), and by `CollaborationRootHistoryService.projectAgentOrg` (through `orgRuns: AgentOrgRunManager`, which it already holds). `run-history` services never depend on the port directly (AR-003). |
| Projectors / contracts | Wire fields and events |
| Web root contexts | Closed set, listing filter, `isListed`, event application |
| Web stores (`agentRunCollaborationStore`, Team/Org stores) | Selection fallback on unlisted |
| Tree components | Leave transition, focus move, `aria-hidden` |

## Thin Entry Facades / Public Wrappers

N/A.

## Removal / Decommission Plan (Mandatory)

- None in this package. The dashed-row removal (former REQ-010) was delivered by `delegated-row-clean-style`.
- No server code is removed.

## Return Or Event Spine(s)

EV-1 above. Event names:
- Agent and Org: `{ kind: "task_executions_closed", task_executions: TaskExecutionReferenceDto[] }`.
- Team: server message `TASK_EXECUTIONS_CLOSED` with `{ change_sequence, task_executions: [{agent_run_id}|{team_run_id}] }`.

## Bounded Local / Internal Spines

- **LS-1 (web):**
  1. The closed set changes.
  2. The listing recomputes.
  3. Rows no longer listed leave through `<TransitionGroup>`: 200 ms ease-out opacity 1→0 and max-height 2rem→0 with the margin collapsing; the remaining rows move in 200 ms ease-out. With `prefers-reduced-motion: reduce`, rows are removed immediately. There is no enter motion.
  4. A leaving row gets `aria-hidden` at once and is inert.
  5. If it had keyboard focus, focus moves to the root run row.
  6. If the selected run is unlisted, selection falls back (see Interface Boundary Mapping).

## Off-Spine Concerns Around The Spine

- Reference keying: one key function per side (`taskExecutionReferenceKey` exists server-side; add a web equivalent in a shared web util).

## Ownership Boundaries / Boundary Encapsulation Map

- The Task side stays behind the port. Roots and managers never import `projects/*`.
- Web components read listing through their context or store, never by filtering trees themselves.

## Dependency Rules

- Allowed directions:
  - `projects` → port (implements it);
  - roots and managers → port;
  - projectors → root snapshot types;
  - web components → stores → contexts.
- Forbidden:
  - roots or projectors reading `agent_run_resources.json`;
  - components re-implementing the closed-subtree filter;
  - the server filtering the execution tree DTO (breaks AE-01).

## Interface Boundary Mapping

| Interface | Shape |
| --- | --- |
| `TaskAgentResourcePort.closedAgentRunsIn(hostRoot: RootExecutionIdentity)` | `readonly TaskExecutionReference[]`; entries whose `hostRoot` equals the argument and `closedAt !== null`; damaged Tasks contribute nothing. Cost: O(closed refs in that root) via the per-root map (SR-009), not a scan of every Task. |
| `listClosedTaskExecutions({ port, root, contains })` | `readonly TaskExecutionReference[]`, ordered as returned; empty when `port` is undefined |
| Root adapter `publishTaskExecutionsClosed(refs)` | Publishes the root event `{ kind: "task_executions_closed", taskExecutions }` (Team: its `TASK_EXECUTION` event source with a closed variant, or a new source type; implementation chooses consistently with `task-execution-event-factory.ts`) |
| Package snapshots (standalone, Org, Team) | `+ closedTaskExecutions: readonly TaskExecutionReference[]` |
| Agent view DTO `agentRunCollaborationViewDtoSchema` | `+ closed_task_executions: TaskExecutionReferenceDto[]` (required). Correlation rule: each ref must identify a task execution node in `execution_tree` |
| Org view DTO `agentOrgExecutionViewDtoSchema` | Same field and rule |
| Agent and Org event unions | `+ { kind: "task_executions_closed", task_executions: TaskExecutionReferenceDto[] }` (strict, non-empty) |
| Team snapshot payload | `+ closed_task_executions: [{agent_run_id}|{team_run_id}]` (required) |
| Team server message | `+ TASK_EXECUTIONS_CLOSED { change_sequence, task_executions }` |
| Team resume config GraphQL | `+ closedTaskExecutions: JSON` (list of `{agentRunId}|{teamRunId}`) beside `executionTree` |
| `TaskExecutionReferenceDto` (collaboration contracts, new shared schema) | `{ agentRunId } \| { teamRunId }` (strict) |
| Web Agent context | `isListed(agentRunId)`, `listTaskRows` skips closed nodes and their subtree; `applyEvent` handles `task_executions_closed` (adds to set; applied in place, no reload) |
| Web Team view state | Holds the closed set (from the snapshot or stored hydration; `TASK_EXECUTIONS_CLOSED` with the normal sequence check). Exposes `isTaskExecutionRowListed(row)`: false for a closed task node and every row whose ancestor chain contains one. **`projectNavigationRows`/`listNavigationRows()` stay unchanged (AR-002).** |
| Web Workspaces Team tree consumer | `stores/runHistoryTeamExecutionRows.ts` `buildRunHistoryTeamExecutionRows` keeps only rows where `context.view.isTaskExecutionRowListed(row)` (AR-002 option a) |
| Web Org history rows | `projectAgentOrgHistoryRows` applies the shared closed-subtree predicate with the closed set from the context, else from the `agent_org` history item (AR-001) |
| `agent_org` collaboration-root history item | `+ closed_task_executions: TaskExecutionReferenceDto[]` (server type, GraphQL payload, web parser `parseAgentOrgHistoryItem`) |
| Web Org context | Same as Agent; rows in `WorkspaceAgentOrgHistoryCollection` come from the listed set |
| Selection fallback (REQ-009, scoped to the Workspaces tree and main view) | **Agent root:** selection → `null` (host conversation; the run row is selected). **Team and Org:** focus moves to the delegating member of the outermost closed execution (`delegatorAgentRunId`) if listed, else the root Team's default focus. This realizes REQ-009 "return to the Manager" for Team roots. A closed run cannot be selected from the Workspaces tree (it is not listed, and the tree's select handlers ignore unlisted). For Team roots the focus fallback runs in the Team view state's focus owner when the focused agent becomes part of a closed node, so the main view leaves the closed run. |

### Team navigation-row consumer inventory (AR-002)

| Consumer | Uses `listNavigationRows()` for | Changed? | Justification |
| --- | --- | --- | --- |
| `stores/runHistoryTeamExecutionRows.ts` (Workspaces tree) | Tree rows | **Yes**: filtered by `isTaskExecutionRowListed` | REQ-001 scope |
| `components/workspace/team/TeamMembersPanel.vue` | Team members panel tree | No | Outside the Workspaces tree; REQ-001 scope; Agent/Org roots have no equivalent change; keeps REQ-005 parity |
| `components/workspace/running/RunningTeamRow.vue` | Running-runs list | No | Same |
| `composables/tokenUsageTeamMemberRows.ts` | Token-usage member list | No | Same; closed runs' usage remains reportable |
| `composables/mobile/useMobileTeamMemberFocusCoordinator.ts` | Mobile focus bar | No | Same |
| Focus eligibility (`focusable`) | Focus validation | No (only the DONE-time fallback above) | REQ-009 |

If the user later wants closed runs hidden on these other surfaces too, that is a new requirement, not part of this design.

## Interface Boundary Check / Main Domain Subject Naming Check

- One subject per method: closed refs for a root.
- Names use the existing domain terms: "task execution" on the runtime side, "agent run resource" on the Task side.

## Existing Capability / Subsystem Reuse Check

Reuses:
- the port and its composition;
- the shared release scope;
- the per-root sequenced publishers and their existing snapshot/event sequencing;
- the existing selection fallback (`agentRunCollaborationStore.publish`, `agentOrgExecutionContext` selection);
- the shared row component (Agent and Team).

## Subsystem / Capability-Area Allocation

- Server:
  - `projects/services` (Task side read);
  - `agent-collaboration/execution/task` (port, shared closure function, scope);
  - `standalone-agent-run-root`, `agent-team-execution`, `agent-org-execution` (adapters, snapshots, managers);
  - `run-history/services` (Team stored read);
  - `services/agent-streaming` (projectors);
  - `api/graphql/types` (Team resume config field).
- Contracts: `autobyteus-collaboration-stream-contracts`, `autobyteus-team-stream-contracts`.
- Web:
  - `services/agentCollaboration`, `services/teamExecution`, `services/agentOrgExecution`;
  - `services/runHydration/teamRunContextHydrationService.ts`;
  - stores;
  - `components/workspace/history`.

## Final File Responsibility Mapping

| Change | File | Responsibility |
| --- | --- | --- |
| Modify | `autobyteus-server-ts/src/agent-collaboration/execution/task/task-agent-resource-port.ts` | Add `closedAgentRunsIn` |
| Modify | `autobyteus-server-ts/src/projects/services/task-agent-resource-service.ts` | Implement it (in-memory, never throws) with the per-root `closedRunsByHostRoot` map maintained in `swap()` (SR-009; see R-5) |
| Modify | `autobyteus-server-ts/src/projects/services/project-task-service.ts` (port object) | Expose it on the port |
| Add | `autobyteus-server-ts/src/agent-collaboration/execution/task/task-execution-closure.ts` | `listClosedTaskExecutions` |
| Modify | `.../task/root-task-agent-resource-scope.ts`, `.../task/root-task-execution-adapter.ts` | Publish closed refs before stopping; adapter methods |
| Modify | `standalone-agent-run-root/domain/standalone-agent-run-root.ts`, `.../standalone-root-event.ts`, `.../services/standalone-root-task-execution-adapter.ts`, `.../services/standalone-agent-run-root-manager.ts` | Event, adapter callback, snapshot field, stored inspection |
| Modify | `agent-org-execution/domain/agent-org-run.ts`, `.../agent-org-run-event.ts`, `.../services/agent-org-task-execution-adapter.ts`, `.../services/agent-org-run-manager.ts` | Same for Org |
| Modify | `agent-team-execution/domain/root-team-run.ts`, `.../domain/team-run-event.ts`, `.../task-delegation/*` (adapter, event factory), `run-history/services/team-run-history-service.ts`, Team resume-config GraphQL type | Same for Team, plus stored read |
| Modify | `services/agent-streaming/agent-collaboration-view-projector.ts`, `agent-org-execution-view-projector.ts`, `team-execution-view-projector.ts` | Map field and event |
| Modify | `autobyteus-server-ts/docs/design/agent_websocket_streaming_protocol.md` (area contract named in `DESIGN.md` › Project-specific design documents) | SR-009: in "Team Server Messages", add `TASK_EXECUTIONS_CLOSED` (Task closure for runs hosted in this TeamRun: `change_sequence`, `task_executions` refs; idempotent; published before stop). Under "Connection And Restore" or the snapshot description, add the required `closed_task_executions` snapshot field: tree unfiltered, closure is a separate fact. |
| Modify | `autobyteus-collaboration-stream-contracts/src/{agent-org-execution-dtos,agent-run-collaboration-dtos,root-execution-view-dtos}.ts` | Reference DTO, view field, event, correlation validation |
| Modify | `autobyteus-team-stream-contracts/src/{team-execution-view-dtos,team-task-execution-message-dtos,team-stream-server-message}.ts` | Snapshot field, message |
| Add | `autobyteus-web/utils/collaboration/taskExecutionClosure.ts` | Web reference key, closed-subtree predicate (shared by the three contexts) |
| Modify | `autobyteus-web/services/agentCollaboration/agentRunCollaborationContext.ts`, `stores/agentRunCollaborationStore.ts` | Closed set, listing, event, selection fallback |
| Modify | `autobyteus-web/services/teamExecution/teamExecutionViewState.ts` (closed set, `isTaskExecutionRowListed`, event, DONE-time focus fallback), `services/agentStreaming/TeamStreamingService.ts`, `services/runHydration/teamRunContextHydrationService.ts`, `graphql/queries/runHistoryQueries.ts` (+ generated types), `stores/runHistoryTeamExecutionRows.ts` (tree filter). `teamExecutionTreeSelectors.ts` `projectNavigationRows` is **not** changed | Same for Team (AR-002) |
| Modify | `autobyteus-server-ts/src/run-history/services/collaboration-root-history-service.ts`, `api/graphql/types/collaboration-root-history.ts`, `agent-org-execution/services/agent-org-run-manager.ts` (`closedTaskExecutionsFor`); `autobyteus-web` collaboration-root history query + `stores/runHistoryStoreSupport.ts` `parseAgentOrgHistoryItem` + Org history item type | Org history-list closure (AR-001) |
| Modify | `standalone-agent-run-root/services/standalone-agent-run-root-manager.ts`, `agent-team-execution/services/agent-team-run-manager.ts` | `closedTaskExecutionsFor` (stored reads; AR-003) |
| Modify | `autobyteus-web/services/agentOrgExecution/agentOrgExecutionContext.ts`, `utils/agentOrgHistoryRows.ts` (predicate for both sources) | Same for Org |
| Modify | `autobyteus-web/components/workspace/history/{WorkspaceTransientExecutionRow,AgentRunTaskRows,WorkspaceTeamExecutionTree,WorkspaceAgentOrgHistoryCollection}.vue` | Leave motion; focus/aria (row style is already on the base) |

## Reusable Owned Structures Check / Shared Structure Tightness Check

- `TaskExecutionReferenceDto` is the single wire shape for a reference: one of `agentRunId` / `teamRunId`, no extra fields. Team uses its snake-case twin, consistent with that contract family.
- No `closed` flag is added on tree nodes. This avoids two representations of the same fact.

## Applied Patterns

Projection join at read time (tree record + Task fact); sequenced event.

## Target Subsystem / Folder / File Mapping / Folder Boundary Check

As in the file table. The one new server file sits with the port in `agent-collaboration/execution/task/`. The new web util goes in `utils/collaboration/`.

## Concrete Examples / Shape Guidance

```jsonc
// Agent root view (excerpt)
{ "root_subject_kind": "agent", "root_run_id": "ptm-1", "root_agent": {
  "execution_tree": { "taskExecutions": [ {"agentRunId": "rnw-1", ...}, {"teamRunId": "drt-1", "members": [...], ...} ] },
  "closed_task_executions": [ {"agentRunId": "rnw-1"} ],
  "communication_messages": { "messages": [ /* still includes rnw-1 messages */ ] } } }
// Live event
{ "root_subject_kind": "agent", "root_run_id": "ptm-1", "change_sequence": 42,
  "event": { "kind": "task_executions_closed", "task_executions": [ {"teamRunId": "drt-1"} ] } }
```

Bad shape: removing `rnw-1` from `taskExecutions` or adding `"closed": true` on the node.

## Backward-Compatibility Rejection Log (Mandatory)

- Optional or defaulted `closed_task_executions` (rejected): server and web are released together; a required field keeps one representation.
- Persisting closure into the execution tree (rejected): it would duplicate the Task-side fact, which conflicts with the approved ownership of the prior ticket (C-1–C-3). Roots that are inactive at DONE would also go stale.
- Client-only filtering with a separate query (rejected): it is not atomic with the live snapshot sequence, so a closure could be missed between query and stream attach.

## Change / Refactor Sequence

1. Contracts (reference DTO, view fields, events, correlation).
2. Port and Task service read; `listClosedTaskExecutions`.
3. Root-kind manager `closedTaskExecutionsFor`; root adapters, events, snapshots, stored reads (Agent, Org, Team); projectors; Team resume config; Org collaboration-root history item (AR-001).
4. Web shared util; Agent context and store; Team state, hydration, stream and Workspaces tree consumer (not `projectNavigationRows`); Org history item parser, context and rows.
5. UI: TransitionGroup motion, focus/aria.
6. Tests.

## DESIGN.md "Before accepting a design" Summary (SR-009)

- **Required path:** DONE closure (existing) → per-root closed refs → snapshot, stored-read and history fields plus one sequenced event → browser listing filter.
- **Rejected unnecessary work:**
  - no tree rewrite or persistence;
  - no client-side history scans;
  - no polling;
  - no extra refreshes on DONE (the event updates in place);
  - no new cache layer beyond the owner's derived map.
- **Expected scaling:**
  - the per-root closed lookup costs O(k), where k = closed refs in that root;
  - the Org history list adds O(Σ k) over its Org rows, plus each item's tree membership check;
  - the event payload is the Task's released refs only;
  - the web filter is O(rows) per root view.
  - Before SR-009, every lookup scanned all Task resource entries, so the history list cost O(Orgs × entries). That nested-loop growth over historical data is removed.
- **Preserved contracts:**
  - Team-tab correlation (tree unfiltered);
  - Task-side closure authority;
  - snapshot/sequence atomicity;
  - other Team surfaces unchanged (AR-002).
- **Verification:** see Guidance for Implementation. Add a unit test proving the per-root map follows `swap()` for link, close, reopen-and-new-link and damaged files.

## Key Tradeoffs

- One closure-list concept across three roots, rather than per-node flags: smaller contract surface, and the tree stays a pure record.
- Live removal is for active roots. A root that is inactive at DONE hides the rows on its next read. This matches REQ-002 "while the root is open in the app": an open root receives events. A stored, non-streaming view is refreshed on its next read (REQ-004).

## Risks

- Team selection fallback semantics (delegator, else default focus) are an interpretation of REQ-009 for Team roots. They are recorded here, and reviewers can check them against the UI spec.
- `TransitionGroup` also animates rows removed by collapsing a Team. This is acceptable: same 200 ms fade, and the UI reference behaves the same.
- Contract correlation must accept closed refs only for tree nodes that are task executions. Teams nested as task-team *members* are not resources.

## Guidance For Implementation

Verification per `TESTING.md`:
- **Contracts:** schema tests for the new fields, the event, and correlation rejection.
- **Server:**
  - unit tests for `closedAgentRunsIn` (incl. a damaged Task, and the per-root map staying correct across `swap()` for link, DONE close, and a new link after reopen) and `listClosedTaskExecutions`;
  - root-level tests per kind: DONE on an active root publishes `task_executions_closed` before stopping and the snapshot includes closed refs; a stored read includes closed refs; repeated DONE re-publishes; non-Task and other-Task runs are unaffected.
- **Org history list (AR-001):** with a stored Org run whose Task is DONE, render `projectAgentOrgHistoryRows` with **no context** (history item only) and expand the run. Closed rows are absent on the first render; open rows stay.
- **Team consumers (AR-002):** after DONE, the Workspaces Team tree omits closed rows while `TeamMembersPanel`, `RunningTeamRow`, token-usage and mobile focus rows are unchanged; the focused closed agent falls back.
- **Web component and context tests per root:**
  - closed rows are not listed; subtree hidden; Team-tab messages are kept;
  - event applied without reload; selection and focus fall back;
  - reduced motion removes immediately.
- **Browser check:** compare VIS-001/002/004/006/008. A real Manager DONE journey on an isolated instance is preferred (AC-001/002/004/009).
