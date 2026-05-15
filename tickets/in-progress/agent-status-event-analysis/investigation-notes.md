# Investigation Notes

## Investigation Status

- Bootstrap Status: Complete
- Current Status: Source analysis complete; implementation design pending user approval.
- Investigation Goal: Determine how agent status is currently derived across backend/runtime, `autobyteus-ts`, and frontend; identify whether a dedicated authoritative status event exists; recommend/design source-of-truth status flow for accurate UI status and interrupt eligibility.
- Scope Classification (`Small`/`Medium`/`Large`): Medium
- Scope Classification Rationale: Crosses runtime event production, server WebSocket projection/snapshotting, frontend live stream handling, and team-member routing/hydration. It does not require a broad LLM provider rewrite.
- Scope Summary: Agent status can remain as a transient working phase after the underlying agent is idle/stopped. Existing status event path exists but is not enforced as a single authoritative projection for frontend status and interrupt affordance.
- Primary Questions Resolved:
  1. Where does frontend agent status text and working/interrupt state come from today? `AgentStatusDisplay` consumes `context.state.currentStatus`; input stop button consumes `context.isSending` through `activeContextStore.isSending`.
  2. What backend/autobyteus-ts lifecycle events exist? Native AutoByteus has `agent_status_updated`; server maps it to `AGENT_STATUS`; frontend handles it.
  3. Is there a dedicated status event? Yes, but it is incomplete as a source-of-truth contract because frontend has duplicated work-state policy and snapshot/reconnect paths can miss or omit status updates.
  4. How do team-member and single-agent identities map? Single-agent status is run-scoped; team member status is routed by `agent_name`/`agent_id` in team WebSocket messages. Team initial connect currently sends only `TEAM_STATUS`, not member `AGENT_STATUS` snapshots.

## Request Context

User reports frontend status can be inaccurate: the UI may show “waiting for LLM output”/similar after the agent is no longer working. User asks for source-code analysis in backend or `autobyteus-ts` and whether a dedicated agent status event should become the frontend source of truth, including interrupt button availability while work is still active.

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): Git
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-status-event-analysis`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-status-event-analysis/tickets/in-progress/agent-status-event-analysis`
- Current Branch: `codex/agent-status-event-analysis`
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-status-event-analysis`
- Bootstrap Base Branch: `origin/personal`
- Remote Refresh Result: `git fetch origin --prune` completed successfully on 2026-05-15.
- Task Branch: `codex/agent-status-event-analysis` created from `origin/personal`.
- Expected Base Branch (if known): `origin/personal`
- Expected Finalization Target (if known): `personal`
- Bootstrap Blockers: None.
- Notes For Downstream Agents: Authoritative artifacts for this task live in the dedicated worktree above, not the original superrepo checkout.

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-05-15 | Command | `git rev-parse --show-toplevel`; `git status --short --branch`; `git remote -v`; `git remote show origin` | Bootstrap repository and base branch context | Source repo is `autobyteus-workspace-superrepo`; shared checkout was `personal`; remote default branch is `personal`. | No |
| 2026-05-15 | Command | `git fetch origin --prune`; `git worktree add /Users/normy/autobyteus_org/autobyteus-worktrees/agent-status-event-analysis -b codex/agent-status-event-analysis origin/personal` | Create dedicated ticket branch/worktree before deep investigation | Worktree created at latest `origin/personal`, HEAD `bd0db543`. | No |
| 2026-05-15 | Command | `rg -n "waiting for LLM|Uninitialized|AgentStatus|agentStatus|interruptible|isInterrupt|interrupt" autobyteus-server-ts/src autobyteus-ts/src autobyteus-web/...` | Locate status enums, handlers, and frontend status use | Found native status enum/deriver, server status mapping, frontend `AgentStatus` and streaming handlers. | No |
| 2026-05-15 | Code | `autobyteus-ts/src/agent/status/status-enum.ts` | Identify native status vocabulary | Native detailed statuses include `awaiting_llm_response`, `analyzing_llm_response`, `idle`, `interrupting`, terminal statuses. | No |
| 2026-05-15 | Code | `autobyteus-ts/src/events/event-types.ts` | Check dedicated event existence | Defines `AGENT_STATUS_UPDATED = 'agent_status_updated'`. | No |
| 2026-05-15 | Code | `autobyteus-ts/src/agent/status/status-deriver.ts` | Determine how native status is derived | Reduces runtime events into status transitions; `LLMUserMessageReadyEvent` => `AWAITING_LLM_RESPONSE`, `LLMCompleteResponseReceivedEvent` => `ANALYZING_LLM_RESPONSE`, `AgentIdleEvent`/`AgentTurnInterruptedEvent` => `IDLE`, stop/error terminal paths. | No |
| 2026-05-15 | Code | `autobyteus-ts/src/agent/status/status-update-utils.ts` | Determine status application/emission path | `applyEventAndDeriveStatus` appends event, applies deriver, writes `context.currentStatus`, and emits status update via manager when changed. | No |
| 2026-05-15 | Code | `autobyteus-ts/src/agent/status/manager.ts`; `autobyteus-ts/src/agent/events/notifiers.ts` | Verify event emission payload | Emits payload with `new_status`, `old_status`, plus optional additional fields, through `EventType.AGENT_STATUS_UPDATED`. | No |
| 2026-05-15 | Code | `autobyteus-ts/src/agent/runtime/agent-worker.ts`; `autobyteus-ts/src/agent/loop/agent-turn-runner.ts` | Inspect normal/interrupt completion status timing | Normal completion emits `TURN_COMPLETED`, then settlement observer emits `AgentIdleEvent`; interruption emits `TURN_INTERRUPTED` and applies `AgentTurnInterruptedEvent` to idle. Status idle can arrive after turn lifecycle event. | No |
| 2026-05-15 | Code | `autobyteus-ts/src/agent/agent.ts`; `autobyteus-ts/src/agent/context/agent-runtime-state.ts` | Check current status snapshot source | `Agent.currentStatus` returns runtime context state; state begins as `UNINITIALIZED`. | No |
| 2026-05-15 | Code | `autobyteus-server-ts/src/agent-execution/backends/autobyteus/events/autobyteus-stream-event-converter.ts` | Trace native status into server run event | `StreamEventType.AGENT_STATUS_UPDATED` maps to `AgentRunEventType.AGENT_STATUS`; `resolveStatusHint` marks idle/error/active. | No |
| 2026-05-15 | Code | `autobyteus-server-ts/src/services/agent-streaming/agent-run-event-message-mapper.ts` | Trace server run event into WebSocket message | `AgentRunEventType.AGENT_STATUS` maps to `ServerMessageType.AGENT_STATUS` and normalizes status strings to uppercase. | No |
| 2026-05-15 | Code | `autobyteus-server-ts/src/services/agent-streaming/agent-stream-handler.ts` | Inspect WebSocket connect and forwarding | Sends initial current status snapshot before binding session to live run event loop; forwards mapped events thereafter. Potential snapshot-before-subscribe race. | Yes |
| 2026-05-15 | Code | `autobyteus-server-ts/src/agent-execution/backends/codex/events/codex-turn-event-converter.ts`; `autobyteus-server-ts/src/agent-execution/backends/claude/events/claude-session-event-converter.ts` | Check non-native runtime status synthesis | Codex/Claude synthesize `AGENT_STATUS` `RUNNING`/`IDLE` around turn start/completion. | No |
| 2026-05-15 | Code | `autobyteus-web/types/agent/AgentStatus.ts`; `autobyteus-web/composables/useStatusVisuals.ts`; `autobyteus-web/components/workspace/agent/AgentWorkspaceView.vue`; `autobyteus-web/components/workspace/team/TeamWorkspaceView.vue`; `autobyteus-web/components/workspace/team/TeamMembersPanel.vue` | Determine display status source | UI display reads `state.currentStatus`; visual text maps `awaiting_llm_response` to `Awaiting LLM Response`. | No |
| 2026-05-15 | Code | `autobyteus-web/services/agentStreaming/handlers/agentStatusHandler.ts` | Determine frontend status mutation | `handleAgentStatus` sets `context.state.currentStatus`; clears `context.isSending` for idle/error/shutdown. Turn completion/interruption handlers clear `isSending` but do not update `currentStatus`. | Yes |
| 2026-05-15 | Code | `autobyteus-web/components/agentInput/AgentUserInputTextArea.vue`; `autobyteus-web/stores/activeContextStore.ts`; `autobyteus-web/stores/agentRunStore.ts`; `autobyteus-web/stores/agentTeamRunStore.ts` | Determine interrupt button source | Primary action button shows stop/interrupt when `activeContextStore.isSending`; interrupt sends WebSocket `INTERRUPT_GENERATION`. It does not derive from `currentStatus` or explicit interruptibility. | Yes |
| 2026-05-15 | Code | `autobyteus-server-ts/src/services/agent-streaming/agent-team-stream-handler.ts` | Inspect team WebSocket connect and status snapshot | Team connect binds before sending snapshot, but `sendInitialStatusSnapshot` only sends `TEAM_STATUS`; no member `AGENT_STATUS` snapshots. | Yes |
| 2026-05-15 | Code | `autobyteus-server-ts/src/services/agent-streaming/team-runtime-status-snapshot-service.ts` | Check for existing team member snapshot capability | Service can build team and member `AGENT_STATUS` snapshot messages, but no usage found. | Yes |
| 2026-05-15 | Code | `autobyteus-web/services/runHydration/teamRunContextHydrationService.ts`; `autobyteus-web/stores/runHistoryLoadActions.ts`; `autobyteus-web/stores/runHistoryTeamHelpers.ts` | Inspect active team hydration status | Active team contexts initialize team status as active/processing, but member statuses are `Uninitialized` unless live member statuses are supplied; active discovery passes empty `memberStatuses`. | Yes |

## Current Behavior / Current Flow

- Current entrypoint or first observable boundary:
  - Single-agent WebSocket: `AgentStreamHandler.connect(connection, agentRunId)`.
  - Team WebSocket: `AgentTeamStreamHandler.connect(connection, teamRunId)`.
  - Frontend display: `AgentWorkspaceView.vue` / `TeamWorkspaceView.vue` / `TeamMembersPanel.vue` render `AgentStatusDisplay` with `state.currentStatus`.
  - Frontend input button: `AgentUserInputTextArea.vue` uses `activeContextStore.isSending` to choose send vs stop.
- Current execution flow:
  1. Native runtime derives status in `AgentStatusDeriver` from lifecycle/turn/tool events.
  2. `applyEventAndDeriveStatus` updates `context.currentStatus` and emits `agent_status_updated` through the runtime notifier.
  3. `AgentEventStream` converts notifier event to `StreamEventType.AGENT_STATUS_UPDATED`.
  4. Server `AutoByteusStreamEventConverter` maps it to `AgentRunEventType.AGENT_STATUS`.
  5. Server `AgentRunEventMessageMapper` maps it to WebSocket `AGENT_STATUS`.
  6. Frontend `handleAgentStatus` stores `new_status.toLowerCase()` in `context.state.currentStatus`.
  7. `useStatusVisuals` converts `currentStatus` to label/color.
- Ownership or boundary observations:
  - Runtime status derivation owner exists (`AgentStatusDeriver` + `AgentStatusManager`).
  - Server stream adapter maps status but does not own lifecycle semantics.
  - Frontend currently duplicates work-state ownership between `currentStatus` and `isSending`.
  - Team initial snapshots have an unused owner (`TeamRuntimeStatusSnapshotService`) and an incomplete active path in `AgentTeamStreamHandler`.
- Current behavior summary:
  - Status display can remain stale when a previous phase status is not followed/observed by the terminal idle/error/shutdown status.
  - Interrupt button availability can be stale independently because it is driven by `isSending`, not authoritative runtime interruptibility.

## Design Health Assessment Evidence

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Bug Fix / Behavior Change
- Candidate root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Missing Invariant + Duplicated Policy Or Coordination
- Refactor posture evidence summary: Refactor likely needed to make one authoritative status projection own display and interrupt eligibility, remove duplicated frontend work-state logic, and fix server snapshot/reconnect invariants.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| `autobyteus-ts/src/agent/status/status-deriver.ts` | Detailed runtime status state machine exists and reaches idle on `AgentIdleEvent` / `AgentTurnInterruptedEvent`. | Status owner already exists; target should strengthen this path rather than adding a second source. | No |
| `autobyteus-web/services/agentStreaming/handlers/agentStatusHandler.ts` | `handleTurnCompleted` and `handleTurnInterrupted` clear `isSending` but do not update `currentStatus`. | Work state and display state can diverge if `AGENT_STATUS idle` is missed. | Yes |
| `autobyteus-server-ts/src/services/agent-streaming/agent-stream-handler.ts` | Initial status snapshot sent before `bindSessionToRun(...)`. | Race window can miss status transitions between snapshot and listener binding. | Yes |
| `autobyteus-server-ts/src/services/agent-streaming/agent-team-stream-handler.ts` | Initial snapshot sends only `TEAM_STATUS`. | Team member statuses may remain uninitialized/stale after reconnect. | Yes |
| `autobyteus-server-ts/src/services/agent-streaming/team-runtime-status-snapshot-service.ts` | Member status snapshot builder exists but unused. | Existing capability should be wired instead of creating another helper. | Yes |
| `AgentUserInputTextArea.vue` + `activeContextStore.ts` | Stop/interrupt button depends on `context.isSending`. | Interrupt affordance is not tied to runtime's active-turn/interruptible state. | Yes |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-ts/src/agent/status/status-enum.ts` | Native status vocabulary | Contains detailed phase statuses and terminal statuses. | Reuse as detailed status vocabulary for native runtime. |
| `autobyteus-ts/src/agent/status/status-deriver.ts` | Derives native agent status from runtime events | Correct place for native status lifecycle transitions. | Keep as status derivation owner. |
| `autobyteus-ts/src/agent/status/status-update-utils.ts` | Applies status events, writes context status, emits updates | Central native status update path. | Add/derive any native `is_interruptible` data here or in nearby status projection owner if approved. |
| `autobyteus-ts/src/agent/status/manager.ts` | Emits status updates through notifier | Emits `new_status`/`old_status` plus additional data. | Payload can be strengthened here. |
| `autobyteus-ts/src/agent/loop/agent-turn-runner.ts` | Runs one agent turn | Emits turn lifecycle and applies detailed status events. `TURN_COMPLETED` precedes idle status. | Frontend must not rely on turn lifecycle as status terminal source unless status projection is updated synchronously. |
| `autobyteus-server-ts/src/agent-execution/backends/autobyteus/events/autobyteus-stream-event-converter.ts` | Maps native stream events to server run events | Converts status event to `AgentRunEventType.AGENT_STATUS`; computes coarse `statusHint`. | Good adapter boundary; can normalize payload extensions. |
| `autobyteus-server-ts/src/services/agent-streaming/agent-stream-handler.ts` | Single-agent WebSocket connect/commands/event forwarding | Sends initial status before binding. | Should bind before/post-bind snapshot to close race. |
| `autobyteus-server-ts/src/services/agent-streaming/agent-run-event-message-mapper.ts` | Maps run events to WebSocket messages | Preserves status payload and uppercases statuses. | Keep as transport mapper. |
| `autobyteus-server-ts/src/services/agent-streaming/agent-team-stream-handler.ts` | Team WebSocket connect/commands/event forwarding | Sends team status snapshot only. | Must also snapshot member statuses. |
| `autobyteus-server-ts/src/services/agent-streaming/team-runtime-status-snapshot-service.ts` | Builds team/member status snapshots | Currently unused. | Reuse/extend for team connect and possibly hydration. |
| `autobyteus-web/services/agentStreaming/handlers/agentStatusHandler.ts` | Frontend stream status/terminal handlers | `AGENT_STATUS` updates `currentStatus`; turn handlers clear `isSending` separately. | Should use status projection as source of truth for display/work/interrupt. |
| `autobyteus-web/types/agent/AgentContext.ts` | Frontend run context | Holds `state.currentStatus` and separate `isSending`. | May need dedicated `runtimeStatus`/`isInterruptible` projection or replace `isSending` semantics. |
| `autobyteus-web/components/agentInput/AgentUserInputTextArea.vue` | Send/interrupt button | Uses `activeContextStore.isSending` for stop vs send. | Should depend on authoritative interruptible/work state. |
| `autobyteus-web/services/runHydration/teamRunContextHydrationService.ts` | Hydrates team contexts from history/live active list | Member statuses default to uninitialized unless status snapshots supplied. | Needs live snapshot or post-connect member status snapshot. |

## Runtime / Probe Findings

No runtime reproduction was executed; this was a static source investigation. The source evidence is sufficient to identify likely stale-status mechanisms and the existing status event path.

## External / Public Source Findings

Not applicable; local source investigation only.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: Not used for source analysis. Implementation validation should add/extend unit/integration tests around stream handlers and frontend handlers.
- Required config, feature flags, env vars, or accounts: None for static analysis.
- External repos, samples, or artifacts cloned/downloaded for investigation: None.
- Setup commands that materially affected the investigation: Dedicated worktree creation.
- Cleanup notes for temporary investigation-only setup: None.

## Findings From Code / Docs / Data / Logs

### Existing dedicated event path

Native AutoByteus already has a dedicated status event path:

`AgentStatusDeriver` → `applyEventAndDeriveStatus` → `AgentStatusManager.emit_status_update` → `AgentExternalEventNotifier.notifyStatusUpdated` → `EventType.AGENT_STATUS_UPDATED` → `AgentEventStream` → `StreamEventType.AGENT_STATUS_UPDATED` → server `AgentRunEventType.AGENT_STATUS` → WebSocket `AGENT_STATUS` → frontend `handleAgentStatus` → `context.state.currentStatus` → `AgentStatusDisplay`.

### Why stale status can still happen

1. `TURN_COMPLETED`/`TURN_INTERRUPTED` are not status events on the frontend. They clear `isSending` but do not set `currentStatus` to idle. If the explicit status update is missed, status remains in the previous phase.
2. Single-agent WebSocket connect sends status snapshot before subscribing to live run events. A status transition can occur between these operations.
3. Team WebSocket connect does not send member status snapshots, and active team hydration initializes member statuses to `Uninitialized` if no member snapshot is supplied.
4. Interrupt availability is currently controlled by `isSending`, a frontend-local mutable flag that is not equivalent to runtime active-turn/interruptible state.

### Cross-runtime facts

- Native AutoByteus statuses are fine-grained and lowercase.
- Server normalizes WebSocket status payloads to uppercase; frontend lowercases on receipt.
- Codex and Claude server backends synthesize coarse status events (`RUNNING`/`IDLE`) around turn lifecycle events, and frontend maps `running` to a generic Running label.

## Constraints / Dependencies / Compatibility Facts

- `AGENT_STATUS` is already in the WebSocket protocol; changing the message type would be unnecessary churn.
- Team messages need member identity (`agent_name`, `agent_id`) to route to the correct `AgentContext`.
- The frontend currently accepts both fine-grained statuses and coarse `running`/`processing` strings.
- Run history currently persists coarse `ACTIVE`/`IDLE` state, not necessarily fine-grained transient phases.

## Open Unknowns / Risks

- Need runtime/e2e reproduction to prove which stale-status path the user observed most frequently.
- Need implementation decision on exact interruptibility field shape and how to compute it for Codex/Claude runtimes.
- Need design decision on whether `isSending` is removed, renamed to a UI-submit-in-flight flag, or derived from status projection.
- Need review of tests to avoid relying on turn-completion handlers as status owners.

## Notes For Architect Reviewer

If the user approves moving to design, the key design issue is not “add a status event from scratch”; it is “make the existing status event the authoritative projection and close lifecycle/snapshot gaps.” Design should be spine-first around:

`Runtime status owner -> server run/team event projection -> WebSocket snapshot/live stream -> frontend status projection -> display/interrupt UI`.

## Additional Codex / Claude Runtime Findings

After inspecting the Codex and Claude Agent SDK runtime backends, the status pipeline is not solely driven by the native AutoByteus `StatusDeriver`. The common WebSocket `AGENT_STATUS` event exists, but each runtime synthesizes or caches status differently.

### Codex runtime

Relevant files:
- `autobyteus-server-ts/src/agent-execution/backends/codex/backend/codex-agent-run-backend.ts`
- `autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-thread.ts`
- `autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-thread-notification-handler.ts`
- `autobyteus-server-ts/src/agent-execution/backends/codex/events/codex-turn-event-converter.ts`
- `autobyteus-server-ts/src/agent-execution/backends/codex/events/codex-thread-lifecycle-event-converter.ts`

Findings:
- `CodexAgentRunBackend.getStatus()` delegates to `CodexThread.getStatus()`.
- `CodexThread` owns an internal `currentStatus`, initialized to `"IDLE"`.
- `currentStatus` is updated by:
  - `markTurnStarted(...)` -> `"RUNNING"`
  - `markTurnCompleted(...)` -> `"IDLE"`
  - `setCurrentStatus(...)` from `thread/status/changed` -> `"IDLE"`, `"RUNNING"`, or `"ERROR"`
  - `handleClientClosed(...)` -> `"ERROR"`
- `CodexTurnEventConverter` synthesizes normalized common events:
  - `turn/started` -> `TURN_STARTED` plus `AGENT_STATUS { new_status: "RUNNING" }`
  - `turn/completed` -> `TURN_COMPLETED` plus `AGENT_STATUS { new_status: "IDLE", old_status: "RUNNING" }`
- `CodexThreadLifecycleEventConverter` maps `thread/status/changed` to common `AGENT_STATUS`, but currently forwards the serialized raw payload. If the Codex app-server payload is shaped as `{ status: { type: "idle" } }`, which the notification handler explicitly expects, the frontend `handleAgentStatus` will not see `new_status` and will default to `Uninitialized`. This is a likely normalization bug.
- Codex `error` messages become common `ERROR` events with `statusHint: ERROR`, but no explicit `AGENT_STATUS { new_status: "ERROR" }` is generated. Since the frontend error handler clears sending state but does not set `currentStatus`, an error can leave the displayed status stale.
- `interrupt(...)` sends a runtime interrupt command but does not locally publish an interrupting or idle status; the UI depends on subsequent runtime notifications to clear status.

### Claude Agent SDK runtime

Relevant files:
- `autobyteus-server-ts/src/agent-execution/backends/claude/backend/claude-agent-run-backend.ts`
- `autobyteus-server-ts/src/agent-execution/backends/claude/events/claude-session-event-converter.ts`
- `autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-session.ts`
- `autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-session-manager.ts`

Findings:
- Claude does not currently have a first-class runtime status field equivalent to `CodexThread.currentStatus` or the native AutoByteus `context.currentStatus`.
- `ClaudeAgentRunBackend.getStatus()` returns `lastStatus`.
- `lastStatus` is updated only inside `subscribeToEvents(...)` after converted events are dispatched, using `convertedEvent.statusHint`.
- Therefore, before any listener has processed an event, `getStatus()` returns `null`, including for newly created or restored idle sessions. Initial WebSocket connect snapshots can therefore omit an `AGENT_STATUS` message.
- Claude lifecycle events are converted as:
  - `turn/started` -> `TURN_STARTED` plus `AGENT_STATUS { new_status: "RUNNING" }`
  - `turn/completed`, `turn/interrupted`, `session/terminated` -> `TURN_COMPLETED` plus `AGENT_STATUS { new_status: "IDLE" }`
  - `error` -> common `ERROR` only, no explicit `AGENT_STATUS { new_status: "ERROR" }`
- `turn/interrupted` is mapped to common `TURN_COMPLETED`, not `TURN_INTERRUPTED`. The frontend will receive an idle status if delivered, but interruption-specific cleanup such as terminalizing open tool segments as interrupted will not run through `handleTurnInterrupted`.
- Because `lastStatus` stores coarse `statusHint` values (`ACTIVE`, `IDLE`, `ERROR`) rather than the same canonical payload statuses (`RUNNING`, `IDLE`, `ERROR`) used in live `AGENT_STATUS` messages, reconnect snapshots and live status messages are not guaranteed to use a uniform vocabulary.

### Codex / Claude team runtime status

Relevant files:
- `autobyteus-server-ts/src/agent-team-execution/backends/codex/codex-team-run-backend.ts`
- `autobyteus-server-ts/src/agent-team-execution/backends/codex/codex-team-manager.ts`
- `autobyteus-server-ts/src/agent-team-execution/backends/claude/claude-team-run-backend.ts`
- `autobyteus-server-ts/src/agent-team-execution/backends/claude/claude-team-manager.ts`
- `autobyteus-server-ts/src/services/agent-streaming/agent-team-stream-handler.ts`
- `autobyteus-server-ts/src/services/agent-streaming/team-runtime-status-snapshot-service.ts`

Findings:
- `CodexTeamRunBackend.getStatus()` and `ClaudeTeamRunBackend.getStatus()` return `"IDLE"` whenever the team run is active, independent of whether a member is currently working.
- The managers separately derive live team status from member backend statuses (`ERROR` if any member errored, `PROCESSING` if any member is non-idle, otherwise `IDLE`) and publish team status changes.
- However, the stream handler's initial team snapshot uses `teamRun.getStatus()`, so reconnect/initial display can show team `IDLE` while a member is actually running.
- Member status snapshots are not sent on team connect even though `TeamRuntimeStatusSnapshotService` can build `TEAM_STATUS` plus per-member `AGENT_STATUS` messages. This service appears unused by `AgentTeamStreamHandler`.
- For Claude teams, member `getStatus()` can be `null` until events are observed, which can make derived team status appear idle/not busy before the first runtime event.

### Revised conclusion

The repository already has a common `AGENT_STATUS` transport event, but it is not yet a reliable source of truth across runtimes because:
1. Native AutoByteus uses a fine-grained status deriver and emits detailed status transitions.
2. Codex owns a thread-local status, but some lifecycle status payloads are forwarded without normalization, and errors do not emit status updates.
3. Claude derives status as a side effect of subscribed event conversion, has no initial idle status snapshot, uses coarse cached status hints, and errors do not emit status updates.
4. Team initial snapshots do not include member status and Codex/Claude team backend `getStatus()` returns a constant active-idle value.

The design should therefore normalize status at the server runtime-boundary rather than making the frontend infer working/idle from send state, turn events, or runtime-specific payload shapes.
## Design Direction Confirmed By User

- Use existing API/WebSocket `AGENT_STATUS` event name.
- No backward compatibility for the old `new_status` / `old_status` payload contract.
- API-level status should be coarse: `idle`, `running`, `error`.
- Include `can_interrupt` as the backend-owned action permission for the input interrupt button.
- Detailed runtime statuses may remain internal to runtime/backend logic but should not be the frontend status contract for this fix.
## Architecture Review Round 1 Findings And Design Rework

Architecture review failed round 1 with design-impact findings recorded in `design-review-report.md`:

- AR-001: `TEAM_STATUS` needed an explicit new coarse `{ status }` contract and migration plan for server/frontend team files.
- AR-002: team aggregate status needed one shared owner/helper across live managers and snapshots; constant active `IDLE` team backend snapshots needed decommission/replacement.
- AR-003: frontend migration needed concrete coverage for status enum collapse, hydration normalization, active recovery placeholders, local termination/offline behavior, run history/read models, display components, and tests.

Design rework decisions:

- Add `TeamStatusPayload = { status: AgentApiStatus }`; no `can_interrupt` on `TEAM_STATUS`.
- Add `agent-team-execution/domain/team-status-aggregation.ts` as the single aggregate owner used by live team managers and `TeamRuntimeStatusSnapshotService`.
- Replace `TeamRunBackend.getStatus()` / `TeamRun.getStatus()` with `getStatusSnapshot(): TeamStatusPayload`; no constant active `IDLE` status authority remains.
- Migrate frontend `AgentStatus` and `AgentTeamStatus` to `idle/running/error`; active recovery placeholder becomes `running` with interrupt unavailable, inactive/local termination becomes `idle`.
