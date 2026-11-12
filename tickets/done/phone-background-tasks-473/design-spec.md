# Design Spec — phone-background-tasks-473 (autobyteus-473)

## Solution And Approval Basis

- Revision `SR-002`; requirements `requirements-doc.md` (approved by the Solution Designer within the Task's direction; user informed). User approval of the design: `Not required`.
- Design status: `Ready`
- Authorities read (2026-11-12): `references/architecture-design.md`; `references/design-principles.md` (re-read in full after the 2026-11-11 update, including The Approach and Principle 16); `templates/design-spec-template.md` (updated sections); `/DESIGN.md` (read in this conversation; unchanged since 437); `GLOSSARY.md`.
- Conflicts or discrepancies: none.

## Current-State Read

- Desktop: `BackgroundTaskPanel.vue` → `useBackgroundTaskPanelView(runId, expanded)` → GraphQL `agentBackgroundTaskView`: Codex answers a snapshot (polled every 2 s); Claude, AutoByteus and Antigravity answer `event-stream`, and the panel shows `agentBackgroundTaskStore`, which `BACKGROUND_TASK_UPDATED` stream events fill (investigation notes).
- A stream sends no background tasks when a viewer connects, and the event-stream answer carries none, so a task started before the viewer connected stays invisible until it changes.
- Phone: `MobileActivity.vue` lists tool calls only; the same stream services and store run on the phone.

## Task Size And Architectural Risk (Mandatory)

- Task size: `Medium` (server: the inspection type, three backends, the GraphQL type; web: the composable, the store, one phone component, Activity; tests).
- Architectural risk: `High`: a shared runtime contract (`AgentBackgroundTaskInspection`) and the GraphQL view change across three runtimes.
- Escalation trigger: a runtime whose live tasks cannot be listed without new tracking.

## Intended Change

The node answers an event-stream run's background-task view with its current tasks; the shared composable seeds them; the phone's Activity shows the same tasks as the desktop panel.

## Change Scope (Mandatory)

- In scope: UC-001, UC-002.
- Derived consumers: `AgentBackgroundTaskInspection` (event-stream variant gains `current()`): readers `AgentRun.inspectBackgroundTasks` and the GraphQL resolver; the three event-stream backends implement it; Codex (snapshot) and ACP (unsupported) unchanged. GraphQL `AgentBackgroundTaskEventStream` gains `tasks`: reader `useBackgroundTaskPanelView` (codegen types follow).
- Deliberately left alone: the run status (own Task, DEC-002); task output; stopping tasks; the snapshot row type for Codex; idle shutdown.
- Follow-ups: none (the status Task is proposed to the PM directly).

## Behavior And Production-Path Map (Mandatory)

| Behavior | Requirement / AC | Change | Spine |
| --- | --- | --- | --- |
| BEH-001 | REQ-001, 002, 004; AC-001, 002 | Phone section | DS-001 |
| BEH-002 | REQ-003; AC-001, 003, 004 | Current tasks for a late viewer | DS-002 |
| BEH-003 | DEC-002 | Own Task | — |

## Task Design Health Assessment (Mandatory)

- Change posture: `Feature` (+ a missing invariant: a late viewer sees nothing).
- Current design issue found: `Yes`.
- Structural triggers: *Several kinds or forms* (three event-stream runtimes, one snapshot, one unsupported): each runtime's current-task source is traced (investigation) and the new method is on the shared contract, not special-cased per runtime in the resolver. *Capability-area reuse*: the shared composable and store, the existing GraphQL view. *Derived data*: the store stays the one place tasks live on the client; seeding inserts only tasks it does not have, so stream events stay the owner of changes (no older answer overwrites a newer event). *Hidden dependency*: the resolver keeps its existing `AgentRunManager.getInstance()` lookup (unchanged code; not added).
- Deliberate deviations: `None`.
- Root cause classification: `Missing Invariant` (the event-stream view never carried the current tasks).
- Refactor needed now: `No`.

## Terminology

"Background task" (`AgentBackgroundTask`, existing). No new words.

## Legacy Removal Policy (Mandatory)

- Obsolete paths: none. Compatibility wrappers kept: `None`.

## Persisted Data / State Transition Decision (Mandatory)

- `Not Affected` (all in memory).

## Data-Flow Spines

| Spine | Start | End | Owner |
| --- | --- | --- | --- |
| DS-001 | Phone opens Activity | Background tasks listed live above tool calls | `MobileBackgroundTasks` → `useBackgroundTaskPanelView` |
| DS-002 | A viewer asks for a run's background-task view | The store holds the run's current tasks | resolver → `AgentRun.inspectBackgroundTasks` → backend `current()` |

- DS-002: `useBackgroundTaskPanelView.refresh → GraphQL agentBackgroundTaskView(agentRunId) → AgentRun.inspectBackgroundTasks → inspection.kind === 'event-stream' → { kind: 'event-stream', agentRunId, tasks: inspection.current() } → composable: mode 'event-stream'; store.seedTasks(runId, tasks) (insert each task the store does not have) → later BACKGROUND_TASK_UPDATED events upsert as today`.
- DS-001: `MobileActivity → MobileBackgroundTasks(runId) → useBackgroundTaskPanelView(runId, expanded = true while Activity is shown) → rows (newest first): description or command, kind, status, summary when ended, start time; hidden when there are no tasks or the runtime is unsupported`.

## Ownership Map

- Backends own their current tasks: Claude `ClaudeSession.listBackgroundTasks()` → `ClaudeBackgroundTaskRegistry.list()` (the view's values); Antigravity `AgyBackgroundTaskMonitor.list()` (running values); AutoByteus `BackgroundProcessManager.list()` mapped with the existing `toAgentBackgroundTask`.
- `AgentBackgroundTaskInspection` (`domain/agent-background-task-view.ts`): event-stream variant `{ kind: 'event-stream'; current(): readonly AgentBackgroundTask[] }`.
- GraphQL (`api/graphql/types/agent-background-task-view.ts`): `AgentBackgroundTaskEventStream { agentRunId, tasks: [AgentBackgroundTask] }`, the object type named after the domain type.
- `agentBackgroundTaskStore.seedTasks(runId, tasks)`: inserts tasks whose `taskId` is unknown for the run.
- `useBackgroundTaskPanelView`: seeds on an event-stream answer (once per refresh; event-stream mode does not poll, as today).
- `MobileBackgroundTasks.vue` (`components/mobile/views/`): the phone section; `MobileActivity.vue` places it above the tool calls.

## Dependency Rules

- Resolver → `AgentRun` → backend inspection (as today). Backends do not import GraphQL or the stream layer for this.
- Web: phone component → shared composable → store; no phone-only data path.
- Collaborators: each backend's `current()` closes over its own tracker (constructed by the backend, as today); no new process-wide lookup.

## Interfaces

| Interface | Shape |
| --- | --- |
| `AgentBackgroundTaskInspection` event-stream | `{ kind: 'event-stream'; current(): readonly AgentBackgroundTask[] }` |
| GraphQL `AgentBackgroundTaskEventStream.tasks` | `[AgentBackgroundTask { taskId, kind, description, command, status, summary, startedAt }]` |
| `agentBackgroundTaskStore.seedTasks(runId, tasks)` | insert-if-absent by `taskId` |

## Removal / Decommission Plan (Mandatory)

- None.

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate | Decision |
| --- | --- |
| A separate "replay on connect" in every stream handler (agent, team, collaboration, org) | Rejected: four handlers would repeat one rule; the view query already exists for every viewer of the panel and the phone |

## Change Sequence

1. Server: inspection type, three backends' `current()`, resolver, GraphQL type; unit tests per runtime; e2e for the view (AC-004).
2. Web: query and codegen; `seedTasks`; composable; specs.
3. Phone: `MobileBackgroundTasks`, `MobileActivity`; specs; phone probe (AC-001, AC-002); desktop reload probe (AC-003).

## Risks

- RSK-001: Antigravity lists running tasks only (ended ones are dropped by its monitor); a late viewer sees its running tasks, not earlier ended ones.

## Guidance For Implementation

- Reproduction to start from: an isolated node, an event-stream run (a scripted AGY runtime per TESTING.md, or a native AutoByteus run with a `run_bash` background command, or a test-owned Claude login) with a running background task; open the phone's Activity after the task started: today it shows nothing.
- Tests on isolated nodes only; no secrets in logs.
