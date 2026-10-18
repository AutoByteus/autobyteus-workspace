# Design Spec — Link An Existing Run To A Task

## Solution And Approval Basis

- Current solution revision ID: `SR-002`
- Approved requirements: SR-001, approved by the user 2026-10-18 ("continue" to the six recommendations; recorded in
  requirements-doc Document Status).
- Behavior-defining supplements: None.
- Design status: `Ready`
- Investigation notes: `tickets/in-progress/link-existing-run-to-task/investigation-notes.md`
- Authorities read: `references/architecture-design.md`, `references/design-principles.md` (both read in this
  conversation, 2026-10-17), project `DESIGN.md` rules 1–8 (rules 7 and 8 written by this Solution Designer
  2026-10-17); `docs/modules/projects.md`, `docs/design/collaboration_model.md`, `docs/modules/agent_communication.md`,
  Data Migration Guideline (read 2026-10-17).
- Project design-principle conflicts: None.

## Current-State Read

A Task's workers are recorded only in `agent_run_resources.json` (`TaskExecutionResource`, roles `assigned` /
`delegated` / legacy `broughtIn`), owned by `TaskExecutionResourceService`. Every entry there is a *task execution* the
Task owns: `ownerOf`, `isOpen`, `releasableByHostRoot` (DONE's stop set), `closedTaskExecutionsIn` (fencing),
reactivation and the messaging scope all read that index. The Task's board worker is its root
(`latestAssignment` → `buildTaskRootView`, status through `TaskWorkerStatusResolver` →
`ActiveRootMessageBoundary.taskExecutionStatus` of the hosting root, `compositions/project-task-execution-resource-composition.ts:39`).
The run side shows a copy's Task through `ProjectTaskService.currentTasksOfTaskWorkers` → GraphQL `taskWorkerTasks`
→ web `TaskWorkerTaskSummary.vue` under copy rows (`WorkspaceTransientExecutionRow.vue:96`). Top-level run rows
(standalone agent runs in their agent group, team runs in their team group) show no Task. Schema unknown roles make a
file damaged (`task-execution-resource-schema.ts:13-24`).

## Task Size And Architectural Risk (Mandatory)

- Task size: `Large`
- Rationale: a new persisted record and its owner, two Task-side views (board root, Task page), the run-side locator,
  a new tool pair, a GraphQL mutation pair, a status read for root runs, and web UI in three places (Task page action
  and picker, board card, sidebar run rows).
- Architectural risk: `High`
- Rationale: new persisted file, new agent tool and GraphQL contracts, and a deliberate ownership boundary (a link must
  never enter the task-execution ownership rules).
- Escalation trigger: any need to put links into `TaskExecutionResourceService`'s index, or any change to copies'
  closure, fencing, messaging scope or reactivation.

## Architecture Investigation Evidence

| Source | Path | Observation | Decision |
| --- | --- | --- | --- |
| Code | `projects/stores/task-execution-resource-schema.ts:13-24` | unknown role → file invalid | links in their own file, not a new role (downgrade-safe, no ownership leak) |
| Code | `projects/services/task-execution-resource-service.ts` (`ownerOf`, `isOpen`, `releasableByHostRoot`, `closedTaskExecutionsIn`) | every entry is owned work | links never enter this index (D-1) |
| Code | `projects/services/task-root-view-builder.ts`; composition `:39` | root = latest assignment; status via hosting root | board worker = latest of assignment and open-or-latest link (D-3); root runs answer their own status (D-4) |
| Code | `ProjectTaskService.currentTasksOfTaskWorkers`; web `TaskWorkerTaskSummary.vue` | locator for copies | extended to linked runs; the same line on top-level run rows (D-5, D-6) |
| Code | `run-history/store/agent-run-metadata-store.ts` (G1), team tree store (G2) | task agents hidden from standalone readers | "user-started run" = visible to those readers (D-2) |
| Doc | `agent_communication.md` §Task-linked message scope | owned copies are scoped | linked runs stay unowned (REQ-004) |

## Intended Change

A Task can name existing user-started runs as linked workers. Links live in their own per-Task file and owner, appear
on the board, the Task page and the run's row, close with the Task, and never take part in ownership.

## Change Scope (Mandatory)

- In scope: UC-001..UC-003 — new link record and owner; link / unlink service operations; DONE / CANCELLED / delete
  close links; board root and Task page views include links; locator answers linked runs; tools `link_run_to_task`,
  `unlink_run_from_task`; GraphQL mutations; root-run status read; web Task page action + run picker, board card,
  Task line on top-level run rows; docs (`projects.md`, `collaboration_model.md` vocabulary line, `agent_communication.md`
  one line: links are not ownership).
- Deliberately left alone: `agent_run_resources.json`, `TaskExecutionResourceService` and everything built on it
  (closure, fencing, messaging scope, reactivation, `delegate_task`); sidebar grouping (rows never move); workspaces
  (Task 6fb6e21b); organization runs, team members, task agents (not linkable); ad-hoc Tasks.
- Follow-ups: a run-side "Link to Task" action (DEC-010 "later"); linking organization runs (DEC-003).

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior | Requirement / AC | Trigger | Existing | Change / Preserved | Spine |
| --- | --- | --- | --- | --- | --- |
| BEH-001 | REQ-001, 003, 006, 007; AC-001, 002 | Task page "Link a run" | none | link recorded; shown on board, Task page, run row | DS-001, DS-003, DS-004 |
| BEH-002 | REQ-002; AC-003 | `link_run_to_task` | none | same, by tool; owned caller refused | DS-001 |
| BEH-003 | REQ-004; AC-004, 006 | `update_task` DONE / CANCELLED | closes and stops owned copies | additionally closes links; nothing stopped for them; copies unchanged | DS-002 |
| BEH-004 | REQ-005; AC-005 | unlink / reopen / run deleted / Task deleted | — | as DEC-005..007 | DS-001, DS-002 |

## Relevant Supplemental Task Artifacts

None.

## Task Design Health Assessment (Mandatory)

- Change posture: `Feature`
- Current design issue found: `No` for the owner model; the risk is mixing a non-owned relation into the owned index.
- Structural triggers: Shared-structure tightness trigger (a `linked` role in `TaskExecutionResource` would give one
  record two meanings — owned work and a label) → ruled out by a separate record and owner; Capability-area reuse
  trigger → the Projects subsystem owns it (no new subsystem).
- Root cause classification: `No Design Issue Found` (feature fits the Projects owner, beside the existing index).
- Refactor needed now: `No`.
- Evidence: Current-State Read.
- Design response: new owner `TaskRunLinkService` beside `TaskExecutionResourceService`, both under `ProjectTaskService`.
- Deferrals: run-side action; org runs.

## Terminology

- Link: a record that a user-started run works on a Task; never ownership.
- Linked run: a standalone agent run (by `agentRunId`) or a team run (by `teamRunId`, shown through its coordinator).
- Board worker (Task root): the Task's latest assignment or link.

## Legacy Removal Policy (Mandatory)

- Obsolete paths: None.
- Compatibility mechanisms kept: `None`.

## Persisted Data / State Transition Decision

- New subject: `<projectId>/tasks/<taskId>/linked_runs.json`:
  ```jsonc
  { "taskId": "project_task_…",
    "links": [
      { "run": { "kind": "agent", "agentRunId": "solution_designer_4b7d" },
        "linkedBy": { "kind": "user" },                      // or { "kind": "agent", "agentRunId": "…" }
        "linkedAt": "…", "closedAt": null, "closedReason": null },   // closedReason: "unlinked" | "task_closed" | "task_deleted"
      { "run": { "kind": "team", "teamRunId": "…", "coordinatorAgentRunId": "…" }, … } ] }
  ```
  Append-only; one entry per link period; at most one open entry per run across all Tasks.
- Existing data: `Not Affected` (new file; `agent_run_resources.json` untouched). No migration. Downgrade: an older
  build ignores the file (links disappear, nothing breaks).
- Damaged file (DESIGN.md rule 7): logged once, that Task's links unavailable (shown as unavailable on the Task page;
  link / unlink for that Task refused with guidance); everything else works.
- Supports REQ-001..007.

## Data-Flow Spine Inventory

| Spine | Scope | Behavior | Start | End | Owner | Why |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 Link / unlink | Primary | BEH-001, 002, 004 | Task page action or tool | link durable; feed publishes the Task | `ProjectTaskService` → `TaskRunLinkService` | the new relation |
| DS-002 Task closes or is deleted | Primary | BEH-003, 004 | `update_task` DONE / CANCELLED; Task delete | links closed; nothing stopped for them | `ProjectTaskService` | ownership boundary |
| DS-003 Task views | Primary | BEH-001 | board / Task page read or feed | root + links with live status | `ProjectTaskService` views | visibility |
| DS-004 Run side | Primary | BEH-001 | sidebar renders a top-level run row | Task line under the row | locator → web | visibility without moving rows |

## Primary Execution Spine(s)

- DS-001: `Task page "Link a run" (picker over history runs) / link_run_to_task → GraphQL / tool contract → ProjectTaskService.linkRun (Task serialization: Task exists, open, Project Task) → run check (user-started, exists) → TaskRunLinkService.link (one open link per run; append; atomic write) → change feed task_upserted → board / Task page / sidebar re-read`
- DS-002: `update_task DONE|CANCELLED → ProjectTaskService (existing closure of agent_run_resources) → TaskRunLinkService.closeTask(taskId, "task_closed") → feed` (no stop request for links)
- DS-003: `projectTask view → root = latest of (latestAssignment, latest link) → TaskRootView (linked: true, linkedBy, status via RootRunStatusResolver)`
- DS-004: `sidebar run row → taskWorkerTasks([{agentRunId}|{teamRunId}]) → ProjectTaskService.currentTasksOfTaskWorkers (copies as today; else the run's open link, else its latest link) → TaskWorkerTaskSummary under the row`

## Spine Narratives (Mandatory)

| Spine | Narrative | Owner |
| --- | --- | --- |
| DS-001 | Linking checks, under the Task's serialization: the Task is a Project Task, not DONE / CANCELLED; the run exists and was started by the user (standalone agent run whose metadata the standalone reader returns, or an admitted team run with no `taskAgent` section) — task agents, team members and organization runs are refused with guidance; the run has no open link to another Task (`TASK_RUN_ALREADY_LINKED`, naming that Task's key); the caller is not Task-owned (agents: `TASK_AGENT_RESOURCE_OWNED_SENDER`, as `delegate_task`). It appends the link and publishes the Task. Unlinking closes the run's open link (`closedReason: "unlinked"`). Nothing is sent to the run; its workspace and row are unchanged. | `ProjectTaskService` |
| DS-002 | The existing DONE / CANCELLED path runs unchanged for copies; then every open link of the Task is closed (`task_closed`). No stop request, no fencing: the run keeps running, messaging and delegating. Reopening reopens nothing. Deleting a Task closes its open links (`task_deleted`) and keeps the file, as `agent_run_resources.json` is kept. | `ProjectTaskService` |
| DS-003 | The Task view's root is the latest of the latest assignment and the latest link (by time). A link root carries `linked: true`, `linkedBy`, `ingressAgentRunId` (agent, or the team's coordinator), `teamRunId`, `closed`, and `status` from the run's own status: offline when closed, otherwise what the left panel shows for that run, read without waking anything. The Task view also lists `links` (open) and `closedLinks`. A deleted run shows `runAvailable: false`, status offline. | views |
| DS-004 | The locator answers copies exactly as today; for a run that is not a copy it answers the Task of its open link, otherwise of its latest link (closed shown as today's closed Tasks). The web renders the existing Task line under top-level agent and team run rows in their own groups; clicking it shows the Task in Projects. | locator |

## Spine Actors / Main-Line Nodes

Task page / tools / GraphQL; `ProjectTaskService`; `TaskRunLinkService` + `TaskRunLinkStore`; run checks (metadata
store G1, team tree store G2); `RootRunStatusResolver`; change feed; web Task page, board card, sidebar rows.

## Ownership Map

- `TaskRunLinkService` owns links: the in-memory index of all Tasks' `linked_runs.json`, one-open-link-per-run,
  append / close, damaged-file containment.
- `ProjectTaskService` owns the Task rules (exists, open, Project Task, serialization) and composes views.
- `TaskExecutionResourceService` is untouched and never sees links.
- `RootRunStatusResolver` (composition-bound) owns "a root run's own live status".

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade | Owner | Why | Must Not Own |
| --- | --- | --- | --- |
| tools `link_run_to_task` / `unlink_run_from_task`; GraphQL `linkRunToTask` / `unlinkRunFromTask` | `ProjectTaskService` | entry points | rules |

## Removal / Decommission Plan (Mandatory)

| Item | Why | Replaced By | Scope |
| --- | --- | --- | --- |
| None | additive feature | — | — |

## Return Or Event Spine(s) (If Applicable)

Change feed: `task_upserted` for the Task on link, unlink, close; a worker status change of a linked root run marks the
Task changed for Tasks whose root is that link (as `taskExecutionsStatusChanged` does for copies).

## Bounded Local / Internal Spines (If Applicable)

`TaskRunLinkService.link`: `load index → open link for run elsewhere? refuse → read file under the Task's lock → append → atomic write → update index`.

## Off-Spine Concerns Around The Spine

| Concern | Serves | Responsibility |
| --- | --- | --- |
| run check | DS-001 | user-started run exists (G1 / G2 readers) |
| status resolver | DS-003 | root run status without waking |

## Ownership Boundaries

Links never enter `TaskExecutionResourceService`; no code path for closure stop, fencing, messaging scope, reactivation,
`ownerOf` or `delegate_task` reads links. `delegate_task` with a linked run's id is refused by the existing rule (the
run is not a task execution) with guidance naming the link.

## Boundary Encapsulation Map

| Boundary | Encapsulates | Callers | Forbidden Bypass |
| --- | --- | --- | --- |
| `ProjectTaskService` | `TaskRunLinkService`, store | tools, GraphQL, views | callers writing `linked_runs.json` |

## Dependency Rules

Projects services may read the run-history metadata / team tree stores (run check) and the status resolver port;
nothing in agent-collaboration execution depends on links.

## Interface Boundary Mapping

| Interface | Subject | Identity |
| --- | --- | --- |
| `link_run_to_task {task_id, agent_run_id \| team_run_id}` → `{task, link}` | Task + run | Task key or id; exactly one run id |
| `unlink_run_from_task {task_id, agent_run_id \| team_run_id}` → `{task}` | same | same |
| GraphQL `linkRunToTask(taskId, run: {agentRunId} \| {teamRunId})`, `unlinkRunFromTask(…)` | same | same |
| `RootRunStatusResolver(run) → status \| null` | root run | `{kind: agent, agentRunId}` / `{kind: team, teamRunId}` |

## Interface Boundary Check

| Interface | Singular | Explicit Identity | Ambiguity | Action |
| --- | --- | --- | --- | --- |
| all | Yes | Yes (agent vs team run ids separate) | Low | — |

## Main Domain Subject Naming Check

| Subject | Name | Natural | Action |
| --- | --- | --- | --- |
| link record / file | `TaskRunLink`, `linked_runs.json` | Yes | — (no version numbers, rule 8) |

## Existing Capability / Subsystem Reuse Check

| Need | Existing | Decision |
| --- | --- | --- |
| Task serialization, feed, views | `ProjectTaskService`, change hub | Reuse |
| Task line UI | `TaskWorkerTaskSummary.vue`, `taskWorkerTasks` | Reuse |
| run picker | run history listings (agent runs, team runs) | Reuse |
| status | active root directory | Extend (root run status) |

## Subsystem / Capability-Area Allocation

| Area | Concerns | Decision |
| --- | --- | --- |
| projects (domain / stores / services) | links | Extend |
| agent-tools/project-tasks | two tools | Extend |
| api/graphql | two mutations; views | Extend |
| compositions | status resolver binding | Extend |
| web (projects, workspace history) | action, picker, card, row line | Extend |

## Draft File Responsibility Mapping

See Final.

## Reusable Owned Structures Check

`TaskWorkerTaskView` reused for linked runs' locator answers.

## Shared Structure / Data Model Tightness Check

| Structure | One Meaning | Action |
| --- | --- | --- |
| `TaskRunLink` | Yes | separate from `TaskExecutionResource` |
| `TaskRootView` | Yes with `linked` discriminator | add `linked`, `linkedBy`, `runAvailable` |

## Final File Responsibility Mapping

| File | Change |
| --- | --- |
| `projects/domain/task-run-links.ts` (new) | `TaskRunLink`, file type, rules |
| `projects/stores/task-run-link-store.ts`, `task-run-link-schema.ts` (new) | read / atomic write `linked_runs.json` |
| `projects/services/task-run-link-service.ts` (new) | index, link / unlink / closeTask, damaged-file containment |
| `projects/services/project-task-service.ts` | `linkRun`, `unlinkRun`, close / delete hooks, views, locator |
| `projects/services/task-root-view-builder.ts`, `project-task-views.ts`, `domain/models.ts` | link root, `links` / `closedLinks` |
| `agent-tools/project-tasks/*` | two tools (contract, native, manifest; MCP shares them) |
| `api/graphql/types/*project*` | mutations; view fields |
| `compositions/project-task-execution-resource-composition.ts` (or a sibling) | `RootRunStatusResolver` binding |
| web: Task page (link / unlink, run picker), board card worker, `WorkspaceHistoryWorkspaceSection.vue` / team run row (Task line), stores / queries | UI |
| docs: `projects.md` (Linked runs section), `collaboration_model.md` (vocabulary: a link is not ownership), `agent_communication.md` (one line) | sync |

## Applied Patterns (If Any)

Repository (store) + owning service, as for agent run resources.

## Target Subsystem / Folder / File Mapping

As the Final mapping; new files beside their agent-run-resource counterparts in `projects/`.

## Folder Boundary Check

Matches existing `projects/` layout.

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good | Avoided | Why |
| --- | --- | --- | --- |
| record | separate `linked_runs.json` | `role: "linked"` in `agent_run_resources.json` | ownership rules read every entry there; older builds would see a damaged file |
| sidebar | Task line under the run's existing row | nesting the run under the Project Task Manager | rows never move (REQ-007, DEC-012) |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate | Decision |
| --- | --- |
| reuse `assigned` entries for links | Rejected (ownership) |

## Derived Layering (If Useful)

N/A.

## Change / Refactor Sequence

1. Domain, store, schema, service (+ unit tests: one open link per run, close on DONE / CANCELLED / delete, damaged file).
2. `ProjectTaskService` operations, views, locator; status resolver; feed.
3. Tools and GraphQL (+ tests: owned caller refused, task agent / team member / org run refused, closed Task refused).
4. Web: Task page action and picker, board card, sidebar Task line.
5. Docs; real-app check on an isolated instance with a test data package (AC-001, AC-002, AC-004); beta; the user's
   check on the Work Journal Task (`autobyteus-10`).

## Key Tradeoffs

- Separate file vs a new role: one more file per linked Task, in exchange for a clean ownership boundary and safe downgrade.

## Risks

- R-1: root-run status read needs a small method on active roots; inactive → offline (never wakes).
- R-2: a run linked to a Task and later delegated work to by its own user: unaffected (links are not ownership).

## Guidance For Implementation

- Never let links reach `TaskExecutionResourceService` or any closure / fencing / messaging check.
- Tests use hand-built data (TESTING.md); the user's check uses the real Work Journal Task.
