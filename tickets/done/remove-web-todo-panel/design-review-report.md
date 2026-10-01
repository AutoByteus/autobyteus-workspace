# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-web-todo-panel/tickets/in-progress/remove-web-todo-panel/requirements-doc.md` (Approved, SR-004 content, approval recorded SR-005)
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-web-todo-panel/tickets/in-progress/remove-web-todo-panel/investigation-notes.md`
- Upstream Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-web-todo-panel/tickets/in-progress/remove-web-todo-panel/solution-revision-record.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-web-todo-panel/tickets/in-progress/remove-web-todo-panel/design-spec.md` (SR-006, status Ready)
- Supplemental Task Artifacts Reviewed: `probes/agy-daemon-exit-signal-probe.py`, `probe-evidence/p3-agy-daemon-exit-signal.log`, `probe-evidence/p4-agy-daemon-failure-signal.log`, `solution-handoff.md`
- Relevant Solution Revision IDs: SR-005 (requirements approval), SR-006 (design)
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-web-todo-panel/tickets/in-progress/remove-web-todo-panel/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-001`
- Current Review Round: 1
- Trigger: Solution Designer handoff "Architecture Design Complete" (SR-006), 2026-09-29
- Prior Review Round Reviewed: N/A (first round)
- Latest Authoritative Round: 1
- Current-State Evidence Basis: worktree `codex/remove-web-todo-panel` @ `43b6fc0f4` (no source changes yet). Code read directly:
  - Server:
    - `agy-agent-run-backend.ts`, `agy-stream-process.ts`, `agy-stream-event-converter.ts`, `agy-step-output-reader.ts`
    - `claude-background-task-registry.ts`, `claude-turn-tracker.ts`, `claude-session.ts`, `claude-session-manager.ts`, `claude-session-cleanup.ts`, `claude-agent-run-backend.ts`, `claude-session-event-converter.ts`
    - `agent-run.ts` (termination ordering), `dispatch-processed-agent-run-events.ts`, `agent-turn-lifecycle-state.ts`
    - `runtime-memory-event-accumulator.ts`, `collaboration-agent-presentation-adapter.ts`, `agent-presentation-event.ts`, Codex item/turn converters and `codex-thread-event-name.ts`
  - Contracts: `team-agent-message-dtos.ts`, `team-stream-server-message.ts`, `agent-presentation-message-dtos.ts`
  - Web: `todoHandler.ts`, `agentTodoStore.ts`, `ProgressPanel.vue`, `agentStreamMessageProjector.ts`, `agentRunStore.ts` (terminate/disconnect), `runHistoryLoadActions.ts`, `agentRuntimeStatusState.ts`
  - Claude Agent SDK 0.3.231 `sdk.d.ts` typings; P3 probe log
  - Repo-wide grep for `TODO_LIST_UPDATE`, including the mobile, gateway and application contract packages

## Routing Classification Review

- Task size: `Large`
- Architectural risk: `High`
- Classification rationale reviewed: The change spans about 35 files and five areas: server domain and streaming; the Claude and AGY backends; two contract packages with committed `dist`; web streaming, store and UI; localization and docs. Risk comes from four sources:
  - a shared stream contract change;
  - a new runtime owner that polls an undocumented AGY file format;
  - events emitted between turns, which interacts with lifecycle status;
  - new stop/close obligations in two backends.

  All of this matches the current code.
- Independent Architecture Review required by the classification: `Yes`
- Classification evidence or correction required: None

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed`
- Approved requirements / intended behavior understood: Yes. Five things are approved:
  - Remove the to-do path end to end.
  - Show a Background Tasks section in the To-Do slot, with the same accordion behavior and a "No background tasks" empty state.
  - Show Claude background tasks from running to completed/failed/stopped, with the summary.
  - Show AGY daemons from running to completed/failed; on stop they show stopped; if a message cannot be read, they fail safe to stopped.
  - Keep the list live-only, with no tab switching and an event-driven transport.
- Relevant existing behavior and evidence confirmed:
  - **To-do path is dead.** It has only two Codex producers, and their payloads never carry `todos`.
  - **Claude registry.** It already observes every task frame through `ClaudeTurnTracker.observe`. It is cleared on `processExited` and `close()`.
  - **Claude Stop is turn-only.** `ClaudeSession.interrupt` ends the canonical turn only; the process and its background tasks stay alive.
  - **Claude terminate ordering.** Terminate runs `closeProcess → turnTracker.close() → registry.clear()` before `clearRuntimeListeners()`, so a callback emitted inside `clear()` still reaches listeners.
  - **AGY process lifetime.** The AGY process is long-lived across turns (stream-json input). `interrupt`/`terminate`/failure stop the whole process and its daemon process groups.
  - **AGY message routing.** `handleMessage` drops provider messages outside a turn. Monitor events therefore need their own route into `enqueue/deliver`, and the design provides one.
  - **Lifecycle status.** `ACTIVITY_EVENT_TYPES` gates status changes, and an event outside the set with `statusHint: null` does not change status.
  - **Memory.** The accumulator ignores unknown types in its `default` branch.
  - **AgentRun termination.** It awaits `backend.terminate()`, then its dispatch-queue step, then unsubscribes. Source events enqueued during `backend.terminate()` are dispatched first.
- Scope guardrail confirmed: `Yes`.
  - In scope: UC-001..003 plus REQ-011 (AGY).
  - Out of scope: stop/kill UI, Codex plan surfacing, other runtimes, AGY withheld reply, reload restore, Project Tasks, mobile.
  - Preserved: BEH-004, BEH-006, REQ-004.
  - Review authority: as stated in the requirements.
- Approved change, preserved behavior, and outside scope understood: Yes
- Every prospective blocking `Design Impact` finding is traceable to an approved requirement, acceptance criterion, or preserved-behavior ID: `Yes` (no blocking findings raised)
- Remaining material ambiguity, if any: None that blocks. Stale non-authoritative text is listed under Findings as the non-blocking AR-REC-001.

| Behavior ID | Kind | Design Alignment With Approved Intent | Approved Trigger / Contract And Current-State Evidence | Target Outcome / Path / Spine Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | Pass | Pass (`ProgressPanel.vue` accordion `'todo'\|'activity'`, default `activity`) | Pass (DS-004: same accordion, `'backgroundTasks'\|'activity'`, empty state, counts) | Confirmed | — |
| BEH-002 | Contract | Pass | Pass (Codex converters `codex-item-event-converter.ts:411`, `codex-turn-event-converter.ts:56`; adapter `todos: []`) | Pass (full removal inventory; `item/plan/delta` → no event) | Confirmed | — |
| BEH-003 | User | Pass | Pass (`RightSideTabs.vue:179-184`) | Pass (watcher removed; no new tab switch; dependency rule forbids it) | Confirmed | — |
| BEH-004 | User | Pass | Pass | Pass (untouched) | Confirmed | — |
| BEH-005 | User/System | Pass | Pass (registry + tracker + SDK typings incl. `local_workflow`; probes J/O ordering) | Pass (DS-002 → DS-001 → DS-004; stopped on `clear()` emitted before listener teardown) | Confirmed | — |
| BEH-006 | User | Pass | Pass (`claude-turn-tracker.ts:299,359`; completion queue untouched) | Pass (registry extension leaves `pending`/`carryOver` logic unchanged) | Confirmed | — |
| BEH-007 | User/System | Pass | Pass (P3/P4 logs; converter `closeBackgroundTools`; long-lived AGY process; backend stop paths) | Pass (DS-003 → DS-001 → DS-004; fail-safe to stopped) | Confirmed | — |

## Supplemental Artifact Coherence Verdict

| Artifact | Purpose And Scope Are Clear? | Linked To Relevant Core Artifacts? | Internally Complete? | Consistent With Related Core Artifacts? | Status And Approval Applicability Are Clear? | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| `probes/agy-daemon-exit-signal-probe.py` | Pass | Pass (investigation notes SR-004 section; design-spec supplemental table) | Pass | Pass | Pass (evidence; not behavior-defining) | — |
| `probe-evidence/p3-*.log`, `p4-*.log` | Pass | Pass | Pass (the log lines are truncated, but the key fields are summarized in the investigation notes) | Pass | Pass | Implementation should capture full message-file fixtures when it builds the monitor tests. The design already asks for P3/P4-shaped fixtures. |
| `solution-handoff.md` | Pass | Pass | Pass | Pass | Pass | — |

Note: the investigation notes have no single, explicitly titled supplement inventory section. The probes are listed inline in the SR-004 section and in the design spec's supplemental table. This is non-blocking and part of AR-REC-001.

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | Design spec "Task Design Health Assessment" (Larger Requirement: removal + feature) | — |
| Root-cause classification is explicit and evidence-backed | Pass | Legacy/Compatibility Pressure: the to-do contract has no producer that can deliver data, which the code confirms. Missing Invariant: the registry owns background state but exposes no view, which the registry code confirms. | — |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | Refactor now: remove the dead contract, extend the registry, add the AGY owner, extract `agy-brain-file.ts`, move the panel to `components/progress/` | — |
| Refactor decision is supported by the concrete design sections or residual-risk rationale | Pass | Removal plan, file mapping and change sequence reflect each item | — |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? | Narrative Is Clear? | Facade Vs Governing Owner Is Clear? | Main Domain Subject Naming Is Clear? | Ownership Is Clear? | Off-Spine Concerns Stay Off Main Line? | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary end-to-end (runtime owner → web store → panel) | Pass | Pass | Pass (runtime owners decide; backends/sessions wire; projectors validate) | Pass | Pass | Pass (payload build/parse, Zod schemas) | Pass |
| DS-002 | Bounded local (Claude registry transitions) | Pass | Pass (frame rule table) | N/A | Pass | Pass | Pass (kind mapping) | Pass |
| DS-003 | Bounded local (AGY poll loop) | Pass | Pass | N/A | Pass | Pass | Pass (brain-file read, exit-message parse) | Pass |
| DS-004 | Return-event (UI) | Pass | Pass | Pass (`ProgressPanel` owns accordion; panel renders) | Pass | Pass | Pass (localization) | Pass |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? | Internal Owned Mechanisms Stay Internal? | Caller Bypass Risk Is Controlled? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `ClaudeBackgroundTaskRegistry` | Pass | Pass | Pass | Pass | The tracker feeds frames and the session supplies the callback. The session and converter never inspect task frames. |
| `AgyBackgroundTaskMonitor` | Pass | Pass | Pass | Pass | The backend only calls `track`/`stopAll`. File reading stays behind the monitor. |
| `agy-brain-file.ts` | Pass | Pass | Pass | Pass | See AR-REC-002 on keeping per-caller size bounds |
| `agent-background-task.ts` | Pass | Pass | Pass | Pass | Only builder/parser for the wire shape |
| `agentBackgroundTaskStore` | Pass | Pass | Pass | Pass | — |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? | Forbidden Shortcuts Are Explicit? | Direction Is Coherent With Ownership? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Backends → domain vocabulary | Pass | Pass | Pass | Pass | Runtime strings are kept inside their backend folders |
| Collaboration adapter → domain parser; projectors → contracts | Pass | Pass | Pass | Pass | — |
| Lifecycle status / memory | Pass | Pass (not in `ACTIVITY_EVENT_TYPES`; not persisted) | Pass | Pass | Verified against current processor and accumulator |
| Web handler → store; panel → getters | Pass | Pass (no tab-switch logic; no runtime-kind interpretation) | Pass | Pass | — |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? | Responsibility Is Singular? | Identity Shape Is Explicit? | Generic Boundary Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| `BACKGROUND_TASK_UPDATED` `{task_id, kind, description, status, summary, started_at}` | Pass | Pass (per-task upsert snapshot) | Pass (`task_id` unique within run) | Low | Pass |
| Team/org DTO `withExecution(agent payload)` | Pass | Pass | Pass (existing execution base) | Low | Pass |
| Registry `onBackgroundTaskChanged(task)` | Pass | Pass | Pass | Low | Pass |
| Monitor `track(steps)` / `stopAll()` | Pass | Pass | Pass (`stepIndex` conversation-wide, confirmed by P3) | Low | Pass |
| Web store `upsertTask(runId, task)` / `getTasks(runId)` / `getCounts(runId)` | Pass | Pass | Pass | Low | Pass |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? | Reuse / Extension Decision Is Sound? | New Support Piece Is Justified? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Claude background-task state | Pass | Pass (extend registry) | N/A | Pass | — |
| AGY daemon state and exit detection | Pass | Pass | Pass | Pass | The converter is per-turn and pure, and the backend is lifecycle wiring. State and a timer that span turns need their own owner. |
| Safe AGY brain read | Pass | Pass (extract from `agy-step-output-reader.ts`) | Pass | Pass | — |
| Event transport | Pass | Pass (AgentRunEvent + projectors + contracts) | N/A | Pass | — |
| Web per-run state / accordion | Pass | Pass | Pass | Pass | Replaces the todo store and panel one-for-one |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? | Reuse / Extend / Create-New Decision Is Sound? | Supports The Right Spine Owners? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Server agent-execution domain | Pass | Pass | Pass | Pass | — |
| Claude backend | Pass | Pass | Pass | Pass | — |
| AGY backend | Pass | Pass | Pass | Pass | — |
| Codex backend (removal) | Pass | Pass | Pass | Pass | — |
| Server streaming / collaboration | Pass | Pass | Pass | Pass | — |
| Contract packages | Pass | Pass | Pass | Pass | `autobyteus-collaboration-stream-contracts` imports the presentation contracts by package and inlines nothing, so it needs no rebuild |
| Web streaming / UI / i18n | Pass | Pass | Pass | Pass | — |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? | Shared File Choice Is Sound? | Ownership Of Shared Structure Is Clear? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Task snapshot shape (Claude, AGY, adapter) | Pass | Pass | Pass | Pass | — |
| Safe brain-file read | Pass | Pass | Pass | Pass | AR-REC-002 |
| Server domain enums vs Zod enums | Pass | Pass (parity test) | Pass | Pass | This follows the existing split, where the server domain uses loose payloads and the contracts own the DTOs |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Overlapping Representation Risk Is Controlled? | Shared Core Vs Specialized Variant / Composition Decision Is Sound? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `AgentBackgroundTask` | Pass | Pass (no runtime kind, turn id or end time) | Pass | N/A | Pass | `summary` null while running |
| Zod `BACKGROUND_TASK_UPDATED` | Pass | Pass | Pass | N/A | Pass | — |

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? | Responsibility Matches The Intended Owner/Boundary? | Responsibilities Were Re-Tightened After Shared-Structure Extraction? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `agent-background-task.ts` (new) | Pass | Pass | Pass | Pass | — |
| `claude-background-task-registry.ts` | Pass | Pass | Pass | Pass | Inject a clock for `startedAt` so the registry stays I/O-free (AR-REC-004) |
| `claude-session.ts`, `claude-session-event-name.ts`, `claude-session-event-converter.ts` | Pass | Pass | N/A | Pass | — |
| `agy-brain-file.ts` (new), `agy-step-output-reader.ts`, `agy-task-exit-message-reader.ts` (new) | Pass | Pass | Pass | Pass | — |
| `agy-background-task-monitor.ts` (new), `agy-stream-event-converter.ts`, `agy-agent-run-backend.ts` | Pass | Pass | N/A | Pass | AR-REC-003 on stop ordering |
| Collaboration/streaming/contract files | Pass | Pass | N/A | Pass | — |
| Web types/store/handler/panel/ProgressPanel/RightSideTabs/i18n | Pass | Pass | N/A | Pass | — |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? | Folder Matches Owning Boundary? | Mixed-Layer Or Over-Split Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `backends/antigravity/stream/agy-background-task-monitor.ts` | Pass | Pass | Low | Pass | The monitor owns state across turns rather than stream mapping. `stream/` is still the existing home of AGY process, reader and process-group code, so the flatter layout is acceptable. |
| `components/progress/BackgroundTaskPanel.vue` | Pass | Pass | Low | Pass | Fixes today's placement drift |
| `agent-execution/domain/agent-background-task.ts` | Pass | Pass | Low | Pass | — |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? | Replacement Owner / Structure Is Clear? | Removal / Decommission Scope Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Server enum/message/mapper/activity-set/adapter/unions/projectors | Pass | Pass | Pass | Pass | Matches the current grep inventory |
| Contracts src + dist (both packages) | Pass | Pass | Pass | Pass | — |
| Codex mappings, `TURN_TASK_PROGRESS_UPDATED` | Pass | N/A | Pass | Pass | If `ITEM_PLAN_DELTA` is removed from the enum, it must also leave `codexItemEventNames` (`codex-item-event-converter.ts:95`), and the reasoning-block test row must be updated. Either disposition satisfies AC-004. |
| Web store/types/handler/spec/panel/protocol/projector/adapters/RightSideTabs + spec mock | Pass | Pass | Pass | Pass | — |
| Localization keys, docs, sample-type tests | Pass | Pass | Pass | Pass | `autobyteus-ts` tests that name `todo` are regression guards from the prior ticket and fall outside AC-003's scope |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? | Clean-Cut Removal Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- |
| To-do message and payload | No | Pass | Pass | The web warns on unknown types (`agentStreamMessageProjector.ts` default branch). The monorepo ships together, and no external consumer exists; I found no mobile or gateway stream decoder. |
| Old panel reuse | No | Pass | Pass | Rejected in the compatibility rejection log |

## Persisted-Data Transition Verdict (When Applicable)

| Area / Stored Subject | Approved Decision | Representative Reader / Semantic / Invariant Evidence Is Sufficient? | Direct Use, Rebuild, Or Migration Choice Is Proportionate? | Migration Safety Is Complete If Required? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Run memory / raw traces / history | `Not Affected` | Pass (`runtime-memory-event-accumulator.ts` `default: return`; no todo persistence) | Pass | N/A | Pass | DEC-005 live-only |

## Change / Refactor Safety Verdict

| Area | Sequence Is Realistic? | Temporary Seams Are Explicit? | Cleanup / Removal Is Explicit? | Verdict |
| --- | --- | --- | --- | --- |
| Contracts → server domain → streaming → Codex → Claude → AGY → web → docs → audit | Pass | Pass (none needed; single-branch delivery) | Pass (AC-003 static audit step) | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? | Example Is Present And Clear? | Bad / Avoided Shape Is Explained When Helpful? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Wire payload / upsert | Yes | Pass | Pass (list-replace) | Pass | — |
| AGY task id | Yes | Pass | Pass (per-turn invocation id) | Pass | — |
| Status/activity exclusion | Yes | Pass | Pass | Pass | — |
| UI shape | Yes | Pass | Pass | Pass | — |

## Material Premise Validation (Only When Needed)

### `MP-001` — A stopped snapshot emitted during terminate is lost because the web disconnects the stream when the terminate mutation returns

- Related approved requirement or established contract: REQ-009, REQ-011 (stopped on process/AGY stop); AC-011, AC-013(c)
- Relevant behavior ID(s): BEH-005, BEH-007
- Initiating basis kind: `User`
- Independent product-supported initiating trigger or applicable governing contract: The user terminates a live run from the workspace history tree or the running-agents panel while a background task is running.
- Support evidence: The terminate actions are real product surfaces:
  - `WorkspaceAgentRunsTreePanel.vue:258` calls `agentRunStore.terminateRun`;
  - `RunningAgentsPanel.vue:248` calls `closeAgent({terminate: true})`.
- Forward path:
  1. The web calls `terminateRun`, which sends the GraphQL `TerminateAgentRun` mutation.
  2. On the server, `AgentRun.finishCommittedTerminationOnce` calls `backend.terminate()`. For Claude this runs `closeProcess → turnTracker.close() → registry.clear()`, which emits stopped snapshots. For AGY it runs `monitor.stopAll()` and then `enqueue(deliver)`.
  3. The source events are enqueued on the run dispatch queue before the termination step, so the server sends them over the WebSocket before the mutation resolves.
  4. On the web, after the mutation resolves, `teardownLocalRuntime()` disconnects the stream (`agentRunStore.ts:376-383`).
- Lifecycle preconditions and material consequence at the claimed point: A loss would need the HTTP response to be processed before WebSocket frames that were written earlier on another connection. Nothing observed shows this happens. The existing terminate-time events (`TURN_INTERRUPTED`, interrupted tool calls, the final status) already depend on the same ordering, and the web's `applyOfflineOrTerminalCleanup` only sets status. For `closeAgent({terminate:true})` the context is removed afterwards, so nothing is rendered either way.
- Reachability: `Unclear` (a cross-connection timing race with no observed occurrence; not established as a product path)
- Review consequence / proportionate response: No finding and no new machinery. Recorded as residual risk RR-001. API/E2E should confirm AC-011 and AC-013(c) through the real terminate action.

### `MP-002` — An AGY turn ends with a non-SUCCESS result while a non-daemon tool step is still ACTIVE, and the step is tracked as a background task

- Related approved requirement or established contract: REQ-011 ("Non-daemon AGY background command produces no entry")
- Relevant behavior ID(s): BEH-007
- Initiating basis kind: `System`
- Independent product-supported initiating trigger or applicable governing contract: AGY emits `result` with status other than SUCCESS during a tool step.
- Support evidence: `agy-stream-event-converter.ts:141-155` already calls `closeBackgroundTools()` for every result, error or not. Neither the investigation nor the prior tickets show a non-daemon step left ACTIVE at a terminal result, and non-daemon background commands keep the turn open (prior ticket P1/P2).
- Forward path: Result → `closeBackgroundTools` → converter callback → `monitor.track` → running entry → no exit message → AGY stop → stopped.
- Lifecycle preconditions and material consequence at the claimed point: At worst an entry would show running and then stopped, never a false completed. That matches how the existing converter already labels such a step ("still running in the background").
- Reachability: `Unclear` (no evidence either way)
- Review consequence / proportionate response: No finding and no machinery. The fail-safe behavior already bounds the consequence. Recorded as residual risk RR-002.

### `MP-003` — Claude's turn-level Stop leaves background tasks running, so entries stay "running" after Stop

- Related approved requirement or established contract: REQ-009 ("If the Claude process ends … marked stopped"), AC-011
- Relevant behavior ID(s): BEH-005, BEH-006
- Initiating basis kind: `User`
- Independent product-supported initiating trigger or applicable governing contract: The user presses Stop (interrupt) during a Claude turn while a background task runs.
- Support evidence: `ClaudeSession.interrupt` is documented as "Ends the current canonical turn only; the process and background tasks stay alive" (`claude-session.ts:248`).
- Forward path: Interrupt → `interruptActiveTurn` → turn settled as interrupted. The registry is not cleared, and the CLI continues the task and later reports its completion.
- Lifecycle preconditions and material consequence at the claimed point: The task really is still running, so a running entry is truthful. REQ-009 covers only the process ending.
- Reachability: `Reachable`
- Review consequence / proportionate response: The design is correct as is. For validation, AC-011's "stop the run / kill the Claude process" means run terminate or process end, not turn-level Stop.

## Unresolved Approved-Behavior Or Current-State Gaps

None.

## Review Decision

- `Pass`: The upstream behavior basis is confirmed, the design is ready for implementation, and no in-scope machinery or finding depends on an unsupported material premise.

## Findings

No blocking findings.

These are non-blocking recommendations. They are advisory and do not change approved behavior; implementation or a later solution touch may apply them.

- **AR-REC-001 — Stale, non-authoritative text in the requirements and investigation notes** (documentation hygiene; recipient `/solution_designer` at the next touch; none of it blocks implementation).
  - `requirements-doc.md` UI section still says "Unresolved product decisions: DEC-003..DEC-006 pending user confirmation". All are decided.
  - SCN-001's expected outcome reads "plus Background Tasks section only if tasks exist". This contradicts REQ-002, DEC-004 and AC-002, which require the section to be always present. Those three items are explicit and authoritative, and the design follows them.
  - The Desired Outcome and UC-003 name only Claude, although REQ-011 and AC-013 (AGY) trace to UC-003.
  - `investigation-notes.md` has several stale lines:
    - "UI must become Activity-only" in the codebase table;
    - "Notes For Architecture Design: Pending approval of requirements baseline SR-001";
    - a duplicated "Implications" heading;
    - UNK-001 and RSK-001 still marked Open, although SR-006 resolves UNK-001 and DEC-001 resolves RSK-001.
  - The notes also have no explicitly titled supplement inventory.
- **AR-REC-002 — Per-caller size bound in `agy-brain-file.ts`** (implementation guidance). The design gives the helper a 64 KiB bound, while today's image-path reader uses 16 KiB (`MAX_OUTPUT_BYTES`). Make the bound a caller parameter so the image-path reader keeps 16 KiB (REQ-004). A message file larger than its bound should count as unreadable, which the fail-safe then covers.
- **AR-REC-003 — AGY stop ordering and file filtering** (implementation guidance).
  - In `interrupt`, `terminate`, `handleClose` and the failure paths, call `monitor.stopAll()` and enqueue its snapshots before `await this.eventQueue`. `AgentRun` then dispatches them before its termination step and unsubscribe (REQ-011, AC-013c).
  - Restrict polling to `messages/*.json`. P3 shows a non-JSON `undelivered` entry and a `read.json` of a different shape. Remember files with other shapes, so only a truly partial `*.json` is retried.
- **AR-REC-004 — Registry clock injection** (implementation guidance). Give the registry `startedAt` through an injected clock so it stays I/O-free and testable. The design already requires that it stay I/O-free.

## Classification

N/A: no failing finding.

## Recommended Recipient

`/implementation_engineer` (primary pass handoff); `/solution_designer` (informational pass notice; AR-REC-001 cleanup at next touch).

## Residual Risks

- **RR-001 (MP-001).** Terminate-time stopped snapshots depend on WebSocket frames being processed before the terminate mutation's response. Existing terminate-time events share this dependency. API/E2E should exercise AC-011 and AC-013(c) through the real terminate action.
- **RR-002 (MP-002).** A non-daemon AGY step left ACTIVE at an error result would appear as a background task and end as stopped. The consequence is bounded.
- **RR-003.** Raw Claude `task_type` values for subagent and monitor tasks are unobserved. SDK 0.3.231 typings confirm `local_workflow`. The design falls back to `other`, and a live capture on 0.3.280 is required; the design already records this.
- **RR-004.** The AGY message-file format is undocumented and verified only on 1.2.13. The design fails safe. Windows paths are untested.
- **RR-005.** After an app reload mid-run the list starts empty (accepted under DEC-005).

## Latest Authoritative Result

- Review Decision: `Pass`
- Material-Premise Gate: `Pass` (MP-001 and MP-002 are `Unclear` and drive neither a finding nor machinery; MP-003 is `Reachable` and confirms the design)
- Notes: Round 1, `ARCH-REV-001`, based on SR-006. Non-blocking recommendations AR-REC-001..004.
