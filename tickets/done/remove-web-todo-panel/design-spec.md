# Design Spec — Replace the To-Do path with Background Tasks

## Solution And Approval Basis

- Current solution revision ID: `SR-006`
- Approved requirements baseline / revision and user-approval reference: `requirements-doc.md` SR-004 content, approved by the user 2026-09-29 ("Approve."), recorded as SR-005. User design guidance with approval: event-driven; a background-task event replaces the to-do event.
- Behavior-defining supplements and their approval references: None
- Design status: `Ready`
- Canonical investigation-notes path: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-web-todo-panel/tickets/in-progress/remove-web-todo-panel/investigation-notes.md` (sections "SR-002 Investigation", "SR-003", "SR-004 — AGY daemon exit probes", "Architecture Investigation Findings")

## Current-State Read

- **To-Do path (dead).** `AgentRunEventType.TODO_LIST_UPDATE` is produced only by two Codex converter cases whose inputs never occur (plan mode off; `turn/taskProgressUpdated` nonexistent) and whose payloads lack `todos`. It travels through the single-agent mapper, the collaboration presentation adapter/projectors, two shared Zod contract packages, the web DTO adapters, a web handler, a per-run store and `TodoListPanel`. `RightSideTabs` auto-switches to the Activity tab when todos appear. None of this can ever show data (BEH-001..003).
- **Claude background tasks (invisible).** `ClaudeBackgroundTaskRegistry` already receives every CLI task frame (via `ClaudeTurnTracker` classification) and tracks background membership, but it only feeds turn control and the completion notice (`SYSTEM_TASK_NOTIFICATION`). It emits nothing for the UI (BEH-005, BEH-006).
- **Antigravity daemons (half-visible).** `AgyStreamEventConverter` closes still-open tool steps at turn end as "still running in the background". Their later exit is never observed, although AGY writes a per-conversation message file with the step index and exit code at exit time (P3/P4) (BEH-007).
- **Constraints.**
  - Background-task changes arrive **between turns**, so they must not act as turn activity (`ACTIVITY_EVENT_TYPES`).
  - The list is live-only; the memory accumulator already ignores unknown event types.
  - Server, contracts and web ship together; the web ignores unknown message types with a warning.

## Task Size And Architectural Risk (Mandatory)

- Task size: `Large`
- Size rationale and supporting evidence:
  - The change spans five areas: the server runtime-event domain and streaming; two runtime backends (Claude session/registry, and a new AGY background-task owner that reads files); two shared contract packages with committed `dist`; the web stream client with a store, handler and panel; and localization and docs.
  - About 35 files are changed, created or deleted (see the file mapping).
- Architectural risk: `High`
- Risk rationale and supporting evidence:
  - A shared stream contract changes: one message type is removed and one added in both contract packages and all projectors.
  - A new runtime owner polls files in an undocumented AGY internal format.
  - Events are emitted outside turns, which interacts with lifecycle-status semantics.
  - Two backends' lifecycle paths (process exit, stop, terminate) gain new obligations.
- Escalation trigger if implementation or validation discovers new impact:
  - SDK 0.3.280 raw frames contradict the frame order or fields assumed in DS-002.
  - AGY message files are not written for some daemon exits, or the step index does not correlate.
  - Any consumer outside this monorepo is found for `TODO_LIST_UPDATE`.
  - Background-task events turn out to be persisted or to affect turn status.

## Architecture Investigation Evidence

| Source / Command / Probe | Exact Path / Reference | Observation | Design Decision Supported | Remaining Uncertainty |
| --- | --- | --- | --- | --- |
| Codex protocol + code | notes "SR-002 Investigation" | To-do producers can never deliver data | Clean-cut removal of `TODO_LIST_UPDATE` (D1) | — |
| Claude probe logs J/O | `tickets/done/claude-sdk-streaming-input-session/probe-evidence/probeJ.log`, `probeO.log` | `background_tasks_changed` precedes `task_started`; foreground Bash also emits `task_started`; finish = `task_notification` | Membership only from background set / `is_backgrounded`; terminal from `task_notification` or terminal `task_updated` (D3) | Raw `task_type` for subagent/monitor/workflow unobserved |
| SDK 0.3.231 typings | `sdk.d.ts` 3082-3093, 4650-4735, 131-160 | Field shapes, status enums, friendly type labels | Kind mapping + status mapping (D3) | Verify 0.3.280 |
| AGY probes P3/P4 | `probe-evidence/p3-agy-daemon-exit-signal.log`, `p4-…` | Exit → message file with `sourceMetadata.tool.stepIndex` + "exited with code N"; nothing on stdout | AGY monitor polls message files (D4) | Undocumented format; fail-safe |
| AGY brain reader | `backends/antigravity/stream/agy-step-output-reader.ts` | Bounded, no-symlink, conversation-confined read already exists | Extract and reuse the safe reader (D4) | — |
| Status processor | `agent-turn-lifecycle-state.ts:20-36,178-202` | Activity events can open an anonymous turn | New event excluded from activity (D2) | — |
| Memory accumulator | `runtime-memory-event-accumulator.ts` default branch | Unknown events ignored | No persistence work (DEC-005) | — |
| Web projector | `agentStreamMessageProjector.ts` default branch | Unknown type → warn | No compatibility shim (QR-001) | — |

## Intended Change

1. Remove the to-do concept end to end.
2. Introduce one runtime-neutral, event-driven contract, **`BACKGROUND_TASK_UPDATED`**. Each event carries the full current snapshot of one background task and uses upsert semantics.
3. Produce it from:
   - Claude: the extended `ClaudeBackgroundTaskRegistry`.
   - Antigravity: a new `AgyBackgroundTaskMonitor`.
4. Render it in a `Background Tasks` section that takes the To-Do section's place and behavior.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Approved Requirement / AC IDs | Approved Trigger Or Governing Contract | Relevant Existing Behavior And Evidence | Approved Change Or Preserved Outcome | Target Production Path / Spine |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | REQ-001, REQ-002; AC-001, AC-002 | User opens right-panel Activity tab | notes BEH-001 | Background Tasks section replaces To-Do in place; same accordion; empty state | DS-004 |
| BEH-002 | Contract | REQ-003, REQ-004; AC-003, AC-004 | Any runtime event stream | notes SR-002 Codex table | No to-do event anywhere; Codex plan delta produces nothing | Removal plan; DS-001 unchanged for other types |
| BEH-003 | User | REQ-003, REQ-010 | — | `RightSideTabs.vue:179-184` | Auto-switch removed; nothing new switches tabs | DS-004 |
| BEH-004 | User | REQ-004; AC-005 | Activity feed | `ActivityFeed.vue` | Unchanged | — |
| BEH-005 | User/System | REQ-006..010; AC-007..012 | Claude CLI background task frames | Registry code; probes J/O | Running → completed/failed/stopped with summary, per run | DS-002 → DS-001 → DS-004 |
| BEH-006 | User | REQ-004; AC-008, AC-011 | Claude completion / interrupt | `claude-turn-tracker.ts:299,359` | Notice and Claude-initiated turn unchanged | Untouched path |
| BEH-007 | User/System | REQ-011; AC-013 | AGY daemon step open at turn end; AGY message file at exit | P1/P3/P4 | Running at turn end → completed/failed on exit → stopped on AGY stop | DS-003 → DS-001 → DS-004 |

## Relevant Supplemental Task Artifacts

| Artifact Path | Purpose | Related IDs | Relationship To This Design | Status |
| --- | --- | --- | --- | --- |
| `probes/agy-daemon-exit-signal-probe.py` | Reproduces AGY daemon exit signal | REQ-011, AC-013 | Evidence for DS-003; reusable by API/E2E for live validation | Evidence |
| `probe-evidence/p3-*.log`, `p4-*.log` | Raw probe output | REQ-011 | Fixture source for monitor unit tests | Evidence |

## Task Design Health Assessment (Mandatory)

- Change posture: `Larger Requirement` (removal + feature)
- Current design issue found: `Yes`
- Root cause classification: `Legacy Or Compatibility Pressure` (a contract kept for a producer that never delivered) plus `Missing Invariant` (the registry owns background-task state but exposes no observable view).
- Refactor needed now: `Yes`
- Evidence: investigation "SR-002 Investigation" and "Architecture Investigation Findings".
- Design response:
  - Delete the dead contract everywhere, replacing it rather than adding alongside it.
  - Make the existing Claude registry the single owner of the Claude background-task view.
  - Create one AGY owner for AGY background tasks.
  - Extract the AGY safe brain-file reader so the image-path reader and the new message reader share it.
  - Move the panel beside `ActivityFeed.vue` in `components/progress/`, fixing today's placement drift where `TodoListPanel` sits in `workspace/agent`.
- Refactor rationale: each surviving concern gets exactly one owner, and no to-do remnant survives.
- Intentional deferrals and residual risk:
  - AGY's withheld autonomous reply after a daemon finish is left for a separate ticket.
  - The AGY message-file format may drift. The reader fails safe: the task stays running until AGY stops, then shows stopped.

## Terminology

- **Background task**: work a runtime runs outside or beyond its current turn and reports separately:
  - a Claude task in the CLI's background set;
  - an AGY tool step still running when its turn ends (a daemon).
- **Task snapshot**: the complete current state of one background task, as carried by one `BACKGROUND_TASK_UPDATED` event.

## Design Reading Order

Follows the template order.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Obsolete paths in scope: every `TODO_LIST_UPDATE` / to-do artifact listed in the Removal Plan, including the Codex `ITEM_PLAN_DELTA` → to-do mapping and the nonexistent `TURN_TASK_PROGRESS_UPDATED` enum member/case.

## Persisted Data / State Transition Decision (Mandatory When Persisted Data May Be Affected)

- Decision: `Not Affected`
- Rationale:
  - To-do state was in-memory only and always empty.
  - Background-task state is live session state: server owners are in memory, and the web store is in memory.
  - The memory accumulator ignores the new event type (default branch), so run history and raw memory traces are unchanged.
  - No migration is needed.

## Data-Flow Spine Inventory

| Spine ID | Scope | Related Behavior ID(s) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | BEH-005, BEH-007 | Runtime owner emits a task snapshot | Web store updated for that run | `AgentRunEvent` contract → stream projectors | The shared event path, common to both runtimes |
| DS-002 | Bounded Local | BEH-005 | Claude CLI task frame | `BACKGROUND_TASK_UPDATED` AgentRunEvent | `ClaudeBackgroundTaskRegistry` | Background-set membership and terminal rules |
| DS-003 | Bounded Local (poll loop) | BEH-007 | AGY turn result with open tool steps; AGY message files | `BACKGROUND_TASK_UPDATED` AgentRunEvents | `AgyBackgroundTaskMonitor` | Real-time daemon exit detection, fail-safe |
| DS-004 | Return-Event (UI) | BEH-001, BEH-003, BEH-005, BEH-007 | Web store for the selected run | Background Tasks section rendering | `ProgressPanel` / `BackgroundTaskPanel` | In-place replacement of the To-Do section |

## Primary Execution Spine(s)

- DS-001: `Runtime background-task owner (Claude registry | AGY monitor) -> Backend session/converter (AgentRunEvent BACKGROUND_TASK_UPDATED) -> AgentRun event fan-out -> [single agent] AgentRunEventMessageMapper | [team/org member] CollaborationAgentPresentationAdapter -> Presentation/Team projectors (Zod contracts) -> WebSocket -> web agentStreamMessageProjector -> backgroundTaskHandler -> agentBackgroundTaskStore -> BackgroundTaskPanel`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | A runtime owner decides a task changed and builds a full snapshot using the shared domain builder. The backend emits it as `BACKGROUND_TASK_UPDATED`. It is not turn activity and not persisted. Single-agent streams pass it through; collaboration streams validate it into typed details and project it to the Zod DTO, adding execution identity for team/org members. The web handler upserts it into the per-run store keyed by `task_id`. | Task snapshot | Shared domain type `AgentBackgroundTask` | Payload builder/parser; Zod schema |
| DS-002 | See the bounded loop below. The registry receives task frames from the turn tracker, updates its per-task view, and calls `onBackgroundTaskChanged(snapshot)` only on real transitions. The session turns that into `ClaudeSessionEventName.BACKGROUND_TASK_UPDATED`, and the converter maps it to the AgentRunEvent. | Claude background task | `ClaudeBackgroundTaskRegistry` | Kind mapping |
| DS-003 | At an AGY turn result, the converter reports still-open tool steps and the monitor registers them as running. While any task is running, the monitor polls the conversation's message folder every 2 s, correlates exit messages by step index, and marks tasks completed or failed. On stop, close or terminate it marks the rest stopped and stops polling. | AGY daemon task | `AgyBackgroundTaskMonitor` | Safe brain-file reader; exit-message parser |
| DS-004 | `ProgressPanel` renders `BackgroundTaskPanel` in the former To-Do slot with the same accordion state (default `activity`). The panel reads the selected run's tasks from the store, newest first, and shows the counts and empty state. | Background task list | `ProgressPanel` | Localization |

## Spine Actors / Main-Line Nodes

- `ClaudeBackgroundTaskRegistry` (extended), `ClaudeSession` (wiring), `ClaudeSessionEventConverter`
- `AgyStreamEventConverter` (reports open steps), `AgyBackgroundTaskMonitor` (new), `AgyAgentRunBackend` (wiring and lifecycle)
- `AgentRunEventType.BACKGROUND_TASK_UPDATED` + `agent-background-task.ts` (domain)
- `AgentRunEventMessageMapper`, `CollaborationAgentPresentationAdapter`, `agent-presentation-message-projector`, `team-agent-event-websocket-projector`
- Contracts: `agentPresentationPayloadSchemas.BACKGROUND_TASK_UPDATED`, `teamAgentPayloadSchemas.BACKGROUND_TASK_UPDATED`
- Web: `agentStreamMessageProjector`, `teamStreamDtoAdapters`, `backgroundTaskHandler`, `agentBackgroundTaskStore`, `ProgressPanel`, `BackgroundTaskPanel`

## Ownership Map

| Node | Owns |
| --- | --- |
| `agent-background-task.ts` (server domain) | The canonical task vocabulary: kind set, status set, `AgentBackgroundTask` shape, `buildBackgroundTaskUpdatedPayload(task)` (wire snake_case) and `parseBackgroundTaskUpdatedPayload(payload)` (strict). Both backends build through it; the adapter parses through it. |
| `ClaudeBackgroundTaskRegistry` | All Claude background-task state: membership, descriptions, the per-task view (kind, status, summary, startedAt), pending completions and carry-over (unchanged). Transition rules and the change callback. Remains free of I/O. |
| `ClaudeSession` | Wiring only: constructs the registry with a callback that emits `ClaudeSessionEventName.BACKGROUND_TASK_UPDATED`. |
| `ClaudeSessionEventConverter` | Maps that session event to `AgentRunEventType.BACKGROUND_TASK_UPDATED` (validated through the domain parser). |
| `AgyStreamEventConverter` | Unchanged mapping semantics; additionally reports the still-open tool steps at `result` through an injected callback (pure; no I/O). |
| `AgyBackgroundTaskMonitor` | All AGY background-task state for one run: running tasks by step index, processed message files, poll timer, and the stopped flag. Emits snapshots through an injected `emit`. |
| `agy-task-exit-message-reader.ts` | Listing and parsing AGY conversation message files into `{stepIndex, exitCode, summary}`. Tolerates partial and unknown files. |
| `agy-brain-file.ts` (extracted) | Brain root resolution, conversation-directory confinement, bounded no-symlink file read. |
| `AgyAgentRunBackend` | Lifecycle wiring: creates the monitor; routes converter-reported steps to `monitor.track`; delivers monitor events through its serialized `enqueue`/`deliver`; calls `monitor.stopAll()` in `interrupt`, `terminate`, `handleClose` and failure paths. |
| Collaboration adapter / projectors / mapper | Validate and project the event; no state. |
| `agentBackgroundTaskStore` (web) | Per-run task map; upsert by `taskId`; newest-first getter; running/total counts. |
| `backgroundTaskHandler` (web) | DTO → store upsert for `context.state.runId`. |
| `ProgressPanel` / `BackgroundTaskPanel` (web) | Accordion state and rendering. |

## Thin Entry Facades / Public Wrappers (If Applicable)

N/A. No new facade.

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By | Scope | Notes |
| --- | --- | --- | --- | --- |
| `AgentRunEventType.TODO_LIST_UPDATE`; `ServerMessageType.TODO_LIST_UPDATE`; mapper case | Dead event | `BACKGROUND_TASK_UPDATED` | In This Change | |
| `ACTIVITY_EVENT_TYPES` entry `TODO_LIST_UPDATE` | Dead | Nothing: the new type is intentionally not activity | In This Change | |
| Presentation adapter `TODO_LIST_UPDATE` case; `agent-presentation-event.ts` and `team-agent-event.ts` todo variants; both projector cases | Dead | New variant/cases | In This Change | |
| Contracts: `agentPresentationPayloadSchemas.TODO_LIST_UPDATE`, `teamAgentPayloadSchemas.TODO_LIST_UPDATE`, `message("TODO_LIST_UPDATE", …)`; rebuilt `dist/` | Dead | New schemas | In This Change | |
| Codex `ITEM_PLAN_DELTA` → to-do case (becomes `return []`), `CodexThreadEventName.TURN_TASK_PROGRESS_UPDATED` + its case | Never produce data; one event does not exist | Nothing | In This Change | Keep `ITEM_PLAN_DELTA` enum member only if another reference remains (e.g. the boundary no-op test); otherwise remove |
| Web: `stores/agentTodoStore.ts`, `types/todo.ts`, `handlers/todoHandler.ts` + spec, `components/workspace/agent/TodoListPanel.vue`, `TodoItem`/`TodoListUpdatePayload` in `protocol/messageTypes.ts`, projector case, DTO adapter cases, handlers index export, `RightSideTabs` watcher + import + spec mock | Dead | Background-task equivalents (except the auto-switch, which is removed outright) | In This Change | |
| Localization keys `workspace.components.workspace.agent.TodoListPanel.*` (en, zh-CN generated) | Dead | New keys in `workspace.ts` | In This Change | |
| Docs to-do mentions (web `agent_execution_architecture.md`, `settings.md`, `terminal.md`; server `docs/design/codex_raw_event_mapping.md`; `autobyteus-ts/docs/agent_team_runtime_and_task_coordination.md`, `agent_team_streaming_protocol.md`) | Stale | Background-task docs | In This Change (delivery docs sync may finalize) | |
| Server tests using `TODO_LIST_UPDATE` as sample (`agent-stream-broadcaster.test.ts`, `agent-stream-handler.test.ts`); web `AgentStreamingService.spec.ts` row | Dead type | Another existing type or the new type | In This Change | |

## Return Or Event Spine(s) (If Applicable)

DS-001 is itself an event spine (runtime → UI). No return path; the UI sends no commands for background tasks.

## Bounded Local / Internal Spines (If Applicable)

### DS-002 — Claude registry transition rules (parent owner: `ClaudeBackgroundTaskRegistry`)

`task frame -> membership / terminal decision -> view update -> onBackgroundTaskChanged(snapshot)`

| Frame | Rule |
| --- | --- |
| `background_tasks_changed {tasks[]}` | For each listed `task_id` not yet in the view, add it as `running` (description, kind from `task_type`, `startedAt = now`) and **emit**. Existing entries: update the description only if it was empty. Absence from the list does **not** end a task (a terminal frame follows, per probes). |
| `task_started` | Record description/`task_type` for the id. If `is_backgrounded === true` and not in view, add as running and **emit**. |
| `task_updated {patch}` | If `patch.is_backgrounded === true` and not in view, add as running and **emit** (foreground → background). If in view, running, and `patch.status` ∈ {completed, failed, killed}, set the terminal state (`killed` → `stopped`; `summary = patch.error ?? null`) and **emit**. |
| `task_progress` | Ignored (QR-002). |
| `task_notification {status, summary}` | If in view and running: status completed/failed/stopped, `summary = summary \|\| null`, **emit**. If already terminal, fill a missing summary and **emit** once. Existing completion-queue logic is unchanged. |
| `clear()` (process exit / close) | Each running entry becomes `stopped` and is **emitted**, then all state is cleared as today. |

Kind mapping (raw `task_type` → kind): `local_bash` → `shell`; `local_agent` → `subagent`; `local_workflow` → `workflow`; raw values containing `monitor` → `monitor`; anything else → `other`. Implementation must confirm the raw values on SDK 0.3.280 with a live capture and adjust only this table.

Foreground tasks are never added, because they never enter the background set (REQ-008, AC-010).

### DS-003 — AGY monitor poll loop (parent owner: `AgyBackgroundTaskMonitor`)

`track(steps) -> running snapshots -> [every 2 s while any running] read new message files -> match stepIndex -> completed|failed snapshots -> stop polling when none running`; `stopAll() -> stopped snapshots -> disable`

- Task id: `${conversationId}/task-${stepIndex}` (mirrors AGY's own id).
- Kind: `shell` for `run_command`, otherwise `other`.
- Description: `arguments.CommandLine`, falling back to the tool name.
- Exit parsing: JSON with a numeric `sourceMetadata.tool.stepIndex` and `content` matching `/exited with code (-?\d+)/`:
  - `0` → `completed`, otherwise `failed`;
  - `summary` = the content between "finished with result:" and "Log:", trimmed and capped at 1,000 characters.
- File handling:
  - Unparseable JSON (for example a partial write) is retried next poll.
  - Parsed files are remembered by name and not re-read.
  - Files with other shapes are ignored.
- Safety: reads go through `agy-brain-file.ts`, which is bounded (64 KiB), uses `O_NOFOLLOW`, confines the realpath to the conversation directory and skips non-regular files.
- Failure: a missing directory is normal. Any read or list error is logged once per run and polling continues, so the task falls back to stopped at AGY stop (fail-safe, REQ-011).
- A message already present when `track` runs is picked up by the first poll, which runs immediately after `track`.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Payload build/parse | DS-001 | Domain contract | One wire shape for both runtimes | Prevents divergent payloads | Duplicated shaping in each backend |
| Claude kind mapping | DS-002 | Registry | Raw `task_type` → kind | SDK vocabulary isolation | SDK strings leak into the UI |
| AGY brain-file safe read | DS-003 | Monitor, step-output reader | Bounded, confined reads | Reads user-home files | Unsafe reads duplicated |
| AGY exit-message parsing | DS-003 | Monitor | File → `{stepIndex, exitCode, summary}` | Format isolation (fail-safe) | Format knowledge spread across the backend |
| Localization | DS-004 | Panel | Labels | Product i18n rules | Literal audit failures |

## Ownership Boundaries

- Runtime owners (Claude registry, AGY monitor) are the only places that decide task transitions. Backends and sessions only wire them to event emission.
- The domain file is the only place that defines the wire vocabulary on the server. The contract packages define the validated DTO for collaboration streams; the domain enums must match the Zod enums, enforced by a unit test.
- The web store is the only owner of UI task state; components read through its getters.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `ClaudeBackgroundTaskRegistry` | View map, membership sets, kind mapping | `ClaudeTurnTracker` (frames), `ClaudeSession` (callback) | Session or converter inspecting task frames directly | Add a registry method |
| `AgyBackgroundTaskMonitor` | Poll timer, processed-file set, exit reader | `AgyAgentRunBackend` | Backend reading message files or building snapshots | Add a monitor method |
| `agy-brain-file.ts` | Path confinement, bounded read | Step-output reader, exit-message reader | Direct `fs` reads of brain paths elsewhere | Extend the helper |
| `agent-background-task.ts` | Wire shape | Claude converter, AGY monitor, collaboration adapter | Hand-built payload objects | Extend the builder/parser |
| `agentBackgroundTaskStore` | Per-run map | Handler, panel | Components mutating task maps | Add a store action/getter |

## Dependency Rules

- Allowed:
  - `backends/claude/**` and `backends/antigravity/**` → `agent-execution/domain/agent-background-task.ts`.
  - The collaboration adapter → the domain parser.
  - Projectors → contract schemas.
  - Web handler → web store; panel → store getters.
- Forbidden:
  - Any runtime-specific type or string (e.g. `local_bash`, AGY file shapes) outside its backend folder.
  - The web depending on runtime kind to interpret tasks.
  - The new event type in `ACTIVITY_EVENT_TYPES`.
  - Persisting background-task events.
  - Any tab-switch logic reacting to tasks.

## Interface Boundary Mapping

| Interface / API | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `AgentRunEventType.BACKGROUND_TASK_UPDATED` payload `{task_id, kind, description, status, summary, started_at}` | One background task snapshot | Upsert one task | `task_id`: string unique within the run | `started_at`: ISO-8601 from the owner at first sight |
| Team/org DTO `BACKGROUND_TASK_UPDATED` = `withExecution(agent payload)` | Same + member execution | Route to member | `agent_run_id` + member address (existing base) | |
| `ClaudeBackgroundTaskRegistry(onBackgroundTaskChanged: (task: AgentBackgroundTask) => void)` | Claude tasks | Notify transitions | `taskId` = CLI `task_id` | Constructor injection |
| `AgyBackgroundTaskMonitor.track(steps: readonly {stepIndex, toolName, commandLine: string \| null}[])`, `stopAll()` | AGY daemon tasks | Register / stop | `stepIndex` (conversation-wide) | `emit` injected; `readExitMessages` injectable for tests; `pollIntervalMs` default 2000 |
| Web `useAgentBackgroundTaskStore().upsertTask(runId, task)`, `getTasks(runId)`, `getCounts(runId)` | Per-run tasks | State | `runId` = `context.state.runId` | |

## Interface Boundary Check

| Interface | Responsibility Is Singular? | Identity Shape Is Explicit? | Ambiguous Selector Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `BACKGROUND_TASK_UPDATED` | Yes | Yes | Low | — |
| Registry callback | Yes | Yes | Low | — |
| Monitor `track` / `stopAll` | Yes | Yes | Low | — |
| Web store | Yes | Yes | Low | — |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Natural? | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Event | `BACKGROUND_TASK_UPDATED` | Yes (matches the UI name "Background Tasks" and the `*_UPDATED` convention, e.g. `TOKEN_USAGE_UPDATED`) | Low | User suggested "background process event"; aligned to the approved UI name (DEC-008) |
| Domain type | `AgentBackgroundTask` | Yes | Low | — |
| AGY owner | `AgyBackgroundTaskMonitor` | Yes | Low | — |
| Web panel | `BackgroundTaskPanel.vue` | Yes | Low | — |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Claude background-task state | `ClaudeBackgroundTaskRegistry` | Extend | Already the owner of background membership | — |
| AGY daemon state and exit detection | None | Create New (`AgyBackgroundTaskMonitor`) | Converter is a pure per-turn mapper; the backend is lifecycle wiring | Needs a timer and state across turns |
| Safe AGY file read | `agy-step-output-reader.ts` | Extend (extract `agy-brain-file.ts`) | Same safety rules | — |
| Event transport | AgentRunEvent + projectors + contracts | Reuse | Standard event-driven path | — |
| Web per-run state | Pinia per-run map pattern (`agentTodoStore`, `agentActivityStore`) | Reuse pattern (new store replaces the todo store) | — | — |
| Panel | `ProgressPanel` accordion | Reuse | Same section behavior (DEC-004) | — |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision | Notes |
| --- | --- | --- | --- | --- | --- |
| Server agent-execution domain | Event type, task vocabulary | DS-001 | All | Extend | |
| Claude backend | Registry, session wiring, converter case | DS-002 | Registry | Extend | |
| AGY backend | Monitor, exit reader, brain-file helper, converter callback, backend wiring | DS-003 | Monitor | Extend + Create | |
| Codex backend | Remove to-do mappings | — | — | Extend (removal) | |
| Server streaming / collaboration | Mapper, adapter, projectors, event unions, lifecycle set | DS-001 | — | Extend | |
| Contract packages | Schemas + dist | DS-001 | — | Extend | |
| Web streaming | Types, projector, adapters, handler | DS-001 | Store | Extend | |
| Web UI | Store, panel, ProgressPanel, RightSideTabs cleanup, localization | DS-004 | Panel | Extend + Create | |

## Draft File Responsibility Mapping

Covered by the final mapping; no intermediate split changed.

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? | Overlapping Representations Removed? | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Task snapshot shape (Claude, AGY, adapter) | `agent-execution/domain/agent-background-task.ts` | Server domain | One wire shape | Yes | Yes | A runtime-specific grab bag |
| Safe brain-file read (image path, exit messages) | `backends/antigravity/stream/agy-brain-file.ts` | AGY backend | Same safety rules | Yes | Yes | A generic fs utility outside AGY |

## Shared Structure / Data Model Tightness Check

| Shared Structure | One Clear Meaning Per Field? | Redundant Attributes Removed? | Overlap Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `AgentBackgroundTask {taskId, kind, description, status, summary, startedAt}` | Yes | Yes (no runtime kind, no turn id, no end time) | Low | Summary is null while running |
| Zod `BACKGROUND_TASK_UPDATED` | Yes | Yes | Low | Enums match the domain sets (test) |

## Final File Responsibility Mapping

| File | Owning Subsystem | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-execution/domain/agent-background-task.ts` (new) | Domain | Vocabulary | Kinds, statuses, type, build/parse | One subject | — |
| `.../domain/agent-run-event.ts` | Domain | Event types | Replace enum member | Existing | Yes |
| `.../events/processors/lifecycle-status/agent-turn-lifecycle-state.ts` | Status | Activity set | Drop todo entry | Existing | — |
| `.../backends/claude/session/claude-background-task-registry.ts` | Claude | Registry | View + transitions + callback | Single owner | Domain type |
| `.../backends/claude/session/claude-session.ts` | Claude | Session | Construct registry with callback → session event | Wiring | — |
| `.../backends/claude/events/claude-session-event-name.ts`, `claude-session-event-converter.ts` | Claude | Converter | New session event + mapping | Existing | Domain parser |
| `.../backends/antigravity/stream/agy-brain-file.ts` (new) | AGY | Helper | Brain root, confinement, bounded read | Extracted | — |
| `.../backends/antigravity/stream/agy-step-output-reader.ts` | AGY | Reader | Use `agy-brain-file.ts` | Existing | Yes |
| `.../backends/antigravity/stream/agy-task-exit-message-reader.ts` (new) | AGY | Reader | List + parse exit messages | One format | `agy-brain-file.ts` |
| `.../backends/antigravity/stream/agy-background-task-monitor.ts` (new) | AGY | Monitor | State, poll loop, snapshots | One owner | Domain builder |
| `.../backends/antigravity/stream/agy-stream-event-converter.ts` | AGY | Converter | Report open steps at result via callback | Existing | — |
| `.../backends/antigravity/backend/agy-agent-run-backend.ts` | AGY | Backend | Wire monitor; stopAll on stop/close/terminate/failure | Existing | — |
| `.../backends/codex/events/codex-item-event-converter.ts`, `codex-turn-event-converter.ts`, `codex-thread-event-name.ts` | Codex | Converters | Remove to-do mappings | Existing | — |
| `.../agent-collaboration/execution/events/agent-presentation-event.ts`, `collaboration-agent-presentation-adapter.ts`, `agent-presentation-message-projector.ts` | Collaboration | Adapter/projector | Replace variant/cases | Existing | Domain parser |
| `.../agent-team-execution/domain/team-agent-event.ts`, `services/agent-streaming/team-agent-event-websocket-projector.ts`, `agent-run-event-message-mapper.ts`, `models.ts` | Streaming | Projectors/mapper | Replace | Existing | — |
| `autobyteus-agent-presentation-contracts/src/agent-presentation-message-dtos.ts` + `dist/` | Contracts | Schema | Replace | Existing | — |
| `autobyteus-team-stream-contracts/src/team-agent-message-dtos.ts`, `team-stream-server-message.ts` + `dist/` | Contracts | Schema | Replace | Existing | — |
| `autobyteus-web/types/backgroundTask.ts` (new) | Web | Types | `BackgroundTask`, kind/status unions | One subject | — |
| `autobyteus-web/stores/agentBackgroundTaskStore.ts` (new) | Web | Store | Per-run map, upsert, getters | One owner | Types |
| `autobyteus-web/services/agentStreaming/handlers/backgroundTaskHandler.ts` (new) | Web | Handler | DTO → store | One concern | Types |
| `.../agentStreaming/protocol/messageTypes.ts`, `agentStreamMessageProjector.ts`, `teamStreamDtoAdapters.ts`, `handlers/index.ts`, `handlers/agentStatusHandler.ts` (comment) | Web streaming | Routing | Replace | Existing | — |
| `autobyteus-web/components/progress/BackgroundTaskPanel.vue` (new) | Web UI | Panel | Header, list, empty state | One component | Store |
| `autobyteus-web/components/progress/ProgressPanel.vue` | Web UI | Accordion | Swap panel; `'backgroundTasks' \| 'activity'` | Existing | — |
| `autobyteus-web/components/layout/RightSideTabs.vue` (+ spec) | Web UI | Tabs | Remove watcher/import/mock | Existing | — |
| `autobyteus-web/localization/messages/{en,zh-CN}/workspace.ts` / `workspace.generated.ts` | Web i18n | Catalogs | Add new keys / remove TodoListPanel keys | Existing | — |

## Applied Patterns (If Any)

- Observer/callback: registry → session; monitor → backend.
- Upsert snapshot event (idempotent, order-tolerant).
- Poll loop owned by the monitor (DS-003).

## Target Subsystem / Folder / File Mapping

See Final File Responsibility Mapping. Deleted files:
- `autobyteus-web/components/workspace/agent/TodoListPanel.vue`
- `autobyteus-web/stores/agentTodoStore.ts`
- `autobyteus-web/types/todo.ts`
- `autobyteus-web/services/agentStreaming/handlers/todoHandler.ts`
- `autobyteus-web/services/agentStreaming/handlers/__tests__/todoHandler.spec.ts`

## Folder Boundary Check

| Path / Folder | Intended Structural Depth | Ownership Boundary Is Clear? | Mixed-Layer Or Over-Split Risk | Justification |
| --- | --- | --- | --- | --- |
| `backends/antigravity/stream/` | Mixed Justified | Yes | Low | Existing home of AGY stream/process/brain readers; the monitor belongs beside them |
| `components/progress/` | Off-Spine UI | Yes | Low | Panel sits beside `ActivityFeed.vue` and `ProgressPanel.vue` |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Wire payload | `{"task_id":"b3x9","kind":"shell","description":"Sleep 20 then write marker","status":"running","summary":null,"started_at":"2026-09-29T16:48:20.000Z"}` then the same id with `"status":"completed","summary":"Background command … completed (exit code 0)"` | A list-replace event such as `{tasks:[…]}` (the old to-do shape) | Upsert survives missed events and team routing |
| AGY id | `4e9ce167-…/task-2` | `agy-tool-<turn>-2` (the per-turn invocation id) | Task outlives the turn |
| Status | Event emitted between turns, not in `ACTIVITY_EVENT_TYPES` | Adding it to activity → idle agent flips to running | Protects BEH-006 / REQ-004 |
| UI | `▾ Background Tasks …… 1 running · 2 total`, rows: `● Sleep 20 then write marker · Shell · Running` / `✓ … · Completed` + summary line | Separate tab or auto-switch | DEC-004/DEC-006 |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Keep `TODO_LIST_UPDATE` alongside the new event | Old servers/clients | Rejected | Monorepo ships together; the web ignores unknown types |
| Map Claude/AGY tasks into the old to-do payload | Reuse the panel | Rejected | Wrong shape (list replace, pending/in_progress/done) |
| Keep `TodoListPanel` and rename labels | Less churn | Rejected | New component in the correct folder |

## Derived Layering (If Useful)

N/A.

## Change / Refactor Sequence

1. **Contracts.** Replace `TODO_LIST_UPDATE` with `BACKGROUND_TASK_UPDATED` in both contract packages. Rebuild the committed `dist/`. Extend the contract tests.
2. **Server domain.** Add `agent-background-task.ts`. Replace the enum member. Drop the entry from the activity set.
3. **Server streaming and collaboration.** Update the mapper, models, adapter, event unions and both projectors.
4. **Codex.** Remove the to-do mappings and `TURN_TASK_PROGRESS_UPDATED`. Update the boundary-disposition test rows.
5. **Claude.** Extend the registry, add the session event and converter case, and wire the callback in the session.
6. **AGY.** Extract `agy-brain-file.ts` and refactor the step-output reader onto it. Add the exit-message reader and the monitor. Add the converter callback. Wire the backend lifecycle.
7. **Web.** Add the types, store, handler, projector/adapter cases and `BackgroundTaskPanel`. Update `ProgressPanel`. Remove the to-do files and the `RightSideTabs` watcher. Update localization.
8. **Docs and tests.** Update the docs and rewrite the tests that used `TODO_LIST_UPDATE` as a sample.
9. **Static audit (AC-003).** Confirm there are no to-do remnants.

## Key Tradeoffs

- **Per-task upsert vs full-set replace.** Per-task upsert is chosen: it tolerates missed events and matches how both runtimes observe changes. Full-set replace would need each owner to resend the whole set.
- **AGY polling vs `fs.watch`.** Polling at 2 s is chosen, and only while tasks are running. `fs.watch` behaves inconsistently across platforms and the directory may not exist yet; 2 s latency satisfies "without waiting for another turn".
- **Server `started_at` vs client arrival time.** `started_at` is chosen because it gives a deterministic order across team and single streams.

## Risks

- **Claude.** Raw `task_type` values for non-shell tasks may differ. Only the kind mapping is affected (`other` fallback). Implementation or API/E2E must capture them live on SDK 0.3.280.
- **AGY.** The message-file format is undocumented and may drift. The design fails safe to stopped. Monitor tests use fixtures from P3/P4, and API/E2E reruns the probe.
- **Platforms.** Windows AGY brain paths are untested; process-group cleanup is already macOS/Linux-only.
- **Web reconnect mid-run.** The list starts empty until the next change (accepted, DEC-005).

## Guidance For Implementation

- Required tests (map to AC):
  - Registry transition tables, including a foreground `task_started` that is never listed (AC-010) and `clear()` → stopped (AC-011).
  - Claude converter mapping.
  - Monitor: track → running; exit 0 → completed; exit 3 → failed; partial JSON retried; unknown file ignored; `stopAll` → stopped and no further emits; polling stops when idle (AC-013). Use P3/P4 fixture shapes.
  - Lifecycle state: the new event does not set running (REQ-004).
  - Adapter and projectors round-trip; contract enum parity.
  - Web: store upsert and order, handler, panel empty state and counts, `ProgressPanel` accordion default, no `RightSideTabs` switch (AC-001, AC-002, AC-007, AC-012).
  - Codex plan delta → no event (AC-004).
- Keep `ClaudeBackgroundTaskRegistry` free of I/O. Keep the AGY converter free of I/O.
- Localize every new string in en and zh-CN; run `guard:localization-boundary` and `audit:localization-literals`.
- Live validation (API/E2E):
  - Claude `run_in_background` sleep (AC-007/008).
  - A Claude team member (AC-009).
  - AGY probe scenarios through AutoByteus (AC-013).
- Do not modify `tickets/done/**`.
