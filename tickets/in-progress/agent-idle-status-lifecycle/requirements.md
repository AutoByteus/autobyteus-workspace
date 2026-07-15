# Agent Idle Status Lifecycle Requirements

## Status (`Draft`/`Design-ready`/`Refined`)

`Refined` — approved by the user on 2026-07-15 after deterministic turn-correlation and all-supported-runtime clarifications.

## Goal / Problem Statement

Correct agent and team-member lifecycle status so `Running` means an authoritative runtime turn is active and `Idle` means the runtime is live, reusable, and has no active turn. In the reported Codex-backed Software Engineering Team, `solution_designer` and `architecture_reviewer` completed their turns but later tool-result events from those already-completed turns caused the shared backend status processor to publish `running` again. With no later lifecycle boundary, the UI correctly rendered that stale backend state as blue/`Running`.

The fix must use runtime turn boundaries plus turn identity, not a guessed quiet period or the absence of visible text/tool output. A final assistant segment is useful presentation evidence but is not itself the lifecycle authority: runtime work may legitimately continue after text, and delayed provider events can arrive after a completed turn. Per-run transitions must be monotonic and idempotent: a terminal event closes only its matching current turn and cannot close or reopen a newer turn.

Evidence details are retained in [`production-trace-evidence.md`](./production-trace-evidence.md).

## Current And Desired Behavior (Mandatory)

| Behavior ID | Current Behavior | Desired Behavior | Preserved / Unchanged Behavior | Related Requirement / Acceptance-Criteria IDs |
| --- | --- | --- | --- | --- |
| BEH-001 | Accepted commands already use canonical startup/running status, but a shared activity-derived fallback can also publish `running` from ordinary segment/tool activity. | `Initializing` covers accepted startup before a turn is active; `Running` begins when the runtime authoritatively starts/opens a turn. | Backend/runtime remains the source of truth; frontend components do not infer lifecycle from appearance. | R-001, R-002, R-008, AC-001, AC-008 |
| BEH-002 | Codex emits an explicit idle status at `turn/completed`, but later ordinary activity can overwrite it with an activity-derived `running` status. | A matching `TURN_COMPLETED` or `TURN_INTERRUPTED` closes the current active turn and settles a still-live runtime to `Idle`; later events from that completed turn do not reopen it, and an old terminal event cannot close a newer turn. | Activity that arrives before the authoritative terminal boundary remains part of active work and must not cause premature idle. | R-003, R-004, R-005, R-011, AC-001, AC-002, AC-003, AC-011, AC-012 |
| BEH-003 | A stale derived `running` status becomes `AgentRun.statusOverride`, propagates through mixed-team snapshots, and survives stream reconnect/snapshot refresh. | Live status events and reconnect snapshots converge on the terminal `Idle` state unless a newer command/turn has started. | Run/member identity, history, transcript, and delayed tool-result display remain intact. | R-005, R-007, AC-002, AC-006, AC-007 |
| BEH-004 | A later accepted command can run on the same reusable member, but its lifecycle may be obscured by a stale prior `running` projection. | A newer accepted command transitions `Idle -> Initializing/Running`, and its own terminal boundary returns the member to `Idle`. | The run/member is reused rather than recreated. | R-006, AC-004 |
| BEH-005 | Runtime termination is already distinct from turn completion. | A terminated, disposed, or unavailable runtime is `Offline`, never `Idle`. | Existing termination behavior and gray status presentation remain unchanged. | R-001, R-009, AC-005 |
| BEH-006 | Team-tree dots and focused-run headers render canonical status values; they expose the same stale backend value when it is published. | All status surfaces render the same corrected authoritative member status. | Existing colors remain: green idle, blue running, amber initializing, red error, gray offline. | R-007, AC-006 |

## Investigation Findings

- The screenshot team was matched to `software_engineering_team_835fd076ad954653b8ce99d7367f98ef`. Stored metadata records all members as `runtimeKind: codex_app_server` and model identifier `gpt-5.6-luna`.
- `solution_designer` emitted its final assistant segment at `2026-07-15T16:17:26.576Z`; an old `run_bash` result for that same turn arrived `592.599` seconds later. The member accepted and answered three newer user turns before that delayed result arrived.
- `architecture_reviewer` emitted its final assistant segment at `2026-07-15T16:23:27.620Z`; two old `run_bash` results for that same turn arrived about `264.45` seconds later.
- Codex already owns authoritative lifecycle state: `turn/started` sets `RUNNING`/an active turn ID, while `turn/completed` sets `IDLE` and clears the active turn ID. Its converter emits both the turn boundary and an explicit `AGENT_STATUS` event.
- `LifecycleStatusEventProcessor` currently treats ordinary segment, tool, inter-agent, and system-task activity as sufficient to derive `running` whenever no explicit status accompanies the batch. It does not know whether the activity belongs to a completed turn.
- The late tool result therefore produces a derived `AGENT_STATUS running` after the explicit completion/idle event. `AgentRun` stores that as `statusOverride`; mixed-team snapshots and WebSocket events faithfully propagate it.
- The frontend central status owner applies backend `AGENT_STATUS` events directly. The relevant UI components faithfully map `idle` to green and `running` to blue; no frontend `idle -> running` activity repair was found.
- The overly broad activity derivation was introduced by commit `902274e5a` to preserve AutoByteus running state when explicit status events were absent. The valid part of that behavior is boundary-based fallback (`TURN_STARTED -> running`, `TURN_COMPLETED`/`TURN_INTERRUPTED -> idle`), not treating every activity event as a lifecycle opener.
- Status is a live in-memory/runtime projection. Team run metadata preserves member/runtime identity but does not persist the stale status as schema data; no data migration is required.

## Relevant Supplemental Task Artifacts

- [`production-trace-evidence.md`](./production-trace-evidence.md) — evidence-only retained trace correlation for the reported production run; approval applicability: `N/A`.

## Design Health Assessment (Mandatory)

- Change posture: `Bug Fix` with a bounded lifecycle-state refactor.
- Root cause classification: `Missing Invariant` (ordinary activity must not establish or reopen a turn) and `Boundary/Ownership Issue` (the shared activity projector competes with runtime turn lifecycle authority).
- Refactor posture: `Refactor Needed Now` within the shared backend lifecycle-status processor. The fix must replace the broad “any activity means running” rule with explicit active-turn lifecycle tracking while preserving boundary fallback for runtimes that omit an accompanying status event.
- Evidence basis: Production traces reproduce the exact completed-turn/late-tool sequence; source tracing shows the late event creates a new backend `AGENT_STATUS running`; frontend status application is faithful rather than causal.
- Requirement or scope impact: No new status value or UI redesign is needed. Correct shared transition semantics and regression coverage are required.

## Recommendations

1. Treat the open/closed turn lifecycle as the busy/idle authority.
2. Keep `TURN_STARTED` and explicit backend status as the only ways to establish a new active turn; keep `TURN_COMPLETED`/`TURN_INTERRUPTED` as terminal turn boundaries.
3. Allow ordinary activity to reinforce or, where required, repair status only when it is correlated to the currently open turn. Never let it reopen a completed turn.
4. Preserve the AutoByteus no-explicit-status fallback at turn boundaries rather than through unbounded activity inference.
5. Do not add quiet-period timers, UI-only completion inference, or a new public status value.

## Scope Classification (`Small`/`Medium`/`Large`)

`Medium`

## In-Scope Use Cases

1. A Codex-backed individual agent or team member starts, streams/tools, completes, and becomes idle.
2. A delayed segment/tool result from an already-completed turn is still projected as activity content without changing idle back to running.
3. A provider that omits an explicit status on a turn boundary still gets boundary-derived running/idle status.
4. A completed member accepts a later user/team command and performs a new running-to-idle cycle.
5. Focused header, team tree, live event stream, and reconnect snapshot agree on the canonical state.
6. Runtime termination remains offline.
7. Duplicate or delayed boundaries/events from an older turn do not change the lifecycle of a newer current turn.

## Out of Scope

- Redesigning task-stage workflow state (for example, whether a specialist has completed its project stage).
- Inferring business-level “done” from assistant response content.
- Suppressing or deleting delayed tool/segment events from the transcript or activity monitor.
- Changing model reasoning, tool selection, command duration, or Codex process execution.
- Introducing inactivity timers or a new public lifecycle status.
- Redesigning the status colors or labels.

## Functional Requirements

- `R-001`: The canonical lifecycle meanings shall remain: `offline` = runtime unavailable, `initializing` = accepted startup before an active turn, `running` = an authoritative turn is active, `idle` = runtime live/reusable with no active turn, and `error` = runtime lifecycle failure.
- `R-002`: A new active turn shall be established only by an authoritative turn-start boundary or an explicit backend/runtime active status, not by generic content/tool activity alone.
- `R-003`: `TURN_COMPLETED` and `TURN_INTERRUPTED` shall close the applicable active turn and settle a still-live run/member to `idle`, including when an explicit idle status is omitted.
- `R-004`: Ordinary segment, tool, inter-agent, todo, or system-task activity shall not establish a new active turn or reopen a turn that has already completed/interrupted.
- `R-005`: A delayed event from a completed turn may still be delivered to normal transcript/activity consumers, but it shall not publish or persist a newer `running` lifecycle projection for that completed turn.
- `R-006`: A subsequent accepted command/new turn shall transition the same idle run/member back through its normal active lifecycle and return it to idle at its terminal boundary.
- `R-007`: Live events, team-member snapshots, focused-run status, team-tree status, and reconnect/history reconciliation shall expose the same canonical lifecycle state for a run/member.
- `R-008`: Status correctness shall not depend on response-text inspection, component-level inference, or a guessed quiet-period timeout when runtime lifecycle boundaries exist.
- `R-009`: Explicit runtime termination/disposal/unavailability shall produce `offline`, not `idle`.
- `R-010`: Existing bounded recovery from `error` shall not be broadened into an activity-based lifecycle opener; recovery activity may affect lifecycle only when it belongs to the currently open turn or accompanies a newer explicit lifecycle transition.
- `R-011`: Per-run turn transitions shall be correlated by canonical turn identity and applied monotonically/idempotently: only the terminal boundary for the current active turn may close it; duplicates and delayed events for older turns shall not change the lifecycle of a newer turn.

## Deterministic Transition Contract

The following table is the intended semantic contract. `A` and `B` are distinct turn IDs, and `B` is newer than `A`.

| Current Runtime State | Current Active Turn | Incoming Authoritative Event | Next Runtime State | Next Active Turn | Lifecycle Effect |
| --- | --- | --- | --- | --- | --- |
| Live/idle | None | `TURN_STARTED(A)` | Running | `A` | Open turn A. |
| Running | `A` | Activity correlated to `A` | Running | `A` | No lifecycle transition; deliver the activity normally. |
| Running | `A` | `TURN_COMPLETED(A)` or `TURN_INTERRUPTED(A)` | Idle | None | Close turn A. |
| Idle | None | Late activity correlated to completed `A` | Idle | None | No lifecycle transition; deliver the activity normally. |
| Running | `B` | Late activity or terminal boundary correlated to older `A` | Running | `B` | Ignore for lifecycle; do not disturb turn B. |
| Idle or running | Any | Duplicate already-applied boundary for the same turn | Unchanged | Unchanged | Idempotent no-op. |
| Any live state | Any | Explicit runtime termination/disposal | Offline | None | Runtime is no longer reusable. |
| Idle/error/initializing | None or provider-known | New explicit authoritative active snapshot or `TURN_STARTED(B)` | Running | `B` when known | Reconcile/open only the newer authoritative turn. |

This contract is deterministic because the result depends on the current per-run active-turn identity and the incoming event’s turn identity, not arrival recency, visible text, or elapsed time.

## Acceptance Criteria

- `AC-001`: Given a Codex-backed run receives `TURN_STARTED`/running and later `TURN_COMPLETED`/idle, the effective run/member status becomes `idle` without refresh or another command.
- `AC-002`: Given the sequence `TURN_STARTED(turn-A) -> TURN_COMPLETED(turn-A) -> TOOL_EXECUTION_SUCCEEDED(turn-A)`, no `AGENT_STATUS running` is derived after completion and the final effective status remains `idle`.
- `AC-003`: Given a tool, reasoning segment, or response stream occurs before the authoritative terminal boundary of the current turn, the run/member remains `running` and does not become idle prematurely.
- `AC-004`: Given a run/member is idle after `turn-A`, when a new command opens `turn-B`, it becomes active for `turn-B` and returns to idle when `turn-B` completes/interruption settles.
- `AC-005`: Given the runtime is terminated/disposed, status becomes `offline`; a completed but live runtime remains `idle`.
- `AC-006`: The focused-run header and corresponding team-tree row render green/`Idle` after the same completed-turn plus delayed-result sequence.
- `AC-007`: Reconnecting or requesting a fresh active-run/team-member snapshot after that sequence returns `idle`, not stale `running`.
- `AC-008`: Given a supported runtime emits `TURN_STARTED` without an accompanying explicit status, the shared fallback publishes `running`; given it later emits `TURN_COMPLETED` or `TURN_INTERRUPTED` without explicit status, the fallback publishes `idle`.
- `AC-009`: Given ordinary activity is received with no currently open turn, that activity does not clear `idle`, establish `running`, or act as unbounded error recovery.
- `AC-010`: Delayed tool-result content remains observable through its existing transcript/activity path even though it cannot change the completed turn’s lifecycle state.
- `AC-011`: Given `TURN_STARTED(A) -> TURN_COMPLETED(A) -> TURN_STARTED(B)`, when delayed activity or a delayed terminal event for `A` arrives, the effective status remains `running` for `B`.
- `AC-012`: Repeating an already-applied start or terminal boundary does not publish a contradictory status or cause lifecycle oscillation.

## Constraints / Dependencies

- Codex runtime is the required regression path. Its actual `turn/started`, `turn/completed`, active-turn ID, and status snapshot semantics are authoritative evidence.
- The shared lifecycle processor also serves AutoByteus and Claude paths; boundary fallback and existing explicit status publication must remain valid across supported runtimes.
- Backend/runtime truth remains authoritative; a frontend-only status patch is not acceptable.
- Event batches can contain explicit status plus lifecycle boundaries, and different run events can arrive later/out of order. The lifecycle owner must process boundaries even when an explicit status is in the same batch.
- Turn identity may appear as `turnId` or `turn_id`; lifecycle correlation must use the existing canonical event payload conventions rather than model-specific response text.

## Persisted Data Outcome (When Applicable)

- Stored subject / location: Team/agent run metadata and live status snapshots.
- Required outcome: `Directly Usable — No Migration`.
- Existing data to preserve, discard/rebuild, transform, or quarantine: Preserve all run history, team/member identities, raw traces, transcript/activity events, and termination metadata unchanged. Live in-memory status is recalculated by the corrected lifecycle path.
- Unacceptable data loss or corruption: Loss or suppression of delayed activity, run history, member routing identity, or termination state.
- Relevant availability, maintenance-window, or rollout constraints: None known; restarted runtimes naturally construct fresh lifecycle processor state.
- Related requirement and acceptance-criteria IDs: R-005, R-007, R-009, AC-005, AC-007, AC-010.

## Assumptions

- The screenshot’s blue dots/`Running` label and green dots represent the canonical `running` and `idle` states confirmed by current UI mappings.
- `TURN_COMPLETED`/`TURN_INTERRUPTED` is the supported turn terminal boundary; final assistant text alone is not sufficient authority.
- The late events in the captured run belong to the earlier completed turn because their raw trace `turn_id` matches that turn, while newer turns were accepted and completed before the delayed results arrived.

## Risks / Open Questions

- Some provider activity shapes may omit a turn ID; the target design must define conservative behavior rather than guessing that such activity opens a turn.
- The shared lifecycle processor currently stores per-run status indefinitely in a singleton map; state cleanup is a bounded lifecycle-ownership concern to assess in design.
- Provider event callbacks may overlap asynchronously; implementation and tests must preserve monotonic terminal semantics for each turn under the current dispatch model.
- Existing bounded `error -> running` recovery was designed before active-turn correlation existed; the implementation must preserve legitimate same-open-turn recovery without allowing stale activity to reopen terminal state.

## Requirement-To-Use-Case Coverage

| Requirement ID | Covered Use Cases |
| --- | --- |
| R-001 | 1, 4, 6 |
| R-002 | 1, 2, 3, 4 |
| R-003 | 1, 3, 4 |
| R-004 | 2 |
| R-005 | 2, 5 |
| R-006 | 4 |
| R-007 | 5 |
| R-008 | 1, 2, 5 |
| R-009 | 6 |
| R-010 | 1, 2, 3 |
| R-011 | 1, 2, 4, 7 |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance Criteria ID | Intended Scenario |
| --- | --- |
| AC-001 | Normal Codex active-to-idle lifecycle. |
| AC-002 | Exact reported completed-turn plus late tool-result regression. |
| AC-003 | No premature idle while the authoritative turn remains active. |
| AC-004 | Consecutive turn reuse on the same member. |
| AC-005 | Idle versus offline distinction. |
| AC-006 | Focused header/team-tree observable consistency. |
| AC-007 | Fresh snapshot/reconnect cannot resurrect stale running. |
| AC-008 | Boundary-derived fallback without explicit status. |
| AC-009 | Ordinary uncorrelated activity cannot establish lifecycle state. |
| AC-010 | Status correction does not suppress delayed activity content. |
| AC-011 | Older-turn events cannot disturb a newer active turn. |
| AC-012 | Duplicate lifecycle boundaries are idempotent. |

## Approval Status

Approved by the user on 2026-07-15. Approval explicitly covers:

- the canonical rule `live runtime + active turn = running; live runtime + no active turn = idle`;
- turn-ID-correlated, monotonic, idempotent start/terminal transitions;
- application to all supported runtimes (Codex, Claude, and AutoByteus), standalone runs, and team members;
- retaining delayed activity content while preventing it from reopening completed turns.

The evidence-only supplement has approval applicability `N/A`.
